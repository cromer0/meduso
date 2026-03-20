# Meduso - E-Commerce con MedusaJS v2

E-commerce completo construido con [MedusaJS v2](https://medusajs.com/) (backend) y [Next.js 15](https://nextjs.org/) (storefront).

## Requisitos previos

- **Node.js** >= 20 (recomendado v22 LTS)
- **Docker** y **Docker Compose** (para PostgreSQL y Redis)
- **yarn** (corepack lo activa automáticamente para el storefront)

## Quick Start

```bash
git clone https://github.com/cromer0/meduso.git
cd meduso
make setup        # Levanta infra, instala deps, migra DB, seedea datos, crea admin
make backend-dev  # Terminal 1: backend en http://localhost:9000
make storefront-dev  # Terminal 2: storefront en http://localhost:8000
```

**Admin dashboard:** http://localhost:9000/app
- Email: `admin@meduso.dev`
- Password: `admin123`

## Arquitectura

```
meduso/
├── backend/          # MedusaJS v2 (API REST + Admin dashboard)
├── storefront/       # Next.js 15 (tienda pública)
├── docker-compose.yml              # Infra local (PostgreSQL + Redis)
├── docker-compose.production.yml   # Stack producción completo
└── Makefile                        # Comandos de desarrollo
```

### Stack tecnológico

| Componente | Tecnología |
|-----------|-----------|
| Backend | MedusaJS v2 (Express.js) |
| Base de datos | PostgreSQL 16 |
| Cache / Sesiones | Redis 7 |
| Admin | Dashboard MedusaJS (Vite) |
| Storefront | Next.js 15 (App Router, Turbopack) |
| Estilos | Tailwind CSS |
| Tests | Jest + @medusajs/test-utils |
| CI/CD | GitHub Actions |

### Diagrama de producción

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
    │PostgreSQL│ │  Redis  │    ← Estado compartido
    └────┬────┘ └────┬────┘
         │           │
    ┌────┴────┐ ┌────┴────┐
    │Replicas │ │Worker(s)│    ← backend-worker
    └─────────┘ └─────────┘
```

## Comandos disponibles

| Comando | Descripción |
|---------|------------|
| `make setup` | Setup completo: infra + deps + migraciones + seed + admin |
| `make infra-up` | Levantar PostgreSQL y Redis |
| `make infra-down` | Parar contenedores de infraestructura |
| `make infra-reset` | Destruir volúmenes y reiniciar infra |
| `make backend-dev` | Backend con hot-reload (`:9000`) |
| `make storefront-dev` | Storefront con hot-reload (`:8000`) |
| `make migrate` | Ejecutar migraciones de base de datos |
| `make seed` | Seedear datos de demostración |
| `make test` | Ejecutar todos los tests |
| `make test-unit` | Solo tests unitarios |
| `make test-integration` | Solo tests de integración |
| `make build` | Build de producción (backend + storefront) |
| `make prod-up` | Levantar stack de producción en Docker |
| `make prod-down` | Parar stack de producción |
| `make clean` | Limpiar artefactos de build |

## Desarrollo local

### Estructura del desarrollo

En desarrollo local, **PostgreSQL y Redis corren en Docker** mientras que el backend y storefront corren nativamente en tu máquina. Esto ofrece hot-reload instantáneo sin latencia de sincronización de archivos.

```
Docker:  PostgreSQL (:5432) + Redis (:6379)
Nativo:  Backend (:9000) + Storefront (:8000)
```

### Workflow diario

```bash
make infra-up         # Si no están corriendo ya
make backend-dev      # Terminal 1
make storefront-dev   # Terminal 2
```

### Variables de entorno

- `backend/.env` — configuración del backend (creado desde `.env.template`)
- `storefront/.env.local` — configuración del storefront (creado desde `.env.template`)

## Gestión de productos y precios

La gestión se realiza desde el **Admin dashboard** (http://localhost:9000/app) sin necesidad de intervención técnica:

- **Productos**: Crear/editar productos, variantes (talla, color), imágenes y descripciones
- **Precios**: Configurar precios por moneda (EUR, USD) y por región
- **Categorías**: Organizar productos en categorías
- **Envío**: Configurar tarifas de envío por zona geográfica
- **Regiones**: Gestionar regiones con sus monedas y países
- **Inventario**: Controlar stock por almacén y producto

## Datos de demostración (Seed)

El seed incluye datos listos para usar:

| Tipo | Datos |
|------|-------|
| **Regiones** | Europa (ES, FR, DE, IT, PT, NL, BE) y Norteamérica (US, CA) |
| **Monedas** | EUR (por defecto) y USD |
| **Almacenes** | European Warehouse (Madrid) y US Warehouse (New York) |
| **Envío** | Estándar (4.99€) y Express (9.99€) por región |
| **Categorías** | Camisetas, Sudaderas, Pantalones, Accesorios |
| **Productos** | 8 productos con variantes de talla y color |

Para regenerar los datos:

```bash
make infra-reset   # Limpia la DB
make migrate       # Re-crea tablas
make seed          # Re-seedea datos
```

## Testing

### Tests locales

```bash
make test              # Todos los tests
make test-unit         # Tests unitarios (sin DB)
make test-integration  # Tests de integración (requiere PostgreSQL + Redis)
```

### Tipos de tests

| Tipo | Ubicación | Descripción |
|------|-----------|------------|
| Unit | `src/**/__tests__/*.unit.spec.ts` | Tests unitarios de lógica de negocio |
| Integration HTTP | `integration-tests/http/*.spec.ts` | Tests de endpoints API con DB real |
| Integration Modules | `src/modules/*/__tests__/*.spec.ts` | Tests de módulos custom |

### CI (GitHub Actions)

El pipeline ejecuta 4 jobs en paralelo en cada push/PR a `main`:

1. **Typecheck** — `tsc --noEmit`
2. **Unit tests** — Jest sin base de datos
3. **Integration tests** — Jest con PostgreSQL y Redis como service containers
4. **Storefront build** — Verifica que Next.js compila correctamente

## Docker y producción

### Build de imágenes

```bash
# Backend
docker build --target production -t meduso-backend ./backend

# Storefront
docker build --target production -t meduso-storefront ./storefront
```

### Stack de producción

```bash
make prod-up    # Levanta todo: postgres, redis, 2x server, worker, storefront
make prod-down  # Para todo
```

El `docker-compose.production.yml` incluye:

- **backend-server** x2 réplicas — API + Admin (stateless, escalable horizontalmente)
- **backend-worker** x1 — Procesa tareas en background (subscribers, jobs)
- **storefront** — Next.js en modo standalone
- **postgres** — Base de datos con volumen persistente
- **redis** — Cache, event bus, workflow engine, locking

### Escalado horizontal

Los servidores backend son stateless. Para escalar:

1. Aumentar `replicas` en `docker-compose.production.yml`
2. O desplegar más instancias en Kubernetes/ECS detrás de un load balancer

**Requisitos para multi-instancia:**
- Redis obligatorio (cache, event bus, workflow engine, locking)
- Las migraciones se ejecutan una vez por deploy, no por instancia

### Variables de producción

Crea un `.env` en la raíz con:

```bash
POSTGRES_USER=medusa
POSTGRES_PASSWORD=<contraseña-segura>
POSTGRES_DB=meduso
JWT_SECRET=<secreto-jwt>
COOKIE_SECRET=<secreto-cookie>
STORE_CORS=https://tu-dominio.com
ADMIN_CORS=https://admin.tu-dominio.com
AUTH_CORS=https://tu-dominio.com,https://admin.tu-dominio.com
PUBLISHABLE_KEY=<tu-publishable-key>
STOREFRONT_URL=https://tu-dominio.com
```

## Estructura de directorios del backend

```
backend/src/
├── admin/         # Widgets y rutas custom del admin dashboard
├── api/           # API routes custom (REST endpoints)
├── jobs/          # Tareas programadas (cron jobs)
├── links/         # Definiciones de links entre módulos
├── modules/       # Módulos de negocio custom
├── scripts/       # Scripts CLI (seed, migraciones custom)
├── subscribers/   # Event listeners (reaccionar a eventos del sistema)
└── workflows/     # Workflows custom (lógica de negocio transaccional)
```
