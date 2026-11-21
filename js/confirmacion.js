/**
 * ConVoz — Confirmación de pago (retorno de dLocal Go) + Agendador de Google Calendar
 * -----------------------------------------------------------------------------------
 * 1. Lee los parámetros de retorno de dLocal Go (?payment=success&order_id=...&payment_id=...)
 *    y/o el último registro guardado en localStorage.
 * 2. Envía una actualización a Google Apps Script (action: "confirm_payment") para marcar
 *    la fila del cliente como PAGADO en el Google Sheet oficial.
 * 3. Habilita y embebe el agendador de Google Calendar para que el cliente elija sus llamadas.
 */

(function () {
  "use strict";

  const CFG = window.CONVOZ_CONFIG;
  const STORAGE_KEY = "convoz_last_registration";

  const statusBadge = document.getElementById("confirmStatusBadge");
  const confirmTitle = document.getElementById("confirmTitle");
  const confirmSubtitle = document.getElementById("confirmSubtitle");
  const sheetSyncAlert = document.getElementById("sheetSyncAlert");

  const receiptCode = document.getElementById("receiptCode");
  const receiptClient = document.getElementById("receiptClient");
  const receiptService = document.getElementById("receiptService");
  const receiptAmount = document.getElementById("receiptAmount");

  const calendarSection = document.getElementById("calendarSection");
  const calendarIframe = document.getElementById("calendarIframe");
  const calendarPlaceholder = document.getElementById("calendarPlaceholder");
  const calendarDirectBtn = document.getElementById("calendarDirectBtn");
  const whatsappSupportBtn = document.getElementById("whatsappSupportBtn");

  function loadStoredRegistration() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  async function confirmPaymentInGoogleSheets(registrationId, transactionId, isDemo) {
    const url = (CFG.googleSheets.appsScriptWebAppUrl || "").trim();
    if (!url) {
      return { synced: false, reason: "apps_script_not_configured" };
    }

    const payload = {
      action: "confirm_payment",
      registrationId: registrationId,
      transactionId: transactionId,
      source: isDemo ? "Simulación de pago (Vista previa)" : "Retorno dLocal Go",
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const data = await response.json().catch(function () {
      return { ok: true };
    });

    return { synced: true, data: data };
  }

  function resolveCalendarUrl(productId) {
    if (
      productId &&
      CFG.googleCalendar.schedulingUrlByProduct &&
      CFG.googleCalendar.schedulingUrlByProduct[productId]
    ) {
      return CFG.googleCalendar.schedulingUrlByProduct[productId].trim();
    }
    return (CFG.googleCalendar.schedulingUrl || "").trim();
  }

  function renderCalendar(productId) {
    const calUrl = resolveCalendarUrl(productId);
    calendarSection.hidden = false;

    if (calUrl) {
      calendarPlaceholder.hidden = true;
      calendarIframe.hidden = false;
      calendarIframe.src = calUrl;
      calendarDirectBtn.href = calUrl;
      calendarDirectBtn.hidden = false;
    } else {
      calendarIframe.hidden = true;
      calendarDirectBtn.hidden = true;
      calendarPlaceholder.hidden = false;
    }
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const stored = loadStoredRegistration();

    const paymentParam = (
      params.get("payment") ||
      params.get("status") ||
      ""
    ).toLowerCase();
    const isDemo = params.get("demo") === "1";

    const registrationId =
      params.get("order_id") ||
      params.get("external_id") ||
      (stored && stored.registrationId) ||
      "";

    const transactionId =
      params.get("payment_id") ||
      params.get("transaction_id") ||
      params.get("id") ||
      "";

    const isApproved =
      !paymentParam ||
      paymentParam === "success" ||
      paymentParam === "approved" ||
      paymentParam === "paid" ||
      paymentParam === "completed";

    // WhatsApp link de soporte
    if (whatsappSupportBtn) {
      const msg = encodeURIComponent(
        "Hola ConVoz, realicé el pago del servicio" +
          (registrationId ? " (Código " + registrationId + ")" : "") +
          " y necesito asistencia para agendar mi llamada."
      );
      whatsappSupportBtn.href =
        "https://wa.me/" + CFG.brand.whatsappNumber + "?text=" + msg;
    }

    // Completar comprobante
    receiptCode.textContent = registrationId || "Sin código en URL";
    receiptClient.textContent = stored
      ? stored.nombre + " " + stored.apellido
      : "Titular registrado";
    receiptService.textContent = stored
      ? stored.productName
      : "Servicio ConVoz";
    receiptAmount.textContent = stored ? stored.priceDisplay : "Confirmado";

    if (!isApproved) {
      statusBadge.className = "status-badge-lg status-badge-lg--pending";
      statusBadge.textContent = "Pago pendiente o cancelado";
      confirmTitle.textContent = "Tu pago aún no fue confirmado";
      confirmSubtitle.textContent =
        "Si cancelaste la operación o hubo un inconveniente en dLocal Go, podés volver a intentarlo o consultarnos directamente por WhatsApp.";
      sheetSyncAlert.className = "alert alert--warning";
      sheetSyncAlert.hidden = false;
      sheetSyncAlert.textContent =
        "No se registró un pago aprobado. Una vez completado el pago, habilitaremos el agendador de Google Calendar.";
      calendarSection.hidden = true;
      return;
    }

    // Pago confirmado
    statusBadge.className = "status-badge-lg status-badge-lg--success";
    statusBadge.textContent = isDemo
      ? "Pago confirmado (Vista previa)"
      : "Pago confirmado";
    confirmTitle.textContent = "¡Gracias por confiar en ConVoz!";
    confirmSubtitle.textContent =
      "Confirmamos tu pago correctamente. Ahora podés elegir el día y horario de tu servicio directamente en nuestro agendador de Google Calendar.";

    // Mostrar Google Calendar inmediatamente
    renderCalendar(stored && stored.productId);

    // Sincronizar estado PAGADO en Google Sheets
    if (!registrationId) {
      sheetSyncAlert.className = "alert alert--warning";
      sheetSyncAlert.hidden = false;
      sheetSyncAlert.textContent =
        "No se detectó un código de registro en la sesión actual. Si completaste el pago desde otro dispositivo, nuestro equipo lo validará automáticamente con el webhook de dLocal Go.";
      return;
    }

    try {
      const syncRes = await confirmPaymentInGoogleSheets(
        registrationId,
        transactionId,
        isDemo
      );

      if (syncRes.synced) {
        sheetSyncAlert.className = "alert alert--success";
        sheetSyncAlert.hidden = false;
        sheetSyncAlert.innerHTML =
          "<strong>Estado actualizado en Google Sheets:</strong> Tu registro <code>" +
          registrationId +
          "</code> quedó marcado como <strong>PAGADO</strong>.";
      } else {
        sheetSyncAlert.className = "alert alert--info";
        sheetSyncAlert.hidden = false;
        sheetSyncAlert.innerHTML =
          "<strong>Integración lista para activar:</strong> Cuando cargues tu URL de Google Apps Script en <code>js/config.js</code>, esta pantalla marcará automáticamente como <strong>PAGADO</strong> la fila <code>" +
          registrationId +
          "</code> en tu Google Sheet.";
      }
    } catch (err) {
      console.error("Error confirmando pago en Google Sheets:", err);
      sheetSyncAlert.className = "alert alert--warning";
      sheetSyncAlert.hidden = false;
      sheetSyncAlert.textContent =
        "Tu pago fue recibido, pero hubo una demora al actualizar el registro automático. Podés agendar tu turno igualmente y nuestro equipo validará tu comprobante.";
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
