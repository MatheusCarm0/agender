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

**No beta, o canal único é o e-mail** — toda verificação, todo código (OTP) e toda comunicação
com o cliente final saem por e-mail. Notificações por telefone (SMS) são uma **feature pós-beta**;
o código do provedor já existe como scaffolding, mas fica **desligado** até lá.

| Uso | Canal (beta) | Provedor | Situação |
|---|---|---|---|
| Verificação / OTP de login do cliente | **E-mail** | Resend | implementado |
| Notificação transacional (confirmação, lembrete, cancelamento, assinatura) | **E-mail** | Resend | implementado |
| Campanhas promocionais / reengajamento | **E-mail** | Resend | implementado |
| Verificação / OTP por telefone | SMS | Twilio | scaffolding pronto, **desligado** (pós-beta) |
| Notificações de engajamento (fidelidade etc.) | Push in-app | app do clube | não iniciado (pós-beta) |

O e-mail é barato, sem burocracia e sem risco de bloqueio de número — por isso concentra tudo no
beta. SMS entra depois como canal transacional de baixo volume (só OTP), quando fizer sentido
investir no provedor e no registro de remetente para o Brasil.

---

## OTP do cliente (e-mail no beta)

- O cliente da área "meus agendamentos" (`/[slug]/conta`) **se identifica pelo e-mail** e recebe o
  código **por e-mail** (o login por telefone foi descontinuado no beta).
- **E-mail e telefone são obrigatórios no cadastro** (validados no agendamento público — DTO
  `CreatePublicAppointmentDto` + formulário), então todo cliente novo tem e-mail para logar e receber
  o código. Clientes legados sem e-mail (anteriores à regra) não conseguem logar por e-mail.
- Fluxo: `ClientAuthService.startOtp(businessId, email)` busca o cliente por `businessId + email`
  (findFirst; e-mail não é único por tenant, o mais recente responde), gera o código (hash +
  expiração de 5 min em `ClientOtp`, com rate limit por e-mail) e enfileira; o worker
  (`NotificationProcessor.processClientOtp`) envia por e-mail (Resend). A resposta traz `channel: 'email'`.
- Fora de produção, a resposta do endpoint inclui `devCode` para permitir teste sem envio real.

---

## SMS (Twilio) — scaffolding pós-beta, desligado

- **Provedor:** `SmsService` em `apps/api/src/notification/sms/sms.service.ts`, uma abstração
  fina sobre a REST API do Twilio (acessada via `fetch`, sem SDK). Trocar por outro provedor
  (ex.: Zenvia) é reescrever só esse arquivo — a regra de negócio nunca fala com o Twilio.
- **Desligado por padrão.** O worker só usa SMS quando `SMS_ENABLED=true`; sem isso, o OTP vai
  por e-mail. Quando ligado, o SMS vira o canal primário do OTP (telefone de login) com e-mail
  de fallback.
- **Variáveis de ambiente** (no `.env` da raiz do projeto), necessárias ao ligar:
  - `SMS_ENABLED=true`
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER` (número/sender em E.164, ex.: `+5511999999999`)
- **Sem credenciais → modo simulado:** mesmo com `SMS_ENABLED=true`, sem as chaves do Twilio o
  envio cai em log (igual ao Resend sem `RESEND_API_KEY`).
- **Formato:** números são normalizados para E.164 (`SmsService.toE164`), assumindo Brasil
  (`+55`) quando não há código de país. Ajustar a heurística se abrir para outros países.
- **Nota Brasil:** entregar SMS em número `+55` exige registro de remetente (regras da Anatel);
  avaliar Twilio vs. provedor nacional (ex.: Zenvia) na hora de ligar.

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
