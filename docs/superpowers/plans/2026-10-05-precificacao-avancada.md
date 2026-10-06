# B2T Precificação Avançada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. Método preservado: execução direta. Plano aprovado pelo usuário; execução direta autorizada.

**Goal:** Acrescentar precificação por lote, parâmetros administrativos e memória privada de custos em produtos, orçamentos e vendas, preservando o motor e os documentos antigos.

**Architecture:** Motor V2 puro ao lado do V1, sem reescrever as fórmulas antigas. O servidor resolve tarifas autorizadas, recalcula resultados e grava estimativas imutáveis; produtos e documentos referenciam essas estimativas por identificadores estáveis. Interface, banco e autenticação continuam na aplicação atual.

**Tech Stack:** Next.js, React, TypeScript, Prisma/PostgreSQL, Decimal.js, Zod e Vitest já instalados. Sem novos serviços ou dependências de produto.

**Spec:** [Especificação U0/U1 aprovada](../specs/2026-10-05-precificacao-avancada-design.md). Ler também [Plano Diretor](../specs/2026-10-05-plano-diretor-upgrade-b2t.md).

## Global Constraints

- Uma empresa/equipe, gestão interna, BRL; ADMIN e OPERATOR existentes. Custos não entram no catálogo nem na impressão comercial.
- “Usar decimal com 40 algarismos de precisão e HALF_UP, preservando intermediários.” Entradas decimais não negativas, até 6 casas; limite 999999999999,999999; persistência monetária até Decimal(18,2).
- Quantidade 1–100.000; materiais 1–20; complementos até 30; cenários adicionais até 10. Tecnologia única por lote; FDM em g/kg e RESIN em ml/litro.
- Consumo total por linha ≤ 1.000.000; tempo de máquina > 0 e ≤ 100.000 horas; consumo útil somado > 0. Preparação e acabamento ≤ 6.000.000 minutos por campo.
- Máquina: meses 1–1200, dias 1–31, horas/dia > 0 e ≤ 24. Falhas 0–100%; markup ≥ 0; soma de taxas < 100%; margem alvo ≥ 0 e soma taxa + margem < 100%.
- Zero explicitamente configurado é válido; parâmetro ausente não equivale a zero. Sem tarifas presumidas, estoque, produção, emissão fiscal ou cobranças nesta entrega.
- Motor V1 e seus JSONs históricos permanecem legíveis sem regravação ao consultar. Mudanças de parâmetros não alteram fichas, documentos emitidos ou preço final.
- “Campos de custo ficam exclusivamente na área interna; impressão da proposta para cliente não inclui esses dados.”
- “Nesta entrega, a contribuição por item é antes de descontos e frete do documento.” Com desconto/frete: “resultado global não apurado nesta etapa”.
- Seguir AGENTS.md; antes de código Next.js, ler os guias instalados `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` e `05-server-and-client-components.md`, mais os específicos das APIs alteradas.
- Implementar em checkout isolado conforme using-git-worktrees; transportar apenas os documentos aprovados se ainda não estiverem no commit de origem, preservando os arquivos do usuário.

## Review Focus

1. Índice de item muda após exclusão/reordenação: custo deve permanecer no mesmo item (tarefas 7–8).
2. Parâmetro alterado entre simular e salvar, ou referência inativada: preservar rascunho e pedir revisão, sem aceitar tarifa enviada pelo navegador (tarefas 3–5).
3. Preço simulado zero e arredondamento ao centavo: não quebrar regras comerciais positivas nem prometer margem exata (tarefas 2, 6 e 8).
4. Reabertura de orçamento antes emitido: preservar memória histórica e congelar uma revisão nova sem sobrescrever a anterior (tarefas 7–8).
5. Reenvio/conversão concorrente e objetos JSON privados: nenhuma duplicação de memória/recebível ou vazamento por DTO e impressão (tarefas 4, 7–9).

## Organização e contratos compartilhados

V1 permanece em `src/domain/calculation/{calculate,types,validation}.ts`. V2 fica em `src/domain/pricing/`, com `types.ts`, `validation.ts`, `calculate.ts`, `scenarios.ts`, `conversion.ts` e `document-costs.ts`. Os tipos seguintes são contratos a implementar, não código de produto já criado.

### Contratos de domínio

`PricingMode = 'MARKUP' | 'CONTRIBUTION' | 'INFORMED'`.

`PricingV2Input` contém: `version: 2`, `technology`, `quantity`, `materials`, `printer`, `machineFixedMinutes`, `machineMinutesPerUnit`, `energyRate`, `maintenancePerHour`, `failurePercent`, `setupMinutes`, `finishingMinutesPerUnit`, `laborPerHour`, `extras`, `channel`, `mode`, `markupPercent`, `targetMarginPercent`, `informedUnitPrice`.

- `materials`: `{ref:{id,version}, name, unit:'G'|'ML', pricePerBase, consumptionPerUnit, fixedWaste}[]`.
- `printer`: `PrinterValues` existente + `ref:{id,version}` e `name`; preservar tecnologia na resolução.
- `extras`: `{ref:{id,version}, name, basis:'LOT'|'UNIT', quantity, unitCost}[]`.
- `channel`: `{ref:{id,version}, name, fees:{label,percent}[], fixedCost}`.
- Strings para todos os decimais; quantidade e versões são inteiros. V2 mantém valores separados de cada modalidade, validando a restrição de denominador apenas para a modalidade selecionada.

`PricingV2Result` contém strings decimais `material`, `energy`, `depreciation`, `maintenance`, `failure`, `labor`, `extras`, `commercialFixed`, `variableCost`, `fullCost`, `unitFullCost`, `theoreticalRevenue`, `offeredUnitPrice`, `offeredRevenue`, `fees`, `contribution`, `afterDepreciation` e `contributionMargin: string|null`, além de `warnings: ('BELOW_FULL_COST'|'ROUNDED_TARGET')[]`.

`calculateV2(input: PricingV2Input): PricingV2Result` valida antes de calcular; `calculateScenarios(input: PricingV2Input, quantities: number[]): {quantity:number,result:PricingV2Result}[]` não modifica a entrada.

`PricingRequest` contém somente referências/versões, quantidades, tempos, modalidade, preço informado e `expectedSettingsVersion`. Preços, tarifa, percentuais administrativos, nomes e resultados são resolvidos pelo servidor. `PricingCatalogDTO` entrega referências e parâmetros para simulação local autorizada; `settings:null` representa não configurado. `PricingSnapshotDTO = {id,version:2,input:PricingV2Input,result:PricingV2Result,createdAt,actorId,actorName}`.

Campos exatos de PricingRequest: `technology`, `quantity`, `materials:{ref:{id,version},consumptionPerUnit,fixedWaste}[]`, `printerRef:{id,version}`, `machineFixedMinutes`, `machineMinutesPerUnit`, `setupMinutes`, `finishingMinutesPerUnit`, `extras:{ref:{id,version},basis:'LOT'|'UNIT',quantity}[]`, `channelRef:{id,version}`, `mode`, `informedUnitPrice`, `expectedSettingsVersion`. Energia, manutenção, falhas, trabalho, markup e margem vêm de PricingSettings; somente preço informado pode substituir a escolha administrativa de preço-alvo em uma simulação comercial. Formulários de configuração permitem a ADMIN alterar esses parâmetros globais, sem override oculto no request.

PricingCatalogDTO contém `settings:{version,energyRate,maintenancePerHour,failurePercent,laborPerHour,markupPercent,targetMarginPercent}|null`, `materials:MaterialDTO[]`, `printers:PrinterDTO[]`, `channels:{id,version,name,fees:{label,percent}[],fixedCost,active}[]`, `extras:{id,version,name,unitCost,active}[]`. Sem taxa implícita; arrays vazios são estados de configuração pendente quando a escolha for obrigatória. Não tornar complementos obrigatórios se não forem usados.

`StoredProductCalculation = CalculationInput | {version:2,snapshotId:string}`. `ProductDTO.calculation` usa a união; `pricingSnapshot?: PricingSnapshotDTO` é campo privado separado. `getProductSuggestedPrice(calculation: StoredProductCalculation, snapshot?: PricingSnapshotDTO): string` mantém V1 e usa `offeredUnitPrice` para V2. Preço final positivo já exigido em produto/documento não muda; preço zero fica restrito à simulação.

`LineCostBinding = {lineId:string,snapshotId:string,fingerprint:string,state:'VALID'|'STALE'}`. `lineCostFingerprint(item: DocumentItemInput): string` usa descrição, productId e quantidade em serialização canônica; não usa preço nem posição. `DocumentItemInput.lineId?: string` é compatível com registros antigos. Entrada nova recebe UUID estável; DTO legado deriva `legacy:<row.id>` sem gravar JSON ao ler.

`compareLineCost(snapshot: PricingSnapshotDTO, unitPrice:string): {revenue:string,contribution:string,afterDepreciation:string,margin:string|null}` usa quantidade e custos congelados, recalculando somente receita/taxas diante do preço negociado. Não depende das configurações atuais.

### Persistência e limites das APIs

Migração aditiva única `prisma/migrations/202610050001_pricing_v2/migration.sql`:

- `PricingSettings`: singleton, `values Json` validado, `version`, `updatedAt`, `updatedById`. Values: energia, manutenção/hora, falhas, trabalho/hora, markup e margem padrão. Não criar registro automático.
- `PricingChannel`: id, name, fees Json, fixedCost Decimal(18,6), active, version, timestamps. Até 20 taxas rotuladas por perfil; perfil sem taxas deve ser explicitamente cadastrado.
- `PricingExtra`: id, name, unitCost Decimal(18,6), active, version, timestamps. Sem saldo ou unidade física implícita.
- `PricingSnapshot`: id, input Json, result Json, actorId/name, createdAt, operationKey, requestHash; unique(actorId,operationKey). Imutável; guardar todas as referências resolvidas. Não oferecer endpoint de alteração/exclusão.
- `ProductCalculationRevision`: id, productId, productVersion, calculation Json, actorId/name, createdAt; unique(productId,productVersion). Arquivar a ficha anterior quando a ficha muda; não arquivar repetidamente numa edição apenas textual.
- `DocumentCostRevision`: id, quoteId opcional, saleId opcional, revision int, bindings Json, frozenAt opcional, sourceRevisionId opcional, createdAt. CHECK exige exatamente um proprietário; unique(quoteId,revision) e unique(saleId,revision). Bindings incorporam fingerprint e referência ao snapshot imutável; validar referências na aplicação antes de gravar.
- `Quote.costRevisionId` e `Sale.costRevisionId` opcionais, apontam a revisão corrente. `QuoteItem.lineKey` e `SaleItem.lineKey` opcionais, unique por documento quando não nulos. Chaves das linhas não são os ids recriados no salvamento atual.

`Product.calculation` já é JSON e aceita a união; preservar colunas materialId/printerId para V1. V2 usa materialId nulo e printerId da estimativa. Não popular memórias retroativas nem modificar JSONs comerciais emitidos durante migração.

Novas rotas privadas com `endpoint`, `jsonBody`, proteção de origem e guardas existentes: `/api/pricing/catalog` GET para equipe; `/api/pricing/settings` POST ADMIN; `/api/pricing/channels` GET equipe/POST ADMIN; `/api/pricing/extras` GET equipe/POST ADMIN; `/api/pricing/estimates` POST equipe. POST de cadastro aceita id opcional e expectedVersion (0 para novo); inativação usa mesmo contrato. Limite 128 KiB por payload pricing, 256 KiB para gravação comercial com bindings, mantidos limites de campos/itens. Não aumentar o limite global de outros endpoints.

## Task 1 — U0: fixar a linha de base

**Files:** ler `tests/unit/calculation.test.ts`, `tests/integration/{products,quotes,sales,finance-settlements,finance-concurrency}.test.ts`, `tests/integration/setup.ts`, `compose.test.yaml`, `docs/VALIDACAO.md`; criar `tests/integration/pricing-baseline.test.ts` apenas para contratos descobertos sem cobertura; atualizar `docs/VALIDACAO.md`.

**Interfaces:** consome serviços atuais, sem novos contratos; produz registro de evidências e fixtures de documentos V1 para a migração.

- [x] Preparar checkout isolado e banco exclusivo usando `docker compose -f compose.test.yaml up -d --wait`. No processo de teste, definir `DATABASE_URL=postgresql://b2t_test:b2t_test_local_only@127.0.0.1:55432/b2t_test` e `APP_URL=http://localhost:3000`; não alterar .env da instalação real. Executar `npm run db:migrate` somente após verificar host/porta/database.
- [x] Rodar `npm run test:unit` e `npm run test:integration`; registrar resultados reais. Para falhas, reproduzir causa e delimitar correção antes de alterar contratos. Não escrever teste redundante se caso já está coberto.
- [x] Cobrir lacunas de U0 com nomes `keepsNegotiatedPriceAfterCostChange`, `convertsQuoteOnce`, `preservesReceiptAfterCostRead`, `deniesOperatorSettingsWrite`; expectativas: preço negociado idêntico, uma venda/um conjunto de recebíveis e nenhuma escrita financeira ao consultar custo. Rodar `npx vitest run tests/integration/pricing-baseline.test.ts` se criado; esperado PASS para comportamento já existente.
- [x] Registrar SHA de origem, comandos, cenário e limites em VALIDACAO. Commit apenas evidências e eventuais testes novos: `test: document pricing upgrade baseline`. Nenhuma etapa de U0 autoriza declarar testes não executados como aprovados.

## Task 2 — motor decimal V2 e cenários

**Files:** criar `src/domain/pricing/{types,validation,calculate,scenarios,conversion,document-costs}.ts`, `tests/fixtures/pricing.ts`, `tests/unit/{pricing-v2,pricing-validation,pricing-scenarios,pricing-conversion}.test.ts`. Não modificar fórmula V1.

**Interfaces:** produz os contratos de domínio acima; `buildV2Draft(legacy:CalculationInput): {quantity:1,legacy:CalculationInput,pending:string[]}` copia dados físicos e lista obrigatoriamente manutenção, acabamento, fixação e parâmetros V2 para revisão; não cria PricingSnapshot.

- [x] Criar fixture exatamente igual à seção 5 da especificação; escrever primeiro as asserções:

```ts
expect(calculateV2(lotFixture)).toMatchObject({
  variableCost: '54.2', fullCost: '56.2', offeredUnitPrice: '12.49',
  offeredRevenue: '124.9', contribution: '58.21', afterDepreciation: '56.21'
});
expect(calculateV2({...lotFixture, mode:'CONTRIBUTION'})).toMatchObject({
  offeredUnitPrice:'9.03', offeredRevenue:'90.3', contribution:'27.07'
});
expect(calculateScenarios(lotFixture,[20])[0].result).toMatchObject({
  variableCost:'94.2', depreciation:'2'
});
```

- [x] Adicionar `resinUsesMlWithoutDensity`, `zeroPriceHasNullMargin`, `rejectsMarginDenominatorZero`, `keepsFixedWasteOnce`, `rejectsIncompatibleUnits`, `rejectsOverflowAfterQuantity`, `doesNotMutateScenarioInput`, `conversionRequiresReview`. Testar todos os limites globais em tabela, inclusive 20/21 materiais, 30/31 extras, 10/11 cenários, consumo zero, tempo zero e tarifa ausente versus zero. No modo preço zero: receita 0, contribuição −54,2 e margem null.
- [x] Rodar `npx vitest run tests/unit/pricing-v2.test.ts tests/unit/pricing-validation.test.ts tests/unit/pricing-scenarios.test.ts tests/unit/pricing-conversion.test.ts`; esperado FAIL por funções ausentes antes da implementação.
- [x] Implementar contratos e fórmulas da especificação, normalizando strings com Decimal.toFixed() sem zeros finais obrigatórios nos intermediários; preços de exibição/contrato comercial usam formatação em 2 casas. Verificar limite monetário pelo valor absoluto, também para resultados negativos.
- [x] Repetir esses testes e `npx vitest run tests/unit/calculation.test.ts`; esperado PASS, inclusive V1 total 16.064 e sale 48.192. Commit `feat: add versioned batch pricing engine` com somente arquivos da tarefa.

## Task 3 — configurações autorizadas e migração aditiva

**Files:** modificar `prisma/schema.prisma`, `tests/integration/setup.ts`; criar a migração definida acima, `src/domain/pricing/catalog.ts`, `src/server/pricing/catalog.ts`, `src/app/api/pricing/{catalog,settings,channels,extras}/route.ts`, `tests/integration/{pricing-catalog,pricing-migration,pricing-http}.test.ts`.

**Interfaces:** `getPricingCatalog(actor:Actor):Promise<PricingCatalogDTO>`; `savePricingSettings(actor:Actor,raw:unknown)`, `savePricingChannel(actor:Actor,raw:unknown)`, `savePricingExtra(actor:Actor,raw:unknown)` retornam DTO com versão. Catálogo inclui materiais/impressoras dos serviços atuais e apenas perfis/referências ativos; administração pode consultar inativos por filtro explícito.

- [x] Escrever testes `settingsAreInitiallyMissing`, `operatorCannotSetTariffs`, `competingUpdateConflicts`, `inactiveReferenceCannotStartEstimate`, `migrationPreservesV1Documents`. Assert: catálogo settings null até cadastro; tentativa OPERATOR não grava; dois updates da mesma versão produzem um sucesso; custos não aparecem em nenhuma rota pública. Fixture de migração inclui produto e orçamento V1 emitido e venda confirmada; comparar JSONs/preços/parcelas antes/depois.
- [x] Rodar `npx vitest run tests/integration/pricing-catalog.test.ts tests/integration/pricing-http.test.ts`; esperado FAIL antes dos serviços. Ensaio de migração usa banco `b2t_test` dedicado e serializado, nunca rollback no banco da aplicação.
- [x] Implementar schema/migração e serviços transacionais com assertAdmin e update por versão. Atualizar limpeza do banco de teste para novas tabelas preservando a guarda de host/database. Não inserir tarifas, saldo inicial ou estimativas automáticas.
- [x] Aplicar migração em base V1 de teste, gerar Prisma e repetir testes. Confirmar tabelas novas, constraints e JSONs antigos idênticos. Validar instalação vazia também. Commit `feat: add protected pricing catalogs and storage`.

## Task 4 — estimativas imutáveis calculadas pelo servidor

**Files:** criar `src/server/pricing/{resolve,estimates}.ts`, `src/app/api/pricing/estimates/route.ts`, `tests/integration/pricing-estimates.test.ts`; estender `tests/integration/pricing-http.test.ts`.

**Interfaces:** `resolvePricingRequest(tx:Prisma.TransactionClient,actor:Actor,raw:unknown):Promise<PricingV2Input>`; `createPricingEstimate(actor:Actor,raw:unknown,operationKey:string):Promise<PricingSnapshotDTO>`; `getPricingSnapshot(tx:Prisma.TransactionClient,id:string):Promise<PricingSnapshotDTO>`. Key UUID, unique por ator; hash canônico inclui todo o request de cálculo.

- [x] Escrever `rejectsForgedMaterialPrice`, `staleSettingsRequireReview`, `replayReturnsSameSnapshot`, `keyReuseWithDifferentRequestConflicts`, `snapshotSurvivesReferenceDeactivation`. Assert: preços/resultados extras enviados são rejeitados; expectedVersion antigo conflita; replay idêntico retorna mesmo id; outro corpo com mesma key conflita; leitura histórica mantém valores.
- [x] Rodar `npx vitest run tests/integration/pricing-estimates.test.ts tests/integration/pricing-http.test.ts`; esperado FAIL.
- [x] Resolver referências em transação coerente, comparar versões esperadas, calcular V2 e inserir snapshot. Congelar valores efetivamente lidos; uma mudança posterior não altera snapshot. Em conflito de unicidade concorrente, recuperar snapshot vencedor e comparar hash. Snapshot é salvo somente ao aplicar/anexar, não a cada tecla da simulação. Sempre validar sessão, origem, payload e role.
- [x] Testar concorrência com duas requisições idênticas: count snapshot = 1, count recebível adicional = 0. Reexecutar testes com PASS e commit `feat: persist authoritative pricing snapshots`.

## Task 5 — tela da calculadora e parâmetros V2

**Files:** criar `src/components/pricing/{batch-pricing-form,pricing-result,pricing-scenarios,pricing-settings-panel}.tsx`, `src/lib/pricing-client.ts`, `tests/unit/{pricing-ui,pricing-settings-ui}.test.tsx`; modificar `src/components/calculator/calculator-form.tsx`, `src/components/settings/settings-panel.tsx`, `src/app/(private)/calculadora/page.tsx` e `src/app/(private)/configuracoes/page.tsx`.

**Interfaces:** `BatchPricingForm({catalog,initialInput?,onApply}: {catalog:PricingCatalogDTO,initialInput?:PricingV2Input,onApply:(request:PricingRequest)=>Promise<void>})`; `PricingResult({input,result})`; `PricingSettingsPanel({initialCatalog})`. `createEstimate(request:PricingRequest,key:string):Promise<PricingSnapshotDTO>` em pricing-client usa tratamento HTTP atual.

- [x] Escrever testes de interface: `modeDoesNotCarryMarkupIntoMargin` usa markup 200 e margem padrão 30; `invalidInputHidesOldPrice` não exibe resultado vigente após apagar consumo; `refreshShowsDiffBeforeReplacing` cancela troca e mantém tarifa anterior; `operatorCannotEditRates`; `zeroPriceCanBeSimulated`; `scenarioDoesNotPublishPrice`.
- [x] Rodar `npx vitest run tests/unit/pricing-ui.test.tsx tests/unit/pricing-settings-ui.test.tsx`; esperado FAIL.
- [x] Implementar fluxo e textos da seção 7 da especificação com controles existentes. Padrões dos modos independentes; formulário local retém inputs em erro/conflito. Sem configuração, manter V1 e indicar campos pendentes. Componente avançado compartilhado entre calculadora/produto/documento, sem copiar fórmulas para UI.
- [x] Rodar testes e verificar manualmente em 390 px e desktop: teclado, labels, listas de materiais/extras, aviso de premissas de lote, resumo de contribuição/depreciação e edição ADMIN. Capturar evidências locais; não alterar dados reais. Commit `feat: add batch pricing and administration screens`.

## Task 6 — produtos V1/V2 e histórico da ficha

**Files:** modificar `src/domain/products/{types,validation}.ts`, `src/server/products.ts`, `src/components/products/{product-form,product-calculation-fields}.tsx`, `src/components/products/product-panel.tsx`; criar `src/server/pricing/product-calculations.ts`, `tests/integration/product-pricing.test.ts`, `tests/unit/product-pricing-ui.test.tsx`; estender `tests/integration/product-http.test.ts` e `tests/unit/products.test.ts`.

**Interfaces:** `resolveProductCalculation(tx,actor,stored:StoredProductCalculation):Promise<{stored:StoredProductCalculation,snapshot:PricingSnapshotDTO|null}>`; leitura V2 retorna snapshot privado; gravação nunca aceita JSON arbitrário de resultado. `recordProductCalculationRevision(tx,actor,oldProduct):Promise<void>` arquiva versão anterior apenas se mudar calculation.

- [x] Escrever `readsLegacyWithoutWriting`, `priceDoesNotFollowNewCost`, `convertsLegacyOnlyAfterReview`, `rejectsZeroSuggestedPublication`, `inactiveHistoricalReferencesRemainReadable`, `archivesOldCalculationOnce`. Assert: versão/id/JSON V1 sem mudança em GET; preço comercial inalterado ao aplicar custo; snapshot correto reaberto; preço zero gera erro ao aplicar como preço final, sem criar produto inválido.
- [x] Rodar `npx vitest run tests/integration/product-pricing.test.ts tests/unit/product-pricing-ui.test.tsx`; esperado FAIL.
- [x] Adaptar schemas e DTOs privados à união. Na conversão, mostrar pendências retornadas por buildV2Draft; após preenchimento, criar snapshot e aplicar ao rascunho. Gravar arquivo histórico e update de produto na mesma transação/version guard. Remover pressuposto de um material nos consumidores V2; manter compatibilidade V1 e projections públicas explícitas.
- [x] Testar GET catálogo/consulta de preços e JSON-LD sem snapshot, tarifas ou custos; repetir testes de produto/galeria/formulário existentes afetados. Todos PASS. Commit `feat: preserve product pricing versions and history`.

## Task 7 — identidade de linha e memória comercial privada

**Files:** modificar `src/domain/commerce/{types,validation}.ts`, `src/server/{quotes,sales}.ts`, `src/server/commerce/snapshots.ts`; criar `src/server/pricing/document-costs.ts`, `tests/unit/document-costs.test.ts`, `tests/integration/commerce-pricing.test.ts`.

**Interfaces:** DTOs privados ganham `costs:{revisionId:string,bindings:LineCostBinding[],snapshots:PricingSnapshotDTO[]}|null`. Save raw aceita `costBindings?:{lineId,snapshotId}[]` separado de `input`/`document` comercial. `saveDocumentCosts(tx,actor,owner:{quoteId:string}|{saleId:string},items:DocumentItemInput[],bindings:{lineId:string,snapshotId:string}[],previousRevisionId:string|null):Promise<string>` cria revisão sob o mesmo lock/version da gravação comercial. `freezeDocumentCosts(tx,revisionId:string|null):Promise<void>`; `copyQuoteCostsToSale(tx,quoteId:string,saleId:string):Promise<string|null>` copia congelado com origem.

- [x] Escrever `reorderKeepsCostsOnLine`, `duplicateGetsNewIdentity`, `quantityChangeMarksStale`, `priceChangeKeepsCost`, `issuedCostDoesNotFollowTariffs`, `reopenPreservesFrozenRevision`, `concurrentConvertCopiesOnce`. Fingerprint alterado no mesmo snapshot → STALE; não permitir que cliente troque fingerprint para forçar VALID.
- [x] Testar legado sem lineId: DTO deriva lineKey da linha correspondente por position, sem escrever em leitura; próximo save grava chave estável. Duplicação deve produzir UUID novo e exigir nova anexação de custo. Emitidos permanecem sem custo retroativo.
- [x] Rodar `npx vitest run tests/unit/document-costs.test.ts tests/integration/commerce-pricing.test.ts`; esperado FAIL.
- [x] Implementar lineKeys independentemente do id recriado das tabelas de itens. Rejeitar chaves duplicadas no mesmo documento; manter associação somente por lineId. Campos privados nunca entram em snapshot comercial; construir projeção explícita em createDocumentSnapshot, sem spread de objetos contendo custos.
- [x] Projetar explicitamente as colunas ao gravar QuoteItem/SaleItem: `lineId` do DTO vira `lineKey`, não é repassado por spread ao Prisma. Na conversão, manter as chaves de origem dentro do novo documento. Se um consumidor antigo omitir chaves em documento que já tenha bindings, rejeitar o salvamento com pedido de atualização em vez de tentar associar por posição. Testar esse envio e confirmar custo anterior preservado.
- [x] Ao emitir/confirmar, bloquear bindings STALE até recalcular ou remover explicitamente a estimativa; linhas sem estimativa continuam permitidas. Congelar a revisão corrente. Reabertura conserva revisão congelada e usa cópia editável na próxima alteração. Conversão copia custos na transação/idempotência existentes, sem executar cálculo atual ou criar nova cobrança adicional. Revisões pertencentes a outro documento são recusadas.
- [x] Reexecutar testes e casos de quotes/sales/finance-concurrency. Assert duas conversões simultâneas → uma venda, uma revisão de custo de destino, parcelas únicas e valores financeiros anteriores preservados. Commit `feat: attach immutable costs to commercial lines`.

## Task 8 — anexar custo e comparar preço no fluxo comercial

**Files:** criar `src/components/pricing/{line-pricing-editor,line-cost-summary}.tsx`, `tests/unit/commerce-pricing-ui.test.tsx`; modificar `src/components/commerce/{document-items,quote-form,quote-detail,sale-form,sale-detail,document-print}.tsx`, `src/app/api/quotes/route.ts`, `src/app/api/quotes/[id]/route.ts`, `src/app/api/sales/route.ts`, `src/app/api/sales/[id]/route.ts`; conferir página `src/app/(private)/orcamentos/[id]/imprimir/page.tsx`.

**Interfaces:** `LinePricingEditor({item,catalog,onAttach}:{item:DocumentItemInput,catalog:PricingCatalogDTO,onAttach:(snapshot:PricingSnapshotDTO)=>void})`; `LineCostSummary({item,snapshot,state})` usa compareLineCost. DocumentItems usa lineId como key e prop opcional para controles privados, preservando consumidor comercial sem custo.

- [x] Escrever `attachDoesNotChangeNegotiatedPrice`, `suggestionRequiresExplicitAction`, `discountHidesGlobalProfitClaim`, `staleCostBlocksIssueUntilRemovedOrRecalculated`, `printNeverReceivesPrivateCosts`, `networkFailureKeepsDraft`. Com desconto/frete > 0 exibir exatamente a ressalva da especificação; não somar lucro do pedido nem inferir custo zero em linha sem memória.
- [x] Rodar `npx vitest run tests/unit/commerce-pricing-ui.test.tsx tests/unit/quote-ui.test.tsx tests/unit/sales-ui.test.tsx`; esperado FAIL para casos novos.
- [x] Integrar editor compartilhado. Guardar bindings fora do objeto comercial, gerar lineId ao adicionar, preservar ao reordenar, novo UUID ao duplicar. Quantidade do editor corresponde ao item; confirmar vínculo de descrição/referência ao anexar. Recalcular usa parâmetros atuais com revisão explícita; somente leitura histórica não exige referência ativa.
- [x] Garantir limites de corpo por rota definidos acima, mantendo limite do produto multipart e proteções atuais. Nenhum aumento irrestrito de endpoint. Repetir testes HTTP de emissão/conversão e impressão; revisar DOM de impressão e HTML público sem strings de tarifas/custos. Commit `feat: expose private cost comparison in quote and sale flows`.

## Task 9 — validação integrada e preparação da entrega

**Files:** criar `tests/integration/pricing-flow.test.ts`; atualizar `README.md`, `docs/VALIDACAO.md` e este plano com resultados e marcações apenas após executar.

**Interfaces:** consome todos os contratos; produz evidência de aceitação, instruções da configuração V2 e limites documentados. Nenhuma funcionalidade adicional.

- [x] Escrever fluxo integrado usando fixture aprovada: configurar → salvar produto V2 → anexar custo em orçamento → emitir → converter → receber parcialmente. Alterar tarifas e inativar material após emissão; assert preço/custo histórico idênticos, recebíveis corretos, catálogo sem custo. Repetir confirmação/conversão e verificar unicidade.
- [x] Rodar `npx vitest run tests/integration/pricing-flow.test.ts`; corrigir falhas no menor escopo e repetir testes afetados.
- [x] Rodar `npm run test:unit`, `npm run test:integration`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`. Usar banco de teste verificado; não afirmar sucesso de comandos bloqueados pelo ambiente. Não repetir suítes sem mudança/falha justificando.
- [x] Inspecionar navegador desktop e 390 px, ADMIN e OPERATOR, temas claro/escuro, rascunho com erro, parâmetros ausentes, V1, V2, impressão e preço negociado. Concluir cada cenário com evidência e resultado. Não enviar mensagens nem publicar dados reais.
- [x] Documentar migração aditiva e pré-requisitos: backup recuperável, ensaio de restauração em base isolada e versão de aplicação compatível com V2. Depois de gravar V2, não fazer downgrade cego para aplicativo que só lê V1. Preparar recuperação por correção para frente ou restauração coordenada; não apagar tabelas em uso. Implantação em produção não é executada por este plano de desenvolvimento.
- [x] Fazer revisão final da diferença contra a especificação, com foco nos cinco riscos acima. Commit `docs: record advanced pricing validation and rollout`. Reportar testes reais, arquivos alterados e limitações; aguardar instrução de integração/publicação se ainda não autorizada.

## Cobertura e sequência

| Requisito da especificação | Tarefas |
| --- | --- |
| U0 e preservação do legado | 1, 2, 6, 9 |
| Entradas, fórmulas, unidades e exemplos | 2 |
| Parâmetros, limites e permissões | 2, 3, 4, 5 |
| Calculadora, cenários e experiência móvel | 5, 9 |
| Produto V1/V2 e histórico | 6 |
| Memória privada, identidade, revisão e conversão | 4, 7, 8 |
| Privacidade, concorrência e integração financeira | 3, 4, 6, 7, 8, 9 |
| Migração e entrega gradual | 1, 3, 9 |

Dependência recomendada: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Cada commit inclui somente arquivos da tarefa, após testes respectivos. Não usar git add indiscriminado sobre arquivos de outros trabalhos.

Execução: tarefas 1–9 implementadas. Revisão independente realizada e três pontos importantes corrigidos com regressões. Evidências, resultados reais e a pendência menor de versão administrativa dos parâmetros estão em docs/VALIDACAO.md. Integração e implantação não executadas.
