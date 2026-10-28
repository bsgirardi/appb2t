# E2.1 — plano de reconciliação da rentabilidade

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Explicar, por venda e linha, a passagem da contribuição na receita da memória para a prevista na venda e para a realizada.

**Architecture:** Criar uma projeção pura do DTO existente, calculada apenas para apresentação. Reutilizar receita líquida, rateios, custos e cobertura de calculateSale; não mudar o motor, suas avaliações persistidas ou engineVersion u4-v1. Exibir a projeção no detalhe atual, inclusive ao visualizar avaliações históricas com o mesmo contrato.

**Tech Stack:** TypeScript, StockDecimal, React/Next.js, Vitest e Testing Library existentes.

**Spec:** docs/superpowers/specs/2026-10-27-e2-desvios-proposta.md (aprovada em 27/10/2026).

## Global Constraints

- Não publicar, migrar, atualizar contêineres ou usar banco operacional.
- E1 permanece parcial; não modificar sua worktree ou compartilhar banco de teste.
- Implementar em isolamento da main atual, preservando alterações locais.
- Receita da memória não comprova orçamento enviado ou histórico de negociação.
- Caixa, contribuição e resultado após depreciação permanecem distintos.
- Não alterar cadastros, parâmetros, snapshots, revisões ou avaliações históricas.
- Sem nova dependência, schema, migration, escrita de banco ou mudança de permissão.
- PR e merge exigem autorização específica. Antes de eventual PR: incremento MINOR único sobre main, manifestos sincronizados, notas em português e APP_VERSION nos rodapés.

## Review Focus

- Memória ou frete previsto ausentes: deixar apenas as métricas dependentes indisponíveis, sem reconstruir ficha atual.
- Revisão vencida, entrega incompleta e custos provisórios: não fechar a ponte realizada.
- Arredondamento de taxas a seis casas: reconciliar taxas efetivamente usadas no DTO, sem inventar desvio residual.
- Desconto integral e receita zero: contribuição válida, margem indisponível, sem divisão por zero.
- LOSS, complementos e reservas: usar custos já calculados sem somar fontes novamente.

## Tarefa 1 — projeção pura e reconciliação

**Files:** criar `src/domain/profitability/reconciliation.ts`; criar `tests/unit/profitability-reconciliation.test.ts`; reutilizar `tests/fixtures/profitability.ts`, `src/domain/profitability/types.ts` e `calculate.ts` sem mudar seu contrato persistido.

**Interfaces:** exportar `reconcileSale(value: SaleProfitabilityDTO): SaleReconciliation`. Definir neste arquivo `ReconciliationStage = { revenue: Money; contribution: Metric; margin: Metric }`, `ReconciliationEffect = { key: string; label: string; amount: Metric; source: string }`, `LineReconciliation = { key: string; reference: ReconciliationStage; negotiated: ReconciliationStage; actual: ReconciliationStage; commercialEffects: ReconciliationEffect[]; actualEffects: ReconciliationEffect[]; referenceSnapshotId: string | null; commercialClosed: boolean; actualClosed: boolean }` e `SaleReconciliation` com os mesmos estágios/efeitos/fechamentos agregados e `lines: LineReconciliation[]`. Usar Metric existente e cobertura explícita; valores indisponíveis não são zero.

- [x] Escrever testes para a fixture completa: referência 185, preço −100, desconto 0, frete cobrado 0, base de taxas +5, previsto 90, realizado 90, margem referência 185/300×100, margem negociada/realizada 45%; resultado após depreciação continua 85 no DTO original.
- [x] Testar múltiplas linhas, desconto e frete: derivar desconto como grossRevenue − netProducts e frete cobrado como revenue − netProducts. Confirmar soma dos efeitos por linha igual aos efeitos da venda e identidade dos dois fechamentos.
- [x] Testar taxa fracionária e precisão: arredondar taxa de referência a seis casas como calculateSale; efeito de base = taxa de referência − expectedScenario.fees.value. Não usar diferença percentual não arredondada como fechamento.
- [x] Testar memória ausente, frete previsto desconhecido, taxa efetiva desconhecida versus zero declarado, composição ausente, sourceHash desatualizado, entrega incompleta e provisional. Checar null, motivos e fechamento falso apenas nos trechos dependentes.
- [x] Testar receita zero, contribuição negativa, memória com receita zero, desconto integral e fonte LOSS/complemento/reserva. Confirmar imutabilidade do DTO recebido e ausência de soma de actual.sources/knownTotal/reservedTotal.
- [x] Rodar `npx vitest run tests/unit/profitability-reconciliation.test.ts`; confirmar falha por módulo ausente antes de implementar.
- [x] Implementar as fórmulas aprovadas com StockDecimal. Referência usa receita da memória, custo produtivo previsto, taxa de referência e frete previsto rateado existente. Ponte realizada usa diferenças de productive, fees e shipping dos cenários existentes. Cada efeito informa memória/linha/revisão ou fonte de totais comerciais; não inventar origem detalhada de componentes.
- [x] Agregar somente sobre todas as linhas da mesma venda; qualquer ausência impede o fechamento dependente. Margens agregadas usam contribuição total dividida pela receita total do respectivo estágio. Confirmar igualdade decimal exata com os destinos existentes antes de marcar fechado.
- [x] Repetir testes novos e `npx vitest run tests/unit/profitability-calculate.test.ts tests/unit/profitability-coverage.test.ts tests/unit/profitability-allocation.test.ts tests/unit/profitability-aggregate.test.ts`; todos devem passar.

## Tarefa 2 — explicação no detalhe existente

**Files:** criar `src/components/profitability/reconciliation.tsx`; modificar `src/components/profitability/detail.tsx`; criar `tests/unit/profitability-reconciliation-ui.test.tsx`; preservar `assessment-history.tsx` e persistência.

**Interfaces:** componente `ProfitabilityReconciliation({ value }: { value: SaleProfitabilityDTO })` consome reconcileSale. Exibir resumo da venda e detalhes expansíveis por linha. Reutilizar moneyText/coverageNames em detail sem importação circular: passar formatação como prop ou extrair helpers para `src/components/profitability/format.ts` e atualizar consumidores existentes.

- [x] Ler guias locais Next de componentes servidor/cliente e skills React/shadcn pertinentes antes de escrever código de interface.
- [x] Escrever testes de interface: três estágios e respectivas margens; efeitos com sinal e fonte; memória ausente e provisório exibem motivos, sem “reconciliado”; zero declarado aparece como zero; perda já incluída não aparece como novo efeito; receita zero mostra margem indisponível.
- [x] Executar teste novo e confirmar falha pela interface ausente.
- [x] Implementar componente acessível com tabelas existentes, sem largura que force rolagem da página em 375 px. Exibir “Receita da memória”, “Previsto na venda” e “Realizado”; explicar que referência não comprova histórico de negociação. Alterar “Preço sugerido original do lote” para “Receita original da memória”. Manter comparação produtiva, fontes, exclusão comercial, recebimentos e resultado após depreciação visíveis.
- [x] Exibir confirmação de reconciliação somente com ponte completa e igualdade verificada. Manter efeitos conhecidos individualmente disponíveis quando outra dependência faltar. Não somar percentuais; qualquer diferença de margem usa pontos percentuais.
- [x] Executar `npx vitest run tests/unit/profitability-reconciliation-ui.test.tsx tests/unit/profitability-ui.test.tsx` e testes da tarefa 1; todos devem passar. Validar também renderização de DTO histórico existente sem novos campos persistidos.

## Tarefa 3 — verificação e entrega local

**Files:** atualizar acompanhamento e registrar `docs/superpowers/reviews/2026-10-27-e2-reconciliacao.md` na cópia isolada; transportar somente registros E2 para a pasta de acompanhamento quando necessário, preservando atualizações concorrentes.

- [x] Conferir novamente main e contratos E1 antes da execução; criar worktree própria via fluxo using-git-worktrees. Copiar somente documentos E2 aprovados. Não copiar .env operacional.
- [x] Executar `npm run typecheck`, `npm run lint`, `npm run build` e os testes focados das tarefas 1–2; registrar comandos, totais e falhas reais. Se a recursão conhecida do Vitest reaparecer, registrar o limite e testar grupos menores sem suprimir erros.
- [x] Inspecionar detalhe com fixtures completas/incompletas, valores negativos e múltiplas linhas em desktop e 375 px. Usar somente servidor de desenvolvimento isolado e dados sintéticos.
- [x] Confirmar diff sem alteração de persistência, engineVersion, fontes produtivas, rateios ou banco. Integrações de banco não são necessárias se esse limite for mantido; se o escopo exigir mudar fontes, parar e revisar o plano e usar banco descartável exclusivo.
- [x] Revisar diff e `git diff --check`; registrar análise, implementação, validação e pendências E2 separadamente. Sem alegar E2 completa por entregar E2.1.
- [x] Entregar branch local para revisão, sem PR/merge/publicação. Preparar versão e notas somente quando houver autorização para entregar PR; conferir main nesse momento para evitar colisão com E1 e atualizar uma única vez.

## Revisão do plano

Cobertura conferida contra os seis critérios da especificação. A projeção de leitura resolve compatibilidade histórica sem mudar o motor ou engineVersion. O isolamento descrito na tarefa 3 é pré-condição da execução das tarefas 1–2. Recorrência, ranking e componentes detalhados permanecem fora de E2.1.
