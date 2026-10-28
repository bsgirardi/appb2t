# E4.1 — Oportunidades e próximos contatos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Acompanhar oportunidade até perda ou venda única, com responsável, histórico privado e próxima ação.

**Architecture:** Domínio próprio de oportunidades ligado ao orçamento existente. Comandos transacionais e idempotentes usam a coordenação global já existente; conversão administrativa e aceite privado atualizam ganho na mesma transação da venda. Consultas e telas internas não alteram DTOs públicos.

**Tech Stack:** Next.js 16.4.2, React 19, TypeScript, Prisma 6/PostgreSQL, Zod 4 e Vitest existentes; sem dependências novas previstas.

**Spec:** `docs/superpowers/specs/2026-10-27-e4-negociacoes-design.md`, aprovado pelo usuário em 27/10/2026.

## Global Constraints

- Preservar a instalação operacional e trabalho de outros chats. Executar em worktree E4 exclusiva a partir da main atual, após ler using-git-worktrees; não copiar .env.
- Não publicar, alterar contêineres, executar migrações operacionais, criar PR, push ou merge. Commits locais somente no isolamento e com arquivos selecionados.
- Banco E4 exclusivo: variável `E4_TEST_DATABASE_URL`, destino permitido `localhost:55434/b2t_e4_test` ou `127.0.0.1:55434/b2t_e4_test`. Não iniciar servidor/contêiner automaticamente. Se indisponível, registrar integrações não executadas.
- Não executar o setup atual `tests/integration/setup.ts`, que limpa banco compartilhável na porta 55432, em testes E4.
- Antes de escrever código Next/React, ler guias locais de pages/layouts, server/client components e route handlers em `node_modules/next/dist/docs/` e skills aplicáveis (React, shadcn conforme components.json).
- ADMIN e OPERATOR ativos têm as mesmas permissões de E4; notas e eventos nunca entram em respostas públicas ou impressão.
- Versão local permanece a da base enquanto não houver PR autorizada. Futura PR exige incremento MINOR sobre main atual, manifestos sincronizados, APP_VERSION nos rodapés e histórico em português conforme AGENTS.md.
- Sem kanban, envio externo, versões integrais de propostas, margem global, automação de retorno/vencimento ou promessa produtiva neste incremento.

## Review Focus

1. Mudança do cliente pelo editor antigo do orçamento não pode romper vínculo: regressão na tarefa 3.
2. Oferta ligada pela solicitação de catálogo deve bloquear perda tanto quanto vínculo direto: regressão na tarefa 3.
3. Responsável/cliente inativado depois do cadastro continua visível; edição não relacionada não deve exigir reatribuição: tarefa 2.
4. Resposta idempotente antiga após fechamento não pode provocar nova gravação nem devolver notas ao público: tarefa 3.
5. Virada do dia em São Paulo, paginação e filtros combinados não podem esconder próxima ação atrasada: tarefas 1, 4 e 5.

## Mapa de arquivos

- Criar `src/domain/opportunities/{types,validation,states}.ts`: contratos, validação e transições puras.
- Alterar `prisma/schema.prisma`; criar migração aditiva em `prisma/migrations/<timestamp>_opportunities/migration.sql`.
- Criar `src/server/opportunities/{commands,queries,commerce}.ts`: escrita/auditoria, leitura e integração transacional com comercial.
- Criar `tests/e4/{database,setup,fixtures}.ts`, `tests/e4/*.test.ts` e `vitest.e4.config.ts`: isolamento e integrações exclusivas; não incluir E4 no glob padrão.
- Criar testes unitários `tests/unit/opportunity-{domain,database-guard,ui}.test.ts[x]` conforme conteúdo.
- Alterar `src/server/{quotes,sales}.ts` e `src/server/checkout/quotes.ts` nos pontos de edição, conversão e publicação.
- Criar rotas `src/app/api/opportunities/route.ts`, `[id]/route.ts`, `[id]/commands/route.ts`, `[id]/events/route.ts`, `options/route.ts` e `quote-candidates/route.ts` sob a mesma pasta.
- Criar `src/app/(private)/negociacoes/{page,loading}.tsx`, `[id]/page.tsx` e `src/components/opportunities/{panel,form,detail,quote-link}.tsx`.
- Alterar `src/components/shell/admin-navigation.tsx`, `src/components/commerce/quote-detail.tsx` e página interna `src/app/(private)/orcamentos/[id]/page.tsx` para integração.
- Atualizar acompanhamento e criar `docs/superpowers/reviews/2026-10-27-e4-negociacoes.md` ao entregar.

## Interfaces comuns

`OpportunityStage = CONTATO | LEVANTAMENTO | PROPOSTA | NEGOCIACAO | GANHO | PERDIDO`; `OpenStage` contém as quatro primeiras.

`OpportunityFields = { title, customerId, ownerId, stage: OpenStage, nextAction, nextContactDate, pendingNotes }`. Datas são strings YYYY-MM-DD; limites são os do desenho. `OpportunityDTO` inclui esses campos (ação/data nulas quando encerrada), id/version, cliente/responsável com active, lossReason, principalQuoteId, orçamentos com id/number/version/status, wonSale com id/number/status ou null, createdAt/updatedAt. Não contém eventos ilimitados.

`OpportunityCommand` é união discriminada por `action`: CREATE(fields), UPDATE(fields), INTERACTION(text), LINK_QUOTE(quoteId), SET_PRIMARY(quoteId), LOSE(reason), REOPEN(reason,nextAction,nextContactDate). Todos carregam operationKey; todos exceto CREATE exigem expectedVersion. UPDATE não aceita estados terminais nem principal arbitrário. Nenhum comando aceita GANHO ou wonSaleId do cliente.

`OpportunityEventDTO` contém id, type, authorKind, actorName, createdAt e data com alterações/texto. `listOpportunityEvents(actor,id,raw): Promise<Page<OpportunityEventDTO>>` pagina independentemente.

## Tarefa 1 — Domínio e banco E4 protegido

**Files:** domínio, schema/migration, `tests/e4/database.ts`, `tests/e4/setup.ts`, `vitest.e4.config.ts`, testes unitários de domínio/guard.

**Interfaces:** produzir `opportunityCommandSchema`, `opportunityFilterSchema` (Page de 20, máximo 100; owner todos/eu/id, stage abertas/todas/etapa, due todas/atrasadas/hoje), `assertOpportunityTransition(from,to,hasPrincipal): void`, `opportunityDueState(date,today): atrasada|hoje|futura|null` e `assertE4DatabaseUrl(raw: string): URL`.

- [ ] Preparar isolamento usando skill específica; registrar commit/base e status limpo da worktree. Copiar apenas documentos E4 e referências necessárias do acompanhamento original, sem sobrescrever trabalho na instalação.
- [ ] Escrever testes que rejeitem título vazio/161 caracteres, ação vazia/501, pendências 4001, interação vazia/4001, perda com 2/2001 caracteres, data inexistente, criação em PROPOSTA/GANHO e transição a PROPOSTA sem principal. Testar atraso no dia 27 para data 26, hoje para 27 e virada `2026-10-28T02:59:59Z` → `03:00:00Z` em São Paulo.
- [ ] Escrever guard tests: aceitar apenas hosts/porta/banco acima com esquema postgres/postgresql; rejeitar porta 55432/55433, host remoto, banco operacional, URL ausente e protocolos diferentes, sem imprimir credenciais.
- [ ] Executar `npx vitest run tests/unit/opportunity-domain.test.ts tests/unit/opportunity-database-guard.test.ts`; confirmar falha pelas funções ainda ausentes antes de implementar.
- [ ] Implementar contratos/validações e modelos Opportunity, OpportunityEvent, OpportunityOperation; usar enum de etapa, Date para data civil, version inicial 1, FKs restritivas, quote.opportunityId opcional indexado, principal com relação nomeada e wonSaleId único. Nomear relações Prisma de forma não ambígua; nenhuma tabela/campo legado removido ou backfill.
- [ ] Configurar Vitest E4 para incluir somente `tests/e4/*.test.ts`, validar URL antes de importar db e atribuir DATABASE_URL somente a partir de E4_TEST_DATABASE_URL validada. Setup E4 copia a lógica necessária de fixtures/limpeza, inclui tabelas novas e mantém verificação antes de cada limpeza; não importa setup antigo. Config padrão exclui `tests/e4/**` para impedir execução acidental.
- [ ] Repetir testes unitários (PASS), `npx prisma validate` e `npx prisma generate` com URL sintética E4 validada. Se banco exclusivo disponível, aplicar migrações somente nele e verificar que registros legados sem vínculo sobrevivem; caso contrário, não executar limpeza/migração e registrar limite.
- [ ] Commit local: `feat: define dominio de oportunidades e isolamento E4`, selecionando somente arquivos desta tarefa.

## Tarefa 2 — Comandos e histórico auditável

**Files:** `src/server/opportunities/commands.ts`, fixtures/setup E4, `tests/e4/opportunity-commands.test.ts`.

**Interfaces:** `executeOpportunityCommand(actor: Actor, id: string | undefined, raw: unknown): Promise<OpportunityDTO>`. CREATE exige id ausente; demais exigem id. Produz leitura reutilizável de DTO sem eventos; controles comerciais LINK_QUOTE/LOSE são completados na tarefa 3 antes de expor HTTP.

- [ ] Escrever testes CREATE/UPDATE/INTERACTION/REOPEN: cliente e responsável ativos na atribuição, identidade preservada após inativação, mudança independente permitida mantendo responsável inativo; texto aparado nos limites; autoria e before/after; interação não altera próxima ação; estado terminal aceita somente interação e REOPEN de perda.
- [ ] Testar mesma chave/payload retorna resultado inicial sem novo evento; chave com payload diferente conflita; expectedVersion antigo não altera dados/eventos; reabertura limpa lossReason, passa a LEVANTAMENTO e exige ação/data. Comparar contagens e versões antes/depois.
- [ ] Executar `npx vitest run --config vitest.e4.config.ts tests/e4/opportunity-commands.test.ts`; observar falha funcional. Sem banco disponível, manter teste não executado explicitamente, sem simular validação de persistência.
- [ ] Implementar comandos com parsing estrito, operação no escopo ator+chave (tipo e payload no hash), trava de operação → lockPlanning → oportunidade, replay antes da checagem de versão, evento e incremento atômicos. Retorno usa DTO do serviço de leitura. Criação inicia em 1; cada comando posterior incrementa uma vez, inclusive interação. Campos terminais de ação/data ficam null, snapshot anterior permanece no evento.
- [ ] Reexecutar testes (PASS quando banco disponível) e tipagem; commit local `feat: registra oportunidades e interacoes auditadas`.

## Tarefa 3 — Vínculo, perda e fechamento sem duplicação

**Files:** `src/server/opportunities/commerce.ts`, comandos, `src/server/quotes.ts`, `src/server/sales.ts`, `src/server/checkout/quotes.ts`, `tests/e4/opportunity-commerce.test.ts`, `tests/e4/opportunity-concurrency.test.ts`.

**Interfaces:** consumir comandos/DTO. Produzir `assertOpportunityQuoteCustomer(tx,quoteId,customerId: string|null): Promise<void>`, `assertOpportunityQuoteOpen(tx,quoteId): Promise<void>` e `recordOpportunityWon(tx,author: CommerceAuthor,quoteId,saleId,source: CONVERSION|LINK): Promise<void>`. Helpers exigem lockPlanning do chamador; nunca abrem transação independente nem adquirem operação/sessão privada.

- [ ] Auditar todos os chamadores de convertQuoteWithClient e publicação/edição de orçamento; verificar coordenação mantida até commit. Escrever regressão da pré-condição pelos caminhos públicos do serviço, incluindo aprovação privada antes da conversão. Não colocar novo lockPlanning depois de trava que possa aguardar outro fluxo sem coordenação.
- [ ] Escrever testes de vínculo mesmo cliente, principal automático inicial, troca de principal, orçamento já vinculado, troca/limpeza de cliente pelo editor antigo, vínculo em perdida/ganha, venda retroativa cancelada e orçamento sem oportunidade inalterado. Assertar uma única versão/evento de oportunidade quando LINK também reconcilia GANHO.
- [ ] Escrever testes perda com oferta ativa direta e via catalogRequest, publicação em encerrada, conversão em perdida e recusa/expiração sem perda automática. LOSE não altera documento, checkout ou parcela. Oferta retirada permite perda; REOPEN permite oferta nova.
- [ ] Escrever testes de conversão administrativa e aceite privado: GANHO/wonSaleId na mesma transação, autoria adequada, próxima ação limpa; falha induzida no registro de ganho reverte venda/parcelas/status/aprovação privada. Replay retorna resposta original e não duplica eventos/financeiro; chave nova conflita no orçamento já convertido.
- [ ] Escrever concorrência real com duas conexões/Promise.allSettled e contagens pós-commit: dois orçamentos da mesma oportunidade convertidos simultaneamente → uma venda e suas parcelas; publicação versus perda → oferta ativa com oportunidade aberta ou perda com publicação negada; aceite versus perda com oferta ativa → sem estado PERDIDO com venda. Testar vínculo versus edição de cliente e vínculo versus conversão legada para garantir serialização. Usar timeout limitado para detectar deadlock, sem sleeps arbitrários.
- [ ] Rodar arquivos E4 acima e confirmar falhas antes da implementação, condicionado ao banco exclusivo.
- [ ] Implementar LINK_QUOTE/SET_PRIMARY/LOSE e guardas comerciais. Ofertas são consultadas por checkout.quoteId OU checkout.request.quoteId em todos os orçamentos vinculados. Conversão verifica abertura antes de criar venda e grava ganho antes do commit; vínculo retroativo valida venda/cliente e registra só reconciliação, sem novos recebíveis. Cancelamento posterior não reabre; seleção de principal e cliente só mudam enquanto aberta. Não criar desvínculo/transferência.
- [ ] Rodar testes E4, tipagem e regressões comerciais equivalentes portadas ao setup E4 (nunca importar setup compartilhado). Commit local `feat: integra negociacoes a conversao comercial`.

## Tarefa 4 — Consulta privada e rotas autenticadas

**Files:** queries, rotas opportunities, `tests/e4/opportunity-queries.test.ts`, `tests/e4/opportunity-http.test.ts`, `tests/e4/opportunity-privacy.test.ts`.

**Interfaces:** `listOpportunities(actor,raw): Promise<Page<OpportunityDTO>>`, `getOpportunity(actor,id): Promise<OpportunityDTO>`, `listOpportunityEvents(actor,id,raw): Promise<Page<OpportunityEventDTO>>`, `opportunityOptions(actor): Promise<{customers,owners}>`, `listOpportunityQuoteCandidates(actor,raw): Promise<Page<{id,number,version,status}>>`. Candidatos exigem customerId ou opportunityId validado no servidor, busca e paginação; só orçamentos sem vínculo e cliente compatível, inclusive convertidos elegíveis. Ofertas/estados permanecem revalidados na escrita.

- [ ] Escrever testes de filtros combinados, busca por título/cliente/ORC, paginação 20/máximo 100, datas nulas ao final, desempate estável por id, history descendente estável e inativação visível; default somente abertas. Fixar relógio São Paulo nos testes de dia.
- [ ] Escrever HTTP tests: anônimo/inativo rejeitado; ADMIN/OPERATOR autorizados; payload extra GANHO/wonSaleId recusado; comandos inválidos/versão antiga não escrevem; body limitado a 32 KiB. Evento/pendingNotes/nextAction não aparecem em impressão, checkout público, catálogo ou resposta idempotente privada, inclusive após ganho; usar marcador sintético privado e inspecionar payloads públicos completos.
- [ ] Executar testes E4 para observar falhas; implementar consultas em snapshot consistente, status de orçamento pelo helper existente e wonSale.status atual. Nunca retornar modelo Prisma por spread nem incluir opportunity no DTO público de Quote/Checkout. Para detalhe interno do orçamento, usar consulta separada autenticada.
- [ ] Implementar GET/POST collection (POST CREATE), GET detail, POST commands (demais comandos), GET events/options/quote-candidates; usar requireActor, endpoint, jsonBody e schemas. Resultados paginados usam Page existente. Resolver `owner=eu` no servidor pelo actor.
- [ ] Reexecutar testes e tipagem; commit local `feat: disponibiliza consultas privadas de negociacoes`.

## Tarefa 5 — Telas e integração administrativa

**Files:** páginas/componentes do mapa, navigation, quote-detail e página de orçamento; `tests/unit/opportunity-ui.test.tsx`, fixtures sintéticas.

**Interfaces:** `OpportunityPanel({initial,filters,options,actorId})`, `OpportunityForm({initial?,options,onSaved,onCancel})`, `OpportunityDetail({initial,initialEvents,options})`, `OpportunityQuoteLink({quoteId,opportunity})`. Usar DTO/HTTP anteriores. Vínculo pelo orçamento usa seletor paginado de oportunidades abertas do mesmo cliente; não carrega todas as oportunidades.

- [ ] Ler guias locais Next e skills React/shadcn aplicáveis antes de código; reutilizar visual administrativo existente.
- [ ] Escrever testes UI de criação, filtros/página na URL, atraso/hoje, edição/interação sem apagar próxima ação, seletor paginado, perda com motivo, bloqueio de oferta ativa com orientação de retirada, reabertura e estado ganho com link/venda cancelada. Conflito preserva texto digitado e oferece recarregar explicitamente. Impedir duplo envio enquanto pendente e reutilizar operationKey até resultado conhecido.
- [ ] Executar `npx vitest run tests/unit/opportunity-ui.test.tsx`, observar falha antes de implementar. Usar ambiente de UI igual aos testes existentes, sem nova dependência.
- [ ] Implementar lista e detalhe, opções de responsáveis inativos já selecionados com aviso (não oferecidos para nova atribuição), histórico paginado, próximos contatos em data civil e links aos documentos atuais. Não duplicar InstallmentEditor/conversão; orçamento continua dono dessa ação. Campos comerciais encerrados somente leitura, interação permanece habilitada.
- [ ] Implementar Negociações na navegação e vínculo no detalhe interno do orçamento, consultado separadamente na página autenticada. Manter impressão/checkout sem os componentes privados.
- [ ] Reexecutar testes; verificar prévia sintética em desktop/375 px, teclado, foco após erro, texto longo, cliente sem orçamento e várias páginas. Registrar evidências sem dados operacionais. Commit local `feat: adiciona acompanhamento de negociacoes`.

## Tarefa 6 — Verificação e entrega local

**Files:** relatório E4 e acompanhamento; eventuais correções ficam nos arquivos responsáveis.

- [ ] Executar testes unitários E4 e regressões afetadas de quote-ui, commerce-states/dates e checkout UI em grupos controlados. Executar `npx vitest run --config vitest.e4.config.ts` somente no banco E4 validado. Se o runtime reproduzir recursão conhecida, registrar comando/resultado e testes não concluídos, sem declarar suíte completa aprovada.
- [ ] Executar `npm run typecheck`, `npm run lint`, `npm run build` com ambiente sintético de build sem acesso operacional; `git diff --check`. Confirmar build não executa consultas operacionais. Executar verificações de schema/SQL e ausência de backfill; não inferir teste de migração a partir de prisma generate.
- [ ] Solicitar revisão independente da branch conforme skill requesting-code-review; fornecer desenho/plano/diff e limites, com foco em todos os caminhos de fechamento, privacidade e concorrência. Corrigir achados e repetir apenas testes afetados. Sem troca de modelo não autorizada.
- [ ] Autorrevisar cobertura: critérios 1–3 do desenho → tarefas 1/2/4/5; 4–7 → 3/4/5; 8 → 4/5; 9 → 1/6. Confirmar nenhum DTO público contém dados internos.
- [ ] Atualizar ROADMAP/PENDENCIAS preservando histórico e alterações contemporâneas; registrar implementado, validado, limites, commit/worktree/base, versão, ausência de PR/merge/publicação e migração operacional pendente. Nenhuma caixa de E4.2/E4.3 marcada como entregue.
- [ ] Commit local selecionado de evidências/documentação; entregar links e estado real. Banco indisponível impede afirmar validação de integração, mas não autoriza substituir por banco compartilhado ou publicar.

## Autorrevisão e passagem para execução

Plano conferido contra desenho aprovado: domínio, vínculos, identidade, histórico, permissões, datas, replay, fechamento pelos dois fluxos, serialização global, privacidade e migração aditiva têm tarefas e verificações próprias. As cinco classes de Review Focus estão vinculadas às tarefas indicadas. Não há tarefas autônomas de E4.2/E4.3 ou integração de E1–E3.

Execução ainda não iniciada. Recomendação: execução direta neste chat, em worktree própria, com revisão independente ao final; os serviços comerciais compartilham transação e guardas e exigem mudanças coordenadas. Alternativa disponível: execução por subagentes com revisão por tarefa, com maior custo de contexto. Aguardar revisão do plano e escolha do método antes de implementar, conforme writing-plans.

## Registro de execução em 28/10/2026

Execução direta aprovada pelo usuário. Implementação local das tarefas 1–5 realizada; tarefa 6 com 28 testes focados/regressões, tipagem, lint, build e prévia aprovados, revisão independente e correções registradas no [relatório](../reviews/2026-10-28-e4-negociacoes.md). Integrações/migração real não executadas funcionalmente por banco E4 indisponível; suíte completa sem conclusão por recursão Vitest. Checkboxes que incluem essas verificações permanecem abertos; não são autorização para refazer implementação. Retomar pelo relatório e commits da branch `codex/e4-negociacoes`, até `b7a4da2`, sem recriar módulos. Sem PR, merge ou publicação.

### Validação posterior e PR autorizadas em 28/10/2026

Migração real e 21 integrações aprovadas em PostgreSQL E4 descartável; cinco rodadas finais de 10 casos com locks reais aprovadas. 31 testes unitários/UI/regressões, tipagem, lint e build aprovados. PR #23 em rascunho na versão 1.6.0: https://github.com/bsgirardi/appb2t/pull/23. Relatório atualizado em ../reviews/2026-10-28-e4-validacao-pr.md. Banco descartável removido; sem migração operacional, merge ou publicação. Limite de suíte unitária completa por recursão Vitest continua registrado.
