# E2.4 — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Sugerir conferência humana da ficha com recorrência produtiva rastreável, sem escritas de negócio.

**Architecture:** Projeção pura de domínio sobre rentabilidade atual e metadados transitórios de comparabilidade/proveniência. Consulta ADMIN própria em snapshot consistente e seção independente na página de Rentabilidade; preservar DTOs persistidos, hashes, motor monetário e relatórios anteriores.

**Tech Stack:** TypeScript, Decimal existente, Prisma/PostgreSQL, Next/React, shadcn instalado, Vitest.

**Spec:** [Desenho](../specs/2026-11-06-e24-recorrencia-design.md).

## Global Constraints

- Base main 16a6466/1.22.0. Executar na worktree e24-recorrencia, preservando checkout operacional.
- 90 dias civis inclusivos em São Paulo pela confirmação; N >= 5, K >= 3, K/N >= 60%; diferença >= R$ 5 e >= 10% do custo previsto positivo.
- Produto/configuração congelada/quantidade idênticos; linha entregue, reconciliada e conferência vigente; evidências independentes.
- Sem médias causais, escrita, migração, alertas externos, mudança automática de ficha ou ampliação financeira a OPERATOR.
- Ler AGENTS.md, documentação Next local pertinente e skill shadcn do projeto antes do código/interface; ler skills de execução/TDD/verificação/revisão nas etapas correspondentes.
- Não copiar .env operacional. Instalar dependências próprias se necessário; testar somente em instância sintética exclusiva. Sem commit contendo segredos ou dados reais.
- Não executar push/PR/merge/publicação. Sem incremento de versão nesta preparação; futura PR segue AGENTS.md.

## Review Focus

1. Mesmo processo produtivo vendido em entregas/origens diferentes: uma produção não produz múltiplas repetições independentes (tarefas 1/2).
2. Filtrar produto/paginar/alterar frete ou preço não pode fabricar recorrência (tarefas 1/2/3).
3. Revisão vencida, componente não reconciliado ou dados legados não podem virar custo zero ou ausência de desvio (tarefas 1/2/3).
4. Cancelamentos e perdas sem vínculo não podem migrar para custo causal de falhas (tarefas 1/2).
5. Virada civil em São Paulo e custos revisados posteriormente precisam manter janela e legenda honestas (tarefas 1/2/3).

## Arquivos e contratos

- `src/domain/profitability/recurrence.ts`: tipos transitórios, assinatura canônica, elegibilidade, independência e critérios.
- `src/server/profitability/recurrence.ts`: autorização, seleção temporal, leitura dos custos existentes e metadados relacionais, consulta sem escrita.
- `src/components/profitability/recurrence-panel.tsx`: apresentação da política, grupos, exclusões e evidências.
- `src/app/(private)/rentabilidade/page.tsx`: integração independente dos filtros existentes.
- Testes novos `tests/unit/profitability-recurrence.test.ts`, `tests/unit/profitability-recurrence-ui.test.tsx`, `tests/e22/recurrence.test.ts` e adaptação da guarda de banco exclusivo quando necessária.
- `PENDENCIAS.md`, `docs/ROADMAP-SELLER.md` e relatório novo `docs/superpowers/reviews/2026-11-06-e24-recorrencia.md`: estado e limites da entrega.

`RecurrenceCandidate` contém `sale: SaleProfitabilityDTO`, `line: ProfitabilityLineDTO`, `configuration: PricingV2Input | null`, `productionKeys: string[]`, `provenanceComplete: boolean`. Não acrescentar campos a `SaleProfitabilityInput` ou ao resultado persistido. O servidor constrói os metadados paralelos por venda/linha. `RecurrenceReport` contém janela/política, grupos e candidatos não agrupáveis com motivos; grupo contém configuração legível, evidências, exclusões, N, K e sugestão.

### Tarefa 1 — domínio verificável

**Files:** criar domínio e teste unitário indicados acima.

**Interfaces:** `productiveConfigurationKey(productId: string, input: PricingV2Input): string | null`; `buildRecurrence(candidates: RecurrenceCandidate[], period: {from: string; to: string}): RecurrenceReport`. Expor os tipos pelo mesmo módulo. Chave deve usar JSON canônico de campos explicitamente permitidos, sem dependência de crypto/servidor.

- [x] Escrever teste com cinco pedidos independentes, três excedendo exatamente R$ 5 e 10%: `eligibleCount === 5`, `materialCount === 3`, `suggestReview === true`.
- [x] Rodar teste e observar falha pela ausência do módulo.
- [x] Implementar assinatura canônica e projeção com Decimal existente. Agrupar dependência por componentes conexos de pedido/chave produtiva antes de agrupar configurações. Excluir componente com múltiplas linhas/pedidos; preservar motivos e fontes.
- [x] Adicionar e executar fronteiras 4 pedidos, 2/5, 3/6, valor ligeiramente abaixo de cada limite, previsto zero, nulos, decimais equivalentes, ordem de materiais e duplicatas.
- [x] Adicionar e executar testes de quantidade/configuração/versão distintas; nomes e campos comerciais diferentes não mudam chave. Alterar preço/frete/desconto/comissão não muda K/N com mesmos custos produtivos.
- [x] Adicionar e executar dependência transitiva A-X, B-X/Y, C-Y, linhas repetidas no mesmo pedido e origem desconhecida. Nenhuma delas sustenta sugestão independente.
- [x] Adicionar e executar cancelada, conferência ausente/vencida, consignação sem conferência, parcial/provisória, entrega parcial, parcela não reconciliada e perda já incluída sem duplicação.
- [x] Verificar janela inclusiva e que candidatos inelegíveis continuam nas evidências. Executar regressões E2.1/E2.2 e cálculo existentes.

### Tarefa 2 — leitura autorizada e proveniência

**Files:** criar servidor e teste E22 indicados; reutilizar `sources.ts`, `authorization.ts`, `queries.ts` sem alterar contratos persistidos. Configuração de teste isolada se a guarda E22 atual conflitar com banco em uso.

**Interfaces:** `getProductiveRecurrence(actor: Actor, productId?: string): Promise<RecurrenceReport>`. Construir janela a partir de relógio do servidor, civil em São Paulo. Autorizar antes de ler. Retornar apenas o recorte de produto depois de calcular dependências na janela inteira.

- [x] Ler guias Next locais sobre Server Components, leitura de dados e cache; registrar os guias consultados no relatório. Preparar dependências próprias e conferir baseline focada antes de implementar.
- [x] Escrever teste sintético de consulta que exige cinco produções distintas, origens e memórias válidas, com fronteira temporal São Paulo; verificar erro por função ausente.
- [x] Implementar transação RepeatableRead somente leitura. Usar readSaleSources/calculateSale/reconcileProductiveLine existentes. Ler revisões congeladas e snapshots para metadados, repetindo exatamente os predicados de validade do leitor existente; não confiar apenas no snapshotId sem vínculo válido.
- [x] Mapear entregas por compromisso/origem até productionLine.id; mapear LOSS pela linha produtiva; mapear CONSIGNMENT_SOLD via alocação/remessa/origem. Exigir completude de proveniência para todas as fontes da linha. Não usar id de entrega como chave produtiva. Não gravar revisões produtivas para valorizar origem.
- [x] Validar entrada V2 por schema existente ou parser estrito reutilizável; JSON malformado deve produzir motivo legível, sem derrubar consulta inteira nem inventar configuração.
- [x] Executar testes de duas origens da mesma produção, dependência entre produtos, consignação, estoque de abertura, memória incompatível e revisão vencida. Produto selecionado não pode esconder fonte compartilhada.
- [x] Verificar ADMIN ativo, recusa OPERATOR/anônimo/inativo e ausência de cache compartilhado. Alterar somente despesa comercial não deve criar desvio produtivo.
- [x] Executar em PostgreSQL descartável próprio com transação READ ONLY, verificar quantidades/conteúdo de revisões e apurações antes/depois e preservação de histórico/hash. Reexecutar integrações pertinentes de fontes/consultas E22.

### Tarefa 3 — apresentação administrativa

**Files:** criar painel/testes UI indicados; modificar página de Rentabilidade. Prévia sintética nova em `tests/recurrence-preview*` conforme padrão existente.

**Interfaces:** `RecurrencePanel({value}: {value: RecurrenceReport})`. Consumir exclusivamente projeção; links GET ao detalhe existente. Nenhum comando de gravação.

- [x] Ler skill shadcn do projeto e componentes instalados. Escrever teste de critérios, 3/5, link de pedido, fonte, motivos e texto “Conferir a ficha”; observar falha por componente ausente.
- [x] Implementar seção com título, janela independente de 90 dias, configuração/quantidade, N/K e evidências expansíveis. Integrar consulta na página sem mudar filtros/rankings/metas existentes. Não vazar novo parâmetro para schema estrito do relatório antigo.
- [x] Mostrar estados “amostra insuficiente”, “critério não atingido”, “sem linhas comparáveis” e “dados pendentes”; elegíveis/total e exclusões sobrepostas explicitadas. Evitar declarar normalidade/ausência causal.
- [x] Testar dados conhecidos/provisórios/incompletos, revisão vencida, resíduo não reconciliado e provisão de falhas. Separar diferença em reais de percentual indisponível; usar formatação existente.
- [x] Verificar paginação de evidências após o cálculo e invariância de N/K; nenhum filtro remove silenciosamente o denominador. Controles de expansão acessíveis e ids únicos.
- [x] Executar prévia fictícia desktop/celular, teclado, claro/escuro e rolagem local; sem autenticação artificial ou operações no banco publicado.

### Tarefa 4 — revisão e entrega local

**Files:** relatório novo e acompanhamentos indicados. Não sobrescrever acompanhamentos locais do checkout operacional: transportar apenas informações novas necessárias para documentos da worktree.

- [x] Executar unitários completos e integrações pertinentes no banco exclusivo; tipos, lint, build e diff check. Registrar comandos/resumos e falhas reais, sem declarar suíte não executada como aprovada.
- [x] Revisar toda a alteração, focando ausência de escritas, imutabilidade de hashes/DTOs históricos, dependências e filtros. Usar skill de revisão aplicável; corrigir achados com regressões.
- [x] Reconferir main e diferenças paralelas. Não rebasear automaticamente sobre conflitos nem incrementar versão só por existir entrega local.
- [x] Atualizar roadmap e pendências com critérios aprovados, implementação/testes efetivos e homologação humana pendente. Registrar que publicação/PR/merge continuam fora da autorização.
- [x] Entregar links dos arquivos, verificações, limitações e versão-base; manter branch/worktree e evidências. Encerrar apenas processos/recursos descartáveis criados nesta tarefa.

## Autorrevisão do plano

Contratos transitórios separam metadados do histórico persistido; cada risco do Review Focus tem teste na tarefa proprietária. Numéricos aprovados preservados. Decisões conservadoras sobre assinatura, dependência e consulta fixa constam no desenho para revisão do usuário. Método aprovado: execução direta nesta sessão, com revisão final independente. Plano e critérios aprovados pelo usuário; tarefas 1–4 concluídas e verificadas, com homologação humana e integração/publicação pendentes. Base reconciliada com main bd0b4eb/1.24.0. Evidências e limites no relatório docs/superpowers/reviews/2026-11-06-e24-recorrencia.md.
