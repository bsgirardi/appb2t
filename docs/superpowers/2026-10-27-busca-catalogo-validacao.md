# Validação da busca do catálogo — 1.5.0

Implementação no ramo `codex/busca-catalogo`, a partir de main 1.4.0 (`a7ad9e9`). Desenho aprovado em `specs/2026-10-27-busca-catalogo-design.md`. A implementação foi entregue localmente antes da autorização posterior para abrir a PR e integrar, em 27/10/2026. A publicação continua pendente por solicitação do usuário; a instalação operacional permanece na 1.4.0.

## Comportamento verificado

- Todas as palavras em qualquer ordem, com acentos e caixa ignorados em nome, código e descrição. Caracteres especiais são literais.
- Somente após contagem exata global zero, aproximação conservadora nas palavras do nome. Todos os termos e filtros permanecem obrigatórios.
- Uma edição ou transposição adjacente em palavras de 4–8 letras; até duas edições a partir de 9. Termos curtos, números, pontuação e o campo SKU não recebem aproximação.
- Contagem, página, ordenação e hidratação pública no mesmo snapshot. A aplicação recebe apenas os IDs da página, até 12.
- Categorias inativas e produtos não publicados não aparecem. Preços sob consulta ficam depois das referências e fora de faixas de preço.
- Aviso acessível, ajuda de busca e orientação sem resultados; ação de remover somente a busca preserva os outros critérios e reinicia a paginação.
- Manifestos sincronizados, rodapés de login e painel com APP_VERSION, histórico em português e página de atualizações verificada para ADMIN e OPERATOR.

## Evidências

Ambiente: Windows, Node 24.19.0, PostgreSQL 17 em Docker, Prisma 6.19.3, Next 16.4.2. Somente bancos fictícios de teste e demonstração.

| Verificação | Resultado |
| --- | --- |
| Unitários completos, em lotes para contornar limitação do executor no Windows | 531 testes em 134 arquivos aprovados |
| Integrados completos, `vitest run tests/integration --pool=forks` | 304 testes em 123 arquivos aprovados |
| Foco de interface, navegação, regras e versões | 21 testes aprovados |
| Lint, tipos e compilação de produção | Aprovados |
| Migração aditiva das extensões | Aplicada nos bancos de teste e demonstração |
| Navegador, 1440×1050 e 390×844 | Aviso, formulário, estado vazio e remoção isolada conferidos; sem rolagem horizontal no celular |

A revisão independente encontrou um caso Unicode: 86 ligaturas `ﬃ` viram 258 caracteres após unaccent, excedendo o limite do Levenshtein. O erro foi reproduzido, e a correção passou a proteger os dois argumentos normalizados antes da aproximação. A busca exata continua funcionando nesses casos.

Após a correção, os 11 testes integrados de busca, filtros e vitrine foram repetidos e aprovados, incluindo a regressão Unicode. Uma repetição no banco compartilhado perdeu os 5000 registros fictícios por interferência de outra execução local. Por isso a validação final usou cópias idênticas desses três arquivos e da fixture em `test-results/busca-isolated/`, alterando somente o nome permitido pelo guard do setup para o banco fictício separado. Lint e compilação foram repetidos após a correção.

Benchmark final de consultas quentes com 5000 produtos fictícios: **80 ms** para busca exata, **200 ms** para aproximação e **100 ms** sem resultados. Medição da chamada de catálogo, não do carregamento completo da página; não é garantia de desempenho para qualquer servidor ou volume.

Registros locais em `test-results/busca-full-unit-summary.log`, `busca-full-integration.log`, `busca-isolated-fix-green.log`, `busca-ligature-red.log`, `busca-ligature-green.log`, `busca-review-lint.log` e `busca-review-build.log`. Imagens: `busca-aproximada-desktop.png` e `busca-sem-resultados-mobile.png`. Esses artefatos locais não integram o código publicado.

## Conferência de tarefas antes da integração

- [x] Consulta, migração aditiva, interface e navegação implementadas conforme desenho aprovado.
- [x] Revisão independente tratada, incluindo regressão Unicode.
- [x] Main 1.4.1 incorporada antes da PR; scripts e histórico dessa versão preservados. Esta funcionalidade mantém o incremento MINOR para 1.5.0, sem segundo incremento na mesma PR.
- [x] Após incorporar main: 21 testes focados, 11 integrados de catálogo em banco fictício isolado, lint e compilação de produção aprovados; oito cenários dos scripts de atualização aprovados com comandos simulados, sem publicação real.
- [ ] Publicação operacional, backup e migração de produção: aguardar autorização específica. Nenhum script de publicação foi executado nesta integração.

O acompanhamento local de evolução comercial (`docs/ROADMAP-SELLER.md`) permanece separado: E1–E6 ainda estão pendentes no registro consultado. Nenhuma etapa desse roadmap foi incluída ou marcada como entregue nesta PR.

## Publicação futura

A migração `20261027130000_catalog_search` cria `unaccent` e `fuzzystrmatch` em `public`, sem alterar os dados cadastrados. Antes de publicar: conferir disponibilidade e permissão de instalação das extensões, sua localização em `public`, backup e restauração verificável; aplicar migrações antes de iniciar o código novo. Conferir novamente a versão de main antes do merge. Não criar tags automaticamente.
