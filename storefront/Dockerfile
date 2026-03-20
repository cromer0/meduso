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
EXPOSE 8000
CMD ["bun", "run", "dev"]

# ── Build ─────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ── Production ────────────────────────────────────────────────────────
FROM base AS production
WORKDIR /app
RUN addgroup -g 1001 -S nextjs && adduser -S nextjs -u 1001
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
USER nextjs
EXPOSE 8000
ENV PORT=8000
# Run with bun
CMD ["bun", "server.js"]
