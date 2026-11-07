# Design System APP B2T

Contrato vigente · fundação, piloto e listagens comerciais · 07/11/2026 · base: main 1.27.0 (`a5805f40578a50b7007b4b10b55bf58c85e393d5`).

## Autoridade e escopo

[Identidade B2T](docs/identidade/IDENTIDADE-B2T.md) é a fonte oficial de marca, cores e uso dos ativos. Este documento descreve a implementação da interface; não substitui o manual. [Incremento loja/admin](docs/identidade/INCREMENTO-LOJA-E-ADMIN.md) e [revisão shadcn](docs/identidade/REVISAO-SHADCN.md) registram decisões anteriores. APIs locais estão em [COMPONENTS.md](COMPONENTS.md); pendências e critérios de evolução em [UI_ROADMAP.md](UI_ROADMAP.md).

Esta etapa consolida documentação e responsabilidade dos estilos. Não altera paletas, geometria, navegação ou regras de negócio. A adoção de azul como padrão administrativo continua dependendo de decisão do usuário. Aparência salva tem precedência sobre valores de fallback; cores oficiais da marca não devem substituir preferências cadastradas.

## Fontes de verdade e cascata

`src/app/layout.tsx` importa somente `src/app/design.css` como entrada de estilos. `components.json` aponta para essa mesma entrada. Tailwind v4 opera sem Preflight global, para preservar controles nativos.

| Fonte                            | Responsabilidade vigente                                                             | Regra de manutenção                                               |
| -------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `src/app/globals.css`            | Estrutura legada, layout e estilos históricos                                        | Não ampliar seletores genéricos para novos componentes            |
| `src/app/theme.css`              | Valores claros/escuros, estados e adaptação do legado                                | Manter explícito e automático equivalentes                        |
| `src/app/storefront.css`         | Composição e identidade da loja                                                      | Não vazar decisões da loja para gestão                            |
| `src/app/admin.css`              | Densidade, shell e receitas administrativas                                          | Não redefinir variantes globais de ui/*                           |
| `src/app/design.css`             | Ordem de importação, ponte semântica, compatibilidade nativa e receitas incrementais | Evitar novos overrides; mover apenas com equivalência demonstrada |
| `src/components/ui/*`            | APIs, slots, variantes e estados dos componentes                                     | Preferir variantes existentes a cores em consumidores             |
| `src/domain/appearance/theme.ts` | Variáveis da preferência e texto contrastante                                        | Não persistir/resetar paletas durante refatoração visual          |

A ordem declarada é `theme, legacy, components, utilities`. Globals, tema e storefront entram em `legacy`; admin declara `components`. A precedência também depende de camada, especificidade e ordem: não basta mover uma regra para o fim do arquivo. Utilities vêm depois de components. `cn()` não resolve conflitos entre regras de folhas CSS.

## Papéis semânticos

Os nomes abaixo são CSS custom properties. Valores claros/escuros ficam nas fontes indicadas; não copiar os valores para componentes.

| Uso                                | Fundo / texto ou apoio                                               | Origem e configuração                                                                |
| ---------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Página / superfície                | `--bg` / `--ink`; `--paper` / `--ink`                                | `theme.css`, valores por tema                                                        |
| Componente                         | `--background` / `--foreground`                                      | Gestão: paper/ink; loja: escopo storefront                                           |
| Card / popup                       | `--card` / `--card-foreground`; `--popover` / `--popover-foreground` | Ponte paper/ink em design.css                                                        |
| Ação principal                     | `--primary` / `--primary-foreground`                                 | Gestão: brand/on-brand; preferência light/dark de Aparência                          |
| Ação secundária                    | `--secondary` / `--secondary-foreground`                             | Raiz: surface/ink; admin-theme.admin-ui: accent/on-accent                            |
| Texto auxiliar / superfície neutra | `--muted-foreground`; `--store-muted` / `--foreground`               | bg-muted mapeia store-muted; gestão usa surface para esse fundo                      |
| Borda / campo / foco               | `--border`, `--input`, `--ring`                                      | line; input herda border; ring herda primary                                         |
| Sucesso                            | `--success-bg` / `--success`                                         | Valores por tema em theme.css; incluir mensagem                                      |
| Atenção                            | `--warning-bg` / `--warning`                                         | Valores por tema em theme.css; incluir mensagem                                      |
| Erro                               | `--danger-bg` / `--danger`; `--destructive`                          | destructive aponta para danger; não usar cor isolada                                 |
| Sidebar                            | `--sidebar` / `--sidebar-foreground`                                 | paper/ink; primary e ring usam brand; accent usa surface/ink; border usa line        |
| Gráficos do dashboard              | `--chart-1`, `--chart-2`, `--chart-3`                                | primary, accent, muted-foreground no dashboard-workspace; informar unidade e período |
| Loja                               | `--site-light-*`, `--site-dark-*`                                    | Preferências próprias via siteThemeVariables; não reutilizar paleta administrativa   |

`themeVariables()` fornece `--light-primary`, `--light-accent`, `--dark-primary`, `--dark-accent` e respectivos on-colors por `readableText()`. `siteThemeVariables()` calcula pares próprios da loja, com contraste mínimo 4,5 para os textos preferidos antes de recorrer a readableText. Isso não certifica contraste de todos os estados/overlays.

**Ponte intencional:** `--muted` representa texto no legado administrativo; a utility `bg-muted` usa `--store-muted`, não `--muted`. Da mesma forma, utilities accent usam `--store-accent`; não confundir esses nomes com `--accent`, destaque configurável da gestão. Ambos os aliases usam surface no administrativo. Preservar essa separação ao migrar consumidores; uma renomeação textual global quebraria o contrato.

## Claro, escuro e portais

O bootstrap em `src/lib/theme-preference.ts` aplica `data-theme` na raiz. Seleção explícita light/dark vence a preferência do sistema; sem atributo, `prefers-color-scheme` governa o escuro. A variante dark em design.css contempla ambos.

| Contexto          | Preferência                                   | Herança / cuidado                                                                                           |
| ----------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Gestão e login    | Variáveis administrativas + `.admin-theme`    | Não promover a preferência administrativa à paleta da loja                                                  |
| Loja              | Variáveis site + `.storefront`                | Manter pares próprios de claro/escuro                                                                       |
| Sheet móvel       | AdminThemeProvider e paletteStyle no AppShell | AppShell reaplica estilo e classes administrativas no conteúdo portado; Sheet genérico não faz isso sozinho |
| Dialog / Combobox | Portal próprio da primitiva                   | Não presumir que herdam variáveis de um ancestral React: validar o DOM e escopo de cada novo uso            |

O `ChartStyle` de ui/chart.tsx ainda usa seletor `.dark` para configuração por tema. É uma divergência potencial com data-theme; não há falha demonstrada no dashboard atual, que usa variáveis CSS. Não registrar como correção já realizada.

## Tipografia, dimensões e estados

Roboto é a fonte da gestão; Poppins é a fonte da loja, carregadas localmente em design.css. A gestão usa corpo de 14 px; admin.css define h1 em 24 px e h2 em 15 px, com outros tamanhos por receita. A escala proposta na auditoria não substitui automaticamente esses valores.

Espaçamentos de referência: 4/8/12/16/24/32 px. Controles usam em geral rounded-lg e superfícies rounded-xl; ainda existem raios literais e referências à escala Tailwind, sem escala própria integralmente fixada. Não afirmar que todos os controles já compartilham a mesma dimensão. O CSS central garante mínimo de 44 px para input, native-select, button e tabs em larguras até 767 px; checkbox e demais alvos precisam de composição/inspeção específica.

Novos usos devem cobrir padrão, hover, foco visível, selecionado/expandido, disabled, erro e pending quando aplicáveis. Cor acompanha texto; ações de ícone têm nome acessível. Mensagens longas devem quebrar sem cortar dados. Preservar movimento reduzido e impressão. Não redesenhar menu, rolagem própria da sidebar, prioridades antes dos gráficos ou formulários progressivos já existentes.

## Responsabilidade futura

As listagens de orçamentos e vendas acrescentam somente a receita `.commercial-list`, sem redefinir variantes ou tokens. Critérios aplicados ficam junto ao resultado; controles recolhidos permanecem montados. [FILTROS-TABELAS-COMERCIAL.md](docs/design/FILTROS-TABELAS-COMERCIAL.md) registra consumidores, evidências e limites desta continuidade.

Variantes e estados reutilizáveis pertencem a ui/*; preferência e pares de cor pertencem aos tokens; arranjo e densidade contextual pertencem às receitas. As regras centrais de data-slot mantêm compatibilidade durante a migração, não constituem uma segunda API de variantes. Remover uma regra exige mostrar consumidores, estilo computado antes/depois e estados afetados, incluindo claro/escuro e portais. O piloto de produto aplica os adaptadores locais Field/TextareaField e a receita product-essential-fields, sem migrar variantes/tokens globais. Evidências e limites estão em [PILOTO-PRODUTO.md](docs/design/PILOTO-PRODUTO.md).
