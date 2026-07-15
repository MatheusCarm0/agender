FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/database/package.json packages/database/
COPY apps/worker/package.json apps/worker/

RUN pnpm install --frozen-lockfile

COPY packages/ packages/
COPY apps/worker/ apps/worker/

RUN pnpm --filter @agenda/database db:generate

CMD ["pnpm", "--filter", "@agenda/worker", "dev"]
