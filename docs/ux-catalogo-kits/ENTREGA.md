# Catálogo e Kits — entrega e validação

## Escopo

PR #43, branch remota `codex/catalogo-kits-ux`, reconciliada em 06/11/2026 com main 1.21.1 (`4786a8b`) e a resolução da PR #42 (`54aad9f`, documental 1.21.2). Versão de funcionalidade 1.22.0; preservadas as notas de distribuição 1.21.0/1.21.1 e o histórico anterior. Ordem proposta: #42 e depois #43, reconferindo main antes de cada integração. Nenhum merge, Release, deploy ou banco operacional alterado.

- Produtos e kits têm busca por nome (ignorando acentos), estado e limpeza dos filtros, com contagem e contexto na URL. O histórico e o retorno da edição preservam os critérios aplicados. Outros parâmetros da URL são preservados.
- As consultas administrativas existentes carregam o conjunto completo; não há requisição por tecla, paginação fictícia ou mudança de autorização/contrato.
- Cadastro vazio e busca sem resultados usam Empty. Atualização falha mantém os registros e permite tentar novamente pelo mesmo botão.
- Kits agrupam identificação/publicação, composição e condições; o resumo distingue publicação de rascunho e mostra produtos permitidos/faixas. Salvar não registra vendas nem baixa estoque.
- Produtos reutilizam resumo de custos e seções existentes; FormActions mantém o salvamento acessível. Ativo/inativo permanece distinto da disponibilidade comercial.
- Proteção compartilhada contra descarte cobre dados, galeria (ordem/inclusão/remoção), composição e ficha de custo ainda não aplicada. Erro/conflito mantém rascunhos e expectedVersion continua obrigatório na atualização. Kits bloqueiam campos durante gravação.

## Arquivos

- `src/components/admin/catalog-filters.tsx`: coleção carregada, contexto URL, controles e estados vazios compartilhados.
- `src/components/products/product-panel.tsx` e `product-form.tsx`: integração e proteção de edição.
- `src/components/kits/kit-panel.tsx` e `kit-form.tsx`: integração, seções, resumo e proteção.
- `src/components/pricing/batch-pricing-form.tsx` e `product-pricing-editor.tsx`: propagação opcional do rascunho local e bloqueio de operações assíncronas concorrentes; motores e preços preservados.
- `src/app/design.css`: grid dos filtros com coluna única abaixo de 760 px.
- `tests/unit/catalog-admin-ux.test.tsx` e ajuste de confirmação em `kit-admin-ui.test.tsx`.
- `tests/catalog-admin-preview*`: prévia independente com dados fictícios, sem backend/sessão/banco operacional.

## Revisão e regressões

Revisão independente encontrou o rascunho interno de custos fora da proteção e duas corridas assíncronas: abertura duplicada e cancelamento durante aplicação. Corrigidos com trava de abertura, bloqueio de cancelamento durante aplicação e propagação do estado pendente. Testes reproduziram as falhas antes das correções e passaram depois. Também foi reproduzida e corrigida a possibilidade de digitar no kit durante salvamento.

Os 15 testes novos cobrem filtros combinados e acentos, limpar/histórico/contexto de edição, falha de atualização, descarte recusado, galeria reordenada, composição, falha/conflito e liberação após salvar, rascunho de custo não aplicado e operações em andamento. A revisão não substitui aceite humano.

## Verificações anteriores — 05/11/2026

- Primeira suíte unitária completa: 877 testes em 213 arquivos aprovados, antes das últimas correções assíncronas.
- Rodada final completa: **880 testes unitários em 213 arquivos aprovados**, após as correções da revisão. Casos focados: **34 testes em 6 arquivos aprovados**, incluindo 15 casos novos e a consistência de versão/rodapés/Atualizações.
- TypeScript, lint completo e build Next finais aprovados. Build de entrega repetido após o ajuste de layout dos filtros; saída final confirma todas as rotas dinâmicas compiladas.
- `git diff --check` aprovado.

## Reconciliação e validação — 06/11/2026

- PR #42: três testes de versão aprovados após resolução; manifestos, histórico, login, rodapé administrativo e Atualizações para ADMIN/OPERATOR em 1.21.2.
- PR #43: conflitos documentais resolvidos preservando o desenho aprovado e os registros dos dois lados. Main #44/#45 preservada, sem alterações funcionais nos scripts de distribuição.
- Rodada inicial após resolução: 880 testes em 213 arquivos, 33 focados em cinco arquivos, TypeScript, lint e build de produção aprovados. Esses resultados são desta sessão, separados dos anteriores.
- Revisão independente encontrou perda de foco ao aplicar filtros: a chave do formulário desmontava o campo/botão ativo. Duas regressões falharam com o código anterior e passaram após preservar o formulário, sincronizar os controles diretamente com a URL sem remontagem e devolver o foco à busca ao limpar. Arquivo focado: 17 testes aprovados. A regressão também confirmou a seleção de estado após aplicar; sincronização ajustada e verificada com os mesmos casos.
- Rodada final após sincronização do seletor: **882 testes unitários em 213 arquivos aprovados**; TypeScript, lint e build de produção novamente aprovados. PR #42: nove checks aprovados no commit 54aad9f.
- Prévia permite escolher porta via PORT; usada 4327, exclusivamente com fixtures desta worktree.

## Validação visual e limite

Conferência retomada após o usuário cancelar manualmente a confirmação nativa. Produtos e Kits renderizados em desktop 1280 px e celular 390 px, nos temas claro e escuro. Conferidos editor de Produtos com galeria aberta, custos e resumo financeiro; editor de Kits com composição, faixas abertas, resumo antes de salvar e ações durante a rolagem. Sem transbordamento horizontal nos editores móveis (largura 390, scrollWidth 375).

Apresentação de OPERATOR conferida nas listas e editores de Produtos e Kits. No Kit, Tab do nome alcança descrição e Tab do percentual alcança Remover desconto com foco visível. Aplicar busca por Enter mantém foco na busca; limpar também retorna à busca, confirmando no navegador a correção testada. Retorno sem mudanças fecha o editor normalmente.

Limite específico: a confirmação nativa de descarte foi cancelada manualmente pelo usuário, mas a preservação dos campos após essa recusa não foi reinspecionada na aba anterior, encerrada ao final do turno. Não repetir a alegação como teste automático no navegador. A proteção de campos, galeria, composição e ficha de custo não aplicada está coberta pelos testes de componentes. A prévia não executa API, sessão autenticada nem banco; não é homologação operacional. Não foram encontrados novos problemas visuais na rodada retomada. PR pronta para revisão, mantendo este limite explícito.

CI do código reconciliado 6963ce2: nove checks aprovados, incluindo as suítes de integração remotas existentes. O registro documental posterior exige acompanhar o novo SHA antes do merge; não reapresentar a CI anterior como resultado do SHA seguinte.

Prévia reproduzível sem backend/sessão/banco: PowerShell, definir PORT=4327 e executar node tests/catalog-admin-preview-server.mjs; abrir /tests/catalog-admin-preview.html, ?view=kits e &role=OPERATOR. O breadcrumb da prévia usa o adapter fixo /produtos; não representa o roteamento Next autenticado.

Sem schema ou permissões alterados e sem testes no banco operacional. Integrações de banco não repetidas localmente; consultar CI separadamente. Merge, Release de distribuição e implantação continuam operações distintas e sem execução nesta tarefa.
