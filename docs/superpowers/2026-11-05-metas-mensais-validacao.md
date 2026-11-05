# Metas mensais — entrega e validação

Implementação local na branch `codex/metas-mensais`, baseada em `e046dbb` (main remoto consultado em 05/11/2026). Versão da entrega: **1.19.0**; main consultado: **1.18.0**. Sem merge, push, publicação ou migração operacional.

## Uso

Na Rentabilidade, acessar **Cadastrar metas e acompanhar o mês**. Selecionar competência, informar metas desejadas e motivo, revisar o resumo e confirmar. Campo vazio remove a definição; zero continua sendo uma meta explícita. Acesso exclusivo a ADMIN ativo, seguindo a permissão da Rentabilidade. OPERATOR continua acessando o histórico geral de atualizações do sistema.

Realizado usa o relatório existente, sem filtros de canal/produto/cobertura, pela confirmação em America/Sao_Paulo. Cancelamentos e custos posteriores podem alterar resultados de competências encerradas. O histórico registra revisões de metas, sem congelar o realizado. Estimativas mensais não geram operações nem garantem demanda ou capacidade.

## Arquivos principais

- Domínio: `src/domain/profitability/monthly-goals.ts`.
- Serviço/transações: `src/server/profitability/monthly-goals.ts`.
- API: `src/app/api/profitability/goals/route.ts`.
- Página e interface: `src/app/(private)/rentabilidade/metas/page.tsx` e `src/components/profitability/monthly-goals.tsx`.
- Persistência: `prisma/schema.prisma` e `prisma/migrations/20261105180000_monthly_goals/migration.sql`.
- Acesso: link na inteligência da Rentabilidade; sem alterações em Orçamentos/Vendas.
- Versão/notas: manifestos e `src/lib/releases.ts`; rodapés continuam consumindo `APP_VERSION`.

## Evidências

- Testes de domínio: competência, ano bissexto, meses futuros/encerrados, decimais, zero/null, contribuição incompleta, progresso acima de 100% e fórmula da estimativa.
- PostgreSQL exclusivo `127.0.0.1:55439/appb2t_goals_test`: persistência, remoção da definição, histórico, identidade revogada/inativa/OPERATOR, validação, disputa simultânea de criação e revisão, coorte mensal e virada de data de São Paulo. Quatro testes de integração específicos passaram.
- Migração: 32 migrações anteriores → registros sintéticos de usuário/cliente/orçamento → nova migração → reaplicação sem pendências. Registros anteriores preservados, sem backfill. Comparação do banco migrado com o schema: nenhuma diferença.
- HTTP: autenticação/autorização/conflito, origem e JSON inválidos, ausência de cache compartilhado.
- Interface: dados incompletos, resumo, conflito sem perda de campos, rascunho recuperado com revisão-base preservada. Revisão independente confirmou correção do problema de Voltar/Avançar.
- Prévia sem banco/API operacional nos temas claro e escuro; viewport móvel de 390 × 844, sem transbordamento horizontal da página, formulário e resumo legíveis. Console sem erros/avisos na prévia. Tabela usa rolagem própria e acesso por teclado do componente compartilhado.
- Build Next 16.4.2 e TypeScript passaram, incluindo `/rentabilidade/metas` e `/api/profitability/goals`. Lint completo passou.
- Rodapés e `/atualizacoes`: testes existentes conferem manifestos, APP_VERSION, login, painel e acesso de ADMIN/OPERATOR.
- Primeira regressão completa: 1.137 testes passaram, um falhou por interferência da opção de banco de metas no guard E3. O guard foi corrigido preservando o destino exclusivo E3; teste de regressão específico passou. **Repetição final: 1.139 testes passaram em 329 arquivos, sem falhas**, no banco descartável exclusivo. Os quatro testes de banco específicos também passaram. Quatro testes da interface incluem a proteção contra outra revisão chegar entre salvar e atualizar a leitura. Build final, TypeScript, lint completo e verificação de espaços do diff passaram.

## Reproduzir isoladamente

Usar exclusivamente um PostgreSQL descartável em loopback na porta 55439 e banco `appb2t_goals_test`. Informar `GOALS_TEST_DATABASE_URL` com as credenciais desse banco; nunca reaproveitar a variável ou o banco operacional.

- Banco vazio: `npm run test:goals:migration` aplica baseline, insere sentinelas e valida upgrade/reaplicação; recusa banco já preenchido.
- `npm run test:goals` usa o guard exclusivo e limpa apenas as fixtures do banco descartável antes dos testes. Pode ser repetido.
- Regressão completa: definir `DATABASE_URL` para esse mesmo banco descartável e `GOALS_REGRESSION=1`; executar `npm test`. O guard continua recusando outros destinos e mantém as regras próprias de E3.
- Prévia fictícia: `node tests/goals-preview-server.mjs`, abrir `/tests/goals-preview.html` na porta 4319. Não conectar essa prévia ao banco operacional.

## Limites

Somente metas globais por mês; sem metas por produto, canal ou vendedor. Meses sem pedidos mostram faturamento/pedidos zero e contribuição indisponível. Projeção apenas para mês corrente, por dias corridos incluindo hoje parcial. Rascunhos ficam apenas nesta aba, separados por usuário e competência; dependem do armazenamento de sessão disponível e não são metas gravadas. A migração operacional e a homologação de uso continuam pendentes da entrega em produção autorizada.
