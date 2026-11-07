# PDV presencial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Concluir vendas presenciais online de peças prontas, com comprador opcional e uma forma de pagamento.
**Architecture:** Rascunho e resultado persistentes por pedido; confirmação, compromisso e entrega atômicos, compartilhando serviços existentes. Cliente nullable apenas por contrato explícito do PDV; sem baixa financeira automática.
**Tech Stack:** Next.js local, React, Prisma/PostgreSQL, Decimal, Zod, shadcn, Vitest.
**Spec:** docs/superpowers/specs/2026-11-06-pdv-presencial-design.md

## Global Constraints

- Conexão obrigatória; sem offline ou dados pessoais locais.
- ADMIN/OPERATOR sem ampliar acesso financeiro; nenhuma operação em banco operacional.
- Sem push/PR/merge/Release/deploy; preservar trabalho paralelo.
- Desconto em reais, uma forma de pagamento; sem fiscal/caixa completo.

## Review Focus

- Anônimos não viram cliente fictício nem recorrência de uma pessoa.
- Queda da resposta não cria segunda venda ou cadastro.
- Última peça disputada não gera saldo negativo.
- Cliente/produto alterado exige nova conferência.
- Rascunho salva antes da conclusão; navegação não perde edições silenciosamente.

### Task 1: Contrato de identificação e pagamento

Files: prisma/schema.prisma; nova migração pos; src/domain/pos/validation.ts; src/domain/pos/types.ts; src/domain/commerce/{types,validation}.ts; src/server/commerce/snapshots.ts; consumidores tipados.
Interfaces: posDraftSchema; posDocumentSchema; calculatePosPayment(total, method, tendered); PosDraftInput e PosOrderDTO. Documento comum mantém customerId obrigatório; PDV anônimo usa customerIdentification=UNIDENTIFIED e customerId=null.
- [x] Escrever testes unitários de cliente opcional/exclusivo, dinheiro/troco e rejeição de combinação; executar e observar falha.
- [x] Implementar contratos e migração aditiva de PosOrder/nullable Sale, adequar snapshot e recorrência sem relaxar documentos comuns.
- [x] Rodar testes focados e tipos; registrar resultados.

### Task 2: Conclusão transacional e recuperação

Files: src/server/pos/{orders,catalog}.ts; src/server/production/{fulfillment,deliveries}.ts; src/server/sales.ts; src/app/api/pos/{route,[id]/route,[id]/complete/route}.ts; tests/pos/*; vitest.pos.config.ts.
Interfaces: getPosOrder(actor); startPosOrder(actor); savePosOrder(actor,id,raw); completePosOrder(actor,id,expectedVersion); posCatalog(actor,query). Extract reserveFinishedWithClient(tx,actor,parsed) e recordDeliveryWithClient(tx,actor,parsed); serviços antigos continuam chamando mesmas funções.
- [x] Criar guard exclusivo PDV e testes de integração: anônimo, existente/novo, idempotência, rollback e última peça; observar falha antes de implementação.
- [x] Implementar rascunho versionado, lookup de catálogo e comando transacional, reaproveitando confirmação/entrega e locks globais; nova identificação só para este caminho.
- [x] Ensaiar migração e concorrência com dados sintéticos exclusivos, verificar recebível único e nenhum CashMovement automático.

### Task 3: Atendimento e revisão

Files: src/components/pos/pos-panel.tsx; src/app/(private)/pdv/page.tsx; navegação; tests/unit/pos-panel.test.tsx.
Interfaces: props initialOrder: PosOrderDTO e produtos de consulta; APIs da Task 2, cadastro opcional com venda.
- [x] Escrever testes de adicionar, ajustar quantidade, identificação opcional, pagamento, falha/retomada e nova venda explícita; observar falha.
- [x] Consultar docs shadcn/Next locais, implementar UI com componentes instalados e estados de salvamento/foco/revisão.
- [x] Validar teclado, desktop/celular e temas em prévia sintética; rodar regressões focadas.

### Task 4: Verificação e entrega local

Files: docs/pdv/ENTREGA.md; PENDENCIAS.md; docs/ROADMAP-SELLER.md; manifestos/releases se versão de entrega preparada.
- [x] Rodar tipos, lint, build e regressões pertinentes sem bancos operacionais.
- [x] Rever branch completa e corrigir achados com teste de regressão.
- [x] Registrar evidências, limitações e versão/main vigente, separando implementação, validação, integração e publicação.

## Encerramento local

Tarefas implementadas e verificadas conforme docs/pdv/ENTREGA.md. Revisão independente com dois P2 corrigidos. Sem commit/push/PR/merge/publicação. Ensaio HTTP integral adicional pendente por bloqueio automático; não equivale à homologação operacional.
