# Adoção completa de shadcn e revisão visual B2T

Data: 03/10/2026. Escopo aprovado em conversa; especificação escrita para revisão.

## Objetivo

Unificar loja, login e administração em uma biblioteca local de componentes shadcn/ui com Tailwind. Eliminar a dependência de estilos antigos para controles e componentes migrados, mantendo identidade B2T, densidade compacta administrativa e funções existentes.

“Completo” significa que todos os controles e padrões de interface utilizados pelo produto terão uma implementação padronizada. Não significa instalar todo o catálogo shadcn nem substituir HTML semântico, imagens, gráficos próprios ou documentos de impressão por componentes sem necessidade.

## Estado atual e abordagem

O projeto já tem Tailwind 4, configuração shadcn new-york, Button, utilitário cn e licença local. Field e Notice são próprios; controles nativos, abas, tabelas e navegação ainda usam globals.css, theme.css, storefront.css e admin.css. Há alterações anteriores não consolidadas no repositório que precisam ser preservadas.

Abordagem escolhida: migrar componentes compartilhados e, em seguida, seus consumidores por grupos de telas, removendo regras substituídas. Isso permite validar formulários e permissões a cada grupo. Uma troca superficial de classes manteria a duplicação atual; uma reescrita integral das telas ampliaria desnecessariamente o risco funcional.

## Biblioteca e contratos

Componentes ficam em `src/components/ui`, baseados no registro oficial shadcn compatível com as dependências instaladas. Preservar a licença e documentar adaptações. Não instalar bibliotecas concorrentes de UI.

| Padrão | Componentes e decisão |
| --- | --- |
| Campos | Input, Label, Textarea, Native Select e Checkbox; Field passa a compô-los |
| Seleção | Native Select shadcn para formulários GET/FormData e seleções simples; Select customizado somente se houver necessidade existente que justifique a mudança |
| Conteúdo | Card, Badge, Alert, Separator, Skeleton; Notice compõe Alert sem perder role de erro/status |
| Navegação | Sidebar, Sheet móvel, Tabs, Breadcrumb e Pagination |
| Expansão | Accordion nas perguntas frequentes, mantendo conteúdo e teclado |
| Sobreposição | Dialog e Alert Dialog somente para interações existentes que precisem de sobreposição ou confirmação; não transformar todo editor inline em modal |
| Listagens | Table com filtros e ações existentes; manter paginação no servidor, sem adicionar motor de Data Table |
| Ações | Button em comandos restantes; ações decorativas/específicas usam variantes da biblioteca |

Manter `name`, `id`, `value`, `defaultValue`, `required`, `disabled`, associações de rótulos, mensagens de erro e comportamento de submit/reset. Checkbox deve continuar entregando o valor esperado por FormData e respeitar fieldset disabled. Datas, números, cores e arquivos conservam os tipos nativos quando utilizados, apresentados pela base padronizada. Não adicionar React Hook Form ou alterar esquemas de validação por causa da migração visual.

Componentes interativos mantêm fronteiras client locais. Páginas públicas e composição sem interação continuam no servidor. Consultar a documentação Next instalada antes de alterar código.

## Telas e responsabilidades

| Grupo | Arquivos centrais | Cobertura |
| --- | --- | --- |
| Base | `src/components/ui/*`, `src/app/design.css`, `components.json` | Componentes, tokens, foco e densidade |
| Estrutura e acesso | `src/components/shell/app-shell.tsx`, `src/components/auth-form.tsx`, `src/components/logout-button.tsx`, `src/app/login`, `src/app/(private)/conta` | Sidebar, menu móvel, login, conta e saída |
| Produção | `src/components/calculator/*`, `src/components/settings/*` | Calculadora, materiais, impressoras, custos, equipe e aparência |
| Cadastros | `src/components/products/product-*`, `src/components/collections/*`, `src/components/customers/*` | Editores, galerias, opções e listagens |
| Comercial | `src/components/commerce/*` | Orçamentos, itens, parcelas, vendas, detalhes e impressão |
| Financeiro | `src/components/finance/*` | Painel, contas, categorias, lançamentos, movimentos, baixas e transferências |
| Loja | `src/app/page.tsx`, `src/app/portfolio/*`, `src/components/products/store-*`, `product-catalog.tsx`, `product-carousel.tsx`, `product-contact.tsx`, `inquiry-*.tsx` | Home, busca, coleções, produto, orçamento, Sobre e Ajuda |

## Direção visual

- Preservar logo, mascote, Poppins e paleta documentados em `docs/identidade/IDENTIDADE-B2T.md`.
- Loja: hierarquia clara de títulos, imagens e ações; cabeçalho mais baixo; continuidade entre abertura, catálogo e rodapé nos dois temas. No escuro, remover a grande superfície branca da abertura, preservando a integridade das imagens originais e seus fundos quando incorporados ao arquivo.
- Administração: lateral de referência 216 px, cartões com preenchimento de 16 px, campos de 36 px e ações de pelo menos 34 px no desktop. No celular, campos e ações com pelo menos 44 px. Manter cores e logo configurados em Aparência.
- Separar tokens de loja e gestão com a mesma API de componentes; login recebe tokens definidos, sem depender de variáveis ausentes.
- Definir tokens completos de background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring e sidebar.
- Popovers, sheets e dialogs devem receber o tema correto também quando renderizados em portal fora do contêiner visual.
- Sem introduzir Preflight global durante a migração. Definir explicitamente o estilo-base necessário aos componentes para evitar fundos e bordas nativos inconsistentes.
- Remover CSS de controles, cards, abas e tabelas substituídos após validar seus consumidores. Manter CSS específico de layout, gráficos, impressão e marca quando necessário, registrando as exceções.

## Comportamento e dados preservados

Sem migração de banco, mudança de endpoints ou novas funcionalidades comerciais. Preservar autenticação e regras ADMIN/OPERATOR; acesso à calculadora continua autenticado. A migração do menu não altera autorização no servidor.

Preservar cálculo decimal, preços, disponibilidade, variantes, filtros, paginação, URLs canônicas, redirecionamentos e lista local de orçamento. Não enviar mensagens externas nem criar pedidos automaticamente.

Operações financeiras preservam chaves de idempotência, proteção contra duplo envio, estados pendentes e tratamento de falhas. Edição mantém controle de versão e proteção contra concorrência. Impressão continua com layout próprio, sem sidebar ou controles interativos no documento.

## Ordem de entrega e esforço

1. Base de componentes, tokens e adaptadores Field/Notice — médio pelas dependências compartilhadas.
2. Estrutura, login, conta, calculadora e configurações — médio para navegação/abas; baixo para composição visual.
3. Cadastros e comercial — baixo para listagens; médio para formulários com arquivos, opções, parcelas e impressão.
4. Financeiro — médio para preservar submissões e operações; sem redesenhar regras.
5. Loja e continuidade visual — baixo para composição; médio para interações, portais e tema.
6. Revisão transversal e remoção de CSS substituído — médio onde a cascata é compartilhada; baixo para documentação e capturas.

Trata-se de uma única migração do sistema de interface, dividida em entregas verificáveis. O esforço baixo continua sendo o padrão fora dos riscos indicados.

## Verificação e aceite

- Inventariar os consumidores antes da migração e registrar sua cobertura ao final. Não encerrar com uma migração apenas de Button ou de estilos globais.
- Busca estática final: controles visuais brutos fora de `ui` precisam de justificativa; inputs ocultos, composição semântica e impressão são exceções legítimas. Não exigir componentes artificiais para cada elemento HTML.
- Testes de comportamento: FormData e validação obrigatória; checkbox; preservação de sufixos; disabled/pending; abas por teclado; fechamento e retorno de foco de Sheet/Dialog; permissões do menu; filtros e contexto de retorno; revalidação do orçamento; operações financeiras sem envio duplicado.
- Executar testes afetados por grupo e a suíte unitária ao concluir. Integrações necessárias rodam apenas no banco isolado de testes. Executar tipos, lint e build de produção.
- Revisar todas as rotas públicas e administrativas em desktop e celular, claro e escuro. Larguras de referência: 1366 e 390 px; verificar também o limite de 320 px nos componentes compartilhados e telas com tabelas/formulários extensos.
- Conferir estados vazio, preenchido, carregando, erro, indisponível e desabilitado, além de textos longos. Validar estados destrutivos/financeiros com fixtures e testes, sem operar dados reais para produzir uma captura.
- Sem rolagem horizontal da página; tabelas largas podem ter rolagem interna identificável. Rótulos, valores e ações não podem ficar cortados ou depender somente de cor/hover.
- Verificar foco visível, navegação por teclado, nomes acessíveis, contraste WCAG AA de textos/controles e preferência por movimento reduzido. Não declarar certificação de acessibilidade a partir de inspeção parcial.
- Salvar capturas e registro de rotas/estados revisados em `test-results`; documentar resultados e limitações em `docs/VALIDACAO.md`.

## Riscos e limites

Principais riscos: cascata antiga sobrescrevendo componentes; componentes em portal perdendo o tema; perda de dados de FormData; selects/checkboxes alterando validação nativa; submissões duplicadas; perda de foco; quebra da impressão.

Mitigação: migração por consumidores, testes de contratos e comparação visual após cada grupo. Dependências novas limitadas às primitivas exigidas pelos componentes adotados. Preservar todo trabalho anterior no checkout; não executar limpeza ou reset amplo.

Revisão local usa o ambiente isolado da porta 3100. Não inclui publicação externa, domínio, configuração comercial, preenchimento de catálogo ou alteração da instalação da porta 3000.

## Revisão da especificação

Escopo confrontado com a solicitação aprovada; componentes limitados a padrões utilizados; critérios de conclusão explícitos; regras de dados e permissões preservadas. Próxima etapa do processo: revisão deste documento pelo usuário, seguida do plano executável.
