# ==========================================
# STAGE 1: Base Image & Dependensi
# ==========================================
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ==========================================
# STAGE 2: Install dependencies
# ==========================================
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --reporter=append-only --loglevel=info

# ==========================================
# STAGE 3: Build Aplikasi
# ==========================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Menonaktifkan telemetri Next.js (Opsional tapi disarankan)
ENV NEXT_TELEMETRY_DISABLED=1

# Build aplikasi Next.js
# Catatan: Pastikan Anda mem-bypass env check saat build jika menggunakan T3 env
ENV SKIP_ENV_VALIDATION=1
RUN pnpm build

# ==========================================
# STAGE 4: Production Runner (Image Terakhir)
# ==========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Buat user non-root untuk alasan keamanan
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Salin aset publik dan file build dari stage builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Gunakan user non-root
USER nextjs

# Expose port Next.js
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Jalankan server bawaan Next.js standalone
ENTRYPOINT ["sh", "-c", "pnpm drizzle-kit migrate && exec node server.js"]
