# Revisão administrativa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplificar o administrativo completo, tornando obrigatoriedade, próxima ação e contexto explícitos, com menos rolagem e navegação.

**Architecture:** Compor os componentes shadcn/Radix existentes com primitivas compartilhadas de campo, seção, resumo e ações. Migrar os módulos em etapas que preservam seus DTOs, schemas, estados, handlers e permissões. O formulário mantém uma única região de rolagem; detalhes são progressivos e operações curtas podem usar Sheet.

**Tech Stack:** Next.js 16.4.2, React 19, TypeScript, Tailwind 4, shadcn/Radix, Vitest e Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-24-administrativo-design.md`

## Global Constraints

- Preservar regras, permissões, cálculos, validações, histórico, controle de versão e proteção contra operações duplicadas.
- Não alterar contratos de API, banco, políticas comerciais ou a loja pública como parte desta revisão.
- Não introduzir novos cadastros rápidos ou operações que as APIs atuais não suportam.
- Não trocar preset nem sobrescrever componentes em lote.
- Não usar alturas fixas que cortem conteúdo nem múltiplas regiões de rolagem para o formulário.
- Consultar os guias relevantes em `node_modules/next/dist/docs/` antes de código Next.js; consultar CLI/documentação shadcn antes de implementar seus componentes.
- Preservar alterações preexistentes em scripts, documentação e quaisquer outros arquivos; não incluir essas alterações nos commits desta revisão.
- Usar isolamento conforme a skill using-git-worktrees no início da execução; não copiar segredos ou sobrescrever trabalho existente.

## Review Focus

1. Rascunho incompleto: salvar continua permitido quando o schema parcial permite; teste na tarefa 4.
2. Obrigatoriedade condicional: justificativa só bloqueia nas condições reais; teste na tarefa 5.
3. Erro em seção recolhida: abrir e focar o campo sem perder valores; teste na tarefa 1.
4. Resposta incerta ou conflito: manter dados, versão e chave de operação; testes nas tarefas 4–6.
5. Pouca altura, zoom e teclado: ações não cobrem campos, Sheet devolve foco e usuário alcança todo conteúdo; verificações nas tarefas 2 e 8.

## Estrutura e interfaces compartilhadas

- `src/components/ui/field.tsx`: preservar exportações `Field` e `Notice`, props atuais e associação de rótulo/hint. Acrescentar `error?: string` e indicador textual de `required`; não alterar o nome acessível dos controles existentes desnecessariamente.
- `src/components/admin/form-section.tsx`: `FormSection({ id, title, description?, summary?, collapsible?, defaultOpen?, hasErrors?, children })`; props textuais string, flags boolean e children ReactNode. Obrigatórios pendentes e erros mantêm a seção aberta; o chamador passa `hasErrors` também para pendências obrigatórias.
- `src/components/admin/task-layout.tsx`: `TaskLayout({ children, summary? })`, ambos ReactNode. Renderizar duas colunas somente com largura suficiente; resumo de 280–320 px e sem rolagem interna.
- `src/components/admin/form-actions.tsx`: `FormActions({ children })`; composição de botões existentes e barra aderente com espaço reservado, sem recriar submissão.
- `src/components/admin/form-errors.ts`: `revealAndFocusInvalid(form: HTMLFormElement): void`; abrir seções ancestrais dos controles inválidos, focar primeiro `[aria-invalid="true"]` ou `:invalid` na ordem do DOM. Não criar validação global paralela ao domínio.
- `src/components/admin/context-editor.tsx`: `ContextEditor({ open, onOpenChange, title, description?, dirty?, children })`; props padrão de Sheet controlado, strings e ReactNode. Tratar fechamento com alterações pendentes sem empilhar editores; reusar confirmação existente ou explicitar descarte no próprio painel.
- `src/app/admin.css`: layout, legibilidade e comportamento responsivo restritos ao administrativo. Tokens e composição compartilhados permanecem em `src/app/design.css` e componentes ui.

## Tarefa 1: Campos e seções acessíveis

**Arquivos:** modificar `src/components/ui/field.tsx`; criar `src/components/admin/form-section.tsx`, `src/components/admin/form-errors.ts`, `tests/unit/admin-form-fields.test.tsx`.

- [ ] Ler regras shadcn de forms/composition, executar `npx shadcn@latest info --json` e `npx shadcn@latest docs field accordion`, consultar URLs retornadas; preservar compatibilidade do Field local. Verificar componentes instalados antes de adicionar qualquer um.
- [ ] Escrever testes com jsdom: obrigatório tem indicador “Obrigatório” e semântica required; opcional não recebe indicador; erro possui id ligado por aria-describedby e aria-invalid. Rótulo e hint anteriores continuam acessíveis.
- [ ] Escrever teste de seção inicialmente recolhida com erro: abre, foca controle inválido após tentativa de envio e preserva valor digitado em outro campo.
- [ ] Rodar `npx vitest run tests/unit/admin-form-fields.test.tsx`; confirmar falha pelas interfaces ausentes.
- [ ] Implementar interfaces acima com FieldGroup/FieldSet compatíveis; se adaptar Field upstream, manter as chamadas legadas funcionais e migrar apenas os formulários administrativos.
- [ ] Repetir comando; exigir PASS. Rodar `npx vitest run tests/unit/product-form.test.tsx tests/unit/kit-admin-ui.test.tsx` para detectar regressão de rótulos e campos.
- [ ] Revisar diff e criar commit apenas dos arquivos desta tarefa se o ambiente permitir.

## Tarefa 2: Ambiente de trabalho e edição contextual

**Arquivos:** criar `task-layout.tsx`, `form-actions.tsx`, `context-editor.tsx` no diretório admin; modificar `src/app/admin.css`, `src/components/shell/app-shell.tsx`, `src/components/shell/admin-navigation.tsx`; criar `tests/unit/admin-task-layout.test.tsx`; estender `tests/unit/admin-shell.test.tsx`.

- [ ] Consultar guias locais Next.js de layouts e componentes client; consultar documentação shadcn de sheet, button e card. Manter rotas e base Radix.
- [ ] Escrever testes: Sheet tem título, abre pela ação contextual, fecha retornando foco e impede descarte silencioso de dirty=true. Navegação de OPERATOR não expõe grupos ADMIN.
- [ ] Executar `npx vitest run tests/unit/admin-task-layout.test.tsx tests/unit/admin-shell.test.tsx`; confirmar falha dos comportamentos novos.
- [ ] Implementar interfaces compartilhadas; elevar legibilidade de campos/rótulos para aproximadamente 14 px no desktop, agrupar assuntos com espaçamento e manter controles móveis adequados. Não transformar formulários em regiões com overflow interno.
- [ ] Reexecutar testes até PASS; conferir a barra aderente e o último campo no navegador com 1366×768, 390 px e zoom 200%, inclusive teclado.
- [ ] Revisar diff e criar commit restrito à tarefa.

## Tarefa 3: Produtos, kits e coleções

**Arquivos:** modificar `src/components/products/product-form.tsx`, `product-commercial-editor.tsx`, `product-configuration-editor.tsx`, `product-calculation-fields.tsx`, `src/components/pricing/product-pricing-editor.tsx`, `src/components/kits/kit-form.tsx`, `kit-panel.tsx`, `src/components/collections/collection-form.tsx`, `collection-panel.tsx`; estender `tests/unit/product-form.test.tsx`, `kit-admin-ui.test.tsx`; criar `tests/unit/admin-catalog-ux.test.tsx`.

- [ ] Confrontar campos com schemas de products/kits/collections e dependências dos editores; registrar no teste quais dados a operação exige. Não inferir obrigatoriedade de um valor vazio.
- [ ] Escrever testes para diferenciar finalidade das três descrições e dos preços; obrigatório pendente fica visível; valores de personalização, custos e SEO sobrevivem a recolher/abrir seções. Kits preservam versão e vínculo de produtos.
- [ ] Rodar `npx vitest run tests/unit/product-form.test.tsx tests/unit/kit-admin-ui.test.tsx tests/unit/admin-catalog-ux.test.tsx`; confirmar falha dos comportamentos novos.
- [ ] Migrar para TaskLayout/FormSection/FormActions, mantendo essenciais e ação salvar visíveis, resumo de preço/custo/prévia e detalhes adicionais progressivos. Painel lateral somente para coleção ou edição curta que couber; produto permanece ambiente completo.
- [ ] Reexecutar testes até PASS; comparar primeira dobra e acesso ao salvar com o estado anterior em 1366×768. Não ocultar custos ou dados técnicos necessários para criar produto.
- [ ] Revisar diff e criar commit restrito à tarefa.

## Tarefa 4: Clientes, solicitações, orçamentos e vendas

**Arquivos:** modificar `src/components/customers/customer-form.tsx`, `customer-panel.tsx`, `src/components/catalog-requests/request-detail.tsx`, `request-quote-form.tsx`, `src/components/commerce/quote-form.tsx`, `document-items.tsx`, `quote-detail.tsx`, `sale-detail.tsx`, `sale-panel.tsx`, `quote-panel.tsx`; estender `tests/unit/catalog-request-admin-ui.test.tsx`, `kit-quote-ui.test.tsx`; criar `tests/unit/admin-commerce-ux.test.tsx`.

- [ ] Ler schemas completos e parciais em commerce e regras de transição em servidor; distinguir Salvar rascunho de confirmar. Conferir componentes internos de arte e checkout nos detalhes para manter seus fluxos acessíveis.
- [ ] Escrever testes: rascunho incompleto permitido; confirmação indica pendências reais; resumo de total acompanha desconto/frete; conflito mantém notas e itens; edição curta de cliente retorna à lista com contexto preservado.
- [ ] Rodar `npx vitest run tests/unit/admin-commerce-ux.test.tsx tests/unit/catalog-request-admin-ui.test.tsx tests/unit/kit-quote-ui.test.tsx`; confirmar falha dos comportamentos novos.
- [ ] Compor cliente/itens e resumo na mesma tarefa; agrupar condições e observações sem separar em muitas abas; ações com verbo/objeto e ações permitidas por situação. Preservar controles de custos e revisão dos descontos de kits.
- [ ] Rodar os testes até PASS e `npx vitest run tests/unit/art-team-panel.test.tsx`; revisar navegação, permissões e ausência de novos efeitos externos.
- [ ] Revisar diff e criar commit restrito à tarefa.

## Tarefa 5: Produção, planejamento e estoque

**Arquivos:** modificar `src/components/production/order-detail.tsx`, `order-form.tsx`, `report-form.tsx`, `correction-form.tsx`, `delivery-form.tsx`, `shared.tsx`, `production-panel.tsx`, `src/components/planning/planning-panel.tsx`, `calendar-form.tsx`, `batch-form.tsx`, `src/components/stock/stock-panel.tsx`, `item-form.tsx`, `receipt-form.tsx`, `movement-form.tsx`, `reservation-form.tsx`; criar `tests/unit/admin-operations-ux.test.tsx`.

- [ ] Ler regras production/planning/stock e o uso compartilhado de ActionForm; mapear ações por situação sem substituir comandos de domínio por rótulos imprecisos.
- [ ] Escrever testes: justificativa condicional acompanha regra de falha/correção/data anterior; erro revela campo; envio duplo não duplica operação; resposta incerta reutiliza chave e conserva valores; saldo/quantidades permanecem contextualizados.
- [ ] Rodar `npx vitest run tests/unit/admin-operations-ux.test.tsx`; confirmar falha dos comportamentos novos.
- [ ] Migrar composição para primitivas comuns, destacar tarefa frequente permitida e agrupar demais ações; manter reservas, conciliação, histórico e medições disponíveis. Planejamento mantém calendário e seleção atuais; estoque explicita efeito real da operação.
- [ ] Reexecutar teste até PASS e os testes existentes encontrados com `rg --files tests/unit | rg 'production|planning|stock'`; conferir ordem longa com múltiplos itens e resumo sem sobreposição.
- [ ] Revisar diff e criar commit restrito à tarefa.

## Tarefa 6: Financeiro, calculadora e rentabilidade

**Arquivos:** modificar `src/components/finance/shared.tsx`, `entry-form.tsx`, `settlement-form.tsx`, `transfer-form.tsx`, `entry-panel.tsx`, `movement-panel.tsx`, `account-panel.tsx`, `category-panel.tsx`, `finance-dashboard.tsx`, `src/components/pricing/calculator-workspace.tsx`, `batch-pricing-form.tsx`, `src/components/calculator/calculator-form.tsx`, `src/components/profitability/workspace.tsx`, `revision-form.tsx`, `detail.tsx`; criar `tests/unit/admin-finance-ux.test.tsx`.

- [ ] Ler schemas e testes existentes de finance/pricing/profitability; preservar dinheiro como string decimal, idempotência e modos de cálculo existentes.
- [ ] Escrever testes: categoria/conta obrigatórias conforme operação; campos opcionais não bloqueiam; conflito/erro conserva payload; valores e resultado não mudam ao recolher detalhes; submissão única preservada pelo ActionForm compartilhado.
- [ ] Rodar `npx vitest run tests/unit/admin-finance-ux.test.tsx`; confirmar falha dos comportamentos novos.
- [ ] Integrar seção/resumo/ações comuns, explicar lançamento versus movimentação sem renomear conceitos de forma inconsistente, manter parâmetros avançados e históricos acessíveis. Não alterar fórmulas nem totais.
- [ ] Reexecutar teste até PASS e testes existentes encontrados com `rg --files tests/unit | rg 'finance|pricing|profitability|calculator'`; repetir teste de operações da tarefa 5 pelo impacto do shared ActionForm.
- [ ] Revisar diff e criar commit restrito à tarefa.

## Tarefa 7: Configurações, conta e visão inicial

**Arquivos:** modificar `src/components/settings/settings-panel.tsx`, `record-editor.tsx`, `appearance-panel.tsx`, `appearance-colors.tsx`, `store-information-editor.tsx`, `storefront-editor.tsx`, `src/components/pricing/pricing-settings-panel.tsx`, `src/app/(private)/dashboard/page.tsx`, `src/app/(private)/conta/page.tsx`; criar `tests/unit/admin-settings-ux.test.tsx`.

- [ ] Ler arquivos de página e componentes usados pela conta antes de alterar; incluir os componentes reais no diff da tarefa. Manter edição de configurações da loja restrita ao administrativo sem redesenhar loja pública.
- [ ] Escrever testes: ações Adicionar material/Adicionar impressora são identificáveis; senha inicial exigida apenas na criação, redefinição preserva suas regras; operador não vê ações administrativas; alterações sem salvar não desaparecem em troca contextual.
- [ ] Rodar `npx vitest run tests/unit/admin-settings-ux.test.tsx`; confirmar falha dos comportamentos novos.
- [ ] Migrar composição e obrigatoriedade, manter abas de assuntos independentes; destacar tarefas e pendências já disponíveis no dashboard sem novos cálculos ou consultas abrangentes desnecessárias.
- [ ] Reexecutar teste até PASS e `npx vitest run tests/unit/dashboard.test.ts tests/unit/admin-shell.test.tsx`; conferir identidade e tema claro/escuro.
- [ ] Revisar diff e criar commit restrito à tarefa.

## Tarefa 8: Verificação transversal e revisão final

**Arquivos:** criar `docs/superpowers/reviews/2026-10-24-administrativo-ux.md`; ajustar apenas defeitos demonstrados nos arquivos das tarefas anteriores.

- [ ] Executar `npm run typecheck`, `npm run lint`, `npm run test:unit`; exigir código de saída 0 ou identificar claramente falhas preexistentes antes de qualquer alegação de conclusão. Rodar integrações relevantes quando banco/fixtures estiverem disponíveis; registrar limitações reais.
- [ ] Verificar navegador com dados locais em 1366×768, 1920×1080, 390 px e zoom 200%; incluir teclado, foco após erro, diálogos, tema e perfis ADMIN/OPERATOR. Não executar operações em serviços externos.
- [ ] Registrar antes/depois observável para produto, orçamento, apontamento, estoque e lançamento: acesso aos essenciais e salvar, rolagem e mudanças de contexto. Não atribuir métricas sem medição.
- [ ] Conferir inventário de todas as páginas privadas e editores internos (incluindo arte/checkout embutidos): nenhum obrigatório sem indicador, campo oculto por erro, ação encoberta ou dado removido; conferir lista longa com até os limites aceitos pelo schema.
- [ ] Revisar alterações completas com skill requesting-code-review e corrigir achados relevantes. Não concluir pela aprovação de testes isolados.
- [ ] Registrar evidências e limitações no relatório, rever git diff para excluir alterações preexistentes e concluir integração conforme skill finishing-a-development-branch. Não publicar nem fazer merge sem autorização aplicável.

## Autorrevisão do plano

Cobertura: tarefas 1–2 implementam padrões globais; 3–7 cobrem todos os grupos da especificação; 8 verifica rotas e fluxos auxiliares. Interfaces novas são definidas antes das tarefas consumidoras; handlers e schemas existentes continuam autoridade. Os cinco riscos de Review Focus têm testes ou verificação explícitos. A execução deve manter checkboxes e evidências atualizados, sem marcar módulos como concluídos por ajustes globais de CSS apenas.
