# Plan: Meduso E-Commerce with MedusaJS v2

## Context

Create a complete e-commerce platform from scratch using MedusaJS v2. The repository starts empty. The goal is to have a production-ready project with: MedusaJS backend, Next.js storefront, demo data, automated tests, and a scalable distributed architecture.

## Architecture

```
meduso/
├── .github/workflows/ci.yml        # CI: lint, unit tests, integration tests, storefront build
├── backend/                         # MedusaJS v2 (Express + PostgreSQL + Redis)
│   ├── src/
│   │   ├── admin/                   # Custom admin widgets
│   │   ├── api/                     # Custom API routes
│   │   ├── modules/                 # Custom business modules
│   │   ├── scripts/seed.ts          # Demo data seed script
│   │   ├── subscribers/             # Event listeners
│   │   └── workflows/               # Custom workflows
│   ├── integration-tests/           # Integration tests
│   ├── Dockerfile                   # Multi-stage: dev + prod
│   ├── medusa-config.ts             # Central config (DB, Redis, CORS, modules)
│   └── jest.config.js
├── storefront/                      # Next.js 15 starter (app router)
│   ├── src/app/[countryCode]/       # Routes per country/region
│   ├── Dockerfile                   # Multi-stage: dev + prod
│   └── next.config.js               # output: "standalone"
├── docs/PLAN.md                     # Project architecture plan
├── AGENTS.md                        # Guide for AI Agents modifying the project
├── README.md                        # Detailed documentation
├── docker-compose.yml               # Local: PostgreSQL + Redis
├── docker-compose.production.yml    # Prod: server x2, worker, storefront, PG, Redis
└── Makefile                         # Development commands
```

**Decision: No monorepo tooling (turborepo)**. There are only 2 independent apps; Docker Compose and Makefile are sufficient to coordinate them.

## Implementation Steps

### Phase 1: Foundation

**1.1 Root files**

- `.gitignore`, `Makefile`, `docker-compose.yml`, `README.md`
- `docker-compose.yml` only starts PostgreSQL 16 and Redis 7 (the app runs natively for optimal hot-reload)
- `Makefile` with targets: `setup`, `infra-up`, `infra-down`, `dev`, `seed`, `test`, `build`, `prod-up`

**1.2 MedusaJS Backend**

- Manual scaffold based on `medusa-starter-default` (not interactive `create-medusa-app`)
- `medusa-config.ts` with:
  - Local PostgreSQL (`postgres://medusa:medusa@localhost:5432/meduso`)
  - Redis for cache, event-bus, workflow-engine, and locking (required for multi-instance)
  - CORS configured for storefront (`:8000`) and admin (`:9000`)
  - `workerMode` and `admin.disable` controlled by env vars
- Files: `package.json`, `tsconfig.json`, `.env.template`

**1.3 Migrations and Admin**

- `bunx medusa db:migrate`
- Admin user: `admin@meduso.dev` / `admin123`

### Phase 2: Seed Data

**2.1 Script `backend/src/scripts/seed.ts`**

Uses core-flows workflows from `@medusajs/medusa/core-flows`:

| Data        | Detail                                                              |
| ----------- | -------------------------------------------------------------------- |
| Store       | Name "Meduso Store", currencies EUR + USD                             |
| Regions     | Europe (ES, FR, DE, IT, PT) in EUR · North America (US, CA) in USD     |
| Tax regions | One per country                                                      |
| Warehouses  | "European Warehouse" (Madrid) · "US Warehouse" (New York)            |
| Shipping    | Standard (4.99€/5.99$) · Express (9.99€/12.99$) per region           |
| Categories  | T-Shirts, Hoodies, Pants, Accessories                                |
| Products    | 8 products with variants (size/color), EUR+USD prices, inventory     |
| API Key     | "Storefront" Publishable key linked to the sales channel             |

### Phase 3: Storefront

**3.1 Next.js Starter**

- Clone `medusajs/nextjs-starter-medusa` into `storefront/`
- Configure `.env` with `MEDUSA_BACKEND_URL` and publishable key
- Port `:8000`

### Phase 4: Production and Docker

**4.1 Dockerfiles** (multi-stage with `development` and `production` targets)

- `backend/Dockerfile`: built with `bunx medusa build`, production runs `.medusa/server/`, non-root user
- `storefront/Dockerfile`: Next.js standalone output, non-root user

**4.2 `docker-compose.production.yml`**

- `backend-server` with `replicas: 2` and `MEDUSA_WORKER_MODE=server`
- `backend-worker` with `MEDUSA_WORKER_MODE=worker` and `DISABLE_MEDUSA_ADMIN=true`
- `storefront`, `postgres`, `redis`
- All secrets via env vars

### Phase 5: Testing

**5.1 Test Infrastructure**

- `jest.config.js` with routing by `TEST_TYPE` env var (unit / integration:http / integration:modules)
- Transform with `@swc/jest`
- `.env.test` pointing to test DB

**5.2 Tests**

- `integration-tests/http/health.spec.ts` — health check endpoint
- `integration-tests/http/products.spec.ts` — validate products API
- Unit tests in `src/workflows/__tests__/`

**5.3 GitHub Actions CI** (`.github/workflows/ci.yml`)

- 4 parallel jobs: typecheck, unit tests, integration tests (with PostgreSQL+Redis as service containers), storefront build

### Phase 6: Documentation

**6.1 `docs/PLAN.md`**

- Maintain this plan in the project as permanent architecture documentation

**6.2 Detailed `README.md`**

- Prerequisites (Bun, Docker)
- Quick start (`make setup && make dev`)
- Complete table of Make commands
- Project architecture (diagram)
- Directory structure explained
- Step-by-step local development guide
- Product/price/shipping management (via admin dashboard)
- Seed data: what data is included and how to regenerate it
- Testing: how to run tests locally
- Docker: development vs production
- CI/CD: what the pipeline validates
- Production deployment
- Horizontal scaling (how to add nodes)

**6.3 `AGENTS.md`** — Guide for AI Agents

- Project overview and technology stack
- Code conventions and file structure
- How MedusaJS v2 works (modules, workflows, core-flows)
- How to add new products/modules/workflows/API routes
- How to add tests (unit vs integration, patterns to follow)
- Important configuration (`medusa-config.ts`, env vars)
- Common errors and how to avoid them
- Key commands for development and verification
- What NOT to do (do not modify generated files, do not use ORM directly, etc.)

## Critical Files

| File                            | Role                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `backend/medusa-config.ts`      | Central config: DB, Redis, CORS, worker mode, Redis modules for multi-instance |
| `backend/src/scripts/seed.ts`   | Full demo data using core-flows workflows                                        |
| `docker-compose.production.yml` | Production topology: server x2 + worker + storefront                             |
| `.github/workflows/ci.yml`      | CI pipeline with 4 parallel jobs                                                 |
| `Makefile`                      | DX: a single command for each operation                                          |

## Distributed Architecture

```
        ┌──────────────┐
        │ Load Balancer │
        └──────┬───────┘
    ┌──────────┼──────────┐
    │          │          │
┌───┴───┐ ┌───┴───┐ ┌───┴───┐
│Server1│ │Server2│ │ServerN│  ← Stateless, horizontally scalable
└───┬───┘ └───┬───┘ └───┬───┘
    └──────────┼──────────┘
         ┌─────┴─────┐
    ┌────┴────┐ ┌────┴────┐
    │PostgreSQL│ │  Redis  │  ← Shared state
    └────┬────┘ └────┬────┘
         │           │
    ┌────┴────┐ ┌────┴────┐
    │Replicas │ │Worker(s)│  ← Workers coordinated by Redis
    └─────────┘ └─────────┘
```

Key: Redis modules (`cache-redis`, `event-bus-redis`, `workflow-engine-redis`, `locking-redis`) replace default in-memory versions, allowing multiple instances without conflict.

## Verification

1. `make setup` → installs deps, migrates DB, seeds data, creates admin
2. `make backend-dev` → backend at `:9000`, admin at `:9000/app`
3. `make storefront-dev` → storefront at `:8000` with visible products
4. `make test` → unit + integration tests pass
5. `make prod-up` → full stack in Docker
6. Push to GitHub → CI pipeline green
