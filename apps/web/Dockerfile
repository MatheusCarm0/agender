FROM node:20-alpine
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@9.15.4
WORKDIR /app

# Copia arquivos de configuração do monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig*.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install

# Copia os códigos-fonte
COPY packages/shared/ packages/shared/
COPY docs/ docs/
COPY apps/web/ apps/web/

ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CLARITY_ID=yiwdunm70s
ENV NEXT_PUBLIC_CLARITY_ID=$NEXT_PUBLIC_CLARITY_ID
ARG NEXT_PUBLIC_META_PIXEL_ID=1313037534111459
ENV NEXT_PUBLIC_META_PIXEL_ID=$NEXT_PUBLIC_META_PIXEL_ID

# Executa o build padrão (suporta SSR, rotas dinâmicas e o robots.txt sem erro)
RUN pnpm --filter @agenda/web build

# Sobe o servidor do Next (next start) atrás do nginx/caddy — NÃO é export estático:
# as páginas por tenant (/[slug]) e robots/sitemap force-dynamic exigem servidor.
EXPOSE 3000
CMD ["pnpm", "--filter", "@agenda/web", "start"]