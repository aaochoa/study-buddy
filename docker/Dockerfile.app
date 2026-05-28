FROM node:20-alpine AS base

# ─── Deps stage ──────────────────────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# ─── Build stage ─────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure Next.js standalone output mode is set
RUN node -e "\
  const fs = require('fs'); \
  const f = 'next.config.ts'; \
  let c = fs.readFileSync(f, 'utf8'); \
  if (!c.includes('standalone')) { \
    c = c.replace('};', \"  output: 'standalone',\n};\"); \
    fs.writeFileSync(f, c); \
  }"

RUN pnpm build

# ─── Runner stage ─────────────────────────────────────────────────────────────
FROM base AS runner

# Install interpreters for the coding challenges execution API
RUN apk add --no-cache python3 ruby clang

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000 HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
