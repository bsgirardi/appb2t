# Busca do catálogo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implementar a busca aprovada, com palavras em qualquer ordem, acentos e aproximações conservadoras.

**Architecture:** PostgreSQL normaliza os campos e os termos com unaccent; parâmetros literais usam strpos. Contagem exata, eventual aproximação e seleção de até 12 IDs acontecem numa transação RepeatableRead. A apresentação mantém os filtros e informa aproximações.

**Tech Stack:** Next 16, React 19, Prisma 6, PostgreSQL 17, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-27-busca-catalogo-design.md`

## Global Constraints

- Preservar todos os filtros; aproximação somente após contagem exata zero.
- Não aproximar SKU, termos com números/pontuação ou até 3 letras.
- Comprimento 4–8: uma edição ou transposição adjacente; 9+: até duas edições.
- Não carregar catálogo ou todos os IDs na aplicação; limite de busca 100 caracteres.
- MINOR 1.5.0 se main continuar 1.4.0; manifestos, rodapés e atualizações coerentes.
- Implementar no worktree; autorização posterior de 27/10 permite abrir PR e integrar. Não publicar nem alterar a instalação operacional.

## Review Focus

- Pontuação e entradas hostis permanecem literais, sem ampliar resultados.
- Unicode decomposto e palavras longas não causam erro nas extensões.
- Resultado exato fora da página impede fallback aproximado.
- Preços sob consulta continuam depois das referências e não entram em faixas.
- Todos os termos continuam obrigatórios mesmo quando só parte exige aproximação.

### Task 1: Consulta e regras de busca

**Files:** criar `src/domain/products/catalog-search.ts`, `src/server/catalog-search.ts`, migração em `prisma/migrations/`; alterar `src/server/storefront.ts`; testar `tests/unit/catalog-search.test.ts` e `tests/integration/catalog-search.test.ts`.

**Interfaces:** `searchTerms(search: string): string[]`; `searchCatalog(collectionId, search, order, page, criteria)` retorna `{ products, total, pages, approximate: boolean }`. A busca vazia mantém o caminho existente.

- [x] Escrever testes de normalização, espaços, termos repetidos, limites e orçamentos de edição; executar e observar falha.
- [x] Implementar segmentação e elegibilidade, mantendo pontuação literal.
- [x] Escrever integração de palavras distribuídas, acentos, transposição, edição, códigos, publicação, coleção, preço, ordenação e paginação; observar falha no comportamento atual.
- [x] Criar migração aditiva unaccent/fuzzystrmatch; aplicar somente no banco de testes.
- [x] Implementar consulta parametrizada, contagens e IDs limitados em snapshot; hidratar a página com seleção pública existente.
- [x] Executar testes até passar; medir buscas quentes num conjunto fictício de 5000 produtos, meta 1 segundo.
- [x] Registrar evidências e commit da consulta.

### Task 2: Orientação e estados da interface

**Files:** alterar `src/app/page.tsx`, `src/components/products/catalog-filter-form.tsx`, `src/components/products/product-catalog.tsx`; testar `tests/unit/catalog-filter-page.test.tsx` e `tests/unit/catalog-navigation.test.tsx`.

**Interfaces:** campo `approximate` da consulta; `catalogContextPath(context, { search: "", page: 1 })` limpa somente busca.

- [x] Escrever teste para aviso acessível de aproximação e ação que remove só busca preservando os demais filtros; observar falha.
- [x] Adicionar ajuda curta, aviso com texto original e orientação sem resultados; preservar navegação e formulário.
- [x] Executar testes de interface e navegação; verificar visualmente em banco fictício separado.
- [x] Registrar evidências e commit da interface.

### Task 3: Versão e entrega verificável

**Files:** `package.json`, `package-lock.json`, `src/lib/releases.ts`; notas desta entrega e testes apropriados.

- [x] Conferir versão de origin/main e incrementar uma vez para 1.5.0; registrar Novidades/Melhorias em português.
- [x] Verificar APP_VERSION nos dois rodapés e `/atualizacoes` para ADMIN e OPERATOR.
- [x] Executar lint, tipos, testes unitários/integrados e build; documentar limites do ambiente.
- [x] Solicitar uma revisão final independente, corrigir problemas importantes com teste vermelho/verde e repetir verificações afetadas.
- [x] Commit final e entrega local; informar que PR, merge e publicação não foram realizados nesta etapa.

Execução direta preservada da autorização anterior; aprovação explícita do desenho e implementação nesta mensagem dispensa nova pausa de planejamento. Auto-revisão: requisitos do desenho cobertos pelas três tarefas; casos do Review Focus pertencem à tarefa 1.
