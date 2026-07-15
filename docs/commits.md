# Padrão de Commits

> Documento de referência transversal. O Claude Code deve seguir estas regras em **todo** commit.
> **Regra crítica: sempre apresentar a mensagem e obter aprovação explícita do usuário antes de
> commitar.** (Reforçada no `CLAUDE.md` da raiz.)

---

## Princípios

- **Commit por evento importante (marco)**, não por micro-mudança. Cada commit representa um passo
  concluído e coerente: scaffold inicial, uma configuração completa, a criação de uma página, um
  endpoint pronto, etc.
- **Mensagem curta, clara, em inglês, no imperativo.** Uma linha só. **Sem corpo, sem descrição longa.**
- **Nenhuma menção a IA** em qualquer parte do commit: sem `Co-authored-by`, sem "generated with",
  sem emoji de robô, sem nota de geração automática, sem trailer nenhum.
- Sem informação supérflua. A mensagem descreve o que mudou, nada mais.

---

## Formato

```
type(scope): short description
```

- Imperativo, minúsculo, **sem ponto final**. Alvo ~50 caracteres (máximo 72).
- `scope` é opcional, mas recomendado: a área ou módulo afetado (`api`, `web`, `admin`, `db`,
  `auth`, `scheduling`, etc.).
- **Uma linha apenas. Sem corpo.**

---

## Tipos

| Tipo | Uso |
|---|---|
| `feat` | Nova funcionalidade. |
| `fix` | Correção de bug. |
| `refactor` | Mudança de código sem alterar comportamento. |
| `chore` | Manutenção sem impacto em runtime (deps, scaffolding, ajustes de projeto). |
| `build` | Build, Docker, empacotamento. |
| `ci` | Pipeline de integração contínua. |
| `docs` | Documentação. |
| `test` | Testes. |
| `perf` | Performance. |
| `style` | Formatação de código (lint/prettier), sem mudança de lógica. |

"Configuração" cai em `chore`, `build` ou `ci` conforme a natureza.

---

## Eventos típicos → exemplo de mensagem

| Evento | Commit |
|---|---|
| Criação inicial do projeto | `chore: scaffold monorepo structure` |
| Configuração de banco/ORM | `chore: configure prisma with mysql` |
| Docker | `build: add docker compose setup` |
| Lint/format | `chore: setup eslint and prettier` |
| CI | `ci: add github actions pipeline` |
| Schema base | `feat(db): add base business and user models` |
| Autenticação | `feat(auth): add jwt login and refresh` |
| Isolamento de tenant | `feat(api): add tenant scoping to prisma client` |
| Endpoint de agendamento | `feat(scheduling): add booking endpoint with locking` |
| Uma página nova | `feat(web): add public booking page` |
| Tela do admin | `feat(admin): add appointments agenda view` |
| Correção de conflito | `fix(scheduling): prevent double booking on concurrent requests` |
| Documentação de fase | `docs: add foundation phase spec` |

---

## Granularidade (quando commitar)

- Ao concluir um **marco coeso**: uma tela, um módulo, uma configuração completa, um endpoint funcional.
- **Um evento = um commit.** Se o marco tocou várias áreas mas é um passo lógico único, faça um commit
  só com um scope abrangente.
- Não commitar trabalho pela metade que quebre o build.
- Não agrupar mudanças não relacionadas em um commit "misc".

---

## Regra de consulta (crítica)

Antes de **cada** commit:

1. **Pare.** Apresente ao usuário a mensagem (ou as mensagens) de commit propostas e o que entra em cada uma.
2. **Aguarde aprovação explícita.**
3. Só então rode `git commit`.

Nunca rodar `git push` sem aprovação explícita do usuário.

---

## O que NUNCA fazer

- ❌ Corpo ou descrição longa no commit.
- ❌ Qualquer menção a IA/assistente: `Co-authored-by`, "generated with", "🤖", trailers automáticos.
- ❌ Mensagem em português.
- ❌ Ponto final ou Title Case na descrição.
- ❌ Commitar sem apresentar a mensagem e obter aprovação antes.
- ❌ `git push` sem aprovação explícita.
- ❌ Agrupar mudanças não relacionadas em um único commit.
