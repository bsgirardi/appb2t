# Orçamentos e Vendas — plano de implementação

> Integração na PR conjunta: por solicitação do usuário em 05/11/2026, as alterações prontas e ainda não commitadas da worktree `d2c8` (`codex/orcamentos-vendas-ux`, base `e046dbb`) foram copiadas para `codex/metas-mensais`, sem modificar a origem. A versão 1.18.1 preparada abaixo não foi publicada: suas notas foram consolidadas na versão única **1.19.0**, junto às metas mensais. O registro abaixo descreve a validação original; a validação integrada consta no relatório de metas.

**Objetivo:** ampliar os padrões administrativos já aprovados para os dois fluxos comerciais.
**Arquitetura:** manter consultas, comandos e regras de domínio; melhorar somente a composição dos painéis e do formulário compartilhado. Reutilizar FilterPanel, FormSection, TaskLayout e FormActions.
**Escopo aprovado:** busca, filtros, paginação, status, seções, resumo, salvamento e proteção de alterações. Sem metas, migrations ou mudanças financeiras.

- [x] Cobrir regressões de filtros no histórico, preservação de parâmetros na paginação e estados vazios distintos.
- [x] Sincronizar formulários de filtro pela URL aplicada, oferecer limpeza e recuperação de páginas fora dos resultados; apresentar status legíveis.
- [x] Testar e proteger cancelamento e saída com alterações, manter dados após falhas e colocar salvar junto ao resumo financeiro.
- [x] Organizar cliente/validade e itens/valores em seções, preservando todos os controles de custos e kits.
- [x] Executar testes comerciais e verificações estáticas; validar interface isolada quando disponível, documentando limites reais.
- [x] Comparar origin/main, atualizar manifestos e histórico uma vez; entregar sem merge ou publicação.

**Revisão:** filtros ocultos ativos, página sem itens mas total positivo, conflito ao salvar, revisão de desconto e duplo envio. Testes existentes de conversão, parcelas e estados devem continuar passando.

**Decisão:** execução direta nesta worktree já isolada, conforme autorização recebida. A base é e046dbb (1.18.0); main local está desatualizada.

## Resultado e validação

- Base conferida por `git fetch origin main`: e046dbb, versão 1.18.0. Preparada versão 1.18.1 nos dois manifestos e no histórico, sem tags.
- Painéis: chave de formulário acompanha filtros aplicados, contagem ignora paginação, limpeza explícita, status em badges, total de páginas e recuperação da primeira página sem limpar filtros.
- Formulário compartilhado: seções de identificação e itens, salvar/cancelar no resumo, resumo fixo no topo em telas menores; campos bloqueados durante envio e estado preservado após falhas.
- Proteção: cancelar, links e fechamento/recarregamento; Navigation API protege travessias canceláveis do histórico, sem reescrever entradas. **Limite conhecido:** em navegadores sem Navigation API ou quando a travessia não é cancelável, o botão Voltar/Avançar interno pode sair sem confirmação. Não foram adicionadas entradas artificiais nem dados persistidos no navegador para contornar essa restrição.
- 30 testes unitários passaram em 12 arquivos: filtros/páginas, saída, conflito, custos, kits, parcelas, estados, versão/rodapés e atualizações.
- 14 testes de integração passaram em 5 arquivos: quotes, sales, commerce-http, quote-http e commerce-pricing. Banco PostgreSQL descartável exclusivo na porta 55433; os ambientes existentes nas portas 3000/55432 foram preservados. Nenhuma migration nova.
- TypeScript e ESLint dos arquivos alterados passaram; `git diff --check` sem erros.
- Prévia com componentes reais e dados fictícios: 1366×900 e 390×844, temas claro/escuro, ADMIN/OPERATOR; foco por Tab e ausência de rolagem lateral no celular. Permissões e conversão verificadas pelas integrações, não por autenticação real da prévia.
- Revisão independente realizada; ajuste adicional para proteção de histórico e teste de remoção dos ouvintes.
- Sem merge, push, publicação ou alteração na pasta operacional. Homologação humana pode ocorrer durante o uso, conforme autorização.
