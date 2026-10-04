# Revisão shadcn B2T — 03/10/2026

Execução do plano aprovado `docs/superpowers/plans/2026-10-03-shadcn-completo.md`. Ambiente local de revisão: http://localhost:3100.

## Biblioteca e origem

Componentes locais derivados do registro oficial shadcn new-york (https://ui.shadcn.com/r/styles/new-york/), com licença MIT preservada em `src/components/ui/LICENSE.md`. NativeSelect consultado também no registro new-york-v4. Novas primitivas Radix: Label, Separator, Tabs, Dialog (Sheet) e Accordion.

Adaptações: tokens B2T sem Preflight; Card com `asChild` para conservar form/section/article; Checkbox nativo para respeitar FormData e fieldset disabled; NativeSelect com seta e API nativas; Sidebar fixa com Sheet móvel, sem recursos de recolhimento/cookies não usados no produto; rótulos em português. Field mantém descrição externa junto do hint. Notice mantém alert/status.

## Inventário de consumidores

- Acesso e estrutura: login, conta, navegação ADMIN/OPERATOR, menu móvel.
- Produção: calculadora, materiais, impressoras, custos, equipe, aparência, conteúdo da loja.
- Cadastro e comercial: produtos/galeria/opções, coleções, clientes, orçamentos/parcelas/vendas.
- Financeiro: painel, contas/categorias, lançamentos, baixas, transferências, movimentos/filtros.
- Loja: home/busca/coleção, produto/galeria, orçamento local, Sobre e Ajuda.

Controles visuais migrados para Input, Label, NativeSelect, Textarea, Checkbox e Button. Listagens usam Table; painéis administrativos usam Card; navegação usa Sidebar/Sheet, Tabs, Breadcrumb e Pagination. FAQ usa Accordion. Skeleton cobre carregamento administrativo.

## Exceções intencionais

Inputs hidden preservam consultas GET. Impressão usa tabela HTML e CSS específico. Prévia editorial do produto e histórico financeiro conservam details/summary nativos. Layouts, gráficos, imagens e composição de marca mantêm CSS próprio. Não há novo Dialog/AlertDialog independente porque os editores e confirmações existentes são inline.

## Verificação

Baseline: 131 testes unitários, tipos e lint aprovados. Após migração: 139 testes unitários e 72 integrações aprovados, além de tipos, lint e build de produção.

No Windows, três testes de concorrência receberam P2028 em vez de CONFLICT. O mesmo timeout foi reproduzido com duas transações contendo somente SELECT 1, sem código da aplicação. No runtime Linux da imagem de ferramentas, as 72 integrações passaram. Usou-se exclusivamente o banco b2t_test; um encaminhador temporário na rede desse container manteve a URL localhost:55432. Nenhuma regra de domínio foi alterada para esconder a falha local.

## Cobertura visual

Capturas e matrizes completas ficam em `test-results/shadcn-completo`. `matrix.json` identifica cada rota, papel, tema, largura, HTTP, overflow, erros de JavaScript e arquivo. `extra-routes.json` registra detalhes, editores e lista preenchida. `interactions.json` registra teclado, portal e fixtures. As imagens foram inspecionadas individualmente e em folhas de comparação; estas folhas são auxiliares, enquanto os PNGs de cada rota são a evidência principal.

| Grupo | Rotas/estados | Papel | Temas e larguras |
| --- | --- | --- | --- |
| Loja | Home, busca sem resultados, coleção, produto com galeria, orçamento vazio/preenchido | Público | Claro/escuro; 1366, 390, 320 px |
| Acesso | Login e conta | Público, ADMIN, OPERATOR | Claro/escuro; 1366, 390, 320 px |
| Produção | Calculadora, configurações, aparência; rascunho/cancelamento e erro de atualização | ADMIN; calculadora também OPERATOR | Claro/escuro; 1366, 390, 320 px; erro e menu a 390 px |
| Cadastros | Produtos, coleções, clientes; editor de produto com galeria | ADMIN; produtos/clientes também OPERATOR | Claro/escuro; 1366, 390, 320 px |
| Comercial | Orçamentos, vendas, detalhes existentes, editor de orçamento, impressão | ADMIN | Claro/escuro; 1366, 390, 320 px |
| Financeiro | Painel, contas/categorias, lançamentos, movimentos | ADMIN | Claro/escuro; 1366, 390, 320 px |
| Componentes | Erro, informação, carregamento, disabled, nome longo, sufixo, arquivo/data/cor, FAQ, impressão com valor extenso | Fixture local | Claro/escuro; 1366, 390, 320 px |

A matriz principal possui 150 capturas, complementada por 42 de detalhes/editores/FAQ e 15 de interações/fixtures. Os testes de geometria verificam overflow da página, não proíbem rolagem interna de tabela. As tabelas têm região nomeada, foco por teclado e largura mínima para evitar valores monetários partidos em letras.

Corrigidos durante a inspeção: menu móvel aparecendo no desktop por precedência de utilities; direção da Sidebar no celular; bordas nativas das abas; bordas excessivas das linhas de tabela; ausência de distinção visual da tecnologia selecionada; quebra de valores nas tabelas estreitas. Hero acompanha o escuro e catálogo usa uma coluna abaixo de 480 px. Arquivos originais de logo/mascote e fundos incorporados às imagens foram preservados.

Teclado: Sheet abre, fecha com Escape e devolve foco; Tabs e Accordion respondem às setas; FAQ expande com Enter e associa pergunta/resposta. Portal escuro medido com fundo rgb(25,37,48) e texto rgb(239,245,250). Movimento reduzido desativa animações dos componentes. FormData, select required e checkbox em fieldset disabled têm testes de contrato. Operação pendente e repetição financeira preservam bloqueio e chave de idempotência.

Impressão: documento existente e fixture com nome longo e R$ 1.234.567,89, em ambos os temas. PDFs de teste em `print-light.pdf` e `print-dark.pdf`. Documento preserva valores e não inclui navegação. Nenhum orçamento, venda, baixa ou transferência foi criado pela revisão visual.

## Limites e decisões

- Sobre e Ajuda retornam 404 porque os conteúdos não estão configurados no ambiente. Esse estado foi capturado; o Accordion preenchido foi testado em fixture, sem cadastrar política comercial fictícia. Não há contato comercial configurado, portanto não houve envio externo.
- A inspeção de teclado/contraste e os testes de componentes não constituem certificação completa de acessibilidade nem validação em todos os navegadores/leitores de tela. O navegador de revisão foi Edge/Chromium.
- A revisão independente iniciou a conferência de formulários, financeiro e tema do Sheet, mas foi interrompida pelo serviço por falta de créditos antes do parecer final. A revisão de fechamento foi feita pelo implementador, com essa limitação explicitada.
- O checkout misto foi mantido conforme a continuidade autorizada, sem commits durante a implementação. Em 04/10/2026, o usuário autorizou consolidar a entrega acumulada em commits separados. O registro local de execução usa PowerShell/Node em vez dos auxiliares bash da skill. Isso preserva o estado anterior, mas não oferece isolamento de um worktree separado.
- Checkbox, NativeSelect e Sidebar têm as adaptações nativas descritas acima; futuras atualizações do registro precisam preservá-las. As duas disclosures nativas e o documento de impressão são exceções deliberadas, não consumidores esquecidos.

CSS removido: regras substituídas de button/icon-button, card genérico, notice, status-pill, settings-tabs, campos legados, FAQ details e tabela genérica. CSS de layout, marca, gráficos e impressão permanece. Não foi adicionado Preflight global.

## Conferência para os commits — 04/10/2026

Reexecutados: 139 testes unitários, 72 integrações no Linux, tipos e lint, todos aprovados. O lint passou a ignorar test-results e playwright-report, que contêm evidências e bundles gerados, já excluídos do Git. Os resultados visuais permanecem locais. Nenhum push foi realizado.
