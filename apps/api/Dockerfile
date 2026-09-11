# Etapa 1: Instalação das dependências do workspace
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Removido o --frozen-lockfile para aceitar o ajuste automático
RUN pnpm install

# Etapa 2: Build dos pacotes internos e da API
FROM base AS builder
WORKDIR /app
COPY packages/ packages/
COPY apps/api/ apps/api/

RUN pnpm --filter @agenda/database db:generate
RUN pnpm --filter @agenda/database build
RUN pnpm --filter @agenda/shared build
RUN pnpm --filter @agenda/api build

# Etapa 3: Runtime de Produção (Enxuto)
FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

ENV NODE_ENV=production

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder /app/packages/database /app/packages/database
COPY --from=builder /app/packages/shared /app/packages/shared
COPY --from=builder /app/apps/api /app/apps/api

EXPOSE 3001
CMD ["pnpm", "--filter", "@agenda/api", "start"]
