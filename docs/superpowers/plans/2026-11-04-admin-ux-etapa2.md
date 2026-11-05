# Rotina diária — etapa 2

**Objetivo:** reduzir esforço no dashboard e no cadastro de clientes, recorte representativo autorizado.
**Arquitetura:** manter DTOs, serviços, rotas e permissões. Reutilizar DashboardPanel, PriorityTable, FilterPanel, FormSection, FormActions e ContextEditor. TaskLayout não é necessário no editor estreito: resumo junto às ações evita uma segunda coluna.
**Execução:** nesta worktree isolada, diretamente, conforme solicitação de executar sem nova autorização.

## Decisões e dependências
- Etapa 1 está em outra worktree, sem integração nesta base 1.15.0. Não editar shell, navegação ou CSS global.
- Preferir melhorias funcionais em dois fluxos a uma alteração superficial de todos os módulos. Demais cadastros ficam para adoção posterior.
- Manter contratos financeiros, produção, estoque e banco intactos. Sem dependências novas.
- Não criar PR, fazer merge ou publicar produção nesta entrega. Antes de integrar, reconciliar versão com main e com etapa 1.

## Tarefas
- [x] Dashboard: indicadores essenciais, pendências e depois gráficos; filtros indicam customização e erros abrem o painel. Testar ordem, URL e validação.
- [x] Clientes: separar filtros aplicados de rascunhos; paginação usa URL aplicada; voltar/avançar sincroniza campos; limpar filtros, estado vazio útil, situação com Badge e ação identificada por cliente. Testar navegação e estado vazio.
- [x] Formulário: seções identificação/contato/complementos, resumo próximo a FormActions, feedback de envio e erro; preservar ContextEditor e adicionar proteção de saída do navegador enquanto há alterações. Testar descarte, falha e payload existente.
- [x] Validar testes pertinentes, tipos, lint e interface em viewport móvel/desktop, claro/escuro e teclado quando ambiente permitir. Registrar limitações reais.
- [x] Incrementar MINOR uma vez (funcionalidades compatíveis), notas em português, conferir APP_VERSION, rodapés e atualizações; registrar entrega revisável.

## Foco de revisão
Rascunho de busca não pode mudar página antes de aplicar; URL recebida deve atualizar os filtros; filtro vazio deve distinguir ausência de cadastros; falha de API conserva dados; cancelar/Escape/saída não perde edição silenciosamente.

## Registro final
Implementado diretamente. Seis testes iniciais reproduziram as lacunas antes da implementação. Revisão independente encontrou estado vazio incorreto para página fora dos resultados: teste adicional falhou antes da correção e passou depois. Suíte completa: 186 arquivos / 759 testes. Tipos, lint e build aprovados. Sem achados importantes pendentes. Evidências e limitações em `docs/superpowers/2026-11-04-admin-ux-etapa2.md`.
