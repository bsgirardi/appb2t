# U4 — abertura de rentabilidade operacional

Data: 09/10/2026. Base examinada: `edd0afc`.

Status: recorte recomendado aprovado pelo usuário em 09/10/2026. Este documento registra o diagnóstico e a abordagem; o detalhamento está em `2026-10-09-rentabilidade-u4-design.md`, sujeito à revisão própria. Não constitui plano de execução.

## Objetivo

Permitir ao ADMIN comparar custo previsto, custo realizado e contribuição por pedido, produto e canal, preservando documentos comerciais, recebíveis e rastreabilidade. Informação ausente deve permanecer indisponível, nunca virar custo zero ou lucro integral.

## Evidência de partida

- U1: `src/server/pricing/document-costs.ts` mantém vínculos de linhas com snapshots e revisões congeladas. Vínculos desatualizados são identificados como STALE.
- `src/domain/pricing/calculate.ts` separa custos variáveis, taxas, contribuição e resultado após depreciação. A comparação deve conservar essas definições e explicitar suas premissas.
- U3: `src/server/production/costs.ts` e `src/domain/production/costs.ts` registram componentes, cobertura, valores provisórios, perda sem peças boas e alocações por origem. Custos podem mudar após entrega por revisão de valorização.
- `Sale` mantém documento, totais, itens, snapshots e vínculos financeiros. Desconto e frete cobrado já integram os totais comerciais; não há campo próprio de canal efetivo nesse modelo.
- Canal existente pertence à memória de precificação. Canal utilizado para simular preço não comprova o canal efetivo da venda.
- `docs/VALIDACAO.md` registra publicação do U3 em 09/10/2026. Os 404 testes ali registrados são evidência histórica; não foram reexecutados nesta abertura.
- Árvore de trabalho limpa antes desta documentação. Não houve inspeção de dados operacionais nem alteração de banco.

## Alternativas

1. **Consulta com custos já existentes:** menor esforço, mas taxas e frete efetivos continuam desconhecidos; serve como visão parcial, não entrega todo o comparativo U4.
2. **Consolidação com complementos auditáveis — recomendada:** reutilizar U1/U3 e acrescentar declaração administrativa de canal efetivo, taxas, frete e custos complementares ainda não representados. Permite distinguir estimativa de realizado sem reconstruir o financeiro.
3. **DRE completa e devolução comercial integrada:** amplia reconhecimento por período, despesas fixas e estornos comerciais; exige contratos adicionais e aumenta substancialmente esta entrega.

## Recorte recomendado para especificação

### Visão do pedido

Apresentar receita negociada (subtotal menos desconto mais frete cobrado), custo produtivo previsto e realizado, taxas, frete pago, contribuição operacional e resultado após depreciação. Recebido e a receber são informações financeiras separadas, não receita adicional.

Usar a receita negociada como base do comparativo previsto versus realizado; manter visível o preço sugerido original apenas como referência. Nunca reutilizar diretamente a contribuição calculada sobre preço sugerido como contribuição da venda negociada.

Contribuição operacional segue a convenção U1: receita menos custos produtivos sem depreciação, encargos comerciais e frete pago. Resultado após depreciação deduz também a depreciação produtiva. Nenhum deles será chamado de lucro líquido. Mão de obra e manutenção mantêm as premissas U1/U3; sua presença não implica desembolso individual do pedido.

Taxas efetivas substituem estimadas no realizado, sem soma duplicada. Ausência de taxa, frete ou custo complementar exige declaração explícita de zero/não aplicável; campo vazio significa desconhecido. Complementos precisam de categoria, origem, responsável, data, justificativa e correção rastreável, com proteção contra repetição e concorrência. Não geram pagamentos nem recebíveis.

### Cobertura e produção

Mostrar estados separado de indisponível, parcial, provisório e completo, com motivos por componente. Um custo conhecido parcial pode ser exibido, mas não habilita contribuição realizada completa. Pedidos em andamento não comparam receita integral com apenas o custo das primeiras peças como se estivessem encerrados.

Consumir os vínculos e as alocações U3, evitando atribuir todo o custo de uma ordem de estoque a uma única venda. Peças legadas sem custo conservam a lacuna. Perdas já absorvidas no custo das peças boas não são deduzidas novamente; perdas de ordens sem peças boas precisam de atribuição explícita ou apresentação separada como perdas não atribuídas.

Compras, consumo e pagamentos são eventos distintos: somente o custo pertinente entra no resultado. Embalagens e outros extras previstos em U1 exigem identificação de sua cobertura efetiva em U3 ou complemento, impedindo dupla contagem.

### Produto, canal e período

Consolidar por identidade estável de produto; linhas livres aparecem em grupo próprio. Canal efetivo deve ser informado pelo ADMIN e versionado; sem informação, usar “Não informado”, sem inferir pelo cliente ou pelo snapshot de precificação.

Descontos e encargos de pedido necessitam de rateio determinístico, com resíduo explícito, conservando o total do pedido. O detalhamento deve fechar base de rateio, tratamento de linhas gratuitas e taxas com bases diferentes.

Recomenda-se começar com coorte de vendas por data de confirmação e resultado acumulado atualizado dessa coorte. Rotular claramente essa base temporal: não é DRE por competência nem relatório de recebimentos do período. A especificação deverá confirmar a fonte histórica da data de confirmação e o tratamento quando ela estiver ausente.

Totais devem mostrar quantos pedidos e qual receita têm cobertura completa. Margem agregada usa soma de contribuições dividida pela receita do mesmo conjunto coberto; não usa média simples de percentuais nem mistura bases com cobertura diferente.

### Interface e permissões

Área de rentabilidade restrita a ADMIN, com filtros, resumo de cobertura, lista de pedidos e detalhamento da memória de cálculo. Produto e canal são agrupamentos do mesmo conjunto de dados. Exibir data de atualização e revisões utilizadas; preservar rascunho em erro. Validar computador e celular. APIs públicas e respostas OPERATOR não recebem custos.

### Limites propostos

Despesas fixas de período, DRE completa, projeções e metas ficam fora desta primeira entrega. Devolução comercial/financeira não será criada implicitamente: correção de entrega U3 não comprova reembolso ou redução da receita. Pedidos cancelados e casos de devolução devem aparecer com tratamento explícito e não compor silenciosamente indicadores de vendas normais. A especificação deve fechar esse tratamento antes da implementação.

## Casos de referência para o aceite

1. Receita negociada R$ 200, custos produtivos sem depreciação R$ 80, taxas R$ 10, frete pago R$ 20 e depreciação R$ 5: contribuição R$ 90; resultado após depreciação R$ 85. Frete cobrado já está contido nos R$ 200.
2. Taxa efetiva não informada: contribuição realizada indisponível, mesmo com produção concluída; informar zero explicitamente resolve apenas essa lacuna.
3. Duas vendas atendidas pela mesma origem: custos alocados fecham com a origem sem duplicar seu total.
4. Entrega parcial, perda e reimpressão: cobertura não encerra prematuramente; perdas não são contadas duas vezes.
5. Valorização confirmada após entrega: revisão atualiza realizado e preserva a referência da consulta anterior e os documentos comerciais.
6. Histórico sem snapshot, estoque legado e canal desconhecido: aparecem como lacunas, sem criação de fatos retroativos.
7. Permissões, repetição de comando, concorrência, arredondamento e rateio: testes específicos impedem vazamento ou duplicação.

## Sequência de continuidade

Revisar o recorte recomendado; fechar regras de período, rateios, cobertura, cancelamentos e complementos na especificação U4; preparar o plano de implementação; executar em isolamento com testes unitários e integração em banco separado, tipos, lint, build e inspeção visual. Se houver migração, ensaiar preservação e recuperação antes de publicação.
