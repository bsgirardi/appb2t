# E4.1 — validação PostgreSQL e preparação da PR

Data: 28/10/2026, America/Sao_Paulo. Continuação autorizada pelo usuário: validar migração e concorrência e criar PR. Merge e publicação continuam fora da autorização.

## Migração real validada

Instância PostgreSQL 17 descartável criada com a imagem já instalada, sem pull, sem volume persistente e bind exclusivo 127.0.0.1:55434. Nome b2t-e4-validation-20261028, label codex.task=e4-negociacoes e banco b2t_e4_test. Nenhum contêiner existente foi atualizado ou reiniciado; nenhum banco operacional ou compartilhado foi usado.

`tests/e4/migration-validation.ts`, executado com `npx tsx`, verifica a allowlist antes de instanciar Prisma e recusa banco com tabelas existentes. Aplica as migrações da base d74ee75, cria dados sintéticos nas sete tabelas User, Customer, Quote, Sale, SaleInstallment, FinancialEntry e CommerceEvent, preserva snapshots completos dos registros e aplica E4. Resultado PASS:

- Upgrade de 28 migrações da base para 29 com E4 aplicado.
- Conteúdo anterior preservado nas sete tabelas, incluindo orçamento convertido, venda, parcela, recebível e evento.
- Nenhuma oportunidade criada automaticamente; vínculo legado continua nulo.
- Reaplicação sem migrações pendentes ou alteração dos dados.
- Chave estrangeira rejeita cliente inexistente; unicidade rejeita duas oportunidades com a mesma venda vencedora.

As primeiras tentativas do novo validador expuseram ajustes no próprio script: execução assíncrona compatível com CJS e autoria completa exigida pelo evento legado. A instância descartável foi recriada antes de repetir o teste de upgrade; as restrições existentes não foram flexibilizadas.

## Integrações e concorrência

Configuração exclusiva `vitest.e4.config.ts`, sem importar setup compartilhado. Na primeira execução real, 10 de 19 casos falharam na preparação: fixture de orçamento sem internalNotes e chave de checkout fora do formato hexadecimal de 64 caracteres. Ambos corrigidos em `tests/e4/fixtures.ts`; nenhuma regra do produto foi alterada para aceitar fixtures inválidas.

Resultado final: **21 integrações em 6 arquivos aprovadas**. Os testes verificam comandos/auditoria, identidades inativadas, vínculos e principal, ganho/replay, oferta direta e somente via solicitação, bloqueio de perda, reabertura, rollback integral, venda preexistente/cancelada, consultas e sessões ADMIN/OPERATOR/inativas.

`tests/e4/race.ts` mantém a coordenação PlanningState ocupada, inicia dois comandos em conexões reais e verifica os dois aguardando Lock em pg_stat_activity antes de liberar. Portanto, os cenários não dependem apenas de Promise.all:

- Duas conversões de orçamentos distintos: uma venda vencedora, uma parcela/recebível, outro comando em conflito.
- Vínculo versus mudança incompatível de cliente: nenhum vínculo inconsistente.
- Vínculo versus conversão legada: ganho reconciliado e venda única.
- Publicação versus perda: oferta ativa apenas enquanto oportunidade aberta.
- Aceite versus perda, em caso independente com oferta publicada: ganho e perda rejeitada.
- Conversão administrativa versus aceite privado de outro orçamento da mesma oportunidade: uma única venda, parcela/recebível e incremento único no ganho.

Os grupos opportunity-concurrency e opportunity-checkout passaram em **cinco rodadas finais, 10 casos por rodada**. A suíte E4 completa também passou após o ajuste da revisão.

## Outras verificações e versão

- **31 testes unitários/UI/regressões em 16 arquivos aprovados**, incluindo consistência de manifestos, rodapés reais de login/admin e Atualizações para ADMIN/OPERATOR.
- Tipagem, lint sem avisos, build e git diff --check aprovados.
- Versão preparada **1.6.0 (MINOR)** sobre main remota 1.5.1, d74ee75. Somente versão raiz e packages[""].version do lock foram alteradas; dependências preservadas. APP_VERSION permanece derivado do manifesto. Histórico anterior preservado e nova entrada em português.
- Limite mantido: a execução unitária completa anterior reproduziu recursão do transporte do Vitest sem resumo. Não foi declarada suíte completa aprovada. PR em rascunho para revisão; esse limite precisa ser resolvido ou aceito explicitamente antes de merge.

## Revisão independente deste incremento

Revisão somente leitura dos testes/validador e preparo de versão. Um P2: a disputa aceite/perda era condicional à publicação vencer a corrida anterior. O teste foi separado e passou a executar essa disputa em toda rodada; regressões repetidas e suíte E4 aprovadas. Sem outros achados concretos ou menores adiados nesse escopo. A revisão anterior dos serviços e UI continua registrada no relatório de entrega local.

## Estado de entrega

Branch codex/e4-negociacoes, worktree exclusiva. [PR #23 em rascunho](https://github.com/bsgirardi/appb2t/pull/23) criada, aberta e vinculada ao chat. Estado remoto conferido: base main, head codex/e4-negociacoes, sem conflitos reportados na criação. Sem merge, tag, publicação, migração operacional ou atualização de contêineres existentes. A instância descartável foi parada e removida automaticamente após as verificações; dados de teste não foram preservados. A listagem confirmou os três contêineres existentes com suas portas anteriores.

E4 ampla permanece parcial: histórico integral das versões de propostas, alertas de retorno/vencimento, margem global e prazo comercial completo continuam fora de E4.1. Recomparar versão e notas com main antes de eventual merge; outras PRs podem também propor 1.6.0.
