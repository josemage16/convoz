/**
 * ConVoz — Lógica principal de la landing page
 * - Gestión de WhatsApp e Instagram desde CONVOZ_CONFIG
 * - Apertura del formulario modal pre-seleccionando cada producto/paquete
 * - Validación de datos personales, prefijo + código de área + celular y localidad argentina
 * - Pre-agendamiento de hasta 5 recordatorios para "Recordatorios Programados"
 * - Guardado en Google Sheets vía Google Apps Script Web App
 * - Redirección al link de pago de dLocal Go (con modo vista previa si aún no se cargaron links)
 */

(function () {
  "use strict";

  const CFG = window.CONVOZ_CONFIG;
  const GEO = window.CONVOZ_GEO;
  const STORAGE_KEY = "convoz_last_registration";

  // Elementos del DOM
  const modalBackdrop = document.getElementById("registrationModal");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const form = document.getElementById("registrationForm");
  const productSelect = document.getElementById("productId");
  const planSummaryTitle = document.getElementById("planSummaryTitle");
  const planSummaryDesc = document.getElementById("planSummaryDesc");
  const planSummaryPrice = document.getElementById("planSummaryPrice");

  const countryCodeSelect = document.getElementById("countryCode");
  const customCountryWrap = document.getElementById("customCountryWrap");
  const customCountryInput = document.getElementById("customCountryCode");
  const areaCodeInput = document.getElementById("areaCode");
  const phoneNumberInput = document.getElementById("phoneNumber");
  const phonePreviewText = document.getElementById("phonePreviewText");

  const provinciaSelect = document.getElementById("provincia");
  const localidadInput = document.getElementById("localidad");
  const localidadDatalist = document.getElementById("localidadesList");

  const remindersPanel = document.getElementById("remindersPanel");
  const remindersContainer = document.getElementById("remindersContainer");

  const formStatusAlert = document.getElementById("formStatusAlert");
  const submitBtn = document.getElementById("submitRegistrationBtn");
  const demoPaymentBox = document.getElementById("demoPaymentBox");
  const demoSimulatePayBtn = document.getElementById("demoSimulatePayBtn");
  const demoWhatsAppBtn = document.getElementById("demoWhatsAppBtn");

  let lastSavedRegistration = null;

  /* ------------------------------------------------------------------------
     Inicialización
     ------------------------------------------------------------------------ */
  function init() {
    setupBrandLinks();
    setupMobileMenu();
    populateCountryCodes();
    populateProvinces();
    buildReminderRows(5);
    bindServiceButtons();
    bindModalEvents();
    bindFormEvents();
    handleInitialUrlParams();
  }

  function buildWhatsAppUrl(customMessage) {
    const msg = encodeURIComponent(customMessage || CFG.brand.whatsappDefaultMessage);
    return "https://wa.me/" + CFG.brand.whatsappNumber + "?text=" + msg;
  }

  function setupBrandLinks() {
    document.querySelectorAll("[data-whatsapp-link]").forEach(function (el) {
      const customMsg = el.getAttribute("data-whatsapp-message");
      el.setAttribute("href", buildWhatsAppUrl(customMsg));
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    });

    document.querySelectorAll("[data-instagram-link]").forEach(function (el) {
      if (CFG.brand.instagramConfigured && CFG.brand.instagramUrl) {
        el.setAttribute("href", CFG.brand.instagramUrl);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      } else {
        el.setAttribute("href", CFG.brand.instagramUrl || "#contacto");
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
        el.addEventListener("click", function (ev) {
          if (!CFG.brand.instagramConfigured) {
            ev.preventDefault();
            alert(
              "El perfil de Instagram de ConVoz se configurará próximamente en js/config.js (brand.instagramUrl)."
            );
          }
        });
      }
    });
  }

  function setupMobileMenu() {
    const toggleBtn = document.getElementById("mobileMenuBtn");
    const nav = document.getElementById("mainNav");
    if (!toggleBtn || !nav) return;

    toggleBtn.addEventListener("click", function () {
      const isOpen = nav.classList.toggle("is-open");
      toggleBtn.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggleBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  function populateCountryCodes() {
    if (!countryCodeSelect || !GEO) return;
    countryCodeSelect.innerHTML = "";
    GEO.countryCodes.forEach(function (item) {
      const opt = document.createElement("option");
      opt.value = item.code;
      opt.textContent = item.label;
      countryCodeSelect.appendChild(opt);
    });
    countryCodeSelect.value = "+54";
    updatePhonePreview();
  }

  function populateProvinces() {
    if (!provinciaSelect || !GEO) return;
    provinciaSelect.innerHTML = '<option value="">Seleccioná una provincia...</option>';
    Object.keys(GEO.argentinaProvinces).forEach(function (prov) {
      const opt = document.createElement("option");
      opt.value = prov;
      opt.textContent = prov;
      provinciaSelect.appendChild(opt);
    });
  }

  function updateLocalidadesDatalist(provincia) {
    if (!localidadDatalist || !GEO) return;
    localidadDatalist.innerHTML = "";
    const list = GEO.argentinaProvinces[provincia] || [];
    list.forEach(function (loc) {
      const opt = document.createElement("option");
      opt.value = loc;
      localidadDatalist.appendChild(opt);
    });
  }

  function buildReminderRows(count) {
    if (!remindersContainer) return;
    remindersContainer.innerHTML = "";
    for (let i = 1; i <= count; i++) {
      const row = document.createElement("div");
      row.className = "reminder-row";
      row.innerHTML =
        '<span class="reminder-index">' +
        i +
        "</span>" +
        '<input type="text" class="form-control" name="reminder_motivo_' +
        i +
        '" placeholder="Ej: Medicación presión / Turno médico" aria-label="Motivo del recordatorio ' +
        i +
        '">' +
        '<input type="text" class="form-control" name="reminder_fecha_' +
        i +
        '" placeholder="Día o fecha (Ej: Lun 25/11)" aria-label="Fecha o día del recordatorio ' +
        i +
        '">' +
        '<input type="time" class="form-control" name="reminder_hora_' +
        i +
        '" aria-label="Hora del recordatorio ' +
        i +
        '">';
      remindersContainer.appendChild(row);
    }
  }

  /* ------------------------------------------------------------------------
     Modal & selección de producto
     ------------------------------------------------------------------------ */
  function bindServiceButtons() {
    document.querySelectorAll("[data-select-product]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const productId = btn.getAttribute("data-select-product");
        openModal(productId);
      });
    });
  }

  function openModal(productId) {
    if (!modalBackdrop) return;
    const validId = CFG.products[productId] ? productId : "llamadas-3";
    productSelect.value = validId;
    syncSelectedProductUI(validId);

    hideAlert();
    demoPaymentBox.hidden = true;
    submitBtn.disabled = false;

    modalBackdrop.classList.add("is-open");
    modalBackdrop.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const firstInput = document.getElementById("nombre");
    if (firstInput) {
      setTimeout(function () {
        firstInput.focus();
      }, 60);
    }
  }

  function closeModal() {
    if (!modalBackdrop) return;
    modalBackdrop.classList.remove("is-open");
    modalBackdrop.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function syncSelectedProductUI(productId) {
    const product = CFG.products[productId];
    if (!product) return;

    planSummaryTitle.textContent = product.name;
    planSummaryDesc.textContent = product.description;
    planSummaryPrice.textContent = product.priceDisplay;

    // Mostrar panel de pre-agendamiento si es "Recordatorios Programados"
    if (remindersPanel) {
      remindersPanel.hidden = !product.requiresReminders;
    }

    // Ajustar texto del botón según disponibilidad
    if (product.status === "coming_soon") {
      submitBtn.textContent = "Guardar solicitud y continuar";
    } else {
      submitBtn.textContent = "Continuar al pago";
    }
  }

  function bindModalEvents() {
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener("click", closeModal);
    }
    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", function (ev) {
        if (ev.target === modalBackdrop) {
          closeModal();
        }
      });
    }
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && modalBackdrop && modalBackdrop.classList.contains("is-open")) {
        closeModal();
      }
    });
  }

  /* ------------------------------------------------------------------------
     Validación y eventos del formulario
     ------------------------------------------------------------------------ */
  function bindFormEvents() {
    if (productSelect) {
      productSelect.addEventListener("change", function () {
        syncSelectedProductUI(productSelect.value);
      });
    }

    if (countryCodeSelect) {
      countryCodeSelect.addEventListener("change", function () {
        const isOther = countryCodeSelect.value === "other";
        customCountryWrap.hidden = !isOther;
        const selectedGeo = GEO.countryCodes.find(function (c) {
          return c.code === countryCodeSelect.value;
        });
        if (selectedGeo && areaCodeInput) {
          areaCodeInput.placeholder = selectedGeo.defaultAreaPlaceholder;
        }
        updatePhonePreview();
      });
    }

    [customCountryInput, areaCodeInput, phoneNumberInput].forEach(function (el) {
      if (el) el.addEventListener("input", updatePhonePreview);
    });

    if (provinciaSelect) {
      provinciaSelect.addEventListener("change", function () {
        updateLocalidadesDatalist(provinciaSelect.value);
      });
    }

    if (form) {
      form.addEventListener("submit", handleFormSubmit);
    }

    if (demoSimulatePayBtn) {
      demoSimulatePayBtn.addEventListener("click", function () {
        if (!lastSavedRegistration) return;
        const url =
          "confirmacion.html?payment=success&demo=1&order_id=" +
          encodeURIComponent(lastSavedRegistration.registrationId) +
          "&payment_id=DEMO-" +
          Date.now();
        window.location.href = url;
      });
    }
  }

  function getResolvedCountryCode() {
    if (countryCodeSelect.value === "other") {
      let raw = (customCountryInput.value || "").trim().replace(/\s+/g, "");
      if (raw && !raw.startsWith("+")) raw = "+" + raw;
      return raw;
    }
    return countryCodeSelect.value;
  }

  function updatePhonePreview() {
    const cc = getResolvedCountryCode();
    const area = (areaCodeInput.value || "").replace(/[^\d]/g, "");
    const num = (phoneNumberInput.value || "").replace(/[^\d]/g, "");
    const parts = [cc, area, num].filter(Boolean);
    phonePreviewText.textContent =
      parts.length > 0 ? parts.join(" ") : "Ej: +54 11 55551234";
  }

  function setFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const errEl = document.getElementById(inputId + "Error");
    if (input) {
      input.classList.toggle("is-invalid", Boolean(message));
    }
    if (errEl) {
      errEl.textContent = message || "";
    }
  }

  function clearAllErrors() {
    [
      "nombre",
      "apellido",
      "fechaNacimiento",
      "dni",
      "email",
      "areaCode",
      "phoneNumber",
      "provincia",
      "localidad",
    ].forEach(function (id) {
      setFieldError(id, "");
    });
  }

  function validateForm() {
    clearAllErrors();
    let valid = true;

    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const fechaNacimiento = document.getElementById("fechaNacimiento").value;
    const dniRaw = document.getElementById("dni").value.trim();
    const dniDigits = dniRaw.replace(/[^\d]/g, "");
    const email = document.getElementById("email").value.trim();
    const countryCode = getResolvedCountryCode();
    const areaCode = areaCodeInput.value.replace(/[^\d]/g, "");
    const phoneNumber = phoneNumberInput.value.replace(/[^\d]/g, "");
    const provincia = provinciaSelect.value.trim();
    const localidad = localidadInput.value.trim();

    if (nombre.length < 2) {
      setFieldError("nombre", "Ingresá un nombre válido.");
      valid = false;
    }

    if (apellido.length < 2) {
      setFieldError("apellido", "Ingresá un apellido válido.");
      valid = false;
    }

    if (!fechaNacimiento) {
      setFieldError("fechaNacimiento", "Indicá la fecha de nacimiento.");
      valid = false;
    } else {
      const dob = new Date(fechaNacimiento + "T00:00:00");
      const today = new Date();
      if (isNaN(dob.getTime()) || dob > today || dob.getFullYear() < 1900) {
        setFieldError("fechaNacimiento", "Ingresá una fecha de nacimiento válida.");
        valid = false;
      }
    }

    if (dniDigits.length < 6 || dniDigits.length > 10) {
      setFieldError("dni", "Ingresá un DNI válido (entre 6 y 10 dígitos).");
      valid = false;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setFieldError("email", "Ingresá un correo electrónico válido (ej: nombre@dominio.com).");
      valid = false;
    }

    if (!countryCode || !/^\+\d{1,4}$/.test(countryCode)) {
      setFieldError("areaCode", "Ingresá un prefijo de país válido (ej: +54).");
      valid = false;
    }

    if (areaCode.length < 1 || areaCode.length > 5) {
      setFieldError("areaCode", "Ingresá el código de área o zona (ej: 11, 351).");
      valid = false;
    }

    if (phoneNumber.length < 6 || phoneNumber.length > 12) {
      setFieldError("phoneNumber", "Ingresá el número de celular sin 0 ni 15.");
      valid = false;
    }

    if (!provincia) {
      setFieldError("provincia", "Seleccioná la provincia de Argentina.");
      valid = false;
    }

    if (localidad.length < 2) {
      setFieldError("localidad", "Ingresá la localidad dentro de Argentina.");
      valid = false;
    }

    return valid;
  }

  function collectReminders() {
    const product = CFG.products[productSelect.value];
    if (!product || !product.requiresReminders) return [];
    const items = [];
    for (let i = 1; i <= (product.maxReminders || 5); i++) {
      const motivo = (form.elements["reminder_motivo_" + i]?.value || "").trim();
      const fecha = (form.elements["reminder_fecha_" + i]?.value || "").trim();
      const hora = (form.elements["reminder_hora_" + i]?.value || "").trim();
      if (motivo || fecha || hora) {
        items.push({ motivo: motivo, fecha: fecha, hora: hora });
      }
    }
    return items;
  }

  function generateRegistrationId() {
    const now = new Date();
    const pad = function (n) {
      return String(n).padStart(2, "0");
    };
    const datePart =
      now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return "CV-" + datePart + "-" + rand;
  }

  function showAlert(type, htmlMessage) {
    if (!formStatusAlert) return;
    formStatusAlert.className = "alert alert--" + type;
    formStatusAlert.innerHTML = htmlMessage;
    formStatusAlert.hidden = false;
  }

  function hideAlert() {
    if (!formStatusAlert) return;
    formStatusAlert.hidden = true;
    formStatusAlert.innerHTML = "";
  }

  /* ------------------------------------------------------------------------
     Envío a Google Sheets + Redirección a dLocal Go
     ------------------------------------------------------------------------ */
  async function saveToGoogleSheets(payload) {
    const url = (CFG.googleSheets.appsScriptWebAppUrl || "").trim();
    if (!url) {
      return {
        savedRemotely: false,
        reason: "apps_script_not_configured",
      };
    }

    // Usamos text/plain para evitar preflight CORS en Google Apps Script Web App
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

    const result = await response.json().catch(function () {
      return { ok: true };
    });

    if (result && result.ok === false) {
      throw new Error(result.error || "Error al guardar en Google Sheets");
    }

    return { savedRemotely: true, result: result };
  }

  function buildDlocalRedirectUrl(baseUrl, registrationId) {
    const separator = baseUrl.indexOf("?") === -1 ? "?" : "&";
    const param = encodeURIComponent(CFG.dlocalGo.orderIdParam || "order_id");
    return baseUrl + separator + param + "=" + encodeURIComponent(registrationId);
  }

  async function handleFormSubmit(ev) {
    ev.preventDefault();
    hideAlert();
    demoPaymentBox.hidden = true;

    if (!validateForm()) {
      showAlert("error", "Por favor revisá los campos marcados antes de continuar.");
      return;
    }

    const product = CFG.products[productSelect.value];
    const registrationId = generateRegistrationId();
    const countryCode = getResolvedCountryCode();
    const areaCode = areaCodeInput.value.replace(/[^\d]/g, "");
    const phoneNumber = phoneNumberInput.value.replace(/[^\d]/g, "");
    const fullPhone = countryCode + " " + areaCode + " " + phoneNumber;

    const payload = {
      action: "register",
      registrationId: registrationId,
      createdAt: new Date().toISOString(),
      productId: product.id,
      productName: product.name,
      productCategory: product.category,
      productStatus: product.status,
      price: product.price,
      priceDisplay: product.priceDisplay,
      nombre: document.getElementById("nombre").value.trim(),
      apellido: document.getElementById("apellido").value.trim(),
      fechaNacimiento: document.getElementById("fechaNacimiento").value,
      dni: document.getElementById("dni").value.trim().replace(/[^\d]/g, ""),
      email: document.getElementById("email").value.trim().toLowerCase(),
      countryCode: countryCode,
      areaCode: areaCode,
      phoneNumber: phoneNumber,
      fullPhone: fullPhone,
      provincia: provinciaSelect.value.trim(),
      localidad: localidadInput.value.trim(),
      reminders: collectReminders(),
    };

    // Guardamos localmente para recuperar el contexto al regresar de dLocal Go
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      // Ignorar si el navegador bloquea storage
    }
    lastSavedRegistration = payload;

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando tus datos...";

    let sheetsSaved = false;
    try {
      const sheetRes = await saveToGoogleSheets(payload);
      sheetsSaved = sheetRes.savedRemotely;
    } catch (err) {
      console.error("Error guardando en Google Sheets:", err);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      showAlert(
        "error",
        "No pudimos conectar con el registro en Google Sheets en este momento. Por favor reintentá o escribinos por WhatsApp al " +
          CFG.brand.whatsappDisplay +
          "."
      );
      return;
    }

    const paymentLink = (CFG.dlocalGo.paymentLinks[product.id] || "").trim();

    // Caso 1: El link de dLocal Go está configurado -> redirigir automáticamente
    if (paymentLink) {
      showAlert(
        "success",
        "¡Datos registrados correctamente! (Código <strong>" +
          registrationId +
          "</strong>). Te estamos derivando al enlace de pago seguro de <strong>dLocal Go</strong>..."
      );
      const targetUrl = buildDlocalRedirectUrl(paymentLink, registrationId);
      setTimeout(function () {
        window.location.href = targetUrl;
      }, 900);
      return;
    }

    // Caso 2: Link de dLocal Go pendiente de configuración -> mostrar confirmación + vista previa del flujo
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    const sheetNotice = sheetsSaved
      ? "Tus datos se guardaron correctamente en Google Sheets."
      : "Registro preparado localmente (recordá pegar tu Web App URL de Google Apps Script en <code>js/config.js</code> para sincronizar con el Google Sheet).";

    showAlert(
      "success",
      "<strong>Registro generado (" + registrationId + ").</strong> " + sheetNotice
    );

    if (demoWhatsAppBtn) {
      const waMsg =
        "Hola ConVoz, acabo de completar el formulario (Código " +
        registrationId +
        ") para " +
        product.name +
        " a nombre de " +
        payload.nombre +
        " " +
        payload.apellido +
        ".";
      demoWhatsAppBtn.setAttribute("href", buildWhatsAppUrl(waMsg));
    }

    demoPaymentBox.hidden = false;
    demoPaymentBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function handleInitialUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    if (plan && CFG.products[plan]) {
      openModal(plan);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
