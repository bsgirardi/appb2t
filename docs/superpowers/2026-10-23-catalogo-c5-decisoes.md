# C5 — decisões recebidas para o desenho

Registro de 23/10/2026. Este registro não substitui a especificação nem autoriza publicação.

O checkout atenderá à compra direta de produtos com preço definido e ao fechamento de um orçamento revisado pela equipe. Pagamentos serão feitos fora da aplicação e registrados pela equipe no financeiro existente.

Cada produto ou kit poderá habilitar as modalidades de retirada, entrega com frete definido pela equipe e cálculo automático. Ainda não há transportadora ou serviço de cotação contratado.

Proposta técnica ainda em desenho: reutilizar venda, parcelamento, recebíveis e registro de recebimento existentes; preservar a separação entre aprovação de arte, aceite comercial e pagamento. O frete automático depende de integração real configurada, sem simular valores nem prometer cálculo antes dessa configuração.

Decisão confirmada pelo usuário em 23/10/2026: quando o frete depender de cotação pela equipe, o cliente envia inicialmente o pedido para conferência e só confirma a compra depois de receber o total incluindo frete. O envio para conferência não equivale à confirmação da compra.

As decisões comerciais abaixo orientarão a especificação. A recuperação de confirmação incerta será detalhada no desenho técnico. O provedor e os dados necessários para cotação automática serão definidos antes de implementar essa integração.

Decisão confirmada pelo usuário em 23/10/2026: usar uma única modalidade de entrega válida para todos os itens do carrinho; quando não houver modalidade comum, dividir a seleção em pedidos separados. A divisão exige ação explícita do cliente, sem confirmar pedidos adicionais automaticamente.

Decisão confirmada pelo usuário em 23/10/2026: na compra direta, revalidar o preço no momento da confirmação e exigir nova confirmação do cliente se o valor tiver mudado. No orçamento revisado, manter o total até a validade definida pela equipe, aproveitando a validade já existente no sistema.

Decisão confirmada pelo usuário em 23/10/2026: carrinho, envio para conferência e confirmação comercial não reservam materiais nem capacidade produtiva automaticamente. A equipe realiza reserva e liberação pelos controles existentes, respeitando pagamento e aprovação de arte quando exigidos. Esta decisão não define um novo bloqueio automático por pagamento.

Decisão confirmada pelo usuário em 23/10/2026: o cliente pode solicitar cancelamento pelo checkout; a equipe conclui o cancelamento após conferir pagamento e produção, preservando os controles existentes de estorno de recebimentos e tratamento das reservas vinculadas. Solicitar cancelamento não cancela automaticamente a venda nem executa devolução financeira.

Proposta técnica para a especificação: confirmação com chave de operação estável, recuperação do resultado após resposta perdida e repetição idempotente, sem duplicar venda, parcelas ou recebíveis. Preservar o carrinho durante confirmação incerta e exigir intenção explícita para iniciar outra compra. Esta proposta não altera as decisões comerciais acima.

Abordagem escolhida pelo usuário em 23/10/2026: checkout integrado à gestão existente. Compra direta confirma venda quando preço, entrega e condições estão definidos; pedidos com frete pendente aguardam conferência; orçamento revisado segue para aceite e conversão. A alternativa de conferência humana obrigatória para toda compra não foi escolhida. A especificação detalhada continua sujeita à aprovação própria.

Especificação docs/superpowers/specs/2026-10-23-catalogo-c5-design.md aprovada explicitamente pelo usuário em 23/10/2026, incluindo ativação explícita com preços/faixas existentes, parcela única da compra direta com vencimento no dia da confirmação e acesso privado para continuidade. A aprovação autoriza a elaboração do plano, cuja revisão precede a implementação; não autoriza publicação.
