# Contexto Geral — SaaS de Agendamento (codinome: **Agenda**)

> Documento mestre do projeto. É a fonte de verdade sobre **o que** estamos construindo,
> **com quais tecnologias** e **sob quais regras**. Todo documento de fase (fundação, MVP, etc.)
> assume o que está aqui e não repete estas definições.

---

## Como usar este conjunto de documentos

Este projeto é documentado em etapas. A ordem de leitura para o Claude Code é:

1. `00-contexto-geral.md` — **este arquivo** (sempre ler primeiro).
2. `01-fundacao.md` — setup do monorepo, Docker, auth, modelo multi-tenant base.
3. `02-mvp.md` — serviços, profissionais, horários, página pública, agendamento.
4. `03-diferenciacao.md` — personalização (Linktree), financeiro, fechar agenda.
5. `04-retencao.md` — notificações (SMS/e-mail), subdomínios.
6. `05-monetizacao.md` — PIX/depósito, domínio próprio, multi-unidade.
7. `06-hardening.md` — réplicas, cache, métricas, alertas.

Cada fase é auto-contida no seu escopo, mas **nunca contradiz** este documento. Se uma decisão
precisar mudar, ela muda **aqui primeiro** e as fases se ajustam.

Convenção: quando o Claude Code for gerar código, ele deve seguir as seções **Convenções de código**,
**Decisões técnicas firmes** e **Armadilhas conhecidas** deste arquivo como regras não-negociáveis,
salvo instrução explícita em contrário.

---

## 1. Visão geral do produto

Plataforma **SaaS multi-tenant de agendamento online** para negócios de serviço por horário
(barbearias, salões, clínicas, estúdios, etc.).

Cada negócio que assina a plataforma é um **tenant** isolado, com seus profissionais, serviços,
agenda e uma **página pública personalizável** (estilo Linktree) onde o cliente final marca horário.

Fluxo essencial:

- O **dono** cria o negócio na plataforma e recebe um **link personalizado** (ex.: `app.com/barbearia-juninho`).
- Ele cadastra **profissionais** (Juninho, Pedrinho), **serviços** (corte, barba) e os **horários de trabalho**.
- O **cliente final** entra pelo link, vê a página personalizada (cores, fonte, fundo, logo),
  escolhe profissional + serviço + horário livre e agenda.
- Cada **profissional** enxerga a própria agenda; o **admin/dono** enxerga tudo e acompanha o financeiro.

Diferenciais de valor: página pública bonita e personalizável, lembretes por e-mail (reduzir no-show)
e visão financeira consolidada dos agendamentos.

---

## 2. Personas e papéis

| Papel (`role`) | Quem é | O que faz |
|---|---|---|
| `owner` | Dono do negócio | Tudo: gerencia profissionais, serviços, financeiro, personalização, vê todas as agendas. |
| `admin` | Gerente | Igual ao owner, exceto ações de billing/exclusão do negócio. |
| `professional` | Profissional (Juninho) | Vê e gerencia **a própria** agenda; pode fechar a própria agenda. |
| `receptionist` | Recepção | Cria/edita agendamentos de qualquer profissional; sem acesso a financeiro global. |
| — (cliente final) | Cliente | Não tem login. Agenda pela página pública; identificado por telefone/e-mail. |

Regra de autorização central: **um usuário só enxerga dados do seu próprio `business`**, e dentro
dele o escopo é limitado pelo `role` (profissional vê o próprio; admin/owner veem tudo).

---

## 3. Glossário de domínio (PT → identificador no código)

Nomes de conceito em português; **identificadores no código sempre em inglês** e consistentes.

| Conceito | Identificador | Observação |
|---|---|---|
| Negócio / Perfil / Tenant | `business` | Unidade de isolamento. Toda tabela tem `business_id`. |
| Link personalizado | `business.slug` | Ex.: `barbearia-juninho`. Único global. |
| Profissional | `professional` | Recurso agendável. Pode ou não ter `user` (login). |
| Serviço | `service` | Tem `durationMin`, `price`, buffers. |
| Vínculo profissional↔serviço | `professionalService` | N:N; permite preço/duração por profissional. |
| Horário de trabalho | `workingHours` | Disponibilidade **semanal recorrente**. |
| Bloqueio / Fechar agenda | `scheduleBlock` | Férias, feriado, almoço, bloqueio pontual. |
| Agendamento | `appointment` | O evento marcado. |
| Cliente final | `client` | Base de clientes **por tenant**. |
| Disponibilidade / Slots livres | `availability` / `slots` | Calculado, não persistido (cacheado no Redis). |
| Personalização da página | `pageCustomization` | Tema, cores, fonte, fundo, links extras. |
| Transação financeira | `transaction` | Pagamento online (fases futuras). |

Status de agendamento (`appointment.status`): `scheduled` · `confirmed` · `completed` · `cancelled` · `no_show`.

---

## 4. Stack tecnológica

| Camada | Tecnologia | Motivo |
|---|---|---|
| API | **NestJS** (TypeScript) | Modular, DI, escala bem, estrutura clara por domínio. |
| ORM | **Prisma** | Type-safe, migrations versionadas. Query de conflito de horário em SQL cru. |
| Banco | **MySQL 8** | Requisito do projeto. Primary + réplica de leitura em produção. |
| Web | **Next.js** (React + TS) | Páginas públicas (SSR/ISR, SEO, tema dinâmico) + painel admin. |
| Cache / Fila | **Redis** + **BullMQ** | Cache de disponibilidade, fila de jobs (notificações), rate limit. |
| Reverse proxy | **Traefik** ou **Caddy** | TLS automático, roteamento por slug/subdomínio/domínio próprio. |
| Container | **Docker** + docker-compose | Dev local e build de produção. |
| Observabilidade | **Sentry** + logs estruturados | Erros, traces, métricas. |
| CI/CD | **GitHub Actions** | Build, testes, migrations no release. |

Estilo do frontend a definir na fase de MVP (a preferência do time é React + TypeScript com
Styled Components; validar contra a produtividade do Tailwind na página pública).

---

## 5. Arquitetura

Serviços em containers separados:

- `web` — Next.js (páginas públicas + admin).
- `api` — NestJS (REST, auth, regras de negócio).
- `worker` — consumidor BullMQ (notificações, jobs assíncronos).
- `mysql` — banco (primary; réplica em produção).
- `redis` — cache + broker da fila.
- `proxy` — Traefik/Caddy (TLS, roteamento).

Requisições públicas: `cliente → proxy → web (Next) → api → mysql/redis`.
Jobs assíncronos: `api → redis (fila) → worker → serviços externos (e-mail, SMS, pagamento)`.

**Multi-tenancy: banco único com `business_id` em toda tabela** (row-level). Escolhido por ser
barato e escalável para muitos tenants pequenos. Schema-por-tenant ou banco-por-tenant só se surgir
exigência enterprise de isolamento físico.

---

## 6. Decisões técnicas firmes (não renegociar sem motivo forte)

1. **Isolamento de tenant é obrigatório e automático.** Um middleware/extensão do Prisma injeta
   `business_id` em toda query. Nenhuma query de dado de tenant pode rodar sem esse filtro.
   Vazamento entre tenants é bug crítico de segurança.

2. **Todo timestamp é gravado em UTC.** O fuso do negócio fica em `business.timezone`. Conversão
   só nas bordas (input do usuário e exibição). Nunca misturar fuso na camada de dados.

3. **Anti double-booking via transação + lock de linha.** Criar agendamento sempre dentro de
   `START TRANSACTION` com `SELECT ... FOR UPDATE` sobre os agendamentos que colidem com a faixa,
   e só então `INSERT`. Conflito retorna **409**. Índice em `(professional_id, start_at)`.

4. **Idempotência na criação de agendamento.** O request de agendamento carrega uma chave de
   idempotência para clique duplo / retry não gerar duplicata.

5. **Disponibilidade é calculada, não persistida.** `workingHours − appointments − scheduleBlocks − buffers`,
   fatiado pela duração do serviço. Resultado é **cacheado no Redis** com TTL curto e invalidado
   ao criar/cancelar agendamento.

6. **Link personalizado começa por slug em path** (`app.com/{slug}`). Subdomínio e domínio próprio
   são evoluções de fases posteriores, não do MVP.

7. **Notificações e outros side-effects rodam em worker assíncrono**, nunca no caminho da request HTTP.

8. **Não começar por Kubernetes.** Produção inicial em PaaS (Railway/Render/Fly.io). K8s só quando
   a carga justificar.

---

## 7. Modelo de dados (entidades principais)

Visão de referência; o schema Prisma detalhado é definido na fase de **Fundação/MVP**.

- `businesses` — `id`, `slug` (único), `name`, `timezone`, `plan`, timestamps.
- `users` — `id`, `businessId`, `name`, `email`, `passwordHash`, `role`, `professionalId?`.
- `professionals` — `id`, `businessId`, `userId?`, `name`, `bio`, `avatarUrl`, `active`.
- `services` — `id`, `businessId`, `name`, `durationMin`, `price`, `bufferBefore`, `bufferAfter`, `active`.
- `professional_services` — `professionalId`, `serviceId`, `priceOverride?`, `durationOverride?`.
- `working_hours` — `id`, `professionalId`, `weekday`, `startTime`, `endTime`.
- `schedule_blocks` — `id`, `businessId`, `professionalId?` (nulo = negócio todo), `startAt`, `endAt`, `reason`.
- `clients` — `id`, `businessId`, `name`, `phone`, `email?`, `notes?`.
- `appointments` — `id`, `businessId`, `professionalId`, `serviceId`, `clientId`, `startAt`, `endAt`,
  `status`, `price`, `paymentStatus`, `notes?`, `createdAt`.
- `page_customizations` — `businessId`, `theme` (JSON: cores/fonte/fundo/logo), `links` (JSON), `socials` (JSON).
- `transactions` — `id`, `appointmentId`, `amount`, `method`, `gatewayRef`, `status` (fases futuras).

Regra transversal: **toda tabela de dado de tenant tem `businessId`** e índice que o inclua.

---

## 8. Convenções de código

- **Linguagem:** TypeScript em todo o stack. `strict: true`.
- **Nomenclatura:** identificadores e nomes de arquivo em **inglês**; conceitos de domínio seguem o glossário.
  `camelCase` para variáveis/campos, `PascalCase` para classes/tipos, tabelas em `snake_case` plural.
- **Estrutura NestJS:** um módulo por domínio (`AuthModule`, `BusinessModule`, `SchedulingModule`,
  `ServiceModule`, `FinancialModule`, `CustomizationModule`, `NotificationModule`). Cada módulo com
  `controller` / `service` / `dto` / `entity(prisma)`.
- **DTOs e validação:** todo input validado com `class-validator` / `zod`. Nada de `any` em borda de request.
- **Transações:** operações que escrevem em múltiplas tabelas ou dependem de leitura consistente usam
  transação explícita. Antes de `UPDATE`, ter a leitura de referência (padrão já usado no time).
- **Erros:** exceções tipadas do Nest (`ConflictException` → 409, `ForbiddenException` → 403, etc.).
  Nunca vazar erro cru de banco para o cliente.
- **Migrations:** sempre via `prisma migrate`. Nada de alterar schema em produção fora de migration.
- **Testes:** unitário na lógica de disponibilidade e de conflito (são o coração do produto);
  e2e no fluxo de agendamento. Jest.
- **Commits/branches:** `feat/`, `fix/`, `chore/`; mensagens curtas e objetivas.
- **Sem segredos no código.** Configuração via variáveis de ambiente (`.env` fora do versionamento).

---

## 9. Estrutura do monorepo (proposta)

```
/
├── CLAUDE.md                 # aponta para docs/ e resume regras
├── docs/                     # este conjunto de documentos de contexto
├── apps/
│   ├── api/                  # NestJS
│   ├── web/                  # Next.js (público + admin)
│   └── worker/               # consumidor BullMQ
├── packages/
│   ├── database/             # schema Prisma + client compartilhado
│   └── shared/               # tipos, DTOs e utils compartilhados
├── docker-compose.yml
└── .github/workflows/
```

Gerenciador de workspace (pnpm/turborepo) a definir na Fundação.

---

## 10. Requisitos não-funcionais

- **Escalabilidade:** API stateless atrás de load balancer; réplica de leitura para relatórios e
  cálculo de disponibilidade; worker separado da API.
- **Isolamento/segurança:** filtro de tenant automático; rate limit nas rotas públicas; senhas com hash forte.
- **Performance:** disponibilidade cacheada; página pública via SSR/ISR + CDN nos assets.
- **Confiabilidade:** jobs idempotentes e com retry; health checks em todos os serviços.
- **Privacidade (LGPD):** dado de cliente pertence ao tenant; consentimento e exclusão previstos.

---

## 11. Roadmap de fases

| Fase | Documento | Entrega principal |
|---|---|---|
| Fundação | `01-fundacao.md` | Monorepo, Docker, auth multi-tenant, modelo `business/user/professional`. |
| MVP | `02-mvp.md` | Serviços, horários, página pública básica, agendamento com anti-conflito, agenda "minha" vs "todas". |
| Diferenciação | `03-diferenciacao.md` | Personalização Linktree, relatório financeiro, fechar agenda, base de clientes. |
| Retenção | `04-retencao.md` | Notificações (SMS/e-mail), subdomínios, cupons, clube de fidelidade, identidade do cliente (OTP) como base para o futuro app mobile. |
| Monetização | `05-monetizacao.md` | **Em andamento.** Modelo de planos (teste de 7 dias → Básico/Profissional/Pro) e campanhas de disparo pagas já detalhados; PIX/depósito, domínio próprio e multi-unidade a especificar depois. |
| Hardening | `06-hardening.md` | Réplicas, cache agressivo, métricas, alertas, observabilidade. |

Regra: **não puxar escopo de uma fase futura** sem necessidade. Cada fase entrega algo utilizável.

---

## 12. Armadilhas conhecidas (o que NÃO fazer)

- ❌ Rodar query de dado de tenant sem `business_id` → vazamento entre negócios.
- ❌ Misturar fuso horário na camada de dados → bug silencioso em agenda.
- ❌ Criar agendamento sem transação/lock → double-booking sob concorrência.
- ❌ Calcular disponibilidade a cada request sem cache → banco sobrecarregado.
- ❌ Rodar notificação/pagamento no caminho da request HTTP → latência e falha em cascata.
- ❌ Começar por Kubernetes ou microserviços → complexidade sem retorno neste estágio.
- ❌ Colocar segredo no código ou no versionamento.
- ❌ Antecipar escopo de fases futuras dentro do MVP.
