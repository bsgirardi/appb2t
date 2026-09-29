# Entrega 3 — financeiro interno

## Objetivo e acesso

Gerenciar obrigações, entradas, saídas e caixa realizado/projetado da empresa, incluindo os recebíveis originados nas vendas. Segue as [regras compartilhadas](2026-09-29-gestao-interna-index.md) e o [contrato de parcelas](2026-09-29-vendas-orcamentos-design.md).

Páginas `/financeiro` e APIs correspondentes exigem ADMIN no servidor. OPERATOR vê apenas o resumo de recebimento da venda que já pode consultar, sem acesso a contas, caixa, despesas ou relatórios consolidados. Visitante não acessa dados financeiros.

Não há emissão de cobrança, movimentação bancária real, integração externa, escrituração fiscal ou conciliação automática. “Registrar pagamento” informa uma movimentação já realizada fora da aplicação.

## Cadastros

Contas financeiras: nome obrigatório (2–100), tipo caixa/banco/outro, saldo inicial, data do saldo inicial e estado ativo. Saldo inicial pode ser negativo. Não armazenar senhas bancárias, tokens ou credenciais. Uma conta com saldo diferente de zero não pode ser inativada; seu histórico permanece consultável após inativação.

Após existir uma movimentação na conta, saldo/data inicial não são editáveis. Correções são movimentos de ajuste por administrador, com valor, data e justificativa, preservando a trilha histórica. Para corrigir um ajuste, estorná-lo e registrar outro.

Categorias de receita/despesa: nome, tipo e estado ativo. Categorias inativas não podem ser selecionadas em novos lançamentos, mas preservam histórico. A receita de venda usa uma categoria de sistema identificada por código estável, sem depender do nome visível.

Favorecido/contraparte pode referenciar cliente ou ser texto obrigatório para lançamentos avulsos. Não criar um módulo separado de fornecedores nesta entrega.

## Contas a receber e pagar

Reutilizar `FinancialEntry` da entrega 2, com tipo RECEIVABLE/PAYABLE, descrição, contraparte, categoria, valor, vencimento, origem, versão e cancelamento. O valor é positivo e armazenado em duas casas decimais. Não criar uma segunda obrigação quando a origem já é uma parcela de venda.

Recebíveis comerciais mostram número da venda e parcela. Valor, origem e vencimento comercial confirmado não podem ser alterados pela tela de lançamento avulso. Renegociação de venda não faz parte desta entrega; para corrigir documento comercial, usar o fluxo de cancelamento e nova venda, com os estornos necessários.

Lançamentos avulsos podem ser criados individualmente ou em lote parcelado, até 120 parcelas, com distribuição de centavos e datas iguais às regras das vendas. Agrupar as parcelas para consulta, mantendo vencimentos e liquidações individuais.

Permitir editar descrição, contraparte e categoria de lançamentos avulsos com histórico. Valor e vencimento só podem ser alterados quando não houver liquidação vigente. Cancelamento exige saldo recebido/pago líquido zero; com pagamentos vigentes, orientar estorno prévio. Não excluir definitivamente obrigações.

Estados derivados: ABERTO, PARCIAL, LIQUIDADO ou CANCELADO. Atrasado é um indicador adicional para saldo aberto cujo vencimento é anterior à data corrente, inclusive quando parcialmente liquidado. Não armazenar estados derivados de forma que possam contradizer as liquidações.

## Liquidações e estornos

Registrar uma baixa exige obrigação, conta ativa, valor positivo até o saldo restante, data efetiva, meio de pagamento e observação opcional. Meios internos: Pix, dinheiro, cartão, boleto, transferência e outro. O registro não inicia essas operações nos respectivos provedores.

Não aceitar baixa futura; eventos futuros são projeções da obrigação. Não aceitar movimentação anterior à data do saldo inicial da conta. Cada baixa pode ser parcial. A soma de baixas vigentes não pode exceder o valor da obrigação, inclusive sob concorrência.

Cada requisição de baixa possui chave idempotente única por operação. A transação verifica versão/saldo, cria a liquidação e seu movimento de caixa correspondente, e grava histórico. Reenvio com mesma chave e mesmo conteúdo retorna o resultado anterior; conteúdo diferente para a mesma chave gera conflito.

Recebimento aumenta saldo; pagamento diminui saldo. Uma liquidação vincula-se a exatamente um movimento original de caixa, e cada movimento registra conta, valor assinado, data efetiva, autor, criação e origem.

Estorno exige motivo e data efetiva não anterior à baixa e não futura. Cria um movimento inverso ligado ao original; não edita/apaga o movimento original. Uma restrição única impede dois estornos do mesmo movimento. Ao estornar, o saldo em aberto da obrigação aumenta novamente; os relatórios realizados mostram original e reversão nas datas em que ocorreram.

Estornar significa registrar correção/devolução realizada fora do sistema, sem executar reembolso. Quando a conta original estiver inativa e com saldo zero, exigir sua reativação antes do estorno, evitando movimentação silenciosa em conta inativa.

## Transferências e saldo

Transferência interna exige duas contas ativas distintas, valor positivo, data efetiva válida para ambas e descrição. A transação cria uma saída e uma entrada iguais e vinculadas, com chave idempotente. Não classificar transferência como receita/despesa operacional; a soma consolidada das contas não muda.

Uma transferência é estornada como conjunto: reversão dos dois lados na mesma transação, com motivo. Não permitir editar ou estornar isoladamente apenas uma das pernas. Validar reenvio, versões e datas como nas baixas.

Saldo de uma conta em uma data = saldo inicial, quando a data é igual ou posterior à data inicial, mais os movimentos assinados até a data. Para datas anteriores à abertura, informar que não há saldo inicial conhecido, em vez de inventar saldo zero histórico.

O sistema permite saldo negativo em contas ativas, exibindo alerta. Não bloquear pagamento apenas por saldo cadastrado insuficiente, pois o registro representa um fato externo. Não há operação de crédito ou saldo bancário consultado automaticamente.

## Painel e relatórios

Painel com saldo consolidado das contas ativas, recebíveis pendentes/vencidos, obrigações a pagar pendentes/vencidas, entradas e saídas realizadas no período. Identificar claramente previsto versus realizado e a data de referência.

Fluxo realizado: movimentações efetivas por dia, conta e categoria, com transferências apresentadas separadamente e estornos visíveis. Saldos de contas inativas continuam disponíveis nos filtros históricos; valores históricos não desaparecem por inativar conta/categoria.

Fluxo previsto: partir do saldo atual na data de referência e somar recebíveis menos pagamentos ainda abertos por vencimento. Obrigações já vencidas aparecem em um bloco “Vencidos”, considerado no saldo projetado inicial; não somar novamente a parcela já liquidada. Transferências não são projetadas por obrigações comerciais.

Filtros por período, conta, categoria, tipo, situação e contraparte, com paginação padrão 25 e máximo 100. Totais de resumo consideram todos os resultados filtrados, não apenas a página atual. Listagem e totais devem refletir a mesma leitura consistente do banco.

Exportar CSV com os mesmos filtros, decimais e datas legíveis em português. Neutralizar células textuais iniciadas por caracteres de fórmula de planilha. Exportação limitada a 10000 registros por solicitação; orientar reduzir o período se exceder, sem truncar silenciosamente.

## Histórico, consistência e dados

Adicionar FinancialAccount, FinancialCategory, Settlement, CashMovement e FinancialAuditEvent; estender FinancialEntry sem quebrar os recebíveis existentes. Identificar movimentos de abertura/ajuste, recebimento, pagamento, transferência e estorno por tipo e relações explícitas.

Não manter saldos editáveis como fonte de verdade. Derivar saldo por agregação dos movimentos; se houver resumo persistido futuramente, ele precisará ser reconciliável com esse histórico. Usar Decimal no domínio e Numeric no banco, sem somar moeda com ponto flutuante JavaScript.

Auditoria registra autor, data, ação, entidade e mudanças relevantes. Sem endpoint para apagar histórico. Alterações e estornos exigem autenticação válida e verificação do estado no servidor; ocultar botão não é autorização suficiente.

Para manter vendas e financeiro consistentes, bloqueios/transações serializam baixa, estorno e cancelamento da mesma venda/obrigação. Cancelamento não pode competir com uma baixa e produzir venda cancelada com recebimento vigente. Uma falha em qualquer gravação desfaz os efeitos da operação inteira.

## Aceitação

- Recebíveis de vendas aparecem uma única vez; confirmar venda não aumenta caixa.
- Baixas parciais reduzem saldo aberto e movimentam a conta correta; excesso e concorrência são recusados.
- Reenviar baixa/transferência não duplica dinheiro; reutilizar chave com conteúdo diferente gera conflito.
- Estorno preserva original, cria movimento inverso, reabre obrigação e não pode ser aplicado duas vezes.
- Cancelamento de venda e recebimento concorrentes nunca deixam estados contraditórios.
- Transferência muda os saldos individuais sem mudar o consolidado e é estornada atomicamente.
- Datas futuras e anteriores à abertura são recusadas para movimentos; projeção trata vencidos e parcelas parcialmente liquidadas corretamente.
- Saldo negativo é permitido com alerta; saldo inicial não muda depois de movimentações.
- Relatórios filtrados e exportação concordam com os movimentos; proteção contra fórmulas CSV testada.
- OPERATOR/visitante não acessam financeiro diretamente; histórico não pode ser apagado pela API.
- Testar arredondamento, limites monetários, viradas de data, autorização, rollback, idempotência e concorrência com PostgreSQL real.
- Conferir interface nos dois temas e tamanhos; executar testes, typecheck, lint, build, Docker e persistência após reinício.

Revisão interna: obrigações separadas de caixa, estornos rastreáveis, integração comercial sem duplicação, resumo histórico e projeção definidos. Não há integração financeira externa implícita.
