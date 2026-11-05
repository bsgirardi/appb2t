# Plano — metas mensais

Spec: ../specs/2026-11-05-metas-mensais-design.md
Execução contínua neste chat conforme pedido; usar a worktree atual. Não migrar dados operacionais, não integrar nem publicar.

1. Testar primeiro competência, valores, zero/null, cálculo mensal e estimativa. Implementar domínio reaproveitando Summary e decimais existentes.
2. Adicionar modelos/migração aditiva. Serviço com autorização ADMIN ativa, transação, controle otimista e revisões. Consultar getProfitabilityReport para realizado. Testar persistência, colisões e permissões em banco exclusivo.
3. Criar endpoint protegido com validação de origem e JSON existentes. Página mensal e componente shadcn com formulário/resumo/histórico, tratamento de conflitos e aviso de edição pendente. Testar HTTP e UI.
4. Validar migração baseline → upgrade → reaplicação e preservação de dados sintéticos. Rodar testes adequados, tipos/lint, revisão e inspeção visual isolada.
5. Atualizar versão e notas uma vez; verificar main, rodapés e atualizações. Registrar evidências e limitações; deixar resultado local revisável.
