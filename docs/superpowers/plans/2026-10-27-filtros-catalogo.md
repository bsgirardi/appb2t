# Filtros comerciais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Execução direta preservada da sessão; desenho aprovado pelo usuário em 27/10/2026. Prosseguir sem novas pausas de planejamento.

**Goal:** Filtrar o catálogo por preço-base e disponibilidade preservando a navegação e rascunhos antigos.

**Architecture:** Validar critérios comerciais em módulo de domínio compartilhado. Estender o contexto existente com campos opcionais; centralizar composição de URLs. O servidor combina os critérios à busca/coleção antes de contar, ordenar e paginar. Formulário GET usa componentes existentes.

**Tech Stack:** Next16.4.2, React19, Zod4, Decimal, Prisma/PostgreSQL e Vitest.

**Spec:** docs/superpowers/specs/2026-10-27-filtros-catalogo-design.md

## Global Constraints

- Faixa inclusiva, campos opcionais, zero válido, até duas casas, vírgula ou ponto sem milhar; máximo Decimal(18,2).
- Com faixa de preço, somente REFERENCE. Sem faixa, preservar CONSULT. Disponibilidade usa os quatro estados existentes.
- Não alterar operação publicada, documentos, preços, mínimos ou permissões. Sem migração.
- Contexto opcional compatível com drafts antigos. Não aceitar retorno arbitrário.
- Alterações de filtro reiniciam página; paginação e retorno preservam critérios. URLs canônicas/compartilhadas do produto limpas.

## Review Focus

- Zero e centavos próximos ao limite máximo não podem perder precisão por Number.
- URL inválida não pode executar uma listagem ampla silenciosa; preservar entrada para correção.
- Consulta + faixa gera resultado vazio explicado, sem preço fictício.
- Link de edição deve usar & mesmo quando apenas filtros novos criam a query.
- Trocar coleção/busca/remover marcador deve preservar os demais critérios, inclusive após editar item salvo.

### Task1: Critérios, URLs e servidor

**Files:** novo src/domain/products/catalog-commercial-filters.ts; catalog-navigation.ts; inquiry.ts; server/storefront.ts.
**Interfaces:** CatalogCommercialFilters {priceMin?,priceMax?,availability?} opcionais string; catalogCommercialErrors(filters) e parseCatalogCommercialFilters(filters), retornando decimais canônicos/estado validado; catalogContextPath(context, overrides?) preserva critérios; catalogPage recebe filtros opcionais no quinto argumento.

- [x] RED: testes unitários de moeda/erros/URLs e compatibilidade de contexto; integração combina busca/coleção/disponibilidade/faixa, limites inclusivos, CONSULT/inativos/paginação.
- [x] Implementar validação exata, novos campos opcionais e filtragem antes de contagem/paginação. Servidor recusa filtros inválidos.
- [x] GREEN: testes específicos com PostgreSQL exclusivamente em b2t_test.

### Task2: Formulário e continuidade

**Files:** novo components/products/catalog-filter-form.tsx; app/page.tsx; store-collections.tsx; storefront-shell.tsx; página de produto; inquiry-panel.tsx; product-contact.tsx.
**Interfaces:** formulário recebe contexto e coleções; cabeçalho recebe critérios opcionais; links consomem catalogContextPath e helper de edição seguro.

- [x] RED: testes de formulário GET, erros preservados/sem listagem, marcadores, cabeçalho e edição com filtros novos.
- [x] Implementar filtros combinados, rótulos/ajudas, mensagens de faixa e erros; preservar contexto em todos os consumidores, sem efeitos de estado desnecessários.
- [x] GREEN: regressões dos fluxos alterados e ausência de filtros comerciais na URL canônica do produto.

### Task3: Validação e entrega

**Files:** manifestos, releases.ts, testes e este plano.

- [x] Conferir main e preparar 1.4.0 uma vez, com notas em português e manifestos sincronizados.
- [x] Unidade/interface em grupos, integração forks, versão/rodapés, tipagem, lint e build; não regenerar Prisma em paralelo ao runtime.
- [x] Navegador real em banco separado com dados fictícios, 320/390/1440, claro/escuro; operação localhost:3000 preservada.
- [x] Uma revisão independente final, corrigindo achados importantes com regressões.
- [x] Registrar resultado e commit local. Sem merge/publicação desta etapa sem nova instrução.

## Resultado — 27/10/2026

- Implementados formulário GET combinado, faixa inclusiva de preço-base, disponibilidade e marcadores removíveis. Contexto acompanha categorias, cabeçalho, paginação, produtos e edição da lista; formatos anteriores permanecem aceitos. Sem migração e sem escrita no banco operacional.
- Revisão independente final identificou espaços nos limites causando exceção no Decimal. Regressão observada RED e corrigida GREEN; validação e comparação agora usam o mesmo texto normalizado. Nenhum outro achado concreto.
- 520 testes de unidade/interface em 132 arquivos, 297 de integração em 122 arquivos e 3 verificações de manifestos, histórico e componentes reais de login/painel/atualizações: 820 aprovados. Integrações executadas somente em b2t_test.
- O executor Vitest repetiu erro interno de recursão em um grupo de 25 e depois de 5 arquivos. Os arquivos restantes foram concluídos individualmente; todos os 132 arquivos unitários têm resumo final aprovado. Não foi contabilizado processo incompleto.
- Typecheck e lint aprovados. Build Next/Turbopack de produção aprovado após a correção final. Prisma já gerado para o esquema idêntico à versão1.3.0; não regenerado em paralelo ao runtime.
- Navegador real Next em porta3118 e banco separado b2t_filtros_preview, com dados fictícios: 13 resultados na faixa exata20,50; segunda página preservada; produto, canônica limpa, inclusão na lista e link de edição com todos os filtros; faixa invertida mostra erro sem listagem; mínimo0 exclui preço sob consulta e sua remoção o recupera; formulário e marcadores preservam os demais critérios. Temas claro/escuro e larguras320/390/1440 sem extravasamento da página. Rolagem própria de categorias mantida.
- Evidências locais em test-results/filtros-*.png e logs correspondentes. Prévia encerrada e arquivo Next gerado restaurado. A instalação operacional localhost:3000 continua exibindo1.3.0; dados e chaves não alterados nesta etapa.
- origin/main confirmado em1.3.0. Entrega preparada em1.4.0, manifestos/histórico sincronizados e notas anteriores preservadas. Commit local em codex/filtros-catalogo; sem PR, merge, tag ou publicação desta etapa.

## Homologação da PR #16 — 27/10/2026

- Conferido o head8308356 contra mainb9f59b6: PR aberta e sem conflitos. Nenhuma autorização de merge/publicação usada nesta etapa.
- Nova revisão independente encontrou um P2: resultado vazio de preço/disponibilidade reutilizava a mensagem de catálogo ou coleção não publicados. Causa localizada no componente ProductCatalog, que considerava somente busca e coleção.
- Três cenários comerciais falharam antes da correção; passaram depois. A mensagem de catálogo realmente vazio, sem filtros, permanece preservada. Acrescentadas4 regressões e nota de Correções na mesma versão1.4.0, sem novo incremento por ser a mesma PR.
- Revalidação direcionada:37 testes de unidade/interface/versão em6 arquivos e4 de integração em2 arquivos, todos aprovados. A suíte completa820 foi executada na implementação original; não é apresentada como uma nova execução completa após esta correção localizada.
- Navegador real na prévia fictícia: faixa inválida editável; faixa0–0 informa nenhum produto encontrado e oferece acesso ao catálogo; combinação retornou13 itens e manteve filtros na segunda página e no link de produto. Dimensões320/390/1440 e temas claro/escuro conferidos. Captura da correção: test-results/homologacao16-vazio-desktop.png.
- Verificações finais de tipagem, lint e build registradas em test-results/homologacao16-*.log. Prévia encerrada; operação permanece1.3.0, sem mudança de banco ou chaves. Atualização da PR mantém merge/publicação pendentes.
