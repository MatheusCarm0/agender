# Fase 2 — MVP

> Pré-requisitos de leitura: `00-contexto-geral.md` e `01-fundacao.md`. Assume a fundação pronta
> (monorepo, auth multi-tenant, isolamento de tenant, `business/user/professional`).

---

## Objetivo

Entregar o fluxo completo de agendamento: o dono cadastra serviços e horários; o cliente final
entra pela página pública (por slug), escolhe profissional + serviço + horário livre e agenda,
**sem risco de double-booking**; o profissional vê a própria agenda e o admin vê todas.

Este é o núcleo que valida o produto. As duas peças mais delicadas — **cálculo de disponibilidade**
e **criação de agendamento com lock** — são detalhadas abaixo e devem ter testes.

---

## Escopo

**Dentro:**
- Entidades: `service`, `professionalService`, `workingHours`, `scheduleBlock`, `client`, `appointment`.
- CRUD de serviços, horários de trabalho e bloqueios (fechar agenda) — via admin.
- Cálculo de disponibilidade (slots livres) com cache no Redis.
- Criação de agendamento com transação + `SELECT ... FOR UPDATE` + idempotência.
- Página pública (Next.js) por slug: tema básico (sem personalização ainda), listar
  profissionais/serviços, escolher slot, preencher dados, confirmar.
- Painel admin: agenda "minha" vs "todas", CRUD de serviço/profissional/horário/bloqueio.

**Fora (fases seguintes):**
- Personalização visual da página (Linktree) — Fase 3.
- Relatório financeiro consolidado — Fase 3.
- Notificações / lembretes — Fase 4.
- Pagamento online / PIX — Fase 5.

---

## Prisma — entidades adicionais

Adicionar ao schema base. Enums de status conforme o glossário.

```prisma
enum AppointmentStatus {
  scheduled
  confirmed
  completed
  cancelled
  no_show
}

model Service {
  id           String   @id @default(cuid())
  businessId   String
  name         String
  durationMin  Int
  price        Decimal  @db.Decimal(10, 2)
  bufferBefore Int      @default(0)
  bufferAfter  Int      @default(0)
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())

  professionals ProfessionalService[]
  appointments  Appointment[]

  @@index([businessId])
}

model ProfessionalService {
  professionalId   String
  serviceId        String
  priceOverride    Decimal? @db.Decimal(10, 2)
  durationOverride Int?

  @@id([professionalId, serviceId])
  @@index([serviceId])
}

model WorkingHours {
  id             String @id @default(cuid())
  businessId     String
  professionalId String
  weekday        Int    // 0 = domingo … 6 = sábado
  startTime      String // "09:00" (hora local do business)
  endTime        String // "18:00"

  @@index([businessId])
  @@index([professionalId, weekday])
}

model ScheduleBlock {
  id             String   @id @default(cuid())
  businessId     String
  professionalId String?  // nulo = fecha o negócio inteiro
  startAt        DateTime // UTC
  endAt          DateTime // UTC
  reason         String?

  @@index([businessId])
  @@index([professionalId, startAt])
}

model Client {
  id         String   @id @default(cuid())
  businessId String
  name       String
  phone      String
  email      String?
  notes      String?  @db.Text
  createdAt  DateTime @default(now())

  appointments Appointment[]

  @@index([businessId])
  @@index([businessId, phone])
}

model Appointment {
  id             String            @id @default(cuid())
  businessId     String
  professionalId String
  serviceId      String
  clientId       String
  startAt        DateTime          // UTC
  endAt          DateTime          // UTC
  status         AppointmentStatus @default(scheduled)
  price          Decimal           @db.Decimal(10, 2)
  paymentStatus  String            @default("unpaid")
  notes          String?           @db.Text
  idempotencyKey String?
  createdAt      DateTime          @default(now())

  service Service @relation(fields: [serviceId], references: [id])
  client  Client  @relation(fields: [clientId], references: [id])

  @@index([businessId])
  @@index([professionalId, startAt])          // usado no lock de conflito
  @@unique([businessId, idempotencyKey])       // idempotência
}
```

Lembrete das decisões firmes: `startTime`/`endTime` de `WorkingHours` são **hora local**;
`startAt`/`endAt` de `ScheduleBlock` e `Appointment` são **UTC**.

---

## Cálculo de disponibilidade (peça crítica #1)

Serviço `AvailabilityService`. Dado `professionalId`, `serviceId` e um intervalo de datas, retorna
os slots livres. Passos:

1. **Duração efetiva** = `durationOverride ?? service.durationMin`, somando `bufferBefore/After`.
2. Para cada dia do intervalo, pegar os `WorkingHours` do `weekday` (na timezone do business).
3. Converter as janelas de trabalho do dia para UTC.
4. Subtrair da janela: os `appointments` ativos (`scheduled`/`confirmed`) do profissional e os
   `scheduleBlocks` (do profissional **ou** do negócio inteiro) que intersectam o dia.
5. Fatiar a janela livre resultante pela duração efetiva + granularidade (ex.: passo de 15 min),
   descartando slots no passado.
6. Retornar a lista de slots (`startAt` em UTC; o front exibe na timezone do business).

**Cache:** chave Redis por `business:{id}:prof:{id}:service:{id}:date:{yyyy-mm-dd}`, TTL curto
(ex.: 60s). **Invalidar** ao criar/cancelar agendamento ou alterar horário/bloqueio do profissional.

Testar exaustivamente: sobreposição de buffer, bloqueio parcial no meio da janela, virada de dia,
timezone, slot no passado. É o maior gerador de bug do domínio.

---

## Criação de agendamento (peça crítica #2)

Endpoint público `POST /public/{slug}/appointments`. Corpo: `professionalId`, `serviceId`,
dados do cliente (nome, telefone), `startAt`, e header `Idempotency-Key`.

Fluxo dentro de `prisma.$transaction` (isolamento adequado):

1. Resolver `business` pelo slug; calcular `endAt` a partir da duração efetiva do serviço.
2. **Checar idempotência:** se já existe appointment com `(businessId, idempotencyKey)`, retornar o existente.
3. **Lock de conflito** — SQL cru sobre a faixa (o índice `(professionalId, startAt)` sustenta):

```sql
SELECT id FROM Appointment
 WHERE professionalId = ?
   AND status IN ('scheduled','confirmed')
   AND startAt < ?   -- novo endAt
   AND endAt   > ?   -- novo startAt
 FOR UPDATE;
```

4. Se retornou linha → lançar `ConflictException` (**409**).
5. Upsert do `client` (por `businessId` + telefone) e `INSERT` do `appointment`.
6. Commit. Fora da transação: invalidar o cache de disponibilidade do profissional.

Regras: validar que o slot ainda pertence à disponibilidade calculada (defesa contra request forjada);
nunca confiar só no front. Preço do agendamento = `priceOverride ?? service.price` no momento da criação.

---

## Página pública (Next.js)

- Rota dinâmica `app/[slug]/page.tsx`, renderização SSR/ISR.
- Resolve o `business` pelo slug; 404 se não existir.
- Tema **básico** nesta fase (cores neutras; personalização é a Fase 3).
- Fluxo: listar profissionais → escolher serviço → calendário/slots livres → formulário de dados →
  confirmação. Gera `Idempotency-Key` no cliente por tentativa de agendamento.
- Sem login para o cliente final.

---

## Painel admin

- Layout autenticado (reusa auth da Fundação).
- **Agenda:** visão de calendário. `professional` vê só a própria; `owner/admin/receptionist` veem
  todas (com filtro por profissional).
- **CRUD:** serviços, profissionais (já existe da Fundação), horários de trabalho, bloqueios (fechar agenda).
- Ações em agendamento: criar manualmente, cancelar, marcar `completed`/`no_show`.

---

## Endpoints principais

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| `GET` | `/public/{slug}` | público | Dados do negócio + profissionais + serviços. |
| `GET` | `/public/{slug}/availability` | público | Slots livres (`professionalId`, `serviceId`, intervalo). |
| `POST` | `/public/{slug}/appointments` | público | Cria agendamento (idempotente, anti-conflito). |
| `GET` | `/services` · `POST` · `PATCH` · `DELETE` | admin | CRUD de serviços. |
| `GET` | `/working-hours` · `POST` · `PATCH` · `DELETE` | admin/prof | Horários de trabalho. |
| `GET` | `/schedule-blocks` · `POST` · `DELETE` | admin/prof | Fechar agenda. |
| `GET` | `/appointments` | admin/prof | Lista (escopada por papel). |
| `POST` | `/appointments` | admin/recep | Criação manual. |
| `PATCH` | `/appointments/:id` | admin/prof | Cancelar / status. |

Todas as rotas `/public/*` resolvem o tenant pelo slug e injetam no contexto antes de qualquer query.

---

## Critérios de aceite

- [ ] Admin cadastra serviço, vincula profissional e define horários de trabalho.
- [ ] `GET /public/{slug}/availability` retorna slots corretos considerando trabalho, agendamentos e bloqueios.
- [ ] Slot no passado nunca aparece; timezone do business respeitada.
- [ ] `POST` de agendamento em slot livre cria com sucesso; em slot ocupado retorna 409.
- [ ] Dois requests concorrentes no mesmo slot: só um cria, o outro recebe 409 (teste de concorrência).
- [ ] `Idempotency-Key` repetida não gera duplicata.
- [ ] Cache de disponibilidade invalidado após criar/cancelar agendamento.
- [ ] Profissional vê só a própria agenda; admin vê todas.
- [ ] Fluxo público completo funciona ponta a ponta (e2e).

---

## Armadilhas específicas desta fase

- Não calcular disponibilidade sem cache (sobrecarrega o banco na página pública).
- Não criar agendamento fora da transação/lock — é onde o double-booking nasce.
- Não confiar no `startAt` enviado pelo front sem revalidar contra a disponibilidade.
- Cuidado com a virada de dia e horário de verão ao converter `WorkingHours` (local) → UTC.
- Cancelamento deve liberar o slot **e** invalidar o cache.
- Preço é "congelado" no agendamento (não recalcular a partir do serviço depois).
