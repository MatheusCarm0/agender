# Notificações — Estratégia de Canais

> Extensão de `04-retencao.md`. Define **quais canais** o Agender usa para cada tipo de
> mensagem e **com quais provedores concretos**. A interface `NotificationProvider` e o
> modelo de dados (`NotificationLog`, `NotificationChannel`) foram definidos em
> `04-retencao.md`; este documento preenche a implementação real e **substitui** a
> abordagem anterior baseada em WhatsApp/Meta Cloud API.

---

## Decisão: nada de WhatsApp

A ideia original (lembretes/OTP por WhatsApp) foi **descontinuada**. Motivos:

- A **API oficial da Meta (Cloud API)** exige verificação de negócio, aprovação de
  templates e gestão de janela de 24h — burocracia inviável para o estágio atual.
- Os **gateways não-oficiais** (Baileys/whatsapp-web.js via QR) violam o ToS do WhatsApp
  e expõem o número a **bloqueio por spam** — especialmente perigoso num número
  compartilhado disparando para clientes de vários tenants.

A estratégia segura adotada distribui as mensagens por tipo:

| Uso | Canal | Provedor | Situação |
|---|---|---|---|
| Verificação / OTP de login do cliente | **SMS** | Twilio (REST API) | implementado |
| Notificação transacional (confirmação, lembrete, cancelamento, assinatura) | **E-mail** | Resend | implementado |
| Campanhas promocionais / reengajamento | **E-mail** | Resend | implementado |
| Notificações de engajamento (fidelidade etc.) | **Push in-app** | app do clube (futuro) | não iniciado |

SMS é **transacional e de baixo volume** (só OTP), então não sofre o bloqueio por spam que
o WhatsApp sofre em disparo em massa. Promoção em massa vai por e-mail, canal barato e sem
risco de bloqueio de número.

---

## SMS (Twilio)

- **Provedor:** `SmsService` em `apps/api/src/notification/sms/sms.service.ts`, uma abstração
  fina sobre a REST API do Twilio (acessada via `fetch`, sem SDK). Trocar por outro provedor
  (ex.: Zenvia) é reescrever só esse arquivo — a regra de negócio nunca fala com o Twilio.
- **Variáveis de ambiente** (no `.env` da raiz do projeto):
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER` (número/sender em E.164, ex.: `+5511999999999`)
- **Sem credenciais → modo simulado:** o envio cai em log (igual ao Resend sem
  `RESEND_API_KEY`). Assim o fluxo E2E de OTP roda em dev/testes com o `devCode` sem custo,
  e o Twilio só entra de fato em produção.
- **Formato:** números são normalizados para E.164 (`SmsService.toE164`), assumindo Brasil
  (`+55`) quando não há código de país. Ajustar a heurística se abrir para outros países.

### OTP do cliente

- O cliente da área "meus agendamentos" (`/[slug]/conta`) se identifica pelo **telefone**,
  então o **SMS é o canal primário** — sempre há um número de destino.
- Fluxo: `ClientAuthService.startOtp` gera o código (hash + expiração de 5 min em `ClientOtp`,
  com rate limit) e enfileira; o worker (`NotificationProcessor.processClientOtp`) envia por
  SMS, com **e-mail como fallback** quando o SMS falha e o cliente tem e-mail cadastrado.
- Fora de produção, a resposta do endpoint inclui `devCode` para permitir teste sem SMS real.

---

## E-mail (Resend)

- Já implementado em `NotificationProcessor` (`FROM_EMAIL = onboarding@resend.dev` em dev).
  Variável: `RESEND_API_KEY`. Sem chave → e-mails são apenas logados.
- Cobre notificações transacionais de agendamento/assinatura e **campanhas promocionais**.
- Campanhas (`CampaignChannel`) são criadas **somente com canal `email`** — o seletor de
  canal foi removido da UI e o DTO valida `email`. Valores `whatsapp`/`both` permanecem no
  enum apenas para linhas históricas.

---

## Push in-app (futuro)

Quando o app do clube de fidelidade existir, as notificações de engajamento (lembretes de
recompensa, novidades do clube) migram para **push in-app**, eliminando de vez a dependência
de canais externos para esse tipo de mensagem. Fora de escopo até o app existir.

---

## Armadilhas

- ❌ Reintroduzir WhatsApp num número compartilhado → bloqueio por spam derruba todos os tenants.
- ❌ Enviar promoção em massa por SMS → caro e sujeito a bloqueio de operadora.
- ❌ Logar o código OTP em claro em produção → já tratado em `ClientAuthService` (só loga fora de prod).
- ❌ Rodar envio no caminho da request HTTP → sempre pelo worker (regra firme de `00-contexto-geral.md`).
