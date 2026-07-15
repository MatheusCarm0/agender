# Fase 1 — Fundação

> Pré-requisito de leitura: `00-contexto-geral.md`. Este documento assume todas as decisões,
> convenções e o glossário definidos lá. Aqui detalhamos **apenas** o que a fase de Fundação entrega.

---

## Objetivo

Deixar o esqueleto do projeto de pé: monorepo, ambiente Docker, autenticação multi-tenant e o
modelo de dados base (`business`, `user`, `professional`), com o **isolamento de tenant funcionando
de ponta a ponta**. Ao final desta fase é possível criar um negócio, logar como dono e cadastrar
profissionais — nada de agenda ainda.

---

## Escopo

**Dentro:**
- Monorepo com pnpm + Turborepo (`apps/api`, `apps/web`, `apps/worker`, `packages/database`, `packages/shared`).
- `docker-compose` com `api`, `web`, `mysql`, `redis` (worker e proxy entram vazios/placeholder).
- Prisma configurado; schema base e primeira migration.
- Isolamento de tenant automático (extensão do Prisma + contexto de request).
- Auth: cadastro de negócio (cria `owner`), login, refresh, guards de auth/role/tenant.
- Health checks e CI base (GitHub Actions: lint + build + test).

**Fora (fases seguintes):**
- Serviços, horários, disponibilidade, agendamento (MVP).
- Página pública, personalização, financeiro, notificações, pagamentos.

---

## Estrutura concreta do monorepo

```
/
├── CLAUDE.md
├── docs/
├── package.json                # workspaces pnpm
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml
├── .env.example
├── apps/
│   ├── api/                    # NestJS
│   ├── web/                    # Next.js
│   └── worker/                 # BullMQ (placeholder nesta fase)
├── packages/
│   ├── database/               # schema.prisma + PrismaClient exportado
│   └── shared/                 # tipos e DTOs compartilhados
└── .github/workflows/ci.yml
```

`packages/database` é o dono do `schema.prisma` e exporta um `PrismaClient` já com a extensão de
tenant aplicada. `apps/api` e `apps/worker` consomem esse client.

---

## docker-compose (serviços desta fase)

- `mysql` — MySQL 8, volume persistente, `MYSQL_DATABASE=agenda`, porta 3306.
- `redis` — Redis 7, porta 6379.
- `api` — NestJS em modo dev (hot reload), depende de mysql/redis.
- `web` — Next.js em modo dev.
- `worker` — presente mas sem jobs ainda.

Proxy (Traefik/Caddy) **não** entra nesta fase; roteamento por slug é problema do MVP/página pública.

---

## Variáveis de ambiente (`.env.example`)

```
DATABASE_URL=mysql://root:root@mysql:3306/agenda
REDIS_URL=redis://redis:6379
JWT_ACCESS_SECRET=troque-em-producao
JWT_REFRESH_SECRET=troque-em-producao
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
NODE_ENV=development
```

Segredos reais nunca versionados. `.env` no `.gitignore`.

---

## Prisma — schema base desta fase

Apenas as três entidades da fundação (o restante entra no MVP). Enum de papel conforme o glossário.

```prisma
enum Role {
  owner
  admin
  professional
  receptionist
}

model Business {
  id            String         @id @default(cuid())
  slug          String         @unique
  name          String
  timezone      String         @default("America/Sao_Paulo")
  plan          String         @default("free")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  users         User[]
  professionals Professional[]
}

model User {
  id             String        @id @default(cuid())
  businessId     String
  business       Business      @relation(fields: [businessId], references: [id])
  name           String
  email          String
  passwordHash   String
  role           Role          @default(owner)
  professionalId String?       @unique
  professional   Professional? @relation(fields: [professionalId], references: [id])
  createdAt      DateTime      @default(now())

  @@unique([businessId, email])   // e-mail único por tenant, não global
  @@index([businessId])
}

model Professional {
  id         String   @id @default(cuid())
  businessId String
  business   Business @relation(fields: [businessId], references: [id])
  user       User?
  name       String
  bio        String?  @db.Text
  avatarUrl  String?
  active     Boolean  @default(true)
  createdAt  DateTime @default(now())

  @@index([businessId])
}
```

Decisão importante: **e-mail é único por tenant** (`@@unique([businessId, email])`), não global —
a mesma pessoa pode ser cliente/funcionário em negócios diferentes.

---

## Isolamento de tenant (regra crítica da Decisão #1 do contexto geral)

Implementar em duas camadas:

1. **Contexto de request:** um `AsyncLocalStorage` (ou store request-scoped do Nest) guarda o
   `businessId` do usuário autenticado durante toda a request.

2. **Extensão do Prisma:** uma extensão (`$extends`) que, para todo model com `businessId`, injeta
   automaticamente `where: { businessId }` em `findMany/findFirst/update/delete` e preenche
   `businessId` em `create`. Assim é impossível esquecer o filtro.

O `PrismaClient` exportado por `packages/database` já vem estendido. Rotas públicas (página do
cliente) resolvem o `businessId` pelo `slug` e injetam no contexto antes de qualquer query.

> Nunca fazer query de dado de tenant fora desse fluxo. Se precisar de acesso cross-tenant
> (ex.: job administrativo), usar um client "raw" explicitamente marcado e revisado.

---

## Autenticação

- **Estratégia:** JWT com access token (curto, ~15min) + refresh token (~7 dias). Refresh em
  cookie httpOnly; access no header `Authorization: Bearer`.
- **Claims do token:** `sub` (userId), `businessId`, `role`.
- **Hash de senha:** `argon2` (preferido) ou `bcrypt` com cost adequado.

Endpoints:

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/register-business` | Cria `business` + `user` owner. Gera `slug` a partir do nome (único). |
| `POST` | `/auth/login` | E-mail + senha (+ opcionalmente slug do negócio). Retorna tokens. |
| `POST` | `/auth/refresh` | Renova access token via refresh cookie. |
| `POST` | `/auth/logout` | Invalida refresh. |
| `GET`  | `/auth/me` | Dados do usuário logado + business. |

Guards:
- `JwtAuthGuard` — valida o access token e popula o contexto de request (userId, businessId, role).
- `RolesGuard` + decorator `@Roles('owner','admin')` — autorização por papel.
- `TenantGuard` — garante que o recurso acessado pertence ao `businessId` do contexto (defesa extra
  além da extensão do Prisma).

---

## Módulos NestJS iniciais

- `PrismaModule` — provê o client estendido + o contexto de tenant.
- `AuthModule` — register/login/refresh/guards.
- `BusinessModule` — leitura/atualização do próprio negócio.
- `ProfessionalModule` — CRUD de profissionais (escopado ao tenant).
- `HealthModule` — `GET /health` (liveness) e `GET /health/ready` (checa mysql/redis).

---

## CI base (`.github/workflows/ci.yml`)

Em push/PR: instalar deps (pnpm), rodar `turbo lint`, `turbo build`, `turbo test`. Sobe um MySQL de
serviço para os testes que tocam banco. Migrations aplicadas via `prisma migrate deploy` no job de test.

---

## Critérios de aceite

- [x] `docker-compose up` sobe api, web, mysql, redis sem erro.
- [x] `POST /auth/register-business` cria negócio + owner e retorna tokens válidos.
- [x] Login, refresh e `/auth/me` funcionam.
- [x] CRUD de profissional só enxerga/afeta o próprio `business` (testado com dois tenants).
- [x] Tentativa de acessar recurso de outro tenant retorna 403/404, nunca vaza dado.
- [x] Extensão do Prisma injeta `businessId` automaticamente (teste unitário provando).
- [x] `GET /health/ready` reflete o estado real de mysql/redis.
- [ ] CI verde (lint + build + test).

---

## Armadilhas específicas desta fase

- Não deixar nenhuma rota autenticada acessível sem `JwtAuthGuard`.
- Não expor `passwordHash` em nenhuma resposta (usar DTO de saída / serialização).
- Slug deve ser normalizado (minúsculo, sem acento/espaço) e garantidamente único — tratar colisão.
- A extensão do Prisma não deve interferir em queries de auth que precisam achar o usuário **antes**
  de haver contexto de tenant (login resolve o business pelo e-mail/slug primeiro).
