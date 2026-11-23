/**
 * ConVoz — Google Apps Script Backend para Google Sheets
 * ======================================================
 * Hoja vinculada:
 * https://docs.google.com/spreadsheets/d/1PJCmhnUB4ROTOtIDs2LUj3wHYXqai7V5lhJXY0J2yYU/edit?usp=sharing
 *
 * INSTRUCCIONES PARA ACTUALIZAR TU IMPLEMENTACIÓN EXISTENTE:
 * 1. Abrí el Google Sheet -> Extensiones -> Apps Script.
 * 2. Reemplazá TODO el código con este archivo y guardá (Ctrl + S).
 * 3. Hacé clic en "Implementar" -> "Gestionar implementaciones".
 * 4. Hacé clic en el ícono del lápiz (Editar) en tu implementación activa.
 * 5. En "Versión", elegí "Nueva versión" y hacé clic en "Implementar".
 *    (De esta forma se mantiene EXACTAMENTE la misma URL sin cambiar nada en config.js).
 */

const SPREADSHEET_ID = "1PJCmhnUB4ROTOtIDs2LUj3wHYXqai7V5lhJXY0J2yYU";
const SHEET_NAME = "Registros ConVoz";

const HEADERS = [
  "Fecha y Hora Registro",
  "ID Registro",
  "Servicio / Producto",
  "Precio",
  "Nombre",
  "Apellido",
  "Fecha de Nacimiento",
  "DNI",
  "Prefijo País",
  "Código de Área / Zona",
  "Número de Celular",
  "Teléfono Completo",
  "Provincia (Argentina)",
  "Localidad (Argentina)",
  "Recordatorios Pre-agendados",
  "Estado de Pago",
  "Fecha Confirmación Pago",
  "ID Transacción dLocal Go",
  "Origen Confirmación",
  "Email",
];

/**
 * Obtiene o inicializa la hoja y garantiza que existan todos los encabezados
 * (incluido "Email") sin desalinear filas anteriores.
 */
function getOrCreateSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    const firstSheet = ss.getSheets()[0];
    if (firstSheet && firstSheet.getLastRow() === 0) {
      sheet = firstSheet;
      sheet.setName(SHEET_NAME);
    } else {
      sheet = ss.insertSheet(SHEET_NAME);
    }
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#184C52");
    headerRange.setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
    return sheet;
  }

  // Si la hoja ya existía, agregamos al final cualquier columna nueva faltante (ej. "Email")
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || "").trim();
  });

  let nextCol = existingHeaders.length + 1;
  HEADERS.forEach(function (requiredHeader) {
    if (existingHeaders.indexOf(requiredHeader) === -1) {
      const cell = sheet.getRange(1, nextCol);
      cell.setValue(requiredHeader);
      cell.setFontWeight("bold");
      cell.setBackground("#184C52");
      cell.setFontColor("#FFFFFF");
      existingHeaders.push(requiredHeader);
      nextCol++;
    }
  });

  return sheet;
}

/**
 * Devuelve un mapa { "Nombre Encabezado": indiceColumnaBase1 } y la cantidad total de columnas.
 */
function getHeaderMap_(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), HEADERS.length);
  const rowValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  rowValues.forEach(function (h, idx) {
    const key = String(h || "").trim();
    if (key) {
      map[key] = idx + 1;
    }
  });
  return { map: map, totalCols: rowValues.length };
}

/**
 * Construye una fila alineada exactamente a los encabezados actuales de la hoja.
 */
function buildRowByHeaders_(sheet, valuesByHeader) {
  const info = getHeaderMap_(sheet);
  const row = new Array(info.totalCols).fill("");
  Object.keys(valuesByHeader).forEach(function (headerName) {
    const colIdx = info.map[headerName];
    if (colIdx) {
      row[colIdx - 1] = valuesByHeader[headerName];
    }
  });
  return row;
}

/**
 * Responde con JSON estándar.
 */
function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * Endpoint GET de verificación de estado.
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "health";

  if (action === "status" && e.parameter.registrationId) {
    const rowInfo = findRowByRegistrationId_(e.parameter.registrationId);
    if (!rowInfo) {
      return jsonResponse_({ ok: false, error: "Registro no encontrado" });
    }
    return jsonResponse_({
      ok: true,
      registrationId: e.parameter.registrationId,
      paymentStatus: rowInfo.paymentStatus,
    });
  }

  return jsonResponse_({
    ok: true,
    service: "ConVoz Google Sheets API",
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_NAME,
    version: "1.1-email",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Endpoint POST principal:
 * - action = "register": crea un nuevo registro de cliente con estado PENDIENTE (incluye Email)
 * - action = "confirm_payment": actualiza la fila a PAGADO tras retorno de dLocal Go
 * - Webhook directo de dLocal Go (detectado por payment_id / status === "PAID")
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const rawBody = (e && e.postData && e.postData.contents) || "{}";
    let data = {};

    try {
      data = JSON.parse(rawBody);
    } catch (parseErr) {
      data = (e && e.parameter) || {};
    }

    // 1. Detección automática de webhook IPN de dLocal Go
    if (
      !data.action &&
      (data.payment_id || (data.status && String(data.status).toUpperCase() === "PAID"))
    ) {
      const orderRef = data.order_id || data.external_id || "";
      const txId = data.payment_id || data.id || "";
      const statusUpper = String(data.status || "").toUpperCase();

      if (statusUpper === "PAID" || statusUpper === "APPROVED" || statusUpper === "COMPLETED") {
        const result = markPaymentConfirmed_(orderRef, txId, "Webhook dLocal Go");
        return jsonResponse_(result);
      }

      return jsonResponse_({
        ok: true,
        ignored: true,
        reason: "Estado de webhook no aprobado: " + statusUpper,
      });
    }

    // 2. Acción desde la landing: guardar registro del formulario
    if (data.action === "register") {
      return jsonResponse_(handleRegister_(data));
    }

    // 3. Acción desde confirmacion.html: marcar pago confirmado
    if (data.action === "confirm_payment") {
      const result = markPaymentConfirmed_(
        data.registrationId || data.orderId || "",
        data.transactionId || data.paymentId || "",
        data.source || "Retorno dLocal Go"
      );
      return jsonResponse_(result);
    }

    return jsonResponse_({
      ok: false,
      error: "Acción no reconocida: " + String(data.action || ""),
    });
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Inserta una nueva fila con los datos del formulario (incluido Email).
 */
function handleRegister_(data) {
  const sheet = getOrCreateSheet_();
  const now = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || "America/Argentina/Buenos_Aires",
    "yyyy-MM-dd HH:mm:ss"
  );

  const registrationId =
    data.registrationId ||
    "CV-" + Utilities.formatDate(new Date(), "GMT-3", "yyyyMMddHHmmss");

  let remindersSummary = "";
  if (Array.isArray(data.reminders) && data.reminders.length > 0) {
    remindersSummary = data.reminders
      .map(function (r, idx) {
        return (
          "#" +
          (idx + 1) +
          ": " +
          (r.motivo || "-") +
          " | Fecha/Frec: " +
          (r.fecha || "-") +
          " | Hora: " +
          (r.hora || "-")
        );
      })
      .join(" ; ");
  } else if (typeof data.reminders === "string") {
    remindersSummary = data.reminders;
  }

  const initialStatus =
    data.productStatus === "coming_soon" ? "PRE-INSCRIPTO (PROXIMAMENTE)" : "PENDIENTE DE PAGO";

  const row = buildRowByHeaders_(sheet, {
    "Fecha y Hora Registro": now,
    "ID Registro": registrationId,
    "Servicio / Producto": data.productName || data.productId || "",
    "Precio": data.priceDisplay || "",
    "Nombre": data.nombre || "",
    "Apellido": data.apellido || "",
    "Fecha de Nacimiento": data.fechaNacimiento || "",
    "DNI": "'" + String(data.dni || ""),
    "Email": data.email || "",
    "Prefijo País": "'" + String(data.countryCode || ""),
    "Código de Área / Zona": "'" + String(data.areaCode || ""),
    "Número de Celular": "'" + String(data.phoneNumber || ""),
    "Teléfono Completo": "'" + String(data.fullPhone || ""),
    "Provincia (Argentina)": data.provincia || "",
    "Localidad (Argentina)": data.localidad || "",
    "Recordatorios Pre-agendados": remindersSummary,
    "Estado de Pago": initialStatus,
    "Fecha Confirmación Pago": "",
    "ID Transacción dLocal Go": "",
    "Origen Confirmación": "",
  });

  sheet.appendRow(row);

  return {
    ok: true,
    registrationId: registrationId,
    rowNumber: sheet.getLastRow(),
    paymentStatus: initialStatus,
  };
}

/**
 * Busca la fila por ID de registro y actualiza estado a PAGADO.
 */
function markPaymentConfirmed_(registrationId, transactionId, source) {
  const sheet = getOrCreateSheet_();
  const headerInfo = getHeaderMap_(sheet);
  const now = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || "America/Argentina/Buenos_Aires",
    "yyyy-MM-dd HH:mm:ss"
  );

  if (!registrationId) {
    return {
      ok: false,
      error: "Falta el registrationId para confirmar el pago.",
    };
  }

  const found = findRowByRegistrationId_(registrationId);

  if (!found) {
    const fallbackRow = buildRowByHeaders_(sheet, {
      "Fecha y Hora Registro": now,
      "ID Registro": registrationId,
      "Servicio / Producto": "Pago recibido sin registro previo",
      "Estado de Pago": "PAGADO",
      "Fecha Confirmación Pago": now,
      "ID Transacción dLocal Go": transactionId || "",
      "Origen Confirmación": source || "dLocal Go",
    });
    sheet.appendRow(fallbackRow);

    return {
      ok: true,
      registrationId: registrationId,
      paymentStatus: "PAGADO",
      createdFallbackRow: true,
    };
  }

  const statusCol = headerInfo.map["Estado de Pago"] || 16;
  const dateCol = headerInfo.map["Fecha Confirmación Pago"] || 17;
  const txCol = headerInfo.map["ID Transacción dLocal Go"] || 18;
  const srcCol = headerInfo.map["Origen Confirmación"] || 19;

  sheet.getRange(found.rowNumber, statusCol).setValue("PAGADO");
  sheet
    .getRange(found.rowNumber, statusCol)
    .setBackground("#D9F2E6")
    .setFontColor("#0F5132")
    .setFontWeight("bold");
  sheet.getRange(found.rowNumber, dateCol).setValue(now);
  if (transactionId) {
    sheet.getRange(found.rowNumber, txCol).setValue("'" + String(transactionId));
  }
  sheet.getRange(found.rowNumber, srcCol).setValue(source || "dLocal Go");

  return {
    ok: true,
    registrationId: registrationId,
    rowNumber: found.rowNumber,
    paymentStatus: "PAGADO",
    confirmedAt: now,
  };
}

/**
 * Utilidad interna para localizar una fila por registrationId.
 */
function findRowByRegistrationId_(registrationId) {
  const sheet = getOrCreateSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const headerInfo = getHeaderMap_(sheet);
  const idCol = headerInfo.map["ID Registro"] || 2;
  const statusCol = headerInfo.map["Estado de Pago"] || 16;

  const idValues = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  const target = String(registrationId).trim();

  for (let i = idValues.length - 1; i >= 0; i--) {
    if (String(idValues[i][0]).trim() === target) {
      const rowNumber = i + 2;
      const paymentStatus = sheet.getRange(rowNumber, statusCol).getValue();
      return { rowNumber: rowNumber, paymentStatus: paymentStatus };
    }
  }
  return null;
}
