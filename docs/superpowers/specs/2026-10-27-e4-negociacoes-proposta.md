# E4.1 — Oportunidades e próximos contatos

Data: 27/10/2026, America/Sao_Paulo.
Estado: inspeção concluída e proposta para escolha de abordagem. Não é desenho aprovado nem plano executável.

## Base conferida

Main local e remota: `d74ee7515898ef3ad892543fa61d02994c262799`, versão 1.5.1. Acompanhamento original consultado antes de qualquer isolamento. E1.1 e E2.1 constam nas PRs #19 e #21 em rascunho; E3.1 está implementado localmente, com limitações de testes registradas. Nenhuma dessas etapas foi presumida concluída ou integrada. Não houve nova consulta às PRs ou validação operacional.

Fontes inspecionadas: `prisma/schema.prisma`, `src/server/quotes.ts`, `src/server/sales.ts`, `src/server/commerce/{sale-write,audit}.ts`, `src/server/checkout/quotes.ts`, `src/components/commerce/quote-detail.tsx`, `src/components/pricing/line-cost-summary.tsx`, `src/server/planning/estimates.ts` e acompanhamento E1–E3.

Orçamentos já têm cliente, validade civil, descontos, frete, condições, custos vinculados, emissão, aprovação, recusa e reabertura. `EXPIRADO` é estado calculado. A emissão é registro interno e não prova envio ao cliente. `Quote.version` controla concorrência; edição sobrescreve conteúdo e reabertura limpa o snapshot de emissão. Eventos comerciais não preservam integralmente cada versão proposta. Não há oportunidade, responsável comercial ou próximo contato no modelo examinado.

A conversão existente usa transação, trava, chave de operação e vínculo único `Sale.quoteId`; cria venda confirmada e parcelas pelo fluxo atual. Aceite privado também usa `convertQuoteWithClient`. Ganho precisa acompanhar ambos os caminhos, sem criar uma segunda implementação de venda/recebíveis.

## Abordagens para escolha

1. **Recomendada: oportunidade própria ligada aos orçamentos existentes.** Permite contato e levantamento antes do orçamento, mantém próxima ação e perda em um registro comercial e reaproveita conversão. Exige novos modelos e migração preparada para ambiente isolado.
2. Acompanhamento diretamente no orçamento. Menor escopo, mas exige criar rascunho para todo contato e confunde recusa de proposta com perda da oportunidade. Não atende bem às etapas anteriores à proposta.
3. E4 integral de uma vez, incluindo margem global e promessa de prazo. Amplia dependências ainda abertas em E1/E3 e dificulta validar o núcleo comercial. Não recomendada para o primeiro incremento.

## Recorte recomendado, sujeito ao desenho aprovado

Oportunidade com título, cliente cadastrado, responsável ativo ADMIN/OPERATOR, etapa, próxima ação com data civil em São Paulo, pendências e histórico imutável de interações e mudanças. Cliente obrigatório simplifica identidade e vínculo; prospecção sem cadastro fica fora deste primeiro recorte. Responsável inativado permanece visível com aviso e possibilidade de reatribuição, sem apagar autoria histórica.

Etapas propostas: contato, levantamento, proposta, negociação, ganho e perdido. Recuos entre etapas abertas são permitidos e auditados. Proposta/negociação exigem orçamento vinculado. Perda exige motivo e não recusa/cancela automaticamente orçamento, venda ou oferta privada. Ganho não é botão manual: decorre de venda confirmada pela conversão existente. Cancelamento posterior da venda permanece explícito, sem reabrir oportunidade automaticamente. Reabertura de perda exige motivo e nova próxima ação; ganho não reabre neste recorte.

Cada orçamento pertence a no máximo uma oportunidade; oportunidade pode reunir vários orçamentos e indicar um principal. Vínculo exige mesmo cliente, com conflito explícito se o documento já pertence a outra oportunidade. Troca de cliente fica bloqueada após vínculo. Legados não recebem oportunidade automaticamente. Vincular orçamento já convertido reconcilia ganho e venda existente, sem conversão adicional. Oportunidade perdida não recebe novo vínculo sem reabertura.

Todas as conversões de orçamentos vinculados precisam reconciliar a mesma oportunidade na transação existente. Uma oportunidade admite uma venda vencedora; após ganho, bloquear outra conversão de seus orçamentos vinculados, inclusive pelo aceite privado, preservando repetição idempotente da venda já criada. O desenho deve fixar ordem de travas compatível com planejamento/checkout/comercial para evitar deadlocks. Perda com oferta privada ativa exige retirar a oferta pelo procedimento existente antes de concluir, para não permitir aceite concorrente de oportunidade perdida.

Lista inicial orientada à próxima ação, com filtros por responsável, etapa e atraso; detalhe reúne histórico e links aos documentos existentes. Data vencida continua visível até remarcação explícita. Pendências são texto neste incremento. Não criar kanban ou tarefas independentes sem necessidade comprovada.

Vínculo inicial identifica orçamento e versão atual; não anunciar histórico integral de versões como entregue. Preservação imutável de cada emissão/reemissão, com conteúdo e custos daquela revisão, é incremento E4.2 e requer desenho específico, inclusive para legados sem evidência histórica recuperável.

## Dependências e itens seguintes

- E4.1 usa main atual; não depende da integração de E1–E3. Migração apenas preparada/testada em banco E4 exclusivo; execução operacional permanece proibida.
- E4.2: versões imutáveis e alertas internos de proposta sem retorno/vencimento. Definir evidência de contato/envio e limiares antes de alertar: ENVIADO significa emissão interna, e updatedAt não mede retorno do cliente. E4.1 limita alerta a próxima ação vencida.
- E4.3: margem negociada. Resumo atual é por item e declara ausência de resultado global com desconto/frete. Definir receita de frete versus despesa, comissão/taxas, cobertura e rateio, aproveitando precificação e reconciliação sem inventar custo zero. E1.1 não entrega esse contrato e E2.1 é leitura de venda, não simulador de orçamento.
- Prazo comercial completo depende do contrato E3 de cobertura da demanda e pós-produção. Estimativa de lote/retirada não é data final de entrega; não acrescentar promessa automática em E4.1.
- Mensagens externas, automações de envio, consignação e anúncios ficam fora.

## Critérios verificáveis propostos

1. ADMIN e OPERATOR autenticados criam, consultam e atualizam oportunidade; acesso anônimo falha. Responsável deve estar ativo ao atribuir; inativação posterior não elimina histórico.
2. Etapas abertas exigem próxima ação e data; concluir interação não apaga compromisso silenciosamente. Data civil não muda por fuso; atraso é calculado pelo dia em São Paulo e deixa de aparecer ao remarcar.
3. Mudança de responsável, etapa, pendências ou próxima ação e registro de interação preservam autor, instante e valores alterados. Versão desatualizada gera conflito sem gravação parcial; repetição de comando não duplica interação.
4. Vincular orçamento de outro cliente ou de outra oportunidade falha; orçamento legado permanece intacto. Principal deve pertencer à oportunidade.
5. Perda requer motivo; reabertura exige motivo e próxima ação. Recusa/expiração de um orçamento não perde automaticamente a oportunidade. Oferta privada ativa impede perda até retirada; corrida perda/aceite é testada.
6. Conversão administrativa e aceite privado resultam em ganho vinculado à única venda. Duplo clique, repetição e duas conversões concorrentes de orçamentos diferentes da mesma oportunidade não duplicam venda nem recebíveis; falha reverte toda a transação.
7. Ganho derivado de conversão preexistente não cria eventos de venda/parcelas extras. Cancelamento da venda mantém vínculo e aviso explícito.
8. Interface funciona por teclado e em 375 px sem transbordamento da página. Histórico não aparece em impressão pública, catálogo ou acompanhamento privado do cliente.
9. Integrações usam banco exclusivo E4, com proteção contra URL operacional e de outras etapas. Nenhuma execução de banco, contêiner ou migração operacional nesta análise.

## Próximos passos e limites

Escolher abordagem e ajustar recorte; em seguida escrever desenho completo, revisar sua integridade e obter aprovação antes de código. Só então elaborar plano com arquivos, contratos, testes e isolamento. Antes de código Next.js, ler guias relevantes em `node_modules/next/dist/docs/`.

Nesta entrega: somente inspeção e documentação; sem implementação, testes funcionais, build, PR, push, merge ou publicação. Versão mantida em 1.5.1 por não haver PR entregue. Futura PR exige autorização específica, SemVer comparada à main atual, manifestos sincronizados e notas em português, conforme AGENTS.md.
