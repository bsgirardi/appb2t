# PDV presencial — desenho de implementação

06/11/2026. Base main 16a6466 / 1.22.0. Desenho consolida o pedido de execução e as decisões expressas do usuário; detalhes técnicos abaixo são decisões de implementação.

## Decisões e objetivo

Exigir conexão; permitir consumidor não identificado, seleção de cliente ativo existente ou cadastro opcional real para uso futuro. Uma forma por venda: Pix, dinheiro ou cartão. Sem benefícios implementados agora. Venda presencial entrega imediatamente peças prontas elegíveis; não inclui encomendas, abertura/fechamento de caixa, pagamentos mistos, eventos, integração bancária, fiscal ou E2.4.

## Abordagens

Escolhida para implementação direta: experiência própria de atendimento sobre confirmação de vendas, reservas por origem e entregas existentes. Alternativas de encaixar na consignação ou criar outro livro de estoque/financeiro não atendem ao pedido. Ampliar a encomendas e caixa completo permanece expansão futura.

## Modelo e contratos

Sale.customerId torna-se nullable, com marcador explícito de consumidor não identificado apenas no documento PDV. Documentos comuns continuam exigindo cliente por validação e não podem usar o marcador. Snapshot congela identificação explícita, sem cliente fictício. Recebíveis reutilizam confirmação comercial e aceitam contraparte descritiva sem cadastro; relatórios de recorrência não agrupam consumidores anônimos como uma pessoa.

PosOrder persiste rascunho por operador, versão e resultado Sale único. GET recupera última compra inclusive concluída; nova compra é ação explícita. PATCH usa versão e preserva valores comerciais exibidos para conferência. Conclusão bloqueia operação e planejamento, revalida ator, cliente, produtos/revisões/preços e saldo, cria opcionalmente cliente, venda e parcelas, reserva e entrega com funções transacionais compartilhadas. Resultado fica no pedido dentro da mesma transação. Repetir conclusão devolve a mesma venda. Conteúdo concluído não pode mudar. Não armazenar dados pessoais em localStorage.

Produtos simples, ativos, preço definido, disponibilidade permitida e peças prontas livres são o suporte inicial. Bloquear kits, personalizações e itens sob consulta explicitamente; faixas de quantidade usam motor atual, não product.price diretamente. Estoque sempre respeita origem e reserva. Desconto global em reais usa commerce/totals. Dinheiro admite valor entregue e troco calculado com Decimal; Pix/cartão registram somente declaração do operador. Não gravar número de cartão nem dados bancários.

## Autorizações e financeiro

ADMIN e OPERATOR atendem no PDV. Nenhum ganha acesso financeiro adicional. Conclusão gera um recebível pelo serviço atual e declaração de pagamento no pedido; não gera baixa automática nem confirma provedor. Resumo e comprovante indicam venda/entrega concluídas e recebimento a conferir pelo administrador. Baixa e estorno continuam no financeiro existente. Cancelamento/devolução seguem módulos atuais e trilha histórica; não devolvem peças nem estornam automaticamente por informação do PDV.

## Interface e recuperação

Desktop: busca/produtos e compra lateral. Celular: pilha e resumo acessível; controles de quantidade com rótulos, foco e toque. Identificação opcional em detalhes; pagamento e revisão final na compra. Busca não conclui por Enter. Componentes shadcn existentes, cores semânticas, claro/escuro. Rascunho salvo no servidor com feedback; durante envio bloquear edição. Falha de resposta mantém compra e ação consultar/retomar, usando mesmo pedido. Não exibir sucesso antes da confirmação persistente. Nova venda nunca acontece automaticamente após erro ou atualização.

## Validação e limites

Banco descartável exclusivo PDV em 127.0.0.1:55441/b2t_pdv_test. Testes não podem alcançar operação. Cobrir anonimato, cliente existente/novo, preço/faixa, desconto/troco, uma forma, concorrência pela última peça, rollback, duplo envio e recuperação; regressões de confirmação, entrega, cancelamento e recorrência. Tipos/lint/build, migração real, celular/desktop, teclado, foco, temas. Sem push/PR/merge/Release/deploy/migração operacional autorizados. Versão ajustada uma vez ao preparar entrega conforme main vigente.
