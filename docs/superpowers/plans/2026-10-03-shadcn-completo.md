# Adoção completa de shadcn — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. A escolha do método depende da revisão do usuário.

**Goal:** migrar os padrões de interface da B2T para shadcn/Tailwind e revisar todas as telas sem regressão funcional.

**Architecture:** biblioteca local em `src/components/ui`, tokens semânticos por contexto e migração progressiva dos consumidores. Field e Notice preservam seus contratos como adaptadores. Regras de negócio, persistência e endpoints permanecem existentes.

**Tech Stack:** Next.js 16.3.6, React 19.3, TypeScript 6, Tailwind 4, shadcn new-york, Prisma 6.19.3, Vitest. Confirmar versões resolvidas no lockfile antes de instalar primitivas.

**Spec:** `docs/superpowers/specs/2026-10-03-shadcn-completo-design.md` — aprovada pelo usuário.

## Estado da execução — 04/10/2026

As seis tarefas foram concluídas. Os checklists abaixo preservam o roteiro original; o registro dos resultados e das exceções está em [REVISAO-SHADCN.md](../../identidade/REVISAO-SHADCN.md). A última validação registrou 139 testes unitários, 72 integrações no Linux, tipos, lint e build aprovados, além de 192 capturas de páginas e 15 de interações/fixtures.

Limitações registradas: três testes de concorrência apresentaram timeout no Windows; a revisão independente foi interrompida por falta de créditos, e o fechamento foi conferido pelo implementador. Em 04/10/2026, o usuário autorizou os commits da entrega acumulada, separados em catálogo/regras, interface e documentação. A prévia usa a porta 3100. Publicação externa e atualização da porta 3000 continuam fora do escopo.

## Global Constraints

- Preservar logo, mascote, Poppins e paleta documentados em `docs/identidade/IDENTIDADE-B2T.md`.
- Administração: lateral de referência 216 px, cartões com preenchimento de 16 px, campos de 36 px e ações de pelo menos 34 px no desktop. No celular, campos e ações com pelo menos 44 px. Manter cores e logo configurados em Aparência.
- Sem migração de banco, mudança de endpoints ou novas funcionalidades comerciais.
- Não adicionar React Hook Form ou alterar esquemas de validação por causa da migração visual.
- Sem introduzir Preflight global durante a migração.
- Preservar todo trabalho anterior no checkout; não executar limpeza ou reset amplo.
- Revisão local usa o ambiente isolado da porta 3100. Não inclui publicação externa, domínio, configuração comercial, preenchimento de catálogo ou alteração da instalação da porta 3000.
- Consultar os guias Next instalados relevantes antes de alterar código. Buscar componentes no registro oficial shadcn; preservar licença e registrar adaptações.
- Esforço baixo por padrão; médio para componentes compartilhados, fronteiras client, formulários, acessibilidade interativa e financeiro.

## Review Focus

1. Campos em fieldset disabled: Checkbox e seleção devem manter submissão/validação nativa esperada. Cobertura: tarefa 1.
2. Sheet/Dialog em portal: tema correto e foco devolvido ao acionador após Escape. Cobertura: tarefas 1 e 2, incluindo navegador.
3. Operação financeira reenviada ou com falha: sem duplicação e sem gerar nova intenção indevidamente. Cobertura: tarefa 4.
4. Nomes extensos, valores grandes e textos de erro: nenhum corte de conteúdo ou overflow da página a 320/390 px. Cobertura: tarefas 3 e 6.
5. Impressão e tema escuro: documento comercial legível, sem navegação, preservando valores. Cobertura: tarefas 3 e 6.

## Preparação da execução

- [ ] Registrar branch, arquivos alterados, staged/unstaged e untracked; comparar com o inventário desta conversa. O histórico do checkout não contém sozinho a interface atual.
- [ ] Consultar using-git-worktrees no início da execução. Se usar isolamento, transportar uma cópia completa e verificada do estado atual relevante; nunca começar apenas de HEAD perdendo as entregas anteriores. Não mover/remover o checkout original nem copiar segredos para commits.
- [ ] Executar `npm run typecheck`, `npm run lint` e `npm run test:unit` como baseline; registrar falhas preexistentes antes de atribuí-las à migração.
- [ ] Criar `docs/identidade/REVISAO-SHADCN.md` com inventário de rotas, controles, CSS substituído e exceções. Enumerar rotas com `rg --files src/app` e consumidores com `rg -n '<(input|select|textarea|button|table|details)\b' src/components src/app`.

## Tarefa 1 — Biblioteca, tema e contratos de formulário

**Esforço:** médio.

**Arquivos:** criar em `src/components/ui/`: `input.tsx`, `label.tsx`, `textarea.tsx`, `native-select.tsx`, `checkbox.tsx`, `card.tsx`, `badge.tsx`, `alert.tsx`, `separator.tsx`, `skeleton.tsx`, `table.tsx`, `tabs.tsx`, `breadcrumb.tsx`, `pagination.tsx`, `sheet.tsx`, `sidebar.tsx`, `accordion.tsx`; dependências auxiliares apenas se exigidas pelos componentes. Adicionar `dialog.tsx`/`alert-dialog.tsx` somente ao mapear consumidor real. Modificar `field.tsx`, `button.tsx`, `src/app/design.css`, `src/app/admin.css`, `components.json`, dependências e licença quando necessário. Criar `tests/unit/ui-contracts.test.tsx`.

**Interfaces:** componentes seguem exports e props oficiais; Input/NativeSelect/Textarea aceitam props nativas. `Field(props: InputHTMLAttributes<HTMLInputElement> & {label: string; hint?: string; suffix?: ReactNode})` e `Notice({children, kind})` mantêm API pública. Contextos de tema cobrem também portais; não depender exclusivamente de ancestral `.admin-ui`/`.storefront` para conteúdo portado.

- [ ] Escrever testes `field_preserves_formdata_and_descriptions`, `native_select_preserves_required_empty_value`, `checkbox_respects_fieldset_disabled_and_formdata` e `notice_keeps_live_roles`. Asserções: valores presentes em FormData, checkbox desmarcado omitido, desabilitado omitido, select obrigatório vazio inválido, hint e descrição externa associados ao campo, erro com role alert e informação com role status.
- [ ] Executar `npx vitest run tests/unit/ui-contracts.test.tsx`; registrar falhas referentes aos contratos novos, sem criar testes artificiais para exigir nomes de classes.
- [ ] Adicionar componentes oficiais e adaptar Field/Notice. Manter sufixos sem sobreposição e tipos date/number/file/color. Definir tokens completos da especificação, inclusive sidebar/popover, e estilo-base explícito dos controles.
- [ ] Executar testes de contratos, `tests/unit/theme.test.tsx`, tipos e lint; corrigir regressões antes de migrar consumidores.

## Tarefa 2 — Estrutura, acesso e produção

**Esforço:** médio nas interações; baixo na composição.

**Arquivos:** `src/components/shell/app-shell.tsx`, `src/components/auth-form.tsx`, `src/components/logout-button.tsx`, `src/app/login/page.tsx`, `src/app/(private)/conta/page.tsx`, `src/components/calculator/calculator-form.tsx`, `cost-breakdown.tsx`, `src/components/settings/{settings-panel,record-editor,appearance-panel,storefront-editor,store-information-editor}.tsx`.

**Interfaces:** consumir biblioteca da tarefa 1; preservar props Actor/identity, APIs de formulário e seleção de abas existente. Sidebar/Sheet recebem os mesmos destinos e regras por papel.

- [ ] Estender `tests/unit/admin-shell.test.tsx` para abrir menu, navegar, fechar por Escape e devolver foco ao acionador; assertar ausência de Financeiro/Aparência/Configurações para OPERATOR. Estender `settings-ui.test.tsx` com seleção de aba por teclado e conteúdo correspondente.
- [ ] Rodar esses testes antes da mudança, identificando os comportamentos ainda não atendidos.
- [ ] Migrar Sidebar/Sheet, login/conta, abas de configuração e controles de produção. Preservar foco, rótulos, edição pendente, upload de logo e temas configurados. Não introduzir modal onde editor inline já atende.
- [ ] Rodar `admin-shell`, `logout`, `settings-ui`, `calculator-ui`, `appearance-ui` e `merchandising` com Vitest; executar tipos. Conferir menu móvel e tema dos portais no navegador antes de prosseguir.

## Tarefa 3 — Cadastros e comercial

**Esforço:** baixo para tabelas/cards; médio para formulários, upload e impressão.

**Arquivos:** `src/components/products/{product-form,product-panel,product-gallery-editor,product-commercial-editor,product-calculation-fields}.tsx`, `src/components/collections/{collection-form,collection-panel}.tsx`, `src/components/customers/{customer-form,customer-panel}.tsx`, todos os consumidores em `src/components/commerce`. Testes existentes de products, gallery, collections, customers, quotes e sales.

**Interfaces:** consumir Input/NativeSelect/Checkbox/Table/Card/Badge/Alert/Pagination mantendo payloads, callbacks de salvar/cancelar e versões. Impressão mantém HTML semântico e CSS próprio.

- [ ] Revisar testes existentes de formulários e acrescentar apenas lacunas de comportamento: checkbox ativo e coleções selecionadas geram o mesmo payload; seleção de arquivo permanece múltipla onde prevista; cancelar edição não salva; navegação de página conserva filtros.
- [ ] Executar os testes modificados para documentar o estado anterior.
- [ ] Migrar componentes de cadastro e comércio, preservando uploads, opções de produto, parcelas, totais e ações por estado. Migrar confirmações existentes para Alert Dialog somente quando isso preservar a semântica da operação.
- [ ] Rodar `product-form`, `product-panel`, `product-gallery`, `collections-ui`, `customers-ui`, `quote-ui` e `sales-ui`. No banco de testes isolado, rodar integrações `products`, `collections`, `customers`, `quotes`, `sales` e `commerce-http`.
- [ ] Conferir impressão de orçamento com fixture, nome longo e valores monetários, nos temas claro/escuro. Registrar que valores e informações comerciais não mudaram; navegação não aparece na impressão.

## Tarefa 4 — Financeiro

**Esforço:** médio.

**Arquivos:** consumidores em `src/components/finance`: `shared.tsx`, `filters.tsx`, `finance-dashboard.tsx`, `cash-flow.tsx`, `account-panel.tsx`, `category-panel.tsx`, `entry-panel.tsx`, `entry-form.tsx`, `movement-panel.tsx`, `settlement-form.tsx`, `transfer-form.tsx`. Testes `tests/unit/finance-ui.test.tsx` e integrações financeiras existentes.

**Interfaces:** `ActionForm` conserva `(FormData, operationKey) => Promise<unknown>`, refs de pendência e identidade da intenção. `Select` local passa a compor NativeSelect sem alterar name/defaultValue/required.

- [ ] Acrescentar em `finance-ui.test.tsx`, se ainda não cobertos: `pending_action_submits_once` e `retry_same_payload_keeps_operation_key`. Assertar uma chamada durante pendência, bloqueio de campos e reutilização da chave após falha com payload idêntico.
- [ ] Executar testes novos antes da migração e usar os contratos como regressão, sem alterar regras já corretas para forçar falha.
- [ ] Migrar campos, filtros, tabelas, cards, badges e paginação. Não modificar domínio financeiro nem tratamento de concorrência para acomodar UI.
- [ ] Rodar `finance-ui`; no banco isolado rodar `finance-http`, `finance-concurrency`, `finance-settlements` e `finance-transfers`. Conferir listagem e estados vazios visualmente; usar testes/fixtures para operações que gravam dados.

## Tarefa 5 — Loja e continuidade visual

**Esforço:** baixo na composição; médio em temas e interações.

**Arquivos:** `src/app/page.tsx`, páginas `src/app/portfolio`, componentes `src/components/products/{storefront-shell,store-welcome,store-collections,storefront-sections,store-information-page,product-catalog,product-carousel,product-contact,inquiry-panel,inquiry-link}.tsx` e `src/app/error.tsx`.

**Interfaces:** os componentes públicos preservam DTOs, URLs e consultas atuais. Accordion substitui FAQ sem mudar disponibilidade da página; Breadcrumb/Pagination usam os mesmos destinos.

- [ ] Estender `store-information.test.tsx` para expandir FAQ por teclado e associar resposta à pergunta. Manter testes de retorno com contexto, galeria, indisponibilidade e invalidação de orçamento preparado.
- [ ] Executar testes afetados antes da migração.
- [ ] Migrar controles e padrões públicos; reduzir altura do cabeçalho, harmonizar hero com tema escuro e ajustar superfícies dos cards. Preservar arquivos originais de logo/mascote, imagens e regras de orçamento. Não inventar fotos, depoimentos ou políticas comerciais.
- [ ] Rodar `store-information`, `storefront-entry`, `catalog-navigation`, `product-carousel`, `product-catalog`, `inquiry` e `merchandising`; rodar integrações `storefront`, `store-information` e `inquiry` no banco isolado.
- [ ] Conferir home, busca sem resultados, coleção, produto e orçamento em claro/escuro, com navegação por teclado. Não enviar mensagem externa para validar o contato.

## Tarefa 6 — Revisão completa, limpeza e entrega

**Esforço:** médio para cascata; baixo para documentação.

**Arquivos:** `src/app/{globals,theme,storefront,admin,design}.css`, `README.md`, `docs/VALIDACAO.md`, `docs/identidade/{IDENTIDADE-B2T,REVISAO-SHADCN}.md`; capturas em `test-results/shadcn-completo`.

**Interfaces:** consumir componentes e rotas migrados. A matriz de revisão deve identificar rota, papel, estado, tema, largura, resultado e captura; estados não verificados ficam explicitamente pendentes, nunca implicitamente aprovados.

- [ ] Reexecutar inventário de controles e CSS; migrar consumidores restantes e registrar exceções legítimas. Remover regras substituídas somente depois de confirmar que não atendem outro consumidor. Eliminar classes antigas de botão/controle dos componentes migrados.
- [ ] Executar `npm run test:unit`, `npm run typecheck`, `npm run lint`, `git diff --check`; executar integrações afetadas em banco isolado. Critério: saída zero, sem regressões atribuíveis à migração.
- [ ] Gerar build de produção e atualizar somente a aplicação local de validação preservando sua configuração; executar `node scripts/check-catalog-http.mjs` contra a porta 3100.
- [ ] Inspecionar cada rota pública e administrativa a 1366 e 390 px em claro/escuro, incluindo estados disponíveis de vazio, carregamento, erro, preenchido e disabled. Conferir componentes compartilhados e telas extensas a 320 px; tabelas podem rolar internamente, a página não.
- [ ] Testar teclado, foco, Escape, contraste AA, movimento reduzido e impressão. Capturar evidências de tema em portais e nomes/valores longos. Não substituir revisão de tela por inspeção do código.
- [ ] Fazer revisão final dos diffs e da matriz contra a especificação. Corrigir falhas e repetir apenas verificações afetadas pelas correções.
- [ ] Atualizar documentação com cobertura, exceções, dependências e resultados reais. Entregar resumo, prévia e capturas; relatar limites observados. Sem publicação externa.

## Controle de alterações

Checkpoints de Git devem incluir somente alterações próprias e verificadas. Como o checkout contém trabalho anterior ainda não consolidado, não usar `git add .`, `reset --hard` ou commits que capturem silenciosamente mudanças de outras etapas. Arquivos mistos exigem revisão do diff antes de qualquer commit.

## Auto-revisão do plano

Cobertos: biblioteca, todos os grupos de consumidores, temas/portais, contratos nativos, operações financeiras, impressão, remoção de CSS e matriz visual. Cada risco do Review Focus tem etapa de verificação. Não se exige falha artificial em contratos já atendidos nem instalação de componentes sem consumidor. Próximo passo: revisão do plano e escolha do método de execução pelo usuário.
