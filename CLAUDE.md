# CLAUDE.md — SaaS de Agendamento (codinome: Agenda)

Este é o arquivo que você (Claude Code) carrega automaticamente. Ele **não** contém as regras em si —
ele te diz **qual documento ler** para cada situação. A documentação vive em `docs/`.

---

## Passo 1 — Sempre comece aqui

Antes de qualquer tarefa, leia `docs/00-contexto-geral.md`. É a fonte de verdade sobre o produto,
a stack, o glossário de domínio, as decisões técnicas firmes e as armadilhas. Nada do que você
fizer pode contradizer esse arquivo.

---

## Passo 2 — Descubra em que ponto o sistema está

1. Leia a seção **Estado atual** abaixo (mantida manualmente e atualizada ao fim de cada tarefa).
2. **Confirme contra o código real:** o que já existe em `apps/`, o `packages/database/schema.prisma`,
   as migrations aplicadas e os critérios de aceite já marcados no doc da fase. Se o código e o
   "Estado atual" divergirem, o código manda — e você corrige a seção depois.
3. Abra o documento da fase correspondente (tabela de roteamento) e trabalhe dentro do escopo dele.

### Estado atual

```
Fase atual: Retenção — NÃO INICIADA
Próximo documento: docs/04-retencao.md
```

> Ao concluir uma fase (todos os critérios de aceite marcados), atualize estas duas linhas para a
> próxima fase antes de encerrar a tarefa.

### Roteamento estado → documento

| Se o sistema está… | Leia e trabalhe em |
|---|---|
| Sem repo / fundação não iniciada ou em andamento | `docs/01-fundacao.md` |
| Fundação pronta; construindo o núcleo de agendamento | `docs/02-mvp.md` |
| MVP pronto; personalização + financeiro | `docs/03-diferenciacao.md` *(a criar)* |
| Diferenciação pronta; notificações, subdomínios, cupons, fidelidade e identidade do cliente (OTP) | `docs/04-retencao.md` |
| Retenção pronta; pagamentos + domínio próprio | `docs/05-monetizacao.md` *(a criar)* |
| Produto validado; escala + observabilidade | `docs/06-hardening.md` *(a criar)* |

Regra de escopo: **não puxe trabalho de uma fase futura** sem instrução explícita. Cada fase entrega
algo utilizável antes de avançar.

---

## Passo 3 — Regra de UI (inviolável)

Antes de **criar ou alterar qualquer interface do painel admin**, leia `docs/estilo-admin.md` e derive
dele **todas** as cores, tipografia, espaçamento, componentes, estados e microcopy. Nenhum valor
visual avulso fora dos tokens definidos lá.

- Vale para tela nova, componente novo ou ajuste em UI existente.
- A **página pública do cliente** é personalizável por tenant e **não** segue o `estilo-admin.md`;
  as regras dela ficam em `docs/03-diferenciacao.md` quando essa fase existir.

---

## Passo 4 — Commits (regra de consulta obrigatória)

Siga o padrão em `docs/commits.md`: commits **por evento importante**, mensagem curta em **inglês**,
uma linha, **sem corpo**, e **sem nenhuma menção a IA** (sem `Co-authored-by`, sem "generated with",
sem trailers automáticos).

**Antes de cada commit, pare e consulte o usuário:**

1. Apresente a mensagem de commit proposta (e o que entra nela).
2. Aguarde **aprovação explícita**.
3. Só então rode `git commit`.

Nunca rode `git push` sem aprovação explícita do usuário. Nunca commite automaticamente ao terminar
uma tarefa — a consulta é sempre obrigatória.

---

## Regras invioláveis (resumo; fonte completa em `00-contexto-geral.md`)

- Isolamento de tenant automático: nenhuma query de dado de tenant sem `business_id`.
- Todo timestamp gravado em UTC; fuso do negócio só nas bordas.
- Agendamento criado sempre com transação + `SELECT … FOR UPDATE` + chave de idempotência.
- Disponibilidade é calculada e cacheada no Redis; invalidar ao criar/cancelar.
- Side-effects (notificação, pagamento) rodam em worker assíncrono, nunca na request HTTP.
- Sem segredo no código; configuração por variável de ambiente.

---

## Convenções rápidas (fonte completa em `00-contexto-geral.md`, seção 8)

- TypeScript `strict` em todo o stack; identificadores em inglês, conceitos pelo glossário.
- NestJS: um módulo por domínio; input validado por DTO.
- Migrations só via `prisma migrate`.
- Testar sempre a lógica de disponibilidade e de conflito de horário (o coração do produto).

---

## Ao concluir uma tarefa

1. Marque os critérios de aceite atendidos no doc da fase.
2. Atualize a seção **Estado atual** deste arquivo se a fase avançou.
3. Não deixe o "Estado atual" divergindo do que o código realmente reflete.
