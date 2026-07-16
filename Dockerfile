# ==========================================
# STAGE 1: Base Image & Dependensi
# ==========================================
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm --activate

# ==========================================
# STAGE 2: Install dependencies (untuk build Next.js)
# ==========================================
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ==========================================
# STAGE 3: Build Next.js
# ==========================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1 SKIP_ENV_VALIDATION=1
RUN pnpm build

# ==========================================
# STAGE 4: Production Runner
# ==========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

# Buat user non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ---- 1. Siapkan folder Next.js standalone ----
RUN mkdir -p /app/next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone /app/next
COPY --from=builder --chown=nextjs:nodejs /app/.next/static /app/next/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public /app/next/public
COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/next/package.json

# ---- 2. Siapkan folder migrator ----
RUN mkdir -p /app/migrator
WORKDIR /app/migrator

# Salin folder drizzle dan script migrasi
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/migrate.mjs ./migrate.mjs

# Buat package.json khusus untuk migrator
RUN printf '%s\n' \
'{' \
'  "name": "migrator",' \
'  "type": "module",' \
'  "dependencies": {' \
'    "drizzle-orm": "^0.41.0",' \
'    "postgres": "^3.4.4"' \
'  }' \
'}' > package.json

# Install dependencies migrator menggunakan npm (lebih stabil)
RUN npm install --prod

# Kembali ke WORKDIR /app agar CMD nanti mudah
WORKDIR /app

# Switch ke user nextjs
USER nextjs

EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"

# CMD: jalankan migrasi dari folder migrator, lalu jalankan Next.js dari folder next
CMD ["sh", "-c", "cd /app/migrator && node migrate.mjs && cd /app/next && exec node server.js"]
