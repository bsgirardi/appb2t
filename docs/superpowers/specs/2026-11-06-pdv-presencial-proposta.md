# PDV presencial — investigação e proposta

Data: 06/11/2026. Base conferida: origin/main 16a6466b4020d1008025506387634026e29d7baa, 1.22.0.
Estado histórico da investigação inicial. As decisões foram respondidas pelo usuário e incorporadas em [desenho](2026-11-06-pdv-presencial-design.md) e [entrega](../../pdv/ENTREGA.md); as perguntas abaixo permanecem como histórico, não como pendências atuais.

## Objetivo e abordagem proposta

Registrar vendas durante atendimento em balcão, feira e rua, reutilizando comércio, peças prontas, entregas e financeiro. PDV é fluxo próprio, independente de consignação.

Recomendação: começar por entrega imediata de peças disponíveis, com carrinho, desconto global em reais, identificação do comprador conforme decisão explícita, pagamento informado e conclusão recuperável. Encomendas continuam no fluxo comercial/produtivo existente. Uma alternativa é incluir encomendas no PDV desde o início, ao custo de prazo, alocação e entrega posterior no atendimento. Outra é incorporar gestão de caixa completa; abertura, fechamento, sangria e acertos ampliam o projeto e não estão presumidos aprovados.

## Proposta visual

Desktop: busca por nome/SKU e produtos disponíveis no painel principal; compra em coluna lateral com itens, quantidade, remoção, desconto e total. Botão Pagamento conduz à revisão final. Celular: busca e produtos em uma coluna; resumo fixo inferior abre a compra, com controles grandes para toque e campos rotulados. Não confirmar venda por Enter na busca. Ao adicionar, anunciar item e quantidade sem tirar foco da busca; erros preservam compra e foco segue para o campo pertinente. Claro/escuro usam tokens e componentes shadcn instalados.

Pagamento mostra explicitamente informação do operador e situação financeira. Conclusão informa número da venda, entrega e situação do recebimento separadamente. Nova venda exige ação explícita. Resultado desconhecido após queda de rede oferece consultar/retomar a mesma operação, preservando a chave; nunca orienta reenviar uma venda nova.

## Contratos encontrados

- `src/server/sales.ts`: rascunho exige cliente ativo; confirmação compartilhada em `confirmSaleWithClient` congela documento/custos e cria parcelas/recebíveis. Não baixa fisicamente peças.
- `src/domain/commerce/validation.ts` e `prisma/schema.prisma`: cliente obrigatório em documento e Sale. `commerce/snapshots.ts` também exige cliente ativo. Venda anônima não é suportada hoje; eventual mudança deve ser explícita e restrita ao PDV, incluindo tipos, snapshots, consultas, impressão, recebíveis e histórico. Não criar consumidor fictício.
- `production/fulfillment.ts`: reserva peças por origem, valida demanda, disponibilidade e exclusividade de outra venda. `production/deliveries.ts`: movimento físico, eventos do compromisso e projeção de estado. Extrair funções transacionais compartilhadas é preferível a chamar comandos públicos em transações independentes ou reproduzir regras no PDV.
- `production/commands.ts`: idempotência persistente com hash e resultado, coordenação de planejamento. `commerce/locks.ts` e locks produtivos/financeiros precisam manter uma ordem global compatível.
- `finance/settlements.ts`: baixa/estorno exigem ADMIN, conta válida, movimento e auditoria. Informação de Pix/cartão não comprova provedor nem autoriza OPERATOR a baixar recebíveis. Preservar títulos gerados pela confirmação; não gerar segundo recebível pelo PDV.
- `catalog-requests/snapshot.ts`, `server/inquiry.ts` e `checkout/review.ts`: referências comerciais, personalizações, faixas e kits já têm revisão própria. Não usar apenas product.price para reproduzir esses cálculos. Recorte inicial proposto: produtos simples com preço definido e estoque pronto elegível; itens personalizados, sob consulta e kits devem ser identificados e encaminhados ao fluxo existente, sem simplificação silenciosa. Ampliar suporte exige usar esses motores.
- `commerce/totals.ts`: totais com Decimal, desconto limitado ao subtotal e total positivo. Sem cálculos monetários paralelos com ponto flutuante.

## Decisões solicitadas

1. Concluir offline é essencial ou primeira entrega pode exigir conexão? Offline requer protocolo de sincronização, conflito de estoque, proteção/retenção de dados locais e definição financeira. Não autorizado por inferência. Pode-se investigar enquanto aguarda, mas não construir conclusão offline sem decisão.
2. Permitir comprador não identificado ou exigir cadastro rápido? Nenhum cliente fictício será criado.
3. Uma forma por venda (Pix/dinheiro/cartão, com troco informativo no dinheiro) ou pagamentos combinados essenciais? Registro do operador não equivale a baixa. Recomendação: uma forma inicialmente, ADMIN baixa pelo financeiro existente.

Propostas de limite ainda corrigíveis: sem abertura/fechamento de caixa; sem novo cadastro de eventos/locais; sem cancelamento/estorno rápido no PDV. Acesso ao detalhe existente mantém trilha e exige tratar devolução física e estorno separadamente; cancelar comercialmente não deve fabricar devolução ou apagar pagamento.

## Segurança de conclusão e rascunho

Comando final deve coordenar confirmação comercial, compromisso e entrega na mesma transação; hash/chave persistentes garantem repetição do resultado e rejeitam mudança de conteúdo sob a mesma chave. Revalidar produtos, preço/revisão, permissões, origem e saldo sob locks. Falta de estoque desfaz toda operação. Estado de tentativa separado de compra editável. Rascunho autenticado no servidor é a preferência proposta para recuperação, sem gravar dados pessoais no aparelho por inferência; a chave de recuperação deve pertencer ao ator e sobreviver a resposta perdida. Navegação precisa alertar quando houver edição ainda não persistida.

## Verificação planejada após definição do recorte

Testes de totais/desconto/troco e contrato de pagamento; disputa real pela última peça; duas confirmações iguais; chave com conteúdo alterado; rollback após falha; resposta perdida e recuperação; cliente inativo/anônimo conforme decisão; bloqueios de kit/personalização e referências alteradas; ADMIN/OPERATOR e ausência de baixa indevida. Banco sintético descartável exclusivo, sem banco operacional. Tipos, lint, build e regressões comerciais/produtivas/financeiras. Teclado, foco, celular/desktop, claro/escuro em prévia sintética; offline apenas se aprovado.

## Estado e coordenação

Permissões efetivas: filesystem irrestrito e rede habilitada, sem alterar configuração de controle do chat. Sem autorização de push/PR/merge/Release/deploy ou migração operacional.

Área isolada gerenciada criada sobre main, preservando alterações e documentos de X:/codex/appb2t. Calculadora: chat consultado relata PR #47 / 1.23.0, sem merge/publicação. Revisão visual: PR #46 / 1.22.1, sem merge/publicação. Não importar alterações dessas branches nem assumir versões publicadas. Reconsultar main antes da implementação e antes de futura PR.

Versão permanece 1.22.0 nesta investigação local. Sem código de produto, instalação de dependências, testes funcionais, migrações ou operações fictícias. Guias Next locais de Route Handlers, formulários e use-client lidos na instalação existente; devem ser reconferidos a partir das dependências da área isolada antes do código. Skill shadcn do projeto lida; consultar documentação específica dos componentes ao implementar.

Próxima ação: incorporar as respostas, fechar desenho e plano executável e implementar o recorte autorizado com as validações acima. Versão única e notas portuguesas serão preparadas conforme main vigente para futura PR.
