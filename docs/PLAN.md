# Plan: E-Commerce Meduso con MedusaJS v2

## Contexto

Crear un e-commerce completo desde cero usando MedusaJS v2. El repositorio está vacío (sin commits). El objetivo es tener un proyecto listo para producción con: backend MedusaJS, storefront Next.js, datos de ejemplo, tests automatizados y arquitectura distribuida escalable.

## Arquitectura

```
meduso/
├── .github/workflows/ci.yml        # CI: lint, unit tests, integration tests, storefront build
├── backend/                         # MedusaJS v2 (Express + PostgreSQL + Redis)
│   ├── src/
│   │   ├── admin/                   # Widgets personalizados del admin
│   │   ├── api/                     # API routes custom
│   │   ├── modules/                 # Módulos de negocio custom
│   │   ├── scripts/seed.ts          # Script de datos de ejemplo
│   │   ├── subscribers/             # Event listeners
│   │   └── workflows/               # Workflows custom
│   ├── integration-tests/           # Tests de integración
│   ├── Dockerfile                   # Multi-stage: dev + prod
│   ├── medusa-config.ts             # Config central (DB, Redis, CORS, módulos)
│   └── jest.config.js
├── storefront/                      # Next.js 15 starter (app router)
│   ├── src/app/[countryCode]/       # Rutas por país
│   ├── Dockerfile                   # Multi-stage: dev + prod
│   └── next.config.js               # output: "standalone"
├── docs/PLAN.md                     # Plan de arquitectura del proyecto
├── AGENTS.md                        # Guía para IAs que modifiquen el proyecto
├── README.md                        # Documentación detallada
├── docker-compose.yml               # Local: PostgreSQL + Redis
├── docker-compose.production.yml    # Prod: server x2, worker, storefront, PG, Redis
└── Makefile                         # Comandos de desarrollo
```

**Decisión: Sin monorepo tooling (turborepo)**. Son solo 2 apps independientes; Docker Compose y Makefile son suficientes para coordinarlas.

## Pasos de implementación

### Fase 1: Fundación

**1.1 Archivos raíz**

- `.gitignore`, `Makefile`, `docker-compose.yml`, `README.md`
- `docker-compose.yml` solo levanta PostgreSQL 16 y Redis 7 (la app corre nativa para hot-reload óptimo)
- `Makefile` con targets: `setup`, `infra-up`, `infra-down`, `dev`, `seed`, `test`, `build`, `prod-up`

**1.2 Backend MedusaJS**

- Scaffold manual basado en `medusa-starter-default` (no `create-medusa-app` interactivo)
- `medusa-config.ts` con:
  - PostgreSQL local (`postgres://medusa:medusa@localhost:5432/meduso`)
  - Redis para cache, event-bus, workflow-engine y locking (necesario para multi-instancia)
  - CORS configurado para storefront (`:8000`) y admin (`:9000`)
  - `workerMode` y `admin.disable` controlados por env vars
- Archivos: `package.json`, `tsconfig.json`, `.env.template`

**1.3 Migraciones y admin**

- `npx medusa db:migrate`
- Admin user: `admin@meduso.dev` / `admin123`

### Fase 2: Seed Data

**2.1 Script `backend/src/scripts/seed.ts`**

Usa core-flows workflows de `@medusajs/medusa/core-flows`:

| Dato        | Detalle                                                              |
| ----------- | -------------------------------------------------------------------- |
| Store       | Nombre "Meduso Store", monedas EUR + USD                             |
| Regiones    | Europa (ES,FR,DE,IT,PT) en EUR · Norteamérica (US,CA) en USD         |
| Tax regions | Una por país                                                         |
| Almacenes   | "European Warehouse" (Madrid) · "US Warehouse" (New York)            |
| Envío       | Standard (4.99€/5.99$) · Express (9.99€/12.99$) por región           |
| Categorías  | Camisetas, Sudaderas, Pantalones, Accesorios                         |
| Productos   | 8 productos con variantes (talla/color), precios EUR+USD, inventario |
| API Key     | Publishable key "Storefront" vinculada al sales channel              |

### Fase 3: Storefront

**3.1 Next.js Starter**

- Clonar `medusajs/nextjs-starter-medusa` en `storefront/`
- Configurar `.env` con `MEDUSA_BACKEND_URL` y publishable key
- Puerto `:8000`

### Fase 4: Producción y Docker

**4.1 Dockerfiles** (multi-stage con targets `development` y `production`)

- `backend/Dockerfile`: build con `npx medusa build`, producción ejecuta `.medusa/server/`, non-root user
- `storefront/Dockerfile`: Next.js standalone output, non-root user

**4.2 `docker-compose.production.yml`**

- `backend-server` con `replicas: 2` y `MEDUSA_WORKER_MODE=server`
- `backend-worker` con `MEDUSA_WORKER_MODE=worker` y `DISABLE_MEDUSA_ADMIN=true`
- `storefront`, `postgres`, `redis`
- Todos los secretos via env vars

### Fase 5: Testing

**5.1 Infraestructura de tests**

- `jest.config.js` con routing por `TEST_TYPE` env var (unit / integration:http / integration:modules)
- Transform con `@swc/jest`
- `.env.test` apuntando a DB de test

**5.2 Tests**

- `integration-tests/http/health.spec.ts` — health check endpoint
- `integration-tests/http/products.spec.ts` — validar API de productos
- Tests unitarios en `src/workflows/__tests__/`

**5.3 GitHub Actions CI** (`.github/workflows/ci.yml`)

- 4 jobs paralelos: typecheck, unit tests, integration tests (con PostgreSQL+Redis como service containers), storefront build

### Fase 6: Documentación

**6.1 `docs/PLAN.md`**

- Copiar este plan al proyecto como documentación de arquitectura permanente

**6.2 `README.md` detallado**

- Requisitos previos (Node 20, Docker)
- Quick start (`make setup && make dev`)
- Tabla completa de comandos Make
- Arquitectura del proyecto (diagrama)
- Estructura de directorios explicada
- Guía de desarrollo local paso a paso
- Gestión de productos/precios/envío (vía admin dashboard)
- Seed data: qué datos incluye y cómo regenerarlos
- Testing: cómo ejecutar tests localmente
- Docker: desarrollo vs producción
- CI/CD: qué valida el pipeline
- Despliegue a producción
- Escalado horizontal (cómo añadir nodos)

**6.3 `AGENTS.md`** — Guía para IAs

- Visión general del proyecto y stack tecnológico
- Convenciones de código y estructura de archivos
- Cómo funciona MedusaJS v2 (módulos, workflows, core-flows)
- Cómo añadir nuevos productos/módulos/workflows/API routes
- Cómo añadir tests (unit vs integration, patterns a seguir)
- Configuración importante (`medusa-config.ts`, env vars)
- Errores comunes y cómo evitarlos
- Comandos clave para desarrollo y verificación
- Qué NO hacer (no modificar archivos generados, no usar ORM directamente, etc.)

## Archivos críticos

| Archivo                         | Rol                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `backend/medusa-config.ts`      | Config central: DB, Redis, CORS, worker mode, módulos Redis para multi-instancia |
| `backend/src/scripts/seed.ts`   | Datos demo completos usando core-flows workflows                                 |
| `docker-compose.production.yml` | Topología producción: server x2 + worker + storefront                            |
| `.github/workflows/ci.yml`      | Pipeline CI con 4 jobs paralelos                                                 |
| `Makefile`                      | DX: un solo comando para cada operación                                          |

## Arquitectura distribuida

```
        ┌──────────────┐
        │ Load Balancer │
        └──────┬───────┘
    ┌──────────┼──────────┐
    │          │          │
┌───┴───┐ ┌───┴───┐ ┌───┴───┐
│Server1│ │Server2│ │ServerN│  ← Stateless, escalan horizontalmente
└───┬───┘ └───┬───┘ └───┬───┘
    └──────────┼──────────┘
         ┌─────┴─────┐
    ┌────┴────┐ ┌────┴────┐
    │PostgreSQL│ │  Redis  │  ← Estado compartido
    └────┬────┘ └────┬────┘
         │           │
    ┌────┴────┐ ┌────┴────┐
    │Replicas │ │Worker(s)│  ← Workers coordinados por Redis
    └─────────┘ └─────────┘
```

Clave: módulos Redis (`cache-redis`, `event-bus-redis`, `workflow-engine-redis`, `locking-redis`) reemplazan los in-memory por defecto, permitiendo múltiples instancias sin conflicto.

## Verificación

1. `make setup` → instala deps, migra DB, seedea datos, crea admin
2. `make backend-dev` → backend en `:9000`, admin en `:9000/app`
3. `make storefront-dev` → storefront en `:8000` con productos visibles
4. `make test` → unit + integration tests pasan
5. `make prod-up` → stack completo en Docker
6. Push a GitHub → CI pipeline verde
