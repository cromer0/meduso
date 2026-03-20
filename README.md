# Meduso - E-Commerce with MedusaJS v2

Full-featured e-commerce built with [MedusaJS v2](https://medusajs.com/) (backend) and [Next.js 15](https://nextjs.org/) (storefront).

## Prerequisites

- **Bun** >= 1.0 (Runtime and package manager)
- **Docker** and **Docker Compose** (for PostgreSQL and Redis)

## Quick Start

```bash
git clone https://github.com/cromer0/meduso.git
cd meduso
make setup        # Start infra, install deps, migrate DB, seed data, create admin
make backend-dev  # Terminal 1: backend at http://localhost:9000
make storefront-dev  # Terminal 2: storefront at http://localhost:8000
```

**Admin dashboard:** http://localhost:9000/app
- Email: `admin@meduso.dev`
- Password: `admin123`

## Architecture

```
meduso/
├── backend/          # MedusaJS v2 (REST API + Admin dashboard)
├── storefront/       # Next.js 15 (public shop)
├── docker-compose.yml              # Local infra (PostgreSQL + Redis)
├── docker-compose.production.yml   # Full production stack
└── Makefile                        # Development commands
```

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | MedusaJS v2 (Express.js) |
| Database | PostgreSQL 16 |
| Cache / Events | Redis 7 |
| Admin | MedusaJS Dashboard (Vite) |
| Storefront | Next.js 15 (App Router, Turbopack) |
| Styling | Tailwind CSS |
| Tests | Jest + @medusajs/test-utils |
| CI/CD | GitHub Actions |

### Production Diagram

```
        ┌──────────────┐
        │ Load Balancer │
        └──────┬───────┘
    ┌──────────┼──────────┐
    │          │          │
┌───┴───┐ ┌───┴───┐ ┌───┴───┐
│Server1│ │Server2│ │ServerN│   ← backend-server (stateless)
└───┬───┘ └───┬───┘ └───┬───┘
    └──────────┼──────────┘
         ┌─────┴─────┐
    ┌────┴────┐ ┌────┴────┐
    │PostgreSQL│ │  Redis  │    ← Shared state
    └────┬────┘ └────┬────┘
         │           │
    ┌────┴────┐ ┌────┴────┐
    │Replicas │ │Worker(s)│    ← backend-worker
    └─────────┘ └─────────┘
```

## Available Commands

| Command | Description |
|---------|------------|
| `make setup` | Full setup: infra + deps + migrations + seed + admin |
| `make infra-up` | Start PostgreSQL and Redis |
| `make infra-down` | Stop infrastructure containers |
| `make infra-reset` | Destroy volumes and restart infra |
| `make backend-dev` | Backend with hot-reload (`:9000`) |
| `make storefront-dev` | Storefront with hot-reload (`:8000`) |
| `make migrate` | Run database migrations |
| `make seed` | Seed demonstration data |
| `make test` | Run all tests |
| `make test-unit` | Unit tests only |
| `make test-integration` | Integration tests only |
| `make build` | Production build (backend + storefront) |
| `make prod-up` | Start production stack in Docker |
| `make prod-down` | Stop production stack |
| `make clean` | Clean build artifacts |

## Local Development

### Development Structure

In local development, **PostgreSQL and Redis run in Docker** while the backend and storefront run natively on your machine. This offers instant hot-reload without file synchronization latency.

```
Docker:  PostgreSQL (:5432) + Redis (:6379)
Native:  Backend (:9000) + Storefront (:8000)
```

### Daily Workflow

```bash
make infra-up         # If not already running
make backend-dev      # Terminal 1
make storefront-dev   # Terminal 2
```

### Environment Variables

- `backend/.env` — backend configuration (created from `.env.template`)
- `storefront/.env.local` — storefront configuration (created from `.env.template`)

## Product and Price Management

Management is done from the **Admin dashboard** (http://localhost:9000/app) without the need for technical intervention:

- **Products**: Create/edit products, variants (size, color), images, and descriptions
- **Prices**: Configure prices by currency (EUR, USD) and region
- **Categories**: Organize products into categories
- **Shipping**: Configure shipping rates by geographic zone
- **Regions**: Manage regions with their currencies and countries
- **Inventory**: Control stock by warehouse and product

## Demo Data (Seed)

The seed data includes everything ready to use:

| Type | Data |
|------|-------|
| **Regions** | Europe (ES, FR, DE, IT, PT, NL, BE) and North America (US, CA) |
| **Currencies** | EUR (default) and USD |
| **Warehouses** | European Warehouse (Madrid) and US Warehouse (New York) |
| **Shipping** | Standard (4.99€) and Express (9.99€) per region |
| **Categories** | T-Shirts, Hoodies, Pants, Accessories |
| **Products** | 8 products with size and color variants |

To regenerate data:

```bash
make infra-reset   # Clean DB
make migrate       # Re-create tables
make seed          # Re-seed data
```

## Testing

### Local Tests

```bash
make test              # All tests
make test-unit         # Unit tests (no DB)
make test-integration  # Integration tests (requires PostgreSQL + Redis)
```

### Test Types

| Type | Location | Description |
|------|-----------|------------|
| Unit | `src/**/__tests__/*.unit.spec.ts` | Business logic unit tests |
| Integration HTTP | `integration-tests/http/*.spec.ts` | API endpoint tests with real DB |
| Integration Modules | `src/modules/*/__tests__/*.spec.ts` | Custom module tests |

### CI (GitHub Actions)

The pipeline runs 4 jobs in parallel on every push/PR to `main`:

1. **Typecheck** — `tsc --noEmit`
2. **Unit tests** — Jest without database
3. **Integration tests** — Jest with PostgreSQL and Redis as service containers
4. **Storefront build** — Verifies Next.js compilation

## Docker and Production

### Image Build

```bash
# Backend
docker build --target production -t meduso-backend ./backend

# Storefront
docker build --target production -t meduso-storefront ./storefront
```

### Production Stack

```bash
make prod-up    # Starts everything: postgres, redis, 2x server, worker, storefront
make prod-down  # Stops everything
```

The `docker-compose.production.yml` includes:

- **backend-server** x2 replicas — API + Admin (stateless, horizontally scalable)
- **backend-worker** x1 — Background task processing (subscribers, jobs)
- **storefront** — Next.js in standalone mode
- **postgres** — Database with persistent volume
- **redis** — Cache, event bus, workflow engine, locking

### Horizontal Scaling

Backend servers are stateless. To scale:

1. Increase `replicas` in `docker-compose.production.yml`
2. Or deploy more instances in Kubernetes/ECS behind a load balancer

**Multi-instance requirements:**
- Mandatory Redis (cache, event bus, workflow engine, locking)
- Migrations are run once per deploy, not per instance

### Production Variables

Create a `.env` in the root with:

```bash
POSTGRES_USER=medusa
POSTGRES_PASSWORD=<secure-password>
POSTGRES_DB=meduso
JWT_SECRET=<jwt-secret>
COOKIE_SECRET=<cookie-secret>
STORE_CORS=https://your-domain.com
ADMIN_CORS=https://admin.your-domain.com
AUTH_CORS=https://your-domain.com,https://admin.your-domain.com
PUBLISHABLE_KEY=<your-publishable-key>
STOREFRONT_URL=https://your-domain.com
```

## Backend Directory Structure

```
backend/src/
├── admin/         # Admin dashboard custom widgets and routes
├── api/           # Custom API routes (REST endpoints)
├── jobs/          # Scheduled tasks (cron jobs)
├── links/         # Link definitions between modules
├── modules/       # Custom business modules
├── scripts/       # CLI scripts (seed, custom migrations)
├── subscribers/   # Event listeners (react to system events)
└── workflows/     # Custom workflows (transactional business logic)
```
