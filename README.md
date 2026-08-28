# Hotel Bombay — Aplicaciones

Sistema de gestión hotelera del **Hotel Bombay**: reservas, habitaciones, pagos,
reportes y recomendaciones turísticas con IA.

---

## Datos del proyecto

| | |
|---|---|
| **Asignatura** | Proyectos Informáticos |
| **Docente** | Ing. Andrés Roberto León Yácelga, Mg. |
| **Universidad** | UNIANDES — Ambato, Ecuador |
| **Grupo** | 7 |

### Integrantes

| Integrante |
|---|
| Huallco Mungabusi Luis Fabián |
| Figueroa Ocampo Lisseth Nayely |
| Noboa Pumalema Javier David |

---

## Las dos aplicaciones

Esta carpeta contiene las dos aplicaciones que forman el sistema. Son proyectos
npm independientes: cada uno tiene su propio `package.json`, sus dependencias y
su puerto. Se comunican únicamente por HTTP, enviando y recibiendo JSON.

| Carpeta | Qué es | Puerto | Documentación |
|---|---|---|---|
| [`app-backend/`](app-backend/README.md) | API REST — NestJS 11 + TypeORM + MySQL 8 | 3000 | [README del backend](app-backend/README.md) |
| [`app-frontend/`](app-frontend/README.md) | Aplicación web — Angular 21 | 4200 | [README del frontend](app-frontend/README.md) |

### Backend — `app-backend`

API REST en **NestJS 11** sobre TypeScript. Expone todo bajo el prefijo `/api` y
está organizada en capas: el controlador recibe y valida, el servicio contiene la
lógica de negocio, y TypeORM traduce a SQL contra MySQL. El esquema de la base lo
mandan los scripts de `migrations/`, no el ORM. La documentación de todos los
endpoints se genera sola con Swagger en `/api/docs`.

### Frontend — `app-frontend`

Aplicación de página única en **Angular 21**, en modo *zoneless* y con
componentes standalone. No tiene lógica de negocio propia: todo lo pide a la API.
Se divide en `core` (servicios, guards e interceptores), `shared` (componentes
reutilizables) y `features` (una carpeta por pantalla).

---

## Orden de arranque

```
1. Base de datos MySQL
2. Migraciones      → cd app-backend  && node run-migration.js
3. Backend          → cd app-backend  && npm run dev      (puerto 3000)
4. Frontend         → cd app-frontend && npm start        (puerto 4200)
```

El frontend no funciona sin el backend levantado: todas sus pantallas obtienen
los datos de la API.

---

Para la descripción completa del proyecto, la arquitectura y la puesta en marcha
detallada, ver el [README principal del repositorio](../README.md).
