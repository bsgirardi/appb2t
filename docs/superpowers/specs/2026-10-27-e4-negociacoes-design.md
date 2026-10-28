# E4.1 — Oportunidades e próximos contatos

Data: 27/10/2026, America/Sao_Paulo.
Estado: abordagem e desenho completo aprovados pelo usuário em 27/10/2026. Plano executado localmente na branch codex/e4-negociacoes; validação parcial registrada em ../reviews/2026-10-28-e4-negociacoes.md; sem integração/publicação.

## Base conferida

Main local e remota: `d74ee7515898ef3ad892543fa61d02994c262799`, versão 1.5.1. Acompanhamento original consultado antes de qualquer isolamento. E1.1 e E2.1 constam nas PRs #19 e #21 em rascunho; E3.1 está implementado localmente, com limitações de testes registradas. Nenhuma dessas etapas foi presumida concluída ou integrada. Não houve nova consulta às PRs ou validação operacional.

Fontes inspecionadas: `prisma/schema.prisma`, `src/server/quotes.ts`, `src/server/sales.ts`, `src/server/commerce/{sale-write,audit}.ts`, `src/server/checkout/quotes.ts`, `src/components/commerce/quote-detail.tsx`, `src/components/pricing/line-cost-summary.tsx`, `src/server/planning/estimates.ts` e acompanhamento E1–E3.

Orçamentos já têm cliente, validade civil, descontos, frete, condições, custos vinculados, emissão, aprovação, recusa e reabertura. `EXPIRADO` é estado calculado. A emissão é registro interno e não prova envio ao cliente. `Quote.version` controla concorrência; edição sobrescreve conteúdo e reabertura limpa o snapshot de emissão. Eventos comerciais não preservam integralmente cada versão proposta. Não há oportunidade, responsável comercial ou próximo contato no modelo examinado.

A conversão existente usa transação, trava, chave de operação e vínculo único `Sale.quoteId`; cria venda confirmada e parcelas pelo fluxo atual. Aceite privado também usa `convertQuoteWithClient`. Ganho precisa acompanhar ambos os caminhos, sem criar uma segunda implementação de venda/recebíveis.

## Abordagens consideradas

1. **Recomendada: oportunidade própria ligada aos orçamentos existentes.** Permite contato e levantamento antes do orçamento, mantém próxima ação e perda em um registro comercial e reaproveita conversão. Exige novos modelos e migração preparada para ambiente isolado.
2. Acompanhamento diretamente no orçamento. Menor escopo, mas exige criar rascunho para todo contato e confunde recusa de proposta com perda da oportunidade. Não atende bem às etapas anteriores à proposta.
3. E4 integral de uma vez, incluindo margem global e promessa de prazo. Amplia dependências ainda abertas em E1/E3 e dificulta validar o núcleo comercial. Não recomendada para o primeiro incremento.

A abordagem 1 foi escolhida pelo usuário. As regras seguintes detalham a proposta; decisões adicionais são escolhas técnicas do autor sujeitas à aprovação deste desenho.

## Recorte do desenho

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

## Critérios de aceitação

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

Desenho aprovado; plano com arquivos, contratos, testes e isolamento preparado, aguardando revisão antes de código. Antes de código Next.js, ler guias relevantes em `node_modules/next/dist/docs/`.

Nesta entrega: somente inspeção e documentação; sem implementação, testes funcionais, build, PR, push, merge ou publicação. Versão mantida em 1.5.1 por não haver PR entregue. Futura PR exige autorização específica, SemVer comparada à main atual, manifestos sincronizados e notas em português, conforme AGENTS.md.

## Contratos e decisões técnicas do desenho

### Dados e auditoria

Criar domínio de oportunidades separado de commerce, sem duplicar totais, custos ou documentos. Opportunity terá id, título (1–160), customerId, ownerId, stage, nextAction (1–500 nas etapas abertas), nextContactDate (data civil), pendingNotes (até 4000), lossReason (3–2000 ao perder), wonSaleId único opcional, version, createdAt/updatedAt. Na criação, cliente e responsável devem estar ativos. Cliente pode mudar antes do primeiro vínculo; qualquer mudança exige cliente ativo. Cliente inativado depois permanece visível, com aviso; conversão mantém sua validação atual.

Quote recebe opportunityId opcional, indexado e com exclusão restrita. Opportunity mantém principalQuoteId opcional, validado sob trava como orçamento vinculado; vínculo inicial vira principal se não houver outro. Não há desvínculo, exclusão de oportunidade nem transferência de orçamento entre oportunidades em E4.1. Principal pode ser trocado entre documentos vinculados enquanto aberta. Após ganho ou perda, campos comerciais ficam somente leitura; registrar nova interação factual continua permitido sem mudar estado/próxima ação. Reatribuição de responsável exige reabertura da perda; ganho permanece encerrado.

OpportunityEvent é append-only: oportunidade, tipo, autoria ADMIN/OPERATOR ou CHECKOUT, id do ator quando aplicável, nome preservado, instante do servidor, dados anteriores/novos pertinentes e texto da interação (1–4000). Sem edição/exclusão de eventos. Interação representa registro interno, não comprovação de envio. Não permitir data retroativa neste recorte. Autoria privada é capturada pelo fluxo de aceite existente, sem vazar notas ao cliente.

OpportunityOperation guarda chave no escopo ator+operação, tipo, hash canônico do payload e resultado. Mesmo comando/chave/payload retorna resultado anterior; reutilização com conteúdo diferente gera conflito. Version incrementa uma vez por comando que modifica oportunidade; cada comando exige expectedVersion, salvo criação. Conversão e vínculo que reconciliem ganho incrementam versão na mesma transação. Apenas leitura não escreve nem reconcilia silenciosamente.

### Transições

Criar em CONTATO ou LEVANTAMENTO com próxima ação obrigatória. Mudança entre CONTATO, LEVANTAMENTO, PROPOSTA e NEGOCIACAO é explícita; PROPOSTA/NEGOCIACAO exigem principal vinculado, sem exigir que esteja emitido ou aprovado. Estado do documento aparece separadamente, incluindo expiração; aprovação de orçamento não significa ganho. Vínculo não muda etapa automaticamente, salvo orçamento já convertido.

PERDIDO exige motivo, mantém última próxima ação no histórico e limpa os campos ativos de próxima ação/data. Reabrir perda vai para LEVANTAMENTO, exige motivo e próxima ação/data, limpa lossReason corrente e preserva evento de perda. GANHO é exclusivo da reconciliação transacional com venda existente/convertida; limpa próxima ação/data corrente e preserva histórico. Não converter orçamento de oportunidade perdida; reabrir primeiro. Não publicar nova oferta privada de orçamento vinculado a oportunidade encerrada; impedir também caminhos equivalentes de publicação. Orçamentos sem oportunidade preservam comportamento atual.

Em oportunidade aberta, edição de orçamento vinculado deve impedir mudança de customerId, inclusive limpeza do cliente. A vinculação lê cliente e conversão sob a coordenação global existente. Vincular um orçamento já convertido só é permitido em oportunidade aberta, sem outra venda vencedora, com cliente igual ao da venda e orçamento. Venda cancelada não produz novo ganho retroativo: vínculo inicial com venda cancelada é recusado com orientação explícita. Não há adoção de vendas diretas sem orçamento neste recorte.

### Concorrência e fechamento

Preservar a coordenação global `lockPlanning`, já adquirida pelos comandos comerciais e de checkout. Comandos novos de vínculo, perda, reabertura e edição adquirem chave de idempotência e depois lockPlanning antes de qualquer trava de oportunidade/orçamento. Nunca adquirir CheckoutSession ou chave de operação de outro fluxo depois de lockPlanning. Dentro da coordenação global, travar oportunidade antes de escrever seu estado; helper comum de conversão descobre oportunidade pelo orçamento e verifica abertura antes de criar venda. Os caminhos atuais podem ter travado orçamento/checkout antes de entrar no helper: a exclusão global é a proteção contra inversão entre esses registros, e deve permanecer adquirida durante toda a transação. O plano auditará todos os chamadores de convertQuoteWithClient e imporá essa pré-condição; não substituir por uma nova hierarquia parcial de travas.

Perda consulta, após lockPlanning, todas as ofertas ativas dos checkouts ligados diretamente aos orçamentos da oportunidade ou pela solicitação de catálogo. Se alguma estiver ativa, aborta com orientação para retirada existente; não retira nem revoga automaticamente. Publicação de oferta deve consultar estado da oportunidade na mesma coordenação. Corrida tem resultado serial: aceite vencedor produz GANHO e perda conflita; perda vencedora impede nova publicação/conversão. Retirada e nova tentativa de perda são comandos separados.

Conversão grava venda/parcelas pelo serviço existente e, antes do commit, atribui wonSaleId e GANHO com evento na oportunidade. Falha em qualquer trecho reverte tudo. Duas conversões de orçamentos distintos serializam pela coordenação global; segunda falha se já houver ganhador. Replays existentes continuam passando primeiro pelo registro de idempotência, preservando resposta anterior. Não prometer sucesso com uma chave nova para orçamento já convertido: nesse caso, mostrar o link da venda existente na interface. Ganho por vínculo retroativo gera evento próprio de reconciliação, sem repetir eventos financeiros/comerciais existentes. Cancelamento posterior da venda não altera oportunidade; detalhe consulta status atual e apresenta aviso.

### Consulta e interface

Entrada Negociações no administrativo para ADMIN e OPERATOR. Listagem paginada (20 por página, máximo 100) por próxima data ascendente, depois updatedAt descendente e id; encerradas sem data ficam ao final. Filtros de responsável (todos/eu/usuário), etapa (padrão abertas) e próxima ação (todas/atrasadas/hoje). Busca por título, nome do cliente ou número do orçamento vinculado. Atrasada significa data anterior ao dia atual em America/Sao_Paulo; hoje não é atraso. Sem agenda por hora ou notificações em segundo plano.

Criar em formulário e abrir detalhe. Detalhe contém resumo editável, próxima ação, pendências, orçamento principal e demais vínculos, interação, histórico paginado em ordem decrescente e ações de perda/reabertura. Vínculo seleciona orçamento existente do mesmo cliente; criação e edição do orçamento continuam nas telas atuais, com retorno por link. O detalhe do orçamento exibe link à oportunidade, permite abrir o seletor de vínculo e preserva ações comerciais existentes; conversão permanece onde já está com parcelas e confirmação atuais. Erros de conflito pedem recarregar, mantendo texto digitado até decisão do operador.

Cancelamento da venda aparece no detalhe da oportunidade. Não criar indicadores de receita ponderada ou margem. Confirmação de perda mostra motivo obrigatório e a informação de que documentos não serão cancelados. Leitura em telas pequenas usa cartões/tabela com rolagem local, rótulos textuais e foco acessível. Reutilizar componentes e padrões visuais existentes; layout final, ícones e decomposição de arquivos ficam ao implementador, sem novo sistema visual.

### Permissões, operação e validação

ADMIN e OPERATOR ativos têm as mesmas permissões comerciais de E4.1; responsável é atribuição, não barreira de acesso entre operadores. Toda rota valida sessão, payload e limites no servidor. Não incluir relações de oportunidade nos DTOs públicos nem expor notas/eventos em impressão, checkout ou catálogo. A interface interna não substitui essa garantia no servidor.

Migração aditiva: tabelas e relações opcionais, sem backfill nem alteração de status legados. Preparar script/migration no isolamento, aplicar somente em banco E4 descartável e explicitamente conferido. Não copiar .env operacional. Se não houver banco exclusivo disponível, registrar bloqueio de validação de integração e não substituir por testes no banco de outra etapa; nenhuma autorização para subir/alterar contêineres está implícita. Usar variável de banco E4 e proteção que rejeite destinos operacionais ou compartilhados antes de qualquer limpeza.

Testes de domínio cobrem transições, limites e datas; integração cobre persistência, idempotência, cliente e concorrência dos dois caminhos de conversão/publicação/perda; testes HTTP cobrem autenticação e privacidade; interface cobre filtros, conflitos e teclado. Validar tipagem, lint, build e responsividade sintética, com limites explícitos da suíte existente. Não usar credenciais/dados operacionais em fixtures.

## Tamanho e fronteira de entrega

E4.1 é um incremento de produto com migração e integração transacional, não apenas formulário. A entrega local poderá conter implementação e validação em isolamento; não autoriza PR, push, merge, publicação nem migração operacional. Não criar commit na instalação operacional com arquivos de outros chats. Documentação permanece local neste momento; eventual commit será feito no isolamento autorizado, somente com arquivos de E4 e acompanhamento preservado.

O usuário aprovou os detalhes deste desenho em 27/10/2026 após sua apresentação. Próximo marco: revisão do plano e escolha do método de execução, sem ampliar E4.1 para os incrementos pendentes.

## Revisão do desenho

Revisão independente de viabilidade em 27/10/2026: nenhuma pergunta material pendente para elaborar o plano. Desenho posteriormente aprovado pelo usuário; a revisão documental não representa validação funcional.
