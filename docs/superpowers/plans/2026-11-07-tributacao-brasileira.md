# Tributação gerencial — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Entregar perfil MEI/Simples manual por vigência com efeito gerencial, histórico reproduzível e previsão financeira sem movimentos automáticos.

**Architecture:** Revisões fiscais append-only e DTO comercial mínimo. Novo algoritmo fiscal explicitamente identificado usa o motor produtivo V2 intacto e grava premissas completas no snapshot. Relatórios usam memórias comerciais; perfil não reescreve documentos anteriores.

**Tech Stack:** Next 16.4.2, React, TypeScript, Prisma/PostgreSQL, Zod, Decimal, shadcn do projeto e Vitest.

**Spec:** `docs/tributacao/DESENHO.md`, aprovado pelo usuário em 07/11/2026. Execução local nesta worktree; sem push/PR/merge/deploy.

## Global Constraints

- Não usar banco, credenciais ou .env operacional. PostgreSQL sintético exclusivo se houver migração.
- Não inferir incidência por CNPJ/CNAE ou calcular apuração fiscal oficial. MEI fixo mensal, sem rateio por venda.
- Perfil ADMIN, efeito comercial autenticado; dados privados não entram no catálogo/impresso.
- Histórico legado mantém algoritmo e conteúdo; novos parâmetros exigem revisão explícita.
- Vigência mensal com fim obrigatório; ausência e cobertura parcial não equivalem a zero imposto.
- Guia Next local antes de código; componentes instalados e skill shadcn em UI.

## Review Focus

- Conversão de orçamento entre competências: preservar premissa e mostrar falta de cobertura no mês confirmado.
- Desconto/frete e linhas sem memória: subtotal conhecido e motivos de incompletude, nunca total integral fictício.
- Atualização concorrente/intervalos: rejeitar sobreposição e versão desatualizada sem apagar revisão.
- Alíquota em canal: confirmação explícita antes da ativação; nenhum desconto financeiro duplicado.
- Ausência de perfil/legado: preço comercial continua, resultado fiscal indisponível.

## Task 1 — Perfil e domínio fiscal

Files: `src/domain/tax/{types,validation,calculate,periods}.ts`, `src/server/tax/profiles.ts`, `prisma/schema.prisma`, migration fiscal e `tests/unit/tax-*.test.ts`.

Interfaces: `taxProfileSchema`; `resolveTaxProfile(revisions, competence)`; `calculateTax(base, premise)` retornando valor conhecido e cobertura. `getTaxProfiles(actor)`/`saveTaxProfile(actor, raw)` com controle otimista, revisão imutável e substituição explícita.

- [x] Escrever/executar testes vermelhos: validade mês/ano, MEI sem percentual, Simples sem default, vigência/ausência, arredondamento em centavos, sobreposição e substituição.
- [x] Implementar domínio e migração aditiva; serviços ADMIN com serialização/versão esperada.
- [x] Executar testes verdes; ensaio concorrente e preservação sintética no banco exclusivo.

## Task 2 — Cálculo e memórias

Files: `src/domain/pricing/{types,validation,resolve,calculate-fiscal,document-costs,scenarios}.ts`, `src/server/pricing/{catalog,resolve,estimates,comparisons/create}.ts`, hooks/consumidores de pricing.

Interfaces: entrada comercial mantém versão estrutural V2 e usa discriminante `tax.algorithm = 1` com premissa copiada; dispatcher explícito `calculatePricing(input)` chama V2 intacto quando não existe bloco fiscal. `tax` no resultado é componente separado com valores após tributo e estado. Metadados completos só são resolvidos no servidor e gravados no snapshot; DTO comercial remove fontes/notas/autor/valor mensal.

- [x] Testes vermelhos: exemplo 100/60/10/5 com 4% → tributo 4/contribuição 31/resultado 21; MEI tributo por venda zero apenas para DAS coberto, sem custo fixo no lote; denominador inválido; preço por centavos; V2 sem alteração.
- [x] Integrar perfil com resolução de referência e versão otimista; preservar premissa nas comparações e conversão; ausência não bloqueia cálculo comercial.
- [x] Testes verdes e regressões pricing; conferir leitura/escrita do snapshot e eliminação de informações ADMIN no catálogo.

## Task 3 — Empresa, comercial, rentabilidade e financeiro

Files: `src/components/settings/tax-settings-panel.tsx`, configurações, `src/components/pricing` formulário/resultado, rotas `/api/tax/*`, `src/server/tax/reports.ts`, `src/components/finance/tax-report.tsx`, página financeira, rentabilidade e confirmação de venda.

Interfaces: configurações mostram MEI/Simples, competência inicial/final, DAS/alíquota, origem, revisão/substituição e confirmação de taxas; cálculo escolhe competência/operação por padrão comercial visível. Confirmação grava competência explícita no novo bloco fiscal. `getTaxReport(actor, competence)` produz subtotal conhecido, faltantes, fixo mensal e fontes; `saveTaxReport` congela a consulta sem criar título/movimento.

- [x] Testes vermelhos: ADMIN/OPERATOR em rotas/serviços; legado, serviço, frete, mês diferente e cancelamento; resumo salvo não muda ao trocar perfil; tributo não cria FinancialEntry/Settlement/CashMovement.
- [x] Implementar UI acessível com detalhes progressivos e shadcn, preserving formulário original; componente fiscal separado em rentabilidade, sem renomear lucro líquido/DRE.
- [x] Executar testes verdes; verificar dados de impressão e campos privados não publicados.

## Task 4 — Verificação e entrega revisável

Files: testes sintéticos, `docs/tributacao/ENTREGA.md`, PENDENCIAS/ROADMAP, manifestos e releases.

- [x] Tipos, lint, build, testes do domínio e regressões; migração/reaplicação em PostgreSQL descartável exclusivo com conteúdo legado preservado.
- [x] Verificar UI desktop/celular, teclado e temas com dados sintéticos se servidor permitido; registrar limite exato se bloqueado.
- [x] Revisão independente final, corrigir achados com testes e revalidar a revisão efetiva.
- [x] Reconsultar main, incremento MINOR único para entrega local, manifestos/notas/APP_VERSION conferidos; registrar sem PR, merge ou publicação.

## Registro de execução

- 07/11/2026: desenho aprovado; execução própria neste chat para atender o pedido de implementação. Trabalho restrito à worktree gerenciada 34b6, sem operações externas de entrega.

- 07/11/2026: quatro tarefas executadas. Evidência e limites em docs/tributacao/ENTREGA.md. Revisão independente sem achado material pendente; correções reproduzidas em testes. Mantida branch local conforme pedido, sem push/PR/merge/publicação.
