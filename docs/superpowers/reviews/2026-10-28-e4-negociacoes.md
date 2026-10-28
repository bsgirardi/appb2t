# E4.1 — entrega local e validação

Data: 28/10/2026, America/Sao_Paulo.
Registro histórico da entrega local. **Atualização posterior:** migração e concorrência validadas em PostgreSQL exclusivo; [PR #23](https://github.com/bsgirardi/appb2t/pull/23) criada em rascunho na 1.6.0. Consulte o [relatório atual](2026-10-28-e4-validacao-pr.md). Sem merge/publicação; E4 ampla permanece parcial.

## Resultado

Oportunidades com etapas contato, levantamento, proposta, negociação, ganho e perdido; cliente cadastrado, responsável, próxima ação/data civil e pendências. Histórico privado e imutável no serviço, comandos idempotentes, versão para concorrência e perda/reabertura com motivo. Lista paginada com busca/filtros, detalhe, seletor de orçamentos e vínculo a partir do orçamento existente.

Vínculo exige mesmo cliente e não permite transferência/desvínculo. Proposta e negociação exigem principal. Ganho deriva da conversão existente (administrativa ou aceite privado), com uma venda vencedora por oportunidade e atualização na mesma transação. Perda exige retirada prévia de oferta privada ativa, inclusive via solicitação. Cancelamento posterior da venda preserva histórico de ganho e aparece com aviso. Notas/eventos não foram adicionados aos DTOs públicos.

Fontes: `src/domain/opportunities`, `src/server/opportunities`, `src/components/opportunities`, páginas `/negociacoes`, rotas `/api/opportunities`, guardas nos serviços de orçamento/venda/checkout e migração aditiva `20261028011000_opportunities`.

## Isolamento e versão

Worktree: `C:/Users/Administrador/.codex/worktrees/e4-negociacoes/appb2t`; branch `codex/e4-negociacoes`; base main `d74ee7515898ef3ad892543fa61d02994c262799` (1.5.1). Main remota reconferida e ainda nessa base. Commits: domínio `48dd0af`, serviços `df7d7d6`, API `c7c3117`, UI `2762c30`, correção/revisão `b7a4da2`.

Versão mantida em 1.5.1: entrega local sem PR autorizada. Não houve push, PR, merge, tag, publicação, migração real ou atualização de contêineres. Futura PR exige incremento MINOR comparado à main atual, manifestos sincronizados e notas em português conforme AGENTS.md. Não aplicar a migração na instalação operacional como parte desta entrega.

Instalação original e alterações de outros chats preservadas; somente documentação E4/acompanhamento atualizados nela. Durante uma atualização de ferramentas, uma variável de caminho deixou de existir e houve edição transitória em três serviços originais; os trechos exatos foram removidos imediatamente, e o diff desses três arquivos foi conferido vazio. Nenhuma ação de banco resultou desse incidente. Comandos posteriores usaram caminho absoluto explícito.

## Evidências executadas

- Baseline comercial: 3 testes aprovados antes da implementação.
- Resultado final focado: **28 testes em 15 arquivos aprovados**, cobrindo domínio E4, proteção do destino de banco, privacidade HTTP anônima, UI/conflitos/retry/filtros e regressões de comércio/orçamentos/checkout.
- Comando: `npx vitest run tests/unit/opportunity-domain.test.ts tests/unit/opportunity-database-guard.test.ts tests/unit/opportunity-http.test.ts tests/unit/opportunity-ui.test.tsx tests/unit/opportunity-command.test.tsx tests/unit/opportunity-filters.test.tsx tests/unit/commerce-states.test.ts tests/unit/commerce-dates.test.ts tests/unit/commerce-totals.test.ts tests/unit/commerce-installments.test.ts tests/unit/quote-ui.test.tsx tests/unit/admin-commerce-ux.test.tsx tests/unit/checkout-ui.test.tsx tests/unit/checkout-contract.test.ts tests/unit/checkout-eligibility.test.ts`.
- `npm run typecheck`, `npm run lint` (sem avisos na última execução), `npm run build`, `prisma validate`, `prisma generate` e `git diff --check` aprovados. Build repetido após correção com URL sintética do banco E4 ausente, sem consulta operacional.
- SQL da migração gerado por diff entre schema da base e schema E4, inspecionado como aditivo, sem backfill ou remoções. Isso não valida aplicação real da migração.
- Prévia SSR sintética dos componentes reais com CSS do build: lista, formulário, detalhe com título longo, oportunidade ganha/venda cancelada. Desktop e 375 px sem rolagem horizontal da página; navegação nativa por Tab conferida entre título e cliente. Não houve fluxo autenticado operacional nem ensaio completo de teclado para todas as ações.
- Antes das implementações, testes registraram ausência de módulos esperados. Regressores de retry por troca de oportunidade e filtro Voltar/Avançar foram observados falhar por asserção, corrigidos e aprovados.

## Limites e validações pendentes

1. **PostgreSQL E4 indisponível.** Sondagem de `127.0.0.1:55434` negativa; tentativa de `opportunity-commands.test.ts` terminou com três falhas de conexão no setup, antes das asserções. Não são falhas funcionais do domínio nem validação de persistência. Não repetir contra banco de outra etapa.
2. **Integrações preparadas, ainda sem execução funcional:** comandos/auditoria, inativação, identidade do vínculo, ganho/replay, oferta privada direta e somente via solicitação, rollback, concorrência de conversões/publicação/perda/vínculo/edição, adoção de venda preexistente e cancelada, consulta e sessões ADMIN/OPERATOR/inativas. Configuração `vitest.e4.config.ts` aceita exclusivamente `E4_TEST_DATABASE_URL` com localhost/127.0.0.1:55434/b2t_e4_test e rejeita parâmetros que possam trocar o destino. Setup compartilhado de outras etapas não é importado.
3. **Suíte unitária completa não validada.** `npm run test:unit` reproduziu `RangeError: Maximum call stack size exceeded` no transporte de erros do Vitest e foi interrompida sem resumo. Não há contagem confiável da execução completa. Diagnóstico limitado preservado no scratch E4. Não foi executado `npm test` contra integrações compartilhadas.
4. Migração aditiva, constraints, locks, rollback e corridas precisam ser executados num banco E4 descartável exclusivo antes de eventual integração. Não foi iniciado servidor/contêiner ou usado banco operacional para contornar esse limite.

## Revisão independente e correções

Revisão somente leitura de `d74ee75..2762c30` por agente independente, em passes de domínio, migração, transações, consultas/HTTP e UI. Três P2:

- Filtros visíveis divergiam dos resultados após Voltar/Avançar: teste `opportunity-filters` observado falhar; formulário passa a remontar por filtros recebidos, sem apagar o formulário de criação; teste e regressões aprovados.
- Teste anunciado como somente via solicitação também tinha vínculo direto: novo caso força `checkout.quoteId=null`, verifica perda bloqueada sem escrita e perda permitida após retirada. Código preparado e tipado; execução real pendente do banco.
- Faltavam adoção de orçamento convertido/venda cancelada e corridas de vínculo com edição/conversão legada: cenários adicionados com contagens e estado persistido; tipados, ainda sem execução real.

Nenhum defeito transacional concreto identificado na leitura; isso não substitui evidência PostgreSQL. Sem achados menores adiados. Não há aprovação de merge nesta entrega.

## Decisões de execução registradas

- Scripts shell das skills substituídos por ledger PowerShell nesta worktree Windows; custo: rastreabilidade manual, preservada por commits e este relatório.
- Serviços de leitura/serialização antecipados para comandos e commits de comandos/integração agrupados devido a invariantes compartilhadas; custo: unidade maior de revisão, sem mudança dos contratos aprovados.
- Prosseguir com implementação local e testes unitários/build quando o banco exclusivo não estava disponível, como previsto no plano; custo: migração/persistência/concorrência permanecem sem validação real e impedem tratar entrega como pronta para integração.
- Itens que o revisor não julgou: PR/push/merge/publicação/migração operacional mantidos fora da autorização; E4.2/E4.3 e reabertura de ganho mantidos fora do recorte; PostgreSQL permanece pendente; responsividade/teclado conferidos pelo autor em prévia sintética limitada. Custo: E4 ampla continua parcial e a prévia não prova uso autenticado real.

## Próxima ação

Disponibilizar banco E4 exclusivo por procedimento autorizado, aplicar e validar a migração somente nele e definir `E4_TEST_DATABASE_URL` no ambiente PowerShell para o destino exclusivo e executar `npx vitest run --config vitest.e4.config.ts`. Resolver ou aceitar explicitamente o limite da suíte completa antes de considerar integração. Sem autorização de PR, merge ou publicação. Versões integrais de propostas, margem negociada e prazo completo continuam em incrementos próprios.
