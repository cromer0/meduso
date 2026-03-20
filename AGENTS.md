# AGENTS.md — Guía para IAs que modifiquen este proyecto

Este documento está diseñado para que cualquier agente de IA (Claude, Copilot, Cursor, etc.) pueda entender rápidamente el proyecto y hacer modificaciones correctas.

## Visión general

Meduso es un e-commerce construido con:

- **Backend**: MedusaJS v2 (`backend/`) — framework modular de comercio electrónico basado en Express.js
- **Storefront**: Next.js 15 (`storefront/`) — tienda pública con App Router y Turbopack
- **Base de datos**: PostgreSQL 16
- **Cache/Events**: Redis 7
- **Tests**: Jest + @medusajs/test-utils
- **CI**: GitHub Actions (`.github/workflows/ci.yml`)

## Estructura del proyecto

```
meduso/
├── backend/                    # MedusaJS v2 application
│   ├── src/
│   │   ├── admin/              # Admin dashboard customizations
│   │   ├── api/                # Custom REST API routes
│   │   ├── jobs/               # Scheduled/cron jobs
│   │   ├── links/              # Module link definitions
│   │   ├── modules/            # Custom business modules
│   │   ├── scripts/seed.ts     # Demo data seeder
│   │   ├── subscribers/        # Event listeners
│   │   └── workflows/          # Business logic workflows
│   ├── integration-tests/      # HTTP integration tests
│   ├── medusa-config.ts        # Central configuration
│   ├── jest.config.js          # Test configuration
│   └── package.json
├── storefront/                 # Next.js 15 storefront
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   ├── lib/                # SDK client, utilities
│   │   └── modules/            # UI feature modules
│   └── package.json
├── docker-compose.yml          # Local infrastructure
├── docker-compose.production.yml
├── Makefile                    # Development commands
└── .github/workflows/ci.yml   # CI pipeline
```

## Cómo funciona MedusaJS v2

### Conceptos clave

- **Modules**: Unidades autónomas que gestionan un dominio (Product, Cart, Order, etc.). Sin dependencias entre sí.
- **Workflows**: Funciones transaccionales que orquestan operaciones entre módulos. Usan compensaciones para rollback.
- **Core-flows**: Workflows prebuilt por Medusa (`@medusajs/medusa/core-flows`). Úsalos antes de crear workflows custom.
- **Subscribers**: Listeners de eventos (`product.created`, `order.placed`, etc.).
- **Links**: Conexiones entre módulos sin foreign keys. Se crean con `container.resolve(ContainerRegistrationKeys.LINK)`.
- **API Routes**: Endpoints REST en `src/api/`. Usan convención de archivos: `src/api/store/custom/route.ts`.
- **Admin customizations**: Widgets y páginas en `src/admin/`. Se inyectan en el dashboard automáticamente.

### Dependency injection

MedusaJS usa un contenedor IoC. Para resolver servicios:

```typescript
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// En un API route, subscriber, o workflow step:
const productService = container.resolve(Modules.PRODUCT)
const query = container.resolve(ContainerRegistrationKeys.QUERY)
const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
```

### ORM

MedusaJS v2 usa **MikroORM** (no TypeORM). No accedas a la DB directamente — usa siempre los servicios de módulo o `query.graph()`.

## Cómo añadir cosas

### Nuevo producto (vía seed)

Editar `backend/src/scripts/seed.ts` y añadir al array de `createProductsWorkflow`. Luego: `make infra-reset && make migrate && make seed`.

### Nuevo módulo custom

1. Crear directorio en `backend/src/modules/<nombre>/`
2. Estructura mínima:
   ```
   modules/custom-module/
   ├── index.ts          # Module export
   ├── service.ts        # Business logic
   └── models/           # Data models (MikroORM entities)
   ```
3. Registrar en `backend/medusa-config.ts` → `modules: [...]`

### Nuevo workflow

1. Crear en `backend/src/workflows/<nombre>.ts`
2. Usar `createWorkflow` y `createStep` de `@medusajs/framework/workflows-sdk`
3. Cada step debe tener una función de compensación para rollback

### Nueva API route

1. Crear archivo en `backend/src/api/store/<ruta>/route.ts` (store API) o `backend/src/api/admin/<ruta>/route.ts` (admin API)
2. Exportar funciones con nombre del método HTTP: `GET`, `POST`, `PUT`, `DELETE`
3. La validación se hace con `validateAndTransformBody` y `validateAndTransformQuery`

### Nuevo subscriber

1. Crear en `backend/src/subscribers/<nombre>.ts`
2. Exportar default una función y `config` con el evento a escuchar

### Nuevo test

- **Unit test**: `backend/src/<area>/__tests__/<nombre>.unit.spec.ts`
- **Integration test**: `backend/integration-tests/http/<nombre>.spec.ts`
- Usar `medusaIntegrationTestRunner` para tests de integración (levanta Medusa completo con DB temporal)

## Configuración importante

### `backend/medusa-config.ts`

Archivo central. Controla:
- `databaseUrl` — conexión PostgreSQL
- `redisUrl` — conexión Redis (activa módulos distribuidos)
- `http.storeCors/adminCors/authCors` — CORS
- `workerMode` — `"shared"` (dev), `"server"` o `"worker"` (producción)
- `admin.disable` — desactivar dashboard en workers
- `modules` — lista de módulos custom y Redis-backed modules

### Variables de entorno

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection (activa cache, events, workflows, locking distribuido) |
| `MEDUSA_WORKER_MODE` | `shared` / `server` / `worker` |
| `DISABLE_MEDUSA_ADMIN` | `true` para instancias worker |
| `JWT_SECRET` / `COOKIE_SECRET` | Secretos de autenticación |
| `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` | Orígenes permitidos |

## Comandos clave

```bash
make setup              # Setup completo desde cero
make backend-dev        # Desarrollo backend (hot-reload)
make storefront-dev     # Desarrollo storefront (hot-reload)
make test               # Ejecutar todos los tests
make test-unit          # Solo tests unitarios
make test-integration   # Solo tests de integración
make seed               # Seedear datos demo
make migrate            # Ejecutar migraciones
make build              # Build producción
make prod-up            # Levantar stack producción
```

## Qué NO hacer

1. **No modificar archivos en `.medusa/`** — es directorio generado por el build
2. **No acceder a la DB directamente** con queries SQL o MikroORM — usar servicios de módulo
3. **No crear foreign keys entre módulos** — usar Links en su lugar
4. **No instalar dependencias con `npm` en `storefront/`** — usa `yarn` (el proyecto usa yarn 4)
5. **No hardcodear URLs o secretos** — usar variables de entorno
6. **No ejecutar migraciones en cada instancia** — solo una vez por deploy
7. **No usar TypeORM** — MedusaJS v2 usa MikroORM
8. **No ignorar las compensaciones en workflows** — cada step debe poder revertirse
9. **No modificar `node_modules/`** ni hacer patches manuales
10. **No añadir `console.log`** — usar el logger del contenedor (`ContainerRegistrationKeys.LOGGER`)

## Errores comunes

| Error | Causa | Solución |
|-------|-------|---------|
| `MetadataStorage` error en tests | MikroORM cache corrupto | Verificar que `integration-tests/setup.js` hace `MetadataStorage.clear()` |
| CORS error en storefront | CORS mal configurado | Verificar `STORE_CORS` en backend `.env` incluye la URL del storefront |
| Publishable key error | Key no vinculada | En Admin > Settings > API Keys, vincular la key al sales channel |
| Products not showing | Sales channel no vinculado | Asegurar que productos están vinculados al sales channel default |
| `cannot find module .medusa/types` | Tipos no generados | Ejecutar `npx medusa develop` o `npx medusa build` al menos una vez |
