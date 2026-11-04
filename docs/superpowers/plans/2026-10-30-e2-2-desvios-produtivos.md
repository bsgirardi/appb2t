# E2.2 — plano de detalhamento do custo produtivo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans na execução direta ou superpowers:subagent-driven-development se esse método for escolhido pelo usuário. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Abrir a variação produtiva da E2.1 por componentes verificáveis, explicando provisão para falhas, custos já incluídos e limites de reconciliação.

**Architecture:** Acrescentar componentes opcionais à leitura da memória congelada e derivar uma projeção pura por linha do DTO existente. Reutilizar totais, componentes realizados e cobertura sem mudar motores, rateios ou histórico. Interface no detalhe atual, com ponte agregada E2.1 preservada.

**Tech Stack:** TypeScript, StockDecimal, React/Next.js 16.4.2, shadcn local, Prisma/PostgreSQL 17, Vitest/Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-30-e2-2-desvios-produtivos-design.md`, aprovada em 30/10/2026.

## Global Constraints

- Worktree própria `C:/Users/Administrador/.codex/worktrees/e2-2-desvios-produtivos/appb2t`, branch `codex/e2-2-desvios-produtivos`, base `ce38daa`, 1.14.0. Preservar pasta operacional e outros chats.
- Não alterar motores de preço/produção/rentabilidade, rateios, documentos, memórias, revisões ou apurações anteriores. Sem schema ou migração nova.
- Sem rankings, recorrência, revisão automática da ficha, reimpressão vinculada ou medição nova de falhas.
- Depreciação fora da contribuição; caixa separado. Não atribuir causalidade a falhas por diferença de valores.
- Sem PR, push, merge, publicação, migração operacional ou atualização de contêineres. Testes mutáveis somente em banco sintético descartável exclusivo.
- Versão 1.14.0 preservada nesta preparação. Futura PR autorizada exige incremento SemVer único comparado à main vigente, manifestos e notas sincronizados, APP_VERSION nos rodapés e Atualizações.

## Review Focus

- Campo opcional malformado: abertura indisponível com motivo, sem exceção de Decimal e sem transformar ausência em zero (tarefas 1 e 2).
- Conferência antiga cujo sourceHash muda com o enriquecimento: pedir nova revisão; nunca revalidar automaticamente (tarefa 4).
- Ponte agregada completa com abertura incompleta: os dois estados precisam permanecer distintos (tarefas 2 e 3).
- Extra em U3 e complemento: apresentar diferença de classificação, sem debitá-los por confirmação ou redistribuir componentes (tarefas 2 e 4).
- Apuração antiga e origem de abertura: não buscar ficha atual para preencher componentes ausentes (tarefas 3 e 4).

## Tarefa 1 — componentes congelados previstos

**Files:** modificar `src/domain/profitability/types.ts` e `src/server/profitability/sources.ts`; criar `src/domain/profitability/expected-components.ts` e `tests/unit/profitability-expected-components.test.ts`.

**Interfaces:** `ExpectedProductiveComponents = { material: Money; energy: Money; maintenance: Money; labor: Money; extras: Money; failure: Money }`; `ExpectedCost.components?: ExpectedProductiveComponents`; `readExpectedComponents(result: unknown): ExpectedProductiveComponents | undefined`, exportado do novo módulo. Sem campos novos obrigatórios em DTO histórico.

- [x] Escrever testes com objeto congelado contendo material 50, energia 5, manutenção 5, trabalho 20, extras 10 e failure 6; esperar os seis valores exatos. Alterar commercialFixed/depreciation não altera a seleção. Falta de chave, NaN, infinito, objeto/array, null e valor não decimal retornam undefined; zero explícito é válido. Não validar igualdade com total nesse leitor: divergência será exposta pelo resíduo.
- [x] Executar `npx vitest run tests/unit/profitability-expected-components.test.ts`; confirmar falha pela função ausente.
- [x] Implementar leitor defensivo de strings decimais finitas não negativas. Em sources, adicionar `components` apenas se disponível no mesmo resultado congelado já aprovado por vínculo/fingerprint/quantidade. Não recalcular V2 nem consultar catálogo.
- [x] Reexecutar o teste e `npx vitest run tests/unit/profitability-calculate.test.ts tests/unit/profitability-reconciliation.test.ts`; confirmar sucesso. DTO sem campo novo deve produzir os mesmos totais anteriores.
- [x] Revisar diff e registrar commit local específico da tarefa, sem incluir arquivos de outros trabalhos.

## Tarefa 2 — projeção pura por componente

**Files:** criar `src/domain/profitability/productive-reconciliation.ts` e `tests/unit/profitability-productive-reconciliation.test.ts`; reutilizar fixtures de `tests/fixtures/profitability.ts` sem tornar novos campos obrigatórios nas fixtures antigas.

**Interfaces:** exportar `reconcileProductiveLine(line: ProfitabilityLineDTO, administrative: AdministrativePayload | null): ProductiveReconciliation`. Exportar tipos `ProductiveComponentRow = { key: string; label: string; expected: Metric; actual: Metric; effect: Metric; source: string }` e `ProductiveReconciliation = { rows: ProductiveComponentRow[]; aggregateEffect: Metric; unexplained: Metric; closed: boolean; includedLosses: CostSource[]; sources: CostSource[] }`. Componente UI recebe o resultado e a linha. A projeção não altera DTO, fontes nem engineVersion.

- [x] Testar caso aprovado: previsto 96; realizado produtivo 106, com total de origem 100 incluindo depreciação 4 e complemento 10. Componentes realizados: 60/6/6/24. Esperar efeitos material −10, energia −1, manutenção −1, labor −4, extras 0, failure +6; aggregateEffect −10, unexplained 0, closed true. Confirmar igualdade com o efeito productive de reconcileSale.
- [x] Testar LOSS de total 30 já incluído, reserva de valor arbitrário e múltiplas confirmações: nenhuma soma adicional. Confirmar deep equality do input antes/depois.
- [x] Testar componente previsto ausente, actual.components null, chave necessária ausente, provisional, entrega incompleta, conferência vencida e memória ausente: sem efeito definitivo/fechamento dependente; conservar knownValue e motivos. A soma de conhecidos não vira efeito completo. Fee/shipping desconhecidos não impedem abertura produtiva completa quando o próprio custo produtivo está completo.
- [x] Testar componente inesperado/divergente: resíduo decimal explícito e closed false; precisão em seis casas, efeito negativo, receita zero e múltiplas linhas. Sem forçar zero por formatação em centavos.
- [x] Executar teste novo; confirmar falha pelo módulo ausente.
- [x] Implementar linhas na ordem material, trabalho, energia, manutenção, extras e provisão. Reais produtivos vêm de actual.components; extras reais da soma única de administrative.extras da linha. Aplicar cobertura do cenário produtivo a valores realizados, com validação individual das chaves. Provisão: parcela realizada adicional zero sob a mesma cobertura; não alegar medição de falha zero. aggregateEffect = previsto produtivo − realizado produtivo; unexplained = aggregateEffect − soma dos efeitos, somente se todos disponíveis; closed exige tudo COMPLETE e resíduo exatamente zero. Não alterar allocateCostComponents.
- [x] Executar testes novos e regressões de calculate, coverage, reconciliation, production-cost-allocation e consignment-cost-allocation; confirmar sucesso e registrar commit local.

## Tarefa 3 — explicação na interface existente

**Files:** criar `src/components/profitability/productive-reconciliation.tsx` e `tests/unit/profitability-productive-reconciliation-ui.test.tsx`; modificar `src/components/profitability/reconciliation.tsx`. Preservar a ponte agregada e a apresentação histórica existente.

**Interfaces:** exportar `ProductiveCostReconciliation({ line, administrative }: { line: ProfitabilityLineDTO; administrative: AdministrativePayload | null })`, que chama reconcileProductiveLine. Inserir uma instância em cada detalhe expansível de linha após Bridge. Sem agregação nova na venda e sem editor.

- [x] Antes do código, ler guias Next locais de fronteira servidor/cliente e a skill `.agents/skills/shadcn/SKILL.md` do projeto, incluindo regras pertinentes. Reutilizar Table, Badge e formatação instalados; sem dependências novas.
- [x] Escrever testes de tabela com Previsto, Realizado atribuído, Efeito na contribuição e Origem; fontes/IDs verificáveis. Exigir avisos “Provisão prevista para falhas”, “Custo adicional nesta abertura: zero; custos efetivos já incluídos nos componentes” e “O custo causal das falhas não foi medido separadamente”. Não mostrar “economia com falhas”.
- [x] Testar seção LOSS “já incluído”, valor total com aviso de depreciação, resíduo não zero, abertura indisponível e ponte E2.1 completa ao mesmo tempo. Renderizar DTO histórico sem components previstos: sem busca adicional ou crash. Confirmações U3_SOURCE e NOT_OCCURRED não geram linhas de cobrança.
- [x] Rodar teste novo e observar falha pela UI ausente; implementar componente acessível, com cabeçalhos de tabela e IDs legíveis, usando fontes agregadas sem atribuir componente individual a cada fonte.
- [x] Rodar teste novo, profitability-ui e profitability-reconciliation-ui; inspecionar com fixtures sintéticas desktop/375 px e teclado. Sem overflow da página; rolagem de tabela local acessível. Registrar evidências e commit local.

## Tarefa 4 — leitura real e histórico em banco exclusivo

**Files:** criar `tests/e22/database.ts`, `tests/e22/setup.ts`, `tests/e22/profitability-components.test.ts`, `vitest.e22.config.ts`, `tests/unit/e22-database.test.ts`; modificar scripts em `package.json` e matriz `.github/workflows/ci.yml`. Sem mudar versões nesta fase; nenhuma dependência nova.

**Interfaces:** `assertE22DatabaseUrl(value: string): URL`, aceitando somente PostgreSQL em localhost/127.0.0.1, porta 55438, banco b2t_e22_test, sem opções de redirecionamento. Config E22 usa exclusivamente E22_TEST_DATABASE_URL, configura DATABASE_URL antes de carregar db e descobre apenas tests/e22/*.test.ts. Setup próprio verifica URL antes de qualquer limpeza; não importar setup geral de integração. Reutilizar fixtures de criação que não limpam banco e seedUser próprio.

- [x] Testar guarda recusando URL vazia, banco/porta/host divergente e parâmetros de conexão capazes de redirecionar; executar RED antes da implementação e GREEN após. Sem conexão no teste da guarda.
- [x] Provisionar somente PostgreSQL 17 temporário exclusivo da tarefa, sem volume persistente e sem atualizar contêiner existente. Se porta ocupada, não reutilizar o serviço: resolver isolamento antes de executar. Aplicar migrações existentes só na URL E22 validada; sem copiar .env operacional.
- [x] Escrever integrações com vínculo congelado válido e snapshot 50/5/5/20/10/6. Transação SET TRANSACTION READ ONLY deve extrair composição e não criar ProductionCostRevision. Ausência/malformação dos componentes deixa abertura indisponível. Catálogo/ficha alterados não mudam composição congelada. Vínculo incompatível mantém memória indisponível.
- [x] Integrar produção com boas/falhas no mesmo evento, LOSS encerrada sem boas, entrega parcial, múltiplas origens e abertura sem composição; manter soma dos custos e limites. Exercitar consignação com origem produtiva e de abertura, sem inserir perda em custódia no custo de falha fabril.
- [x] Integrar complementos e confirmações U3_SOURCE/NOT_OCCURRED/COMPLEMENT sem dupla contagem. Revisão com hash antigo deve continuar antiga; reabrir conferência, nunca atualizar hash automaticamente. Apuração antiga guardada antes do enriquecimento mantém JSON integral, mesmo após novas leituras e apuração nova.
- [x] Executar RED dos testes de fonte antes da mudança correspondente, depois GREEN com `npm run test:e22`. Se tarefa 1 já introduziu a leitura, demonstrar RED removendo temporariamente só o enriquecimento e restaurar em seguida, sem tocar dados históricos.
- [x] Adicionar script test:e22 e job E22 na matriz de CI, com porta/banco/variável exclusivos; aplicar migrações existentes no job antes da suíte. Não disparar CI remoto sem autorização para push. Registrar commit local.

## Tarefa 5 — verificação e entrega local

**Files:** atualizar este plano, `PENDENCIAS.md`, `docs/ROADMAP-SELLER.md`; criar `docs/superpowers/reviews/2026-10-30-e2-2-desvios-produtivos.md`.

- [x] Conferir novamente origin/main e mudanças de contratos, sem integrar automaticamente trabalho alheio. Preparar dependências apenas nesta worktree e confirmar baseline unitária antes da execução; não usar banco geral nem operacional.
- [x] Rodar `npm run test:unit`, `npm run test:e22`, `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` com árvore estável. Registrar contagens, falhas/limites reais; não substituir execução por resultado histórico de CI. Toda ampliação para banco geral exige instância exclusiva e guarda própria.
- [x] Fazer revisão independente final do diff e corrigir achados com regressão verificável antes de declarar conclusão. Conferir histórico imutável, composição ausente, extras, precisão e explicação de falhas.
- [x] Registrar implementação, validação, integração e publicação separadamente. Atualizar somente a cópia isolada de roadmap/PENDENCIAS, preservando registros anteriores e sem sobrescrever os locais operacionais.
- [x] Entregar branch local e relatório. Não abrir PR/push/merge/publicar. Na futura PR autorizada, reconciliar SemVer sobre main atual e preservar notas e rodapés conforme AGENTS.

## Autorrevisão e método

Critérios 1–7 do desenho cobertos nas tarefas 1–4; critério 8 e preservação operacional cobertos nas tarefas 4–5. Contratos opcionais mantêm JSON anterior compatível. Resíduo não força causalidade ou fechamento; cobertura por componente não altera totais. Scripts/CI não introduzem migração de produto.

Método recomendado: execução direta neste chat, com revisão independente ao final, pois as tarefas compartilham DTO e regras de cobertura e o recorte não exige implementadores paralelos. Plano e método aprovados pelo usuário; execução direta retomada em 04/11/2026. Tarefas 1–5 concluídas. Resultado e limites em docs/superpowers/reviews/2026-11-04-e2-2-desvios-produtivos.md; branch local preservada, sem PR/push/merge/publicação.
