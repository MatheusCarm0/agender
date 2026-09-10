# Etapa 1: Instalação
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY apps/worker/package.json apps/worker/

RUN pnpm install

# Etapa 2: Build
FROM base AS builder
WORKDIR /app
COPY packages/ packages/
COPY apps/worker/ apps/worker/

RUN pnpm --filter @agenda/database db:generate
RUN pnpm --filter @agenda/database build
RUN pnpm --filter @agenda/shared build
RUN pnpm --filter @agenda/worker build

# Etapa 3: Runtime
FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

ENV NODE_ENV=production

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder /app/packages/database /app/packages/database
COPY --from=builder /app/packages/shared /app/packages/shared
COPY --from=builder /app/apps/worker /app/apps/worker

CMD ["pnpm", "--filter", "@agenda/worker", "start"]
