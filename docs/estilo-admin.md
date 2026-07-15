# Guia de Estilo — Painel Admin

> **Documento de referência transversal.** Não é uma fase. O Claude Code deve **ler este arquivo
> antes de criar ou alterar qualquer UI do painel admin** e derivar dele todas as cores, tipografia,
> espaçamento, componentes e microcopy. Nenhum valor visual avulso fora dos tokens abaixo.
>
> Escopo: **painel administrativo** (dono/admin/profissional/recepção). A **página pública do cliente
> é personalizável por tenant** e segue outro conjunto de regras (definido na Fase 3); este guia
> **não** se aplica a ela.

---

## 1. Personalidade e princípios

O admin é uma ferramenta de trabalho usada todos os dias por quem opera o negócio. A identidade é
**clareza operacional calma**: densa mas respirável, orientada a dados, sóbria, confiável. A pessoa
precisa ver a agenda e o dinheiro num relance e agir rápido.

Princípios:
- **Dado em primeiro lugar.** A tela existe para exibir agendas, listas e números com legibilidade
  máxima. Decoração que não ajuda a ler é cortada.
- **Ousadia em um só lugar.** O acento (teal) é o único ponto de cor forte; o resto é neutro e quieto.
- **Densidade com respiro.** Compacto o suficiente para caber muita informação, espaçado o suficiente
  para não cansar. Alturas de linha e paddings padronizados (seção 2).
- **Estrutura carrega significado.** Divisórias, rótulos e numerais existem quando comunicam algo real
  (um status, uma ordem), nunca como enfeite.
- **Piso de qualidade sempre:** responsivo até mobile, foco de teclado visível, `prefers-reduced-motion`
  respeitado, contraste AA.

Direção estética explícita para o que **evitar** (clichês de dashboard gerado): fundo creme + serifa
display + acento terracota; fundo quase-preto com acento neon; layout tipo jornal com filetes e raio
zero. Nada disso aqui.

---

## 2. Tokens de design (fonte de verdade)

Todo valor visual vem daqui. Implementação em Styled Components via `ThemeProvider` (seção 3); os
mesmos tokens mapeiam para um `tailwind.config` se o time optar por Tailwind.

### Cores — neutros (base warm/"stone")

| Token | Hex | Uso |
|---|---|---|
| `surface.app` | `#FAFAF9` | Fundo da aplicação. |
| `surface.card` | `#FFFFFF` | Painéis, cards, linhas de tabela. |
| `surface.subtle` | `#F5F5F4` | Hover de linha, cabeçalho de tabela, áreas sutis. |
| `border.default` | `#E7E5E4` | Bordas e divisórias padrão. |
| `border.strong` | `#D6D3D1` | Bordas de inputs, hover de borda. |
| `text.strong` | `#1C1917` | Títulos, valores importantes. |
| `text.default` | `#44403C` | Texto corrido. |
| `text.muted` | `#78716C` | Rótulos, texto secundário. |
| `text.subtle` | `#A8A29E` | Placeholder, texto desabilitado. |

### Cores — primária (acento teal)

| Token | Hex | Uso |
|---|---|---|
| `primary.default` | `#0D9488` | Botões primários, links, estado ativo. |
| `primary.hover` | `#0F766E` | Hover. |
| `primary.active` | `#115E59` | Pressionado. |
| `primary.fg` | `#FFFFFF` | Texto sobre a primária. |
| `primary.tintBg` | `#F0FDFA` | Fundo de destaque suave (item de menu ativo). |
| `primary.tintBorder` | `#99F6E4` | Borda de destaque suave. |
| `primary.tintText` | `#115E59` | Texto sobre `tintBg`. |

### Cores — semânticas

| Papel | `fg` | `bg` | `text` (sobre bg) |
|---|---|---|---|
| Sucesso | `#16A34A` | `#F0FDF4` | `#15803D` |
| Aviso | `#D97706` | `#FFFBEB` | `#B45309` |
| Erro | `#DC2626` | `#FEF2F2` | `#B91C1C` |
| Info | `#2563EB` | `#EFF6FF` | `#1D4ED8` |

### Cores — status de agendamento (pills)

Mapeamento fixo dos `AppointmentStatus` (ver glossário no contexto geral). Sempre esta correspondência:

| Status | Rótulo (PT) | `dot` | `bg` | `text` |
|---|---|---|---|---|
| `scheduled` | Agendado | `#2563EB` | `#EFF6FF` | `#1D4ED8` |
| `confirmed` | Confirmado | `#0D9488` | `#F0FDFA` | `#0F766E` |
| `completed` | Concluído | `#16A34A` | `#F0FDF4` | `#15803D` |
| `cancelled` | Cancelado | `#A8A29E` | `#F5F5F4` | `#78716C` |
| `no_show` | Não compareceu | `#DC2626` | `#FEF2F2` | `#B91C1C` |

### Tipografia

- **UI/texto:** `Geist` (fallback: `-apple-system, "Segoe UI", Roboto, sans-serif`).
- **Dados/numérico:** `Geist Mono` (fallback: `ui-monospace, monospace`) — **obrigatório** para
  dinheiro, horários, IDs e qualquer coluna numérica, com `font-variant-numeric: tabular-nums`
  para alinhamento. Números financeiros mal alinhados são um erro de leitura, não de estética.
- Em Next.js, carregar via `next/font/google` (Geist e Geist Mono estão disponíveis).

Escala (base 14px — admin é mais denso que site):

| Papel | Tamanho / linha | Peso |
|---|---|---|
| Título de página (h1) | 24px / 1.3 | 600 |
| Seção (h2) | 20px / 1.35 | 600 |
| Card/subtítulo (h3) | 16px / 1.4 | 600 |
| Corpo (padrão) | 14px / 1.5 | 400 |
| Rótulo/legenda | 12px / 1.4 | 500 |

Pesos permitidos: **400, 500, 600**. Nunca 700+ (fica pesado demais contra a base neutra).
Sempre **sentence case** — nunca Title Case nem CAIXA ALTA em rótulos.

### Espaçamento (base 4px)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`. Padding padrão de conteúdo: 24px. Gap padrão entre
campos de formulário: 16px. Nada de valores fora desta escala.

### Raio de borda

| Token | Valor | Uso |
|---|---|---|
| `radius.sm` | 6px | Botões, inputs, pequenos controles. |
| `radius.md` | 8px | Cards, painéis, dropdowns. |
| `radius.lg` | 12px | Modais. |
| `radius.pill` | 999px | Badges/pills, avatares. |

### Elevação (sombras — sutis)

| Token | Valor | Uso |
|---|---|---|
| `elevation.1` | `0 1px 2px rgba(0,0,0,.04), 0 1px 3px rgba(0,0,0,.06)` | Cards. |
| `elevation.2` | `0 4px 12px rgba(0,0,0,.08)` | Dropdowns, popovers. |
| `elevation.3` | `0 12px 32px rgba(0,0,0,.12)` | Modais. |

Sem sombras pesadas, coloridas ou glow.

---

## 3. Implementação (Styled Components + ThemeProvider)

Objeto de tema (forma canônica; preencher com os hex acima):

```ts
export const theme = {
  color: {
    surface: { app: '#FAFAF9', card: '#FFFFFF', subtle: '#F5F5F4' },
    border:  { default: '#E7E5E4', strong: '#D6D3D1' },
    text:    { strong: '#1C1917', default: '#44403C', muted: '#78716C', subtle: '#A8A29E' },
    primary: { default: '#0D9488', hover: '#0F766E', active: '#115E59', fg: '#FFFFFF',
               tintBg: '#F0FDFA', tintBorder: '#99F6E4', tintText: '#115E59' },
    success: { fg: '#16A34A', bg: '#F0FDF4', text: '#15803D' },
    warning: { fg: '#D97706', bg: '#FFFBEB', text: '#B45309' },
    danger:  { fg: '#DC2626', bg: '#FEF2F2', text: '#B91C1C' },
    info:    { fg: '#2563EB', bg: '#EFF6FF', text: '#1D4ED8' },
  },
  font:    { ui: "'Geist', -apple-system, sans-serif", mono: "'Geist Mono', ui-monospace, monospace" },
  radius:  { sm: '6px', md: '8px', lg: '12px', pill: '999px' },
  space:   (n: number) => `${n * 4}px`,
  elevation: {
    1: '0 1px 2px rgba(0,0,0,.04), 0 1px 3px rgba(0,0,0,.06)',
    2: '0 4px 12px rgba(0,0,0,.08)',
    3: '0 12px 32px rgba(0,0,0,.12)',
  },
} as const;
```

Regra: componentes leem sempre `props.theme.*`. Nenhum hex/px hardcoded no JSX ou nos styled.

---

## 4. Layout / shell

```
┌───────────┬────────────────────────────────────────────┐
│           │  Topbar (56px): contexto · busca · usuário  │
│  Sidebar  ├────────────────────────────────────────────┤
│  (240px)  │                                            │
│           │  Conteúdo (padding 24px)                   │
│  nav      │  max-width 720px em formulários            │
│           │  full-width em tabelas/agenda              │
└───────────┴────────────────────────────────────────────┘
```

- **Sidebar:** 240px fixa à esquerda; recolhe para 64px (só ícones). Item ativo usa
  `primary.tintBg` + texto `primary.tintText` + barra de 2px `primary.default` à esquerda.
- **Topbar:** 56px; mostra o negócio atual, busca global e menu do usuário.
- **Conteúdo:** padding 24px; formulários limitados a ~720px de largura para legibilidade;
  tabelas e agenda ocupam a largura toda.
- **Responsivo:** `<768px` a sidebar vira drawer (hambúrguer na topbar); tabelas ganham scroll
  horizontal ou viram cards empilhados quando fizer sentido.

---

## 5. Componentes (padrões concretos)

### Botões
Altura 36px (padrão), 32px (small), 40px (large); padding lateral 16px; `radius.sm`; peso 500.
- **Primário:** bg `primary.default`, texto `primary.fg`; hover `primary.hover`; ativo `primary.active`.
- **Secundário:** bg `surface.card`, borda `border.strong`, texto `text.strong`; hover bg `surface.subtle`.
- **Ghost:** transparente, texto `text.default`; hover bg `surface.subtle`.
- **Perigo:** bg `danger.fg`, texto branco (ações destrutivas confirmadas).
- **Desabilitado:** opacidade .5, sem cursor de ação.
- **Foco:** anel de 2px `primary.default` com offset (visível ao teclado).

### Inputs e formulários
Altura 36px; borda `border.strong`; `radius.sm`; padding lateral 12px; texto 14px.
- Rótulo acima, 12px `text.muted` peso 500.
- Placeholder `text.subtle`.
- Foco: borda `primary.default` + anel sutil.
- Erro: borda `danger.fg` + mensagem 12px `danger.text` abaixo (linguagem clara, sem pedir desculpas).
- Grupos de campos com gap de 16px; ações do formulário alinhadas à direita no rodapé.

### Tabelas / listagens densas
- Cabeçalho: bg `surface.subtle`, texto 12px `text.muted` peso 500, **sentence case** (nunca CAIXA ALTA).
- Linha: altura 44px, borda inferior `border.default`, hover bg `surface.subtle`. Sem zebra (o hover basta).
- Cabeçalho fixo (sticky) em listas longas.
- Colunas numéricas (dinheiro, hora): alinhadas à direita, fonte `mono`, `tabular-nums`.
- Última coluna: ações como ghost icon-buttons.
- Vazio: usar o padrão de empty state (abaixo), não uma linha em branco.

### Cards / painéis
bg `surface.card`, borda `border.default`, `radius.md`, padding 20–24px, `elevation.1`.
Cabeçalho opcional: título h3 à esquerda + ações à direita.

### Badges / pills de status
Altura 22px, `radius.pill`, padding lateral 8px, 12px peso 500, ponto (dot) opcional à esquerda.
Cores **sempre** pela tabela de status de agendamento (seção 2). Não inventar cor de status.

### Modais e drawers
- **Modal:** overlay `rgba(0,0,0,.45)`; painel `surface.card`, `radius.lg`, padding 24px, `elevation.3`.
  Largura ~480px (confirmação) / ~640px (formulário). Título h3, botão fechar (X), ações no rodapé à direita.
- **Drawer:** lateral direita, ~420px, para edição/detalhe de agendamento sem sair do contexto.
- Confirmação destrutiva (cancelar agendamento, excluir serviço): botão perigo + descrição do efeito real.

### Agenda / calendário
- Visões dia e semana; coluna de horário à esquerda em `mono` `tabular-nums`.
- Blocos de agendamento coloridos pelo status (mesma paleta de pills).
- Linha do horário atual destacada.
- Clique em espaço livre abre criação; clique em bloco abre o drawer de detalhe.
- Profissional vê só a própria agenda; admin vê todas com filtro por profissional.

### Estados de carregamento / vazio / erro
- **Carregando:** skeletons (`surface.subtle` com shimmer suave) em tabelas/cards. Spinner só inline
  em botão. Evitar spinner de página inteira.
- **Vazio:** ícone + título de uma linha + ajuda curta + ação primária. Voz ativa, sentence case.
  Ex.: "Nenhum serviço cadastrado ainda." + botão "Adicionar serviço". Tela vazia é um convite a agir.
- **Erro:** mensagem clara do que aconteceu e como resolver, na voz da interface. Erro não pede desculpa
  e nunca é vago.

### Toasts / feedback
Canto inferior direito, auto-dismiss ~4s, variantes sucesso/erro/info, uma linha.
O texto do toast espelha a ação: botão "Salvar" → toast "Alterações salvas".

---

## 6. Acessibilidade e piso de qualidade

- Contraste mínimo AA (4.5:1 para texto) — as combinações de tokens acima já respeitam.
- Foco de teclado sempre visível (anel `primary.default`).
- Ícone-botão sempre com `aria-label`.
- Alvo mínimo de toque 36px.
- `prefers-reduced-motion`: desativar transições não essenciais.
- Navegação por teclado em tabelas, modais (trap de foco) e menus.

---

## 7. Microcopy / tom de voz (PT-BR)

- **Sentence case**, voz ativa, verbos que dizem o que acontece: "Salvar alterações", não "Enviar".
- A ação mantém o mesmo nome do começo ao fim do fluxo (botão "Confirmar" → toast "Confirmado").
- **Nunca vazar termo técnico interno na UI.** A pessoa gerencia um "negócio", não um "tenant";
  "profissionais", não "recursos"; "página de agendamento", não "landing pública".
- Rótulos nomeiam o que a pessoa controla e reconhece, não como o sistema é construído.
- Registro conversacional e enxuto; sem floreio. Cada elemento faz um só trabalho.

---

## 8. O que NÃO fazer

- ❌ Cor, espaçamento, raio ou fonte fora dos tokens desta seção.
- ❌ Peso de fonte 700+; Title Case ou CAIXA ALTA em rótulos.
- ❌ Sombra pesada, gradiente decorativo, glow.
- ❌ Serifa display, fundo creme + terracota, ou fundo escuro com neon (clichês de dashboard gerado).
- ❌ Número financeiro/horário fora de `mono` + `tabular-nums`.
- ❌ Spinner de página inteira; linha/estado vazio sem convite à ação.
- ❌ Cor de status de agendamento diferente da tabela oficial.
- ❌ Termo técnico interno (tenant, webhook, recurso) exposto ao usuário.
