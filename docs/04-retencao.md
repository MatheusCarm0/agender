# Fase 4 — Retenção

> Pré-requisitos de leitura: `00-contexto-geral.md`, `01-fundacao.md`, `02-mvp.md`, `03-diferenciacao.md`.
> Assume MVP e Diferenciação prontos (agendamento, disponibilidade, página pública personalizada,
> relatório financeiro, base de clientes).

---

## Objetivo

Trazer o cliente de volta: **notificações** (reduzir no-show), **cupons** de desconto, **clube de
fidelidade** (assinatura com direito a N ou ilimitados agendamentos por ciclo) e **subdomínio**
próprio por tenant. Junto disso, esta fase estabelece a **identidade leve do cliente** (login por
OTP de telefone) — peça que hoje resolve a segurança do resgate de fidelidade e que amanhã vira,
sem redesenho, a base de login do app mobile.

---

## Escopo

**Dentro:**
- Notificações assíncronas (e-mail; SMS para OTP): lembrete de agendamento, confirmação, cancelamento.
- Subdomínio por tenant (`{slug}.app.com`), além do path já existente.
- Cupons de desconto aplicáveis no agendamento.
- Clube de fidelidade (planos de assinatura com uso limitado ou ilimitado por ciclo).
- Identidade do cliente via OTP (telefone) — login leve, reutilizável pelo futuro app.
- API pública versionada e desenhada para ser consumida por um segundo cliente (o app) sem quebra.

**Fora (fases seguintes):**
- Pagamento online automatizado (PIX/gateway) — **Fase 5**. Nesta fase, o pagamento de plano de
  fidelidade é **registrado manualmente** pelo admin (dinheiro/PIX manual, cartão na maquininha, etc.);
  a automação entra depois **sem mudar o modelo de dados**, só o gatilho que muda `paymentStatus`.
- Domínio próprio do cliente — **Fase 5**.
- O **app mobile em si** não é construído nesta fase. Construímos a **API e a identidade** que ele vai usar.

---

## Decisão de arquitetura: extensível para o app sem quebrar nada

Esta fase fixa três decisões que garantem isso:

1. **A API pública é a única porta de entrada para dados de tenant, e o app vai usar exatamente
   os mesmos endpoints que o site.** Nada de lógica só-web: todo fluxo de cliente (ver disponibilidade,
   agendar, ver histórico, resgatar cupom/fidelidade) já vive em `/public/{slug}/...` como JSON puro.
   O app, quando existir, é só **mais um consumidor** dessa API — não motiva endpoint novo.

2. **Versionar o namespace público desde já:** `/public/v1/{slug}/...`. Mudança incompatível no
   futuro vira `/public/v2/...`; nunca se quebra o app em produção alterando `v1`.

3. **Identidade do cliente entra agora, via OTP de telefone**, não via senha. É leve o suficiente
   para o fluxo web (sem fricção de cadastro) e é **exatamente** o mecanismo que o app vai reusar
   para login — o token emitido aqui já é o token de sessão do cliente, seja no navegador ou no app.

---

## Prisma — entidades novas

### Identidade do cliente (OTP)

```prisma
model ClientOtp {
  id         String    @id @default(cuid())
  businessId String
  clientId   String
  code       String              // código de 6 dígitos, hash armazenado
  expiresAt  DateTime
  consumedAt DateTime?
  attempts   Int       @default(0)
  createdAt  DateTime  @default(now())

  @@index([clientId])
  @@index([businessId, createdAt])
}
```

`Client` (já existe desde o MVP) recebe:

```prisma
// adicionar em Client:
phoneVerifiedAt DateTime?
```

Sessão do cliente: **JWT curto** (`clientId`, `businessId`, escopo `client`) emitido após validar o
OTP. Mesmo par access/refresh do padrão de auth já usado no admin (Fundação), guard próprio
(`ClientAuthGuard`) — **nunca** o mesmo guard/role do admin.

### Notificações

```prisma
enum NotificationChannel { email sms whatsapp } // whatsapp = legado; ver notificacoes.md
enum NotificationType    { booking_reminder booking_confirmation booking_cancelled membership_expiring }
enum NotificationStatus  { pending sent failed }

model NotificationLog {
  id         String               @id @default(cuid())
  businessId String
  clientId   String?
  channel    NotificationChannel
  type       NotificationType
  status     NotificationStatus   @default(pending)
  payload    Json
  sentAt     DateTime?
  error      String?
  createdAt  DateTime             @default(now())

  @@index([businessId])
  @@index([status, createdAt])
}
```

### Subdomínio

```prisma
// adicionar em Business:
subdomain String? @unique   // ex.: "barbearia-juninho" (pode == slug; independente para permitir troca)
```

### Cupons

```prisma
enum CouponDiscountType { percent fixed }
enum CouponScope        { all service }

model Coupon {
  id             String             @id @default(cuid())
  businessId     String
  code           String             // ex.: "VOLTA10"
  discountType   CouponDiscountType
  discountValue  Decimal            @db.Decimal(10, 2)
  scope          CouponScope        @default(all)
  serviceId      String?
  maxUses        Int?               // null = ilimitado
  usedCount      Int                @default(0)
  perClientLimit Int?               // ex.: 1 = só uma vez por cliente
  validFrom      DateTime
  validUntil     DateTime?
  active         Boolean            @default(true)
  createdAt      DateTime           @default(now())

  @@unique([businessId, code])
  @@index([businessId])
}

model CouponRedemption {
  id              String   @id @default(cuid())
  couponId        String
  appointmentId   String   @unique
  clientId        String
  discountApplied Decimal  @db.Decimal(10, 2)
  createdAt       DateTime @default(now())

  @@index([couponId])
  @@index([clientId])
}
```

### Clube de fidelidade

```prisma
enum BillingCycle     { monthly quarterly yearly }
enum UsageLimitType    { unlimited limited }
enum MembershipStatus  { pending active suspended cancelled expired }
enum PaymentStatus     { unpaid paid }   // reaproveitado pelo gateway automático na Fase 5

model MembershipPlan {
  id             String         @id @default(cuid())
  businessId     String
  name           String
  price          Decimal        @db.Decimal(10, 2)
  billingCycle   BillingCycle   @default(monthly)
  usageLimitType UsageLimitType
  usageLimit     Int?           // null quando unlimited
  serviceIds     Json           @default("[]") // vazio = cobre todos os serviços
  active         Boolean        @default(true)
  createdAt      DateTime       @default(now())

  @@index([businessId])
}

model ClientMembership {
  id            String           @id @default(cuid())
  businessId    String
  clientId      String
  planId        String
  status        MembershipStatus @default(pending)
  cycleStart    DateTime
  cycleEnd      DateTime
  usageInCycle  Int              @default(0)
  paymentStatus PaymentStatus    @default(unpaid)
  createdAt     DateTime         @default(now())

  @@index([businessId])
  @@index([clientId])
}
```

### Appointment (campos novos)

```prisma
// adicionar em Appointment:
couponId           String?
membershipId       String?   // ClientMembership que cobriu este agendamento
discountAmount      Decimal  @default(0) @db.Decimal(10, 2)
```

`price` continua sendo o preço cheio do serviço no momento (regra já firmada no MVP); o valor
efetivamente cobrado é `price - discountAmount`. Se coberto por fidelidade ilimitada,
`discountAmount = price` (cobertura total) ou parcial, conforme o plano definir.

---

## Notificações

- Disparadas **sempre pelo worker** (BullMQ), nunca no caminho da request HTTP (decisão firme do
  contexto geral). O `AppointmentModule` só **enfileira** o job; o worker consome e chama o provedor.
- Provedores: e-mail (Resend) e SMS (Twilio, só para OTP). WhatsApp foi descontinuado — ver
  `notificacoes.md`. Abstrair atrás de uma interface (`NotificationProvider`) para trocar de
  provedor sem tocar em regra de negócio.
- Gatilhos: confirmação ao criar, lembrete configurável (ex.: 24h e 2h antes), aviso ao cancelar,
  aviso de fidelidade prestes a vencer.
- Cada envio grava um `NotificationLog` (idempotente por `appointmentId + type`, evita duplicar lembrete
  em retry de job).
- Preferência de canal por cliente (campo simples: `preferredChannel` pode entrar em `Client` se necessário).

---

## Subdomínio

- `subdomain` em `Business`, único, normalizado como o `slug`.
- Proxy (Traefik/Caddy) resolve `{subdomain}.app.com` para o mesmo `web`, que identifica o tenant
  pelo host em vez do path.
- **O path `app.com/{slug}` continua funcionando** — não é substituído, é uma segunda forma de acesso.
- TLS wildcard no proxy para `*.app.com`.

---

## Cupons

- Admin cria cupom: código, tipo de desconto (percentual ou fixo), escopo (todos os serviços ou um
  específico), limite de usos total e por cliente, validade.
- **Aplicação no agendamento:** o endpoint de criação de agendamento (público) aceita `couponCode`
  opcional. Validação server-side, dentro da **mesma transação** de criação (decisão firme do MVP):
  código existe, ativo, dentro da validade, não excedeu `maxUses`, cliente não excedeu `perClientLimit`.
  Se válido, calcula `discountAmount`, grava `CouponRedemption` e incrementa `usedCount` — tudo
  atômico, para não permitir corrida de "mesmo cupom, duas redenções simultâneas" estourar o limite.
- Cupom inválido/expirado retorna erro claro; **nunca** falha silenciosamente aplicando desconto zero.

---

## Clube de fidelidade

- Admin cria planos (`MembershipPlan`): nome, preço, ciclo (mensal/trimestral/anual), tipo de uso
  (ilimitado ou N usos por ciclo), quais serviços cobre.
- Admin **matricula o cliente manualmente** nesta fase (`ClientMembership`), marca `paymentStatus = paid`
  ao confirmar o pagamento (dinheiro, PIX manual, maquininha). Fluxo de autoatendimento com pagamento
  automático é Fase 5 — o modelo já está pronto para isso, só troca o gatilho.
- **Resgate no agendamento:** exige que o cliente esteja **autenticado via OTP** (seção de identidade).
  Ao agendar autenticado, o sistema verifica se há `ClientMembership` `active`, dentro do `cycleStart/cycleEnd`,
  cobrindo o serviço e com uso disponível (`usageInCycle < usageLimit`, ou `unlimited`). Se sim, aplica
  a cobertura e incrementa `usageInCycle` **na mesma transação** de criação do agendamento (mesmo padrão
  de lock do MVP — evita dois agendamentos simultâneos "gastarem" o último uso do ciclo indevidamente).
- **Por que exigir login para fidelidade e não para agendamento comum:** fidelidade é um benefício
  pago vinculado à pessoa; sem autenticação, bastaria digitar o telefone de outro cliente para gastar
  o uso dele. Agendamento comum (sem fidelidade/cupom de uso único por cliente) continua sem exigir login,
  preservando a fricção baixa do MVP.
- Renovação de ciclo: job assíncrono (worker) que, ao virar `cycleEnd`, reseta `usageInCycle` e abre
  novo ciclo (ou expira, se não renovado) — nesta fase, renovação também é confirmada manualmente pelo
  admin; automação plena chega com o pagamento automatizado da Fase 5.

---

## Identidade do cliente (OTP)

Fluxo:

1. `POST /public/v1/{slug}/auth/otp/start` — recebe telefone, gera código de 6 dígitos, grava
   `ClientOtp` (hash do código, expiração curta, ex. 5 min), envia via SMS (e-mail como fallback) pelo worker.
2. `POST /public/v1/{slug}/auth/otp/verify` — recebe telefone + código; valida contra o `ClientOtp`
   não consumido e não expirado; limita tentativas (`attempts`); em caso de sucesso, marca `consumedAt`,
   marca `Client.phoneVerifiedAt`, emite **JWT de cliente** (access curto + refresh), escopado a
   `clientId + businessId`.
3. Endpoints que dependem de identidade (resgate de fidelidade, histórico "meus agendamentos") exigem
   `ClientAuthGuard` validando esse token.

Rate limit agressivo no `otp/start` (por telefone e por IP) — é superfície clássica de abuso.

---

## Endpoints principais

| Método | Rota | Quem | Descrição |
|---|---|---|---|
| `POST` | `/public/v1/{slug}/auth/otp/start` | público | Envia código OTP ao telefone. |
| `POST` | `/public/v1/{slug}/auth/otp/verify` | público | Valida código, emite sessão do cliente. |
| `GET` | `/public/v1/{slug}/me/appointments` | cliente autenticado | Histórico do próprio cliente. |
| `POST` | `/public/v1/{slug}/appointments` | público (+ opcional autenticado) | Cria agendamento; aceita `couponCode`; usa fidelidade se autenticado e elegível. |
| `GET/POST/PATCH/DELETE` | `/coupons` | admin | CRUD de cupons. |
| `GET/POST/PATCH` | `/membership-plans` | admin | CRUD de planos. |
| `GET/POST/PATCH` | `/client-memberships` | admin | Matricula, marca pagamento, suspende/cancela. |
| `PATCH` | `/business/subdomain` | admin | Define/atualiza o subdomínio. |
| `GET` | `/notifications/log` | admin | Auditoria de envios (debug de entrega). |

---

## Critérios de aceite

- [x] Cliente recebe lembrete e confirmação por e-mail via worker (nunca no caminho da request).
- [x] Reenvio de job de notificação não duplica envio (idempotência por `appointmentId + type`).
- [ ] Negócio acessível tanto por `app.com/{slug}` quanto por `{subdomain}.app.com`.
- [x] Cupom válido aplica desconto correto; cupom expirado/esgotado/além do limite por cliente é rejeitado.
- [x] Duas tentativas simultâneas de usar o último uso de um cupom limitado: só uma passa.
- [x] Admin cria plano de fidelidade, matricula cliente e marca pagamento.
- [x] Cliente autenticado via OTP com fidelidade ativa agenda sem custo (ou com desconto do plano) e o uso é descontado do ciclo.
- [x] Duas tentativas simultâneas de gastar o último uso do ciclo de fidelidade: só uma passa (mesmo padrão de lock do MVP).
- [x] Sem autenticação, não é possível resgatar fidelidade de outro cliente digitando o telefone dele.
- [x] Todos os endpoints de cliente usados pelo fluxo de agendamento retornam JSON completo e estão sob `/public/v1/`.
- [x] Rate limit efetivo em `otp/start`.

---

## Armadilhas específicas desta fase

- ❌ Resgate de fidelidade sem exigir autenticação → qualquer um gasta o benefício de outro cliente.
- ❌ Aplicar cupom/fidelidade fora da transação de criação do agendamento → corrida estoura limite de uso.
- ❌ Disparar notificação síncrona na request HTTP → viola decisão firme do contexto geral, adiciona latência.
- ❌ Reenviar notificação em retry de job sem checar `NotificationLog` → spam de lembrete duplicado.
- ❌ Criar endpoint “só para o app” fora do namespace público versionado → quebra a promessa de extensibilidade.
- ❌ Misturar token de cliente com token de admin/staff no mesmo guard → escopos diferentes, guards diferentes.
- ❌ OTP sem rate limit ou sem expiração curta → abuso de SMS e força bruta de código.
- ❌ Automatizar cobrança de fidelidade nesta fase → pagamento automático é escopo da Fase 5; aqui é manual.
