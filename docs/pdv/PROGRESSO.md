# Execução PDV — plano: docs/superpowers/plans/2026-11-06-pdv-presencial.md

Método: execução direta autorizada pelo pedido inicial. Sem novos gates de confirmação para decisões técnicas reversíveis. Desenho incorpora respostas de 06/11/2026.
Preflight: Task 1 fornece contratos para Task 2; Task 2 fornece APIs para Task 3. Tipos e assinaturas serão mantidos entre tarefas. Funções transacionais compartilhadas evitam comandos públicos aninhados.
Task 1: em andamento.

Task 1: complete — contrato anônimo explícito, cliente opcional e troco, schema/migração e recorrência.
Task 2: complete — funções transacionais extraídas e comando idempotente; 9 integrações e 15 regressões no banco exclusivo. Migração ensaiada sobre contrato anterior com legado preservado.
Task 3: complete — componentes shadcn do projeto, 375 px/desktop, foco por Tab e conclusão, temas. Revisão independente: preço/referência do carrinho e versão do cliente corrigidos com testes RED→GREEN; rechecagem sem novos bloqueadores. Ajuste adicional de conflito entre edições na recuperação também RED→GREEN.
Task 4: complete no recorte local — tipos, lint, build, 889 unitários gerais, 11 focados finais, registros e evidências. Build repetido após ajuste adicional.
Ruling: versão 1.22.0 preservada porque não se está preparando PR; reconciliar e incrementar uma vez para futura PR. Nenhum estado publicado foi presumido.
Ruling: não executar ensaio HTTP autenticado integral após bloqueio de revisão automática ao iniciar servidor Next isolado — limite registrado sem contorno. Prévia visual usa adaptador sintético, integrações usam PostgreSQL exclusivo real.
