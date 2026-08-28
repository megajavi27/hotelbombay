# Hotel Bombay — Backend (API REST)

API REST del sistema de gestión hotelera **Hotel Bombay**: usuarios, clientes,
empleados, habitaciones y su galería de fotos, reservas, pagos, reportes en PDF
y recomendaciones turísticas asistidas por IA.

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
| Node.js | 20 LTS o superior | Entorno de ejecución |
| TypeScript | 5.7 | Lenguaje |
| NestJS | 11 | Framework del servidor (módulos, DI, controladores) |
| TypeORM | 1.x | ORM sobre MySQL, con `synchronize: false` |
| MySQL | 8+ | Base de datos |
| Passport + passport-jwt | — | Estrategia de autenticación con JWT |
| bcryptjs | 2.4 | Hash de contraseñas |
| class-validator / class-transformer | — | Validación de DTOs y serialización de respuestas |
| Multer (`FilesInterceptor`) | — | Subida de fotos de habitaciones y comprobantes de pago |
| OpenAI (`gpt-4o-mini`) | SDK 6 | Chat de recomendaciones turísticas |
| Nodemailer / Mailtrap | 9 / — | Envío de correos (comprobantes y recuperación de contraseña) |
| Moment.js | 2.30 | Cálculo de noches y rangos de fechas |

---

## Requisitos previos

- **Node.js 20** o superior y **npm 10+**
- **MySQL 8** corriendo en local (o accesible por red)
- Una cuenta gratuita de **[Mailtrap](https://mailtrap.io)** si se quiere probar
  el envío real de correos (opcional: sin configurar, los correos se imprimen en
  la consola)
- Una **API key de OpenAI** si se quiere usar el chat de recomendaciones
  (opcional: el resto del sistema funciona sin ella)

---

## Instalación de dependencias

```bash
cd app-backend
npm install
```

---

## Configuración

Copia `env.example.txt` como `.env` en la raíz de `app-backend/` y completa los
valores. **El archivo `.env` nunca se sube al repositorio.**

```env
PORT=
API_PREFIX=

# Base de datos MySQL
DB_HOST=
DB_PORT=
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=

# CORS y enlaces de los correos
CORS_ORIGIN=
FRONTEND_URL=

# IA (opcional)
OPENAI_API_KEY=

# Correo: API de Mailtrap
MAIL_TOKEN=
MAIL_FROM_ADDRESS=
MAIL_FROM_NAME=

# Desvía todos los correos a esta dirección (solo para pruebas)
MAIL_REDIRECT_TO=
```

> Si `MAIL_TOKEN` tiene valor se usa la API de Mailtrap y se ignora el SMTP.
> Si no se define ninguna de las dos opciones, la aplicación **no falla**:
> escribe el contenido de los correos en la consola.

---

## Base de datos

El esquema se administra con scripts SQL, no con `synchronize` de TypeORM. Los
scripts son la única fuente de verdad.

**1. Crear la base desde cero:**

```bash
mysql -u root -p < "../Hotel Bombay/database/dbhotelbombay.sql"
```

## Levantar el proyecto

```bash
npm run dev       # desarrollo con recarga automática (recomendado)
npm run start     # arranque simple, sin watch
npm run build     # compila a dist/
npm run prod      # ejecuta la versión compilada
```

Al arrancar, la consola muestra:

```
Hotel Bombay API corriendo en: http://localhost:3000/api
```

**Documentación interactiva (Swagger):** <http://localhost:3000/api/docs>
Desde ahí se pueden probar todos los endpoints; el botón *Authorize* permite
pegar el JWT para las rutas protegidas.

---

## Estructura del proyecto

```
app-backend/
├── migrations/              # Scripts SQL numerados
├── run-migration.js         # Ejecutor de migraciones
├── verificar-correo.js      # Diagnóstico de la configuración de correo
├── uploads/                 # Archivos subidos (fotos, comprobantes)
└── src/
    ├── main.ts              # Bootstrap: prefijo /api, CORS, Swagger, ValidationPipe
    ├── app.module.ts        # Conexión a MySQL y registro de módulos
    ├── common/
    │   ├── decorators/      # @CurrentUser, @Roles
    │   ├── guards/          # JwtAuthGuard, RolesGuard
    │   ├── services/        # MailService (módulo global)
    │   ├── utils/           # hash.util, date.util
    │   ├── dto/             # PaginationDto
    │   └── middleware/      # LoggerMiddleware
    └── modules/
        ├── auth/            # Login, registro, JWT, recuperación de contraseña
        ├── usuario/  cliente/  empleado/  perfil/
        ├── habitacion/      # Habitaciones + galería de imágenes
        ├── tipos-habitacion/
        ├── reserva/  pago/
        ├── reporte/         # PDF con Puppeteer
        ├── recomendacion-ia/  chat/   # Recomendaciones turísticas + OpenAI
        └── public/          # Endpoints sin autenticación (landing)
```

---

## Endpoints principales

Todos cuelgan del prefijo `/api`.

| Ruta base | Contenido |
|---|---|
| `/api/auth` | Login de cliente y empleado, registro, `me`, olvidé/restablecer contraseña |
| `/api/usuario` | CRUD de usuarios |
| `/api/cliente` | CRUD de clientes |
| `/api/empleado` | CRUD de empleados |
| `/api/perfil` | Perfiles/roles de empleado |
| `/api/habitacion` | CRUD de habitaciones y su galería de fotos |
| `/api/tipos-habitacion` | Tipos de habitación y tarifas |
| `/api/reserva` | Reservas, disponibilidad, check-in/check-out |
| `/api/pago` | Registro de pagos, comprobantes de transferencia, aprobación |
| `/api/reporte` | Reportes en PDF |
| `/api/recomendacion-ia` | CRUD del catálogo de recomendaciones |
| `/api/chat` | Consulta conversacional a la IA |
| `/api/public` | Datos públicos para la landing (sin token) |
| `/api/docs` | Swagger UI |

---

## Autenticación y autorización

1. El cliente o el empleado se autentica en `/api/auth/login-cliente` o
   `/api/auth/login-empleado`.
2. El backend responde con un **JWT** firmado con `JWT_SECRET`, que incluye el
   tipo de usuario (`cliente` / `empleado`) y su perfil.
3. El frontend envía ese token en la cabecera `Authorization: Bearer <token>`.
4. `JwtAuthGuard` valida el token y `RolesGuard` (junto al decorador `@Roles`)
   comprueba el perfil antes de permitir la operación.

Las contraseñas se guardan con **bcrypt**. Se mantiene compatibilidad de lectura
con los hashes SHA-256 de la versión anterior del proyecto, para no invalidar las
cuentas ya creadas.

### Recuperación de contraseña

- `POST /api/auth/olvide-password` genera un token aleatorio de 256 bits, guarda
  **solo su hash SHA-256** en la tabla `password_reset` y envía el enlace por
  correo. La respuesta es idéntica exista o no la cuenta, para que el endpoint no
  sirva para averiguar qué correos están registrados.
- `POST /api/auth/restablecer-password` consume el token: verifica que no esté
  usado ni expirado (1 hora de vigencia) y, dentro de una transacción, cambia la
  contraseña y marca el token como consumido.

---

## Scripts de apoyo

```bash
node verificar-correo.js   # Muestra la config de correo (enmascarando la clave)
                           # y prueba la autenticación SMTP. No envía nada.
npm run lint               # ESLint con --fix
npm test                   # Pruebas unitarias (Jest)
```

---

## Problemas comunes

| Síntoma | Causa habitual |
|---|---|
| Error 500 en un módulo que antes funcionaba | Falta ejecutar una migración: `node run-migration.js` |
| `535 5.7.0 Invalid credentials` al enviar correo | Se copiaron las credenciales de *Email Sending* en lugar de las de *Email Testing*, o `MAIL_HOST` está definido cuando se quería usar `MAIL_TOKEN` |
| `ERESOLVE` al instalar `mailtrap` | Usar `npm i mailtrap --legacy-peer-deps` |
| Los reportes en PDF fallan | Falta el navegador de Puppeteer: `npx puppeteer browsers install chrome` |
| El frontend recibe error de CORS | `CORS_ORIGIN` no coincide con la URL del frontend |
