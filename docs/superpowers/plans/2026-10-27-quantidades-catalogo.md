# Quantidades comerciais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Execução direta aprovada pelo usuário, incluindo planejamento e testes, sem novas pausas de aprovação.

**Goal:** Permitir mínimo por configuração e até 100.000 unidades por linha com referência automática e validação consistente.

**Architecture:** Centralizar limites e validação de quantidade no domínio de produtos. Acrescentar mínimo persistido e revisionado; reutilizar a revisão existente do catálogo e preservar snapshots históricos. Formulários usam entradas numéricas sem gerar listas enormes de opções.

**Tech Stack:** Next.js 16.4.2, React 19, TypeScript, Zod, Decimal, Prisma/PostgreSQL, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-27-quantidades-catalogo-design.md`

## Global Constraints

- Máximo de 100.000 unidades por linha, 20 linhas e 2.000.000 unidades por conjunto.
- Mínimo por produto/configuração, default 1; preservar valor omitido por clientes antigos em updates.
- Não somar configurações diferentes; mínimos também valem nos conjuntos.
- Grandes volumes mantêm referências, adicionais e faixas. Preservar limites monetários, permissões e contratos de checkout.
- Não alterar quantidades em rascunhos existentes nem documentos emitidos silenciosamente.
- Novos filtros, publicação e merge fora do escopo.

## Review Focus

- Cliente antigo não pode apagar mínimo já configurado.
- Lista antiga abaixo do mínimo atual precisa ser corrigível sem perder respostas.
- Combinação acima do máximo deve ser atômica, preservando as linhas anteriores.
- Quantidade vazia/decimal/infinita não deve virar payload válido ou quebrar estado salvo.
- Revisão de catálogo deve impedir bypass por API, conjuntos ou checkout, preservando documentos históricos.

### Task 1: Domínio, persistência e revisão

**Files:** novo `src/domain/products/quantity.ts`; schemas de produtos, inquiry, quantity-pricing, configuração de preço, snapshots de solicitações, pricing/selection/document/validation de kits; `prisma/schema.prisma` e nova migração; projeção pública, save/revisão comercial e `src/server/inquiry-lines.ts`.

**Interfaces:** `CATALOG_MAX_QUANTITY`, `CATALOG_MAX_LINES`, `CATALOG_MAX_KIT_QUANTITY`, `catalogQuantitySchema`, `validateProductQuantity(quantity, minimumQuantity = 1)`. Campo opcional nos DTOs de entrada para compatibilidade e leitura pública preenchida com valor atual.

- [x] Testes RED em `tests/unit/catalog-quantities.test.ts` para 99/100/1000/100000, rejeições, faixa + adicional, merge acima do máximo, kit grande e mínimo/revisão com update antigo.
- [x] Implementar constantes e schemas compartilhados; manter schema de migração V1 estritamente histórico.
- [x] Persistir `minimumQuantity` default 1 com CHECK; salvar preservando omissão e incluir na revisão comercial e nas projeções públicas.
- [x] Validar mínimo atual na revisão de linhas antes da precificação, retornar mínimo atual para a interface e bloquear envio/preparação pelos mecanismos de revisão existentes.
- [x] Ampliar schemas de snapshots atuais e derivados de kits; manter permissões e snapshots de documentos já emitidos.
- [x] Testes GREEN e integração de migração, persistência, revisão e fluxo recebido/preparado com 100+ unidades.

### Task 2: Interfaces e rascunhos

**Files:** formulário/editor comercial, cards/detalhe/contato, editores de faixas de produto e kit, inquiry-panel e kit-builder. Novo controle de quantidade apenas se permitir partilhar comportamento de rascunho vazio sem duplicação.

**Interfaces:** Consumir limites do domínio e mínimo atual nos DTOs/linhas revisadas. Não alterar os formatos persistidos apenas por trocar o controle visual.

- [x] Testes RED para mínimo inicial, rascunho abaixo do mínimo, quantidade100, entrada vazia e preservação após erro de combinação.
- [x] Adicionar mínimo no cadastro e na leitura de rascunhos de produto, com omissão compatível.
- [x] Mostrar mínimo por configuração em cards/detalhe; iniciar apenas novas escolhas no mínimo.
- [x] Substituir selects de quantidades por campos numéricos que preservem rascunho vazio localmente e bloqueiem confirmação; manter edição acessível e feedback junto ao campo.
- [x] Atualizar editores de faixa sem criar arrays de tamanho100000 ou2000000 para sugerir o próximo limiar; procurar lacuna entre no máximo10 faixas.
- [x] Testes GREEN; conferir subconjunto de interface e fluxo com revisões.

### Task 3: Verificação e entrega

**Files:** testes de integração pertinentes, manifestos, `src/lib/releases.ts`, relatório de validação.

**Interfaces:** Uma única versão MINOR para a entrega agregada ainda não publicada. Se main permanecer1.2.1, preparar1.3.0 e incorporar na mesma nota as melhorias da etapa anterior, sem apagar notas publicadas.

- [x] Preparar PostgreSQL de teste isolado, aplicar migrações e exercitar mínimo, update antigo, revisão e orçamento/conjunto com100+.
- [x] Verificar unitários/interface, build, lint, diff e navegador em320/390/1440 com os cenários alterados; relatar precisamente bloqueios de ambiente.
- [x] Conferir main, atualizar manifestos/histórico uma vez e confirmar versão no login/painel/atualizações.
- [x] Revisão independente final única; corrigir achados importantes com testes RED→GREEN.
- [x] Registrar resultado, commit local e estado real de PR/merge/publicação.

## Resultado da execução — 2026-10-27

- Implementados mínimo por configuração (default 1), limite de 100.000 por linha e 2.000.000 por conjunto. A migração foi aplicada apenas aos bancos locais de teste/prévia.
- Mantidos os contratos de checkout, as regras de consulta, os documentos históricos e os mínimos em atualizações feitas por clientes antigos. Listas e rascunhos existentes não têm quantidades aumentadas silenciosamente.
- Revisão independente final encontrou dois problemas de edição: confirmação de combinação com campo vazio e perda do contato ao redigitar a quantidade. Ambos foram reproduzidos em testes, corrigidos e verificados (7/7 cenários de interface).
- Verificação completa por grupos: 498/498 testes de unidade/interface em 129 arquivos; 296/296 testes de integração em 121 arquivos; mais 3/3 verificações de manifestos, histórico e componentes reais de login/painel/atualizações para ADMIN e OPERATOR.
- A execução monolítica do Vitest encontrou uma falha de comunicação interna (Maximum call stack size exceeded), também observada na etapa anterior. A divisão dos unitários em grupos de 25 arquivos e integração em forks concluiu todos os arquivos com código de saída zero. Não foi considerado aprovado nenhum processo sem resumo final.
- Typecheck, lint e compilação de produção concluídos com código zero. Cliente Prisma gerado previamente; build final executado diretamente pelo Next para não regenerar a DLL em uso pelos testes no Windows.
- Navegador real com aplicação Next e PostgreSQL separado b2t_quantidades_preview, apenas dados fictícios: mínimo inicial 5; 100 unidades com faixa de R$ 16 + adicional R$ 2 = R$ 1.800; kit usa base R$ 20 + adicional R$ 2, desconto de 10%, total R$ 1.980; mínimo do componente bloqueia revisão/confirmação; campo vazio bloqueia envio/checkout sem apagar contato. Sem extravasamento horizontal nas larguras verificadas de 320, 390 e 1440; temas claro e escuro conferidos.
- Capturas e logs locais em test-results/quantidades-*. Banco de produção não alterado. Prévia temporária encerrada.
- origin/main conferida em 1.2.1. Manifestos e histórico preparados em 1.3.0, incorporando a etapa local anterior (1.2.2 nunca publicada). Nenhuma tag criada.
- Entrega em commit local na branch codex/clareza-catalogo. PR, merge e publicação não realizados.
