# Hotel Bombay — Frontend (Angular)

Aplicación web del sistema de gestión hotelera **Hotel Bombay**. Incluye la
página pública del hotel, el portal del cliente (reservas y pagos) y el panel
administrativo para empleados.

---

## Datos del proyecto

| | |
|---|---|
| **Universidad** | UNIANDES — Ambato, Ecuador |
| **Grupo** | 7 |

### Integrantes

- Noboa Pumalema Javier David
- Huallco Mungabusi Luis Fabián
- Figueroa Ocampo Lisseth Nayely

---

## Tecnologías

| Tecnología | Versión | Para qué se usa |
|---|---|---|
| Angular | 21 | Framework, en modo **zoneless** (sin `zone.js`) |
| TypeScript | 5.9 | Lenguaje, con `strict` y `strictTemplates` |
| Angular Material | 21 | Componentes de interfaz |
| Tailwind CSS | 4 | Utilidades de estilo y tokens de marca |


**Decisiones de arquitectura aplicadas en todo el proyecto:**

- Componentes **standalone** (sin `NgModule`).
- **Signals** para el estado de los componentes.
- Sintaxis de control de flujo nueva: `@if`, `@for`, `@switch`.
- Rutas con **carga diferida** (`loadComponent`).
- **Alias de importación** definidos en `tsconfig.json`.

---

## Requisitos previos

- **Node.js 20** o superior y **npm 10+**
- El **backend corriendo en `http://localhost:3000`** antes de abrir el frontend
- Angular CLI (opcional; se puede usar con `npx`)

---

## Instalación de dependencias

```bash
cd app-frontend
npm install
```

---

## Configuración

La URL de la API se define en `src/app/core/environments/`:

```ts
// environment.ts (desarrollo)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  filesBaseUrl: 'http://localhost:3000'   // origen sin /api, para /uploads/...
};
```

`environment.prod.ts` usa rutas relativas (`/api`), asumiendo que en producción
el frontend y el backend se sirven bajo el mismo dominio a través de un proxy
inverso. Si el backend vive en otro dominio, hay que poner ahí la URL absoluta.

---

## Levantar el proyecto

```bash
npm start          # equivale a: ng serve
```

Disponible en <http://localhost:4200>.

Otros comandos:

```bash
npm run build      # compila para producción en dist/
npm run watch      # compila en modo desarrollo y se queda observando cambios
npm test           # pruebas unitarias (Vitest)
```

---

## Estructura del proyecto

```
app-frontend/src/
├── main.ts
├── styles.css                 # Estilos globales y tipografías
├── material-theme.scss        # Tema de Angular Material
└── app/
    ├── app.config.ts          # Providers: HTTP, router, zoneless, locale es
    ├── app.routes.ts          # Rutas públicas, de cliente y de administración
    ├── core/
    │   ├── config/            # datepicker-es.config.ts (calendarios en español)
    │   ├── environments/      # apiUrl y filesBaseUrl
    │   ├── guards/            # auth.guard.ts, perfil.guard.ts
    │   ├── interceptors/      # auth.interceptor.ts (adjunta el JWT, maneja 401)
    │   ├── services/          # Un servicio por recurso de la API
    │   └── utils/             # imagen.util.ts, etc.
    ├── shared/components/     # page-layout, confirm-dialog, toast,
    │                          # lightbox, galeria-habitacion, galeria-visor
    └── features/
        ├── public/            # Landing del hotel
        ├── auth/              # Login, registro, olvide/restablecer contraseña
        ├── portal-cliente/    # Mi inicio, mis reservas, mi perfil
        ├── dashboard/         # Panel con indicadores y gráficos
        ├── usuarios/  clientes/  empleados/
        ├── habitaciones/  tipos-habitacion/
        ├── reservas/  pagos/
        ├── reportes/          # Descarga de PDF
        └── recomendaciones/   # Catálogo y chat con la IA
```

### Alias de importación

Definidos en `tsconfig.json`, para evitar rutas relativas largas:

| Alias | Apunta a |
|---|---|
| `@services/*` | `src/app/core/services/*` |
| `@guards/*` | `src/app/core/guards/*` |
| `@interceptors/*` | `src/app/core/interceptors/*` |
| `@environments/*` | `src/app/core/environments/*` |
| `@utils/*` | `src/app/core/utils/*` |
| `@shared/*` | `src/app/shared/*` |
| `@app/*` | `src/app/*` |

---

## Rutas

| Ruta | Acceso |
|---|---|
| `/` | Pública — landing del hotel |
| `/login`, `/registro` | Pública |
| `/olvide-password`, `/restablecer-password` | Pública |
| `/mi-inicio`, `/mis-reservas`, `/mi-perfil` | Cliente autenticado |
| `/dashboard` | Empleado |
| `/usuarios`, `/clientes`, `/empleados` | Empleado (según perfil) |
| `/habitaciones`, `/tipos-habitacion` | Empleado |
| `/reservas`, `/pagos` | Empleado |
| `/reportes`, `/recomendaciones` | Empleado |

`authGuard` protege las rutas que requieren sesión; `perfilGuard` restringe las
que dependen del perfil del empleado.

---

## Detalles de implementación

**Autenticación.** El JWT que devuelve el backend se guarda en el navegador y
`auth.interceptor.ts` lo adjunta como `Authorization: Bearer <token>` en cada
petición. Si el backend responde `401`, el interceptor limpia la sesión y
redirige a `/login`.

**Calendarios en español.** `app.config.ts` registra el locale `es` de Moment,
provee `MAT_DATE_LOCALE: 'es'` y una subclase de `MatDatepickerIntl` con todos
los textos traducidos. Con el locale `es` la semana empieza en lunes.

**Galería de habitaciones.** Cada habitación admite varias fotos. El componente
`galeria-habitacion` gestiona la subida y el orden; `galeria-visor` las muestra;
el componente `lightbox` abre cualquier imagen a pantalla completa con zoom de
1× a 5×, arrastre para desplazar, flechas para navegar y atajos de teclado
(`Esc`, flechas, `+`, `−`, `0`).

**Marca.** Los colores y tipografías del hotel están declarados como tokens en
`tailwind.config.js` (azul profundo `#04162e`, dorado `#755a34`, tipografías
Playfair Display y Montserrat), para que no haya colores sueltos en las
plantillas.

---

## Problemas comunes

| Síntoma | Solución |
|---|---|
| Todas las pantallas fallan al cargar datos | El backend no está corriendo en `http://localhost:3000` |
| Un cambio en el código no se refleja | Detener el servidor, borrar `.angular/cache` y volver a `npm start`; luego recargar con `Ctrl+Shift+R` |
| Las imágenes no aparecen | `filesBaseUrl` no apunta al origen correcto del backend |
| Error de CORS en la consola | `CORS_ORIGIN` del backend no coincide con `http://localhost:4200` |
