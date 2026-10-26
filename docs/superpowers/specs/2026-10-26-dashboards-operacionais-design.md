# Dashboards por operação

Status: aprovado pelo usuário em 26/10/2026 e implementado. Evidências e limites em `docs/superpowers/reviews/2026-10-26-dashboards-operacionais.md`.

## Intenção e escopo

Ampliar o dashboard administrativo para orientar decisões e próximas ações com todos os indicadores discutidos. O usuário confirmou todos os indicadores e o início pela abordagem recomendada. Interpretação do implementador: seis painéis na rota /dashboard, alternados por Combobox: Visão geral, Comercial, Produção, Estoque, Financeiro e Rentabilidade. Planejamento integra Produção; artes e aprovações integram Comercial e suas pendências aparecem na Visão geral.

## Abordagens

1. Seis painéis com Combobox: recomendada, comporta todas as operações e funciona em telas estreitas. Interpretada como a escolha do usuário; confirmar junto deste desenho.
2. Quatro painéis com ToggleGroup: oferece alternância visível, mas exigiria acomodar estoque e rentabilidade em outras visões.
3. Uma página com todos os indicadores: facilita consulta conjunta, mas aumenta rolagem e mistura tarefas.

## Organização visual

Preservar identidade, tema claro/escuro, Radix, fontes e navegação existentes. Usar o registro oficial @shadcn, proposto pelo implementador, com dashboard-01 como referência de composição e Charts como base dos gráficos; adaptar ao domínio, sem substituir o shell inteiro. Cabeçalho com painel, descrição, período e data de atualização; cards essenciais; gráficos; tabelas de prioridades com links. Os demais indicadores ficam em seções identificadas, evitando dezenas de cards no topo. Estados vazios, falha, carregamento e dados incompletos explícitos. Sem números ou séries de demonstração no produto.

## Indicadores

| Painel        | Conteúdo                                                                                                                                                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Visão geral   | Vendas, carteira em aberto, orçamentos ativos, produção ativa e atrasada, próximas entregas, pedidos prontos e fila de atenção transversal; resumos financeiros apenas para ADMIN                                                                                                                |
| Comercial     | Solicitações por situação; orçamentos por situação; valor em negociação; propostas a vencer; conversão; tempo até aprovação; vendas por período; ticket médio; clientes recorrentes; produtos mais vendidos; pedidos aguardando entrega; artes pendentes; aprovações pendentes e tempo de espera |
| Produção      | Ordens por etapa; atrasos; fila por prazo; entregas no prazo; duração das ordens; peças boas, falhas e reimpressões; horas comprometidas e capacidade disponível por impressora; demanda sem programação; pedidos próximos da entrega ainda pendentes                                            |
| Estoque       | Saldo físico, reservado e disponível; necessidades das ordens abertas; materiais insuficientes para programação; movimentações; reposição; itens sem movimentação                                                                                                                                |
| Financeiro    | Saldo conhecido; receber/pagar pendente e vencido; entradas e saídas realizadas; vencimentos em 7 e 30 dias; inadimplência; fluxo e saldo projetados; menor saldo no horizonte e necessidades de caixa                                                                                           |
| Rentabilidade | Receita e custos; margem por produto e pedido; previsto versus realizado; resultado por hora de impressão; trabalhos com margem abaixo da referência; cobertura e completude de custos                                                                                                           |

## Semântica e dados

- Período inicial: mês atual até hoje, em America/Sao_Paulo. Atalhos para últimos 30/90 dias e período personalizado. Comparação com janela anterior de mesma duração quando aplicável; sem divisão por zero ou variação fictícia. Estoque, carteira e fila representam posição atual e devem ser rotulados assim.
- Manter as definições existentes para vendas e financeiro; explicar quando contagem por criação difere de confirmação usada em rentabilidade. Não equiparar venda a recebimento, faturamento fiscal ou lucro líquido.
- Conversão por coorte de orçamentos criados no período, convertidos até a consulta; aprovação usa eventos válidos. Mostrar denominador e excluir registros sem evidência temporal dos tempos médios, informando cobertura.
- Recorrência por cliente identificado com venda válida anterior; rankings por quantidade e valor, com itens sem produto identificado separados.
- Entregas no prazo devem usar prazo e entrega efetiva; distinguir entregas parciais de conclusão. Duração de execução usa marcos reais quando disponíveis. Perdas e reimpressões respeitam correções e vínculos dos eventos existentes.
- Carga e capacidade usam calendário e planejamento existentes; distinguir tempo planejado de medido e não somar tempo compartilhado de lote por participante.
- Estoque usa movimentos e reservas vigentes; unidades distintas não são somadas. Reposição é necessidade não coberta pela demanda conhecida. Sem política de estoque mínimo cadastrada, não inventar mínimo ou ponto de pedido. Itens sem movimento exibem última movimentação e permitem ordenar por tempo parado.
- Projeção financeira reutiliza regras existentes, baixas e estornos. Saldo desconhecido permanece desconhecido. Inadimplência mostra saldo vencido e proporção sobre recebíveis pendentes na posição atual.
- Margem e custos reutilizam os serviços de rentabilidade, incluindo cobertura parcial/provisória/indisponível. Resultado por hora exige tempo e custo compatíveis; indicar os componentes incluídos. Sem meta cadastrada, não inventar margem mínima: apresentar margem negativa e ranking de menores margens; referência adicional pode ser filtro informado pelo usuário, sem nova configuração persistente neste escopo.
- Dados insuficientes mostram “Dados insuficientes” e motivo, nunca zero presumido. Todos os indicadores ficam contemplados, mesmo quando precisam informar essa limitação.

## Arquitetura, acesso e limites

Consultar dados e aplicar permissões no servidor. Carregar somente o painel selecionado e os agregados necessários; seleção e período na URL para recarga e compartilhamento. Reutilizar regras de domínio e produzir agregações próprias sem depender da primeira página de listagens ou executar consultas por item indiscriminadamente. Valores monetários mantêm aritmética decimal; conversão para gráfico apenas na apresentação.

ADMIN acessa todos os painéis; OPERATOR recebe somente informações operacionais permitidas. Financeiro, custos protegidos e rentabilidade não podem chegar ao cliente sem autorização. Cada link respeita rotas, filtros e permissões existentes; quando não houver filtro suportado, indicar o destino sem prometer uma seleção exata.

O escopo cobre visual dos dashboards e componentes necessários. Não altera formulários, loja pública, políticas comerciais ou fluxo de produção. Não cria coleta histórica, metas ou política de reposição. Necessidade de novos registros persistentes deve ser apresentada separadamente. Preservar alterações locais já existentes.

## Verificação e aceitação

Todos os indicadores da tabela devem ter resultado real ou estado explícito de insuficiência. Alternância, período, recarga, voltar do navegador e acesso direto devem funcionar. Conferir ADMIN e OPERATOR, períodos vazios, valores zero e negativos, dados parciais, correções, estornos e ausência de comparação.

Validar agregações e comportamento com testes focados; executar typecheck, lint e testes pertinentes. Conferir guias locais de Next antes de codificar. Revisar navegador em desktop e celular, teclado, contraste, tema claro/escuro, zoom 200%, gráficos acessíveis e ausência de overflow da página. Tabelas podem ter rolagem localizada. Registrar limitações de ambiente sem alegar validação que não ocorreu.

## Decisões do implementador

Distribuição interna dos cards e gráficos, quantidade de linhas por tabela, organização dos módulos de consulta e seleção dos exemplos oficiais ficam para implementação. Datas, denominadores, unidade, fonte e cobertura devem ser visíveis em descrições ou ajuda contextual. Nenhuma alteração de preset ou sobrescrita em lote.
