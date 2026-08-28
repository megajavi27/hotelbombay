# Hotel Bombay — Aplicaciones

Esta carpeta contiene las dos aplicaciones que forman el sistema. Son proyectos
npm independientes: cada uno tiene su propio `package.json`, sus dependencias y
su puerto. Se comunican únicamente por HTTP.

| Carpeta | Qué es | Puerto | Documentación |
|---|---|---|---|
| [`app-backend/`](app-backend/README.md) | API REST — NestJS 11 + TypeORM + MySQL | 3000 | [README del backend](app-backend/README.md) |
| [`app-frontend/`](app-frontend/README.md) | Aplicación web — Angular 21 | 4200 | [README del frontend](app-frontend/README.md) |

## Orden de arranque

```
1. Base de datos MySQL
2. Migraciones      → cd app-backend && node run-migration.js
3. Backend          → cd app-backend  && npm run dev      (puerto 3000)
4. Frontend         → cd app-frontend && npm start        (puerto 4200)
```

El frontend no funciona sin el backend levantado: todas sus pantallas obtienen
los datos de la API.

---

Para la descripción completa del proyecto, los integrantes del grupo, la
arquitectura y la puesta en marcha detallada, ver el
[README principal del repositorio](../README.md).
