# Estoque integrado U2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar estoque híbrido auditável, reservas e recebimentos com contas a pagar, preservando a operação B2T existente.

**Architecture:** Razão imutável de quantidades separado de reservas, revisões de valorização e obrigações financeiras. Serviços transacionais compartilham locks e comandos idempotentes; recebimento físico e confirmação financeira são estados separados. Reutilizar Material, PricingExtra, Sale e FinancialEntry, sem duplicar cadastros ou recebíveis.

**Tech Stack:** Next.js instalado, React, TypeScript, Prisma/PostgreSQL 17, Decimal.js, Zod, Vitest, componentes locais shadcn/ui. Sem nova dependência de produto prevista.

**Spec:** `docs/superpowers/specs/2026-10-06-estoque-integrado-design.md`, aprovada pelo usuário em 06/10/2026.

## Global Constraints

- ADMIN e OPERATOR podem movimentar e deixar saldo negativo mediante justificativa.
- Método de custo por item: média ponderada ou referência manual; configuração exclusiva de ADMIN.
- Preços comerciais e cálculos históricos não mudam automaticamente.
- Estoque inicial, devoluções e ajustes não geram contas a pagar.
- Quantidades e custos usam Decimal, até seis casas; unidades contáveis são inteiras. Dinheiro financeiro usa centavos e o arredondamento já existente.
- Uma localização; identidade opcional; fornecedor textual; sem ordens de produção ou compra nesta entrega.
- Datas civis de São Paulo; sequência de lançamento determina valorização; data futura recusada.
- Recebimento: máximo 100 linhas; parcelamento: máximo 120; justificativa: 3–2.000 caracteres.
- Leitura paginada (20 padrão, 100 máximo); corpos JSON de estoque limitados a 256 KiB.
- Não alterar produção durante implementação; testes exclusivamente em PostgreSQL local `b2t_test`. Nunca reutilizar `.env` operacional para testes.
- Criar checkout isolado na execução; ler `AGENTS.md` e guias relevantes em `node_modules/next/dist/docs/` antes de alterar Next.js.

## Review Focus

1. Confirmação tardia de custo após consumo/devolução: cadeia inteira deve permanecer provisória ou ser reconciliada, nunca parcialmente definitiva (tarefa 3).
2. Cancelamento de venda concorrente com reserva/consumo: nenhuma reserva órfã ou liberação duplicada (tarefa 5).
3. Duas compras tentando vincular o mesmo grupo financeiro: apenas uma vence; nenhum vínculo parcial (tarefa 6).
4. Identidade individual negativa com agregado positivo: justificativa e alerta continuam obrigatórios (tarefa 4).
5. Correção após material consumido ou conta paga: histórico e baixa permanecem intactos; caminho corretivo explícito (tarefa 7).

## Contratos e mapa dos arquivos

Criar `src/domain/stock/{types,validation,quantities,valuation}.ts` para contratos e funções puras; `src/server/stock/{commands,catalog,movements,reservations,receipts,valuation,corrections,queries,pricing-reference}.ts` para persistência. DTOs públicos internos nunca são modelos Prisma espalhados indiscriminadamente.

Em `types.ts`: `Quantity=string`, `Unit='G'|'ML'|'UNIT'`, `CostMethod='WEIGHTED_AVERAGE'|'MANUAL'`, `StockState={physical:Quantity,reserved:Quantity,available:Quantity,shortage:Quantity}`, `OperationMeta={operationKey:string,expectedVersion:number,reason?:string,effectiveDate:string}`. `StockAllocation={identityId:string|null,quantity:Quantity}`; null significa sem identificação. Quantidades de comando são positivas; tipo determina sinal.

`StockItemDTO` inclui identidade, unidade, estado de inventário, versão, saldos e distribuições. `StockAdminItemDTO` acrescenta método, referência e estado da valorização. `MovementDTO` inclui origem, quantidade, autor/datas/motivo e referência corretiva, sem valores financeiros para operador. `ReceiptDTO` tem linhas físicas e situação de conferência; `AdminReceiptDTO` acrescenta valores e obrigações. `ReservationDTO` tem item, venda/lineKey, quantidade reservada/consumida/liberada e versão.

Inputs em `validation.ts`: `ItemInput`, `OpeningInput`, `MovementInput`, `ReserveInput`, `ConsumeInput`, `ReceiveInput`, `ConfirmReceiptInput`, `CorrectionInput`, `StockFilter`. Todos schemas strict; derivações TypeScript por Zod. `ReceiveInput` contém fornecedor, documento opcional e até 100 linhas `{itemId,quantity,allocations}`. `ConfirmReceiptInput` contém valores alocados por linha e união `CREATE` (categoria e parcelas) ou `LINK` (lista completa de IDs existentes). Operador não pode enviar valores/campos de confirmação financeira.

As APIs chamam serviços `(actor:Actor, raw:unknown)`; cada serviço valida o schema, permissão e versão. Os tipos dos comandos incluem `OperationMeta`; confirmação tardia usa a versão do recebimento, não reaplica entrada física.

## Task 1 — Razão, contratos e migração aditiva

**Files:** criar os quatro arquivos de domínio acima; alterar `prisma/schema.prisma`, `tests/integration/setup.ts`; criar `prisma/migrations/202610060001_stock/migration.sql`, `tests/unit/stock-quantities.test.ts`, `tests/integration/stock-migration.test.ts`, `tests/fixtures/stock.ts`.

**Interfaces:** `toBaseQuantity(value:string,from:'KG'|'L'|Unit,to:Unit):Quantity`; `stockState(physical:Quantity,reserved:Quantity):StockState`; schemas e DTOs definidos no mapa.

- [ ] Escrever testes: `toBaseQuantity('1.5','KG','G')==='1500'`; conversão L→G recusada; UNIT fracionária recusada; `stockState('700','900')` resulta em disponível `-200`, falta `200`; quantidade com mais de seis casas e excesso monetário recusados.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/unit/stock-quantities.test.ts`; observar FAIL antes de implementar.
- [ ] Criar modelos StockItem, StockIdentity, StockMovement, StockMovementAllocation, StockReservation, StockReservationEvent, StockValuationRevision, StockValuationAllocation, PurchaseReceipt, PurchaseReceiptLine, ReceiptFinancialLink e StockCommand. Usar FKs restritivas, índices por item/sequência e origem, vínculo único de material/complemento e de FinancialEntry, chave única de operação. Reservas referenciam Sale + lineKey estável, não IDs recriados de SaleItem. Decimais de quantidade/custo em (24,6); intermediários em Decimal de precisão 40.
- [ ] Criar migração sem saldos automáticos. Testar aplicação sobre base anterior com produto/imagem/orçamento/venda/financeiro e comparar valores/bytes; testar unicidade de vínculos e rollback de inconsistências. Atualizar limpeza de testes somente após guarda de banco local.
- [ ] Implementar conversão, limites e saldos; gerar Prisma e aplicar migração somente na base de teste. Rodar os dois arquivos de teste; esperado PASS. Commit `feat: add stock ledger schema and quantity contracts`.

## Task 2 — Cadastros, permissões e comandos transacionais

**Files:** criar `src/server/stock/commands.ts`, `catalog.ts`, `tests/integration/stock-catalog.test.ts`, `tests/integration/stock-commands.test.ts`; alterar `src/server/catalog-inputs.ts`.

**Interfaces:** `runStockCommand<T>(actor:Actor,type:string,raw:unknown,action:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>`; `lockStockItems(tx,ids:string[]):Promise<void>`; `saveStockItem(actor,raw):Promise<StockAdminItemDTO>`; `openInventory(actor,raw):Promise<StockAdminItemDTO>`.

- [ ] Escrever `enableDoesNotInventZero` (não inventariado), `operatorCannotOpenOrChangeMethod` (403), `explicitZeroOpening` (contado com zero), `duplicateMaterialRejected`, `sameKeySamePayloadOnce`, `sameKeyDifferentPayloadConflict`. Testar referência manual zero explicitamente aceita, referência ausente recusada; inventário positivo exige custo em ambos os métodos.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/stock-catalog.test.ts tests/integration/stock-commands.test.ts`; esperado FAIL.
- [ ] Implementar envelope idempotente com hash canônico, autoria, resultado interno e locks de operação. Ordem global: operação → venda quando existente → recebimento → itens em ID ordenado → obrigações financeiras em ID ordenado. Não usar runFinanceCommand dentro de outra transação; tarefas financeiras recebem o mesmo tx.
- [ ] Bloquear mudança incompatível de unidade/material/tecnologia após movimento. ADMIN configura método; proibir troca com déficit ou valorização pendente, registrar vigência e abertura de custo sem movimento físico.
- [ ] Rodar arquivos acima e `tests/integration/settings.test.ts`; esperado PASS. Commit `feat: add controlled stock catalog and initial inventory`.

## Task 3 — Valorização auditável e custo provisório

**Files:** implementar `src/domain/stock/valuation.ts`, criar `src/server/stock/valuation.ts`, `tests/unit/stock-valuation.test.ts`, `tests/integration/stock-valuation.test.ts`.

**Interfaces:** `ValuationEvent={id:string,sequence:number,kind:string,quantity:Quantity,confirmedValue:string|null,sourceId:string|null,method:CostMethod,manualUnitCost:string|null}`; `ValuationResult={physical:Quantity,knownValue:string|null,unitCost:string|null,provisional:boolean,allocations:ValuationAllocation[]}`; `ValuationAllocation={sourceId:string,targetId:string,quantity:Quantity,value:string|null,provisional:boolean}`. `valueLedger(events:ValuationEvent[]):ValuationResult`; `revalueItem(tx,itemId:string):Promise<void>` persiste nova revisão e alocações, nunca sobrescreve eventos.

- [ ] Escrever testes com os exemplos exatos: 1.000g/R$100 + 500g/R$75, saída 300g → R$35; déficit 200g estimado R$20, entrada 500g/R$60 → cobertura R$24, diferença R$4, saldo 300g/R$36. Manual R$0,10/g permanece após entrada R$0,12/g.
- [ ] Acrescentar testes de déficit parcialmente coberto, ausência de média conhecida (`null`, nunca zero), duas entradas sem custo, confirmação fora da ordem, devolução entre entrada e confirmação e mudança de referência manual entre saídas. Saídas dependentes de valores pendentes continuam provisórias.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/unit/stock-valuation.test.ts tests/integration/stock-valuation.test.ts`; esperado FAIL.
- [ ] Implementar replay por sequência: cobrir déficit cronológico antes de adicionar estoque positivo; calcular média apenas sobre quantidades positivas; reconciliações preservam versões anteriores. Pendência propaga por dependências até resolução. Arredondar valores armazenados com HALF_UP, carregando resíduos de alocação na última parcela para fechar total sem perder valor. Devolução usa custo da origem/revisão reconciliada, e não média atual.
- [ ] Confirmar repetição do replay sem novos fatos não cria revisão duplicada, usando hash dos fatos/valores confirmados. Executar testes; esperado PASS. Commit `feat: add stock valuation and deficit reconciliation`.

## Task 4 — Movimentos e recebimento físico

**Files:** criar `src/server/stock/movements.ts`, `receipts.ts`, `tests/integration/stock-movements.test.ts`, `stock-receipts.test.ts`.

**Interfaces:** `postMovement(tx,actor,input:MovementInput):Promise<MovementDTO>` (helper interno exige autorização e locks já adquiridos); `recordMovement(actor,raw):Promise<MovementDTO>`; `receivePurchase(actor,raw):Promise<ReceiptDTO>`; chamar `revalueItem` da tarefa 3 na mesma transação.

- [ ] Escrever testes: entrada 500g dividida em 300g identificados + 200g sem identificação; soma incorreta recusada; grupo identificado −10g com agregado +100g exige motivo; agravamento de negativo exige motivo, redução não; operador recebe e não acessa valores; nenhuma conta a pagar ou caixa criada no recebimento físico.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/stock-movements.test.ts tests/integration/stock-receipts.test.ts`; esperado FAIL.
- [ ] Implementar gravação atômica de razão/distribuições/recebimento e validação de inventário inicial. Recalcular saldos sob lock. Tipo de movimento determina permissão e sinal; não permitir consumo anônimo mudar o método de custo. Recebimento multi-item falha integralmente se uma linha for inválida.
- [ ] Testar concorrência entre duas saídas e duas entradas com mesma chave; testar data retroativa com/sem motivo e futura recusada. Executar testes; esperado PASS. Commit `feat: add traceable stock movements and physical receipts`.

## Task 5 — Reservas, consumo e transições de venda

**Files:** criar `src/server/stock/reservations.ts`, `tests/integration/stock-reservations.test.ts`; alterar `src/server/sales.ts`.

**Interfaces:** `reserveStock(actor,raw):Promise<ReservationDTO>`; `consumeStock(actor,raw):Promise<MovementDTO>`; `releaseReservation(actor,raw):Promise<ReservationDTO>`; `releaseSaleReservations(tx,actor,saleId:string):Promise<void>`; `assertSaleReservationsResolved(tx,saleId:string):Promise<void>`.

- [ ] Escrever teste do exemplo 1.000→reservar1.200→consumir300→receber500, com saldos disponíveis −200, −200, 300. Consumir libera reserva na mesma transação; quantidade excedente exige confirmação explícita `allowExcess:true` além de motivo quando negativo.
- [ ] Testar reservar em rascunho/cancelada/entregue recusado; cancelamento concorrente com reserva/consumo sem órfãos; entrega bloqueada com reserva aberta; consumo não cria recebível ou CashMovement. Rodar `node node_modules/vitest/vitest.mjs run tests/integration/stock-reservations.test.ts`; esperado FAIL.
- [ ] Integrar locks de venda aos comandos existentes sem inverter ordem; liberar somente reserva restante no cancelamento. Manter consumos existentes. Em entrega exigir consumir/liberar previamente, com mensagem identificável. Sugestão de ficha V2 só aceita vínculos existentes, sem busca por nome.
- [ ] Executar testes novos mais `tests/integration/sales.test.ts` e `tests/integration/commerce-pricing.test.ts`; esperado PASS. Commit `feat: connect stock reservations to sales`.

## Task 6 — Confirmação financeira e contas a pagar

**Files:** criar `src/server/stock/purchase-finance.ts`, `tests/integration/stock-purchase-finance.test.ts`; alterar `src/server/finance/entries.ts` e `src/domain/finance/types.ts`.

**Interfaces:** `confirmReceiptFinance(actor,raw):Promise<AdminReceiptDTO>`; helper `createPurchasePayables(tx,actor,receiptId:string,input:ConfirmReceiptInput):Promise<string[]>`; `linkPurchasePayables(tx,receiptId:string,entryIds:string[]):Promise<void>`. Reutilizar lógica de parcelas existente extraindo helper tx, sem mudar contrato externo de createEntryGroup.

- [ ] Escrever testes: compra R$100 em três parcelas → 33,34/33,33/33,33; soma diferente recusada; OPERATOR403; quantidade já recebida não muda ao confirmar; duas confirmações geram um grupo e zero movimentos de caixa.
- [ ] Testar LINK de grupo inteiro, inclusive já pago; PAYABLE obrigatório, não cancelado, contraparte conferida e total igual. Dois recebimentos concorrentes vinculando mesmo grupo → um sucesso e um conflito, sem vínculo parcial. Rodar `node node_modules/vitest/vitest.mjs run tests/integration/stock-purchase-finance.test.ts`; esperado FAIL.
- [ ] Implementar confirmação atômica: lock recebimento/itens/obrigações, confirmar custos, criar/vincular parcelas, registrar conferência e revalorizar. Validar categorias ativas de despesa; documento e origem aparecem no DTO ADMIN. Erro de parcela/custo não confirma recebimento nem altera custos.
- [ ] Bloquear update/cancel genérico de principal vinculado com mensagem que aponta ao recebimento; não bloquear baixa/estorno existente. Executar testes novos e finance-entries/finance-settlements/finance-concurrency; esperado PASS. Commit `feat: connect purchase receipts to existing payables`.

## Task 7 — Correções e referência da calculadora

**Files:** criar `src/server/stock/corrections.ts`, `pricing-reference.ts`, `tests/integration/stock-corrections.test.ts`, `stock-pricing-reference.test.ts`.

**Interfaces:** `correctStock(actor,raw):Promise<MovementDTO>`; `cancelReceipt(actor,raw):Promise<AdminReceiptDTO>`; `resolveReturnFinance(actor,raw):Promise<AdminReceiptDTO>`; `applyStockReference(actor,raw):Promise<{referenceId:string,version:number}>`.

- [ ] Escrever testes de devolução de consumo acima da origem recusada; devolução ao fornecedor referencia entrada e cria pendência financeira sem dívida automática; cancelamento com baixa vigente ou consumo dependente recusado sem efeito parcial. Rodar os dois novos arquivos; esperado FAIL.
- [ ] Implementar compensações referenciadas sem apagar eventos. Cancelamento integral só sem dependências e sem baixas; cancelar obrigação e compensar físico atomicamente. Resolver devolução financeira por ADMIN: se não há baixa, reduzir/cancelar explicitamente saldo principal vinculado com motivo; com baixa, exigir estorno pelo fluxo existente antes dessa redução. Nunca reescrever pagamentos. Se não há ajuste financeiro devido, registrar decisão motivada de manter obrigação, encerrando a pendência.
- [ ] Testar aplicação explícita de R$0,12/g como R$120/kg no Material, com versão; provisório/null recusado; operador403; preço de produto e snapshot histórico inalterados. Implementar atualização transacional por versão para Material/PricingExtra, somente quando unidades forem compatíveis.
- [ ] Executar testes novos e `tests/integration/product-pricing.test.ts`; esperado PASS. Commit `feat: add stock corrections and explicit pricing references`.

## Task 8 — Consultas e rotas protegidas

**Files:** criar `src/server/stock/queries.ts`, `src/app/api/stock/{items,movements,reservations,receipts}/route.ts`, `src/app/api/stock/items/[id]/route.ts`, `src/app/api/stock/commands/route.ts`, `tests/integration/stock-http.test.ts`.

**Interfaces:** `listStock(actor,filter:StockFilter):Promise<{items:StockItemDTO[],total:number}>`; `getStock(actor,id:string):Promise<StockItemDTO|StockAdminItemDTO>`; `listReceipts(actor,filter:StockFilter):Promise<{items:ReceiptDTO[],total:number}>`. POST commands usa união discriminada de ações e schemas das tarefas anteriores; permissões verificadas dentro dos serviços, não só pelo dispatcher.

- [ ] Escrever testes HTTP anônimo401, operador403 nas ações administrativas, payload com custo pelo operador recusado, origem externa recusada, >256KiB413, filtro/página inválidos400. Assert nenhum campo financeiro em respostas de operador, inclusive resposta idempotente originalmente criada por ADMIN.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/stock-http.test.ts`; esperado FAIL. Ler guias instalados de route handlers/server components antes de escrever rotas.
- [ ] Implementar projeções por papel depois de recuperar resultado idempotente; autenticar novamente usuário desativado. Movimentos paginados por sequência/id; reposição usa falta disponível sem duplicar déficit/reserva.
- [ ] Executar testes novos e finance-http/pricing-http; esperado PASS. Commit `feat: expose protected stock workflows`.

## Task 9 — Interface operacional e administrativa

**Files:** criar `src/app/(private)/estoque/page.tsx`, `src/components/stock/{stock-panel,item-form,movement-form,receipt-form,receipt-finance,reservation-form,ledger}.tsx`, `src/lib/stock-client.ts`, `tests/unit/stock-ui.test.tsx`; alterar `src/components/shell/app-shell.tsx`, `src/components/commerce/sale-detail.tsx`, `src/components/finance/entry-panel.tsx`.

**Interfaces:** componentes recebem DTOs das tarefas anteriores; `stockCommand(action:string,payload:unknown):Promise<unknown>` usa envelope HTTP padrão e não engole erros de campos/conflitos. Chave idempotente estável por submissão, nova após sucesso ou mudança do conteúdo.

- [ ] Escrever testes: “Não inventariado” distinto de zero; negativo exige motivo; formulário de recebimento operador sem valores/parcelas; conferência ADMIN oferece CREATE/LINK; falha de rede preserva linhas/motivo e chave; conflito permite revisar sem perder rascunho; estoque provisório não oferece aplicar custo.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/unit/stock-ui.test.tsx`; esperado FAIL. Ler guias Next instalados para client/server e navegação.
- [ ] Implementar lista/detalhe/razão, identificações, reposição, pendências, reservas dentro da venda e vínculo de origem nas obrigações. Usar componentes locais, português, datas/valores brasileiros; separar confirmação física e financeira. Confirmações mostram efeitos e custo anterior/novo quando aplicável.
- [ ] Executar testes e inspecionar desktop/390px, ADMIN/OPERATOR, temas claro/escuro e erros; sem overflow, foco/rótulos adequados. Commit `feat: add stock and purchasing screens`.

## Task 10 — Aceite integrado e preparação de implantação

**Files:** criar `tests/integration/stock-flow.test.ts`; atualizar `README.md`, `docs/VALIDACAO.md` e este plano; evidências ignoradas em `test-results/stock-u2/`.

**Interfaces:** consumir serviços/rotas finais; não introduzir novo contrato de produto.

- [ ] Criar fluxo de aceite: inventariar1.000g → reservar1.200g com motivo → consumir300g → operador recebe500g → ADMIN confirma compra parcelada → baixa parcial existente → conferir saldo físico1.200/reservado900/disponível300, custos, vínculo único e caixa somente pela baixa.
- [ ] Acrescentar fluxo referência manual, déficit coberto em duas entradas, devolução parcial, cancelamento bloqueado com baixa e isolamento público. Rodar `node node_modules/vitest/vitest.mjs run tests/integration/stock-flow.test.ts`; corrigir falha de contrato no serviço responsável e repetir casos afetados.
- [ ] Rodar suíte completa `node node_modules/vitest/vitest.mjs run`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`, sempre com banco local de teste explícito. Registrar contagem real, comandos e limitações.
- [ ] Revisar migração sobre cópia isolada e conferir dados comerciais/financeiros legados. Inspecionar navegador com fluxo completo e perda de conexão, sem registrar dados fictícios na operação real.
- [ ] Fazer revisão independente ao final conforme método de execução escolhido; tratar achados com reprodução e testes. Atualizar guia de uso, limitações de provisórios, recebimentos/parcelas e procedimento de recuperação compatível com o novo esquema.
- [ ] Commit `docs: record integrated stock acceptance and rollout`. Entregar resultado verificável e preparar integração/implantação em etapa própria; não marcar publicação como concluída apenas por build local.

## Cobertura e execução

Spec §§1–4: tarefas1,2,4,8,9; §5:5; §6:3,7; §7:4,6,7; §8:2,8,9; §9:1,10; §10: testes distribuídos e fluxo10. Os cinco riscos da revisão têm casos nas tarefas indicadas.

Sequência: 1→2→3→4→5→6→7→8→9→10. Valorização e confirmação financeira compartilham contratos; executar sequencialmente evita divergência de interfaces. Recomendação: execução direta nesta conversa, com revisão independente final, preservando o método usado na entrega anterior.

Auto-revisão original: cobertura conferida contra a especificação aprovada; separados recebimento/valorização/pagamento; definidos locks, limites, projeções, cancelamentos e reconciliação.

## Fechamento — 07/10/2026

Implementação concluída e integrada em `76eb2ec`, com testes agrupados por fluxo em vez de reproduzir exatamente cada arquivo proposto. Os checklists acima conservam o planejamento original; o histórico de execução e as decisões estão em `test-results/stock-u2-execution/progress.md`. Suíte final: 352 testes em 96 arquivos; TypeScript, ESLint e build aprovados. Revisão independente concluída, cinco achados corrigidos com regressões, nenhum pendente. Produção publicada e ambas as migrações aplicadas, com backup final e preservação integral das 36 tabelas anteriores. Evidências e limites detalhados em `docs/VALIDACAO.md`.
