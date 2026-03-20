# ── Base ──────────────────────────────────────────────────────────────
FROM oven/bun:alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ── Dependencies ──────────────────────────────────────────────────────
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── Development ───────────────────────────────────────────────────────
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 9000
CMD ["bun", "run", "dev"]

# ── Build ─────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx medusa build
RUN cd .medusa/server && bun install --frozen-lockfile --production

# ── Production ────────────────────────────────────────────────────────
FROM base AS production
WORKDIR /app
RUN addgroup -g 1001 -S medusa && adduser -S medusa -u 1001
COPY --from=builder --chown=medusa:medusa /app/.medusa/server ./
ENV NODE_ENV=production
USER medusa
EXPOSE 9000
CMD ["bun", "run", "start"]
