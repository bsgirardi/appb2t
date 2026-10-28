# E5.1 — entrega local do ciclo de consignação

Data: 28/10/2026. Branch `codex/e5-consignacao`, base `7fe37d9` (main 1.10.1). Implementação em worktree isolada; nenhuma alteração operacional de banco ou contêineres.

## Entregue

Parceiro vinculado a cliente, responsável e local; condições gerais/por produto e estoque mínimo. Custódia por origem com rascunho, expedição, recebimento parcial, devolução/conferência, perda e compensação auditada. Venda efetiva com condições congeladas, cancelamento integral e títulos financeiros existentes. Ambos os modelos: RETIDA gera repasse líquido, SEPARADA gera repasse bruto e comissão a pagar. Acertos mensais/complementares agrupam títulos sem duplicar caixa. Consultas, reposição, resultados por parceiro/produto, interface privada e integração com documentos/financeiro existentes.

Custos de abertura e produção são particionados entre estoque interno, custódia, venda e perda; custo ausente permanece indisponível. Receita não nasce na expedição. Guardas e bloqueios transacionais coordenam estoque, vendas, acertos e baixas.

## Decisões registradas

- Inativação bloqueia novas remessas; estoque já recebido ainda pode ser vendido para resolver a custódia.
- Datas não permitem consumir antes do recebimento, compensar antes da origem ou registrar venda futura.
- Compensação verifica saldo líquido e cronologia. Eventos históricos já desfeitos não bloqueiam permanentemente a correção.
- Caixa por produto segue repasse devido e comissão congelada de cada linha, incluindo percentuais 0%/100%.

## Revisão independente

Revisão estática completa de `7fe37d9..cec0a2f` identificou dois P2: bloqueio de compensação após dependente cancelado e rateio de caixa pelo bruto quando comissões diferem. Ambos reproduzidos com falha real e corrigidos; testes passaram após a correção. Acrescentada cobertura de perda compensada e recebimento posterior independente. Nenhum achado material conhecido ficou sem correção.

## Verificação

Resultados finais e limitações registrados abaixo após a execução. Migração base→E5 e reaplicação verificadas em PostgreSQL 17.11 nativo portátil, exclusivo em localhost:55435/b2t_e5_test. Preservados dados comerciais e estoque sintéticos legados; FK, unicidade, ausência de backfill e sinais dos movimentos conferidos. Binário oficial EDB; nenhuma instalação de serviço ou alteração de contêiner.

Prévia SSR sintética dos componentes em desktop 1280px e celular 375px, temas claro/escuro: sem overflow global observado, tabelas com rolagem local e navegação Tab entre campos. Isso não representa navegação autenticada ponta a ponta ou validação humana da equipe.

Cobertura de concorrência observa espera real por locks PostgreSQL: duas vendas, venda/perda, venda/retorno, dois fechamentos, expedição/reserva U3 e cancelamentos/baixa. Nem todas as combinações do plano receberam um cenário dedicado (por exemplo, duas expedições e fechamento/cancelamento). Testes dos formulários completos e interação autenticada continuam como limite de cobertura; os testes de interface automatizados focam resumo de comissão e envio/repetição de comando.

## Estado da entrega

Versão mantida em 1.10.1, sem incremento antecipado; main remota reconferida em `7fe37d9`. Sem PR, push, merge, publicação ou migração operacional. Uma futura PR deverá incrementar MINOR sobre a main vigente, sincronizar manifestos e publicar notas em português conforme AGENTS.md. A CI E5 foi preparada, mas não executada remotamente nesta entrega.

Balcão/feira, portal de parceiro, múltiplos locais, fiscal, pagamento online e mensagens externas permanecem fora deste recorte aprovado.

## Resultado final das verificações

- `npm run test:unit`: 160 arquivos, **661 testes aprovados**.
- `npm run test:e5`: 12 arquivos, **32 testes aprovados** (23 do ciclo E5 e 9 regressões portadas de estoque pronto, vendas comuns e baixas/estornos).
- `npm run test:e5:migration`: **aprovado** em banco exclusivo inicialmente vazio, upgrade aditivo e reaplicação; SQL final não mudou após essa verificação.
- `npm run typecheck`, `npm run lint`, `npm run build`: **aprovados**. Build verificou tipos e gerou as rotas privadas/API da consignação.
- `git diff --check`: aprovado antes do commit final.

Os arquivos `regression-*.test.ts` são cópias independentes dos casos legados, executadas com o setup E5. Não redirecionam ou importam o setup geral e não equivalem à execução integral de todas as suítes E1–E4. A instância portátil e a prévia sintética foram encerradas ao concluir. Evidências temporárias permanecem ignoradas no workspace de execução.

## Preparação da PR autorizada — 28/10/2026

Usuário autorizou criar PR. Main remota reconferida em `7fe37d9`, versão 1.10.1; incremento MINOR único para **1.11.0**, com manifestos sincronizados e nova entrada em `src/lib/releases.ts`. Histórico anterior preservado; rodapés usam APP_VERSION e Atualizações permanece acessível a ADMIN/OPERATOR. Os registros de entrega local acima são históricos. Sem autorização para merge/publicação/migração operacional.

Revalidação da preparação 1.11.0: 661 testes unitários/160 arquivos PASS, teste específico de versão/rodapés/Atualizações 3 PASS, lint e build (incluindo tipos) PASS. Manifestos e preservação integral do histórico anterior conferidos; main ainda `7fe37d9`. Integração/migração mantêm os resultados anteriores porque esta preparação alterou somente versão, notas e acompanhamento.
