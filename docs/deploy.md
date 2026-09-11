# Deploy — do zero à produção (guia para iniciante)

> Guia passo a passo para colocar o Agender no ar com **baixo custo** e um **caminho claro de
> escala**. Escrito para quem nunca fez deploy. Siga na ordem. Onde tiver `⚠️`, leia com atenção
> porque é fácil errar ali.

---

## 1. A ideia em uma imagem

O sistema tem 6 peças, todas já descritas no `docker-compose.yml`:

| Peça | O que é | Escala assim |
|---|---|---|
| `web` | site + painel (Next.js SSR) | replicar (stateless) |
| `api` | regras de negócio (NestJS) | replicar (stateless) |
| `worker` | envia e-mails, roda tarefas agendadas | 1 só (é quem roda os crons) |
| `mysql` | banco de dados | vertical primeiro, depois banco gerenciado |
| `redis` | cache + fila | vertical primeiro, depois gerenciado |
| `nginx` | porta de entrada (proxy) | vira Caddy (HTTPS automático) |

**Estratégia de custo x escala:** começar com **tudo num único servidor (VPS)** rodando o
`docker-compose`. É o mais barato (~R$ 30–60/mês) e aguenta tranquilamente o beta. Quando crescer,
você troca peça por peça (banco gerenciado, mais réplicas de `api`/`web`) **sem reescrever nada** —
a arquitetura já é stateless e separada.

---

## 2. O que você precisa antes de começar

1. **Um domínio** (ex.: `seunegocio.com.br`). Compre no Registro.br, Cloudflare ou Namecheap.
2. **Uma conta de VPS.** Recomendo **Hetzner** (mais barato: CX22 ~€4,5/mês) ou **DigitalOcean**
   (mais amigável: Droplet de US$ 6/mês). Qualquer um serve. Pegue **2 GB de RAM no mínimo**
   (4 GB folgado para o beta).
3. **Conta no Mercado Pago** (para receber o pagamento dos planos) — credenciais de **produção**.
4. **Conta no Resend** (para enviar e-mails) — chave de API + um domínio verificado.
5. No seu computador: um terminal com `ssh` (o PowerShell do Windows já tem).

---

## 3. Passo a passo (caminho recomendado: 1 VPS + Docker + Caddy)

### 3.1. Criar o servidor
1. No painel da Hetzner/DigitalOcean, crie um servidor **Ubuntu 24.04 LTS**, 2–4 GB RAM.
2. Ao criar, adicione sua **chave SSH** (o painel explica como; no Windows, gere com
   `ssh-keygen` e cole o conteúdo de `C:\Users\SEU_USUARIO\.ssh\id_ed25519.pub`).
3. Anote o **IP** do servidor (ex.: `203.0.113.10`).

### 3.2. Apontar o domínio para o servidor
No painel do seu domínio (DNS), crie dois registros **A** apontando para o IP do VPS:

```
A   @     203.0.113.10
A   www   203.0.113.10
```

Espere alguns minutos (às vezes até 1h) para propagar.

### 3.3. Entrar no servidor e instalar o Docker
No seu terminal:

```bash
ssh root@203.0.113.10
```

Já dentro do servidor, instale Docker + Compose (script oficial):

```bash
curl -fsSL https://get.docker.com | sh
```

Confirme:

```bash
docker --version && docker compose version
```

### 3.4. Baixar o código
```bash
apt-get update && apt-get install -y git
git clone SEU_REPOSITORIO_GIT agender
cd agender
```

> Troque `SEU_REPOSITORIO_GIT` pela URL do seu repositório (ex.: a do GitHub). Se for privado,
> configure uma *deploy key* ou use `https` com um token.

### 3.5. Criar o arquivo de segredos (`.env`) ⚠️
Este é o passo mais importante. Crie o arquivo `.env` na raiz do projeto:

```bash
nano .env
```

Cole o modelo abaixo e **preencha cada valor** (explicação logo em seguida):

```dotenv
# --- Banco e cache (deixe assim; ficam dentro do Docker) ---
DATABASE_URL=mysql://agenda:agenda@mysql:3306/agenda?charset=utf8mb4
REDIS_URL=redis://redis:6379

# --- Segredos de sessão (GERE valores aleatórios fortes, veja abaixo) ---
JWT_ACCESS_SECRET=COLE_UM_VALOR_ALEATORIO_LONGO
JWT_REFRESH_SECRET=COLE_OUTRO_VALOR_ALEATORIO_LONGO

# --- URLs públicas (troque pelo seu domínio, com https) ---
APP_URL=https://seunegocio.com.br
WEB_URL=https://seunegocio.com.br
APP_WEB_URL=https://seunegocio.com.br
CORS_ORIGINS=https://seunegocio.com.br

# --- E-mail (Resend) ---
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
MAIL_FROM=Agender <nao-responda@seunegocio.com.br>

# --- Upload de imagens (Cloudflare R2 / S3) ⚠️ obrigatório em produção ---
S3_ENDPOINT=https://SEU_ACCOUNT_ID.r2.cloudflarestorage.com
S3_BUCKET=agender-uploads
S3_ACCESS_KEY_ID=xxxxxxxxxxxxxxxx
S3_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
S3_REGION=auto

# --- Pagamento de plano (Mercado Pago PRODUÇÃO) ---
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx   # token de PRODUÇÃO, não o TEST-
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxxxxx
MERCADOPAGO_WEBHOOK_SECRET=cole_o_segredo_do_webhook

# --- Cobrança online no agendamento: mantenha FALSE no beta ---
ONLINE_PAYMENTS_ENABLED=false
```

**Como preencher:**
- **JWT_ACCESS_SECRET / JWT_REFRESH_SECRET:** rode `openssl rand -base64 48` (duas vezes) e cole
  cada resultado. ⚠️ A API **se recusa a subir em produção** com segredo fraco/curto — é de
  propósito. Nunca reutilize os exemplos.
- **RESEND_API_KEY:** em resend.com → API Keys.
- **MAIL_FROM:** só funciona depois de **verificar seu domínio** no Resend (resend.com/domains).
  Enquanto não verificar, o e-mail só chega no dono da conta.
- **MERCADOPAGO_ACCESS_TOKEN / PUBLIC_KEY:** no painel do Mercado Pago → Suas integrações → sua
  aplicação → **Credenciais de produção**. ⚠️ Comece com as de **teste** (`TEST-`) para validar,
  e só troque para produção quando for cobrar de verdade.
- **MERCADOPAGO_WEBHOOK_SECRET:** no Mercado Pago, ao configurar o webhook (passo 3.9), ele te dá
  a assinatura secreta. Sem ela, em produção o webhook é **recusado** (proteção contra fraude).
- **S3_\*  (Cloudflare R2):** é onde ficam as imagens que o dono sobe (logo, capa, fotos). ⚠️ Se
  você **não** definir, os uploads caem no **disco do container**, que é **efêmero**: some no
  próximo `up --build` e não é compartilhado quando você tiver mais de uma réplica. Como você já
  usa R2, pegue no painel da Cloudflare → **R2** → seu bucket → **Manage R2 API Tokens**:
  `S3_ENDPOINT` é `https://<ID_da_conta>.r2.cloudflarestorage.com`, `S3_BUCKET` é o nome do bucket,
  e o token gera `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`. Deixe `S3_REGION=auto`. As imagens são
  servidas pela própria API (`/api/upload/files/...`), então não precisa de URL pública/CDN aqui.

Salve com `Ctrl+O`, `Enter`, `Ctrl+X`.

> ⚠️ **Segurança:** o `.env` nunca vai para o Git (já está no `.gitignore`). Os segredos JWT que
> hoje aparecem no `docker-compose.yml` são só para o ambiente local — em produção, quem manda é
> o `.env`. Se quiser, troque os valores fixos do compose por `${JWT_ACCESS_SECRET}` também.

### 3.6. Ligar o HTTPS com o Caddy (a parte fácil que muita gente complica)
O `nginx` do projeto serve HTTP (porta 80). Para produção você precisa de **HTTPS** (o Mercado
Pago exige, e é o certo). O jeito mais simples é o **Caddy**, que pega o certificado do Let's
Encrypt **sozinho**. Crie um arquivo `Caddyfile` na raiz:

```bash
nano Caddyfile
```

```
seunegocio.com.br, www.seunegocio.com.br {
    encode gzip
    handle /api/* {
        reverse_proxy api:3001
    }
    handle {
        reverse_proxy web:3000
    }
}
```

E crie um `docker-compose.override.yml` (o Compose junta ele com o principal automaticamente) para
**substituir o nginx pelo Caddy**:

```bash
nano docker-compose.override.yml
```

```yaml
services:
  # Desliga o nginx (o Caddy assume a porta de entrada)
  nginx:
    profiles: ["disabled"]

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    depends_on: [api, web]
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config

volumes:
  caddy_data:
  caddy_config:
```

> O `handle /api/*` remove o `/api` e manda para a API igual ao nginx do projeto. Se você mantiver
> o nginx no lugar do Caddy, use o `nginx/default.conf` que já existe e coloque o Cloudflare na
> frente para o HTTPS (alternativa da seção 6).

### 3.7. Subir tudo
```bash
docker compose up -d --build
```

A primeira vez demora (baixa imagens e compila). Acompanhe com:

```bash
docker compose ps
docker compose logs -f api
```

### 3.8. Criar as tabelas do banco (migrations) ⚠️
O banco sobe **vazio**. Rode as migrations uma vez:

```bash
docker compose exec api pnpm --filter @agenda/database exec prisma migrate deploy
```

> Isso cria todas as tabelas a partir das migrations versionadas. Não use `migrate dev` nem
> `db push` em produção — só `migrate deploy`.

Confira a saúde:

```bash
curl -s https://seunegocio.com.br/api/health/ready
# esperado: {"status":"ok","checks":{"mysql":"ok","redis":"ok"}}
```

Abra `https://seunegocio.com.br` no navegador. Deve carregar a landing com o cadeado de HTTPS.

### 3.9. Configurar o webhook do Mercado Pago
No painel do Mercado Pago → sua aplicação → **Webhooks**, aponte para:

```
https://seunegocio.com.br/api/webhooks/mercadopago
```

Selecione os eventos de **pagamento** e **assinatura (preapproval)**. Copie a **assinatura
secreta** que ele mostrar e coloque em `MERCADOPAGO_WEBHOOK_SECRET` no `.env`; depois rode
`docker compose up -d` de novo para aplicar.

### 3.10. Primeiro acesso
Abra o site, clique em **Criar conta**, confirme o e-mail (chega pelo Resend) e siga o onboarding.
Pronto — você é o primeiro tenant.

---

## 4. Rotina do dia a dia

**Atualizar para uma versão nova do código:**
```bash
cd agender
git pull
docker compose up -d --build
# se a atualização tiver mudança de banco:
docker compose exec api pnpm --filter @agenda/database exec prisma migrate deploy
```

**Ver logs:**
```bash
docker compose logs -f api      # ou web, worker
```

**Reiniciar uma peça:**
```bash
docker compose restart api
```

**Backup do banco (faça isso todo dia — veja `docs/backup.md`):**
```bash
MYSQL_CONTAINER=agender-mysql-1 ./scripts/backup-db.sh
```
⚠️ Guarde os backups **fora do servidor** (ex.: copie para um bucket R2/S3 ou para sua máquina com
`scp`). Um servidor pode morrer; backup no mesmo servidor não é backup.

---

## 5. Checklist de segurança (antes de convidar gente)
- [ ] `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` são valores aleatórios longos (não os exemplos).
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` preenchido (senão, em produção o webhook é recusado — correto).
- [ ] HTTPS funcionando (cadeado no navegador).
- [ ] Firewall: só 22 (SSH), 80 e 443 abertos. Na Hetzner/DO isso é um toggle no painel.
- [ ] Trocar a senha do MySQL (`agenda`/`agenda`) por uma forte no `docker-compose.yml`
      e no `DATABASE_URL` **antes** do primeiro `up` (depois de criado o volume, mudar dá trabalho).
- [ ] `ONLINE_PAYMENTS_ENABLED=false` enquanto o repasse ao lojista (split) não estiver plugado.
- [ ] Backups automáticos rodando e testados (tente restaurar um).

---

## 6. Quando crescer: como escalar (sem reescrever)

Faça **na ordem**, só quando sentir necessidade (o VPS único aguenta o beta e bem mais):

1. **Subir o VPS** (mais RAM/CPU) — resolve 90% dos casos. Um clique no painel.
2. **Banco gerenciado:** troque o container `mysql` por um MySQL gerenciado (PlanetScale, Aiven,
   RDS, DigitalOcean Managed MySQL). Só muda o `DATABASE_URL`. Ganha backup automático e réplica.
3. **Redis gerenciado:** idem (Upstash é barato e tem plano grátis). Muda só `REDIS_URL`.
4. **Mais réplicas de `api` e `web`:** como são stateless, é `docker compose up -d --scale api=3
   --scale web=2` (com o Caddy/nginx balanceando). O `worker` continua **1 só**.
5. **Uploads em object storage:** já vem pronto — se você preencheu as `S3_*` (seção 3.5), as
   imagens já vão para o R2/S3, então dá para ter várias réplicas sem perder arquivo. (Se pulou,
   é só preencher e rodar `docker compose up -d`.)
6. **CDN na frente:** Cloudflare (plano grátis) na frente do domínio dá cache, HTTPS e proteção
   contra ataque. Modo SSL **Full (strict)**.
7. **Observabilidade:** ligue o Sentry (DSN por env) para ver erros em produção.

### Custo aproximado por estágio
| Estágio | Setup | Custo/mês |
|---|---|---|
| Beta | 1 VPS (tudo junto) | ~R$ 30–60 |
| Crescendo | VPS + MySQL/Redis gerenciados | ~R$ 150–300 |
| Escala | 2+ VPS/réplicas + banco gerenciado + R2 + Cloudflare | conforme uso |

---

## 7. Alternativa ainda mais simples (PaaS), se você não quer mexer em servidor
Se administrar um VPS assustar, dá para usar **Railway** ou **Render**: você conecta o repositório,
cria um serviço para `api`, um para `web`, um para `worker`, e adiciona **MySQL** e **Redis**
gerenciados pelo próprio painel. Fica mais caro que o VPS, mas você não mexe em SSH nem em HTTPS
(eles cuidam). As mesmas variáveis do `.env` (seção 3.5) vão nas configurações de cada serviço.
Comece por aqui se o objetivo é ir ao ar rápido; migre para o VPS quando quiser cortar custo.
