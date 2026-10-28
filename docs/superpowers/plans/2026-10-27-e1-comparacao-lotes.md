# E1.1 — Comparação de lotes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Expor os resultados financeiros e recursos produtivos de até dez quantidades no comparador atual.
**Architecture:** Manter `calculateV2` intacto. Enriquecer `calculateScenarios` com indicadores decimais derivados; apresentar cada lote em bloco semântico responsivo usando os componentes existentes, sem novas dependências ou persistência.
**Tech Stack:** Next.js 16.4.2, React, TypeScript, Decimal.js, Vitest, Testing Library.
**Spec:** `docs/superpowers/specs/2026-10-27-e1-comparacao-lotes-design.md`, aprovado no chat em 27/10/2026.

## Global Constraints

- Preservar motor V2, memórias históricas, canais e modos atuais.
- Até dez quantidades inteiras entre 1 e 100.000; validação adicional do motor preservada.
- Contribuição/hora usa somente tempo de máquina. Não é lucro líquido ou projeção mensal.
- Comparar não persiste; usar quantidade altera somente quantidade; documento fixado não permite comparação.
- Sem banco operacional, publicação, migração ou merge. Implementação na worktree `e1-decisoes-preco`.
- Versão funcional 1.6.0, conferir main antes de entregar; manifestos sincronizados e notas em português.

## Review Focus

- Resultado negativo permanece visível mesmo com contribuição positiva antes de depreciação.
- Preço zero mantém margem não aplicável.
- Mudança de quantidades ou parâmetros invalida resultados anteriores quando inválidos.
- Consumos elevados respeitam limites por material, inclusive resina e desperdício fixo.
- Quantidade fixada e ações de simulação não devem criar gravações ou mudanças comerciais implícitas.

## Task 1 — Indicadores derivados

**Files:** `src/domain/pricing/scenarios.ts`, `tests/unit/pricing-scenarios.test.ts`.
**Interfaces:** `calculateScenarios(input: PricingV2Input, quantities: number[]): PricingScenario[]`; preservar `quantity` e `result`; acrescentar `machineMinutes: string`, `contributionPerMachineHour: string`, `materials: {name: string; unit: "G" | "ML"; consumption: string}[]`.

- [x] Escrever testes: fixture 10 peças gera 120 minutos, contribuição/hora `29.105`, materiais `110` e `50`; 20 peças mantém desperdício uma vez; tempo fixo + variável; resina em ml; preço zero e valores negativos; resultados iguais a calculateV2 em todos os modos; entrada imutável; limites de consumo e tempo.
- [x] Executar `npx vitest run tests/unit/pricing-scenarios.test.ts` e confirmar falha por indicadores ausentes.
- [x] Implementar indicadores com Decimal de precisão 40 e valores serializáveis, sem arredondar antes da apresentação.
- [x] Repetir teste e confirmar sucesso com testes existentes de `pricing-v2` e `pricing-validation`.

## Task 2 — Comparação legível

**Files:** `src/components/pricing/pricing-scenarios.tsx`, novo `tests/unit/pricing-scenarios-ui.test.tsx`.
**Interfaces:** Preservar `PricingScenarios({input, onSelect})` e consumir `PricingScenario[]` da tarefa 1.

- [x] Escrever testes de interface com entradas reais: dez peças mostra custo `5,62`, preço `12,49`, receita `124,90`, contribuição `58,21`, após depreciação `56,21`, `29,11/h`, `120 min`, `110 g` e `50 g`; modo/canal e meta contextualizados; preço zero e déficit visíveis; inválidos removem resultados; callback recebe somente quantidade; nenhuma gravação ao comparar.
- [x] Rodar novo teste e confirmar falha por conteúdo ausente.
- [x] Usar Card completo e dl com rótulos consistentes em uma coluna estreita e duas colunas quando houver espaço. Sem novas cores, fontes, sombras ou dependências. Ações em rodapé com quebra de linha.
- [x] Exibir explicações distintas de cobertura e meta, margem arredondada e denominador de contribuição/hora. Informar consumo com desperdício e ausência de projeção de capacidade.
- [x] Executar testes novos e regressões de pricing-ui, pricing-review, product-pricing-ui e commerce-pricing-ui.

## Task 3 — Entrega verificável

**Files:** `package.json`, `package-lock.json`, `src/lib/releases.ts`, spec/plano, `docs/ROADMAP-SELLER.md`, `PENDENCIAS.md`, novo relatório de validação.

- [x] Atualizar versão uma vez para 1.6.0 e inserir notas de Novidades/Melhorias em português, preservando histórico.
- [x] Conferir imports APP_VERSION e acesso autenticado a Atualizações; rodar testes de versão existentes.
- [x] Executar tipagem, lint, build e testes unitários completos. Não executar integrações que limpem banco sem ambiente dedicado explícito.
- [x] Inspecionar a interface com fixtures em navegador em larguras desktop e 375 px, sem conectar banco operacional. Remover qualquer harness temporário da entrega.
- [x] Revisar o diff e atualizar acompanhamento distinguindo E1.1 implementado de E1 ainda parcial, testes de validação, PR, merge e publicação.
- [x] Registrar limites e revisão final; preparar commit local e PR revisável sem merge/publicação se as verificações permitirem.

## Decisões de execução

- Execução nesta sessão, sem nova pausa de planejamento: o pedido inicial determina avançar sem pausas rotineiras, e a aprovação confirmou o desenho e a continuação para plano/implementação.
- Documentos locais de acompanhamento copiados integralmente para o isolamento; a instalação operacional não recebe código de produto.
- Testes completos limitados a `tests/unit`: integrações do comando global requerem banco destrutivo dedicado; não usar banco operacional.
- Revisão do plano: critérios do desenho cobertos pelas tarefas 1–3; interfaces consistentes e nenhuma dependência de novo esquema de dados.
