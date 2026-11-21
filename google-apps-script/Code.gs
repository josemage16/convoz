/**
 * ConVoz — Google Apps Script Backend para Google Sheets
 * ======================================================
 * Hoja vinculada:
 * https://docs.google.com/spreadsheets/d/1PJCmhnUB4ROTOtIDs2LUj3wHYXqai7V5lhJXY0J2yYU/edit?usp=sharing
 *
 * INSTRUCCIONES DE INSTALACIÓN (3 minutos):
 * 1. Abrí el Google Sheet del enlace anterior.
 * 2. En el menú superior, hacé clic en: Extensiones > Apps Script.
 * 3. Borrá el contenido por defecto y pegá TODO este archivo.
 * 4. Guardá el proyecto (Ctrl + S) con el nombre "ConVoz Backend".
 * 5. Hacé clic en "Implementar" > "Nueva implementación".
 * 6. En "Seleccionar tipo", elegí "Aplicación web".
 *    - Ejecutar como: "Yo" (tu cuenta)
 *    - Quién tiene acceso: "Cualquier usuario"
 * 7. Hacé clic en "Implementar", autorizá los permisos y copiá la "URL de la aplicación web".
 * 8. Pegá esa URL en js/config.js dentro de googleSheets.appsScriptWebAppUrl.
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
];

/**
 * Obtiene o inicializa la hoja con sus encabezados formateados.
 */
function getOrCreateSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    // Si la primera hoja está vacía, la renombramos para mantener el archivo limpio
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
  }

  return sheet;
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
    timestamp: new Date().toISOString(),
  });
}

/**
 * Endpoint POST principal:
 * - action = "register": crea un nuevo registro de cliente con estado PENDIENTE
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
      // Fallback para application/x-www-form-urlencoded
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
 * Inserta una nueva fila con los datos del formulario.
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

  // Formateo legible de recordatorios si el cliente eligió "Recordatorios Programados"
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

  const row = [
    now,
    registrationId,
    data.productName || data.productId || "",
    data.priceDisplay || "",
    data.nombre || "",
    data.apellido || "",
    data.fechaNacimiento || "",
    "'" + String(data.dni || ""),
    "'" + String(data.countryCode || ""),
    "'" + String(data.areaCode || ""),
    "'" + String(data.phoneNumber || ""),
    "'" + String(data.fullPhone || ""),
    data.provincia || "",
    data.localidad || "",
    remindersSummary,
    initialStatus,
    "",
    "",
    "",
  ];

  sheet.appendRow(row);

  return {
    ok: true,
    registrationId: registrationId,
    rowNumber: sheet.getLastRow(),
    paymentStatus: initialStatus,
  };
}

/**
 * Busca la fila por ID de registro (columna B) y actualiza estado a PAGADO.
 */
function markPaymentConfirmed_(registrationId, transactionId, source) {
  const sheet = getOrCreateSheet_();
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
    // Si por algún motivo llega confirmación sin registro previo, lo registramos para no perder el pago
    sheet.appendRow([
      now,
      registrationId,
      "Pago recibido sin registro previo",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "PAGADO",
      now,
      transactionId || "",
      source || "dLocal Go",
    ]);

    return {
      ok: true,
      registrationId: registrationId,
      paymentStatus: "PAGADO",
      createdFallbackRow: true,
    };
  }

  // Columnas 16 (Estado de Pago), 17 (Fecha Confirmación), 18 (ID Transacción), 19 (Origen)
  sheet.getRange(found.rowNumber, 16).setValue("PAGADO");
  sheet.getRange(found.rowNumber, 16).setBackground("#D9F2E6").setFontColor("#0F5132").setFontWeight("bold");
  sheet.getRange(found.rowNumber, 17).setValue(now);
  if (transactionId) {
    sheet.getRange(found.rowNumber, 18).setValue("'" + String(transactionId));
  }
  sheet.getRange(found.rowNumber, 19).setValue(source || "dLocal Go");

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

  const idValues = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  const target = String(registrationId).trim();

  for (let i = idValues.length - 1; i >= 0; i--) {
    if (String(idValues[i][0]).trim() === target) {
      const rowNumber = i + 2;
      const paymentStatus = sheet.getRange(rowNumber, 16).getValue();
      return { rowNumber: rowNumber, paymentStatus: paymentStatus };
    }
  }
  return null;
}
