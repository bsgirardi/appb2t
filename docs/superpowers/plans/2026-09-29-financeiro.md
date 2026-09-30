# Financeiro interno — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar contas a pagar/receber, baixas parciais, estornos, transferências, saldos e fluxo de caixa realizado/projetado, restritos a administradores.

**Architecture:** Reaproveitar FinancialEntry e SaleInstallment da entrega comercial; liquidações criam movimentos imutáveis em transações idempotentes. Saldos e estados são derivados dos movimentos, com bloqueios compartilhados entre cancelamento comercial e recebimento financeiro.

**Tech Stack:** Next.js instalado, React, TypeScript, Prisma/PostgreSQL, Zod, decimal.js, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-financeiro-design.md` e `2026-09-29-gestao-interna-index.md`, no mesmo diretório.

**Pré-requisito:** entregas 1 e 2 verificadas. Execução direta já escolhida; plano aguarda revisão escrita.

## Global Constraints

- Páginas `/financeiro` e APIs correspondentes exigem ADMIN no servidor.
- OPERATOR vê apenas o resumo de recebimento da venda que já pode consultar.
- Não há emissão de cobrança, movimentação bancária real, integração externa, escrituração fiscal ou conciliação automática.
- O valor é positivo e armazenado em duas casas decimais. Saldos iniciais/ajustes podem ser negativos, nos campos próprios.
- Não excluir definitivamente obrigações. Não editar/apagar o movimento original em um estorno.
- Não aceitar baixa futura; eventos futuros são projeções da obrigação.
- Não aceitar movimentação anterior à data do saldo inicial da conta.
- Uma conta com saldo diferente de zero não pode ser inativada.
- O sistema permite saldo negativo em contas ativas, exibindo alerta.
- Paginação padrão 25 e máximo 100. Exportação limitada a 10000 registros por solicitação.
- Arredondamento HALF_UP, limites Decimal(18,2), datas civis, autorização e versão conforme especificações compartilhadas.

## Review Focus

- Cliques repetidos e retry após timeout: um único movimento por baixa/transferência (tarefa 3).
- Receber e cancelar a mesma venda ao mesmo tempo: nunca deixar recebimento vigente em venda cancelada (tarefas 2–3).
- Estorno em data posterior: histórico do dia original permanece e a reversão aparece na data efetiva (tarefas 3 e 5).
- Transferência estornada de um lado só: recusar e manter ambas as contas consistentes (tarefa 4).
- Relatório paginado/exportação com fórmulas e recebíveis parciais vencidos: totais completos, projeção sem duplicação e CSV seguro (tarefa 5).

## Estrutura e contratos compartilhados

Reutilizar dinheiro/datas/parcelas de `src/domain/commerce` e `Page<T>` de `src/domain/shared/pagination.ts`. Criar `src/domain/finance/{validation,balances,projection,csv}.ts` e estender `types.ts`. Serviços separados em `src/server/finance/{accounts,categories,entries,settlements,transfers,reports,audit,commands}.ts`.

DTOs retornam dinheiro como string, datas civis `YYYY-MM-DD`, timestamp ISO, id/version para registros editáveis. `FinanceFilter = { dateFrom?, dateTo?, accountId?, categoryId?, kind?, state?, counterparty?, page?, pageSize? }` é validado. `ReceiptSummary` mantém `{total, received, pending, overdue}` da entrega comercial.

Todas as mutações financeiras chamam assertAdmin no serviço além de requireAdmin na rota. A ordem global de bloqueios é operação idempotente → quote (quando aplicável) → sale → entries por id → accounts por id. Alterações só de conta começam em accounts; nenhuma operação adquire sale/entry depois de já adquirir account.

### Task 1: Contas, categorias e trilha imutável

**Arquivos:** criar `src/server/finance/{accounts,categories,audit,commands}.ts`, domínio financeiro acima, `tests/unit/finance-balances.test.ts`, `tests/integration/finance-accounts.test.ts`; alterar schema/setup e criar migração `202609290007_finance_foundation`.

**Interfaces:** `AccountInput = { name: string; type:'CASH'|'BANK'|'OTHER'; openingBalance: string; openingDate: string; active: boolean; expectedVersion?: number }`; `saveAccount(actor,id:string|undefined,input:unknown): Promise<AccountDTO>`; `getAccountBalance(tx,accountId:string,asOf:string): Promise<string|null>` retorna null antes da abertura. CategoryInput `{name,kind:'REVENUE'|'EXPENSE',active,expectedVersion?}` e `saveCategory(actor,id,input): Promise<CategoryDTO>`. `recordAdjustment(actor,{accountId,amount,effectiveDate,reason,operationKey,expectedVersion}): Promise<MovementDTO>`; amount assinado, não zero.

`listAccounts(actor: Actor): Promise<AccountDTO[]>` inclui saldo atual e versão; `listCategories(actor: Actor): Promise<CategoryDTO[]>` inclui ativos/inativos para administração. Todo acesso verifica ADMIN, inclusive essas leituras.

**Comandos compartilhados desde esta tarefa:** `runFinanceCommand<T>(actor: Actor,key: string,type: string,payload: unknown,action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>`. Canonicalizar payload validado, adquirir `lockOperation(tx,'finance:'+key)`, comparar hash e retornar resultado anterior ou executar/gravar resultado na mesma transação. Assim ajustes e lotes já são idempotentes antes de implementar baixas.

- [ ] Testar saldo inicial `"100.00"`, movimentos `+"25.50"`/`-"10.00"` e saldo `"115.50"`; saldo anterior à abertura é null. Bloquear alteração de abertura depois de movimentação e inativação com saldo diferente de zero. Permitir conta negativa com alerta; rejeitar ajuste zero/futuro/anterior à abertura, operador e categoria incompatível.
- [ ] Executar `npx vitest run tests/unit/finance-balances.test.ts tests/integration/finance-accounts.test.ts`; observar falhas iniciais.
- [ ] Criar FinancialAccount, FinancialCategory, CashMovement, FinancialAuditEvent, FinanceCommand, Settlement e FinancialTransfer nesta migração. Settlement contém entryId, accountId, amount positivo, method, effectiveDate, notes e vínculo único ao movimento original. FinancialTransfer contém id, fromAccountId, toAccountId, amount, effectiveDate, description e vínculos às pernas. Movimento contém amount assinado, effectiveDate civil, createdAt, actorId, accountId, categoryId opcional, kind, settlementId?, transferId?, reversalOfId? unique. Proibir mutação de movimentos pela API; corrigir por inversão. Criar categoria sistema de receita com código único `SALE_REVENUE` e atribuir aos recebíveis comerciais existentes, preservando valores/datas.
- [ ] Implementar contas/categorias com versões e bloqueio de conta para saldo/inativação. Guardar saldo inicial na conta (não duplicar como movimento), histórico para mudanças pré-movimentação e ajustes posteriores. Implementar auditoria de alterações sem guardar credenciais. Usar parseMoney assinado somente em abertura/ajuste.
- [ ] Reexecutar testes e confirmar recusa de inativação concorrente com movimento que deixa saldo não zero. Commit: `feat: criar contas e registros financeiros`.

### Task 2: Obrigações avulsas e recebíveis comerciais

**Arquivos:** estender `src/server/finance/entries.ts`, `src/domain/finance/{types,validation}.ts`; criar `tests/integration/finance-entries.test.ts`, `tests/unit/finance-entries.test.ts`; alterar serviço de vendas para usar a agregação compartilhada quando disponível.

**Interfaces:** `EntryInput = { kind:'RECEIVABLE'|'PAYABLE'; description; counterparty; customerId?; categoryId; amount; dueDate; expectedVersion? }`; `createEntry(actor,input): Promise<EntryDTO>`; `createEntryGroup(actor,input,installments: InstallmentInput[],operationKey:string): Promise<EntryDTO[]>`; `updateEntry(actor,id,input): Promise<EntryDTO>`; `cancelEntry(actor,id,expectedVersion,reason): Promise<EntryDTO>`; `listEntries(actor,filter): Promise<Page<EntryDTO>>`. EntryDTO acrescenta paidAmount, remainingAmount, state, overdue e origem comercial. `entryState(amount, netSettled, canceled, dueDate, today)` é puro.

`getEntry(actor: Actor,id:string): Promise<EntryDTO & { settlements: SettlementDTO[]; events: FinancialEventDTO[] }>` fornece o detalhe e histórico autorizado; listagens não carregam todo o histórico por linha.

- [ ] Testar obrigação de R$ 100 com R$ 30 liquidados: saldo `"70.00"`, estado PARCIAL e indicador vencido quando aplicável. Testar avulso parcelado somando valor exato; recebível de venda não duplica e não aceita edição livre de origem/valor/vencimento. Impedir cancelamento/alteração de valor quando existir baixa vigente.
- [ ] Executar `npx vitest run tests/unit/finance-entries.test.ts tests/integration/finance-entries.test.ts`; confirmar falhas.
- [ ] Implementar lançamentos avulsos, lotes idempotentes de até 120 parcelas e restrições por origem. Recebível comercial usa categoria SALE_REVENUE; não passa pelo fluxo de criação avulsa. Estados são projeções, não campos livremente alteráveis. Cancelamento de avulso preserva registros e audit, usando lock de entry; comercial delega a cancelSale.
- [ ] Atualizar `getSaleReceiptSummary(tx,saleId)` para agregar liquidações não estornadas na tabela Settlement criada na tarefa 1, mantendo o contrato da entrega 2. Os testes desta tarefa podem inserir fixtures de liquidações/movimentos pela camada de teste, sem depender do serviço de baixa ainda não implementado.
- [ ] Reexecutar testes de entries e `tests/integration/sales.test.ts`; confirmar que obrigações não criam caixa. Commit: `feat: gerenciar contas a pagar e receber`.

### Task 3: Baixas parciais e estornos idempotentes

**Arquivos:** criar `src/server/finance/settlements.ts`, `tests/integration/finance-settlements.test.ts`, `tests/integration/finance-concurrency.test.ts`; reutilizar commands da tarefa 1 e ajustar `src/server/commerce/locks.ts` e cancelSale para o protocolo compartilhado.

**Interfaces:** `SettlementInput = { entryId, accountId, amount, effectiveDate, method:'PIX'|'CASH'|'CARD'|'BOLETO'|'TRANSFER'|'OTHER', notes?, expectedVersion, operationKey }`; `settleEntry(actor,input:unknown): Promise<SettlementDTO>`; `reverseSettlement(actor,id,{reason,effectiveDate,operationKey}): Promise<SettlementDTO>`; `runFinanceCommand(actor,key,type,payload,action): Promise<T>` controla hash canônico do payload normalizado, transação e replay. Settlement contém entryId, amount positivo, método, conta, data e uma relação única ao movimento original; reversão é determinada pelo movimento inverso vinculado.

- [ ] Testar baixa de `"30.00"` em obrigação `"100.00"`: saldo `"70.00"` e movimento positivo no recebível/negativo no pagável. Testar duas baixas concorrentes de `"80.00"` com apenas uma aceita; key repetida cria um movimento; key reutilizada com novo valor gera CONFLICT.
- [ ] Testar estorno de uma baixa: um movimento inverso e obrigação reaberta; segundo estorno recusado/replay da mesma operação retorna original. Datas inválidas e conta inativa recusadas. Concorrer cancelamento de venda com recebimento e exigir um estado final consistente, nunca cancelada com pagamento vigente.
- [ ] Executar `npx vitest run tests/integration/finance-settlements.test.ts tests/integration/finance-concurrency.test.ts`; observar falhas iniciais.
- [ ] Implementar operação idempotente sob lock por chave antes dos locks de sale/entry/accounts. Revalidar saldo, versão e conta dentro da transação; inserir Settlement, CashMovement e auditoria juntos. Não usar agregado lido antes do lock para autorizar valor. Obter saleId via origem e confirmar novamente após o lock; operações avulsas usam somente entry/account.
- [ ] Implementar estorno sem alterar original, com reversalOfId único e data entre baixa e hoje, exigindo conta ativa. Cancelamento e resumo comercial usam o mesmo lock e a mesma definição de liquidação vigente. Registros de FinanceCommand ficam ligados ao autor e resultado, sem expor payload a visitantes.
- [ ] Reexecutar testes, inclusive falha injetada entre Settlement e CashMovement com rollback sem saldo parcial. Commit: `feat: registrar baixas e estornos com idempotencia`.

### Task 4: Transferências e correções de caixa

**Arquivos:** criar `src/server/finance/transfers.ts`, `tests/integration/finance-transfers.test.ts`; usar FinancialTransfer da migração de fundação, sem segunda criação de schema.

**Interfaces:** `TransferInput = { fromAccountId,toAccountId,amount,effectiveDate,description,operationKey }`; `transferFunds(actor,input): Promise<TransferDTO>`; `reverseTransfer(actor,id,{reason,effectiveDate,operationKey}): Promise<TransferDTO>`; `reverseAdjustment(actor,movementId,{reason,effectiveDate,operationKey}): Promise<MovementDTO>`. TransferDTO identifica grupo e dois movimentos; transferências não recebem categoria de receita/despesa operacional.

- [ ] Testar R$ 25 transferidos entre contas de R$ 100 e R$ 50: saldos `"75.00"` e `"75.00"`, consolidado `"150.00"`. Testar replay, mesma conta recusada, falha na segunda perna com rollback e estorno restaurando ambas as contas.
- [ ] Executar `npx vitest run tests/integration/finance-transfers.test.ts`; confirmar falhas.
- [ ] Implementar grupo com duas pernas em transação sob locks de contas ordenados. Revalidar datas contra abertura de ambas, estado ativo e valor positivo. Estorno somente pelo grupo; proibir rota genérica de reversão de uma perna. Ajustes só podem ser revertidos pelo fluxo próprio com justificativa.
- [ ] Reexecutar testes de transferências, ajustes e concorrência; confirmar que saldo negativo é permitido com alerta e não cria “crédito” externo. Commit: `feat: transferir e ajustar saldos com historico`.

### Task 5: Painel, relatórios e CSV

**Arquivos:** criar `src/server/finance/reports.ts`, `src/domain/finance/{projection,csv}.ts`, `tests/unit/finance-projection.test.ts`, `tests/unit/finance-csv.test.ts`, `tests/integration/finance-reports.test.ts`.

**Interfaces:** `getFinanceDashboard(actor,filter): Promise<FinanceDashboardDTO>` com balance, receivablePending, receivableOverdue, payablePending, payableOverdue, realizedIn, realizedOut; `listMovements(actor,filter): Promise<Page<MovementDTO> & { totals: MovementTotals }>`; `getCashFlow(actor,filter): Promise<{ realized: CashDay[]; projected: CashDay[]; overdueNet: string }>`; CashDay `{ date, incoming, outgoing, transfersNet, adjustmentsNet, closingBalance }`; `exportFinanceCsv(actor,filter): Promise<string>`.

- [ ] Testar saldo inicial 100, recebível vencido 80 com 30 recebidos e pagável vencido 20: bloco vencidos líquido `"30.00"`; projeção não inclui novamente os 30 já recebidos. Testar relatório do dia original com baixa e do dia posterior com estorno, preservando ambos.
- [ ] Testar 26 registros/página 25: totais abrangem 26. Categoria/conta inativa não some do histórico. Transferências não inflam entradas/saídas operacionais. CSV neutraliza `=`, `+`, `-`, `@`, tabulação e retorno de carro em células textuais, inclusive após espaços iniciais; campos numéricos são emitidos por formatador controlado.
- [ ] Executar `npx vitest run tests/unit/finance-projection.test.ts tests/unit/finance-csv.test.ts tests/integration/finance-reports.test.ts`; confirmar falhas.
- [ ] Implementar agregações e listagens em leitura RepeatableRead; incluir reversões nas datas efetivas, filtros parametrizados e saldos antes da abertura como desconhecidos. Projeção começa em hoje com saldo atual e bloco vencidos, somando apenas saldos abertos futuros, sem transferências comerciais artificiais.
- [ ] Implementar CSV UTF-8 com separador ponto e vírgula, escaping de aspas/quebras, proteção de fórmulas e limite de 10000 registros: buscar no máximo 10001 e recusar com orientação se exceder. Não truncar silenciosamente nem exportar dados fora dos filtros.
- [ ] Reexecutar testes e confirmar mesmos totais entre consulta/exportação. Commit: `feat: apresentar fluxo de caixa e relatorios`.

### Task 6: Interface financeira e autorização ponta a ponta

**Arquivos:** criar `src/components/finance/{finance-dashboard,entry-panel,entry-form,settlement-form,account-panel,category-panel,transfer-form,movement-panel,cash-flow}.tsx`; criar páginas privadas `src/app/(private)/financeiro/{page,layout}.tsx`, `src/app/(private)/financeiro/contas/page.tsx`, `src/app/(private)/financeiro/lancamentos/page.tsx`, `src/app/(private)/financeiro/movimentos/page.tsx`; criar `route.ts` em cada caminho de API da tabela abaixo, relativo a `src/app/api/finance/`. Criar `tests/unit/finance-ui.test.tsx`, `tests/integration/finance-http.test.ts`; alterar shell e detalhe de venda.

| Diretório de route.ts | Métodos e serviço |
| --- | --- |
| accounts | GET listAccounts; POST saveAccount |
| accounts/[id] | PUT saveAccount, incluindo ativação com versão |
| accounts/[id]/adjustments | POST recordAdjustment |
| categories | GET listCategories; POST saveCategory |
| categories/[id] | PUT saveCategory |
| entries | GET listEntries; POST createEntry |
| entries/groups | POST createEntryGroup |
| entries/[id] | GET getEntry; PUT updateEntry |
| entries/[id]/cancel | POST cancelEntry |
| settlements | POST settleEntry |
| settlements/[id]/reverse | POST reverseSettlement |
| transfers | POST transferFunds |
| transfers/[id]/reverse | POST reverseTransfer |
| movements | GET listMovements |
| movements/[id]/reverse | POST reverseAdjustment; recusar outros tipos de movimento |
| dashboard | GET getFinanceDashboard |
| cash-flow | GET getCashFlow |
| export | GET exportFinanceCsv |

**Interfaces:** páginas e rotas chamam requireAdmin; serviços reforçam assertAdmin. DTOs seguem tarefas anteriores; envelopes de erro existentes. Formulários mantêm operationKey por intenção e preservam payload em retry. Não criar endpoint para editar/apagar movimento ou evento histórico.

- [ ] Testar todas as famílias de rotas com visitante (401), operador (403), ADMIN e sessão revogada; incluir exportação, reversão e acesso direto às páginas. Testar origem estrangeira recusada antes de mutação, overflow e versão antiga.
- [ ] Testar UI de baixa parcial, registro versus envio real de dinheiro claramente rotulado, justificativa de estorno, conta inativa, saldo negativo, filtros, totais completos e rascunho preservado. Link financeiro só aparece para ADMIN; OPERATOR mantém resumo comercial sem dados de contas.
- [ ] Executar `npx vitest run tests/unit/finance-ui.test.tsx tests/integration/finance-http.test.ts`; observar falhas iniciais.
- [ ] Implementar navegação, dashboard e formulários com os tokens da entrega 1. Mostrar “previsto” e “realizado” de forma explícita, estado vencido em texto e data de referência. Formulário de baixa descreve que registra um pagamento realizado fora da aplicação. Categoria de sistema não pode ser apagada/desativada pela interface.
- [ ] Reexecutar testes e percorrer venda → parcela → baixa → estorno → cancelamento; conferir efeito no resumo da venda e em contas. Commit: `feat: integrar painel financeiro restrito a administradores`.

### Task 7: Aceitação financeira e operação

**Arquivos:** atualizar README, `docs/VALIDACAO.md`, fixtures e este plano.

- [ ] Aplicar migrações sobre banco de teste com vendas/parcelas existentes; confirmar ids, valores, datas e unicidade preservados.
- [ ] Executar `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`; exigir aprovação integral. As provas de concorrência usam PostgreSQL real, não mocks do repositório.
- [ ] No Docker isolado, executar venda e recebimento parcial, despesa, transferência, ajuste, estornos e projeção; reiniciar serviços e conferir saldo/histórico. Fazer backup e restauração em novo banco de validação e comparar obrigações/movimentos, preservando o banco de origem.
- [ ] Verificar computador/celular, temas claro/escuro, teclado, impressão comercial e exportação CSV. Registrar resultados reais e limitações; não afirmar integração bancária/fiscal.
- [ ] Realizar revisão independente completa e corrigir achados materiais com teste RED→GREEN. Documentar limites, permissões, saldo inicial, parcelamento, estorno, cancelamento e backup. Commit: `docs: validar financeiro e integracao com vendas`.

## Revisão do plano

Cobertura: cadastros e audit (1), obrigações (2), baixas/estornos/idempotência (3), transferências/ajustes (4), saldos/projeção/exportação (5), permissões e interface (6), migração/operação (7). Protocolos de bloqueio, origem comercial e resumo são os mesmos da entrega 2. Nenhuma tarefa duplica recebíveis nem transforma confirmação de venda em dinheiro recebido.
