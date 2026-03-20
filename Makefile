# Ensure /bin and Homebrew are always in PATH so sh, node, bun are found
export PATH := /opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$(PATH)

.PHONY: help setup infra-up infra-down infra-reset backend-dev storefront-dev \
        seed migrate test test-unit test-integration build clean prod-up prod-down

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ---- Infrastructure ----

infra-up: ## Start PostgreSQL and Redis containers
	docker compose up -d

infra-down: ## Stop infrastructure containers
	docker compose down

infra-reset: ## Destroy volumes and restart infrastructure
	docker compose down -v
	docker compose up -d

# ---- Setup ----

setup: infra-up ## First-time project setup (installs deps, migrates DB, seeds data)
	cd backend && bun install
	cd storefront && bun install
	@echo "Waiting for PostgreSQL to be ready..."
	@until docker compose exec -T postgres pg_isready -U medusa -d meduso > /dev/null 2>&1; do sleep 1; done
	cd backend && bunx medusa db:migrate
	cd backend && bun run seed
	cd backend && bunx medusa user -e admin@meduso.dev -p admin123
	@echo ""
	@echo "============================================"
	@echo "  Setup complete!"
	@echo "  Run 'make backend-dev' and 'make storefront-dev'"
	@echo "  Admin: http://localhost:9000/app"
	@echo "  Login: admin@meduso.dev / admin123"
	@echo "============================================"

# ---- Development ----

backend-dev: ## Start backend with hot-reload (http://localhost:9000)
	cd backend && bun run dev

storefront-dev: ## Start storefront with hot-reload (http://localhost:8000)
	cd storefront && bun run dev

# ---- Database ----

migrate: ## Run database migrations
	cd backend && bunx medusa db:migrate

seed: ## Seed the database with demo data
	cd backend && bun run seed

# ---- Testing ----

test-unit: ## Run unit tests
	cd backend && bun run test:unit

test-integration: ## Run integration tests (requires PostgreSQL + Redis)
	cd backend && bun run test:integration:http

test: test-unit test-integration ## Run all tests

# ---- Build ----

build-backend: ## Build backend for production
	cd backend && bunx medusa build

build-storefront: ## Build storefront for production
	cd storefront && bun run build

build: build-backend build-storefront ## Build everything

# ---- Docker Production ----

prod-up: ## Start full production stack in Docker
	docker compose -f docker-compose.production.yml up -d --build

prod-down: ## Stop production stack
	docker compose -f docker-compose.production.yml down

# ---- Cleanup ----

clean: ## Remove build artifacts
	rm -rf backend/.medusa backend/dist storefront/.next storefront/out
