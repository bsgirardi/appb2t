# U5 — Production Queue and Machine Capacity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Método preservado do plano diretor/U3: execução direta com revisão independente final.

**Goal:** organizar lotes e filas por máquina com sugestões revisáveis e previsões que respeitem material, calendário e atendimento de uma pessoa.

**Architecture:** domínio puro calcula intervalos e sugestões sobre lotes vinculados às linhas U3. Serviços transacionais controlam demanda, reservas e marcos; uma revisão global serializa alterações que disputam a equipe. Agenda não cria custos, consumo ou peças automaticamente.

**Tech Stack:** Next.js/React instalados, TypeScript, Prisma 6/PostgreSQL, Zod, Decimal e Vitest existentes. Sem nova dependência prevista.

**Spec:** `docs/superpowers/specs/2026-10-10-planejamento-u5-design.md`, aprovada em 10/10/2026.

**Status:** plano escrito para revisão; nenhuma tarefa de implementação executada. Publicação depende de autorização própria.

## Global Constraints

- “A equipe mantém controle da sequência.”
- “Uma pessoa atende uma máquina por vez.”
- “Programar ou retirar da programação não consome material, não produz peças e não gera recebíveis.”
- “Calendário é previsão, nunca evidência automática de custo real.”
- “Migração aditiva não cria calendários, cores, tempos ou lotes fictícios para o histórico.”
- “DTOs operacionais excluem valores de custo, inclusive replay idempotente.”
- “Usar America/Sao_Paulo para apresentação e regras civis, persistindo instantes de execução com fuso inequívoco.” Horizonte: 90 dias.
- Testes mutáveis somente em b2t_test local, porta 55432, com guarda validada antes da primeira escrita. Não imprimir credenciais nem apagar volumes operacionais.
- Ler AGENTS.md e os guias Next instalados pertinentes antes de código. Preservar versões e padrões existentes. Não reiniciar a tentativa de demonstração U4 bloqueada por política.
- Antes de implementar, inspecionar artefatos/worktrees e criar isolamento U5 conforme using-git-worktrees, a partir do checkout aprovado atualizado; preservar worktree/backups U4.
- Cada tarefa: teste vermelho pela regra ausente, implementação mínima, teste verde e commit local específico. Falha de infraestrutura não conta como teste vermelho.

## Review Focus

1. Janela atravessa meia-noite ou exceção remove parte dela: não pausar uma impressão contínua; testes tarefa 2.
2. Cor declarada não corresponde a saldo rastreável: exigir confirmação manual, não anunciar garantia automática; testes tarefa 4.
3. Apontamento antigo altera demanda enquanto lote é programado: nunca reivindicar peças duas vezes; testes tarefa 6.
4. Máquina/equipe permanecem ocupadas após horário previsto sem confirmação: não inventar liberação; testes tarefas 3 e 5.
5. Usuário muda de papel ou perde resposta após confirmar: revalidar autorização e repetir sem duplicação; testes tarefas 4 e 7.

## Mapa de arquivos e contratos

Criar `src/domain/planning/{types,validation,calendar,scheduler,suggestions}.ts`, `src/server/planning/{commands,coordination,calendars,batches,materials,milestones,reconciliation,queries,http}.ts`, `src/components/planning/{planning-panel,calendar-form,batch-form,batch-detail,queue,suggestions,shared}.tsx` e `src/lib/planning-client.ts`. Evitar concentrar agendamento, persistência e interface num arquivo.

Tipos em `types.ts`: `Instant=string` ISO com offset; `CivilDate=string` YYYY-MM-DD; `Minutes=string` decimal não negativo; `Interval={start:Instant,end:Instant}` semiaberto; `CalendarDTO={id,version,weekly:{weekday:number,startMinute:number,endMinute:number}[],exceptions:{date:CivilDate,intervals:{startMinute:number,endMinute:number}[]}[]}`. Dias ISO 1–7, minutos 0–1440; intervalos noturnos são representados por dois dias adjacentes; exceção substitui o dia inteiro e [] fecha o dia. `PlanningMeta={operationKey:string,expectedVersion:number,expectedRevision:number}`.

`BatchDTO` contém id/version/printerId/state/position, participações `{id,lineId,units,settledUnits}`, material/cor, confirmações, duração, preparação/retirada, cobertura e marcos; sem custos. `PlanningInput` contém as filas completas, calendários, referência `asOf`, revisão, ocupações reais e elegibilidade. `Forecast` contém revisão/asOf, intervalos por lote, motivo de espera/indisponibilidade, prazo, confiabilidade e totais por máquina. Datas de prazo U3 são comparadas no fim do dia civil, com rótulo de conclusão da retirada e exclusão de acabamento.

Comandos recebem `(actor:Actor,raw:unknown)`, validam schemas estritos em `validation.ts` e retornam DTO operacional. Consultas autorizam no serviço. `BatchInput`, `CalendarInput`, `CoverageInput`, `MilestoneInput` e `ReconcileInput` são tipos inferidos desses schemas; seus campos são fixados nas tarefas respectivas.

### Persistência

- `PlanningState`: singleton id=1/revision, recurso compartilhado de coordenação; seed técnico permitido, sem agenda fictícia.
- `PlanningCalendar`: recurso TEAM ou PRINTER, printerId opcional exclusivo, version, weekly/exceptions JSON validados; unicidade de recurso e FK Printer restritiva. Calendário ausente significa não configurado.
- `PlanningMachineSettings`: printerId único/version, prepareMinutes/removeMinutes Decimal(24,6), ambos obrigatórios quando configurado. Não modificar Printer.hoursPerDay/daysPerMonth.
- `PlanningBatch`: sequence único, printerId, state, position, version, materialItemId, colorKey/colorLabel, profileConfirmed, fitConfirmed, colorAvailabilityConfirmed, durationMinutes nullable, durationConfirmedAt nullable, estimateReference JSON operacional, prepareMinutes/removeMinutes, remainingMinutes nullable, remainingAsOf nullable. Cor normalizada por trim/lowercase; conservar rótulo exibido, sem inferir por nome.
- `PlanningParticipation`: batchId/lineId únicos, units inteiro positivo, settledUnits inteiro entre zero e units. FKs restritivas.
- `PlanningMaterialCoverage`: participationId, productionReservationAllocationId, quantity Decimal(24,6) positiva; soma líquida limitada sob coordenação e locks existentes. Necessidade por participação é guardada separadamente da cobertura; lote só programa com cobertura integral e cor confirmada.
- `PlanningMilestone`: batchId, kind, instant, actorId, reason, sourceId opcional para correção; fatos append-only. `PlanningReportLink`: participationId/eventId, goodUnits/failedUnits atribuídos, únicos por par e limitados pelos valores líquidos U3.
- `PlanningAudit`: revisão, ação/ator/data, entidade e antes/depois operacional. `PlanningCommand`: key/hash/type/result operacional para idempotência.

Índices em printerId/state/position, lineId, vínculos de reserva/evento; checks de sinal/limite e enums de estado. Unicidade parcial de máquina ocupada para estados preparação/imprimindo/aguardando retirada; atendimento único garantido pelo lock global e validação de marcos. Encerrado pode ter conciliação pendente, sem manter máquina ocupada.

## Task 1 — Modelo aditivo e contratos

**Files:** criar `types.ts`, `validation.ts`, `prisma/migrations/202610100001_planning/migration.sql`, `tests/fixtures/planning.ts`, `tests/unit/planning-validation.test.ts`, `tests/integration/planning-migration.test.ts`; alterar `prisma/schema.prisma` e `tests/integration/setup.ts`.

**Interfaces:** schemas e tipos acima; estados `DRAFT|PENDING|SCHEDULED|PREPARING|PRINTING|AWAITING_REMOVAL|CLOSED|CANCELED`. Datas/decimais reutilizam validação existente sem coerção de vazio para zero.

- [ ] Testar `units=1.5` recusado, `durationMinutes=null` distinto de `'0'`, enum inválido recusado; SQL recusa cobertura negativa e vínculo órfão. Fixtures U2/U3/U4 mantêm campos e contagens após migração, e nenhum lote/calendário é criado.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/unit/planning-validation.test.ts tests/integration/planning-migration.test.ts`; confirmar falha funcional.
- [ ] Implementar contratos e migração; incluir limpeza das tabelas novas após guarda do banco local. Gerar cliente Prisma e aplicar migração somente em b2t_test com conexão verificada.
- [ ] Repetir os dois testes, exigir PASS e `git diff --check` limpo.
- [ ] Commit `feat: add planning persistence and contracts`.

## Task 2 — Calendários e disponibilidade

**Files:** criar `calendar.ts`, `calendars.ts`, `coordination.ts`, `commands.ts`, `tests/unit/planning-calendar.test.ts`, `tests/integration/planning-calendars.test.ts`.

**Interfaces:** `expandCalendar(calendar:CalendarDTO,from:Instant,to:Instant):Interval[]`; `findContinuousSlot(intervals:Interval[],after:Instant,minutes:Minutes):Interval|null`; `saveCalendar(actor,raw):Promise<CalendarDTO>` com PlanningMeta/resource/printerId/weekly/exceptions; `saveMachineSettings(actor,raw):Promise<{version:number}>` com PlanningMeta/printerId/prepareMinutes/removeMinutes. `lockPlanning(tx:Prisma.TransactionClient):Promise<number>` cria singleton de forma segura e bloqueia a linha. `runPlanningCommand<T>(actor,type,input,action:(tx)=>Promise<T>):Promise<T>` coordena revisão, idempotência e auditoria.

- [ ] Testar máquina 08h–18h + duração720min→null; intervalos adjacentes 22h–24h/00h–06h aceitam impressão23h–03h; exceção fechada no segundo dia impede essa impressão; duração exata até18h cabe; equipe não configurada não vira24h. Intervalos sobrepostos são rejeitados na gravação.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/unit/planning-calendar.test.ts tests/integration/planning-calendars.test.ts`; observar FAIL.
- [ ] Implementar expansão civil determinística com Intl/timezone explícito, arredondamento de durações para cima em milissegundos, horizonte limitado e união de adjacências. ADMIN configura; OPERATOR recebe403. Calendário atualizado incrementa revisão e audita.
- [ ] Repetir testes e verificar que padrões financeiros da impressora permanecem idênticos.
- [ ] Commit `feat: add operational machine and team calendars`.

## Task 3 — Motor determinístico de capacidade

**Files:** criar `scheduler.ts`, `tests/unit/planning-scheduler.test.ts`.

**Interfaces:** `forecast(input:PlanningInput):Forecast`, puro e sem banco; usa os intervalos da tarefa2. Retorna preparação, impressão, espera de retirada e retirada, ou motivo `MISSING_DATA|NO_WINDOW|UNCONFIRMED_END|MATERIAL_PENDING`.

- [ ] Fixtures: término02h/equipe08h→retirada08h; duas retiradas10min disponíveis08h→08h–08h10 e08h10–08h20; lote misto120min ocupa120, não240. Lote sem prazo desempata por identificador; fila manual mantém posição mesmo com prazo posterior.
- [ ] Testar impressão vencida sem confirmação→sucessor sem data confiável; remainingMinutes informado refaz projeção desde remainingAsOf; manutenção desloca lote inteiro; fim do horizonte gera NO_WINDOW; dados de outra página continuam ocupando equipe.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/unit/planning-scheduler.test.ts`; observar FAIL.
- [ ] Implementar simulação por eventos: preservar ocupações reais, considerar somente cabeça elegível de cada fila, escolher menor início possível/prazo/retirada/id; reservar recursos e avançar. Pendências não ocupam intervalos e conservam posição. Nunca preencher lacunas com mudança de sequência implícita.
- [ ] Repetir teste, exigir PASS; conferir soma de intervalos recortada ao período sem duplicar espera/atendimento.
- [ ] Commit `feat: calculate machine queues with shared operator capacity`.

## Task 4 — Composição, sugestões e cobertura

**Files:** criar `suggestions.ts`, `batches.ts`, `materials.ts`, `tests/unit/planning-suggestions.test.ts`, `tests/integration/planning-batches.test.ts`.

**Interfaces:** `suggestBatches(candidates:Candidate[]):Suggestion[]`, Candidate inclui linha/máquina/tecnologia/material/cor/prazo/saldo; `saveBatch(actor,raw):Promise<BatchDTO>` com PlanningMeta/id?/printerId/participants[{lineId,units}]/materialItemId/colorLabel/profileConfirmed/fitConfirmed/durationMinutes/durationConfirmed/prepareMinutes/removeMinutes; `confirmBatch(actor,raw)` com batchId reivindica quantidades; `setBatchCoverage(actor,raw)` com batchId/colorAvailabilityConfirmed/needs[{participationId,quantity}]/allocations[{participationId,allocationId,quantity}]; `scheduleBatch(actor,raw)` com batchId; todos retornam BatchDTO. Reservas novas são feitas explicitamente via U3 antes de vincular cobertura.

- [ ] Testar demanda10 disputada por lotes6+6→somente um confirma; mesma parcela100g disputada por70+50→excesso recusado; rascunho não reivindica. Falta de inventário/cor impede programação. Cor sem rastreio aceita somente confirmação manual explícita, com aviso persistente.
- [ ] Sugestão mesmo material/cor ordena prazo e não mistura máquina; dado ausente exclui do agrupamento automático. Mudança de quantidade/máquina invalida duração. Replay com mesma chave não duplica e payload distinto conflita.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/unit/planning-suggestions.test.ts tests/integration/planning-batches.test.ts`; observar FAIL.
- [ ] Implementar serviços usando coordenação global, locks U3 e saldos líquidos. Referência U1 copia apenas dados operacionais/versionamento, sem preços. Um lote misto exige duração própria confirmada; quantidade/cor/consumo não são inferidos do título. Toda mutação verifica versão/revisão.
- [ ] Repetir testes, exigir PASS; comparar contagens de movimentos e recebíveis antes/depois de programar: diferença zero.
- [ ] Commit `feat: compose production batches with material coverage`.

## Task 5 — Sequência e marcos operacionais

**Files:** criar `milestones.ts`, `tests/integration/planning-milestones.test.ts`; alterar `batches.ts`.

**Interfaces:** `reorderQueue(actor,raw):Promise<{revision:number}>` com PlanningMeta/printerId/batchIds (permutação completa dos lotes futuros, inclusive pendentes); `recordMilestone(actor,raw):Promise<BatchDTO>` com batchId/kind/instant/reason?, kinds PREPARE_START/PRINT_START/PRINT_END/REMOVE_START/REMOVE_END/INTERRUPT/REMAINING, remainingMinutes para REMAINING; `correctMilestone(actor,raw)` com sourceId/instant/reason ADMIN; `cancelBatch(actor,raw)` com batchId/reason.

- [ ] Testar duas preparações concorrentes→uma aceita; PRINT_START libera pessoa e mantém máquina; PRINT_END mantém máquina; REMOVE_END libera máquina. Uma máquina não inicia segundo lote ocupante. Marcos fora de ordem/futuros são recusados; início fora da janela programada exige revisão prévia.
- [ ] Testar reordenação não mexe em lote iniciado; REMAINING altera previsões sem posição; cancelamento futuro libera reivindicação mas não reserva U3; interrupção mantém ocupação até retirada. Correção ADMIN que sobrepõe execução é recusada.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/planning-milestones.test.ts`; observar FAIL.
- [ ] Implementar transições/marcos append-only; os instantes reais prevalecem sobre previsão, sem produzir apontamento U3. Se execução ultrapassar calendário, registrar fato com motivo e alerta, sem apagar ocupação. Operador não cancela fatos iniciados; ADMIN concilia antes de cancelar.
- [ ] Repetir testes, exigir PASS e ausência de movimentos/custos novos por marco.
- [ ] Commit `feat: track queue order and real machine occupancy`.

## Task 6 — Conciliação e proteção dos caminhos U2/U3

**Files:** criar `reconciliation.ts`, `tests/integration/planning-reconciliation.test.ts`, `tests/integration/planning-concurrency.test.ts`; alterar `src/server/production/{commands,reports,corrections,orders,lifecycle,reservations}.ts`, `src/server/stock/commands.ts` e pontos de mutação encontrados na auditoria abaixo.

**Interfaces:** `reconcileBatch(actor,raw):Promise<BatchDTO>` com PlanningMeta/batchId/links[{participationId,eventId,goodUnits,failedUnits}]/reason; `reconcilePlanningTx(tx,context:{lineIds:string[],reservationIds:string[]}):Promise<void>` revalida vínculos e pendências dentro da transação; `lockPlanning` da tarefa2 antes de locks produtivos em todos os comandos relevantes.

- [ ] Auditar chamadas de transação/lock em production, stock e commerce: registrar no teste de concorrência quais caminhos alteram demanda, reservas, máquina, ativação ou cancelamento de venda. Ordem global: chave da operação→PlanningState→vendas→ordens→acabados→materiais→financeiro. Não chamar um comando transacional externo de dentro de outro; extrair helpers Tx quando necessário.
- [ ] Testar REPORT independente enquanto scheduleBatch reivindica últimas peças→sem excesso; redução de reserva concorrente→lote pendente sem intervalo; cancelamento/replanejamento U3 não deixa vínculo inválido; chaves distintas não causam deadlock. Também testar caminho antigo U2 de correção/liberação.
- [ ] Testar lote encerrado com unidades não conciliadas mantém reivindicação; vincular boas/falhas libera exatamente a parcela liquidada e falhas permitem nova tentativa; evento de outra linha ou usado além do líquido é recusado. Repetir conciliação não cria U3. Correção de evento vinculado reabre pendência sem criar lote; tempos integrais não são copiados para cada participante.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/planning-reconciliation.test.ts tests/integration/planning-concurrency.test.ts`; observar FAIL.
- [ ] Implementar coordenação nos wrappers U2/U3 antes dos locks existentes; demais caminhos auditados seguem mesma ordem. Revalidar vínculos após mutação e antes do commit, sem alterar fatos históricos. Mostrar divergência de soma de tempos como cobertura incompleta, não rateio automático.
- [ ] Repetir testes e regressões `production-reports`, `production-corrections`, `production-lifecycle`, `stock-reservations`, `stock-corrections` e `profitability-flow`; exigir PASS.
- [ ] Commit `fix: preserve planning invariants across stock and production commands`.

## Task 7 — Consultas e API operacional

**Files:** criar `queries.ts`, `http.ts`, `src/app/api/planning/{route.ts,commands/route.ts,batches/[id]/route.ts}`, `tests/integration/planning-api.test.ts`.

**Interfaces:** `getPlanning(actor,raw):Promise<{revision:number,asOf:Instant,forecast:Forecast,batches:BatchDTO[],suggestions:Suggestion[]}>`; `getBatch(actor,id):Promise<BatchDTO>`. Filtros máquina/estado/prazo/responsável afetam apresentação, nunca o conjunto calculado. GET usa snapshot consistente do banco e referência temporal única; POST `{action,payload}` despacha schemas das tarefas2/4/5/6.

- [ ] Testar anônimo401; OPERATOR sem qualquer preço/premissa financeira, inclusive replay; usuário inativo/rebaixado recusado; calendário não configurado produz aviso; filtro de máquina não libera a pessoa ocupada em outra. Revisão obsoleta retorna conflito sem escrita parcial.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/planning-api.test.ts`; observar FAIL.
- [ ] Implementar consultas sem mutar custos U4, autorizando antes de ler. Reusar padrões productionEndpoint/body/erros e limites de payload. Isolar projeção operacional de snapshots privados.
- [ ] Repetir testes, exigir PASS.
- [ ] Commit `feat: expose authenticated planning queries and commands`.

## Task 8 — Fluxo de planejamento em desktop e celular

**Files:** criar componentes do mapa, `src/app/(private)/planejamento/page.tsx`, `src/lib/planning-client.ts`, `tests/unit/planning-ui.test.tsx`; alterar `src/components/shell/app-shell.tsx` e `src/components/production/order-detail.tsx` para navegação/vínculos.

**Interfaces:** `PlanningPanel({initial}: {initial:Awaited<ReturnType<typeof getPlanning>>})`; `planningCommand<T>(action:string,payload:unknown):Promise<T>` usando cliente HTTP existente; componentes recebem DTOs, callbacks e versão, sem importar banco no cliente.

- [ ] Consultar guias instalados de Server/Client Components, Route Handlers e fetching a partir de `node_modules/next/dist/docs/index.md` antes de escrever rotas/UI; respeitar fronteiras e APIs documentadas.
- [ ] Testar pendência por material, previsão indisponível, sugestão revisável, confirmação do fatiador, cor manual e conciliação pendente. Botões subir/descer operam por teclado; conflito/erro preserva formulário/chave; atualização bem-sucedida usa revisão nova. Nenhum alerta de impressão é apresentado como garantia de entrega.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/unit/planning-ui.test.tsx`; observar FAIL.
- [ ] Implementar navegação Produção↔Planejamento, cadastro de horários ADMIN, montagem/revisão, filas e marcos. Mostrar espera da equipe/máquina, prazo de cada participante e ausência de acabamento na previsão. Não adicionar dashboard financeiro ou atendimento comercial.
- [ ] Repetir testes; inspecionar fluxo completo em390px/1440px/teclado em ambiente de teste por mecanismo permitido. Registrar evidências e limitações; bloqueio de ferramenta não autoriza contorno nem aceite visual fictício.
- [ ] Commit `feat: add responsive machine planning workflow`.

## Task 9 — Aceite integrado e preparação da candidata

**Files:** criar `tests/integration/planning-flow.test.ts`, `docs/superpowers/2026-10-10-u5-entrega.md`; atualizar `docs/VALIDACAO.md` com data real de execução e evidências.

**Interfaces:** usar comandos públicos das tarefas anteriores, sem escrever diretamente tabelas para simular ações do usuário; fixtures são exclusivamente de teste.

- [ ] Criar cenário duas máquinas/três ordens/lote misto: confirmar cobertura, ordenar, executar noite, disputar retirada, registrar falha, conciliar U3 e programar nova tentativa. Asserts: minutos agregados sem duplicação, sequência preservada, sem recebíveis novos, custos reais apenas de apontamentos U3 e prazo de impressão claramente limitado.
- [ ] Rodar `node node_modules/vitest/vitest.mjs run tests/integration/planning-flow.test.ts`; resolver falhas por regras, sem enfraquecer asserções.
- [ ] Executar `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` no ambiente isolado configurado; exigir saídas aprovadas. Build Docker candidato pelo fluxo existente quando necessário, sem substituir aplicação publicada. Registrar contagens reais, não copiar442 testes históricos.
- [ ] Ensaiar migração sobre backup restaurado isoladamente e comparar conteúdo das tabelas anteriores; registrar versão candidata, novas tabelas, backup verificado e recuperação. Não aplicar migração em produção nesta tarefa.
- [ ] Fazer revisão independente final conforme método preservado e requesting-code-review, corrigir achados e repetir somente verificações afetadas; preparar documento de entrega com pendência U4 separada e situação visual U5 explícita.
- [ ] Commit `docs: record U5 candidate validation and deployment readiness`. Apresentar candidata; integração/publicação seguem aprovação própria e finishing-a-development-branch, sem pressupor autorização U4.

## Autorrevisão e entrega do plano

Cobertura: especificação1–4→mapa/tarefas1/7/8; 5→tarefa4; 6→4/6; 7→2/3/5; 8→5/6; 9→7/8; 10→1/2/6; 11–12→testes distribuídos/tarefa9. Cinco focos de revisão incorporados nas tarefas indicadas. Tipos compartilhados têm uma única origem; marcos operacionais e apontamentos financeiros permanecem separados.

Plano sujeito à revisão do usuário. Após aprovação, manter execução direta com revisão independente final conforme contexto já registrado, iniciando por isolamento U5 e leitura conjunta deste plano e da especificação. Não executar tarefas enquanto a revisão do plano estiver pendente.
