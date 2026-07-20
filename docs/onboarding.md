# Onboarding

> **Documento de referência transversal.** Não é uma fase de produto nova — é a **experiência guiada**
> que amarra passos já especificados em outros documentos (cadastro da `01-fundacao.md`, upload de
> logo da `03-diferenciacao.md`, serviços/horários do `02-mvp.md`, convite de equipe do
> `acessos-equipe.md`) numa sequência coerente de primeiro uso.
>
> Leia `00-contexto-geral.md`, `01-fundacao.md`, `02-mvp.md`, `03-diferenciacao.md` e
> `acessos-equipe.md` antes deste — aqui não se redefine nenhum endpoint já especificado, só a
> **orquestração** deles.

---

## Objetivo

Levar quem acabou de se cadastrar de "conta criada" a "página pública funcional" no menor número
de decisões possível, sem nunca travar a pessoa numa etapa. Depois do **cadastro** (obrigatório),
o próximo passo é o **upload da logo** — conforme pedido — seguido de primeiro serviço, horários e
convite de equipe, todos puláveis.

---

## Princípio central: nada bloqueia o acesso ao painel

Só o **passo 1 (cadastro)** é obrigatório. Todo passo seguinte tem um botão **"Pular por agora"**.
Quem pula chega ao painel normalmente; o sistema apenas **lembra do que falta** através de um
checklist na tela inicial, sem impedir nenhuma ação. Ninguém deveria ficar preso numa tela de
upload de logo para conseguir agendar um cliente.

---

## Os sete passos

| # | Passo | Pulável? | Endpoint reaproveitado |
|---|---|---|---|
| 1 | Cadastro (negócio + dono) | Não | `POST /auth/register-business` (`01-fundacao.md`) |
| 2 | Upload da logo | Sim | `POST /customization/assets` + `PUT /customization` (`03-diferenciacao.md`) |
| 3 | Primeiro serviço | Sim | `POST /services` (`02-mvp.md`) |
| 4 | Horários de trabalho | Sim | `POST /working-hours` (`02-mvp.md`) |
| 5 | Convidar equipe | Sim | `POST /staff/invites` (`acessos-equipe.md`) |
| 6 | Link pronto (mostrar a página pública) | — (informativo) | `GET /public/v1/{slug}` |
| 7 | Painel com checklist do que falta | — (destino final) | `GET /onboarding/status` (novo, abaixo) |

Nenhum passo 2–5 cria endpoint novo — cada um é uma **tela do wizard chamando o endpoint que já
existe** na fase correspondente. O que esta fase acrescenta é só o **estado de progresso** e os
dois endpoints que o sustentam.

---

## Passo 1 — Cadastro

Formulário: nome do negócio, nome do dono, e-mail, senha. Ao enviar, chama
`POST /auth/register-business` (já especificado na Fundação), que cria `business` + `user` owner
e retorna os tokens. A pessoa já está autenticada ao sair desta tela — os passos seguintes rodam
**dentro** do painel (autenticado), não numa área pública.

Esta é a única tela do wizard que **não** segue `estilo-admin.md` integralmente — é a tela de
entrada do produto, antes de haver "negócio" para estilizar. Usa os mesmos tokens de cor/tipografia,
mas em layout centralizado simples (como a página de aceite de convite).

---

## Passo 2 — Upload da logo

Logo em seguida ao cadastro, exatamente como pedido. Tela simples: área de upload (arrastar ou
selecionar arquivo), preview imediato, botão "Continuar" e "Pular por agora".

- Reaproveita `POST /customization/assets` (já especificado na Diferenciação): valida tipo real do
  arquivo (magic bytes), tamanho máximo, grava em object storage, retorna URL.
- Ao confirmar, `PUT /customization` grava `logoUrl` em `PageCustomization`.
- **Não** pede cor de tema, fundo ou capa aqui — isso é o editor completo de personalização
  (já existente), acessível depois a qualquer momento em Configurações. O onboarding pega só o
  essencial (a logo) para não sobrecarregar o primeiro contato.

---

## Passo 3 — Primeiro serviço

Formulário mínimo: nome, duração (min), preço. Usa `POST /services` (MVP). Sem buffers nem vínculo
de profissional aqui — são detalhes do CRUD completo de serviços, editável depois.

## Passo 4 — Horários de trabalho

Oferece um **padrão sugerido** (ex.: segunda a sexta, 09:00–18:00) pré-preenchido, editável antes de
salvar, aplicado ao profissional recém-criado automaticamente (ver "Vínculo do dono" abaixo). Usa
`POST /working-hours` (MVP).

## Passo 5 — Convidar equipe

Campo opcional de e-mail + papel (reaproveita `POST /staff/invites` de `acessos-equipe.md`). Permite
adicionar mais de um convite antes de continuar, ou pular inteiramente.

## Passo 6 — Link pronto

Tela informativa: mostra a URL da página pública (`app.com/{slug}`), com botão de copiar e QR code.
Sem ação de formulário — é o momento de "pronto, é isso que o cliente vai ver".

## Passo 7 — Painel

Destino final do wizard. Se algum passo 2–5 foi pulado, o painel mostra um **checklist de
onboarding** (ver seção UI) até que a pessoa complete ou dispense cada item.

---

## Vínculo do dono como profissional (decisão)

Muitos negócios pequenos (o próprio Juninho da barbearia) são ao mesmo tempo dono e profissional
que atende. Para não forçar dois cadastros: ao concluir o passo 1, criar automaticamente um
`Professional` vinculado ao `owner` (mesmo nome), que os passos 3–4 já populam por padrão. Na tela
de Equipe (passo 5 em diante, ou depois em Configurações), o dono pode desvincular esse profissional
se ele mesmo não atender, ou adicionar profissionais adicionais normalmente.

---

## Estado de progresso (Prisma)

```prisma
// adicionar em Business:
onboardingStep         Int      @default(1)    // último passo alcançado (1–7)
onboardingCompletedAt  DateTime?               // preenchido quando todos os passos foram concluídos ou dispensados
onboardingSkipped      Json     @default("[]") // ex.: ["logo","team"] — passos pulados, para o checklist lembrar
```

Progresso é **retomável**: se a pessoa fechar o navegador no meio, o próximo login volta para
`onboardingStep`. Passo pulado não é "perdido" — vira item do checklist até ser feito ou dispensado
manualmente (dispensar é diferente de pular: dispensar tira do checklist para sempre).

---

## Endpoints novos

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/onboarding/status` | Retorna `onboardingStep`, `onboardingCompletedAt`, itens pendentes do checklist. |
| `PATCH` | `/onboarding/step` | Avança/pula um passo (`{ step, action: 'complete' \| 'skip' }`). |
| `PATCH` | `/onboarding/dismiss` | Remove um item específico do checklist permanentemente (`{ item }`). |

Os passos 2–5 em si **não ganham endpoint próprio** — continuam usando os endpoints das fases
correspondentes; `PATCH /onboarding/step` só é chamado depois, para registrar avanço/pulo.

---

## UI

**Wizard (passos 1–6):** segue `estilo-admin.md` (exceto o passo 1, ver acima). Indicador de
progresso no topo (pontos ou barra, 6 posições após o cadastro). Botões "Pular por agora" (ghost) e
"Continuar" (primário) em todo passo pulável, alinhados ao rodapé.

**Checklist no painel (passo 7 em diante):** card no topo do dashboard, visível enquanto
`onboardingCompletedAt` for nulo e houver item pendente. Lista os passos pulados com um link direto
para completá-los (ex.: "Adicione sua logo" → abre o editor de personalização já existente) e um
"x" para dispensar individualmente. Card some sozinho quando todos os itens forem completados ou
dispensados.

---

## Critérios de aceite

- [ ] Cadastro cria negócio + dono e autentica automaticamente para o wizard.
- [ ] Upload de logo é o passo imediatamente seguinte ao cadastro.
- [ ] Todo passo 2–5 tem opção clara de pular sem bloquear o avanço.
- [ ] Fechar o navegador no meio do wizard e logar de novo retoma no passo certo.
- [ ] Dono vira `Professional` automaticamente ao final do passo 1; pode desvincular depois.
- [ ] Passo 6 mostra a URL pública correta e permite copiar.
- [ ] Painel mostra checklist apenas dos itens pulados, com link direto para cada um.
- [ ] Dispensar um item do checklist remove-o permanentemente (não reaparece no próximo login).
- [ ] Onboarding completo (todos os passos feitos ou dispensados) faz o card de checklist sumir.

---

## Armadilhas específicas

- ❌ Tornar qualquer passo 2–5 obrigatório — trava gente que só quer testar rápido.
- ❌ Criar endpoint exclusivo de onboarding para lógica que já existe (serviço, horário, convite,
  upload) — o wizard **chama** os endpoints das fases, não duplica.
- ❌ Perder o progresso ao fechar o navegador — sempre persistir e retomar pelo `onboardingStep`.
- ❌ Confundir "pular" com "dispensar" — pular deixa no checklist; dispensar remove de vez.
- ❌ Esquecer de vincular o dono como `Professional` — sem isso, o passo 4 (horários) não tem
  ninguém para aplicar o padrão sugerido.
