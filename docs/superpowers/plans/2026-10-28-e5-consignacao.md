# E5.1 — Ciclo completo de consignação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rastrear peças desde a remessa ao parceiro até venda/devolução/perda, comissão e acerto, com ambos os modelos financeiros.

**Architecture:** Razão de custódia vinculado às origens do estoque pronto; venda efetiva cria Sale com atendimento CONSIGNMENT e vínculos diretos aos títulos existentes. Acertos agrupam obrigações sem recriar títulos/caixa; fontes de custo e relatórios existentes passam a reconhecer custódia, venda e perda externa sem duplicar apropriação.

**Tech Stack:** Next.js 16.4.2, React 19, TypeScript, Prisma 6/PostgreSQL, Zod 4, Decimal.js, Vitest e componentes shadcn instalados. Sem novas dependências previstas.

**Spec:** `docs/superpowers/specs/2026-10-28-e5-consignacao-design.md`, aprovado pelo usuário em 28/10/2026, incluindo parceiro devedor nos dois modelos, local único e correção comercial integral.

## Global Constraints

- Trabalhar em worktree E5 exclusiva a partir da main vigente, usando using-git-worktrees; preservar instalação original, documentos e alterações de outros chats, inclusive `.agents/` e `skills-lock.json`. Não copiar `.env`.
- Não publicar, atualizar/criar contêineres, executar migrações operacionais, fazer push, criar PR ou merge. Commits locais com arquivos selecionados, somente no isolamento. Não criar tags.
- `E5_TEST_DATABASE_URL` aceita somente postgres/postgresql, localhost ou 127.0.0.1, porta 55435, banco `b2t_e5_test`, sem query/hash. Validar antes de importar db e antes de cada limpeza/migração. Não importar setup de outra etapa. Não executar integração se instância exclusiva estiver indisponível; registrar o limite.
- Ler guias locais Next.js de páginas/layouts, componentes servidor/cliente e route handlers antes de escrever código Next; usar a skill `.agents/skills/shadcn/SKILL.md` em alterações visuais e skill React aplicável.
- Remessa não cria venda/receita; venda cria títulos apenas uma vez; acerto não cria título nem caixa. Nunca usar venda/entrega produtiva fictícia.
- Parceiro é o Customer devedor nos dois modelos; comissão percentual congelada por linha, HALF_UP em centavos, preço efetivo sem desconto/frete global. Um local por parceiro, vencimento dia 1–28 do mês seguinte à data efetiva.
- ADMIN mantém condições, confirma venda, perdas/correções, acertos e financeiro; OPERATOR consulta operação física, registra remessas/recebimentos/retornos e prepara venda. Custo e resultado monetário restritos a ADMIN; validar usuário ativo/papel atual no servidor.
- Sem portal, consumidor devedor, balcão/feira, filiais, transferência entre parceiros, kits compostos, personalizado sem identidade física inequívoca, gateway, fiscal ou notificações externas.
- Base conferida 1.10.1 / `7fe37d9`. Não alterar versão só por entrega local. Futura PR autorizada exige MINOR comparado à main vigente, manifestos/notas sincronizados e APP_VERSION nos rodapés, sem novo incremento na finalização da mesma PR.

## Review Focus

1. Inativação de parceiro/cliente após expedição não pode impedir venda de saldo existente, retorno e acerto: tarefas 2/3/5.
2. Comissão 100% no modelo retido não cria título zero nem pendência artificial; arredondamento de múltiplas linhas é reproduzível: tarefas 1/3/5.
3. Peças retornadas e novamente expedidas conservam custo por origem, inclusive origem parcialmente vendida antes do retorno: tarefa 4.
4. Venda tardia em competência fechada exige complemento sem mutar acerto antigo; baixa concorrente impede cancelamento inconsistente: tarefa 5.
5. Chamadores legados de estoque, produção, financeiro e rentabilidade não podem editar/consumir E5 por caminho sem as guardas novas: tarefas 3/4/6.

## Arquivos e interfaces comuns

Criar `src/domain/consignment/{types,validation,quantities,commercial,statements}.ts`, `src/server/consignment/{authorization,commands,locks,partners,custody,sales,finance,statements,costs,queries,http}.ts`, `src/lib/consignment-client.ts`. Tipos de payload são exportados de validation e DTOs de types; todo dinheiro é string decimal, datas civis YYYY-MM-DD e unidades inteiras.

Contratos públicos dos comandos: `executePartnerCommand(actor: Actor, raw: unknown): Promise<PartnerDTO>`, `executeCustodyCommand(actor: Actor, raw: unknown): Promise<ShipmentDTO>`, `executeConsignmentSaleCommand(actor: Actor, raw: unknown): Promise<ConsignmentSaleDTO>`, `executeStatementCommand(actor: Actor, raw: unknown): Promise<StatementDTO>`. Payload estrito discriminado por `type`, com operationKey e expectedVersion nos comandos de entidade existente. CREATE exige expectedVersion 0; demais exigem versão positiva. Confirmação possui chave própria e replay antes da checagem de versão.

Helpers transacionais em commands/locks: `runConsignmentCommand<T>(actor: Actor, type: string, raw: {operationKey: string}, action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>` e `lockConsignment(tx, ids: {partnerId: string; shipmentIds?: string[]; eventIds?: string[]; statementIds?: string[]; consignmentSaleIds?: string[]}): Promise<void>`. O coordenador adquire lockPlanning antes dos locks de entidade; helpers WithClient nunca iniciam outra transação.

### Task 1 — Domínio, persistência e segurança do banco de teste

**Files:** criar domínio comum acima, `tests/e5/{database,setup,fixtures,migration-validation}.ts`, `vitest.e5.config.ts`, `tests/unit/consignment-{domain,database-guard}.test.ts`; modificar `prisma/schema.prisma`, adicionar migração `prisma/migrations/202610280001_consignment/migration.sql` (usar outro identificador se já ocupado), scripts package.json, descoberta de testes somente se necessário.

**Interfaces:** `projectCustody(events: CustodyFact[]): CustodyBalance`, `calculateConsignmentLines(lines: CommercialLineInput[]): CommercialTotals`, `consignmentDueDate(date: string, day: number): string`, `assertE5DatabaseUrl(raw: string): URL`. Definir tipos exatos referidos em types.ts antes dos consumidores. CustodyBalance expõe outbound, partner, inbound, sold e lost por origem; CommercialTotals expõe gross, commission, receivable e payable. RETIDA retorna payable zero, SEPARADA retorna receivable bruto e payable comissão.

- [ ] Escrever testes puros: `expect(calculateConsignmentLines([{quantity:1,unitPrice:'100.00',percent:'20',model:'RETIDA'}])).toMatchObject({gross:'100.00',commission:'20.00',receivable:'80.00',payable:'0.00'})`; equivalente SEPARADA retorna 100/20. Fixar HALF_UP com 0,05 × 10% = 0,01 por linha; duas linhas resultam 0,02. Testar 0/100%, quatro casas percentuais, limites inteiros, datas impossíveis e dezembro→janeiro.
- [ ] Escrever guard tests rejeitando URL vazia, remota, portas 55432–55434, banco operacional, query/hash e protocolo não PostgreSQL. Executar `npx vitest run tests/unit/consignment-domain.test.ts tests/unit/consignment-database-guard.test.ts` e confirmar falha por contratos ausentes.
- [ ] Implementar domínio e schema: Partner customerId único; condições por parceiro/produto únicas; remessas, linhas/alocações, eventos compensáveis, venda ligada a Sale única, linhas/alocações por origem; Statement/Line com unicidade de vínculo ativo por venda; FinancialLink único por venda/papel e entryId; Command idempotente por ator/chave. FK restritiva; índices por parceiro/data/status/origem. Guardas SQL para quantidades/valores/percentual e exclusividade ativa onde Prisma não expressa. Snapshots imutáveis, version inicial 1. Sem apagar campo legado ou backfill.
- [ ] Configurar E5 somente `tests/e5/*.test.ts`, sem paralelismo de arquivos, URL validada antes de db. Setup E5 independente com limpeza validada e fixtures mínimas; script `test:e5` e `test:e5:migration`. Confirmar config padrão não descobre E5.
- [ ] Rodar unitários novamente (PASS), `npx prisma validate`, geração do client usando URL sintética validada; se banco E5 disponível, migration-validation preserva fixtures legadas antes/depois e verifica FKs/unique/reaplicação. Sem banco, registrar não executado.
- [ ] Commit local selecionado: `feat: define dominio e persistencia de consignacao`.

### Task 2 — Parceiros e custódia integrada ao estoque pronto

**Files:** criar authorization/commands/locks/partners/custody e `tests/e5/consignment-{partners,custody,custody-concurrency}.test.ts`; modificar `src/server/production/finished-stock.ts` e coordenação compartilhada apenas onde exigido pelos testes.

**Interfaces:** comandos Partner CREATE/UPDATE/SET_PRODUCT_CONDITION; Custody SAVE_DRAFT/CANCEL_DRAFT/DISPATCH/RECEIVE/RETURN/CONFIRM_RETURN/LOSS/COMPENSATE. `readCustodyBalance(tx, partnerId: string, originIds: string[]): Promise<CustodyBalance[]>` alimenta tarefas 3/4/6. Movimentos internos `CONSIGNMENT_OUT`/`CONSIGNMENT_RETURN` ligados unicamente às alocações externas correspondentes.

- [ ] Mapear antes de código locks de produção, ajustes, reservas, entregas, vendas, correções e custos. Registrar em `docs/superpowers/reviews/2026-10-28-e5-locks.md` ordem real e pontos de entrada; resolver inversão antes de avançar. Planejamento → parceiro → entidades E5 ordenadas → Sale → títulos → estoque pronto → contas. Baixa financeira não adquire locks anteriores depois de título/conta.
- [ ] Escrever fixtures e testes com 20 peças: expedir 8 dá 12 internas/8 ida; receber 6 dá 12/2/6; retornar e conferir 2 dá 14 internas/4 parceiro/2 ida. LOSS e compensação devem conservar contagem. Testar recusa em trânsito, perdas no retorno, compensação bloqueada por dependentes, origem reservada/exclusiva, parceiro/cliente inativo com operações de resolução permitidas e histórico de condições preservado.
- [ ] Executar `npx vitest run --config vitest.e5.config.ts tests/e5/consignment-partners.test.ts tests/e5/consignment-custody.test.ts` e confirmar falhas funcionais quando banco disponível.
- [ ] Implementar comandos com ator atual, autorização, operação idempotente, locks globais/estoque, releitura sob lock, transação única, versão/revisão, auditoria e compensações. Compensação de saída expedida exige retorno; nenhum movimento financeiro. Reutilizar restrictedOriginSale e originBalance; não inventar reserva sem Sale.
- [ ] Testar contenção com conexão reservada e observação PostgreSQL no estilo E4 atual: duas expedições do último saldo e expedição contra reserva/ajuste/entrega; verificar contagens após commit e rollback induzido. Não chamar setup de integração geral.
- [ ] Rodar arquivos da tarefa (PASS se banco disponível), unitários de quantidades e typecheck; commit `feat: rastreia remessas e custodia por parceiro`.

### Task 3 — Venda efetiva, comissão e títulos existentes

**Files:** criar sales/finance; modificar `src/server/sales.ts`, `src/server/commerce/{sale-write,snapshots}.ts`, `src/server/finance/{entries,settlements}.ts`, `src/domain/commerce/types.ts`, `src/server/production/{orders,fulfillment,deliveries,lifecycle}.ts` nos pontos de guarda; `tests/e5/consignment-{sales,finance,legacy-guards,sale-concurrency}.test.ts`.

**Interfaces:** Sale commands SAVE_DRAFT/CONFIRM/CANCEL. `createConsignmentObligations(tx, actor: Actor, saleId: string): Promise<void>`, `assertStandardSaleFlow(tx, saleId: string): Promise<void>`, `readConsignmentReceiptSummary(tx, saleId: string): Promise<ConsignmentReceiptSummary | null>`. Summary tem gross, commission, expectedRepayment, receivedRepayment, pendingRepayment, commissionPayable e commissionPaid. Ausência de origem E5 retorna null para preservar contrato legado.

- [ ] Escrever testes confirmação RETIDA 100/20 gera Sale total 100 ENTREGUE/CONSIGNMENT, um RECEIVABLE 80 e nenhum PAYABLE/SaleInstallment/saída interna nova; SEPARADA gera títulos 100 e 20. Duplicar chave/relatório não duplica; referência única por parceiro, dados congelados após edição de cadastro/preço/condições. Comissão 100% retida não gera zero nem pendência.
- [ ] Cobrir OPERATOR rascunho permitido/confirmação negada, ADMIN revisão com motivo, cliente/parceiro inativo com saldo recebido permitido, origem insuficiente, preço/percentual inválidos, falha induzida após Sale/título revertendo tudo. Execução focada E5 deve falhar antes da implementação.
- [ ] Implementar Sale específica com cálculo/snapshot compartilhados extraídos; marcador reconhecido nos DTOs e guardas dos comandos legados (confirmar/editar/transicionar/cancelar/reservar/produzir/entregar). Sem chamar confirmação U3 que emite parcelas brutas. Criar títulos por FinancialLink e categorias de sistema, vencimento do mês seguinte; proteger edição/cancelamento avulso inclusive pelo caminho que hoje desvia para cancelSale.
- [ ] Implementar resumo E5 explícito no financeiro/comercial, preservando total bruto e saldo real de repasse. Extrair helpers WithClient de baixa/estorno só se necessário, mantendo comportamento legado. Não compensar RETIDA com movimento fictício nem somar comissão como taxa automática adicional.
- [ ] Confirmar testes RETIDA/SEPARADA com recebimento parcial e pagamento parcial/estorno via serviços existentes. Forçar venda/venda e venda/perda/retorno contra último saldo. Verificar todos os chamadores de comandos legados identificados pela busca, inclusive APIs alternativas.
- [ ] Rodar testes da tarefa e tipos (PASS), commit `feat: integra venda consignada e comissoes ao financeiro`.

### Task 4 — Custo por origem e rentabilidade sem duplicidade

**Files:** criar costs; modificar `src/server/production/cost-sources.ts`, `src/server/profitability/{origin-values,sources,queries}.ts`, `src/domain/profitability/{types,calculate}.ts` somente se contrato exigir; `tests/unit/consignment-cost-allocation.test.ts`, `tests/e5/consignment-costs.test.ts`.

**Interfaces:** `readConsignmentCostBuckets(tx, originId: string): Promise<ConsignmentCostBucket[]>`, buckets identificados de CUSTODY/CONSIGNMENT_SOLD/CONSIGNMENT_LOSS, unidades líquidas e IDs estáveis. `readConsignmentSaleCost(tx, saleId: string): Promise<ConsignmentCostDTO>` expõe total conhecido, total nullable, componentes e cobertura; usa alocação compartilhada de origem, não outro rateio integral.

- [ ] Escrever regressão abertura de 20 peças/custo 200: expedir 8 não muda custo unitário 10; vender 3 atribui 30, perder 1 atribui 10, retornar 2 não cria novo custo, soma de todos os buckets permanece 200. Repetir origem produtiva com custo conhecido, provisório e ausente; misturar entrega U3 e E5 na mesma origem.
- [ ] Testar retorno/reexpedição e cancelamento de venda: nenhuma duplicação de bucket ou custo; movimento de transferência não entra em perdas sem venda; comissão congelada entra uma vez mesmo com taxa/revisão administrativa. Rodar RED unitário e integração focada quando banco disponível.
- [ ] Estender ambos os leitores de abertura/produção com partição completa de unidades e fontes E5. Incluir alocações/condições em hashes; preservar revisões persistidas anteriores. Manter result after depreciation separado de contribuição e valores ausentes nullable, não converter desconhecido em zero.
- [ ] Integrar venda E5 ao relatório geral uma única vez, com data efetiva para recortes de consignação e distinção explícita se relatório geral usa confirmação; perdas externas identificadas uma vez nos resultados E5/geral. Implementar compensações líquidas antes do rateio.
- [ ] Rodar testes da tarefa e regressões focadas de custo/rentabilidade no ambiente exclusivo (portar fixtures, não importar setup alheio), tipo/lint; commit `feat: reconcilia custos e resultado da consignacao`.

### Task 5 — Acertos, cancelamentos e concorrência financeira

**Files:** statements, sales/finance/locks; `tests/e5/consignment-{statements,corrections,statement-concurrency}.test.ts`, `tests/unit/consignment-statements.test.ts`.

**Interfaces:** Statement commands PREVIEW/CLOSE/CANCEL; `previewStatement(actor: Actor, partnerId: string, competence: string): Promise<StatementPreviewDTO>` com fingerprint e seleção/versões; CLOSE revalida fingerprint sob locks. `cancelConsignmentSaleWithClient(tx, actor: Actor, id: string, expectedVersion: number, reason: string): Promise<ConsignmentSaleDTO>` chamado só após locks corretos, restitui saldo ao parceiro e cancela títulos na mesma transação.

- [ ] Escrever testes: fechamento de duas vendas seleciona somente elegíveis e congela valores/fontes; contagens de títulos/caixa não mudam; competência vazia não fecha; novo relato do mesmo mês gera complemento numerado. ALTERAR cadastro não muda acerto antigo. Fingerprint antigo e venda em acerto ativo conflitam.
- [ ] Fixar projeção FECHADO_PENDENTE→PARCIAL→QUITADO por baixas reais dos dois papéis; estorno recua estado; retida 100% fecha quitada sem título. Cancelar fechamento sem baixa libera vínculo sem cancelar venda/títulos; com baixa líquida ativa é negado.
- [ ] Escrever testes cancelamento integral da venda exige retirar acerto ativo e estornar baixas; devolve peças ao parceiro, nunca ao interno; cancelamento anterior e relançamento têm referência distinta/vínculo de substituição. Correção parcial comercial é rejeitada. Rodar RED unitário/integração focados.
- [ ] Implementar prévia/fechamento/cancelamento e constraints de vínculo ativo; proteger contra mudança entre prévia e fechamento. Usar títulos existentes como fonte de baixas; não manter status financeiro independente gravado que fique obsoleto após estorno.
- [ ] Forçar disputa real fechamento/fechamento, fechamento/cancelamento de venda, cancelamento de venda/baixa e cancelamento de acerto/baixa. Checar timeout, observação do bloqueio, rollback e estado final válido, inclusive pool pequeno.
- [ ] Rodar testes da tarefa e tipos (PASS), commit `feat: fecha acertos e corrige vendas consignadas`.

### Task 6 — Consultas, HTTP e interface privada

**Files:** queries/http, consignment-client; criar `src/app/api/consignment/{partners,shipments,sales,statements,report,commands}/route.ts`, detalhe `[id]/route.ts` dentro das quatro coleções; `src/app/(private)/pontos-de-venda/{page,loading}.tsx` e `[id]/page.tsx`; `src/components/consignment/{partner-panel,partner-detail,partner-form,shipment-form,custody-history,sale-form,statement-panel,result-panel}.tsx`; modificar `src/components/shell/admin-navigation.tsx`, `src/components/commerce/{sale-panel,sale-detail}.tsx`, `src/components/finance/entry-panel.tsx`; testes `tests/e5/consignment-{queries,http,privacy}.test.ts` e `tests/unit/consignment-ui.test.tsx`.

**Interfaces:** `listPartners(actor, raw): Promise<Page<PartnerSummaryDTO>>`, `getPartner(actor, id): Promise<PartnerDetailDTO>`, `getConsignmentReport(actor, raw): Promise<ConsignmentReportDTO>`. Filtros estritos por parceiro/produto/data/pendência, paginação padrão 20/máximo 100; totais de toda população filtrada, não só página. DTO operador omite custos/resultados; relatório monetário exige ADMIN. Interface aponta para IDs reais de Sale e FinancialEntry.

- [ ] Ler guias Next locais e skill shadcn completa/regras pertinentes, inventariar componentes instalados antes de compor. Reutilizar padrões de formulários, mensagens, estados vazios e confirmação atuais; sem reescrever design system.
- [ ] Escrever testes filtro com mais de uma página, total completo, reposição mínimo 5/saldo parceiro 4 alerta mesmo com trânsito 3 exibido à parte; competência sem fechamento e título vencido; relatório bruto/comissão/custo/caixa distintos. OPERATOR/visitante não recebe custo via detalhe/relatório/API alternativa.
- [ ] Escrever UI tests comissão RETIDA/SEPARADA e resumo 100/20, campos de data/motivo, bloqueios de ação, rascunho vs confirmado, instrução para correção integral, erro de versão e carregamento sem duplo envio. Executar RED focado antes do componente.
- [ ] Implementar consultas RepeatableRead coerentes, HTTP autenticado, payloads estritos e rotas privadas; visibilidade e comandos confirmam autorização no servidor. Adaptar detalhe/lista comercial e financeiro para títulos E5 e links de correção, sem oferecer edição incompatível.
- [ ] Implementar telas com saldos por estágio, alocações/remessas/origens e histórico. Conferência prévia discrimina efeito físico e financeiro; nenhum saldo editável. Tabelas rolam localmente em 375px; alertas não disparam remessa/mensagem automaticamente.
- [ ] Rodar testes focados de UI/HTTP e validação visual desktop/375px, teclado, claro/escuro; registrar evidências sintéticas fora de dados operacionais. Commit `feat: disponibiliza pontos de venda e acertos na interface`.

### Task 7 — Validação integrada e entrega local

**Files:** `tests/e5/consignment-cycle.test.ts`, migration-validation, `.github/workflows/ci.yml` (suíte E5 com serviço de teste exclusivo, sem publicação), `docs/superpowers/reviews/2026-10-28-e5-consignacao.md`, PENDENCIAS.md e ROADMAP-SELLER.md.

**Interfaces:** usar apenas contratos anteriores; cenário integrado é evidência de produto, sem novo fluxo alternativo.

- [ ] Escrever cenário completo do desenho: 20 iniciais; 8 expedidas; 6 recebidas; 3 vendidas; 2 retornadas/conferidas; 1 perda de trânsito → 14 internas + 1 parceiro + 1 ida + 3 vendidas + 1 perdida = 20. Executar para ambos os modelos, fechar acerto, baixar parcialmente/total, estornar e corrigir; contar Sale/títulos/movimentos e custos em cada passo.
- [ ] Configurar CI E5 separado com PostgreSQL 17 descartável do runner e mesma guarda 55435/b2t_e5_test, sem depender de bancos E3/E4. Isto prepara arquivo de CI; não inicia contêiner local nem publica.
- [ ] Rodar `npm run test:unit`, `npm run test:e5`, `npm run test:e5:migration`, `npm run typecheck`, `npm run lint`, `npm run build` no isolamento. Regressões que exigem outros bancos só no destino exclusivo autorizado de cada suíte; portar casos essenciais para E5 se indisponíveis, registrar a diferença. Não executar `npm test` com URL operacional ou redirecionar setup geral para E5.
- [ ] Revisar o diff completo com revisor independente, corrigir achados materiais e rodar regressões afetadas. Verificar main remota/versão atual e que não houve versão/nota antecipada. Sem PR autorizada, manter versão da base e registrar que futuro MINOR será calculado na preparação da PR.
- [ ] Atualizar acompanhamento distinguindo desenho aprovado, plano, implementação, validação, versão, commit, ausência de PR/merge/publicação/migração operacional e limites reais. Se banco ausente, não declarar ciclo/migração/concorrência validados. Commit local de entrega com arquivos selecionados.

## Autorrevisão do plano

Cobertura: parceiros/condições (1/2), origem/remessas/retornos/perdas (1/2), venda/modelos financeiros (3), custos/resultados (4/6), acertos/correções (5), reposição/HTTP/UI/permissões (6), integração/migração/concorrência/entrega (1/2/3/5/7). Os cinco focos de revisão têm casos explícitos nas tarefas indicadas. Tipos compartilhados são definidos em 1 e usados pelos mesmos nomes; assinatura dos comandos mantém raw unknown para validação única no servidor. Helpers WithClient não abrem transação. Não há tarefa que entregue uma versão pública parcial: implementação local só estará completa após 7 e sem confundir isso com publicação.

## Método de execução proposto

Recomendada execução direta neste chat com `executing-plans` e revisão independente do conjunto ao final: as tarefas compartilham transações e alocações de origem, exigindo continuidade entre estoque, comercial e financeiro. Alternativa: implementação por subagentes com revisão por tarefa, de maior custo de contexto. Aguardar revisão do plano e escolha do método conforme writing-plans; aprovação do desenho não foi registrada como aprovação automática deste plano.


## Execução local — 28/10/2026

As sete tarefas de implementação foram executadas em `codex/e5-consignacao`. Entrega local validada com 661 testes unitários, 32 integrações/regressões E5, migração real/reaplicação, tipos, lint e build. Revisão independente identificou dois P2, reproduzidos e corrigidos com regressões. [Relatório final e limites de cobertura](../reviews/2026-10-28-e5-consignacao.md).

A lista detalhada acima permanece como referência dos critérios originais: alguns cenários específicos de teste não foram automatizados individualmente, conforme relatório, portanto suas caixas não foram marcadas em bloco. Isso não deve ser interpretado como implementação não iniciada. Não houve PR/push/merge/publicação/migração operacional. Versão local 1.10.1; futuro MINOR será calculado na preparação de PR sobre main vigente.
