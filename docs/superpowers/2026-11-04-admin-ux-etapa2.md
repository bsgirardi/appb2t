# Etapa 2 — rotina diária

Entrega local na branch `codex/admin-ux-etapa2`, versão **1.16.0**, baseada em main 1.15.0. Sem merge, push ou publicação em produção.

## Resultado
- Dashboard: indicadores essenciais e pendências acionáveis antes dos gráficos; filtros personalizados identificados e painel mantido aberto quando datas precisam de correção.
- Clientes: filtros aplicados visíveis, limpeza da seleção e paginação que não aplica rascunhos. Novos filtros recebidos pela URL sincronizam os campos, inclusive no histórico do navegador.
- Tabela: documento ou indicação de ausência, situação com Badge e ação de edição identificada por nome para leitores de tela. Estados vazios distinguem primeiro cadastro, filtro sem resultados e página fora dos resultados.
- Formulário: identificação, contato e complementos; resumo dos dados e situação antes de salvar; feedback próximo às ações. Payload, validação e controle de concorrência existentes preservados.
- ContextEditor compartilhado: proteção de recarregamento/saída pelo evento `beforeunload` enquanto há alterações. Confirmação de fechamento e descarte existentes preservadas.

## Arquivos principais
- `src/components/dashboard/dashboard-panel.tsx` e `dashboard-toolbar.tsx`.
- `src/components/customers/customer-panel.tsx` e `customer-form.tsx`.
- `src/components/admin/context-editor.tsx`.
- `package.json`, `package-lock.json` e `src/lib/releases.ts`.
- `tests/unit/daily-workflow.test.tsx` e ajuste de seletor em `dashboard-ui.test.tsx`.

## Verificação
- Testes unitários: **186 arquivos, 759 testes aprovados**.
- Regressões da rotina diária: **8 testes aprovados**, incluindo falha da API com preservação do rascunho e `expectedVersion`, sincronização dos filtros e página vazia com cadastros existentes.
- `npm run typecheck`, `npm run lint` e `npm run build`: aprovados. Após o ajuste final do estado vazio, tipos e lint foram repetidos com sucesso.
- `git diff --check`: aprovado.
- Teste de versão verifica manifestos, histórico, rodapé real do login, rodapé administrativo e `/atualizacoes` para ADMIN e OPERATOR.
- Prévia temporária com componentes e CSS reais, dados fictícios e navegação simulada: 390 × 844 e 1366 × 900, claro/escuro, campos, foco inicial, teclado e Escape com confirmação. Sem expansão horizontal da página; tabelas mantêm rolagem interna.
- Revisão independente identificou o estado vazio de página fora dos resultados; reproduzido em teste e corrigido.

## Limites e integração
- Recorte representativo: dashboard e Clientes. Demais tabelas e formulários não foram redesenhados.
- Sem teste ponta a ponta autenticado com banco real. Prévia visual isolada não valida serviços nem transações; serviços e permissões não foram modificados.
- A confirmação nativa ao sair depende do navegador. O teste automatizado verifica o handler; a prévia verificou a confirmação do editor ao pressionar Escape. `beforeunload` não bloqueia navegação interna SPA pelo histórico.
- A etapa 1 está na worktree `admin-ux-etapa1`, versão 1.15.1, sem integração nesta entrega. Nenhum arquivo de shell, navegação ou CSS global foi alterado aqui. A integração deve preservar ambas as notas e reconciliar manifestos conforme a ordem de merge, consultando novamente main.
- TaskLayout não foi adicionado ao editor de 640 px: uma segunda coluna reduziria a largura dos campos. FormSection e FormActions mantêm o resumo no fluxo do formulário.

## Evidências
Dados inteiramente fictícios; prévia sem o shell da etapa 1.

[Desktop escuro](evidence/admin-ux-etapa2/desktop-escuro.png) · [Celular claro](evidence/admin-ux-etapa2/mobile-claro.png)
