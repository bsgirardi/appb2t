# Vendas e orçamentos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar clientes, orçamentos imprimíveis, vendas operacionais e parcelas a receber sem registrar caixa antecipadamente.

**Architecture:** Domínio comercial puro para dinheiro, datas, totais e estados; serviços transacionais para documentos, snapshots e conversão. A camada mínima de FinancialEntry é criada nesta entrega, e a entrega financeira acrescenta liquidações e movimentos sem duplicar parcelas.

**Tech Stack:** Next.js instalado, React, TypeScript, Prisma/PostgreSQL, Zod, decimal.js, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-vendas-orcamentos-design.md` e `2026-09-29-gestao-interna-index.md`, no mesmo diretório.

**Pré-requisito:** entrega 1 aprovada nos testes, com Product.price como preço final e CompanyIdentityDTO. Execução direta já escolhida; plano aprovado em 29/09/2026.

## Global Constraints

- ADMIN e OPERATOR podem operar clientes, orçamentos e vendas.
- Liquidação, estorno e administração de contas financeiras ficam exclusivamente para ADMIN na entrega 3.
- Não há aceite público online, envio de mensagens, integração fiscal, checkout, estoque automático ou cobrança externa nesta etapa.
- Limite de 100 linhas por documento; quantidade inteira de peças de 1 a 100000.
- Total = subtotal − desconto + frete, estritamente positivo; quantias respeitam Decimal(18,2).
- Gravar snapshots do nome/descrição do produto, preço unitário, dados públicos da empresa e dados do cliente ao emitir.
- Validade é inclusiva até o fim da data no fuso America/Sao_Paulo.
- Cada orçamento vincula-se a no máximo uma venda, inclusive em concorrência.
- Antes de confirmar uma venda, informar de 1 a 120 parcelas, valores e vencimentos.
- A confirmação constitui recebíveis exatamente uma vez; não movimenta saldo de caixa e não presume pagamento.
- Não excluir definitivamente documentos/histórico; autorização no servidor, datas civis e moeda decimal conforme especificação compartilhada.

## Review Focus

- R$ 100,00 dividido em três parcelas: soma exata, sem parcela zero ou centavo perdido (tarefa 1).
- Virada de mês/ano e meia-noite de São Paulo: validade/datas não deslocam um dia (tarefa 1).
- Alteração de produto ou identidade após emissão: impressão mantém o snapshot anterior (tarefa 3).
- Repetição concorrente de conversão: uma venda e um recebível por parcela (tarefa 4).
- Cancelamento versus recebimento posterior: ambos precisam do mesmo protocolo de bloqueio (tarefas 4–5 e contrato financeiro).

## Estrutura e contratos

Criar `src/domain/commerce/{types,validation,totals,dates,installments,states}.ts`, `src/server/{customers,quotes,sales}.ts`, `src/server/finance/entries.ts`, `src/server/commerce/{snapshots,locks,audit}.ts`. Interfaces de lista usam `Page<T> = { items: T[]; total: number; page: number; pageSize: number }` em `src/domain/shared/pagination.ts` e filtro validado, padrão 25/máximo 100.

`DocumentInput` contém customerId, items, discount, shipping, paymentTerms e internalNotes; `DocumentItemInput = { productId?: string; description: string; quantity: number; unitPrice: string }`. `DocumentTotals = { subtotal: string; discount: string; shipping: string; total: string }`. `InstallmentInput = { number: number; amount: string; dueDate: string }` usa data `YYYY-MM-DD`. `CustomerSnapshot` copia nome, tipo, documento, e-mail, telefone e endereço, sem notas; `DocumentItemSnapshot` copia productId opcional, nome/descrição, quantidade e preço unitário. DTOs privados retornam moeda como string e timestamps ISO; bytes/imagens do produto não acompanham itens comerciais.

### Task 1: Dinheiro, datas, parcelas e transições

**Arquivos:** criar domínio commerce e paginação acima; criar `tests/unit/{commerce-totals,commerce-dates,commerce-installments,commerce-states}.test.ts`.

**Interfaces:** `calculateDocumentTotals(items: DocumentItemInput[], discount: string, shipping: string): DocumentTotals`; `parseMoney(raw: string, options?: { positive?: boolean; signed?: boolean }): string`; `todaySaoPaulo(now: Date): string`; `parseCivilDate(raw: string): string`; `addMonthsClamped(date: string, months: number): string`; `splitInstallments(total: string, count: number, firstDueDate: string): InstallmentInput[]`; `validateInstallments(total: string, rows: InstallmentInput[]): InstallmentInput[]`; `effectiveQuoteStatus(status: QuoteStatus, validUntil: string, today: string): QuoteStatus` e `assertSaleTransition(from: SaleStatus,to: SaleStatus): void`. Enums seguem os estados em português da especificação como valores internos estáveis.

- [ ] Testar totais com 2×10,50 + 1×5,00, desconto 1,00 e frete 3,00: `expect(total).toBe("28.00")`. Rejeitar desconto maior que subtotal, total zero, 101 itens, quantidade fracionária/zero, overflow, NaN e preço com três casas.
- [ ] Testar `splitInstallments("100.00",3,"2028-01-31")` com valores `["33.34","33.33","33.33"]` e datas `["2028-01-31","2028-02-29","2028-03-31"]`. Rejeitar `"0.02"` em 3 parcelas e soma divergente. Testar data inexistente e instante `2026-09-30T02:59:59Z` como `2026-09-29` em São Paulo; orçamento válido nesse dia não expira antes da virada.
- [ ] Executar `npx vitest run tests/unit/commerce-*.test.ts` usando glob suportado pelo shell ou os quatro caminhos explícitos; confirmar falhas por funções ausentes.
- [ ] Implementar dinheiro em Decimal, centavos distribuídos por índice e datas civis sem depender do fuso da máquina. Data mensal parte sempre da data original. Rejeitar transições operacionais inválidas, inclusive cancelamento de ENTREGUE; permitir retorno explícito de emitido não convertido a RASCUNHO.
- [ ] Reexecutar os quatro arquivos e confirmar aprovação. Commit: `feat: definir regras comerciais e parcelamento`.

### Task 2: Cadastro privado de clientes

**Arquivos:** criar `src/domain/customers/{types,validation}.ts`, `src/server/customers.ts`, `src/components/customers/{customer-panel,customer-form}.tsx`, `src/app/(private)/clientes/page.tsx`, `src/app/api/customers/route.ts`, `src/app/api/customers/[id]/route.ts`, `tests/integration/customers.test.ts`, `tests/unit/customers-ui.test.tsx`; alterar schema/setup e criar migração `202609290004_customers`.

**Interfaces:** CustomerInput `{ name, type: 'PERSON'|'COMPANY', document?, email?, phone?, address?, notes?, active }`; CustomerDTO acrescenta id/version. `saveCustomer(actor: Actor, id: string | undefined, input: unknown): Promise<CustomerDTO>` (atualização exige expectedVersion); `listCustomers(actor: Actor, filter: unknown): Promise<Page<CustomerDTO>>`; `getCustomer(actor: Actor,id: string): Promise<CustomerDTO>`.

- [ ] Testar ambos os perfis, visitante recusado, normalização de documento, e-mail inválido, cliente sem documento aceito, versão antiga recusada, busca/paginação e inativação preservando registros.
- [ ] Executar `npx vitest run tests/integration/customers.test.ts tests/unit/customers-ui.test.tsx`; confirmar falhas esperadas.
- [ ] Implementar modelo, filtros parametrizados, guardas por rota/página e formulário. Usar nome 2–160, documento até 32 após normalização, e-mail até 254, telefone até 50, endereço até 500 e notas até 2000. Endpoints GET/POST em coleção e GET/PUT/PATCH em item; PATCH de estado verifica versão.
- [ ] Reexecutar testes e confirmar que inativação não apaga dados. Commit: `feat: cadastrar clientes da equipe`.

### Task 3: Orçamento, snapshots e impressão

**Arquivos:** criar `src/server/quotes.ts`, `src/server/commerce/{snapshots,audit}.ts`, `src/components/commerce/{document-items,quote-form,quote-panel,quote-detail,document-print}.tsx`, `src/app/(private)/orcamentos/page.tsx`, `src/app/(private)/orcamentos/[id]/page.tsx`, `src/app/(private)/orcamentos/[id]/imprimir/page.tsx`, `src/app/api/quotes/route.ts`, `src/app/api/quotes/[id]/route.ts`, `src/app/api/quotes/[id]/transition/route.ts`, `src/app/api/quotes/[id]/logo/route.ts`, `tests/integration/quotes.test.ts`, `tests/unit/quote-ui.test.tsx`; alterar schema/setup, `src/lib/http.ts` e criar migração `202609290005_quotes`.

**Interfaces:** `QuoteInput = DocumentInput & { validUntil: string }`; rascunho usa `QuoteDraftInput = Partial<QuoteInput>`, validando os campos presentes, e emissão exige QuoteInput completo. `QuoteDTO` contém id, number, status, version, input, totals (null se rascunho incompleto), snapshot (null antes de emitir) e events. Snapshot `{ company: CompanyIdentityDTO; customer: CustomerSnapshot; items: DocumentItemSnapshot[]; issuedAt: string }`, com logo de emissão imutável. `saveQuote(actor,id: string|undefined,input: unknown): Promise<QuoteDTO>`; `transitionQuote(actor,id: string, expectedVersion: number, action: 'ISSUE'|'APPROVE'|'REJECT'|'REOPEN'): Promise<QuoteDTO>`; `getQuote(actor,id): Promise<QuoteDTO>`; `listQuotes(actor,filter): Promise<Page<QuoteDTO>>`. Referências obrigatórias de emissão são opcionais no modelo de rascunho e exigidas na transição, sem cliente fictício de preenchimento.

- [ ] Testar emissão sem cliente ativo/linha/condições recusada; preço vigente copiado só na seleção; alteração de produto/cliente/aparência não altera impressão emitida; validade inclusiva; reabertura remove aprovação; CONVERTIDO não reabre. Testar dados internos ausentes da impressão e acesso anônimo recusado.
- [ ] Executar `npx vitest run tests/integration/quotes.test.ts tests/unit/quote-ui.test.tsx`; observar falhas.
- [ ] Criar Quote, QuoteItem, CommerceEvent e arquivo imutável de logo de documento para preservar a imagem, não só uma URL mutável. Numerar ORC com sequência de banco. Gravar snapshot/evento/estado sob versão e transação. Snapshot do cliente usa apenas campos comerciais, excluindo notes. Reabertura mantém eventos anteriores e prepara nova emissão sem mudar documentos convertidos.
- [ ] Ampliar `jsonBody(request, options?: { maxBytes: number })`, mantendo padrão 16 KiB. Apenas rotas comerciais aceitam até 256 KiB, com limites de 100 linhas, descrição por linha até 1000, paymentTerms até 2000 e internalNotes até 2000. Validar tamanho efetivo do stream; não aumentar globalmente os limites anteriores.
- [ ] Implementar lista, detalhe, editor de linhas, totais, transições e página de impressão privada. Impressão usa tema claro próprio e snapshot, sem notas internas/custos. Aprovação/envio são registros internos e não enviam mensagens. Reexecutar testes e `tests/unit/http.test.ts`.
- [ ] Commit: `feat: emitir e acompanhar orcamentos`.

### Task 4: Venda, conversão e recebíveis atômicos

**Arquivos:** criar `src/server/sales.ts`, `src/server/finance/entries.ts`, `src/server/commerce/locks.ts`, `src/domain/finance/types.ts`, `tests/integration/sales.test.ts`; alterar schema/setup e criar migração `202609290006_sales_entries`.

**Interfaces:** `SaleDTO` contém id, number, quoteId?, status, version, document, totals, installments e receiptSummary `{ total, received, pending, overdue }`. `saveSaleDraft(actor,id: string|undefined,input: unknown): Promise<SaleDTO>`; `confirmSale(actor,id:string,expectedVersion:number,installments:InstallmentInput[],operationKey:string): Promise<SaleDTO>`; `convertQuote(actor,quoteId:string,expectedVersion:number,installments:InstallmentInput[],operationKey:string): Promise<SaleDTO>`; `getSale(actor,id): Promise<SaleDTO>`; `listSales(actor,filter): Promise<Page<SaleDTO>>`. `createSaleReceivables(tx: Prisma.TransactionClient,saleId:string): Promise<void>` é interno e exige a transação de confirmação.

**Contrato financeiro persistente:** FinancialEntry `{ id, kind:'RECEIVABLE'|'PAYABLE', amount:Decimal, dueDate:Date(civil), description, counterparty, customerId?, saleInstallmentId? unique, canceledAt?, version, createdAt, updatedAt }`; SaleInstallment `{ id, saleId, number, amount, dueDate }` com par saleId/number único. Sem coluna editável de “recebido”; até a entrega 3 o recebido é zero. A entrega 3 acrescentará relações, categoria e agregações.

**Bloqueio compartilhado:** `lockOperation(tx,key:string): Promise<void>` adquire advisory lock da operação; depois `lockCommerce(tx,{saleId?,quoteId?,entryIds?:string[]}): Promise<void>` bloqueia entidades na ordem quote, sale, entries ordenadas por id. Operações financeiras de uma parcela precisam adquirir sale antes de entry; nunca o inverso. Locks de contas, introduzidos no financeiro, vêm por último. Alterações de documento verificam versão sob esse bloqueio. Operação comercial armazena chave idempotente, tipo, hash do payload e resultado na mesma transação; chaves usam namespace `commerce:` para separar comandos financeiros.

- [ ] Testar duas conversões concorrentes do mesmo orçamento: `expect(await saleCountForQuote(id)).toBe(1)` e três recebíveis para três parcelas. Mesma operação repetida retorna a venda original; chave com conteúdo diferente gera CONFLICT. Testar venda direta, total negociado e parcelas com centavos; confirmar não cria caixa recebido.
- [ ] Executar `npx vitest run tests/integration/sales.test.ts`; observar falhas.
- [ ] Criar Sale, SaleItem, SaleInstallment, FinancialEntry e CommercialOperation com unicidade de quoteId e operationKey. Confirmar e converter validam estado, data e parcelamento no servidor, congelam conteúdo e criam obrigações/events atomicamente. Conversão verifica idempotência antes de rejeitar versão já consumida, sem aceitar novo conteúdo para uma chave anterior.
- [ ] Criar cancelamento `cancelSale(actor,id,expectedVersion,reason): Promise<SaleDTO>`: versão, estado pré-entrega e total recebido vigente zero sob bloqueio compartilhado. Cancelar recebíveis e registrar evento na mesma transação. Definir `getSaleReceiptSummary(tx,saleId)` nesta camada, inicializado a zero e substituído por agregação de Settlement na entrega 3.
- [ ] Reexecutar testes, inclusive rollback de falha após inserir venda e antes de terminar parcelas. Commit: `feat: converter vendas em recebiveis sem duplicacao`.

### Task 5: Operação de vendas e integração da interface

**Arquivos:** criar `src/components/commerce/{sale-panel,sale-form,sale-detail,installment-editor}.tsx`, `src/app/(private)/vendas/page.tsx`, `src/app/(private)/vendas/[id]/page.tsx`, `src/app/api/sales/route.ts`, `src/app/api/sales/[id]/route.ts`, `src/app/api/sales/[id]/confirm/route.ts`, `src/app/api/sales/[id]/transition/route.ts`, `src/app/api/quotes/[id]/convert/route.ts`, `tests/unit/sales-ui.test.tsx`, `tests/integration/commerce-http.test.ts`; alterar shell e quotes UI.

**Interfaces:** `transitionSale(actor,id,expectedVersion,status,reason?): Promise<SaleDTO>` só aceita o próximo estado operacional válido; cancelamento delega à regra da tarefa 4. `updateSaleOperations(actor,id,expectedVersion,{ expectedDeliveryDate, operationalNotes }): Promise<SaleDTO>` não altera itens/preços. Rotas JSON retornam envelope existente `ok(data)`; mutações autenticam antes de ler o corpo e validam origem.

- [ ] Testar navegação e fluxo RASCUNHO → CONFIRMADA → EM_PRODUCAO → PRONTA → ENTREGUE, recusa de saltos e cancelamento de entregue. Testar operador sem acesso a financeiro, resumo da venda, erros de parcela/cliente inativo e preservação de rascunho em conflito.
- [ ] Executar `npx vitest run tests/unit/sales-ui.test.tsx tests/integration/commerce-http.test.ts`; observar falhas.
- [ ] Implementar painel de parcelamento com entrada opcional e divisão automática; operationKey é gerada uma vez por intenção de confirmação e reutilizada em retry, renovada somente quando o payload muda. Mostrar resumo para revisar antes de confirmar/converter. Não mostrar ação financeira ainda inexistente; na entrega 3, disponibilizar link somente a ADMIN.
- [ ] Integrar Clientes, Orçamentos e Vendas à navegação. Implementar busca/filtros/paginação, datas civis, estados vazios e loading. Acrescentar notas e prazo operacional com audit/version. Não enviar e-mail/WhatsApp automaticamente.
- [ ] Reexecutar testes de UI, HTTP e serviços e verificar snapshots, documentos impressos e fluxo completo no navegador. Commit: `feat: operar vendas e orcamentos no painel`.

### Task 6: Aceitação e documentação

**Arquivos:** atualizar `README.md`, `docs/VALIDACAO.md`, plano e fixtures de testes.

- [ ] Executar migrações no banco isolado, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`; exigir todos aprovados.
- [ ] No Docker isolado, executar cliente → orçamento → aprovação → parcelas → venda → produção → entrega. Conferir que snapshot/recebíveis persistem após reinício e que confirmação não altera saldo de caixa.
- [ ] Verificar impressão, computador/celular, temas claro/escuro, visitante/operador/admin e erros de concorrência; registrar capturas e limitações concretas.
- [ ] Realizar revisão independente final e corrigir achados materiais com teste de regressão RED→GREEN. Documentar operação, estados, cancelamento, parcelas, privacidade e limites. Commit: `docs: validar gestao comercial`.

## Revisão do plano

Cobertura da especificação: clientes (2), moeda/datas/estados (1), emissão/validade/impressão (3), venda/parcelas/idempotência (4), operação e interface (5), aceitação (6). Contratos FinancialEntry, SaleInstallment, locks e resumo são explícitos para a entrega financeira. O arquivo imutável de logo evita que personalização futura altere a impressão histórica.
