# U2 — Estoque integrado de materiais e insumos

Data: 06/10/2026. Estado: especificação para revisão; regras de negócio principais aprovadas na conversa. Não implementado.

## 1. Objetivo e contexto

Permitir à equipe da B2T saber quanto material existe, quanto está comprometido e o que precisa comprar, conectando recebimentos ao financeiro existente. Preservar a precificação V1/V2, os documentos comerciais e as permissões financeiras. O módulo será a base para as ordens de produção U3; não cria ordens nesta entrega.

O repositório possui Material, PricingExtra, Sale e FinancialEntry, mas não possui razão de estoque. Materiais têm preço por kg/litro; complementos de precificação podem representar tanto objetos físicos quanto serviços. O financeiro já oferece contas a pagar, parcelas, baixas, estornos, categorias e controle de concorrência. Esses mecanismos serão reutilizados.

## 2. Decisões confirmadas e escolhas de desenho

Confirmado pelo usuário:

- Modelo híbrido: saldo por material/insumo e identificação opcional de rolo, frasco ou lote.
- ADMIN e OPERATOR podem movimentar e deixar saldo negativo mediante justificativa.
- Método de custo por item: média ponderada ou referência manual; configuração exclusiva de ADMIN.
- Preços comerciais e cálculos históricos não mudam automaticamente.
- Recebimento físico libera material imediatamente. ADMIN confirma os dados financeiros e gera parcelas a pagar ou vincula lançamento existente. Recebimento por OPERATOR fica pendente dessa confirmação.
- Estoque inicial, devoluções e ajustes não geram contas a pagar.

Escolhas propostas nesta especificação, sujeitas à revisão do documento: unidade base fixa por item; uma única localização de estoque; reservas manuais por item da venda; identificação de fornecedor em texto; custo médio móvel com cobertura cronológica de déficits; bloqueio de edição livre de obrigações vinculadas. Não são decisões adicionais atribuídas ao usuário.

Alternativas consideradas: saldo agregado sem rastreabilidade seria mais simples, mas perderia a identificação opcional aprovada; controle obrigatório por embalagem aumentaria o trabalho em todos os recebimentos. O modelo híbrido mantém o total como referência e permite detalhamento quando útil.

## 3. Itens, unidades e inventário inicial

StockItem é uma extensão de um Material existente ou um insumo físico. Um material só pode ter uma extensão de estoque. Insumo pode ter vínculo opcional e único com PricingExtra; serviço não movimenta estoque. Não copiar materiais para um cadastro concorrente.

- FDM: grama; resina: mililitro; demais insumos: unidade, grama ou mililitro, escolhidos pelo administrador.
- Formulário permite kg/litro e converte explicitamente para g/ml. Não há conversão massa/volume nem conversão de embalagens sem quantidade declarada.
- Quantidades e custos usam Decimal, até seis casas; unidades contáveis são inteiras. Dinheiro financeiro usa centavos e o arredondamento já existente.
- Unidade e vínculo de material ficam imutáveis após o primeiro movimento. Alterar tecnologia do material também é recusado se incompatível com estoque existente.
- Habilitar controle não inventa estoque zero. Estado inicial é “Não inventariado”; movimentos ficam indisponíveis até ADMIN registrar contagem inicial, inclusive zero, e custo inicial quando necessário.
- Custo médio exige valor inicial do estoque quando a contagem for positiva; custo manual exige referência vigente. Zero é aceito somente explicitamente, com indicação de material sem custo.
- Data efetiva é registrada, mas a ordenação de valorização segue a sequência de lançamento. Não recalcular o passado por lançamento retroativo. Datas futuras são recusadas; datas anteriores exigem justificativa.

## 4. Razão, saldos e rastreabilidade híbrida

Cada movimento registra item, quantidade assinada, tipo, origem, data efetiva, instante do lançamento, responsável, justificativa, método/custo vigentes, chave de operação e eventual movimento compensado. Movimentos confirmados não são editados nem excluídos.

Tipos: inventário inicial, recebimento de compra, consumo, perda, devolução de consumo, devolução ao fornecedor, ajuste positivo/negativo e compensação. Reservas têm razão própria: não são movimento físico.

Físico = soma dos movimentos; reservado = saldo das reservas abertas; disponível = físico − reservado. Falta a repor = máximo entre zero e o negativo do disponível. A mesma falta não é somada novamente por reserva e consumo.

Um movimento pode distribuir quantidade entre identificações existentes e um grupo “Sem identificação”. O total das distribuições deve coincidir com a quantidade do movimento; saldo agregado deve coincidir com a soma dos grupos. Identificações são únicas dentro do item, não são novos materiais e não têm método de custo independente.

Saldo físico ou disponível pode ficar negativo. Toda operação que crie ou agrave saldo negativo exige justificativa de 3–2.000 caracteres, inclusive reservas. Saldo negativo em um grupo identificado exige a mesma regra e aparece no detalhe, mesmo se o total agregado for positivo. Uma operação que apenas reduza a falta não exige justificativa adicional de negativo.

ADMIN e OPERATOR registram recebimentos, reservas, consumo, perda e devolução de consumo. Inventário inicial, ajustes de contagem, devolução ao fornecedor e compensações corretivas ficam com ADMIN como escolha de controle proposta. Ambas as funções continuam autorizadas ao negativo nas operações permitidas.

## 5. Reservas e vendas

Reserva manual referencia StockItem e a identidade estável da linha de Sale. Somente vendas confirmadas ou em produção aceitam novas reservas. Quantidade é de material, não a quantidade de peças da venda.

A ficha V2 pode sugerir necessidade, mas não cria reserva automaticamente. O usuário revisa unidade, material, desperdício fixo e quantidade. Sem ficha completa, a reserva pode ser informada manualmente. Não reservar embalagem automaticamente por texto ou nome de complemento.

Consumo vinculado a reserva reduz o físico e libera, na mesma transação, a quantidade correspondente da reserva. Consumo superior à reserva exige confirmação da quantidade excedente e a justificativa de negativo quando aplicável. Reserva parcial e consumo parcial preservam o restante.

Cancelar venda libera suas reservas restantes de forma atômica; não devolve material já consumido. Concluir entrega com reserva aberta exige resolução explícita (consumir ou liberar); não realizar baixa silenciosa. A integração respeita as transições de venda existentes e não cria recebíveis adicionais.

Exemplo: físico 1.000 g; reservar 1.200 g resulta em reservado 1.200 g e disponível −200 g, com justificativa. Consumir 300 g dessa reserva resulta em físico 700 g, reservado 900 g e disponível −200 g. Receber 500 g resulta em físico 1.200 g, reservado 900 g e disponível 300 g.

## 6. Valorização e estoque negativo

### Referência manual

ADMIN define custo por unidade base. Entradas guardam valor de compra, mas não mudam a referência automaticamente. Cada consumo preserva a referência vigente. Mudar a referência afeta apenas novos movimentos. Déficit físico continua sinalizado, mas não altera retroativamente o custo manual confirmado.

### Média ponderada móvel

Para saldo positivo Q com valor V, entrada q com valor v resulta em média (V + v) / (Q + q). Saídas conhecidas usam a média vigente. Exemplo: 1.000 g por R$ 100,00 mais 500 g por R$ 75,00 resulta em R$ 175,00 / 1.500 g; consumo de 300 g corresponde a R$ 35,00. Não arredondar o custo unitário em centavos antes da multiplicação.

O déficit não entra como quantidade negativa no denominador da média. A parte consumida sem cobertura fica provisória, com estimativa pela última média conhecida ou sem custo conhecido se não houver referência. Ausência de referência nunca equivale a custo zero.

Entradas cobrem déficits em ordem de lançamento. A parcela que cobre falta é valorizada ao custo unitário dessa entrada; registrar reconciliação ligada ao consumo, preservando seu valor provisório original. Somente o restante da entrada participa do estoque positivo e da nova média. Cobertura parcial mantém o restante provisório. Não reescrever memórias V2 ou resultado financeiro do passado.

Exemplo: sem saldo, consumo de 200 g estimado a R$ 0,10/g. Entrada posterior de 500 g a R$ 0,12/g cobre os 200 g por R$ 24,00 e registra diferença de R$ 4,00; sobram 300 g por R$ 36,00. A diferença é memória de valorização, não pagamento ou lançamento duplicado de despesa.

Recebimento de operador cujo custo de compra ainda não foi confirmado libera quantidade e mantém valorização provisória. ADMIN confirma valores posteriormente; reprocessar a cadeia de valorização afetada por meio de revisões/apurações, sem mudar os eventos físicos originais. Enquanto houver custo pendente nessa cadeia, mostrar média e consumos dependentes como provisórios. Não publicar uma média definitiva calculada ignorando a entrada sem valor.

Devolução de consumo exige referência ao consumo original, limite da quantidade líquida consumida e custo original/reconciliado. Devolução ao fornecedor referencia recebimento e não pode ultrapassar sua quantidade líquida; impactos de valorização ficam em revisão auditável. Déficits gerados seguem a regra de justificativa.

ADMIN pode trocar método apenas quando não houver déficits ou valorização pendente. Registrar motivo, custo de abertura do novo método e instante de vigência; movimentos anteriores preservam o método usado. A quantidade física não muda.

## 7. Recebimento e financeiro

PurchaseReceipt representa um recebimento físico com fornecedor, documento opcional, linhas de estoque e estado financeiro separado. Fornecedor é identificação textual nesta etapa, sem cadastro paralelo de clientes. Linhas físicas confirmadas são imutáveis; correções usam compensação referenciada.

OPERATOR informa fornecedor/documento e quantidades; não lê valores financeiros, parcelas, saldos bancários ou detalhes de baixa. A confirmação física cria uma pendência visível ao ADMIN. O operador vê apenas “Aguardando conferência” ou “Conferido”.

ADMIN pode confirmar físico e financeiro juntos, ou concluir uma pendência. Informa custo por linha, descontos/acréscimos alocados, total do documento, categoria de despesa e parcelas com vencimento. Soma das parcelas deve ser igual ao total. Custo alocado às linhas deve fechar esse mesmo total; usar distribuição determinística dos centavos. Entrega inicial não inclui créditos fiscais ou cálculo tributário.

Na confirmação, escolher:

1. Gerar novas contas a pagar no FinancialEntry existente, com vínculo de origem e grupo de parcelamento. Não criar baixa nem CashMovement.
2. Vincular obrigação ou grupo existente, de natureza PAYABLE, não cancelado e ainda não vinculado a outro recebimento. Total e identificação da contraparte devem ser conferidos. Grupo inteiro é vinculado; alocação parcial e uma fatura para múltiplos recebimentos ficam fora desta versão.

Pagamento já registrado pode ser vinculado por ADMIN se todos os critérios forem satisfeitos; não repetir baixa. Para compra paga sem registro, primeiro gerar a obrigação e depois usar a baixa financeira existente.

Confirmar novamente com a mesma chave e dados retorna a mesma operação. Chave repetida com conteúdo diferente gera conflito. Duas confirmações concorrentes não podem criar dois grupos financeiros. Confirmação e vínculo devem ser atômicos; falha mantém a pendência intacta e não repete a entrada física.

Após vínculo, edição/cancelamento genérico do principal da obrigação é bloqueado e encaminhado à origem; pagamento e estorno seguem o financeiro existente. Cancelar integralmente recebimento confirmado exige ADMIN, motivo, nenhuma baixa vigente e nenhuma dependência de consumo/valorização: compensar físico e cancelar obrigações na mesma transação. Se houver dependências, orientar devolução/correção referenciada, sem apagar histórico. Devolução física não cancela automaticamente dívida; ADMIN registra o ajuste financeiro explícito, e baixas vigentes exigem tratamento pelo fluxo de estorno existente. A interface destaca pendência financeira da devolução até resolução.

Inventário inicial, ajustes e devoluções não geram automaticamente conta a pagar. O estoque não lança despesas de consumo no financeiro; comprar, consumir e pagar são eventos distintos.

## 8. Interfaces, permissões e integração técnica

Nova área Estoque: visão consolidada, filtros por item/negativo/pendências, detalhe por identificação, razão e ações permitidas. Visões Recebimentos, Reservas e Reposição; pendências financeiras e valorização apenas para ADMIN. Interface em português e utilizável em 390 px, com rascunho preservado em erro.

Entidades propostas: StockItem, StockIdentity, StockMovement, StockMovementAllocation, StockReservation e seus eventos, StockValuationRevision/Allocation, PurchaseReceipt, PurchaseReceiptLine e ligação de recebimento a FinancialEntry. Nomes e campos finais serão definidos no plano de implementação. Restrições de unicidade devem proteger vínculos de material, operações e parcelas geradas.

Serviços devem reutilizar autenticação, autorização, AppError, Decimal, versionamento, datas civis de São Paulo e transações existentes. Ordem de locks determinística por item/recebimento/venda para operações múltiplas. Saldos conferidos sob lock, não somente no navegador. Banco e eventos determinam saldo; qualquer cache de saldo precisa ser atualizado na mesma transação e reconciliável pelo razão.

Todas as mutações têm chave idempotente, hash do comando e controle de versão. Não aceitar custo calculado arbitrariamente pelo cliente. Paginação e limites explícitos; no plano, limitar recebimento a 100 linhas e parcelamento aos 120 já suportados. API pública, catálogo e impressão comercial não recebem custos, estoque interno ou pendências financeiras. Operador não ganha acesso aos endpoints de financeiro existentes.

A calculadora conserva seu próprio preço de referência. ADMIN poderá aplicar explicitamente o custo de estoque ao cadastro, com conversão de g→kg ou ml→litro, mostrando valor anterior/novo e impedindo aplicação de custo desconhecido/provisório. Essa operação incrementa a versão do cadastro e não altera produto, orçamento ou venda já gravados.

## 9. Escopo e implantação

Incluído: inventário inicial, movimentos, identificação opcional, reservas manuais por venda, alertas de falta, dois métodos de custo, reconciliação de déficit, recebimentos e contas a pagar vinculadas.

Fora: múltiplos depósitos, transferência física entre unidades, ordens de compra/aprovação de compras, emissão fiscal, integrações bancárias, automação com fatiador, estoque de produtos acabados, ordens de produção, custo real consolidado por pedido e rentabilidade U4. A lista de reposição orienta compras; não envia pedido ao fornecedor.

Migração aditiva, sem inventar saldos ou converter todo PricingExtra em insumo. Registros anteriores permanecem legíveis. Testes usam banco isolado. Produção só recebe módulo após validação da entrega e etapa de implantação com backup restaurável, ensaio de migração e comparação de dados existentes. A autorização anterior de publicar U1 não é tratada como publicação automática deste módulo ainda não implementado.

## 10. Aceite verificável

1. Habilitar material não o marca como contado; inventário inicial explícito diferencia zero de desconhecido.
2. Quantidade agregada coincide com distribuições identificadas; entrada mista funciona sem dupla contagem.
3. Conversões kg/g e litro/ml preservam quantidade e custo; massa/volume incompatíveis são recusados.
4. Operador cria saldo negativo com motivo; sem motivo há erro e nenhum movimento parcial.
5. Reserva de 1.200 g, consumo de 300 g e entrada de 500 g reproduzem o exemplo de saldos da seção 5.
6. Reenvio e concorrência não duplicam entrada, reserva, consumo, parcelas ou liberação no cancelamento.
7. Média ponderada reproduz R$ 35,00 no exemplo; referência manual não muda por compra.
8. Déficit é coberto parcialmente e integralmente com reconciliação auditável; nenhuma divisão por zero ou custo fictício zero.
9. Recebimento sem custo confirmado mantém a cadeia de custos provisória; confirmação posterior preserva eventos e revisa a valorização corretamente.
10. ADMIN gera parcelas cujo total fecha com a compra; OPERATOR recebe material sem acesso a valores financeiros nem criação direta de dívida.
11. Vincular obrigação existente não duplica pagamento nem parcela; conflito de valor/origem é recusado atomicamente.
12. Cancelamentos/devoluções respeitam consumos e baixas existentes, conservando trilha e pendências explícitas.
13. Mudança do método de custo respeita pendências e não regrava passado; atualização da calculadora é explícita.
14. Falhas de rede preservam rascunhos; permissões valem no servidor; detalhes privados não aparecem publicamente.
15. Migração mantém produtos, imagens, documentos, movimentos financeiros e memórias V1/V2; fluxos comerciais e financeiros anteriores continuam aprovados.

## 11. Revisão e próxima etapa

Auto-revisão realizada contra as decisões da conversa, plano diretor, esquema e serviços financeiros atuais. A especificação separa quantidade, valorização e pagamento; inclui as duas formas de custo e não pressupõe estoque positivo. As restrições adicionais de operação estão identificadas como escolhas de desenho para revisão.

Próximo passo: revisão desta especificação pelo usuário; depois, plano de implementação por etapas com contratos, migração, testes de concorrência e critérios de implantação. Esta entrega documental não altera código, banco ou aplicação em uso.
