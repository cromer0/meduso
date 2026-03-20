# ── Base ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ── Dependencies ──────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ── Development ───────────────────────────────────────────────────────
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 9000
CMD ["npm", "run", "dev"]

# ── Build ─────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx medusa build
RUN cd .medusa/server && npm ci --omit=dev

# ── Production ────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S medusa && adduser -S medusa -u 1001
COPY --from=builder --chown=medusa:medusa /app/.medusa/server ./
ENV NODE_ENV=production
USER medusa
EXPOSE 9000
CMD ["npm", "run", "start"]
