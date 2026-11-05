# E3.2 — Bloqueios e previsão comercial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Explicar impedimentos e cobertura de pedidos e simular a demanda do orçamento principal antes da venda, sem reservar capacidade nem gerar promessa automática.

**Architecture:** Projeções puras separadas para bloqueios, cobertura, cenário hipotético e etapas posteriores. Servidor reúne fontes coerentes em leitura autenticada; interface reutiliza planejamento e decisão comercial. O scheduler e os comandos produtivos permanecem existentes.

**Tech Stack:** Next.js 16.4.2, React 19.3, TypeScript, Prisma 6/PostgreSQL 17, Zod, Decimal, Vitest e shadcn do projeto.

**Spec:** `docs/superpowers/specs/2026-11-04-e3-2-previsao-comercial-design.md`, aprovado pelo usuário em 04/11/2026.

## Global Constraints

- Base isolada 9797484/1.17.0 em `C:/Users/Administrador/.codex/worktrees/e3-2-previsao-comercial/appb2t`; preservar pasta operacional e seus documentos locais.
- Sem PR/push/merge/publicação, migração operacional ou atualização de contêineres existentes sem autorização específica posterior.
- Testes mutáveis somente em banco sintético descartável exclusivo desta execução. Não reutilizar instâncias E3/E4 ou banco padrão de outros chats.
- Sem nova dependência ou migração prevista. Cenários temporários, sem histórico persistido, eventos ou conversão em OP.
- Horizonte 90 dias, timezone America/Sao_Paulo, validade 60 segundos. Filtros não reduzem universo calculado.
- Não modificar o algoritmo de `scheduler.ts`, comandos de produção, margem ou promessa comercial neste recorte.
- Antes de código Next/React, instalar pelo lock somente na worktree e ler guias locais em `node_modules/next/dist/docs/` para rotas e componentes cliente. Esse diretório ainda não existe na worktree nesta fase documental. Aplicar skills shadcn local e React quando pertinentes.
- Versão permanece 1.17.0 nesta preparação. Futura PR autorizada exige SemVer único comparado à main, manifestos sincronizados, releases em português e APP_VERSION nos dois rodapés/Atualizações.

## Review Focus

- Peças boas sem compromisso comercial, cancelamentos produtivos e correções negativas não podem desaparecer do diagnóstico (tarefa 2).
- Disponibilidade futura de material não pode deslocar apenas a data exibida nem ocultar impacto em trabalhos reais (tarefa 3).
- Lote ativo com serviço iniciado e calendário restringido não pode produzir cenário aparentemente completo com precedência inválida (tarefa 3).
- Fechamento concorrente ou mudança de orçamento principal invalida a hipótese pré-venda (tarefas 5 e 6).
- Edição de premissas ou resposta antiga após expiração não pode restaurar um resultado vigente (tarefa 6).

## Contratos compartilhados

Criar `src/domain/planning/commercial-types.ts`. Datas são ISO com offset normalizado em UTC no transporte; campos de formulário convertem a partir de America/Sao_Paulo. Durações são strings decimais finitas; unidades inteiras positivas.

- `PlanningIssue = { code: string; message: string; entity: { kind: 'batch'|'line'|'order'|'sale'|'calendar'|'material'|'printer'; id: string }; nextAction: string; resolution: string; target: { kind: string; id: string } | null }`. Destino sem URL arbitrária; UI resolve somente rotas/ações conhecidas. Códigos ficam em união literal definida na tarefa 1.
- `DemandLineFacts`: `lineKey`, `soldUnits`, `deliveredUnits`, `committedUnits`, `uncommittedGoodUnits`, participações abertas com `batchId/lineId/units/settledUnits/releasedUnits`, saldo por linha produtiva e inconsistências de origem. `DemandFacts` contém `saleId`, modo, status, linhas e fontes/versionamento.
- `DemandProjection`: linhas com quantidades mutuamente exclusivas (`delivered`, `readyCommitted`, `planned`, `uncovered`), pendências e `removalAt: string|null`; resumo com `completeCoverage`, `removalAt`, `allDelivered` e issues. Data de retirada não recebe rótulo de pedido pronto.
- `HypotheticalBatch`: `id`, `lineKey`, `printerId`, `units`, `durationMinutes`, `prepareMinutes`, `removeMinutes`, `materialItemId`, `colorLabel`, `availableAt`, `durationSource: 'snapshot'|'manual'`, `reviewed: true`, `profileAssumed: true`, `fitAssumed: true`, `availabilityReason`. IDs emitidos pelo adaptador usam prefixo reservado e não colidem com lotes reais.
- `HypotheticalLine`: `lineKey`, `quantity`, `mode: 'produce'|'external'`; modo external exige `availableAt` e `reason`, modo produce exige lotes cuja soma seja exata. Cada linha do orçamento aparece uma única vez.
- `CommercialScenario` contém linhas e `CompletionAssumptions`; `CommercialSimulation` contém before/after Forecast, retirada agregada/por linha, impacto em todos os lotes reais e issues, além de avisos de restrição conservadora.
- `CompletionAssumptions`: pós-produção discriminada como `unknown`, `waived` com motivo ou `declared` com instante/motivo; modalidade `pickup` com instante de atendimento/motivo ou `shipping` com chegada/fonte/motivo, podendo permanecer indefinida. `CompletionProjection` distingue retirada, liberação, entrega estimada e questões sem preencher valores desconhecidos.
- `CommercialEnvelope<T> = { asOf; expiresAt; revision; source: { kind: 'quote'|'sale'; id; version; fingerprint }; result: T }`. Hash do servidor identifica dados canônicos e premissas; não é credencial nem garantia de capacidade.

### Tarefa 1: Bloqueios estruturados e prioridades explicadas

**Files:** criar `src/domain/planning/issues.ts`, modificar `src/domain/planning/types.ts`, `src/server/planning/batch-read.ts`, `src/server/planning/queries.ts`; criar `tests/unit/planning-issues.test.ts`.

**Interfaces:** `batchIssues(facts: BatchIssueFacts): PlanningIssue[]`, `forecastIssues(input: PlanningInput, projection: Forecast): PlanningIssue[]`; BatchDTO ganha campo opcional `issues` durante transição para preservar fixtures/consumidores. `blockers` continua com os mesmos textos e mesmo efeito no scheduler.

- [x] Escrever testes para todos os predicados atuais, deduplicação por código/entidade e preservação de linhas afetadas. `expect(batch.blockers).toEqual(previousBlockers)`; `expect(issue.nextAction).not.toBe('')`; `expect(issue.resolution).not.toBe('')`. Calendário ausente deve ter destino de equipe/máquina correto; NO_WINDOW sem culpado inventado; UNCONFIRMED_END aponta marco verificável.
- [x] Executar `npx vitest run tests/unit/planning-issues.test.ts`, exigir falha pelas funções ausentes.
- [x] Extrair fatos/predicados uma única vez, sem duplicar consultas de saldo nem alterar regra. Acrescentar contexto de posição, lote ativo e prazo de OP sem criar ranking ou alterar comandos.
- [x] Executar testes novos e `tests/unit/planning-scheduler.test.ts`, `tests/unit/planning-scenario.test.ts`; exigir aprovação e commit local dos arquivos da tarefa.

### Tarefa 2: Cobertura integral por venda

**Files:** criar `src/domain/planning/commercial-types.ts`, `src/domain/planning/demand.ts`, `src/server/planning/sale-demand.ts`, `tests/unit/planning-sale-demand.test.ts`; consultar `src/server/production/orders.ts`, `fulfillment.ts`, `finished-stock.ts`, `reconciliation.ts`.

**Interfaces:** `loadSaleDemand(tx: Prisma.TransactionClient, saleId: string): Promise<DemandFacts>` somente leitura; `projectSaleDemand(facts: DemandFacts, batches: BatchDTO[], forecast: Forecast): DemandProjection` pura.

- [x] Testar duas linhas e múltiplas OPs/lotes, venda sem OP, OP rascunho, participação cancelada/rascunho, lote misto, retirada sem conciliação, pronta parcial, entregue parcial, boa sem compromisso e correções. Em fixture vendido=10, entregue=2, comprometido=3 e saldo válido em lote=4: esperar `{delivered:2,readyCommitted:3,planned:4,uncovered:1}` e retirada agregada nula. Cancelamento produtivo sem cancelamento da venda mantém demanda comercial descoberta.
- [x] Rodar `npx vitest run tests/unit/planning-sale-demand.test.ts`, observar RED.
- [x] Implementar carregador e projeção usando chaves comerciais explícitas, saldos líquidos e participações ainda abertas. Somar quantidades em categorias sem sobreposição; sobra/inconsistência gera issue e bloqueia total, sem usar clamp para esconder divergência. Compromisso com origem indisponível não conta como pronto. Produção acabada não destinada vira ação para vincular/comprometer. LEGACY e lineKey ausente geram diagnóstico, sem heurística por produto.
- [x] Rodar testes novos mais `tests/unit/production-quantities.test.ts` e `production-states.test.ts`; exigir GREEN e commit local.

### Tarefa 3: Cenário pré-venda puro sobre o scheduler

**Files:** criar `src/domain/planning/commercial-scenario.ts`, `src/domain/planning/scenario-calendar.ts`, `src/domain/planning/commercial-validation.ts`, `tests/unit/planning-commercial-scenario.test.ts`, fixtures em `tests/fixtures/planning-commercial.ts`.

**Interfaces:** `simulateCommercial(input: PlanningInput, lines: CommercialQuoteLine[], scenario: CommercialScenario): CommercialSimulation`; `restrictCalendarFrom(calendar: CalendarDTO, availableAt: string, asOf: string): CalendarDTO`. `CommercialQuoteLine` contém chave, quantidade, tecnologia e sugestão opcional de memória vigente, sem indicadores financeiros necessários ao cálculo.

- [x] Testar soma exata, linha ausente/duplicada, máquina/tecnologia inválida, tempos inválidos, revisão explícita ausente, entrada profundamente congelada e IDs reais conflitantes. `expect(input).toEqual(beforeInput)` e baseline igual a `forecast(input)`.
- [x] Testar duas máquinas/equipe compartilhada, lotes adicionados ao fim sem reordenar existentes, impacto cruzado e material disponível amanhã. Preparação hipotética nunca começa antes de availableAt. Aviso informa que a maior disponibilidade declarada restringe conservadoramente toda a máquina, não apenas o lote.
- [x] Testar calendário atravessando dia/exceções e horizonte, sem janela, fim ativo vencido. Se restrição conservadora interceptar preparação/impressão/retirada ativa ou criar inconsistência com marcos reais, rejeitar cenário completo com ação para atualizar/reformular premissas; nunca reinterpretar marco real como hipótese.
- [x] Rodar `npx vitest run tests/unit/planning-commercial-scenario.test.ts`, observar RED.
- [x] Implementar validação estrita: até 100 linhas, 200 lotes no total, 1.000.000 unidades por linha, durações até 129600 minutos e instante de disponibilidade dentro do horizonte. Limites inválidos retornam erro, não resultados truncados. Adaptador puro cria BatchDTO hipotético separado, sem passar por comandos. Calendário derivado usa exceções diárias no horizonte para remover janelas anteriores ao maior availableAt da máquina, preservando intervalos posteriores. Antes/depois usa mesmo asOf e todas as máquinas. Material não disponível agora só é permitido com hipótese futura explícita; falta de dado essencial retorna issue/data nula.
- [x] Testar tempos fixos em dois lotes não serem distribuídos por peça automaticamente; sugestões só aparecem com memória/fingerprint válidos e revisão explícita. Rodar testes novos e scheduler/calendar/scenario existentes; GREEN e commit local.

### Tarefa 4: Etapas posteriores sem promessa automática

**Files:** criar `src/domain/planning/completion.ts`, `tests/unit/planning-completion.test.ts`; ampliar validation/types da tarefa 3.

**Interfaces:** `projectCompletion(removalAt: string|null, productionReady: boolean, assumptions: CompletionAssumptions): CompletionProjection`.

- [x] Testar liberação anterior à retirada, chegada anterior à liberação, dispensa sem motivo, pós-produção desconhecida, modalidade desconhecida, retirada local com atendimento e envio com fonte. `expect(unknown.deliveryAt).toBeNull()`; liberação declarada igual à retirada é válida; sem data produtiva nem pronta comprovada não gerar entrega completa.
- [x] Rodar `npx vitest run tests/unit/planning-completion.test.ts`, observar RED.
- [x] Implementar validação de precedência por instante, não soma de dias úteis. Produção pronta pode usar asOf como limite inferior de premissa futura, sem inventar data histórica de conclusão; pedido entregue mostra fato e não calcula nova previsão. Manter data combinada como entrada de exibição independente, nunca saída de escrita.
- [x] Rodar testes e commit local após GREEN.

### Tarefa 5: Consultas autenticadas e integrações exclusivas

**Files:** criar `src/server/planning/commercial-read.ts`, `src/server/planning/commercial-preview.ts`, `src/app/api/opportunities/[id]/planning-preview/route.ts`, `src/app/api/sales/[id]/planning-forecast/route.ts`, `tests/e32/database.ts`, `tests/e32/setup.ts`, `tests/e32/commercial-read.test.ts`, `tests/e32/commercial-preview.test.ts`, `tests/unit/planning-commercial-http.test.ts`, `tests/unit/planning-e32-database.test.ts`, `vitest.e32.config.ts`; modificar package script `test:e32` e matriz CI.

**Interfaces:** `getCommercialContext(actor: Actor, opportunityId: string)` retorna contexto principal vigente/sugestões/opções ou encaminhamento à venda; `previewCommercial(actor: Actor, opportunityId: string, raw: unknown): Promise<CommercialEnvelope<CommercialSimulation>>`; `getSaleForecast(actor: Actor, saleId: string, raw: unknown): Promise<CommercialEnvelope<{ demand: DemandProjection; completion: CompletionProjection }>>`.

- [x] Escrever e executar teste RED da guarda: rejeitar URL ausente, host remoto, banco operacional, bancos das outras suítes e porta diferente; aceitar apenas loopback:55439/b2t_e32_test com marcador explícito `E32_TEST_DATABASE=1`. Guarda roda antes de importar db e antes de qualquer limpeza. Setup não importa helpers destrutivos das suítes padrão/E3/E4.
- [x] Escrever testes HTTP RED de autorização, payload estrito, limite de 256 KiB, principal alterado/fechado, venda vinculada, operador ativo/inativo. GET do contexto e POST da simulação/forecast autenticados com wrappers existentes; nenhum GET que grava custos/status é reutilizado.
- [x] Implementar serviço com RepeatableRead e authorizePlanning; reler principal, orçamento, custos e relações na transação. Cliente envia versão esperada do orçamento e oportunidade; divergência retorna CONFLICT e não usa hipótese antiga. Leitura de venda relê toda a demanda. expiresAt=asOf+60000; hash canônico no servidor inclui fontes e cenário normalizado. Contexto não inclui segredos, nem concede permissões financeiras novas.
- [x] Criar PostgreSQL 17 descartável exclusivo com nome identificável desta worktree, porta 55439 livre, sem volume persistente. Se ocupada, identificar sem reutilizar ou parar instância alheia; selecionar outra porta exclusiva e atualizar guarda/config explicitamente. Aplicar migrações existentes somente ali. Não copiar .env operacional. Registrar criação, URL sintética e remoção no ledger privado.
- [x] Integrações: cenário não altera contagens/conteúdo de vendas, OPs, lotes, reservas, eventos, revisões e compromissos; faltas de vínculo/bloqueios reais não são ignoradas. Transação de leitura coerente diante de edição concorrente, fechamento/alteração de principal após contexto exige recarga. Corrigir fixtures, sem flexibilizar integridade para passar testes.
- [x] Rodar `npm run test:e32` e os dois unitários novos; GREEN. Incluir job e32 em CI com PostgreSQL próprio como os demais, sem remover jobs existentes. Commit local.

### Tarefa 6: Interface shadcn integrada

**Files:** criar `src/components/planning/issues.tsx`, `commercial-forecast.tsx`, `commercial-scenario-form.tsx`, `commercial-result.tsx`, `commercial-query.tsx`; modificar `planning-panel.tsx`, `batch-detail.tsx`, `src/components/opportunities/detail.tsx`, `src/components/commerce/sale-detail.tsx`; criar `tests/unit/planning-commercial-ui.test.tsx`, `tests/unit/planning-issues-ui.test.tsx`.

**Interfaces:** `PlanningIssues({issues,onOpenTarget})`; `CommercialForecast({opportunityId,principalQuote,wonSale})`; `SalePlanningForecast({saleId,saleVersion})`; componentes compartilham resultado por CommercialEnvelope e assumem respostas exclusivamente do servidor.

- [x] Ler `.agents/skills/shadcn/SKILL.md` e guias Next locais antes dos componentes. Inventariar componentes existentes, sem instalar pacote. Seguir painéis/formulários e fluxos de abertura atuais; campos obrigatórios, motivos e erros têm rótulos acessíveis.
- [x] Escrever testes RED: seleção principal ausente orienta ação, vínculo de venda encaminha diagnóstico, linha incompleta impede data agregada, ações abrem entidade correta, formulário inclui todas as linhas e somas, preparação/retirada/duração são distintas. Hipótese de perfil/encaixe não aciona confirmação real.
- [x] Testar relógio falso aos 60000ms, retorno de visibilidade/foco, edição de premissa, troca de principal/versão, descarte e resposta fora de ordem. Resultado anterior deixa de ser vigente imediatamente; botão recalcular conserva premissas compatíveis mas exige revisão das incompatíveis. Falha de rede não apresenta resultado anterior como atual. Não fazer autosave nem restaurar cenário ao sair.
- [x] Implementar hook com chave de contexto, contador/abort de requisição e invalidação explícita. Converter datetime-local em São Paulo, nunca timezone do dispositivo; resultado mostra instante/fonte/validade, condição de disponibilidade e impactos de terceiros. Exibir rótulos completos de retirada, liberação, entrega e data combinada; não confiar em cor. Atalhos navegam sem executar comando e preservam proteções de alterações existentes.
- [x] Rodar testes novos e regressões `planning-ui`, `planning-simulation-ui`, `opportunity-decision-ui`, `opportunity-ui`; GREEN e commit local.

### Tarefa 7: Verificação e entrega local

**Files:** criar `docs/superpowers/reviews/2026-11-04-e3-2-previsao-comercial.md`; atualizar PENDENCIAS e ROADMAP somente com estados comprovados, preservando registros anteriores e incorporando os registros locais de auditoria relevantes sem sobrescrever arquivos da pasta operacional.

- [x] Executar unitários completos com `npm run test:unit`, `npm run test:e32`, `npm run typecheck`, `npm run lint`, `npm run build` na worktree, com ambiente sintético explícito. Não executar `npm test` nem `test:e3` contra bancos compartilhados por conveniência; se necessários, provisionar instâncias descartáveis próprias com guardas compatíveis e registrar isolamento. Falhas atuais devem ser reproduzidas e descritas, sem reciclar bloqueios históricos do Vitest.
- [x] Inspecionar interface sintética isolada desktop e 375px, claro/escuro, Tab/foco e ADMIN/OPERATOR; nenhuma linha desaparece por filtro ou overflow de página. Evidências privadas sem dados operacionais. Conferir que nenhuma previsão é exposta publicamente nem impressa no orçamento sem escopo aprovado.
- [x] Solicitar revisão independente da branch inteira, corrigir achados materiais e repetir testes afetados. Revisor não usa operação. Nenhum envio a outros chats.
- [x] Conferir diff/arquivos/sem migração e mutação incidental, remover apenas banco/contêiner sintético criado por esta execução após evidências, preservar demais serviços. Relatar testes executados, limites, versão, implementação local, ausência de integração/publicação e homologação humana pendente.
- [x] Commit local de relatório/acompanhamento. Parar antes de push/PR/merge/publicação; não incrementar versão apenas por este commit. Se futura PR for autorizada, reconferir main e aplicar política de versão uma única vez nessa preparação.

## Autorrevisão do plano

Cobertura do desenho: bloqueios/prioridades (1), demanda integral e vínculos (2), pré-venda e equipe (3), pós-produção/transporte (4), fontes/consistência/segurança (5), interface/validade/acessibilidade (6), evidências/limites/acompanhamento (7). Interfaces foram verificadas entre tarefas. Os cinco pontos de Review Focus têm teste atribuído. Decisões técnicas de limites e restrição conservadora estão explícitas; nenhuma promessa é escrita automaticamente. Execução proposta: direta nesta sessão com revisão independente final, pois as tarefas compartilham contratos de quantidade, calendário e vigência.


## Entrega local

Plano aprovado e executado diretamente em 04/11/2026. Verificação final: 825 unitários, 10 integrações E32 exclusivas, tipos/lint/build e inspeção sintética aprovados dentro dos limites do relatório. Revisão independente com três casos materiais reproduzidos/corrigidos. [Relatório e limites](../reviews/2026-11-04-e3-2-previsao-comercial.md). Sem PR/push/merge/publicação; versão preservada 1.17.0. A remoção final do contêiner sintético/pasta temporária foi rejeitada pela revisão automática; o contêiner foi apenas parado e os arquivos preservados. Essa exceção substitui a ação de remoção indicada na tarefa 7, sem apresentar a limpeza destrutiva como executada.
