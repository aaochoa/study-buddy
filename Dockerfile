# Stage 1: Build Next.js frontend
FROM node:20-slim AS frontend

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install root workspace deps (skip lifecycle scripts that need the agent subdir)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source and build
COPY src/ ./src/
COPY public/ ./public/
COPY next.config.ts tsconfig.json postcss.config.mjs ./
RUN pnpm build

# ─────────────────────────────────────────────────────────────────────
# Stage 2: Agent build (TypeScript — compiled with tsx at runtime)
FROM node:20-slim AS agent-deps

WORKDIR /agent

RUN npm install -g pnpm

COPY agent/package.json agent/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ─────────────────────────────────────────────────────────────────────
# Stage 3: Production image — Node only
FROM node:20-slim AS runner

# Install interpreters for the coding challenges execution API
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ruby \
    clang \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm tsx

WORKDIR /app

# Copy Next.js build + deps from stage 1
COPY --from=frontend /app/.next ./.next
COPY --from=frontend /app/node_modules ./node_modules
COPY --from=frontend /app/package.json ./
COPY --from=frontend /app/public ./public
COPY --from=frontend /app/next.config.ts ./

# Copy agent source + prod deps from stage 2
COPY agent/ ./agent/
COPY --from=agent-deps /agent/node_modules ./agent/node_modules

# Copy entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3000 8000

ENV NODE_ENV=production

CMD ["./entrypoint.sh"]
