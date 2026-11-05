# Validação de Produção e Estoque — 1.20.0

## Entrega

Branch `codex/producao-estoque-ux`, baseada em `4360fb7` (main novamente verificada no GitHub ao preparar a PR em 05/11/2026). PR autorizada pelo usuário; sem merge, publicação operacional, migração ou operação no banco publicado.

## Arquivos afetados

- Páginas `src/app/(private)/producao/page.tsx` e `estoque/page.tsx`: contexto de venda, limpeza de filtros, paginação e estados vazios.
- `src/components/admin/operation-results.tsx`: resultados vazios, página fora do intervalo e paginação acessível.
- `src/components/admin/operation-workspace.tsx`: proteção de campos e alterações estruturais ao sair/trocar de ação, reutilizando a proteção de histórico existente.
- `src/components/finance/shared.tsx`: sinal de sucesso do formulário e identificação do botão de saída; submissão, concorrência e chaves de operação mantidas.
- `src/components/production/{order-summary,production-panel,order-detail,finished-panel,delivery-form,order-form,report-form}.tsx`: resumo operacional, navegação, foco, carga, seções, separação entre lista/edição e marcação de alterações estruturais.
- `src/components/stock/{stock-panel,shared,ledger,receipt-form}.tsx`: saldos, navegação, carga, preservação após falha de consulta, unidades/identificações no histórico e proteção de linhas.
- `package.json`, `package-lock.json`, `src/lib/releases.ts`: versão 1.20.0 e notas em português. Rodapés e Atualizações continuam consumindo APP_VERSION.
- Prévia fictícia em `tests/admin-preview.tsx`, `tests/operations-mobile.html` e `tests/fixtures/operations.ts`; testes novos `operation-results`, `operation-workspace`, `operations-order-summary`, `operations-panels` em `tests/unit`.

## Evidências

- Suíte completa de unidades: **211 arquivos / 863 testes passaram**. Executada antes da última rodada de correções da revisão.
- Regressão focada posterior: **13 arquivos / 59 testes passaram**, incluindo reenvio de apontamento/recebimento, estados, quantidades, custos e consistência de versão/login/painel/Atualizações para ADMIN e OPERATOR.
- Após proteção de alterações estruturais e carga: **4 arquivos / 10 testes passaram**. A rodada final dos 13 arquivos / 59 testes também passou; os dois testes dos painéis foram reexecutados após o último ajuste de feedback e passaram.
- Lint completo: passou, sem erros ou avisos. Tipos: passaram, incluindo a validação TypeScript da compilação final.
- `next build --webpack`: concluiu com código 0, compilação e geração das 78 páginas concluídas. Houve aviso preexistente de importação nomeada de JSON em `src/lib/version.ts`.
- Conferência visual real em desktop e em iframes de 390 px, com os componentes do aplicativo e dados fictícios. Temas claro/escuro e visibilidade de ações para operador conferidos.
- Evidências fictícias incluídas na PR: [Produção clara](assets/producao-estoque/producao-desktop-claro.png), [Produção escura](assets/producao-estoque/producao-desktop-escuro.png), [Estoque](assets/producao-estoque/estoque-desktop.png), [telas em 390 px](assets/producao-estoque/producao-estoque-mobile-390.png).
- Revisão independente identificou dois problemas na proteção de rascunhos, ambos corrigidos e cobertos por regressões: mudanças de linhas sem evento de campo e retirada prematura da proteção após ação que mantém o formulário aberto. Rechecagem sem achados materiais.

## Limites

Nenhum teste de integração com banco foi executado: não houve alteração de comandos, servidor, schema ou cálculos. A regressão operacional foi conferida pelas suítes existentes de unidade/UI. A prévia não possui backend e não deve ser usada para simular operações reais.

As dependências da worktree inicialmente usavam vínculos para a unidade X:. O cliente Prisma foi gerado numa cópia local, sem tocar nas dependências operacionais. A compilação padrão Turbopack recusou dependências fora de sua raiz; a alternativa Webpack encontrou referências entre unidades nas fontes e no próprio Next. Cópias locais do Next e das fontes permitiram concluir a compilação Webpack sem alterar a configuração do produto. A execução restrita apresentou falhas de cópia de arquivos de PDF; a repetição autorizada fora dessa restrição concluiu com código 0. O pacote standalone local ainda avisa que três arquivos externos à raiz de rastreamento foram omitidos (`package.json` operacional e dois arquivos de `styled-jsx`). Esse pacote local não foi homologado para implantação; uma futura publicação deve usar dependências instaladas integralmente no ambiente de build, como no fluxo normal do projeto. Nenhuma configuração de build foi alterada para contornar o aviso.

## Conferência antes da PR

Main permanece em 1.19.1 (`4360fb7`); mantido o único incremento desta entrega para 1.20.0. Reexecutados 13 arquivos / 59 testes de UI, operações e versão, todos aprovados. Tipos, lint completo e integridade do diff conferidos novamente antes do commit. Nenhuma alteração em servidor, domínio ou schema. O CI da PR executa instalação limpa, build padrão e suítes de integração em bancos descartáveis; seu resultado deve ser conferido antes de integrar.
