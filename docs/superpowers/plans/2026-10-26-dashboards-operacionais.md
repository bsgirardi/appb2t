# Dashboards operacionais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Entregar seis dashboards com todos os indicadores aprovados, dados reais, período compartilhável e permissões preservadas.

**Architecture:** Manter getDashboard compatível e adicionar consultas específicas por painel, chamadas somente pelo painel selecionado. Agregações de domínio retornam um contrato comum de métricas, séries e prioridades; a interface usa componentes shadcn oficiais e URL como fonte da seleção.

**Tech Stack:** Next.js 16.4.2 App Router, React 19, Prisma/PostgreSQL, decimal.js, Tailwind 4, shadcn Radix, Lucide e Charts/Recharts.

**Spec:** docs/superpowers/specs/2026-10-26-dashboards-operacionais-design.md (aprovado em 26/10/2026).

## Global Constraints

- Seis painéis: Visão geral, Comercial, Produção, Estoque, Financeiro e Rentabilidade.
- Período inicial: mês atual até hoje, em America/Sao_Paulo.
- ADMIN acessa todos os painéis; OPERATOR recebe somente informações operacionais permitidas.
- Dados insuficientes mostram “Dados insuficientes” e motivo, nunca zero presumido.
- Preservar alterações locais já existentes.
- Não criar metas, mínimos de estoque ou coleta histórica. Não sobrescrever componentes existentes.
- Usar @shadcn; consultar docs via CLI e ler guias locais do Next antes de alterar componentes e rotas.

## Review Focus

- URLs forjadas por OPERATOR não consultam nem serializam financeiro ou custos.
- Fronteiras de mês/ano, datas inválidas e períodos invertidos não geram consultas incorretas.
- Correções, estornos e lotes compartilhados não duplicam valores ou horas.
- Custos parciais e saldos desconhecidos não aparecem como resultado completo ou zero.
- Filtros e rankings abrangem o conjunto de dados, não somente uma página de listagem.

## Task 1: Contrato, períodos e autorização

**Files:** criar src/domain/dashboard/types.ts, src/domain/dashboard/filters.ts e tests/unit/dashboard-filters.test.ts. Preservar src/server/dashboard.ts e tests/unit/dashboard.test.ts.

**Interfaces:** produzir DashboardPanel (overview/commercial/production/stock/finance/profitability), DashboardFilter, Metric, Series, Priority e DashboardPanelDTO. resolveDashboardFilter(raw, role, now): DashboardFilter valida painel, from/to e janela anterior; painel protegido rejeita acesso de operador. Valores financeiros no DTO permanecem strings decimais; métrica contém unidade, cobertura e motivo de indisponibilidade.

- [x] Escrever testes: operador não acessa finance/profitability; 2026-11-01T01:00Z ainda pertence a outubro em São Paulo; intervalo anterior tem mesma duração; datas impossíveis/invertidas são rejeitadas; painel padrão é overview.
- [x] Executar npm run test:unit -- tests/unit/dashboard-filters.test.ts e confirmar falha anterior à implementação.
- [x] Implementar contrato e filtros; repetir teste e confirmar aprovação.

## Task 2: Comercial e fila geral

**Files:** criar src/server/dashboard/commercial.ts, overview.ts, shared.ts e tests/unit/dashboard-commercial.test.ts.

**Interfaces:** getCommercialDashboard(actor: Actor, filter: DashboardFilter): Promise<DashboardPanelDTO>; getOverviewDashboard com a mesma assinatura. shared.ts concentra conversão de datas, somas decimais e agrupamentos necessários.

- [x] Criar fixtures/testes para coorte de conversão com denominador, aprovação sem evento, cliente recorrente, item sem produto, série vazia e soma de 0.10 + 0.20 = 0.30.
- [x] Confirmar falhas; implementar consultas por conjuntos e agregações para todos os indicadores Comercial/Visão geral da spec, incluindo artes e aprovações, sem depender de paginação.
- [x] Não incluir métricas financeiras no payload de operador; adicionar teste que prova ausência de chamada aos serviços financeiros.
- [x] Executar os novos testes e tests/unit/dashboard.test.ts; confirmar aprovação.

## Task 3: Produção e planejamento

**Files:** criar src/server/dashboard/production.ts, src/domain/dashboard/production.ts e tests/unit/dashboard-production.test.ts.

**Interfaces:** getProductionDashboard(actor, filter): Promise<DashboardPanelDTO>; agregador puro summarizeProduction(input) para indicadores de ordens, entregas, eventos e lotes.

- [x] Testar entrega parcial versus conclusão, prazo ausente, correção de falha, reimpressão vinculada e lote com dois participantes que não duplica tempo da máquina.
- [x] Confirmar falhas; implementar os indicadores de Produção e planejamento da spec usando marcos, calendário, cobertura e eventos vigentes.
- [x] Informar capacidade indisponível quando calendário/tempo necessário faltar; testar esse estado.
- [x] Executar npm run test:unit -- tests/unit/dashboard-production.test.ts e confirmar aprovação.

## Task 4: Estoque e cobertura

**Files:** criar src/server/dashboard/stock.ts, src/domain/dashboard/stock.ts e tests/unit/dashboard-stock.test.ts.

**Interfaces:** getStockDashboard(actor, filter): Promise<DashboardPanelDTO>; summarizeStock(input) mantém agrupamento por unidade e necessidade não coberta.

- [x] Testar reserva parcialmente liberada, material insuficiente, item sem inventário, item sem movimento e unidades incompatíveis que não podem ser somadas.
- [x] Confirmar falhas; agregar movimentos, reservas e necessidades usando regras existentes; custos de avaliação somente para ADMIN, sem mínimo presumido.
- [x] Executar npm run test:unit -- tests/unit/dashboard-stock.test.ts e confirmar aprovação.

## Task 5: Financeiro e rentabilidade

**Files:** criar src/server/dashboard/finance.ts, profitability.ts e tests/unit/dashboard-financial.test.ts. Consumir src/server/finance/reports.ts e src/server/profitability/queries.ts sem alterar suas regras.

**Interfaces:** getFinancialDashboard(actor, filter) e getProfitabilityDashboard(actor, filter): Promise<DashboardPanelDTO>. Autorizar antes de consultar. Adaptar relatórios existentes sem extrair totais de uma página incompleta.

- [x] Testar proibição do operador antes de qualquer acesso ao banco, recebimento estornado, saldo desconhecido, denominador zero, custo parcial e tempo ausente no resultado/hora.
- [x] Confirmar falhas; implementar todos os indicadores financeiros e de rentabilidade da spec, incluindo 7/30 dias, menor saldo projetado, cobertura e comparações elegíveis.
- [x] Usar margem negativa e ranking de menores margens quando não houver referência; filtro de referência não persiste configuração.
- [x] Executar npm run test:unit -- tests/unit/dashboard-financial.test.ts e confirmar aprovação.

## Task 6: Interface compartilhada e integração

**Files:** criar src/components/dashboard/dashboard-toolbar.tsx, dashboard-panel.tsx, metric-card.tsx, dashboard-chart.tsx e priority-table.tsx; criar src/server/dashboard/panels.ts; modificar src/app/(private)/dashboard/page.tsx. Adicionar somente componentes UI ainda ausentes, além de loading.tsx/error.tsx na pasta dashboard quando necessário.

**Interfaces:** getDashboardPanel(actor: Actor, filter: DashboardFilter): Promise<DashboardPanelDTO> despacha uma única consulta de painel. DashboardToolbar recebe filtro e painéis permitidos; DashboardPanel recebe DTO. Componentes interativos usam client boundary restrito.

- [x] Ler node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md e guias de searchParams, loading e error. Consultar CLI docs/view do dashboard-01, chart, combobox, card, table, badge e empty; conferir arquivos adicionados.
- [x] Adicionar chart/combobox e dependências necessárias com npm, sem sobrescrever componentes. Adaptar a composição de dashboard-01 à página atual preservando shell, identidade e alterações existentes.
- [x] Implementar seletor acessível, período inicial/30/90 dias/personalizado, URL e histórico; renderizar cards, gráficos e prioridades com descrição de critério, cobertura e unidade. Gráficos têm resumo textual e suporte a teclado quando disponível.
- [x] Criar tests/unit/dashboard-ui.test.tsx: mudança de painel mantém período; operador não recebe opções protegidas; vazio não inventa série; informação incompleta tem motivo; links respeitam filtros suportados.
- [x] Executar testes de UI e typecheck; corrigir falhas.

## Task 7: Verificação final e entrega

**Files:** criar docs/superpowers/reviews/2026-10-26-dashboards-operacionais.md; atualizar progresso deste plano e status da spec.

- [x] Executar npm run typecheck, npm run lint e testes pertinentes, registrando falhas preexistentes separadamente apenas quando comprovadas.
- [x] Conferir navegador em desktop/celular, claro/escuro, zoom 200%, teclado, recarga, voltar e link direto. Usar fixtures de prévia se banco/autenticação impedirem validação local; relatar precisamente limites da prévia.
- [x] Revisar cada linha da matriz de indicadores da spec e marcar implementação ou insuficiência real de dados; não substituir funcionalidade ausente por alegação de dados insuficientes.
- [x] Revisar diff para vazamento de custos, carga desnecessária de painéis, cálculos monetários imprecisos e mudanças acidentais no trabalho anterior. Solicitar revisão independente final conforme skill de execução escolhida.
- [x] Entregar resumo de alterações, evidências dos checks e limitações restantes. Não fazer commit em lote das alterações locais de outros trabalhos.

Verificação final: 472 testes unitários em 127 arquivos, executados em quatro lotes após falha RPC do executor na execução monolítica. Build, typecheck, lint e formatação aprovados. Integração com PostgreSQL real pendente por indisponibilidade de localhost:5432; prévia com fixtures documentada no relatório.
