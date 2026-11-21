/**
 * Configuración centralizada de ConVoz — Espacio de Charla
 * ========================================================
 * Editá únicamente este archivo para conectar:
 *   1. Google Sheets (URL del Web App de Google Apps Script)
 *   2. Links de pago de dLocal Go por producto
 *   3. Agendador de Google Calendar (Appointment Schedule)
 *   4. Redes sociales (Instagram) y WhatsApp
 */

window.CONVOZ_CONFIG = {
  brand: {
    name: "ConVoz",
    tagline: "Espacio de Charla",
    whatsappNumber: "59894460486",
    whatsappDisplay: "+598 94 460 486",
    whatsappDefaultMessage:
      "Hola ConVoz, me gustaría recibir más información sobre sus servicios de contención telefónica.",
    // TODO: Reemplazá con la URL oficial de Instagram de ConVoz cuando la tengas lista
    instagramUrl: "https://www.instagram.com/TU_USUARIO_INSTAGRAM/",
    instagramConfigured: false,
  },

  googleSheets: {
    // Hoja de cálculo oficial del proyecto:
    spreadsheetId: "1PJCmhnUB4ROTOtIDs2LUj3wHYXqai7V5lhJXY0J2yYU",
    spreadsheetUrl:
      "https://docs.google.com/spreadsheets/d/1PJCmhnUB4ROTOtIDs2LUj3wHYXqai7V5lhJXY0J2yYU/edit?usp=sharing",
    /**
     * URL de implementación (Web App URL) publicada desde google-apps-script/Code.gs
     */
    appsScriptWebAppUrl:
      "https://script.google.com/macros/s/AKfycbxoTBi_wthm-_0DU5lMrwDGIffFfXD6_Sm4AWXDK7RubET9rFFSCUsnLy9_PvJKQ628/exec",
  },

  dlocalGo: {
    /**
     * TODO: Pegá aquí los links de pago generados en tu panel de dLocal Go.
     * En cada link de pago de dLocal Go, configurá como URL de retorno exitoso (Success URL):
     *   https://<tu-dominio>/confirmacion.html?payment=success
     * Y opcionalmente como Notification URL (Webhook):
     *   <tu appsScriptWebAppUrl>
     */
    paymentLinks: {
      "llamadas-3": "",       // Paquete 3 llamadas ($100)
      "llamadas-6": "",       // Paquete 6 llamadas ($200)
      "llamadas-9": "",       // Paquete 9 llamadas ($300)
      "recordatorios-5": "",  // Paquete 5 recordatorios ($100)
      "chequeos-mensual": "", // Chequeos periódicos ($1.000/mes - Próximamente)
    },
    /**
     * Nombre del parámetro de query para enviar el ID de registro al link de pago
     * (dLocal Go acepta external_id o order_id según el tipo de checkout).
     */
    orderIdParam: "order_id",
  },

  googleCalendar: {
    /**
     * TODO: Pegá aquí el enlace de tu página de reservas de Google Calendar
     * (Google Calendar -> Crear -> Agenda de citas / Appointment Schedule).
     * Ejemplo: "https://calendar.google.com/calendar/appointments/schedules/AcZssZ..."
     */
    schedulingUrl: "",
    // Opcional: si querés un calendario diferente por modalidad, podés configurarlo aquí:
    schedulingUrlByProduct: {
      "llamadas-3": "",
      "llamadas-6": "",
      "llamadas-9": "",
      "recordatorios-5": "",
      "chequeos-mensual": "",
    },
  },

  products: {
    "llamadas-3": {
      id: "llamadas-3",
      category: "Llamadas Agendadas",
      name: "Llamadas Agendadas — Paquete de 3 llamadas",
      shortName: "3 Llamadas Agendadas",
      price: 100,
      currency: "$",
      priceDisplay: "$100",
      period: "paquete",
      description: "3 charlas telefónicas de 20 minutos. Elegís 1, 2 o 3 veces por semana.",
      status: "active",
      requiresReminders: false,
    },
    "llamadas-6": {
      id: "llamadas-6",
      category: "Llamadas Agendadas",
      name: "Llamadas Agendadas — Paquete de 6 llamadas",
      shortName: "6 Llamadas Agendadas",
      price: 200,
      currency: "$",
      priceDisplay: "$200",
      period: "paquete",
      description: "6 charlas telefónicas de 20 minutos. Elegís 1, 2 o 3 veces por semana.",
      status: "active",
      requiresReminders: false,
    },
    "llamadas-9": {
      id: "llamadas-9",
      category: "Llamadas Agendadas",
      name: "Llamadas Agendadas — Paquete de 9 llamadas",
      shortName: "9 Llamadas Agendadas",
      price: 300,
      currency: "$",
      priceDisplay: "$300",
      period: "paquete",
      description: "9 charlas telefónicas de 20 minutos. Elegís 1, 2 o 3 veces por semana.",
      status: "active",
      requiresReminders: false,
    },
    "recordatorios-5": {
      id: "recordatorios-5",
      category: "Recordatorios Programados",
      name: "Recordatorios Programados — Paquete de 5 recordatorios",
      shortName: "5 Recordatorios Programados",
      price: 100,
      currency: "$",
      priceDisplay: "$100",
      period: "paquete",
      description:
        "5 llamadas de recordatorio para medicamentos, citas o eventos importantes, pre-agendadas al comprar.",
      status: "active",
      requiresReminders: true,
      maxReminders: 5,
    },
    "chequeos-mensual": {
      id: "chequeos-mensual",
      category: "Chequeos Periódicos",
      name: "Chequeos Periódicos — Plan Mensual (Próximamente)",
      shortName: "Chequeos Periódicos (Mensual)",
      price: 1000,
      currency: "$",
      priceDisplay: "$1.000 / mes",
      period: "mes",
      description:
        "Llamadas periódicas de bienestar con insistencia y aviso a seres queridos ante falta de respuesta.",
      status: "coming_soon",
      requiresReminders: false,
    },
  },
};
