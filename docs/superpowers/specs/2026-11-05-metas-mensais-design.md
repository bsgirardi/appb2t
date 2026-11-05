# Metas mensais salvas

## Intenção e limites

Evoluir a simulação da inteligência para acompanhamento persistido, sem criar operações comerciais. Execução autorizada pelo pedido deste chat; escolhas abaixo são decisões de implementação, sem aprovação presumida de merge/publicação. Base inspecionada: e046dbb, versão 1.18.0. Worktree existente e limpa; não tocar na worktree de Orçamentos/Vendas.

## Abordagens

1. Salvar filtros arbitrários da simulação: flexível, mas dificulta comparações e multiplica escopos.
2. **Escolha técnica: metas globais por competência mensal e indicador**, usando o relatório existente sem filtros opcionais. Comparação consistente e menor superfície de permissão.
3. Metas por equipe/produto/canal: exige regras de responsabilidade e composição ainda não existentes; fora deste incremento.

## Regras

- ADMIN ativo lê e revisa; OPERATOR não acessa metas nem resultados, preservando a restrição atual da Rentabilidade. Sem ampliar permissões indiretas.
- Competência YYYY-MM (1900–9999), calendário America/Sao_Paulo. Vendas normais com primeiro evento CONFIRM/CONVERT no mês, conforme relatório. Canceladas, rascunhos e pendências comerciais excluídas. Pedidos sem confirmação datada não entram.
- Faturamento e pedidos usam summary.revenue/count; contribuição usa summary.actual somente com cobertura integral. Reutilizar calculateSale/aggregateSales via consulta existente. Não duplicar motor.
- Meta decimal não negativa até 12 inteiros e duas casas; pedidos inteiros. Null = não definida, zero = definida em zero, sem divisão ou percentual. Sem preenchimentos comerciais automáticos.
- Antes do mês: realizado/projeção indisponíveis. Mês corrente: do primeiro dia até hoje (hoje parcial). Mês encerrado: mês inteiro. Sem pedidos elegíveis: faturamento/pedidos zero; contribuição indisponível, pois não há apuração coberta.
- Progresso pode ser negativo ou superior a 100%; barra limitada visualmente. Projeção apenas no mês corrente: realizado / dias corridos decorridos × dias do mês. Estimativa sem demanda/capacidade garantidas; sem operações.
- Revisão atômica dos três indicadores por competência, motivo obrigatório, autor e instante, versão otimista. Primeira gravação exige versão 0; colisões retornam conflito. Histórico imutável por aplicação, sem exclusão. Limpar meta gera revisão com null.
- Histórico preserva metas, não congela apuração. Custos e correções posteriores recalculam meses anteriores; isso deve estar explícito. Consulta de uma competência de cada vez, com seleção de mês e histórico de revisões paginado.
- Faturamento não é recebimento; contribuição não é lucro líquido. Exibir origem, cobertura, leitura atualizada e ligação ao relatório completo do mês. Não inferir custos ou vendas ausentes.

## Interface e persistência

Página /rentabilidade/metas e acesso pela inteligência existente. Reutilizar shadcn local, Roboto e tokens dos temas; cards dos três indicadores, formulário de revisão com resumo, feedback e recuperação de conflito sem perder entradas. Controles nativos rotulados, teclado, responsividade e aviso ao sair com edição pendente.

Migração apenas aditiva: MonthlyGoal e MonthlyGoalRevision, unicidade por mês e revisão, valores em JSON validados, CHECKs de competência/versão e FK de autor. Banco exclusivo em novo contêiner loopback, sem usar DATABASE_URL operacional. Validar upgrade com registro sintético legado, reaplicação e concorrência real.

## Validação e entrega

Testes de datas/decimais/cobertura/progresso, leitura e escrita autorizadas, persistência/revisões/concorrência, contrato HTTP e interface. Verificar tipos, lint, regressões, migração e visual nos temas e móvel. Versão MINOR uma vez por entrega, notas em português e consistência de APP_VERSION. Entrega revisável, sem merge nem produção.
