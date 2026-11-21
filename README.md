# ConVoz — Espacio de Charla (Landing Informativa y Flujo de Contratación)

Landing page informativa y flujo completo de contratación para **ConVoz**, servicio de contención telefónica, soporte emocional y acompañamiento holístico para adultos mayores.

Diseñada sin dependencias de compilación (HTML5, CSS3 y JavaScript puro) para publicar directamente en **GitHub Pages**, Netlify, Vercel o cualquier hosting estático.

---

## Estructura del proyecto

```text
convoz/
├── index.html                      # Landing principal + Modal de contratación
├── confirmacion.html               # Página post-pago dLocal Go -> actualiza Google Sheets -> Google Calendar
├── css/styles.css                  # Sistema de diseño alineado al logo oficial de ConVoz
├── js/
│   ├── config.js                   # ÚNICO archivo a editar para cargar links (Apps Script, dLocal Go, Calendar, Instagram)
│   ├── argentina-localidades.js    # 24 provincias de Argentina, localidades y prefijos de país
│   ├── app.js                      # Lógica del formulario, validación, recordatorios y redirección a dLocal Go
│   └── confirmacion.js             # Confirmación de pago en Google Sheets y agendador de Google Calendar
├── google-apps-script/
│   └── Code.gs                     # Backend para el Google Sheet oficial (registro + confirmación de pago + webhook dLocal Go)
├── assets/
│   ├── logo-convoz.png             # Logo oficial recortado con fondo transparente
│   ├── logo-convoz-original.jpg    # Logo original
│   └── hero-convoz.jpg             # Fotografía editorial principal
└── sync-github.ps1                 # Script PowerShell para sincronizar con https://github.com/josemage16/convoz.git
```

---

## Configuración paso a paso

### 1. Conectar Google Sheets (guardar formulario + marcar pagos)

Hoja oficial configurada en el script:
`https://docs.google.com/spreadsheets/d/1PJCmhnUB4ROTOtIDs2LUj3wHYXqai7V5lhJXY0J2yYU/edit?usp=sharing`

1. Abrí esa planilla de Google Sheets.
2. En el menú superior entrá a **Extensiones → Apps Script**.
3. Reemplazá el contenido inicial pegando todo el código de [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
4. Guardá el proyecto y hacé clic en **Implementar → Nueva implementación**.
5. Elegí tipo **Aplicación web**:
   - **Ejecutar como:** Yo
   - **Quién tiene acceso:** Cualquier usuario
6. Copiá la **URL de la aplicación web** (`https://script.google.com/macros/s/.../exec`).
7. Pegala en [`js/config.js`](js/config.js) dentro de `googleSheets.appsScriptWebAppUrl`.

> La primera vez que reciba un registro, el script creará automáticamente la pestaña **Registros ConVoz** y todos los encabezados (incluyendo estado de pago, fecha de confirmación e ID de transacción).

---

### 2. Conectar links de pago de dLocal Go

1. Generá en tu panel de **dLocal Go** los links de pago para cada servicio:
   - `llamadas-3` — 3 Llamadas Agendadas ($100)
   - `llamadas-6` — 6 Llamadas Agendadas ($200)
   - `llamadas-9` — 9 Llamadas Agendadas ($300)
   - `recordatorios-5` — 5 Recordatorios Programados ($100)
   - `chequeos-mensual` — Chequeos Periódicos ($1.000/mes)
2. Pegá cada enlace en `dlocalGo.paymentLinks` dentro de [`js/config.js`](js/config.js).
3. En la configuración de cada pago en dLocal Go:
   - **Success / Return URL:** `https://<tu-dominio>/confirmacion.html?payment=success`
   - **Notification URL (Webhook opcional pero recomendado):** pegá tu misma `appsScriptWebAppUrl` de Google Apps Script. De este modo, incluso si el usuario cierra la ventana al terminar de pagar, la hoja de Google Sheets quedará marcada como **PAGADO**.

---

### 3. Conectar el Agendador de Google Calendar

1. En Google Calendar, creá una **Agenda de citas** (*Appointment Schedule*).
2. Copiá el enlace de la página de reservas (`https://calendar.google.com/calendar/appointments/schedules/...`).
3. Pegalo en `googleCalendar.schedulingUrl` dentro de [`js/config.js`](js/config.js) (también podés asignar calendarios específicos por modalidad en `schedulingUrlByProduct`).

---

### 4. Cargar tu dirección de Instagram

En [`js/config.js`](js/config.js), actualizá:
```js
instagramUrl: "https://www.instagram.com/tu_cuenta/",
instagramConfigured: true,
```

El botón de WhatsApp ya se encuentra activo y apuntando a **`+598 94 460 486`** (`https://wa.me/59894460486`).

---

## Sincronizar con GitHub (`josemage16/convoz.git`)

1. Asegurate de tener Git instalado (en Windows podés instalarlo con `winget install --id Git.Git -e --source winget`).
2. Abrí PowerShell en la carpeta del proyecto y ejecutá:
   ```powershell
   .\sync-github.ps1
   ```
3. Para publicar el sitio gratis en **GitHub Pages**:
   - Entrá a `https://github.com/josemage16/convoz/settings/pages`
   - En **Source**, elegí **Deploy from a branch** → rama `main` → carpeta `/ (root)` y guardá.
   - En 1-2 minutos el sitio quedará online en `https://josemage16.github.io/convoz/`.
