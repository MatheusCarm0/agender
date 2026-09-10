FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Copia arquivos de configuração do workspace
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig*.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install

# Copia pacotes compartilhados, docs e código web
COPY packages/shared/ packages/shared/
COPY docs/ docs/
COPY apps/web/ apps/web/

ENV NEXT_PUBLIC_API_URL=/api

RUN pnpm --filter @agenda/web build