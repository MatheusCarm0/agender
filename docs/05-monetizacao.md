# Fase 5 — Monetização

> Pré-requisitos de leitura: `00-contexto-geral.md`, `01-fundacao.md`, `02-mvp.md`,
> `03-diferenciacao.md`, `04-retencao.md`, `notificacoes.md`.
>
> **Escopo deste documento por ora: Campanhas de Disparo (funcionalidade paga por plano).**
> O restante da Fase 5 do roadmap original (PIX/depósito antecipado automatizado, domínio próprio,
> multi-unidade) ainda não foi detalhado e será adicionado a este mesmo arquivo depois, em uma
> próxima rodada — não é escopo desta versão.

---

## Objetivo

Permitir que **cada negócio (tenant)** crie suas próprias campanhas de disparo de mensagem
(WhatsApp e/ou e-mail) para a base de clientes — promoções, "sentimos sua falta", aniversário —
como uma **funcionalidade dos planos Profissional e Pro**, tanto para cobrir o custo real do envio
(categoria `marketing` da Meta, a mais cara — ver `notificacoes.md`) quanto para monetizar a
diferenciação do produto. Junto disso, esta fase formaliza o **modelo comercial de planos**: sem
plano gratuito permanente — todo negócio novo começa com um **teste de 7 dias** e precisa escolher
entre Básico, Profissional ou Pro para continuar depois disso.

---

## Escopo

**Dentro:**
- Modelo de planos do negócio: **teste de 7 dias** → **Básico** / **Profissional** / **Pro**, com a
  criação de campanhas exclusiva de Profissional/Pro.
- Comportamento de expiração do teste sem plano escolhido.
- Criação, agendamento e envio de campanhas (WhatsApp e/ou e-mail) para um público filtrado.
- Estimativa de custo **antes** de confirmar o envio.
- Controle de cota mensal incluída no plano + excedente.
- Opt-in de marketing do cliente (obrigatório para WhatsApp categoria `marketing`).
- Upsell no admin para quem está no teste ou no plano Básico.

**Fora (ainda não detalhado — pendente do restante da Fase 5):**
- Cobrança automática recorrente do plano (assinatura via PIX/cartão) — por ora, ativação de plano
  é **manual**, mesmo padrão já usado para o clube de fidelidade em `04-retencao.md`.
- Diferenciação completa de recursos entre Básico/Profissional/Pro além de campanhas (a definir).
- Domínio próprio, multi-unidade.

---

## Modelo de planos (patch em `01-fundacao.md`)

**Não existe plano gratuito permanente.** Todo negócio novo entra num **teste de 7 dias** com acesso
equivalente ao plano **Básico**; ao final do teste, precisa escolher um plano pago para continuar.

`Business.plan` existia como `String @default("free")` na Fundação. Substituir por:

```prisma
enum PlanTier {
  basico
  profissional
  pro
}

enum PlanStatus {
  trialing   // dentro dos 7 dias de teste
  active     // plano pago em dia
  pastDue    // pagamento atrasado (grace period — regra na Fase 5 completa, quando o billing automático existir)
  expired    // teste ou pagamento venceram sem regularização
}

// alterar em Business:
plan          PlanTier    @default(basico)   // era String; nível de acesso, independente do status
planStatus    PlanStatus  @default(trialing)
trialEndsAt   DateTime                        // preenchido no cadastro: now() + 7 dias
planUpdatedAt DateTime?
```

`plan` define **o que** o negócio pode acessar (o nível de recurso); `planStatus` define **se** o
acesso está de fato liberado agora. Durante o teste, `plan = basico` e `planStatus = trialing` —
tecnicamente é o mesmo conjunto de permissões do plano Básico pago, só com prazo.

No cadastro (`POST /auth/register-business`, `01-fundacao.md`): `trialEndsAt = now() + 7 dias`,
`plan = basico`, `planStatus = trialing`.

### Comparação de planos (recurso de campanha; demais diferenças ficam para o restante da Fase 5)

| Plano | Campanhas de disparo | Cota mensal incluída (sugestão, ajustável) |
|---|---|---|
| Teste (7 dias) | ❌ Bloqueado | — |
| Básico | ❌ Bloqueado | — |
| Profissional | ✅ Liberado | 300 disparos/mês (valor de partida — a definir o preço/cota final) |
| Pro | ✅ Liberado | 1.000 disparos/mês (valor de partida — a definir o preço/cota final) |

Os números de cota são **placeholder de engenharia**, não uma decisão comercial fechada — ajuste
livremente antes de lançar; o importante é que fiquem centralizados (ver `PlanUsage` abaixo) e
não espalhados pelo código.

---

## Fim do teste sem plano escolhido

Regra de comportamento quando `trialEndsAt` passa e `planStatus` continua `trialing`:

1. Um job assíncrono (worker, rodando diariamente) verifica negócios com `trialEndsAt` vencido e
   `planStatus = trialing`, e muda para `planStatus = expired`.
2. **Painel admin:** com `planStatus = expired`, todas as rotas exceto a de escolha/pagamento de
   plano retornam bloqueadas (mesmo padrão do `PlanGuard`, aplicado de forma ampla). A pessoa só
   consegue ver a tela "Escolha um plano para continuar".
3. **Página pública do cliente continua no ar**, mas **para de aceitar novos agendamentos** —
   mostra uma mensagem de indisponibilidade temporária. Agendamentos já existentes não são apagados.
4. **Aviso prévio:** notificação (e-mail, via `notificacoes.md`) em D-3 e D-1 antes do fim do teste,
   e no próprio dia da expiração — dando chance real de decidir antes de perder acesso.
5. Escolher um plano a qualquer momento (durante o teste ou depois de expirado) muda `plan` e
   `planStatus = active` imediatamente, restaurando o acesso.

---

## Opt-in de marketing (novo campo em `Client`)

Mensagem `utility` (lembrete/confirmação) já é uma consequência esperada de agendar — não precisa
de opt-in separado. Mensagem `marketing` (campanha) **precisa**, tanto por política da Meta quanto
por boa prática (LGPD):

```prisma
// adicionar em Client:
marketingOptIn   Boolean   @default(false)
marketingOptInAt DateTime?
```

Capturado no formulário de agendamento público (checkbox opcional, desmarcado por padrão — nunca
pré-marcado) ou manualmente pelo admin. Campanha **nunca** envia para cliente sem `marketingOptIn = true`.

---

## Prisma — entidades de campanha

```prisma
enum CampaignChannel { whatsapp email both }
enum CampaignStatus  { draft scheduled sending sent failed cancelled }

model Campaign {
  id              String          @id @default(cuid())
  businessId      String
  name            String
  channel         CampaignChannel
  messageText     String          @db.Text
  emailSubject    String?
  audienceFilter  Json            @default("{}") // ex.: { allOptedIn: true } | { inactiveSinceDays: 60 }
  scheduledFor    DateTime?
  status          CampaignStatus  @default(draft)
  totalRecipients Int             @default(0)
  totalSent       Int             @default(0)
  totalFailed     Int             @default(0)
  costEstimate    Decimal         @default(0) @db.Decimal(10, 2)
  costActual      Decimal         @default(0) @db.Decimal(10, 2)
  createdAt       DateTime        @default(now())

  @@index([businessId])
}

model CampaignRecipient {
  id         String              @id @default(cuid())
  campaignId String
  clientId   String
  status     NotificationStatus  @default(pending) // reaproveita enum de 04-retencao.md
  sentAt     DateTime?
  error      String?

  @@unique([campaignId, clientId])
  @@index([campaignId])
}

model PlanUsage {
  id                     String   @id @default(cuid())
  businessId             String
  periodStart            DateTime
  periodEnd              DateTime
  planAtSnapshot         PlanTier            // cota depende do plano; guardar qual valia neste ciclo
  campaignSendsIncluded  Int      @default(0) // copiado da tabela de cotas no início do ciclo (não recalculado se o plano mudar no meio)
  campaignSendsUsed      Int      @default(0)
  overageSends           Int      @default(0)
  overageCost            Decimal  @default(0) @db.Decimal(10, 2)

  @@unique([businessId, periodStart])
  @@index([businessId])
}
```

`campaignSendsIncluded` é um **snapshot**, não uma referência viva ao plano — se o negócio faz
upgrade no meio do ciclo, o ciclo atual mantém a cota antiga e o novo ciclo (mês seguinte) já
reflete o plano novo. Evita o caso estranho de "cota mudou no meio do mês e ninguém entende por quê".

`audienceFilter` fica em JSON para permitir filtros simples sem migração a cada novo critério
(ex.: todos com opt-in, inativos há N dias, aniversariantes do mês). Validado por DTO — mesma
regra de nunca aceitar filtro arbitrário/injeção de query.

---

## Gate de plano (peça crítica)

Nova guard, seguindo o padrão de `RolesGuard`/`TenantGuard` já existentes na Fundação:

- `PlanGuard` + decorator `@RequiresPlan(['profissional', 'pro'])` nas rotas de campanha. Verifica
  `business.plan` **e** `business.planStatus = active` (ou `trialing`, se o teste algum dia cobrir
  campanhas — hoje não cobre, ver tabela acima) no contexto de request. Retorna **402/403** com um
  corpo que a UI usa para mostrar o upsell, nunca um erro genérico.
- A checagem é **sempre server-side**. A UI pode esconder o botão para quem está no Básico/teste,
  isso é só conveniência — o endpoint tem que recusar mesmo que a request chegue direto.
- `planStatus = expired` bloqueia **tudo**, independente de `plan` (ver seção "Fim do teste" acima)
  — não é um gate exclusivo de campanha, é o guard mais amplo do painel inteiro.

Ativação/mudança de plano nesta fase (Básico → Profissional/Pro) é **manual**: você, como operador
da plataforma, confirma o pagamento e atualiza `plan`/`planStatus`. Mesmo padrão já usado para o
clube de fidelidade em `04-retencao.md`. Automação de cobrança recorrente é escopo futuro do
restante da Fase 5.

---

## Fluxo de criação e envio

1. Admin (plano `pro`) monta a campanha: canal, texto, filtro de público, agendamento (agora ou data futura).
2. **Antes de confirmar:** sistema calcula o público-alvo real (aplicando `marketingOptIn = true`
   **sempre**, mais o `audienceFilter`) e mostra **estimativa de custo** (nº de destinatários ×
   tarifa vigente da categoria `marketing`, por canal) e quanto disso cabe na cota do plano vs. excedente.
3. Ao confirmar, `Campaign.status = scheduled`, cria um `CampaignRecipient` por destinatário elegível.
4. No horário agendado (ou imediatamente), o worker enfileira **um job por destinatário** — reaproveita
   a mesma fila/worker de `notificacoes.md`, mas usando o template de categoria `marketing`.
5. Cada envio atualiza `CampaignRecipient.status`, incrementa `totalSent`/`totalFailed` na campanha,
   e incrementa `PlanUsage.campaignSendsUsed` do ciclo vigente do negócio.
6. Ao ultrapassar `campaignSendsIncluded`, os envios seguintes contam como `overageSends` e acumulam
   `overageCost` — usado depois para cobrança (manual nesta fase, automatizável quando o billing
   recorrente for especificado).

---

## UI

**Negócio no teste ou no plano Básico:** tela de Campanhas mostra um **card de upsell** — nome do
recurso, benefício em uma frase, "disponível nos planos Profissional e Pro", botão "Falar sobre
upgrade" (contato manual nesta fase). Nenhum formulário de criação é exibido.

**Negócio com `planStatus = expired`:** não vê a tela de Campanhas nem nenhuma outra — é redirecionado
para a tela "Escolha um plano para continuar" (ver "Fim do teste" acima), que é a única rota liberada.

**Negócio no plano Profissional ou Pro (`planStatus = active`):** segue `estilo-admin.md`.
- **Lista de campanhas:** nome, canal, status, destinatários, enviados/falhos, custo.
- **Criação:** formulário com canal, texto (preview lado a lado, como o editor de personalização),
  filtro de público (seletor simples, não query livre), agendamento.
- **Antes de enviar:** tela de confirmação obrigatória mostrando **nº de destinatários e custo
  estimado**, com o texto explícito de quanto está dentro da cota e quanto é excedente. Botão
  "Confirmar envio" separado do botão "Salvar rascunho".
- **Uso do plano:** card mostrando `campaignSendsUsed / campaignSendsIncluded` do ciclo atual.

---

## Endpoints

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| `GET` | `/campaigns` | admin (pro) | Lista campanhas do negócio. |
| `POST` | `/campaigns` | admin (pro) | Cria rascunho. |
| `POST` | `/campaigns/:id/estimate` | admin (pro) | Calcula público e custo estimado (sem enviar). |
| `POST` | `/campaigns/:id/confirm` | admin (pro) | Confirma envio/agendamento. |
| `DELETE` | `/campaigns/:id` | admin (pro) | Cancela (só se `draft`/`scheduled`). |
| `GET` | `/billing/usage` | admin | Uso do ciclo atual (`PlanUsage`) — visível em qualquer plano, para mostrar o que o upgrade desbloquearia. |

---

## Critérios de aceite

- [ ] Cadastro de negócio novo entra automaticamente em teste (`plan = basico`, `planStatus = trialing`, `trialEndsAt = +7 dias`).
- [ ] Negócio em teste ou no plano Básico não consegue criar campanha nem via UI nem via chamada direta ao endpoint (403/402).
- [ ] Aviso de expiração do teste chega em D-3, D-1 e no dia (e-mail).
- [ ] Ao vencer o teste sem plano escolhido, `planStatus` vira `expired` automaticamente (job diário).
- [ ] Negócio `expired` só acessa a tela de escolha de plano no admin; nenhuma outra rota funciona.
- [ ] Página pública de negócio `expired` para de aceitar novo agendamento, mas continua exibindo os existentes.
- [ ] Escolher um plano (a qualquer momento) restaura `planStatus = active` e o acesso completo imediatamente.
- [ ] Campanha nunca inclui cliente com `marketingOptIn = false`.
- [ ] Estimativa de custo é mostrada e exige confirmação explícita antes do envio real.
- [ ] Envio usa template de categoria `marketing` (nunca reaproveita template `utility` de lembrete).
- [ ] Uso do ciclo é corretamente incrementado por envio; excedente calculado após estourar a cota; cota usada é a do snapshot do ciclo, não a do plano atual se ele mudou no meio do mês.
- [ ] Cancelar uma campanha em `draft`/`scheduled` não gera nenhum envio.
- [ ] Falha de envio individual não derruba a campanha inteira — cada destinatário tem status próprio.

---

## Armadilhas específicas

- ❌ Checar o plano só no frontend — o gate tem que existir no endpoint, sempre.
- ❌ Deixar o teste expirar silenciosamente sem aviso prévio — negócio perde acesso sem entender por quê.
- ❌ Apagar ou bloquear agendamentos já existentes quando o teste expira — só bloqueia **novos** agendamentos e o admin.
- ❌ Recalcular `campaignSendsIncluded` de um ciclo já iniciado quando o plano muda no meio do mês — usar o snapshot.
- ❌ Enviar campanha para cliente sem opt-in de marketing — viola política da Meta e LGPD.
- ❌ Confundir template `utility` (lembrete) com `marketing` (campanha) — categorias diferentes,
  custo muito diferente (ver `notificacoes.md`).
- ❌ Disparar sem mostrar estimativa de custo antes — negócio não pode ser surpreendido pela fatura.
- ❌ Deixar o filtro de público como query livre — abre brecha de acesso a dado fora do escopo do
  tenant ou de campos sensíveis. Filtro é uma lista fechada de critérios validados.
- ❌ Uma falha de envio individual derrubar o job da campanha inteira — cada destinatário é
  processado e registrado independentemente.
