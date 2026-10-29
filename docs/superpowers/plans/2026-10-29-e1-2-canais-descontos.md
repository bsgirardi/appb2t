# E1.2 — Canais, descontos e cenários salvos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Comparar ofertas por canal/desconto e recuperar comparações nomeadas reproduzíveis sem alterar o motor ou preços automaticamente.

**Architecture:** Domínio puro de comparação usa calculateV2 e Decimal. Serviço transacional resolve referências atuais e grava PricingSnapshot por alternativa, mais cabeçalho/itens imutáveis com contexto e indicadores versionados. Comparador compartilhado V2/V3 e biblioteca privada consomem os mesmos contratos.

**Tech Stack:** Next 16.4.2, React 19, TypeScript, Prisma/PostgreSQL 17, Zod, Decimal.js, Vitest e componentes shadcn instalados.

**Spec:** `docs/superpowers/specs/2026-10-29-e1-2-canais-descontos-design.md` — aprovado pelo usuário em 29/10/2026 após revisão independente sem lacunas materiais.

## Global Constraints

- Preservar calculateV2, cálculo original, comparação E1.1, memórias antigas e decisão humana.
- Comparar de 1 a 10 alternativas; desconto percentual de 0 a 100 com até duas casas; nome de 1 a 120 caracteres.
- Receita final deriva do preço unitário descontado HALF_UP a centavos; pisos usam arredondamento PARA CIMA. Não mudar arredondamento legado.
- Sem tarifas presumidas, G-code/3MF, projeção mensal ou integrações externas.
- ADMIN e OPERATOR autenticados compartilham biblioteca privada; sem edição/exclusão de memórias.
- Nenhum teste mutável na operação ou nos bancos de outros chats. Banco proposto exclusivo E1.2: localhost:55437/b2t_e12_test, com guarda estrita e sem parâmetros na URL.
- Não abrir PR, fazer push/merge/publicação, migrar banco operacional ou atualizar contêineres existentes sem autorização específica.
- Versão 1.12.0 durante planejamento; preparar MINOR único sobre main vigente na entrega funcional, sem tags.
- Usar skill shadcn local em alterações visuais; ler guias Next locais pertinentes antes de código. Não compartilhar node_modules por junction gravável com operação.

## Review Focus

- Troca de catálogo entre prévia e salvar: conflito integral, sem memória parcial nem atualização silenciosa (tarefa 2).
- Mudança da comparação durante requisição: sucesso pertence ao conteúdo enviado e não deve rotular o rascunho editado como salvo (tarefa 4).
- Desconto 100%, preço zero e piso próximo do centavo: margem ausente e indicadores consistentes com receita real (tarefa 1).
- Memória cujo material/canal está inativo: leitura preservada, reutilização exige substituição/revisão (tarefa 5).
- Reaplicação em orçamento já descontado: preço final INFORMED não incorpora o desconto E1.2 duas vezes; desconto documental continua adicional (tarefas 4 e 5).

## Mapa de arquivos e contratos

Criar domínio em `src/domain/pricing/comparisons/{types,validation,calculate}.ts`; serviços em `src/server/pricing/comparisons/{create,read}.ts`; cliente em `src/lib/pricing-comparisons-client.ts`. Não ampliar estimates.ts para biblioteca.

Criar `src/components/pricing/comparisons/{comparison-editor,comparison-results,comparison-library,comparison-detail,comparison-reuse}.tsx`. Integrar batch-pricing-form.tsx, guided-pricing-form.tsx, calculator-workspace.tsx e use-pricing-draft.tsx somente nos pontos necessários. Reusar PricingScenarios para quantidades sem misturar os dois editores.

Rotas: `src/app/api/pricing/comparisons/route.ts` (GET/POST), `[id]/route.ts` (GET); páginas `src/app/(private)/calculadora/cenarios/page.tsx` e `[id]/page.tsx`. Link a partir da calculadora, sem criar nova entrada principal obrigatória no menu.

Contratos em types.ts:
- `ComparisonReference = { kind: 'CHANNEL' } | { kind: 'COMMON'; unitPrice: string }`.
- `ComparisonAlternative = { channelRef: Ref; discountPercent: string }`.
- `ComparisonDraft = { name: string; request: PricingRequest; reference: ComparisonReference; alternatives: ComparisonAlternative[] }`.
- `ComparisonMetrics`: coverageUnitPrice, targetUnitPrice (string|null), requiredUnitPrice (string|null), targetUnavailableReason (string|null), coversFullCost, meetsTarget, referenceUnitPrice, finalUnitPrice, discountAmount, contributionChange, marginChangePoints (string|null).
- `CalculatedAlternative = { channelRef: Ref; discountPercent: string; input: PricingV2Input; result: PricingV2Result; metrics: ComparisonMetrics }`.
- `ComparisonPreview = { alternatives: Array<{ status: 'VALID'; value: CalculatedAlternative } | { status: 'INVALID'; channelRef: Ref; discountPercent: string; message: string }> }`.
- `SavedComparison`: id, name, createdAt, actorId, actorName, contractVersion:1, calculationVersion:1, reference, originalMode, settingsVersion, alternatives com id/ordem/snapshotId/CalculatedAlternative.
- `ComparisonPage = { items: SavedComparisonSummary[]; nextCursor: string|null }`; resumo id/nome/autor/data/quantidade/contagem.

## Task 1: Domínio de ofertas e indicadores

**Files:** criar types.ts, validation.ts, calculate.ts acima; testes `tests/unit/pricing-comparisons.test.ts` e `pricing-comparisons-validation.test.ts`.

**Interfaces:** `previewComparison(input: PricingV2Input, channels: PricingChannelDTO[], reference: ComparisonReference, alternatives: ComparisonAlternative[]): ComparisonPreview`. Validação de rascunho e consulta em validation.ts. Sem IO ou mutação.

- [ ] Ler guias Next disponíveis em `node_modules/next/dist/docs/` antes de qualquer código; instalar dependências locais com npm ci somente ao iniciar execução aprovada. Ler skills TDD e execução.
- [ ] Criar testes RED para fixture sintética n=10, V=90, F=100, taxa=10%, meta=20%: cobertura='11.12', meta='12.86'; base 15, desconto 10 → preço='13.50', receita 135, contribuição 31.5, resultado após depreciação 21.5, variação contribuição −13.5; comparar decimais por Decimal, não representação textual incidental.
- [ ] Executar `npx vitest run tests/unit/pricing-comparisons.test.ts tests/unit/pricing-comparisons-validation.test.ts`; confirmar falha pela ausência da função.
- [ ] Implementar usando calculateV2 para base por canal e oferta final INFORMED, custos/taxas por alternativa; obter custos em INFORMED mesmo quando meta torna CONTRIBUTION inviável. Derivar pisos com Decimal ROUND_CEIL e validar limites monetários existentes. Resultado inválido afeta só a linha.
- [ ] Acrescentar testes: bases CHANNEL/COMMON, INFORMED, MARKUP, meta inviável apenas em um canal, contribuição positiva sem cobertura, cobertura sem meta, desconto 0/100, centavo fracionário, FDM/resina, taxa/fixo zero, limite monetário, input imutável, validação de 11 linhas/nome vazio/percentual negativo ou >100/3 casas; normalizar duplicatas por canal+versão+desconto decimal.
- [ ] Rodar testes novos e `tests/unit/pricing-v2.test.ts`, `pricing-scenarios.test.ts`, `pricing-validation.test.ts`; esperar PASS e registrar contagens.
- [ ] Commit local do domínio e testes.

## Task 2: Persistência atômica e memória histórica

**Files:** modificar `prisma/schema.prisma`; criar migração aditiva em `prisma/migrations/`, serviços create.ts/read.ts, `tests/e12/{database,setup,fixtures}.ts`, `vitest.e12.config.ts`, `tests/e12/pricing-comparisons.test.ts`; scripts test:e12 no package.json.

**Interfaces:** `createPricingComparison(actor: Actor, raw: unknown, operationKey: string): Promise<SavedComparison>`; `getPricingComparison(actor: Actor,id:string): Promise<SavedComparison>`; `listPricingComparisons(actor: Actor,query: {search?:string;cursor?:string;limit?:number}): Promise<ComparisonPage>`. Padrão 20, limite máximo 50; cursor ordena createdAt+id decrescentes.

Modelos aditivos PricingComparison (id, nome, ator/data, chave/hash únicos por ator, versões, contexto JSON) e PricingComparisonItem (id, comparisonId FK, posição, snapshotId FK único, contexto/indicadores JSON; unique comparisonId+posição). Snapshots continuam no contrato antigo; contexto pertence aos itens. Não backfill. Reaproveitar hash/replay de estimates.ts sem mutá-lo.

- [ ] Criar guarda de URL E12 estrita (porta 55437, banco b2t_e12_test, loopback, sem query/hash), antes de qualquer limpeza/migração; copiar padrão estrutural E6 sem copiar sua URL. Criar instância descartável própria sem volume persistente e sem modificar serviços existentes; verificar porta livre e parar diante de conflito.
- [ ] Escrever RED: salvar duas alternativas cria um cabeçalho, dois itens e dois snapshots; repetir chave/pedido retorna mesmos IDs, chave/conteúdo diferente gera conflito; injetar falha no segundo item deve reverter tudo. Rodar `npm run test:e12` no banco exclusivo.
- [ ] Implementar validação, resolução pelo servidor em RepeatableRead, cálculo domínio e gravação única; em concorrência por chave tratar unique violation e conferir hash. Não confiar no resultado enviado; contrato estrito rejeita campos de totais. Guardar request original/contexto e todos os resultados históricos versionados.
- [ ] Implementar consultas autenticadas com projeção resumida na lista e leitura histórica sem recálculo/catálogo atual; não expor operationKey/hash. Validar IDs/cursores/limites.
- [ ] Testar ADMIN/OPERATOR, alteração concorrente de referência, referência inativa, operação duplicada concorrente real com barreira, idempotência sem nova resolução do catálogo, integridade de ordem e leitura após alteração de catálogo. Memória com oferta negativa pode ser salva; alternativa inválida impede gravação integral.
- [ ] Rodar suite E12, Prisma validate/generate e typecheck; esperar PASS. Commit local.

## Task 3: API privada e cliente

**Files:** criar rotas e cliente do mapa; `tests/e12/pricing-comparisons-http.test.ts`, `tests/unit/pricing-comparisons-client.test.ts`.

**Interfaces:** POST `{ draft: ComparisonDraft; operationKey: UUID }` retorna SavedComparison pelo padrão ok; GET lista aceita search/cursor/limit; GET id retorna detalhe. Cliente `saveComparison(draft,key)`, `fetchComparisons(query)`, `fetchComparison(id)` usa api existente.

- [ ] Escrever testes RED de POST/GET autenticados, 401 sem sessão, 404 inexistente, payload inválido/excessivo e 409 por chave conflitante; ambos os perfis acessam a mesma biblioteca privada.
- [ ] Rodar testes e confirmar RED antes das rotas.
- [ ] Implementar requireActor, endpoint/jsonBody/ok e erros existentes; limite POST 131072 bytes, consulta com Zod; POST não aceita totais.
- [ ] Implementar cliente sem gerar chave nova em tentativa de reenvio do mesmo conteúdo.
- [ ] Executar suites HTTP/cliente e regressão de pricing-estimates/pricing-http em seus bancos exclusivos corretos; nunca apontar suíte geral para E12. Esperar PASS. Commit local.

## Task 4: Comparador vivo compartilhado V2/V3

**Files:** criar comparison-editor.tsx/results.tsx; modificar batch-pricing-form.tsx, guided-pricing-form.tsx e use-pricing-draft.tsx; criar `tests/unit/pricing-comparisons-ui.test.tsx`.

**Interfaces:** editor recebe catalog, input, request, `onUseOffer(channelRef:Ref,finalUnitPrice:string):void`; só a ação Usar oferta altera channelRef/mode INFORMED/informedUnitPrice. Quantidade fica inalterada.

- [ ] Ler skill shadcn local, contexto componentes e documentação dos componentes usados; preservar padrões Field/Notice do projeto. Ler guias Next para componentes cliente/servidor e formulários locais.
- [ ] RED: usuário escolhe duas alternativas, desconto muda resultados, mostra base/meta/piso/taxas; editar dado inválido remove resultados anteriores; clicar Usar oferta altera só canal/modo/preço final e mantém quantidade fixa, sem salvar ou publicar.
- [ ] Rodar `npx vitest run tests/unit/pricing-comparisons-ui.test.tsx` e confirmar RED.
- [ ] Implementar seleção de canais ativos, duas bases explícitas, até 10 linhas, validação/erros por linha, exibição de indicadores/variações e explicações de contribuição/depreciação/meta. Preço comum no modo INFORMED começa visível a partir do formulário. E1.1 continua independente.
- [ ] Implementar nome e salvar explicitamente, chave estável por corpo enviado; bloquear envio repetido e distinguir conteúdo salvo do rascunho editado durante request. Sucesso oferece link à memória, sem navegação automática destrutiva.
- [ ] Testar percentuais com vírgula, mesma taxa/percentual equivalente duplicados, meta impossível sem bloquear outros canais, 100% sem margem, falha/reenvio, alteração do rascunho durante salvar e desconto documental adicional explicado.
- [ ] Rodar testes novos e regressões pricing-ui, pricing-v3-ui, pricing-scenarios-ui e commerce-pricing-ui. Esperar PASS. Commit local.

## Task 5: Biblioteca, comparação histórica e reutilização revisada

**Files:** criar library/detail/reuse.tsx e páginas do mapa; modificar calculator-workspace.tsx para link e recuperação; `tests/unit/pricing-comparison-library-ui.test.tsx`, `pricing-comparison-reuse.test.ts`.

**Interfaces:** biblioteca consulta lista/detalhe; seleção no máximo 10 itens identificados por comparisonId+itemId. Reutilização produz PricingRequest e exige revisão do catálogo atual pelo fluxo de revisão do draft antes de onApply.

- [ ] RED: busca/paginação, vazio, erro, seleção de 11º item rejeitada; comparação de quantidades distintas mantém rótulos e nunca soma/rankeia resultados. Memória velha após alteração do catálogo conserva valores originais.
- [ ] Rodar testes novos para RED.
- [ ] Implementar páginas privadas com tratamento de autenticação/404 conforme calculadora; lista paginada por nome/data, detalhe com autor/data e premissas históricas. Seleção pode vir de detalhes carregados por demanda, sem enviar snapshots grandes na lista.
- [ ] Implementar reutilização separada da leitura: revisar diferenças atuais, bloquear referências inativas até substituição, manter quantidade fixa se contexto exigir, recalcular oferta antes de aplicar. Não passar memória antiga como catálogo atual nem alterar snapshot original.
- [ ] Testar mudança de preço/taxa, referência removida/inativa, cancelamento da revisão, preço INFORMED descontado reaplicado uma só vez, preservação do modo original na memória e novo cenário com outra identidade.
- [ ] Executar testes da tarefa, pricing-review/product-pricing-ui/commerce-pricing-ui; validar responsividade desktop/375px e teclado com fixtures privadas sintéticas, ADMIN/OPERATOR. Registrar evidência sem dados operacionais. Commit local.

## Task 6: Migração, regressão, versão e entrega local

**Files:** criar `tests/e12/migration-validation.ts`, `legacy-preservation.test.ts`; modificar .github/workflows/ci.yml, package.json/package-lock.json, src/lib/releases.ts, PENDENCIAS.md/docs/ROADMAP-SELLER.md; criar relatório `docs/superpowers/reviews/2026-10-29-e1-2-canais-descontos.md`.

- [ ] Escrever validador de upgrade em E12 vazio: aplicar histórico anterior, inserir fixtures sintéticas de snapshots/produtos/documentos e depois migração E12; assert mesmos IDs/inputs/results/vínculos, sem backfill, e reaplicação sem alterações.
- [ ] Rodar `npm run test:e12:migration` e `npm run test:e12` em instância exclusiva; confirmar preservação, rollback/concorrência e reaplicação.
- [ ] Adicionar matriz CI E12 porta 55437/banco b2t_e12_test e variável E12_TEST_DATABASE_URL; excluir E12 da migração geral e executar validador antes da suite, seguindo E6. Testar guarda contra URLs E3/E4/E5/E6/geral/operação sem executar limpeza.
- [ ] Reconferir main vigente por consulta remota somente leitura. Preparar 1.13.0 se main ainda 1.12.0, senão próximo MINOR; sincronizar version raiz e packages[''].version no lock, adicionar notas portuguesas sem alterar entradas anteriores. Verificar APP_VERSION nos dois rodapés e /atualizacoes ADMIN/OPERATOR com app-version.test.tsx.
- [ ] Rodar npm run typecheck, npm run lint, npm run build; suites unitárias completas e integrações pertinentes com bancos descartáveis exclusivos. Suites E3–E6 mantêm suas próprias guardas/portas e nunca usam a URL E12; executar somente se instâncias exclusivas estiverem disponíveis. Não substituir falta de banco por operação. Registrar limites reais se existirem.
- [ ] Aplicar skill de revisão final independente e verification-before-completion; corrigir achados com reprodução/testes e repetir verificações afetadas. Commit local final.
- [ ] Atualizar acompanhamento preservando auditoria local copiada, sem declarar E1 ampla concluída. Relatório distingue implementado, validado e publicado. Sem PR/push/merge/publicação ou operação; entregar branch/commit, versão preparada, resultados e limites.

## Autorrevisão do plano

Cobertura: tarefas 1–6 atendem cálculo/base/desconto/piso/meta, atomicidade/imutabilidade/idempotência, permissões, UI V2/V3, biblioteca/comparação/revisão e migração/versão. Cinco pontos de Review Focus têm testes atribuídos. Tipos compartilhados definidos antes dos consumidores. Escrita em serviço único e leitura histórica sem catálogo impedem fórmulas divergentes e atualização retroativa. Fixtures e testes de banco permanecem exclusivos; não há autorização operacional implícita.

Método recomendado: execução direta neste chat, tarefa por tarefa, com revisão independente ao final, pois cálculo, contrato persistido e revisão de preço compartilham interfaces estreitas. Plano aguardando revisão/confirmação do usuário antes da implementação, conforme writing-plans.
