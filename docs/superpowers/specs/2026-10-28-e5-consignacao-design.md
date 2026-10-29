# E5.1 — Ciclo completo de lojas parceiras e consignação

Data: 28/10/2026. Estado: desenho aprovado pelo usuário, incluindo as condições propostas; plano de implementação preparado separadamente. Aprovação do desenho não é autorização de PR, merge ou publicação.

## Intenção e decisões

Permitir à equipe rastrear remessa → custódia → venda/devolução/perda → comissão → acerto, reaproveitando estoque pronto, comercial, financeiro e rentabilidade. Remessa não é venda nem receita; fechamento do acerto não é recebimento de dinheiro.

O usuário escolheu o ciclo completo em uma entrega e confirmou necessidade dos dois modelos: loja retém comissão e repassa o líquido; B2T recebe o total e paga comissão separadamente. A alternativa de custódia primeiro foi apresentada e não escolhida. Ela reduzia a superfície de integração, mas adiava justamente a operação comercial que o usuário quer nesta entrega.

As decisões abaixo são propostas técnicas/comerciais para aprovação do desenho, não preferências já expressas pelo usuário: parceiro como devedor do repasse em ambos os modelos; um local por parceiro; comissão percentual; preço efetivo informado por venda; condições congeladas na confirmação da venda; acerto como agrupamento dos títulos já existentes. Recebimento direto de cada consumidor pelo B2T, com consumidor como devedor, não está incluído. Se necessário, altera o contrato de contraparte antes da implementação.

## Base e limites

Main local/remota conferidas em `7fe37d9`, versão 1.10.1. E1.1–E4.1 integradas; etapas amplas parciais. Fontes e inspeção estão na [proposta inicial](2026-10-28-e5-consignacao-proposta.md), preservada como histórico e superada por esta escolha de ciclo completo.

`StockItem` é insumo/complemento; peças prontas estão em `FinishedStock`/`FinishedOrigin`/`FinishedMovement`. Compromissos e entregas atuais exigem venda. Confirmar venda cria parcelas/recebíveis pelo total. Financeiro já possui títulos, baixa parcial, estorno e auditoria. Projeções de custos usam compromissos/entregas e tipos específicos de perda: não basta adicionar uma tela de saldos.

Sem portal externo do parceiro, mensagens automáticas, pagamento online, documento fiscal, transferência entre parceiros, balcão/feira ou múltiplas filiais. Venda de kits compostos e personalizados sem identidade física inequívoca fica fora. Nenhuma dependência de próximos incrementos E1–E4. Sem publicação, atualização de contêineres, migração operacional, PR ou merge autorizados nesta etapa.

## Parceiro e condições

Parceiro próprio vinculado obrigatoriamente a um Customer existente, sem duplicá-lo silenciosamente. Um Customer só pode representar um parceiro; vínculo não transferível após criação. Nome/contatos/endereço vêm do cliente e ficam congelados nos documentos confirmados. Cadastro inclui local, responsável interno ativo, estado ativo/inativo, periodicidade mensal e dia de vencimento de 1 a 28, comissão percentual entre 0 e 100 com até quatro casas, modelo RETIDA ou SEPARADA e observações privadas. Comissão zero e 100% são válidas e não produzem título de valor zero.

Inativação bloqueia novas remessas e novos rascunhos de venda; permite registrar vendas de estoque já recebido, devoluções, perdas, fechar acertos e resolver pendências. Cliente inativo segue a mesma política de resolução, com sua identidade histórica disponível. Não excluir registros com histórico. Remessa/venda já confirmada não muda se cadastro, preço de catálogo, responsável ou condições forem editados depois.

Percentual é padrão do parceiro e pode ter substituição por produto; na venda, ADMIN pode revisar percentual/modelo/preço com motivo antes de confirmar. Não há mistura de modelos dentro da mesma venda: dividir em vendas distintas. OPERATOR prepara rascunho; ADMIN confirma valores e venda. A escolha de taxa e modelo efetivos é congelada por linha e documento na confirmação, exibida na conferência.

## Custódia e origem física

Reutilizar origens de estoque pronto e manter razão de custódia vinculado a elas. `FinishedStock` continua representando o local interno; o consolidado novo soma explicitamente interno + trânsito de ida + parceiro + trânsito de retorno. Reservado é subconjunto do interno e não parcela adicional do total. Remessas preservam origem/custo; não criar estoque paralelo por ajuste manual.

Proposta de persistência aditiva: Partner, PartnerProductCondition, ConsignmentShipment/Line/OriginAllocation, ConsignmentEvent/Allocation, ConsignmentSale/Line/OriginAllocation, ConsignmentStatement/Line, ConsignmentFinancialLink e ConsignmentCommand, com nomes finais a cargo do implementador. Vínculos financeiros e alocações confirmadas exigem FK/unique apropriadas. Não tornar compromisso de venda existente em compromisso fictício de consignação.

Rascunho de remessa não reserva. Expedição valida produto ativo, estoque ativo/inventariado, inteiros positivos e origem livre/compatível; exclui peças comprometidas ou exclusivas de outra venda ainda não liberadas. Saída interna usa tipo explícito de transferência, nunca LOSS/ADJUSTMENT_OUT/DELIVERY. Cria trânsito de ida na mesma transação e incrementa revisão do estoque e do planejamento.

Recebimento interno de conferência informa quantidade, data civil, nome de quem recebeu e observação; admite parcial. Excedente é rejeitado, pendente permanece no trânsito. Não implica prova externa automática. Retorno pode partir do parceiro ou do trânsito de ida (recusa/cancelamento de transporte); entra no trânsito de retorno e só libera estoque interno após conferência. Preserva a origem e não adiciona novo custo de abertura.

Perda pode ocorrer em qualquer estágio externo, inclusive retorno; ADMIN informa estágio, quantidade, data e motivo. Reduz apenas aquele saldo e não cobra parceiro automaticamente. Remessa não pode ser cancelada apagando saída já expedida: resolver por retorno/perda. Rascunho pode ser cancelado sem movimentos.

Correções físicas são compensações auditadas: recebimento só pode ser desfeito se suas peças não tiverem venda/retorno/perda dependente; venda se corrige pelo fluxo comercial abaixo; conferência de retorno só se desfaz se as peças internas ainda estiverem livres na mesma origem; perda só pode ser desfeita com justificativa e recomposição do estágio de origem. Quantidades de compensação não excedem o evento líquido. Para os demais fatos, reverter dependentes em ordem inversa antes da compensação. Não editar quantidade confirmada em lugar.

## Venda efetiva e comercial

Venda só consome peças confirmadas no parceiro, alocadas por remessa e origem. Informar data efetiva, referência do relatório da loja (obrigatória, única por parceiro), linhas de produto, quantidades, preço unitário praticado e observação. Sem frete/desconto global neste recorte: preço unitário efetivo já expressa negociação. Não há consumidor final obrigatório nem dados pessoais inventados: o Customer é o parceiro.

Confirmação ADMIN atômica cria uma Sale existente por ConsignmentSale, com marcador explícito de origem/atendimento CONSIGNMENT, itens, snapshot e status ENTREGUE. Evento comercial de confirmação registra data efetiva e autoria; consultas de consignação usam a data civil informada, sem reescrever createdAt. Rotas normais de edição, produção, reserva, entrega, cancelamento, orçamento, checkout e oportunidades devem rejeitar comandos incompatíveis com esse marcador. Reutilizar cálculo de totais e snapshots; extrair helpers transacionais necessários. Não chamar confirmação atual sem adaptação: ela produziria recebível bruto indevido no modelo retido.

Consumo da venda ocorre no razão do parceiro e cria alocação de custo contra a origem. Não há nova saída interna, compromisso U3 nem entrega produtiva fictícia. Repetição do relatório ou da chave não pode duplicar Sale, consumo ou títulos. Vendas não ficam editáveis depois da confirmação.

## Comissão e obrigações

Valores monetários com duas casas; quantidades inteiras. Base de comissão = quantidade × preço unitário efetivo, sem impostos/frete/taxas presumidos. Comissão de cada linha = bruto da linha × percentual / 100, arredondamento decimal HALF_UP para centavos; totais são soma das linhas. Não usar ponto flutuante. Cada título e acerto guarda as linhas/fontes que explicam o valor.

- RETIDA: bruto 100, comissão 20 → receita comercial bruta 100, comissão 20, título RECEIVABLE de 80 contra o parceiro. Não criar PAYABLE de 20 nem movimento fictício para marcar retenção como dinheiro pago.
- SEPARADA: bruto 100, comissão 20 → RECEIVABLE de 100 contra parceiro e PAYABLE de 20 a ele. Receber 100 e pagar 20 são baixas distintas, parciais permitidas; não compensar automaticamente e não presumir que pagar depende de receber.

Títulos nascem na confirmação da venda efetiva, nunca na remessa nem no fechamento do acerto. Vencem no dia configurado do mês seguinte à data efetiva; configuração e vencimento congelados. Título líquido zero é representado pela origem comercial e comissão, sem FinancialEntry zero. Acerto informa bruto, comissão, repasse devido, recebido, pago e pendente separadamente.

Sale mantém total bruto; vendas E5 não usam SaleInstallment para simular que líquido é igual ao bruto. ConsignmentFinancialLink vincula diretamente a Sale/ConsignmentSale e cada FinancialEntry com papel REPASSE ou COMISSAO, único por venda/papel. Um título por papel com valor positivo, sem parcelamento contratual neste recorte; baixas parciais continuam possíveis. Resumos e consultas que hoje descobrem títulos somente por SaleInstallment devem resolver a origem E5 explicitamente. Categorias de repasse/comissão possuem códigos de sistema próprios, para não apresentar repasse líquido como faturamento bruto nem comissão retida como pagamento de caixa.

Adicionar vínculos financeiros de consignação com exclusividade e proteger edição/cancelamento avulsos desses títulos em `finance/entries.ts`. Baixas e estornos continuam pelos serviços existentes, sob ADMIN. Extrair operações WithClient quando necessário para atomicidade; não criar transações aninhadas ou segundo caixa. Resumo de recebimento da Sale de consignação deve explicar bruto versus repasse esperado: o líquido não é desconto concedido nem recebimento faltante. Relatórios gerais de títulos/caixa mostram obrigações reais, e relatórios comerciais mostram bruto/comissão/líquido; não equiparar faturamento e recebimento.

## Acertos periódicos e correções comerciais

Acerto mensal por parceiro, com competência da data efetiva de venda, contém apenas vendas confirmadas ainda não vinculadas. Prévia calcula linhas/versões/fingerprint; fechamento ADMIN revalida tudo sob locks e congela as linhas/títulos existentes. Constraint impede mesma venda em dois acertos ativos. Não recria títulos, não muda vencimento e não baixa dinheiro. Pode haver vários acertos complementares no mesmo mês para relatos tardios, explicitamente numerados; nada é inserido em fechamento antigo.

Estado derivado: ABERTO (rascunho de seleção), FECHADO_PENDENTE, PARCIAL, QUITADO e CANCELADO. QUITADO exige todas as obrigações líquidas pertinentes resolvidas; no retido sem título por comissão 100%, fechado pode ser quitado sem caixa. Baixa/estorno externo atualiza a projeção, sem editar documento fechado. Cancelar fechamento exige ADMIN, motivo e nenhuma baixa líquida ativa nos títulos vinculados; libera suas vendas para outro fechamento, sem cancelar venda/títulos.

Correção de venda confirmada neste recorte é cancelamento integral e novo lançamento, com referência ao anterior e motivo; referência substituta distinta, venda anterior continua rastreável. Não suporta estorno parcial comercial. Antes de cancelar: desfazer acerto ativo que a contenha e estornar baixas/pagamentos existentes pelos serviços financeiros; revalidar que títulos não têm baixas líquidas ativas. Cancelamento atômico cancela obrigações, anula comissão e restitui peças ao parceiro nas origens vendidas. Não devolve fisicamente ao interno. Devolução do consumidor: cancelar integralmente a venda afetada, relançar a parcela mantida e registrar eventual perda/retorno das peças reintegradas; interface explica os passos sem automatizar crédito bancário. Conflito com baixa concorrente aborta a operação completa.

## Reposição e resultado

Mínimo opcional por parceiro/produto em unidades; alerta privado quando saldo confirmado e disponível no parceiro fica abaixo do mínimo. Mostrar trânsito separadamente para evitar remessa duplicada. Nenhuma remessa automática. Alertas de acerto indicam competência ainda não fechada e títulos vencidos; sem notificações externas.

Resultado por parceiro/produto e período da data efetiva: unidades vendidas líquidas de cancelamento, bruto, comissão, repasse, custo de peças vendidas e perdas externas atribuídas uma única vez. Exibir margem de contribuição e resultado após depreciação conforme fontes existentes, diferenciados do caixa recebido. Custos desconhecidos/provisórios produzem cobertura explícita e resultado parcial, nunca zero fictício.

Adaptar buckets de abertura/produção e fontes de rentabilidade para classificar cada unidade exatamente uma vez: interna disponível/reservada, custódia externa, vendida ou perdida. Transferência só troca custódia. Custos de origem acompanham toda a cadeia, sem duplicar custo no retorno ou na venda. Cancelamentos e compensações entram líquidos. Projeções/revisões históricas persistidas continuam imutáveis; novos hashes incluem alocações/condições de consignação e versão de motor quando necessária. A comissão congelada é fonte autoritativa; não somá-la novamente como taxa de canal ou revisão administrativa. Cobertura do custo é calculada com o mesmo motor existente, estendido para novos buckets, sem repartir o custo integral novamente só entre as peças internas restantes.

## Concorrência, permissões e interface

Comandos validam usuário ativo/papel atual no servidor, esquema estrito, expectedVersion e idempotência por ator/chave/hash/tipo. OPERATOR consulta operação física e prepara venda; ADMIN mantém condições, confirma venda, perdas/correções, acertos e financeiro/resultados monetários. Não expor custos/resultados ao operador por endpoints de saldo. Política fina de valores comerciais segue a permissão já usada na lista de vendas; custo permanece ADMIN.

Ordem global proposta: chave da operação → lock de planejamento quando houver efeito físico/comercial → parceiro → remessas/eventos em ordem estável → Sale → FinancialEntry ordenados → FinishedStock ordenados → contas financeiras ordenadas. Extrações devem respeitar também os caminhos existentes. Financeiro que só baixa título pode continuar Sale → título → conta e não adquirir locks anteriores depois; fechamento/cancelamento deve usar o mesmo título para serializar contra a baixa. Antes do plano, mapear todos os caminhos existentes que atingem esses recursos para provar ausência de inversão; não introduzir lock E5 que só proteja E5 e deixe reserva/ajuste desprotegidos. PostgreSQL real deve comprovar esperas e rollback.

Interface privada em Pontos de venda: lista/resumo de parceiros, detalhe com saldos/remessas/vendas/acertos, formulários de conferência e histórico; links à Sale e títulos existentes. Filtros por parceiro/produto/período/pendência, paginação e totais calculados sobre população filtrada inteira. Telas de confirmação mostram consequências físicas e financeiras; nenhum comando altera saldo por edição direta. Seguir skill shadcn do projeto e guias locais Next.js antes de código visual; teclado, mensagens junto aos campos e tabelas com rolagem local em 375px.

## Critérios de aceitação e validação

1. Com 20 peças livres, expedir 8, receber 6, vender 3, retornar/conferir 2 e perder 1 do trânsito resulta em: 14 internas, 1 no parceiro, 1 em trânsito, 3 vendidas, 1 perdida = 20. Rastrear cada unidade à origem e cada venda à remessa e título; transferência não produz venda/receita/caixa.
2. Reproduzir ambos os exemplos de 100/20; duas linhas com arredondamento, comissão zero/100%, alteração futura de condição, recebimento/pagamento parcial, atraso e estorno. Totais do acerto conciliam exatamente com títulos reais.
3. Fechar e repetir acerto sem novo título/caixa; concorrência de dois fechamentos não duplica venda; relatório tardio entra em complemento. Cancelar fechamento não apaga venda; corrigir venda após baixa é bloqueado até estorno/retirada do fechamento.
4. Duas remessas e remessa contra reserva/ajuste/entrega; duas vendas do último saldo; venda contra perda/retorno; cancelamento contra baixa; fechamento contra cancelamento. Forçar contenção PostgreSQL e verificar invariantes, não depender só de Promise.all.
5. Tipos de transferência não contam como perda/receita; custos de abertura e produção conservam soma antes/depois de remessa/retorno/venda/perda/cancelamento. Custos incompletos permanecem incompletos. Venda/receita e comissão aparecem uma única vez nos relatórios gerais e E5.
6. Rotas legadas e financeiro avulso não podem alterar venda/títulos E5 por caminho incompatível. Testar autorização, ator desativado, versões obsoletas, repetição de chave e rollback após escrita intermediária.
7. Migração aditiva de base main para E5 preserva dados sintéticos representativos, FKs e uniques; não cria backfill comercial nem movimento de abertura. Sem banco operacional.
8. Unitários de domínio, UI, integrações E5 exclusivas, regressões estoque/comercial/financeiro/rentabilidade/planejamento, tipos, lint, build e revisão independente. Validação visual desktop/375px/teclado. Registrar limites reais sem declarar integração aprovada por inspeção estática.

## Entrega e próximos passos

Implementar em worktree E5 exclusiva, após aprovação do desenho e plano. Testes com E5_TEST_DATABASE_URL e allowlist exclusiva a definir no plano; não usar setup/banco de outra etapa. Disponibilizar banco por procedimento autorizado; ausência do banco não autoriza mexer em contêiner operacional. Dados operacionais e segredos fora dos artefatos.

Versão permanece 1.10.1 neste desenho local. Cada PR futura exige autorização específica e MINOR sobre main vigente, manifestos sincronizados, APP_VERSION nos rodapés e histórico em português. Publicação/merge/migração operacional ficam separados. Desenho e planejamento não equivalem a implementação ou validação funcional.

Detalhes deixados ao implementador: nomes de tabelas/rotas/componentes, paginação, helper boundaries e organização das tarefas, desde que preservem estes contratos. O plano deve dividir internamente persistência/custódia, venda/financeiro, acertos/correções e consultas/UI, mas a entrega E5.1 só é considerada implementada quando todo o ciclo estiver presente e validado.
