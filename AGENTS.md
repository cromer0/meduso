# AGENTS.md — Guide for AI Agents Modifying This Project

This document is designed for any AI agent (Claude, Copilot, Cursor, etc.) to quickly understand the project and make correct modifications.

## Overview

Meduso is an e-commerce platform built with:

- **Backend**: MedusaJS v2 (`backend/`) — modular commerce framework based on Express.js.
- **Storefront**: Next.js 15 (`storefront/`) — public store with App Router and Turbopack.
- **Database**: PostgreSQL 16.
- **Cache/Events**: Redis 7.
- **Tests**: Jest + @medusajs/test-utils.
- **CI**: GitHub Actions (`.github/workflows/ci.yml`).

## Project Structure

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

## How MedusaJS v2 Works

### Key Concepts

- **Modules**: Self-contained units managing a specific domain (Product, Cart, Order, etc.). No direct dependencies between modules.
- **Workflows**: Transactional functions that orchestrate operations across modules. They use compensations for rollbacks.
- **Core-flows**: Prebuilt workflows provided by Medusa (`@medusajs/medusa/core-flows`). Use these before creating custom workflows.
- **Subscribers**: Event listeners (`product.created`, `order.placed`, etc.).
- **Links**: Soft connections between modules without foreign keys. Created using `container.resolve(ContainerRegistrationKeys.LINK)`.
- **API Routes**: REST endpoints in `src/api/`. Files follow the convention: `src/api/store/custom/route.ts`.
- **Admin customizations**: Widgets and pages in `src/admin/`. They are automatically injected into the dashboard.

### Dependency Injection

MedusaJS uses an IoC container. To resolve services:

```typescript
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// In an API route, subscriber, or workflow step:
const productService = container.resolve(Modules.PRODUCT)
const query = container.resolve(ContainerRegistrationKeys.QUERY)
const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
```

### ORM

MedusaJS v2 uses **MikroORM** (not TypeORM). Do not access the DB directly — always use module services or `query.graph()`.

## How to Add Features

### New Product (via seed)

Edit `backend/src/scripts/seed.ts` and add to the `createProductsWorkflow` array. Then run: `make infra-reset && make migrate && make seed`.

### New Custom Module

1. Create a directory in `backend/src/modules/<name>/`.
2. Minimal structure:
   ```
   modules/custom-module/
   ├── index.ts          # Module export
   ├── service.ts        # Business logic
   └── models/           # Data models (MikroORM entities)
   ```
3. Register in `backend/medusa-config.ts` → `modules: [...]`.

### New Workflow

1. Create in `backend/src/workflows/<name>.ts`.
2. Use `createWorkflow` and `createStep` from `@medusajs/framework/workflows-sdk`.
3. Each step must have a compensation function for rollback.

### New API Route

1. Create a file in `backend/src/api/store/<path>/route.ts` (store API) or `backend/src/api/admin/<path>/route.ts` (admin API).
2. Export functions named after HTTP methods: `GET`, `POST`, `PUT`, `DELETE`.
3. Validation is handled using `validateAndTransformBody` and `validateAndTransformQuery`.

### New Subscriber

1. Create in `backend/src/subscribers/<name>.ts`.
2. Export a default function and a `config` with the event to listen for.

### New Test

- **Unit test**: `backend/src/<area>/__tests__/<name>.unit.spec.ts`.
- **Integration test**: `backend/integration-tests/http/<name>.spec.ts`.
- Use `medusaIntegrationTestRunner` for integration tests (it spins up a full Medusa instance with a temporary DB).

## Important Configuration

### `backend/medusa-config.ts`

Central configuration file. Controls:
- `databaseUrl` — PostgreSQL connection.
- `redisUrl` — Redis connection (enables distributed modules).
- `http.storeCors/adminCors/authCors` — CORS settings.
- `workerMode` — `"shared"` (dev), `"server"`, or `"worker"` (production).
- `admin.disable` — disable dashboard in workers.
- `modules` — list of custom and Redis-backed modules.

### Environment Variables

| Variable | Usage |
|----------|-----|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection (enables cache, events, workflows, locking) |
| `MEDUSA_WORKER_MODE` | `shared` / `server` / `worker` |
| `DISABLE_MEDUSA_ADMIN` | `true` for worker instances |
| `JWT_SECRET` / `COOKIE_SECRET` | Authentication secrets |

### Key Commands

```bash
make setup              # Full project setup from scratch
make backend-dev        # Backend development (hot-reload)
make storefront-dev     # Storefront development (hot-reload)
make test               # Run all tests
make test-unit          # Unit tests only
make test-integration   # Integration tests only
make seed               # Seed demo data
make migrate            # Run migrations
make build              # Production build
make prod-up            # Start production stack
```

## What NOT to Do

1. **Do not modify files in `.medusa/`** — it is a build-generated directory.
2. **Do not access the DB directly** with SQL queries or MikroORM — use module services.
3. **Do not create foreign keys between modules** — use Links instead.
4. **Do not install dependencies with npm or yarn** — always use **Bun**.
5. **Do not hardcode URLs or secrets** — use environment variables.
6. **Do not run migrations on every instance** — only once per deployment.
7. **Do not use TypeORM** — MedusaJS v2 uses MikroORM.
8. **Do not ignore compensations in workflows** — every step must be reversible.
9. **Do not modify `node_modules/`** or make manual patches.
10. **Do not add `console.log`** — use the container logger (`ContainerRegistrationKeys.LOGGER`).

## Common Errors

| Error | Cause | Solution |
|-------|-------|---------|
| `MetadataStorage` error in tests | Corrupt MikroORM cache | Check that `integration-tests/setup.js` calls `MetadataStorage.clear()` |
| CORS error in storefront | Backend misconfiguration | Verify `STORE_CORS` in backend `.env` includes storefront URL |
| Publishable key error | Key not linked | In Admin > Settings > API Keys, link the key to a sales channel |
| Products not showing | Sales channel not linked | Ensure products are linked to the default sales channel |
| `cannot find module .medusa/types` | Types not generated | Run `bunx medusa dev` or `bunx medusa build` at least once |
