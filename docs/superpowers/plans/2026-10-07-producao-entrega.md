# U3 — Production and Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Método preservado: execução direta, com revisão independente final.

**Goal:** executar produção para venda/estoque e entregas parciais com material, peças e custos rastreáveis, sem duplicar cobrança.

**Architecture:** ordens/linhas e eventos produtivos alimentam uma razão de peças por origem. Consumo usa o estoque U2 na mesma transação; entregas alocam origens e projetam o estado comercial. Custos são revisões derivadas dos fatos, sem novos lançamentos financeiros.

**Tech Stack:** Next.js instalado, React, TypeScript, Prisma 6/PostgreSQL, Zod, Decimal e Vitest existentes; sem dependência nova prevista.

**Spec:** `docs/superpowers/specs/2026-10-07-producao-entrega-design.md`, aprovada em 07/10/2026.

**Status:** aprovado pelo usuário e executado na branch `codex/producao-u3`, a partir de `540f242`. Fechamento e decisões: [versão candidata U3](../2026-10-09-u3-entrega.md). Integração/publicação pendentes.

## Global Constraints

- “Uma localização de estoque, peças inteiras e sem saldo por cor/tamanho.”
- “produtos acabados não terão saldo negativo.”
- “A única baixa física é a confirmação do consumo real.”
- “Nenhum comando de ordem, entrada de acabado ou entrega cria parcela, recebimento, estorno ou lançamento de caixa.”
- “OPERATOR não recebe custos nos DTOs nem em resposta idempotente.”
- “Eventos confirmados são imutáveis.”
- “Testes mutáveis exclusivamente em `b2t_test`/localhost:55432”. Preservar guarda de hostname local; nunca imprimir `.env`, apagar volume operacional ou usar produção como fixture.
- Ler AGENTS.md e guias Next instalados pertinentes antes de código. Não aplicar `npm audit fix --force`, trocar Next ou preencher fatos históricos fictícios.
- Cada tarefa roda testes vermelhos antes de implementação, os testes afetados após e faz commit local específico. Sem push necessário.

## Review Focus

1. Dois comandos com chaves diferentes disputam última peça/meta: tarefas 2, 3 e 5 devem rejeitar excedente sob lock.
2. Correção U2 concorre com vinculação/entrega produtiva: tarefa 4 deve impedir contorno pela rota antiga e evitar ordem inversa de locks.
3. Consumo sem custo confirmado afeta peça já entregue: tarefa 6 mantém revisão provisória, depois reconcilia sem alterar físico ou financeiro.
4. Venda antiga PRONTA tem reserva/consumo mas nenhuma quantidade comprovada: tarefa 7 não inventa peças nem repete consumo.
5. Troca de papel/desativação e retry após perda de resposta: tarefas 2 e 8 revalidam usuário e ocultam custos, preservando um único efeito.

## Mapa e contratos compartilhados

Criar domínio em `src/domain/production/{types,validation,quantities,states,costs}.ts`; serviços em `src/server/production/`; componentes em `src/components/production/`. Não concentrar todos os comandos em uma função monolítica.

Em `types.ts`: `Quantity = string` decimal U2, `Units = number` inteiro seguro positivo para comandos e não negativo para saldos; limites monetários e precisão seguem U2. `Meta = {operationKey:string; expectedVersion:number; reason?:string}`. Datas efetivas são strings YYYY-MM-DD validadas pelo helper comercial. DTOs operacionais não contêm custo; `AdminOrderDTO = OrderDTO & {cost:LineCostDTO[]}`. `OrderDTO` inclui id, version, origin, saleId nullable, status, responsável, prazo, linhas, quantidades e eventos. `FinishedDTO` inclui id/productId nullable, inventoriedAt, physical/reserved/available e origens. `DeliveryDTO` inclui id, saleId, linhas/quantidades/origens/data/autor. Todos os IDs são strings.

Comandos públicos recebem `(actor:Actor, raw:unknown)` e validam schema estrito. Tipos de entrada são `z.infer` dos schemas abaixo; todos incluem Meta. Listas paginadas retornam `{items:T[],total:number}`, página >=1, tamanho 1–100, padrão20. Consultas por ID autorizam no serviço.

### Persistência escolhida

- `ProductionOrder`: origem SALE/STOCK, saleId nullable, sequence único, status, responsável/prazo/notas/version. `ProductionLine`: orderId, saleLineKey nullable, productId nullable, descrição, tecnologia, meta original; mudanças de meta por eventos, sem reescrever execução.
- `ProductionEvent`: linha, tipo REPORT/CORRECTION/CLOSE_REMAINDER/COMPLETE, sourceId/reprintOf nullable, quantidades assinadas, tempos nullable, flags de completude de material/tempo, máquina/executor/autor/data/motivo; snapshot privado das premissas de custo por máquina efetiva, tarifas fixadas na liberação e versão global. Mudança de máquina conserva uma nova premissa para novos apontamentos.
- `ProductionMaterialLink`: evento, movimento U2, quantidade alocada; permitir dividir movimento legado, soma limitada à quantidade líquida sob lock do StockItem. `ProductionReservationAllocation` e eventos: parcela da StockReservation atribuída à linha; quantidade não pode exceder reserva líquida não alocada.
- `FinishedStock`: productId único nullable; linhas avulsas usam ownerSaleId+lineKey únicos com restrição de exclusividade. É o lock estável das peças, incluindo antes da primeira origem. productId não aponta a um cadastro paralelo. Campos active/inventoriedAt/version; avulsa só atende a própria venda.
- `FinishedOrigin`: stockId, linha/evento opcionais, kind PRODUCTION/OPENING/LEGACY/ADJUSTMENT, custo inicial nullable. `FinishedMovement`: origem, quantidade assinada, tipo/sourceId, autor/data/motivo. Entrada produtiva única por evento; registros positivos e compensações preservados.
- `FinishedCommitment` com saleId+lineKey+originId e eventos RESERVE/RELEASE/DELIVER/UNDO_DELIVERY: saldo lógico, sem duplicar físico. `ProductionDelivery` e linhas com alocações nas origens e vínculos aos movimentos físicos.
- `ProductionCostRevision`: lineId, factsHash único por linha, premissas/revisões U2 referenciadas, totais/componentes/cobertura/custo unitário e alocações por origem. `ProductionCommand`: chave por ator, tipo/hash/result; JSON interno projetado antes de responder.
- `Sale.fulfillmentMode` LEGACY/U3 default LEGACY para migração; novos fluxos de confirmação/conversão escrevem U3 explicitamente. StockReservation passa a aceitar saleId/lineKey nullable e productionLineId nullable: exige venda+linha OU linha produtiva exclusiva. Reservas legadas permanecem inalteradas; repartição usa allocation.

FKs restritivas para fatos; índices de origem, venda/linha, ordem/status/prazo, sequência e vínculos. Quantidades materiais/tempos/custos Decimal(24,6), unidades de peça Int com validação de limite de banco antes da escrita. Restrições SQL de sinais, exclusividade e unicidade complementam validações.

## Task 1 — Persistência e regras puras

**Files:** criar domínio acima, `prisma/migrations/202610070001_production/migration.sql`, `tests/unit/production-quantities.test.ts`, `tests/unit/production-states.test.ts`, `tests/integration/production-migration.test.ts`, `tests/fixtures/production.ts`; alterar `prisma/schema.prisma` e `tests/integration/setup.ts`.

**Interfaces:** `demandRemaining(sold:Units,delivered:Units,ready:Units,pendingTarget:Units):Units`; `finishedBalance(movements:Quantity[],commitments:Quantity[]):{physical:Quantity,reserved:Quantity,available:Quantity}`; `projectSaleStatus(lines:{sold:Units,delivered:Units,ready:Units,started:boolean}[]):SaleStatus`. Demanda negativa é erro; ENTREGUE precede PRONTA, depois EM_PRODUCAO, depois CONFIRMADA. Cancelamento comercial não passa pela projeção.

- [ ] Escrever asserts: demanda(10,3,2,5)=0; demanda(10,3,2,6) lança erro; físico8−2=6, reserva5−2=3, disponível3; peça1,5 recusada; overflow Int recusado. Venda10/entregue3/pronto7→PRONTA; pronto2→EM_PRODUCAO; entregue10→ENTREGUE; sem início→CONFIRMADA.
- [ ] Executar `node node_modules/vitest/vitest.mjs run tests/unit/production-quantities.test.ts tests/unit/production-states.test.ts`; confirmar falha por ausência do domínio.
- [ ] Implementar domínio e esquema definido acima. Migração mantém Sale/SaleItem/snapshots/financeiro/U2; modo LEGACY, sem entradas de estoque ou ordens automáticas. Atualizar limpeza após a guarda local de teste.
- [ ] Gerar cliente Prisma e aplicar migração somente no banco de testes. Teste de migração compara todos os campos de fixtures comerciais/financeiras/U2 e exige zeros nas novas razões; testa FKs, exclusividade de reserva e origem produtiva única. Rodar os três arquivos da tarefa; exigir PASS.
- [ ] Commit `feat: add production ledger and fulfillment contracts`.

## Task 2 — Comandos, estoque acabado e inventário

**Files:** criar `src/server/production/{commands,locks,finished-stock}.ts`, `tests/integration/production-commands.test.ts`, `tests/integration/finished-stock.test.ts`.

**Interfaces:** `runProductionCommand<T>(actor:Actor,type:string,input:Meta,action:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>`; `lockProduction(tx,ids:{saleIds:string[],orderIds:string[],finishedIds:string[],itemIds:string[]}):Promise<void>`; `saveFinishedStock(actor,raw):Promise<FinishedDTO>` com id/productId/active; `openFinishedStock(actor,raw):Promise<FinishedDTO>` com stockId/units/value nullable/effectiveDate; `adjustFinishedStock(actor,raw):Promise<FinishedDTO>` com stockId/deltaUnits/value nullable/effectiveDate/reason. Novo estoque exige expectedVersion0.

- [ ] Testes: habilitar produto não inventaria; ADMIN abre zero explicitamente; operador403 para abertura/ajuste; abertura8 com value null preserva desconhecido; ajuste que deixaria físico abaixo de comprometido falha. Mesmo comando simultâneo retorna uma abertura; chave igual/payload diferente conflita; usuário desativado/rebaixado é recusado no replay.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/production-commands.test.ts tests/integration/finished-stock.test.ts`; observar FAIL.
- [ ] Implementar hash canônico, autorização e transação; locks operação→vendas→ordens→acabados→materiais→financeiro, IDs ordenados em cada classe. Recebimentos U2 mantêm lock antes dos materiais e não adquirem ordens depois. Revalidar conjunto descoberto sob locks; se mudou, abortar/repetir desde início, nunca anexar lock anterior fora de ordem.
- [ ] Implementar habilitação/abertura/ajuste, razão por origem e limites sem negativo. Não mudar disponibilidade pública. Rodar testes; exigir PASS.
- [ ] Commit `feat: add controlled finished goods inventory`.

## Task 3 — Ordens, metas e reservas de material

**Files:** criar `src/server/production/{orders,reservations}.ts`, `tests/integration/production-orders.test.ts`, `tests/integration/production-reservations.test.ts`; alterar `src/server/stock/{reservations,queries}.ts` para discriminar reservas sem venda.

**Interfaces:** `saveOrder(actor,raw):Promise<OrderDTO>` com id opcional/origin/saleId/responsibleId/dueDate/notes/lines[{id?,saleLineKey?,productId?,description,technology,targetUnits,plannedPrinterId?}]; `releaseOrder(actor,raw):Promise<OrderDTO>` com orderId; `reserveOrderMaterial(actor,raw):Promise<OrderDTO>` com lineId/itemId/quantity/effectiveDate; `allocateSaleReservation(actor,raw):Promise<OrderDTO>` com lineId/reservationId/quantity; `releaseOrderReservation(actor,raw):Promise<OrderDTO>` com allocationId/quantity/reason. Versão dos comandos é da ordem, salvo alocação legada que inclui também reservationVersion.

- [ ] Testes: rascunho não reserva; liberar6+4 em venda10 passa, duas liberações disputando últimas4 só uma vence; STOCK exige produto ativo/inventariado; avulsa só SALE; estoque sem inventário bloqueia peça catalogada antes de produzir. Repartir reserva120g em70+50 mantém120, tentativa+1 falha. Reserva de ordem STOCK não requer venda e aceita falta justificada U2.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/production-orders.test.ts tests/integration/production-reservations.test.ts`; observar FAIL.
- [ ] Implementar liberação com snapshots privados de tarifa/versão e premissas da máquina planejada; ausência de custo marca incompleto. Validar usuário/máquina/tecnologia. Edição de rascunho livre com versão; após liberação só responsável/prazo/notas/máquina planejada com evento, sem mudar identidade ou meta silenciosamente.
- [ ] Reservas compartilhadas liberam apenas parte da ordem; proteger ações U2 genéricas contra retirar parcelas alocadas. Rodar testes novos e stock-reservations/sales; exigir PASS.
- [ ] Commit `feat: add production orders and allocated material reservations`.

## Task 4 — Apontamentos atômicos e proteção de consumos

**Files:** criar `src/server/production/{reports,material-links,corrections}.ts`, `tests/integration/production-reports.test.ts`, `tests/integration/production-material-links.test.ts`; alterar `src/server/stock/{reservations,corrections}.ts` e `src/domain/production/validation.ts`.

**Interfaces:** `recordProduction(actor,raw):Promise<OrderDTO>` com lineId/executorId/printerId nullable/manualStage/goodUnits/failedUnits/machineMinutes/setupMinutes/finishingMinutes nullable/materialComplete/timeComplete/reprintOf nullable/materials[{itemId,reservationAllocationId?,quantity,allocations?,allowExcess}]/effectiveDate; `linkExistingConsumption(actor,raw):Promise<OrderDTO>` com eventId/movementId/quantity/reason; `consumeStockTx(tx,actor,input:ConsumeInput):Promise<MovementDTO>` extraído do serviço U2, exigindo locks adquiridos. `correctProduction(actor,raw):Promise<OrderDTO>` com sourceEventId, goodUnitsToReverse, failedUnitsToReverse, tempos a compensar, retornos[{linkId,quantity}], declaration:'ENTRY_ERROR'|'PHYSICAL_MATERIAL_RETURN', effectiveDate/reason; valida todos os limites líquidos.

- [ ] Testes: ficha100g/real120g→saída120; peça5/falha1→entrada5; apontamento só tempo/consumo não cria peça; reimpressão soma novo real; falha exige motivo; tentativa referenciada pertence à mesma linha e possui falha líquida. Falha injetada após consumo desfaz tudo; replay não repete. Zero declarado difere de null.
- [ ] Testes de legado: ADMIN vincula 30 de consumo50 e depois20, mais1 recusado; operador403; outra venda recusada; material já devolvido reduz limite. Corrigir pela rota U2 consumo vinculado é bloqueado com orientação para produção; concorrência vínculo/correção termina sem excesso ou deadlock.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/production-reports.test.ts tests/integration/production-material-links.test.ts`; observar FAIL.
- [ ] Extrair helper tx sem alterar contrato externo U2. Confirmar consumo/evento/entrada de peça/compromisso automático SALE juntos. Avulsa usa FinishedStock privado da linha. Quantidades boas não excedem meta líquida; reimpressão usa restante. Preservar autores e premissas reais.
- [ ] Implementar correção ADMIN com compensação, limites e bloqueio de peças entregues/comprometidas ainda não resolvidas. U2 revalida vínculo sob lock de material e recusa alteração genérica vinculada; não tenta adquirir ordem após material. Repetir novos testes e stock-corrections/stock-reservations; exigir PASS.
- [ ] Commit `feat: record production and material consumption atomically`.

## Task 5 — Alocação de peças, entrega e correção

**Files:** criar `src/server/production/{fulfillment,deliveries}.ts`, `tests/integration/production-deliveries.test.ts`; alterar `src/server/sales.ts`.

**Interfaces:** `reserveFinished(actor,raw):Promise<FinishedDTO>` com saleId/lineKey/stockId/units/originAllocations[{originId,units}]; `releaseFinished(actor,raw):Promise<FinishedDTO>` com commitmentId/units/reason; `suggestFinished(actor,saleId:string,lineKey:string,units:Units):Promise<{originId:string,units:Units}[]>` FIFO por sequência/id; `recordDelivery(actor,raw):Promise<DeliveryDTO>` com saleId/lines[{lineKey,allocations[{commitmentId,units}]}]/effectiveDate/notes; `correctDelivery(actor,raw):Promise<DeliveryDTO>` com deliveryId/lines[{deliveryLineId,units}]/declaration:'ENTRY_ERROR'/reason/effectiveDate. Entrega usa versão da venda; compromisso usa versão do FinishedStock e saleVersion explícita.

- [ ] Testes: fabricar8/reservar5/entregar2→6/3/3; duas vendas disputando última1→um sucesso; alocar pronta-entrega quando meta produtiva já cobre demanda falha até liberar a meta. Produto diferente e origem avulsa de outra venda recusados. Entregar acima da quantidade comprometida e repetição com nova chave não excedem saldo.
- [ ] Testes: entrega parcial permite reserva de material restante; final bloqueia reserva/meta aberta. Compensação parcial retorna peça e compromisso, mantém original e não altera recebíveis; segunda compensação excessiva recusada. Devolução física não aceita declaration de erro automaticamente.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/production-deliveries.test.ts`; observar FAIL.
- [ ] Implementar alocações e movimentos atômicos, projeção de status usando tarefa1; status U3 pode regredir após correção auditada, sem chamar transição linear legada. Rodar novos testes e sales/finance-settlements; exigir PASS.
- [ ] Commit `feat: add partial fulfillment and traceable deliveries`.

## Task 6 — Custo real revisável por linha e origem

**Files:** criar `src/server/production/costs.ts`, implementar `src/domain/production/costs.ts`, criar `tests/unit/production-costs.test.ts`, `tests/integration/production-costs.test.ts`.

**Interfaces:** `calculateProductionCost(input:ProductionCostInput):LineCostDTO`; input contém goodUnits/closed/materials[{value:string|null,provisional:boolean}]/timeComplete/materialComplete e etapas[{machineMinutes,setupMinutes,finishingMinutes,watts,energyRate,maintenancePerHour,laborPerHour,acquisitionCost,amortizationMonths,daysPerMonth,hoursPerDay}], valores decimais nullable; DTO contém knownTotal/total nullable/unitCost nullable/lossCost nullable/provisional/missing:string[] e componentes. `refreshProductionCosts(actor,orderId:string):Promise<LineCostDTO[]>`; `ensureProductionCostRevision(tx,lineId:string):Promise<LineCostDTO>`.

- [ ] Testes: material30, máquina60min/100W/tarifa1, manutenção2/h, trabalho30min/10/h, depreciação1200/(12×20×5) por hora=1: total38,10; 3 boas→12,70. Sem taxa conhecida→total/unitCost null e subtotal conhecido preservado. Zero boas/encerrada→lossCost38,10 sem divisão. Falhas reais entram uma vez, sem percentual estimado.
- [ ] Teste integração: custo U2 provisório em peça entregue reconcilia ao confirmar compra; nova revisão preserva anterior, quantidades/parcelas/caixa iguais. Mesmo hash não cria revisão adicional; consulta OPERATOR não inclui custo. Dez origens da mesma linha dividem pelo total de boas, não por boas de cada origem.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/unit/production-costs.test.ts tests/integration/production-costs.test.ts`; observar FAIL.
- [ ] Implementar decimal precisão40/HALF_UP, totais armazenados6 casas e resíduo na última alocação. Premissas fixas da liberação, máquina efetiva por evento. Sem taxa/tempo usar null, nunca buscar tarifa atual para completar história.
- [ ] Revisões são atualizadas antes de retornar consulta ADMIN de custo ou atualização explícita, com locks globais e leitura das revisões U2 atuais. Assim confirmação financeira U2 não adquire lock produtivo depois de material. Não servir cache antigo como definitivo; resultado inclui hash/IDs das fontes. Consulta OPERATOR não precisa atualizar custos. Rodar testes e stock-valuation; exigir PASS.
- [ ] Commit `feat: add revisioned production cost coverage`.

## Task 7 — Encerramento, cancelamento e adesão legada

**Files:** criar `src/server/production/{lifecycle,legacy}.ts`, `tests/integration/production-lifecycle.test.ts`, `tests/integration/production-legacy.test.ts`; alterar `src/server/sales.ts`, `src/domain/commerce/types.ts`, `src/server/stock/reservations.ts`.

**Interfaces:** `completeOrder(actor,raw):Promise<OrderDTO>` com orderId; `cancelOrderRemainder(actor,raw):Promise<OrderDTO>` com orderId/lines[{lineId,unitsToCancel,dispositions[{originId,units,action:'KEEP_SALE'|'RELEASE_STOCK'|'LOSS'}]}]/reason; `adoptSaleProduction(actor,raw):Promise<SaleDTO>` com saleId/lines[{lineKey?,saleItemId,recognizedReadyUnits,recognizedDeliveredUnits}]/reason; `prepareSaleProductionCancellation(tx,actor,saleId:string):Promise<void>` exige ordens encerradas, nenhuma entrega/compromisso pendente, em vez de inferir destinação.

- [ ] Testes: operador cancela sem apontar; depois403. Cancelar restante preserva custo/consumo e libera meta; transferir peças para estoque conserva origem; avulsa sem produto não pode transferir. Concluir meta incompleta/reserva aberta falha; metacompleta com custo desconhecido pode concluir e mantém cobertura incompleta.
- [ ] Testes: venda com entrega não cancela; pagamento não estornado impede cancelamento e rollback conserva reservas; cancelamento de ordem não toca parcelas. Venda antiga PRONTA não ganha peças; adesão explícita com3 prontas cria origemLEGACY e custo null sem consumo; venda entregue/cancelada não adere. Reconhecimento entregue não excede vendido e não repete saída histórica de material.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/production-lifecycle.test.ts tests/integration/production-legacy.test.ts`; observar FAIL.
- [ ] Implementar fluxos, datas São Paulo e histórico. Na adesão usar lineKey existente ou `legacy:<SaleItem.id>`, sem regravar documento; reconhecer pronto/entregue por eventos LEGACY separados, registrar snapshot da reconciliação. Novas confirmações/conversões escrevem U3; antigas seguem LEGACY. Bloquear avanço manual de status U3.
- [ ] Rodar testes novos, sales/commerce-pricing/stock-reservations/finance-concurrency; exigir PASS.
- [ ] Commit `feat: preserve legacy sales and production cancellation history`.

## Task 8 — Consultas e APIs privadas

**Files:** criar `src/server/production/{queries,http}.ts`, `src/app/api/production/orders/route.ts`, `src/app/api/production/orders/[id]/route.ts`, `src/app/api/production/finished/route.ts`, `src/app/api/production/deliveries/route.ts`, `src/app/api/production/commands/route.ts`, `tests/integration/production-http.test.ts`.

**Interfaces:** `listOrders(actor,raw):Promise<{items:OrderDTO[],total:number}>`; `getOrder(actor,id:string):Promise<OrderDTO|AdminOrderDTO>`; `listFinished(actor,raw):Promise<{items:FinishedDTO[],total:number}>`; `listDeliveries(actor,raw):Promise<{items:DeliveryDTO[],total:number}>`. Filtros query/status/origin/responsibleId/saleId/dueFrom/dueTo/page/pageSize; parâmetros desconhecidos recusados. POST união `{action,payload}` das funções tarefas2–7, sem acesso direto aos helpers tx.

- [ ] Testes: anônimo401; operador403 em inventário/correção/custos/adesão; papel vigente respeitado em replay; usuário inativo recusado. Corpo>256KiB→413, filtro inválido400; origem externa recusada; inspeção recursiva de respostas operador/públicas não encontra custo/premissas/valores U2.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/production-http.test.ts`; observar FAIL. Reler guias Next de route handlers antes das rotas.
- [ ] Implementar autenticação e projeções explícitas após comando, inclusive replay; reutilizar formato de erro HTTP existente. Paginação estável por sequência/id; consultas por ID não vazam existência privada a anônimo.
- [ ] Rodar novo teste mais stock-http/commerce-http/pricing-http; exigir PASS.
- [ ] Commit `feat: expose private production workflows`.

## Task 9 — Interface de produção, estoque e venda

**Files:** criar `src/app/(private)/producao/page.tsx`, `src/components/production/{production-panel,order-form,order-detail,report-form,finished-panel,delivery-form,correction-form,legacy-adoption}.tsx`, `src/lib/production-client.ts`, `tests/unit/production-ui.test.tsx`; alterar `src/components/stock/stock-panel.tsx`, `src/components/commerce/sale-detail.tsx`, `src/components/shell/app-shell.tsx`.

**Interfaces:** componentes recebem DTOs tarefa8; `productionCommand(action:string,payload:unknown):Promise<unknown>` mantém UUID por conteúdo/submissão, reutiliza em retry e renova após sucesso/edição. Erros de campo/versão preservam formulário. Usar componentes UI locais e guias Next client/server/navegação.

- [ ] Testes: OPERATOR sem campos de custo; estoque não inventariado distinto de zero; falta de peças oferece produzir, não entregar negativo; tentativa falha exige motivo; apontamento incremental mostra total anterior; null distinto de zero. Erro de rede conserva dados e chave, conflito solicita revisar sem perder rascunho.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/unit/production-ui.test.tsx`; observar FAIL.
- [ ] Implementar navegação Produção, filtros, ordens, apontamentos, reservas, origens de acabado e entrega por linha. Mostrar quantidades e efeitos antes da confirmação; correções separam erro de lançamento de devolução comercial. Venda legada mostra adesão ADMIN; U3 oculta transições antigas. ADMIN pode verificar premissas/custo provisório sem repassar esses campos ao operador.
- [ ] Rodar teste e inspeção em base isolada ADMIN/OPERATOR, 1440/390px, claro/escuro, teclado, rascunho/erro/retry. Sem overflow da página ou erro de JS; registrar evidências e limites nativos de tema/impressão.
- [ ] Commit `feat: add production and partial delivery screens`.

## Task 10 — Aceite integrado e preparação de implantação

**Files:** criar `tests/integration/production-flow.test.ts`; atualizar `README.md`, `docs/VALIDACAO.md` e este plano; evidências ignoradas em `test-results/production-u3/` e progresso em `test-results/production-u3-execution/progress.md`.

**Interfaces:** usar somente serviços/rotas finais das tarefas anteriores; não introduzir contrato funcional novo.

- [ ] Escrever fluxo venda10→ordens6+4→5 boas/1falha→entregar3→reimprimir1→concluir restante→entrega final; asserts de saldo, demanda, reservas, tentativas, valores comerciais e parcelas idênticas. Acrescentar fabricar8→reservar5→entregar2 com saldo6/3/3, compra conferida tardiamente e custo reconciliado sem caixa novo.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/production-flow.test.ts`; exigir PASS após corrigir violações nos serviços responsáveis. Testar rollback e disputa por últimas peças com chaves distintas.
- [ ] Rodar suíte completa `node node_modules/vitest/vitest.mjs run`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`, com ambiente de testes explicitamente conferido. Usar runtime Linux de ferramentas existente se reaparecer limitação P2028 do Windows já documentada, preservando banco isolado e guarda local; não mudar regras de domínio para contornar ambiente.
- [ ] Ensaiar migração sobre restauração isolada de backup atual, comparar linhas/bytes das tabelas anteriores, testar leitura de documentos e snapshots legados e registrar recuperação coordenada. Backup U2 antigo é referência, não substitui novo backup anterior ao deploy U3.
- [ ] Fazer revisão independente final contra especificação/plano e diff; corrigir achados com regressões e repetir checks afetados. Registrar contagem real de testes, limites, alterações e resultado da revisão, sem promover histórico antigo a evidência atual.
- [ ] Commit `docs: record production acceptance and rollout readiness`. Apresentar versão candidata, backup/recuperação, migrações e evidências antes da etapa de implantação. Não publicar nem afirmar implantação apenas por build aprovado.

## Cobertura e revisão do plano

Spec1–3: tarefas1–3; spec4:3–4; spec5:2/4/5; spec6:6; spec7:5/7; spec8:4/5/7; spec9:2/8/9; spec10: testes distribuídos e tarefa10. Os cinco riscos de Review Focus possuem testes nas tarefas indicadas. Nenhuma expansão U4/U5/U6 incluída.

Revisão interna: ordem dos locks inclui peças avulsas; proteção de correções genéricas U2 definida; custo é atualizado por revisão em leitura ADMIN sem inverter locks de compras; modo legado e conversão de orçamento contemplados; zero desconhecido, parcelas e snapshots preservados. Especificação e plano aprovados pelo usuário antes da implementação. Método direto com revisão independente final preservado, sem solicitar escolha novamente.

## Fechamento em 09/10/2026

As tarefas 1–10 foram implementadas e verificadas como conjunto. As listas acima conservam o roteiro original; o relatório de entrega e docs/VALIDACAO.md registram a evidência efetivamente executada e as adaptações, sem tratar cada comando proposto como execução literal. Revisão independente concluída após regressões dos achados. A etapa de publicação U3 permanece separada.
