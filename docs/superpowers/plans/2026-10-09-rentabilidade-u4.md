# U4 — Rentabilidade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. Método preservado das entregas anteriores: execução direta, com revisão independente final.

**Goal:** comparar custos e contribuição previstos/realizados por pedido, produto e canal, com cobertura explícita e memória auditável.

**Architecture:** domínio decimal puro alimentado por leitores transacionais U1/U2/U3. Revisões administrativas U4 complementam dados ausentes; consultas não escrevem, e uma ação explícita preserva apurações reproduzíveis. Interface exclusiva ADMIN reutiliza os componentes existentes.

**Tech Stack:** Next.js 16.3.6 instalado, React, TypeScript, Prisma 6/PostgreSQL, Zod, decimal.js e Vitest existentes; sem dependência nova prevista.

**Spec:** `docs/superpowers/specs/2026-10-09-rentabilidade-u4-design.md`, aprovada em 09/10/2026.

**Status:** aprovado e executado em `codex/rentabilidade-u4`; T1–T6 concluídas, T7 com aceite visual pendente, T8 com validação automatizada, revisão e migração concluídas; aceite global aberto pela inspeção visual. Evidências e limitações em `docs/superpowers/2026-10-09-u4-entrega.md`.

## Global Constraints

- “U4 não cria movimentação física nem financeira.”
- “Receita R = subtotal − desconto + frete cobrado.”
- “Valores negativos permanecem explícitos.”
- “Consultas GET são somente leitura.”
- “Dinheiro em JSON é string decimal validada, nunca ponto flutuante binário.”
- “Migração aditiva não preenche custo ou canal histórico.”
- “Página, rotas, serviços e replay exigem ADMIN ativo, consultado no momento da operação.”
- “Filtro padrão: mês civil corrente em America/Sao_Paulo, por confirmação da venda.”
- “Margens agregadas dividem as somas do mesmo conjunto.”
- “Usar banco isolado para integração, sem apontar testes ao operacional.”
- Não implementar DRE, reembolso, despesas fixas de período, metas ou implantação automática.
- Antes de código, ler AGENTS.md e os guias instalados `node_modules/next/dist/docs/01-app/01-getting-started/{05-server-and-client-components,06-fetching-data,15-route-handlers}.md`. Aplicar as instruções de React pertinentes ao escrever UI.

## Review Focus

1. Linha gratuita com desconto integral e frete positivo: rateio fecha sem divisão por zero (T1/T5).
2. Material valorizado depois da última revisão produtiva: leitura atual não reutiliza custo antigo, e GET não cria revisões (T2/T4).
3. Subcentavos distribuídos entre muitas origens: total e depreciação permanecem conservados e não negativos (T1/T2).
4. Rebaixamento de ADMIN após comando bem-sucedido: replay não entrega dados financeiros (T3/T6).
5. Resposta de gravação perdida seguida de edição: recuperar a tentativa original antes de emitir outra chave (T7).

## Organização e contratos comuns

Criar `src/domain/profitability/{types,validation,allocation,coverage,calculate,aggregate}.ts`; `src/server/profitability/{authorization,commands,revisions,sources,assessments,queries,http}.ts`; componentes em `src/components/profitability/`. A extração U3 fica em `src/server/production/cost-sources.ts` e `src/domain/production/cost-allocation.ts`, preservando os contratos públicos atuais.

Tipos exportados por `types.ts`:

- `Money = string`; `Coverage = 'UNAVAILABLE'|'PARTIAL'|'PROVISIONAL'|'COMPLETE'`.
- `DeclaredAmount = {state:'UNKNOWN'} | {state:'DECLARED';value:Money}`.
- `Metric = {value:Money|null;knownValue:Money;coverage:Coverage;reasons:string[]}`. Para contribuição/resultado incompletos, knownValue não é lucro parcial: usar zero interno e não exibi-lo; custos conhecidos são métricas separadas.
- `AllocationWeight = {key:string;position:number;weight:string}`; `Allocation = {key:string;value:Money}`.
- `ProfitabilityLineInput`: chave, posição, productId nullable, descrição, quantidade, receita bruta; snapshot V2 válido ou motivos de ausência; custos realizados por componente nullable, custo total nullable, unidades entregues, fontes/revisões e flags de provisoriedade.
- `SaleProfitabilityInput`: saleId/version/status, confirmedAt nullable, totais comerciais, linhas, revisão administrativa nullable, fingerprint das fontes e instante de leitura. Cada valor ausente é null/UNKNOWN, não zero.
- `AdministrativePayload`: canal efetivo com ID/nome/versão ou null; frete previsto; encargos efetivos; frete efetivo; extras por linha com ID estável/origem/valor/data; conferências por extra previsto e declaração final por linha, fingerprint conferido; pendência comercial e motivo. Conferência de extra: U3_SOURCE com referência e parcela, COMPLEMENT com ID, ou NOT_OCCURRED com motivo.
- `RevisionInput`: saleId, expectedVersion, operationKey, effectiveDate, reason, payload; `RevisionDTO`: ID/versão/predecessor/autor/datas/payload.
- `SaleProfitabilityDTO`: identidade e data de confirmação, linhas calculadas, métricas de cenário, cobertura, motivos, fontes, fingerprint e data de leitura. Custos reservados ficam em campo distinto de custos entregues.
- `ReportFilter`: datas opcionais, undated boolean, situação NORMAL/EXCEPTIONS, productId/channelId opcionais, cobertura opcional, page/pageSize; `ReportDTO`: população/receita, resumo e agrupamentos por indicador, linhas paginadas e paginação. Canal não informado tem chave de grupo própria.
- `AssessmentDTO`: ID, saleId, engineVersion, factsHash, entradas normalizadas, resultado, actorId, createdAt. `engineVersion='u4-v1'` inicialmente.

As definições concretas de campos seguem esses grupos; não exportar Prisma para domínio/UI. Testes usam factories em `tests/fixtures/profitability.ts` com defaults desconhecidos, nunca custo zero implícito.

## T1 — Rateio, cobertura e cálculo puro

**Files:** criar domínio e fixture acima; criar `tests/unit/profitability-{allocation,calculate,coverage}.test.ts`.

**Interfaces:** `allocate(total:Money,weights:AllocationWeight[],scale:2|6):Allocation[]`; `calculateSale(input:SaleProfitabilityInput):SaleProfitabilityDTO`; `resolveCoverage(input:{hasKnown:boolean;missing:string[];provisional:boolean}):Coverage`.

- [x] Escrever testes com assertions: `expect(contribution.value).toBe('90')`, `expect(margin.value).toBe('45')`, `expect(afterDepreciation.value).toBe('85')` para R200/V80/E10/F20/D5; taxa UNKNOWN produz value null e motivo; taxa DECLARED0 não resolve frete UNKNOWN.
- [x] Acrescentar asserts de rateio: 0,01/3 pesos iguais → ['0.01','0.00','0.00']; 100+50/desconto30 → 80+40; frete12 → 8+4; peso negativo recusado; contribuição negativa mantida; margem com receita zero null; soma de seis casas conservada. Base de frete toda zero usa quantidades, não allocate com pesos zero.
- [x] Rodar `node node_modules/vitest/vitest.mjs run tests/unit/profitability-allocation.test.ts tests/unit/profitability-calculate.test.ts tests/unit/profitability-coverage.test.ts`; confirmar falha pelo comportamento ausente.
- [x] Implementar maiores restos com inteiros decimais, ordem posição/chave, validação de limites monetários compatíveis com comércio e precisão de 40 dígitos. Implementar fórmulas da seção 4 da especificação; preço sugerido não alimenta receita; extras e cobrança fixa não duplicam. Cobertura depende dos componentes exigidos por cada indicador.
- [x] Executar os mesmos testes; exigir PASS. Commit `feat: add profitability calculation and coverage rules`.

## T2 — Leitura pura dos custos U3 e distribuição de componentes

**Files:** criar `src/server/production/cost-sources.ts`, `src/domain/production/cost-allocation.ts`, `tests/unit/production-cost-components.test.ts`, `tests/integration/production-cost-read.test.ts`; alterar `src/server/production/costs.ts` e `src/domain/production/costs.ts` somente para extração e tipos compartilhados.

**Interfaces:** `readProductionCost(tx:Prisma.TransactionClient,lineId:string):Promise<{facts:unknown;factsHash:string;result:LineCostDTO}>`; `allocateCostComponents(total:Money,components:Record<string,Money>,weights:AllocationWeight[]):{key:string;total:Money;components:Record<string,Money>}[]`. `ensureProductionCostRevision` conserva assinatura, locks de seus chamadores e formato compatível de resultado persistido.

- [x] Escrever regressões: `expect(await revisionCount()).toBe(before)` após leitor; valor tardio passa de desconhecido a conhecido; hash muda; duas origens e destinos entregues/reservados/perdidos conservam total e componentes. Testar 0,000001 distribuído e depreciação quase igual ao total sem custo residual negativo.
- [x] Rodar `node node_modules/vitest/vitest.mjs run tests/unit/production-cost-components.test.ts tests/integration/production-cost-read.test.ts`; confirmar FAIL.
- [x] Extrair leitura/normalização/cálculo de `ensureProductionCostRevision`, mantendo escrita no wrapper. Leitor não usa FOR UPDATE, upsert ou comando de atualização. Manter alocação total U3 como limite por destino e distribuir depreciação/componentes com capacidades e resíduo estável, sem alterar total histórico.
- [x] Rodar os novos testes e `tests/unit/production-costs.test.ts`, `tests/unit/production-apportion.test.ts`, além dos testes de integração produtivos de custos existentes localizados pelo executor. Exigir PASS e comparação antes/depois dos resultados U3. Commit `refactor: expose read-only production cost sources`.

## T3 — Revisões administrativas e comandos auditáveis

**Files:** alterar `prisma/schema.prisma`, `tests/integration/setup.ts`; criar `prisma/migrations/202610090001_profitability/migration.sql`, `src/server/profitability/{authorization,commands,revisions}.ts`, `tests/integration/profitability-{revisions,migration}.test.ts`.

**Persistência:** `ProfitabilityState` com saleId único/version/currentRevisionId; `ProfitabilityRevision` com saleId/version/predecessorId/actorId/effectiveDate/createdAt/payload; `ProfitabilityCommand` com key/type/payloadHash/actorId/result/createdAt; `ProfitabilityAssessment` com saleId/engineVersion/factsHash/input/result/actorId/createdAt. FKs restritivas, unique(saleId,version) em revisão, unique(saleId,engineVersion,factsHash) em apuração, índices por venda/data; ponteiro vigente deve pertencer à mesma venda. Estado inexistente aceita expectedVersion0.

**Interfaces:** `requireProfitabilityAdmin(actor:Actor):Promise<void>`; `saveProfitabilityRevision(actor:Actor,raw:unknown):Promise<RevisionDTO>`; `runProfitabilityCommand<T>(actor:Actor,type:string,input:{operationKey:string},action:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>`.

- [x] Escrever testes: duas gravações concorrentes com mesma versão produzem uma revisão; replay devolve o mesmo ID; payload diferente com mesma chave conflita; ADMIN rebaixado/inativo recebe FORBIDDEN inclusive no replay; correção preserva payload anterior; sourceId de outra venda recusado; extra duplicado recusado; ponteiro de outra venda não aceito.
- [x] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/profitability-revisions.test.ts tests/integration/profitability-migration.test.ts`; confirmar FAIL antes da implementação.
- [x] Implementar migração aditiva, validação Zod e comandos com autorização antes de replay, hash canônico, lock de operação e venda e revalidação de versão. Reutilizar limites de data civil e moeda existentes. Conferência U3 valida propriedade da fonte e quantidade/parcela disponível; remover extra requer revisão explícita com motivo. Não aceitar fato de produção manual em payload.
- [x] Atualizar limpeza apenas depois da guarda `localhost/127.0.0.1` + banco `b2t_test`. Gerar Prisma e migrar somente banco isolado. Teste de migração preserva fixtures U1/U2/U3/financeiro e exige novas tabelas vazias antes do uso.
- [x] Rodar os dois testes; exigir PASS. Commit `feat: add audited profitability revisions`.

## T4 — Montagem das fontes e apurações reproduzíveis

**Files:** criar `src/server/profitability/{sources,assessments}.ts`, `tests/integration/profitability-{sources,assessments}.test.ts`.

**Interfaces:** `readSaleSources(tx:Prisma.TransactionClient,saleIds:string[]):Promise<SaleProfitabilityInput[]>`; `recordAssessment(actor:Actor,raw:unknown):Promise<AssessmentDTO>` recebe saleId/operationKey; `getAssessment(actor:Actor,id:string):Promise<AssessmentDTO>`.

- [x] Escrever assertions para duas vendas atendidas pela mesma origem, perda total ligada a venda, perda já absorvida, estoque OPENING com/sem valor e sem depreciação; confirmAt usa primeiro CONFIRM/CONVERT; sem evento retorna null; extras conferidos com fingerprint antigo voltam a pendentes.
- [x] Testar `expect(recalculate(saved.input)).toEqual(saved.result)`; após valorização tardia, apuração antiga é igual à anterior e visão nova muda; GET não aumenta contagens U3/U4; repetir registro com mesma fonte reutiliza ID. Correções de entregas reduzem custo/quantidade líquidos, sem criar reembolso.
- [x] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/profitability-sources.test.ts tests/integration/profitability-assessments.test.ts`; confirmar FAIL.
- [x] Implementar leituras em lote das revisões congeladas, documentos, eventos U3, valuation atual via leitor T2 e complementos. Calcular fingerprint com valores/fontes/correções, excluindo relógio de leitura; entrada salva registra o relógio utilizado para reproduzir DTO exatamente. Respeitar semântica de data/estado da especificação.
- [x] Registrar apuração com visão RepeatableRead e inputs completos. Reusar entrada existente no unique de fingerprint, tratando corrida de unicidade por nova leitura após rollback. Não prometer que apuração bloqueia alterações futuras; informar instante observado. Rodar os mesmos testes e exigir PASS. Commit `feat: add reproducible profitability assessments`.

## T5 — Coortes, agrupamentos e perdas não atribuídas

**Files:** criar `src/server/profitability/queries.ts`, `src/domain/profitability/aggregate.ts`, `tests/unit/profitability-aggregate.test.ts`, `tests/integration/profitability-queries.test.ts`.

**Interfaces:** `aggregateSales(rows:SaleProfitabilityDTO[]):ReportDTO` (paginação preenchida pelo serviço); `getProfitabilityReport(actor:Actor,raw:unknown):Promise<ReportDTO>`; `getSaleProfitability(actor:Actor,saleId:string):Promise<SaleProfitabilityDTO>`; `listUnassignedLosses(actor:Actor,raw:unknown):Promise<{items:{sourceId:string;effectiveDate:string;value:Money|null;reason:string}[];total:number}>`.

- [x] Testar 2 pedidos, só um coberto: contribuição/margem usam apenas receita coberta, população mantém ambos. Variação usa interseção das coberturas. `expect(page1.summary).toEqual(page2.summary)`; produto/canal de mesma população fecham com total. Sem canal não é custo desconhecido.
- [x] Testar fronteira de dia São Paulo, mês corrente, CONFIRM/CONVERT, ausente, cancelada, pendência comercial, perdas com filtro próprio; data impossível e intervalo invertido recusados. Origem parcial desconhecida nunca produz margem completa.
- [x] Rodar `node node_modules/vitest/vitest.mjs run tests/unit/profitability-aggregate.test.ts tests/integration/profitability-queries.test.ts`; confirmar FAIL.
- [x] Implementar consulta RepeatableRead com leitura em lotes na mesma transação. Paginar somente depois de consolidar a população filtrada; não calcular total a partir da página. Filtro produto seleciona pedidos que contêm o produto, mantendo o pedido inteiro nos indicadores e deixando isso explícito na interface. Retornar erro recuperável, nunca total parcial, se consulta falhar.
- [x] Rodar os mesmos testes; exigir PASS. Commit `feat: add profitability cohorts and grouped reports`.

## T6 — API privada

**Files:** criar `src/server/profitability/http.ts`; rotas `src/app/api/profitability/route.ts`, `sales/[id]/route.ts`, `revisions/route.ts`, `assessments/route.ts`, `assessments/[id]/route.ts`, `losses/route.ts` sob a mesma pasta; criar `tests/integration/profitability-api.test.ts`.

**Interfaces:** GET raiz→ReportDTO; GET sales/id→SaleProfitabilityDTO; POST revisions→RevisionDTO; POST assessments→AssessmentDTO; GET assessments/id→AssessmentDTO; GET losses→retorno T5. Schemas T1/T3 validam payload/filtros. HTTP segue mapeamento AppError existente e proteção de origem para POST.

- [x] Escrever testes: anônimo401, OPERATOR403, inativo403; corpo/origem/filtros inválidos recusados; cada GET não escreve; respostas não são públicas/cacheáveis; rebaixamento antes de replay403; rotas públicas existentes não recebem dados U4.
- [x] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/profitability-api.test.ts`; confirmar FAIL.
- [x] Implementar handlers conforme documentação Next instalada, requireActor e autorização interna T3. Não devolver custo em mensagem de erro. Exigir consultas autenticadas sem cache compartilhado e parâmetros assíncronos conforme versão instalada.
- [x] Rodar teste; exigir PASS. Commit `feat: expose admin profitability endpoints`.

## T7 — Interface ADMIN e recuperação de rascunhos

**Files:** criar `src/app/(private)/rentabilidade/page.tsx`, `src/app/(private)/rentabilidade/[id]/page.tsx`; criar `src/components/profitability/{report,detail,revision-form,assessment-history}.tsx`; alterar `src/components/shell/app-shell.tsx`; criar `tests/unit/profitability-ui.test.tsx`; ampliar `tests/unit/admin-shell.test.tsx`.

**Interfaces:** Report recebe ReportDTO/filtros; Detail recebe SaleProfitabilityDTO; RevisionForm recebe saleId/expectedVersion/payload inicial; AssessmentHistory recebe AssessmentDTO[] carregados por consulta autenticada por venda. Acrescentar `listAssessments(actor:Actor,saleId:string):Promise<AssessmentDTO[]>` em assessments.ts, somente leitura e ordem createdAt/ID decrescente.

- [x] Testar rótulos de cobertura e fórmula, custo conhecido sem lucro parcial, “Resultado após custo total — composição indisponível”, data de apuração, perda separada e canal não informado. ADMIN vê navegação; OPERATOR não. Testar UNKNOWN versus zero explícito.
- [x] Testar timeout seguido de edição: payload/chave originais são preservados até recuperação; confirmação da recuperação atualiza expectedVersion antes de próximo envio. Reabrir rascunho conserva dados; conflito de versão mostra ação recuperável sem substituir edição silenciosamente.
- [x] Rodar `node node_modules/vitest/vitest.mjs run tests/unit/profitability-ui.test.tsx tests/unit/admin-shell.test.tsx`; confirmar FAIL.
- [x] Implementar telas com componentes UI existentes e textos da especificação, sem reforma visual global. Formulário separa previsão, efetivo e conferências. Atualizar visão usa GET; registrar apuração usa POST explícito. Não persistir DTO financeiro completo no armazenamento de rascunho; armazenar somente campos editados com escopo por usuário/venda e limpar no logout/expiração conforme padrão existente.
- [ ] Rodar testes e exigir PASS. Inspecionar teclado, estados vazio/erro/carregamento e 390/1440px em ambiente isolado; corrigir overflow e perda de formulário. Commit `feat: add admin profitability workspace`.

## T8 — Regressão, migração e entrega candidata

**Files:** criar `tests/integration/profitability-flow.test.ts`; atualizar `docs/VALIDACAO.md`; criar `docs/superpowers/2026-10-09-u4-entrega.md` (ajustar data se fechamento ocorrer depois).

**Interfaces:** usa somente serviços das tarefas anteriores. Nenhuma nova regra de negócio.

- [x] Montar fluxo integrado: orçamento com memória→venda→produção parcial/falha→reimpressão→entrega final→complementos→apuração→valorização tardia→nova apuração. Assertar custo sem duplicação, cobertura progressiva, valores comerciais/parcelas/saldos imutáveis pelas operações U4 e apuração anterior reproduzível.
- [x] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/profitability-flow.test.ts`; investigar falhas antes de ampliar verificação.
- [x] Executar `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check`; registrar resultados reais. Banco de teste deve passar a guarda antes de suíte completa. Se runtime local indisponível, usar ambiente de testes do projeto sem alterar guarda ou banco operacional.
- [x] Restaurar backup em banco isolado, aplicar migração e comparar contagem/hash das tabelas anteriores; documentar retorno coordenado e preservação das novas revisões. Não implantar nesta tarefa.
- [x] Solicitar revisão independente da branch conforme habilidade de execução direta. Resolver achados com regressões específicas e repetir apenas verificações afetadas. Não declarar conclusão com falhas ou achados pendentes.
- [ ] Registrar evidências da interface, testes e ensaio no documento de entrega; manter backups e dados sensíveis fora do Git. Commit `test: verify profitability integration and migration`.

## Preparação de execução e encerramento

Após aprovação do plano, ler a habilidade de execução direta e de worktrees; reaproveitar worktree apropriado ou criar isolamento `codex/rentabilidade-u4` a partir da base aprovada que contém estes documentos. Registrar base e diretório, verificar instruções locais e dependências. Não copiar segredos para documentos nem executar migração operacional.

Tarefas em ordem T1→T2→T3→T4→T5→T6→T7→T8. Cada tarefa tem ciclo teste falhando→implementação→teste passando. Commits incluem somente arquivos da tarefa. Manter checklist atualizado e registrar decisões que precisem de ajuste da especificação, sem inventar autorização para alterar escopo.

Mapeamento de cobertura: especificação §§1–4→T1/T4; §5→T2/T4/T5; §6→T3; §7→T1/T4/T5; §8→T1/T5; §9→T2/T3/T4/T5; §10→T6/T7; §§11–12→testes T1–T8. Publicação é etapa posterior com backup corrente e autorização própria, conforme especificação aprovada.
