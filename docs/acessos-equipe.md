# Acessos da Equipe

> **Este documento estende `01-fundacao.md`.** Não é uma fase de produto nova — é uma capacidade de
> autenticação que ficou em aberto: a Fundação especificou a criação do `owner` no cadastro do
> negócio, mas nunca **como o restante da equipe** (atendente, barbeiro, etc.) recebe acesso.
> Leia `00-contexto-geral.md` e `01-fundacao.md` antes deste.
>
> Trate como parte da Fundação: implemente **independentemente da fase de produto em andamento**,
> pois toda fase depois do MVP assume que profissionais e recepção já conseguem logar.

---

## Objetivo

Permitir que `owner`/`admin` **convidem** membros da equipe (definindo papel e, se for o caso,
vinculando a um `Professional` já cadastrado), e **revoguem o acesso** de alguém que saiu, sem
apagar histórico de agendamentos.

---

## Escopo

**Dentro:**
- Convite por e-mail (owner/admin convida; a pessoa define a própria senha ao aceitar).
- Vínculo opcional `User ↔ Professional` (o barbeiro loga e vê a própria agenda).
- Gestão de papel (`admin`, `professional`, `receptionist`).
- Desativação e reativação de acesso (soft — sem apagar dado histórico).
- **Invalidação imediata de sessão** ao desativar (não esperar o token expirar sozinho).
- Reset de senha (esqueci minha senha).
- Tela "Equipe" no admin.

**Fora:**
- SSO / 2FA (avaliar na fase de Hardening, se necessário).
- Múltiplas lojas por usuário (Monetização — multi-unidade).
- Transferência de dono (`owner`) — não coberto aqui; negócio segue com o `owner` original.

---

## Regras de papel (retomando a tabela do contexto geral)

| Papel | Pode convidar/gerenciar equipe? | Precisa de vínculo com `Professional`? |
|---|---|---|
| `owner` | Sim | Não (é o dono, não um recurso agendável por padrão). |
| `admin` | Sim | Não. |
| `professional` | Não | Sim — sem vínculo, não haveria agenda própria pra ver. |
| `receptionist` | Não | Não. |

- Apenas `owner`/`admin` acessam as rotas de equipe; `professional`/`receptionist` recebem 403.
- **Não é possível convidar outro `owner`** por este fluxo — cada negócio tem um único `owner` (o
  que fez o cadastro inicial). Convites são sempre para `admin`, `professional` ou `receptionist`.
- Não é possível desativar o próprio `owner`, nem deixar o negócio sem nenhum `admin`/`owner` ativo
  (a última conta com poder de gestão não pode ser desativada).

---

## Prisma — mudanças

### `User` (adicionar campos)

```prisma
// adicionar em User:
active       Boolean @default(true)   // soft revoke: bloqueia login sem apagar histórico
tokenVersion Int     @default(0)      // incrementado ao desativar/trocar senha → invalida sessões antigas
```

### `StaffInvite` (nova)

```prisma
model StaffInvite {
  id             String    @id @default(cuid())
  businessId     String
  email          String
  role           Role                  // admin | professional | receptionist (nunca owner)
  professionalId String?               // preenchido quando role = professional
  tokenHash      String                // hash do token enviado por e-mail; nunca armazenar em claro
  expiresAt      DateTime              // curto, ex.: 48h
  acceptedAt     DateTime?
  invitedByUserId String
  createdAt      DateTime  @default(now())

  @@index([businessId])
  @@index([businessId, email])
}
```

### `PasswordResetToken` (nova)

```prisma
model PasswordResetToken {
  id         String    @id @default(cuid())
  userId     String
  tokenHash  String
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime  @default(now())

  @@index([userId])
}
```

---

## Invalidação imediata de sessão (peça crítica)

A Fundação usa access token curto + refresh token, mas nada impedia uma sessão desativada de
continuar válida até o access expirar sozinho (minutos). Para revogar **na hora**:

1. O JWT (access e refresh) passa a carregar a claim `tokenVersion` junto com `sub`/`businessId`/`role`.
2. `JwtAuthGuard` compara a `tokenVersion` do token com a atual do `User` no banco. **Diferente → 401**,
   mesmo com token ainda dentro da validade.
3. Ações que devem invalidar sessões existentes **incrementam `tokenVersion`**: desativar o usuário,
   trocar a senha (própria ou via reset), remover o vínculo com `Professional`.

Isso é o que garante que desativar alguém corte o acesso de imediato, e não só bloqueie logins futuros.

---

## Fluxo de convite

1. `POST /staff/invites` (admin/owner) — `email`, `role`, `professionalId?` (obrigatório se
   `role = professional`, e o profissional não pode já estar vinculado a outro `User` ativo).
   - Rejeita se já existir `User` ativo com esse e-mail no negócio.
   - Gera token aleatório, guarda o **hash**, define `expiresAt` (48h), envia e-mail com o link de
     aceite via o worker de notificação (reaproveita a infraestrutura da Fase 4 — Retenção).
   - O e-mail usa linguagem simples: nome do negócio e o papel em português claro, nunca "role: admin".

2. `GET /staff/invites` (admin/owner) — lista convites pendentes (e-mail, papel, expiração).

3. `POST /staff/invites/:token/accept` — rota pública autenticada **pelo token do convite**, não por
   sessão de tenant. Corpo: `name`, `password`. Valida token não expirado e não aceito; cria o `User`
   (papel e vínculo vindos do convite), marca `acceptedAt`, e retorna tokens de sessão já autenticado.

4. `DELETE /staff/invites/:id` (admin/owner) — revoga convite pendente (não afeta usuário já criado).

5. Reenvio: gerar novo convite invalida o token anterior (não reaproveitar hash).

---

## Gestão da equipe

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| `GET` | `/staff` | admin/owner | Lista usuários do negócio: nome, e-mail, papel, status (ativo/convidado/inativo), profissional vinculado. |
| `PATCH` | `/staff/:userId` | admin/owner | Altera papel e/ou vínculo com `Professional`. |
| `PATCH` | `/staff/:userId/deactivate` | admin/owner | Desativa (soft) e incrementa `tokenVersion`. |
| `PATCH` | `/staff/:userId/reactivate` | admin/owner | Reativa o acesso. |
| `POST` | `/auth/password-reset/start` | público | Envia e-mail de redefinição de senha. |
| `POST` | `/auth/password-reset/confirm` | público (token) | Define nova senha; incrementa `tokenVersion`. |

Regra: `PATCH /staff/:userId/deactivate` recusa (400/409) se o alvo for o único `owner`/`admin`
ativo do negócio.

---

## UI

**Tela "Equipe" (admin, segue `estilo-admin.md`):** tabela com nome, e-mail, badge de papel, badge
de status (ativo/convidado/inativo — cores conforme a paleta semântica do guia de estilo, não a de
agendamento), profissional vinculado. Ações por linha: reenviar convite, revogar convite, editar
papel, desativar/reativar. Botão "Convidar" abre modal com e-mail + papel + profissional (se aplicável).

**Página de aceite de convite:** tela pública standalone (não é o shell do admin, nem o tema do
tenant da página pública) — formulário centralizado simples, usando os mesmos tokens de cor/tipografia
do `estilo-admin.md`, no padrão de uma tela de login/onboarding.

---

## Critérios de aceite

- [ ] Admin convida um "barbeiro" vinculando a um `Professional`; ele aceita e loga vendo só a própria agenda.
- [ ] Admin convida uma "atendente" (`receptionist`) sem vínculo de profissional.
- [ ] Convite expirado ou já aceito mostra erro claro ao tentar aceitar de novo.
- [ ] Não é possível convidar `owner`, nem duplicar e-mail ativo no mesmo negócio.
- [ ] Desativar um usuário derruba a sessão dele **imediatamente**, mesmo com token ainda válido.
- [ ] Não é possível desativar o único `owner`/`admin` ativo.
- [ ] `professional`/`receptionist` recebem 403 ao tentar acessar rotas de equipe.
- [ ] Reset de senha funciona e também invalida sessões antigas.
- [ ] Vínculo `User ↔ Professional` é 1:1 — não dá pra vincular o mesmo profissional a dois usuários ativos.

---

## Armadilhas específicas

- ❌ Confiar só na expiração do access token para revogar acesso — sem `tokenVersion`, a pessoa
  desativada continua agindo até o token vencer sozinho.
- ❌ Guardar o token de convite/reset em claro no banco — sempre hash.
- ❌ Deixar o negócio sem nenhum `admin`/`owner` ativo capaz de gerenciar a equipe.
- ❌ Vazar termo técnico ("role", "token") no e-mail de convite ou na UI — usar linguagem simples.
- ❌ Permitir vínculo duplicado de `Professional` a mais de um `User` ativo.
- ❌ Convite/reset sem expiração curta — vira uma porta aberta indefinidamente.
