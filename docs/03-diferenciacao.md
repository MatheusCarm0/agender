# Fase 3 — Diferenciação

> Pré-requisitos de leitura: `00-contexto-geral.md`, `01-fundacao.md`, `02-mvp.md`. Assume o MVP
> pronto (agendamento anti-conflito, disponibilidade, página pública básica, agenda no admin).

---

## Objetivo

Transformar o produto funcional em um produto **vendável**: uma página pública bonita e
personalizável por negócio (o "Linktree"), visão financeira dos agendamentos, gestão de clientes
e controle avançado de fechamento de agenda.

---

## Escopo e relação com o MVP

**Dentro:**
- **Personalização da página pública** — modelo `pageCustomization` + editor no admin + aplicação na
  página do cliente. (No MVP a página tinha tema neutro fixo; aqui ela vira personalizável.)
- **Módulo financeiro** — relatórios de faturamento, status de pagamento manual, comissão por profissional.
- **Gestão de clientes (CRM leve)** — no MVP o `client` era criado automaticamente no agendamento;
  aqui ganha tela de listagem, busca, histórico e edição.
- **Fechar agenda avançado** — no MVP havia bloqueio pontual (`scheduleBlock`); aqui entram bloqueios
  recorrentes (almoço, folga semanal) e fechamento de dia/negócio inteiro com facilidade.

**Fora (fases seguintes):**
- Notificações/lembretes (Fase 4).
- Pagamento online / PIX (Fase 5) — aqui o pagamento é **registrado manualmente**, não processado.

> **Importante:** a página pública **não** segue o `estilo-admin.md`. Ela tem seu próprio sistema de
> temas, definido nesta fase. O `estilo-admin.md` continua valendo para todo o painel (editor incluso).

---

## Prisma — mudanças desta fase

```prisma
model PageCustomization {
  businessId String  @id
  theme      Json    // ver "shape do tema" abaixo
  links      Json    @default("[]") // [{ label, url, icon }]
  socials    Json    @default("{}") // { instagram, whatsapp, facebook, tiktok }
  headline   String?
  about      String? @db.Text
  updatedAt  DateTime @updatedAt
}

model RecurringBlock {
  id             String  @id @default(cuid())
  businessId     String
  professionalId String? // nulo = negócio inteiro
  weekday        Int     // 0..6
  startTime      String  // "12:00" hora local
  endTime        String  // "13:00"
  reason         String?

  @@index([businessId])
  @@index([professionalId, weekday])
}
```

Acréscimos a modelos existentes:

```prisma
// Professional
enum CommissionType { none percent fixed }
// + commissionType   CommissionType @default(none)
// + commissionValue  Decimal        @default(0) @db.Decimal(10, 2)

// Appointment
// + paymentMethod String?   // "cash" | "pix" | "card"  (registro manual)
// + paidAt        DateTime?
```

---

## Personalização da página pública (o carro-chefe)

Sistema de tema **curado**: o dono escolhe dentro de opções seguras, para nenhuma página ficar ilegível.

### Shape do tema (`pageCustomization.theme`)

```ts
{
  palette: 'ocean' | 'sand' | 'forest' | 'mono' | 'custom',
  colors:  { background: string; surface: string; primary: string; text: string },
  font:    'inter' | 'poppins' | 'playfair' | 'dmSans',   // presets curados
  background: { type: 'solid' | 'gradient' | 'image'; value: string },
  logoUrl?:  string,
  coverUrl?: string,
  buttonStyle: 'rounded' | 'pill' | 'square',
  layout: 'list' | 'cards',
}
```

Regras:
- Oferecer **paletas prontas** (presets) como caminho principal; `custom` é avançado e **valida
  contraste mínimo** (texto vs. fundo AA) antes de salvar — página ilegível é bug.
- Fontes são um conjunto curado (não campo livre), carregadas via `next/font`.
- Upload de logo/capa: validar tipo e tamanho; servir por URL (storage a definir; pode ser local no MVP desta fase).

### Editor (no admin — segue `estilo-admin.md`)
- Formulário com **preview ao vivo** da página do cliente ao lado.
- Seções: identidade (logo, capa, headline, sobre), tema (paleta, fonte, fundo, botões, layout),
  links extras (Linktree: label + url + ícone, reordenáveis), redes sociais.
- Botão "Salvar alterações" → toast "Alterações salvas". Alteração publica direto (sem rascunho nesta fase).

### Aplicação na página pública (Next.js)
- A rota `app/[slug]` lê `pageCustomization` no SSR e injeta as cores/fonte via CSS variables.
- Renderiza: capa + logo + headline + sobre + botão de agendar (fluxo do MVP) + links extras + redes.
- Manter performático (ISR + revalidação ao salvar personalização).

---

## Módulo financeiro

Cada agendamento é um evento de receita. Nada de gateway aqui — pagamento é **registro manual**.

### Conceitos
- **Faturamento realizado:** soma de `price` de agendamentos `completed` no período.
- **Faturamento previsto:** soma de `scheduled` + `confirmed` no período.
- **Comissão do profissional:** conforme `commissionType`/`commissionValue`
  (`percent` = % do price; `fixed` = valor por atendimento concluído).

### Endpoints
| Método | Rota | Papel | Descrição |
|---|---|---|---|
| `GET` | `/reports/revenue` | owner/admin | Faturamento por período; filtros `from`, `to`, `professionalId`, `serviceId`. Retorna realizado, previsto e quebra por profissional/serviço. |
| `GET` | `/reports/earnings` | owner/admin/professional | Ganhos/comissão. `professional` vê **só os próprios**. |
| `PATCH` | `/appointments/:id/payment` | admin/recep | Registra pagamento: `paymentStatus`, `paymentMethod`, `paidAt`. |

### UI (admin)
- **Dashboard financeiro:** cartões de resumo (realizado, previsto, ticket médio, nº de atendimentos)
  + gráfico simples por período + tabela por profissional. Números sempre em `mono` `tabular-nums`.
- **Escopo por papel:** `professional` vê só o próprio ganho; `owner/admin` veem tudo.

---

## Gestão de clientes (CRM leve)

Eleva o `client` que o MVP já criava no agendamento.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/clients` | Lista com busca por nome/telefone (paginada). |
| `GET` | `/clients/:id` | Detalhe + histórico de agendamentos do cliente. |
| `PATCH` | `/clients/:id` | Editar nome, telefone, e-mail, notas. |

UI: listagem densa (tabela do `estilo-admin.md`), busca no topo, drawer de detalhe com histórico e notas.

---

## Fechar agenda avançado

- **Bloqueio recorrente** (`RecurringBlock`): almoço, folga semanal — por profissional ou negócio inteiro.
- **Fechamento pontual e por intervalo** (já via `scheduleBlock`): feriado, férias, dia fechado.
- **Impacto obrigatório na disponibilidade:** o `AvailabilityService` do MVP passa a subtrair também os
  `RecurringBlock` aplicáveis ao `weekday`. Atualizar os testes de disponibilidade para cobrir isso.
- UI: no calendário do admin, ação "Fechar agenda" (pontual ou recorrente) com o profissional no contexto.

---

## Critérios de aceite

- [x] Dono personaliza a página (paleta, fonte, fundo, logo, links) e vê o resultado na página pública.
- [x] Tema `custom` com contraste insuficiente é rejeitado ao salvar.
- [x] Página pública renderiza o tema via SSR e revalida ao salvar.
- [x] `/reports/revenue` retorna realizado e previsto corretos, com filtros funcionando.
- [x] Comissão calculada conforme o tipo configurado no profissional.
- [x] `professional` só enxerga os próprios ganhos; `owner/admin` veem tudo.
- [x] Registro manual de pagamento atualiza status/método/data.
- [x] Lista/busca/detalhe/edição de clientes funcionam, com histórico por cliente.
- [x] Bloqueio recorrente reflete corretamente na disponibilidade (teste cobrindo `RecurringBlock`).
- [x] Toda UI nova segue o `estilo-admin.md`.

---

## Armadilhas específicas desta fase

- Não deixar o `custom` de tema gerar página ilegível — validar contraste sempre.
- Não recalcular preço/receita a partir do serviço: usar o `price` congelado no agendamento (regra do MVP).
- Não esquecer de incluir `RecurringBlock` no cálculo de disponibilidade **e** invalidar o cache ao alterá-lo.
- Financeiro respeita o escopo por papel — vazar ganho de um profissional para outro é bug.
- Pagamento aqui é só registro manual; não introduzir gateway (isso é a Fase 5).
- Página pública não deve herdar tokens do `estilo-admin.md` — são sistemas visuais separados.
