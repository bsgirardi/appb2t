# Plano — calculadora unificada

> Execução direta com superpowers:executing-plans, na worktree isolada existente.

**Goal:** Precificar e revisar produto no formulário principal com organização original, sem perder capacidades ou histórico.
**Architecture:** Compor GuidedPricingForm sobre usePricingDraft/calculateV2, reaproveitando comparadores. Workspace mantém original secundária; editores embutidos usam a composição comum.
**Tech Stack:** Next 16.4.2, React, TypeScript, Decimal, shadcn local, Vitest.
**Spec:** ../specs/2026-11-06-calculadora-unificada-design.md

## Restrições

Sem banco operacional, alteração de motores, migração, publicação, push ou PR. Main 16a6466/1.22.0. Consumo por peça preservado até decisão do usuário sobre total. Não alterar primitivas/CSS compartilhados com revisão paralela. Sem commits enquanto a entrega estiver em elaboração.

## Pontos de revisão

Referências antigas não resolvem silenciosamente em atuais; preço informado zero continua válido; campos inválidos removem resultado anterior; fechar revisão com alterações exige confirmação; quantidade fixada em documento não recebe ação para substituí-la.

## Tarefas

- [x] 1. Testar workspace principal único com acesso secundário original e preservação do rascunho; executar teste vermelho. Alterar calculator-workspace e composição guided, usando calculator-grid, título/numeração/tecnologia da original e componentes locais. Manter contratos do hook e resultados. Reexecutar pricing-v3-ui/comparadores.
- [x] 2. Testar revisão de snapshot com catálogo alterado, conferência explícita, custo anterior/revisado, aplicação sem mudar preço; executar vermelho. Criar helper review-product-pricing para referências atuais reutilizando reviewComparisonOffer, restaurando modalidade original e preço informado original. Usar GuidedPricingForm no product-pricing-editor com resumo anterior e callbacks de rascunho. Confirmar legado sem conversão automática e erro/repetição.
- [x] 3. Usar composição comum em line-pricing-editor e comparison-reuse, preservando quantidade fixa, confirmação e preço descontado único. Testar contratos existentes e proteção de saída do workspace com fingerprint das fichas, sem descartar após erro.
- [x] 4. Verificar paridade sintética FDM/resina/multimaterial/modos, unidades/tempos, trabalho/extras/taxas e precisão usando suites existentes. Tipagem/lint/build; prévia isolada em porta própria, teclado, desktop/celular e temas. Sem backend operacional.
- [x] 5. Revisão final independente, corrigir achados materiais com regressões; atualizar acompanhamento/limites; preservar versão base até futura PR, conforme escopo delegado. Sem publicação ou integração. Registrar evidências e decisões pendentes com precisão.

Autorrevisão: tarefas cobrem composição, consumidores, revisão/histórico e verificações; nenhuma fórmula nova. A adaptação total→peça permanece condicionada à decisão, não integra código ainda.

Execução encerrada localmente: 897 testes/217 arquivos, tipagem, lint e build aprovados. Revisão independente com achado corrigido e reconferido. Evidências e limites em ../../calculadora-unificada/ENTREGA.md. Sem commit/PR/merge/publicação; base 1.22.0 preservada para futura PR.
