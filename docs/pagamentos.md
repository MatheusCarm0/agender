# Pagamentos — Split, Assinatura e Saque

> **Documento de referência transversal.** Substitui a ativação manual de plano descrita em
> `05-monetizacao.md` e o pagamento manual de fidelidade descrito em `04-retencao.md` por um fluxo
> automatizado real. Leia `00-contexto-geral.md`, `01-fundacao.md`, `02-mvp.md`, `04-retencao.md`
> e `05-monetizacao.md` antes deste.

---

## Decisão de modelo (confirmada)

- **Split de pagamento com subconta**, não repasse direto. O dinheiro do agendamento entra na
  **custódia do gateway** (não na sua empresa), é dividido automaticamente, e o dono **saca quando
  quiser** — ele cadastra conta bancária ou chave PIX.
- **A plataforma não retém comissão por enquanto** — repassa 100% do valor do agendamento ao dono.
  Importante: "100%" é do que **você** cobraria em cima; a **taxa do próprio gateway** (processamento
  de PIX/cartão) continua existindo e é descontada por ele, não por você. Isso precisa ficar
  transparente na UI — nunca prometer "o cliente recebe o valor cheio sem desconto nenhum".
- **Gateway escolhido: Asaas.** Motivo: feito para exatamente esse caso (recorrência nativa para
  a assinatura do plano + split com subconta para o marketplace), PIX com repasse D+0, criação de
  subconta via API com baixa burocracia comparado a alternativas mais voltadas a operação grande.
  A subconta do Asaas já vem com um login próprio do dono no painel deles — você pode usar isso como
  rede de segurança, mas a recomendação é construir o saque **dentro do seu próprio app** (melhor
  identificação de marca, que era exatamente o motivo que te fez escolher o modelo separado).

### Por que isso não vira "sua empresa precisa de licença do Banco Central"

A custódia do dinheiro fica **dentro da subconta do Asaas**, que é uma instituição de pagamento
licenciada. Seu sistema **nunca guarda o dinheiro** — só orquestra via API (cria a subconta, direciona
o split, dispara o saque). O "saldo" que aparece no seu painel é um **espelho** do saldo real que
existe do lado do Asaas, sincronizado por webhook. Não inverter essa ordem: se algum dia a arquitetura
mudar para reter dinheiro numa conta da própria plataforma antes de repassar, isso reabre a
discussão regulatória — não fazer isso sem avaliação jurídica específica.

---

## Prisma — entidades novas

### Conta de pagamento do negócio (subconta)

```prisma
enum PaymentAccountStatus { pending_verification active restricted }

model PaymentAccount {
  id                String                @id @default(cuid())
  businessId        String                @unique
  provider          String                @default("asaas")
  externalAccountId String                          // id da subconta no Asaas
  status            PaymentAccountStatus  @default(pending_verification)
  pixKey            String?
  bankAccount        Json?                          // espelho informativo; fonte da verdade é o Asaas
  createdAt          DateTime              @default(now())

  @@index([businessId])
}
```

### Pagamento de agendamento

```prisma
enum BookingPaymentStatus { pending confirmed failed refunded }

model BookingPayment {
  id              String               @id @default(cuid())
  appointmentId   String               @unique
  businessId      String
  amount          Decimal              @db.Decimal(10, 2)
  method          String               // pix | credit_card
  status          BookingPaymentStatus @default(pending)
  gatewayChargeId String
  paidAt          DateTime?
  createdAt       DateTime             @default(now())

  @@index([businessId])
}
```

### Assinatura do plano (substitui a ativação manual)

```prisma
model PlanSubscription {
  id                    String    @id @default(cuid())
  businessId            String    @unique
  gatewaySubscriptionId String
  planTier              PlanTier  // reaproveita enum de 05-monetizacao.md
  status                String    // active | overdue | cancelled — espelha o status do Asaas
  nextDueDate           DateTime?
  createdAt             DateTime  @default(now())

  @@index([businessId])
}
```

`Business.planStatus` (de `05-monetizacao.md`) passa a ser **atualizado por webhook**, não por
você manualmente. `pastDue` (que já existia como enum, mas sem uso real) agora tem propósito: é o
que o Asaas retorna quando a cobrança falha.

---

## Fluxo 1 — Assinatura do plano (Básico/Profissional/Pro)

1. Dono escolhe/atualiza o plano no próprio painel (autoatendimento — resolve o ponto que você
   levantou de "comprar o plano sem depender de mim").
2. Backend chama a API de assinatura do Asaas (cobrança recorrente, não split — aqui o dinheiro
   é seu, da plataforma, não do dono).
3. Asaas retorna o link/checkout de pagamento (cartão) ou cobrança PIX recorrente.
4. Webhook do Asaas confirma pagamento → `PlanSubscription.status = active` e
   `Business.planStatus = active`, `plan = <tier escolhido>`.
5. Falha de cobrança recorrente → webhook marca `pastDue`; regra de grace period e posterior
   `expired` já definida em `05-monetizacao.md` passa a ser disparada por esse evento, não mais
   manualmente.

---

## Fluxo 2 — Pagamento no agendamento (cliente paga a loja)

Cada negócio configura sua própria política — nem toda barbearia quer cobrar antecipado:

```prisma
// adicionar em Business:
bookingPaymentPolicy String @default("none") // none | deposit | full
depositPercent       Int?                    // usado quando policy = deposit
```

1. No fluxo público de agendamento (`02-mvp.md`), se `bookingPaymentPolicy != "none"`, a tela de
   confirmação mostra o valor a pagar (integral ou a parcela de depósito) antes de fechar o horário.
2. Cliente paga via PIX ou cartão (checkout do Asaas). Cria-se um `BookingPayment` com `status = pending`.
3. **O agendamento só é confirmado (`status: scheduled`) após o webhook confirmar o pagamento** —
   nunca reservar o slot como definitivo com pagamento pendente por muito tempo; usar o mesmo
   mecanismo de lock/transação do MVP, com um TTL curto para expirar reservas não pagas e liberar o slot.
4. Pagamento confirmado → split automático credita 100% (menos a taxa do gateway) na subconta do
   negócio. Nenhuma etapa manual sua no meio.

---

## Fluxo 3 — Saque

1. Painel mostra o saldo (espelhado da subconta) e um botão **"Solicitar saque"**.
2. Ação chama a API de transferência do Asaas para a conta bancária ou chave PIX cadastrada.
3. Enquanto `PaymentAccount.status != active` (KYC pendente/restrita), o botão fica desabilitado
   com uma mensagem clara do motivo — nunca falha silenciosa.
4. Webhook de confirmação da transferência atualiza o histórico de saques exibido ao dono.

---

## Onboarding do pagamento (patch em `onboarding.md`)

Novo passo, **pulável** como os demais, mas necessário antes do primeiro saque ou de qualquer
cobrança de agendamento funcionar:

- Formulário: dados para a subconta (CPF/CNPJ, dados bancários ou chave PIX).
- Chama a API do Asaas para criar a subconta; `PaymentAccount.status = pending_verification`
  até a verificação deles ser concluída (pode levar de minutos a alguns dias, dependendo do KYC).
- Enquanto pendente, o negócio pode operar normalmente (agendar sem cobrança), só não recebe
  pagamento online nem saca até `status = active`.

## Fidelidade automatizada (patch em `04-retencao.md`)

O pagamento de `ClientMembership`, hoje manual, passa a poder usar o **mesmo checkout e split**
deste documento: cliente paga o plano de fidelidade via PIX/cartão, split credita a subconta do
negócio, webhook marca `ClientMembership.paymentStatus = paid` automaticamente. Ativação manual
continua existindo como alternativa (dinheiro/maquininha), não é removida — só deixa de ser a
única via.

---

## Webhooks

- Endpoint único `POST /webhooks/asaas`, **público mas com verificação de assinatura** (token do
  Asaas enviado no header) — sem verificação válida, descartar a requisição.
- Idempotente: cada evento tem um id do Asaas; gravar processado antes de aplicar efeito, para
  reentrega do webhook não duplicar confirmação de pagamento nem repetir split.
- Eventos tratados: pagamento de agendamento confirmado/falho, cobrança de assinatura
  confirmada/falha, transferência de saque confirmada.

---

## Transparência de taxas (UI)

Toda tela que envolve dinheiro mostra o valor **líquido esperado** (valor bruto menos a taxa do
Asaas), nunca só o valor bruto — tanto na confirmação de pagamento do agendamento quanto no
extrato de saldo do dono. Segue a fonte `mono` + `tabular-nums` já definida em `estilo-admin.md`.

---

## Endpoints

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| `POST` | `/payment-account` | admin (dono) | Inicia criação da subconta (onboarding de pagamento). |
| `GET` | `/payment-account` | admin (dono) | Status da subconta e saldo espelhado. |
| `POST` | `/payment-account/withdraw` | admin (dono) | Solicita saque para conta/PIX cadastrado. |
| `POST` | `/plan-subscription` | admin (dono) | Assina/troca de plano (Básico/Profissional/Pro). |
| `GET` | `/plan-subscription` | admin (dono) | Status da assinatura atual. |
| `POST` | `/public/v1/{slug}/appointments/:id/pay` | público | Inicia cobrança do agendamento (PIX/cartão). |
| `POST` | `/webhooks/asaas` | sistema (Asaas) | Recebe confirmações de pagamento/assinatura/saque. |

---

## Critérios de aceite

> Nota de implementação: o gateway escolhido para a fase de testes é o **Mercado Pago** (checkout
> transparente + preapproval), no modelo **conta única** (collector = plataforma). O split real
> (subconta/marketplace, seja Asaas ou OAuth do Mercado Pago) e o **payout automático** ficam como
> checkpoint de produção — o `PaymentProvider` já abstrai a troca. Itens marcados `[~]` estão
> funcionais no modo conta única, com a costura pronta para o modelo de split.

- [x] Dono assina um plano pelo próprio painel, sem intervenção manual sua. (preapproval do MP + `/plan-subscription`)
- [x] Falha de cobrança recorrente move `planStatus` para `pastDue` automaticamente via webhook.
- [x] Negócio com `bookingPaymentPolicy = deposit` exige o valor de depósito antes de confirmar o slot.
- [x] Agendamento com pagamento pendente não trava o slot indefinidamente — expira e libera. (cron a cada 5 min)
- [~] Pagamento confirmado credita o negócio (saldo espelhado em razão interno; subconta real = produção).
- [~] Botão de saque funciona e fica desabilitado com mensagem clara enquanto a conta não está `active`. (payout real = produção)
- [x] Reentrega do mesmo webhook não duplica confirmação de pagamento nem saque. (tabela `WebhookEvent`)
- [x] UI de saldo/pagamento sempre mostra o valor líquido (após taxa estimada do gateway), nunca só o bruto.
- [ ] Fidelidade pode ser paga via checkout automatizado ou continuar manual, à escolha do fluxo. (não abordado nesta rodada)

---

## Armadilhas específicas

- ❌ Guardar o saldo do dono numa conta da própria empresa antes de repassar — reabre a discussão
  de licença de instituição de pagamento. Custódia sempre do lado do Asaas.
- ❌ Confirmar agendamento com pagamento como `scheduled` antes do webhook validar — trava slot
  por reserva que pode nunca ser paga.
- ❌ Prometer "100% pro dono" sem deixar claro que a taxa do gateway continua sendo descontada.
- ❌ Processar webhook sem verificar assinatura — abre porta para forjar confirmação de pagamento.
- ❌ Processar o mesmo evento de webhook duas vezes (reentrega) sem checagem de idempotência.
- ❌ Deixar o saque disponível com `PaymentAccountStatus` pendente/restrita.
- ❌ Expor `gatewayChargeId`/credenciais do Asaas em qualquer resposta pública da API.
