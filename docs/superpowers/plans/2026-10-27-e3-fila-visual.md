# E3.1 — Calendário visual e simulação da fila Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir ocupação por impressora e permitir avaliar os impactos de reordenação antes da confirmação explícita.

**Architecture:** Reutilizar `forecast`, extrair a leitura integral de seus dados e acrescentar uma projeção pura de cenário. Prévia autenticada sem escrita; confirmação usa o comando existente, revisão, idempotência e conferência dos dados atuais. Calendário e lista compartilham filtros de exibição, sem filtrar o cálculo.

**Tech Stack:** Next.js 16.4.2, React 19.3, TypeScript, Prisma/PostgreSQL, Vitest/Testing Library, componentes UI existentes; sem novas dependências ou migrações.

**Spec:** `docs/superpowers/specs/2026-10-27-e3-fila-visual-proposta.md`, recorte e desenho aprovados em 27/10/2026.

## Global Constraints

- Não publicar, atualizar contêineres, executar migrações operacionais, fazer merge ou abrir PR sem autorização específica.
- Não alterar motor nem corrigir comportamentos do scheduler sem defeito reproduzido e escopo explícito.
- Semana inicial com navegação dentro do horizonte de 90 dias; datas em America/Sao_Paulo.
- Simulação considera toda a fila e uma pessoa compartilhada entre máquinas; ativos e marcos reais preservados.
- Previsão não é garantia de entrega; pós-produção e transporte continuam explicitamente não cobertos.
- Isolamento exclusivo, sem `.env` operacional e sem banco compartilhado com E1/E2. Preservar arquivos locais e chats dessas etapas.
- Manifestos, notas e APP_VERSION obedecem AGENTS.md em eventual PR; não incrementar versão por tarefa.

## Review Focus

- Resposta de prévia fora de ordem após outra seleção: ignorar resultado antigo e impedir aplicação do cenário errado (tarefa 3).
- Filtro esconde máquina afetada pela equipe: resumo continua listando seu impacto (tarefas 1 e 3).
- Dado de estoque/máquina muda sem revisão observada: conferir fingerprint integral atual e rejeitar confirmação (tarefa 2).
- Relógio avança com tela aberta ou computador suspenso: verificar validade no servidor e em foco/visibilidade, inclusive limites temporais (tarefas 2 e 3).
- Lote atravessa meia-noite ou semana e tem previsão parcial: recortar só a representação, conservar instante e causa originais, sem inventar conclusão (tarefa 4).

## Decisões do plano

Validade proposta pelo implementador: 60 segundos, sem renovação automática durante confirmação. A prévia usa instante atual do servidor; confirmar após expiração, instante futuro ou cruzamento de qualquer início/fim futuro de intervalo das previsões antes/depois exige nova prévia. Comparações usam a mesma referência para não apresentar mudança causada só pelo relógio como efeito da reordenação.

Fingerprint SHA-256 de entrada canônica integral, com máquinas/lotes ordenados por ID e calendários normalizados, incluindo revisão, dados de lotes, participantes, bloqueios e confirmações; o instante de referência é o da prévia. É controle de consistência, não credencial. A confirmação recarrega dados sob o lock existente e recalcula o fingerprint; nunca aceita previsão ou autorização fornecida pelo navegador. O corpo inclui `previewAsOf` e `previewFingerprint`; nenhuma tabela ou chave secreta nova.

Inspeção confirmou que comandos de estoque e produção bloqueiam planejamento, reconciliam e incrementam revisão; atualização de máquina existente também. Criação de máquina retorna antes de incrementar revisão em `savePrinter`. Portanto revisão isolada não basta: a conferência integral detecta também mudança no conjunto de máquinas. Não corrigir esse fluxo incidentalmente.

Integrações atuais fixam banco `localhost:55432/b2t_test` e truncam tabelas. Não reutilizá-lo: na tarefa 2, criar configuração/guarda de integração E3 com allowlist exclusiva `localhost:55433/b2t_e3_test` e instância descartável já disponível. Se indisponível, registrar bloqueio de integração; não iniciar/alterar contêiner ou flexibilizar a guarda para usar banco alheio. Nenhum teste acessa dados operacionais.

## Mapa de arquivos

- `src/domain/planning/scenario.ts`: permutação e comparação puras; tipos exportados para servidor/UI.
- `src/server/planning/forecast-input.ts`: carregar entrada integral e conferir ator dentro da transação.
- `src/server/planning/queue-preview.ts`: prévia, fingerprint e validade.
- `src/app/api/planning/preview/route.ts`: endpoint POST autenticado somente de leitura.
- `src/server/planning/queries.ts`: reutilizar leitura extraída preservando DTO público.
- `src/server/planning/milestones.ts`: exigir prévia válida na reordenação; preservar infraestrutura de comando.
- `src/components/planning/queue-simulation.tsx`: cenário temporário, impacto e confirmação.
- `src/components/planning/queue.tsx`, `planning-panel.tsx`: comandos passam pela simulação; alternância e filtros compartilhados.
- `src/domain/planning/timeline.ts`, `src/components/planning/queue-calendar.tsx`: recorte semanal e apresentação acessível.
- Testes novos e existentes indicados nas tarefas; relatório em `docs/superpowers/reviews/2026-10-27-e3-fila-visual.md`.

### Tarefa 1: Cenário puro e comparação integral

**Files:** criar `src/domain/planning/scenario.ts`, `tests/unit/planning-scenario.test.ts`; usar `types.ts`, `scheduler.ts` e fixtures sintéticas sem banco.

**Interfaces:** `QueueScenario = { printerId: string; batchIds: string[] }`; `simulateQueue(input: PlanningInput, scenario: QueueScenario): QueueSimulation`. `QueueSimulation` contém `before: Forecast`, `after: Forecast`, `impacts: { batchId: string; printerId: string; before: BatchForecast; after: BatchForecast; participants: BatchDTO['participants'] }[]`. Exportar esses tipos; participantes sempre completos, sem inferir venda.

- [ ] Escrever testes de permutação completa dos PENDING/SCHEDULED; IDs duplicados/ausentes/externos/ativos lançam erro. Ordenar posições só na cópia dos lotes da máquina alvo; entrada congelada permanece igual.
- [ ] Testar duas máquinas com equipe disputada: mudança de ordem em A altera intervalos em B e `impacts` contém participantes de B. Testar sem mudança, lote misto, prazo ausente, novo atraso, atraso resolvido, motivo alterado e previsão parcial.
- [ ] Rodar `npx vitest run tests/unit/planning-scenario.test.ts`, confirmar falha pela ausência da implementação.
- [ ] Implementar `simulateQueue`, chamando `forecast` duas vezes no mesmo `asOf`. Comparar todos os intervalos, `reason`, `late` e prazo; não usar apenas retirada ou atraso como critério. Sem mutação e sem alterar scheduler.
- [ ] Repetir teste e `tests/unit/planning-scheduler.test.ts`; exigir todos aprovados. Commit local apenas dos arquivos da tarefa na worktree exclusiva.

### Tarefa 2: Prévia autenticada e confirmação coerente

**Files:** criar `forecast-input.ts`, `queue-preview.ts`, rota `preview/route.ts`, `tests/unit/planning-preview-validity.test.ts`, `tests/integration/planning-preview.test.ts` e configuração/guarda de banco E3; modificar `queries.ts`, `milestones.ts`, testes de reordenação existentes.

**Interfaces:** `loadPlanningInput(tx: Prisma.TransactionClient, actor: Actor, asOf: string): Promise<PlanningInput>` valida usuário ativo/papel e lê calendários, máquinas e todos os lotes, mantendo transação consistente. `QueuePreview = QueueSimulation & { asOf: string; revision: number; expiresAt: string; fingerprint: string }`. `previewQueue(actor: Actor, raw: unknown): Promise<QueuePreview>` valida `{ printerId, batchIds }` estrito e chama domínio. `assertPreviewCurrent(input: PlanningInput, scenario: QueueScenario, preview: { asOf: string; fingerprint: string }, now: string): void` verifica fingerprint/60 s/limites temporais. `QUEUE_REORDER` acrescenta `previewAsOf`, `previewFingerprint` obrigatórios; resposta e chave de idempotência preservadas.

- [ ] Antes de código, ler os guias locais `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` e `05-server-and-client-components.md`, AGENTS e skills de execução/TDD aplicáveis na worktree.
- [ ] Criar testes de validade: `now=asOf+59999ms` aceito sem fronteira cruzada; `+60000ms` rejeitado; instante futuro/NaN rejeitado; cruzamento de início/fim rejeitado antes dos 60 s. Fingerprint muda com material, duração, participante, calendário, estado, máquina adicionada e revisão; ordem incidental de consultas não muda fingerprint.
- [ ] Criar integrações com guarda E3: ADMIN/OPERATOR ativos permitidos, usuário inativo/papel inválido negado; prévia não muda revisão, comandos, auditoria ou posições. Aplicar após prévia válida reordena uma vez; repetir mesma chave/payload retorna resultado anterior mesmo após expiração. Chave diferente com revisão antiga conflita. Material liberado, máquina inativada e execução iniciada entre prévia/aplicação exigem nova simulação; rollback não deixa posições parciais.
- [ ] Rodar testes novos antes da implementação; exigir falha esperada. Integrações só com banco E3 guardado e configuração isolada. Adaptar `setupDatabase` com parâmetro tipado/allowlist explícita se necessário, conservando a guarda padrão dos testes antigos e sem substituir ambiente global persistente.
- [ ] Extrair leitura mantendo comportamento e DTO de `getPlanning`; reaproveitar mesma autorização. Endpoint via `planningBody`, `planningEndpoint`, `requireActor`; sem `runPlanningCommand` na prévia, sem `lockPlanning` que insira estado. Transação RepeatableRead somente para leitura.
- [ ] Implementar fingerprint com `canonical` existente e ordenação determinística; acrescentar validação da prévia dentro da action de `runPlanningCommand` em `reorderQueue`, depois da verificação de replay existente. Recarregar dados atuais sob lock, fixar `asOf` aprovado e checar validade com relógio do servidor; então usar a mesma validação de permutação da tarefa 1 e atualizações existentes. Não aceitar cliente antigo sem prévia.
- [ ] Atualizar testes existentes que aplicam reordenação para obter prévia; repetir testes de validade, scheduler, API e reordenação. Integrações pendentes impedem alegar validação de concorrência; registrar limite se banco indisponível. Commit local da tarefa.

### Tarefa 3: Fluxo de simulação e impacto

**Files:** criar `src/components/planning/queue-simulation.tsx`, `tests/unit/planning-simulation-ui.test.tsx`; modificar `queue.tsx`, `planning-panel.tsx`, `tests/unit/planning-ui.test.tsx`.

**Interfaces:** componente `QueueSimulationPanel({ preview, busy, error, onRefresh, onCancel, onConfirm })` recebe `QueuePreview | null` e callbacks tipados; coordenação no painel/fila mantém `{ printerId, batchIds }` completo e chave de aplicação por payload. `Queue` recebe callback de proposta em vez de aplicar diretamente. Usar API cliente existente para POST `/api/planning/preview` e comando `QUEUE_REORDER`.

- [ ] Testar subir/descer e ordem por prazo: solicitam prévia e não escrita. Cancelar não escreve. Confirmar inclui revisão, fingerprint, asOf e permutação exibidos. Resposta antiga após segunda proposta é ignorada por identificador de solicitação.
- [ ] Testar impacto em impressora filtrada, participantes mistos, retirada ausente com `late=false`, novo atraso, prazo ausente e cenário sem diferença; mostrar mensagens distintas, nunca afirmar prazo cumprido sem término confiável.
- [ ] Testar expiração com fake timers e retorno de foco após suspensão; desabilitar aplicação e oferecer nova prévia. Erro/conflito pede nova simulação; não reaplicar silenciosamente. Retry por falha de transporte conserva payload/chave para replay; uma nova prévia cria nova intenção/chave.
- [ ] Executar testes e confirmar falhas; implementar fluxo com rótulos em português, comparação antes/depois e OP/linha/quantidade. Não esconder impactos pelo filtro; não chamar OP de venda. Recalcular prévia ao solicitar revisão final; só habilitar confirmação sobre resposta atual.
- [ ] Remover caminhos diretos de escrita da fila, inclusive ordenar por prazo. Confirmar que atualizar dados invalida cenário; fechar detalhe/calendário não aplica nada.
- [ ] Repetir `npx vitest run tests/unit/planning-ui.test.tsx tests/unit/planning-simulation-ui.test.tsx`; exigir aprovação e commit local.

### Tarefa 4: Calendário semanal sobre previsão existente

**Files:** criar `src/domain/planning/timeline.ts`, `src/components/planning/queue-calendar.tsx`, `tests/unit/planning-timeline.test.ts`, `tests/unit/planning-calendar-ui.test.tsx`; modificar `planning-panel.tsx`.

**Interfaces:** `timelineSegments(forecast: Forecast, window: Interval): { batchId: string; printerId: string; kind: 'prepare' | 'print' | 'waitingRemoval' | 'removal'; original: Interval; visible: Interval }[]`, função pura que exclui duração zero e recorta sem alterar original. `QueueCalendar({ data, batches, window, onSelect })` usa `PlanningData`, filtros de lotes só na apresentação e callback para detalhe existente. Janela inicial começa às 00h do dia civil da referência; avança/recua sete dias, limitada ao intervalo `[asOf, asOf+90 dias]` para eventos, com limites de janela em horário civil local.

- [ ] Ler skill frontend-design e padrões atuais antes da UI; seguir tipografia, cores e componentes existentes. Sem biblioteca de agenda nova.
- [ ] Testar recortes em meia-noite, semana, exceção, ausência de previsão, intervalos parciais, espera e duração zero. Assertar instantes originais preservados e navegação limitada ao horizonte.
- [ ] Testar UI: faixas com eixo comum, fases nomeadas além de cores, abrir lote por teclado, seção sem previsão com motivo e detalhe, aviso de pós-produção/transporte e garantia. Incluir impressora sem lotes e contraste de tema claro/escuro na verificação visual.
- [ ] Confirmar testes falhando; implementar projeção e grade com rolagem local, lista equivalente e controles semanais acessíveis. Não recalcular agendador para cada filtro nem somar tempos por participante.
- [ ] Executar testes novos e unitários existentes de calendário/planejamento; commit local após aprovação.

### Tarefa 5: Verificação e entrega local

**Files:** relatório E3, desenho/plano, PENDENCIAS e ROADMAP; manifestos/releases apenas se PR for autorizada posteriormente.

- [ ] Preparação de execução antes da tarefa 1: usar skill de worktrees, conferir artifacts e main atual, criar checkout exclusivo com branch `codex/e3-fila-visual`. Levar apenas documentos necessários; nunca sobrescrever edição alheia ou copiar ambiente operacional. Registrar base/versão. Dependências instaladas na worktree conforme lockfile; sem servidor na porta operacional.
- [ ] Executar testes focados das tarefas e regressões `planning-scheduler`, `planning-calendar`, `planning-validation`, `planning-suggestions`, `planning-time-summary`, UI. Depois `npm run typecheck`, `npm run lint`, `npm run build`; exigir códigos zero. Não repetir suíte ampla já limitada sem nova evidência de necessidade.
- [ ] Rodar integrações de prévia/concorrência somente com configuração e banco E3 guardados; se indisponível, entregar limite explícito em vez de usar o banco de outra etapa.
- [ ] Fazer prévia sintética desktop e 375 px com duas máquinas, lote misto, atraso e dados ausentes, temas claro/escuro e teclado; verificar rolagem local sem transbordar página. Sem login/dados operacionais.
- [ ] Revisar diff integral contra desenho, testes e limites usando skill de revisão aplicável; corrigir achados e repetir só verificações afetadas. Sem delegar implementação salvo escolha explícita de método pelo usuário.
- [ ] Registrar implementado/validado/integrado/publicado separadamente no relatório e acompanhamento. Documentos originais têm edição concorrente: reler antes de alteração e aplicar apenas entradas E3, preservando E1/E2. Sem PR/push/merge/publicação nesta execução local sem autorização específica.
- [ ] Antes de eventual PR autorizada: reconsultar main; incremento MINOR único para funcionalidade, package.json e duas versões do lock sincronizados, entrada inicial em releases.ts, APP_VERSION dos rodapés/login e Atualizações ADMIN/OPERATOR verificados. Não criar tag. Informar versão efetiva e estado de merge/publicação.

## Autorrevisão do plano

Cobertura conferida: calendário e indisponibilidade (4), cenário integral e impactos (1/3), confirmação/tempo/concorrência (2/3), acessibilidade (3/4/5), isolamento e entrega (5). Interfaces usam PlanningInput/Forecast/BatchDTO existentes; QueuePreview estende o resultado puro com referência e fingerprint. Sem transferência, métricas econômicas, reimpressão ou promessa comercial implementadas neste recorte. Esses itens permanecem pendentes da etapa E3.

Estado: plano preparado e revisado documentalmente; implementação não iniciada. Método recomendado: execução direta neste chat, porque tarefas compartilham contratos e uma sequência curta de integração. Aguardar revisão do plano e escolha do método conforme skill de planejamento.
