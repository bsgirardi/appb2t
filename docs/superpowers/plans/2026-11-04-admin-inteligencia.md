# Etapa 4 — plano de implementação

> Execução inline com superpowers:executing-plans, no escopo já autorizado.

**Goal:** rankings rastreáveis e simulações explicáveis em Rentabilidade.
**Architecture:** função pura sobre resultados do motor existente; enriquecimento da consulta antes da paginação; componente cliente apenas para simulação.
**Tech Stack:** Next 16, React, Decimal, shadcn instalados, Vitest.
**Spec:** ../specs/2026-11-04-admin-inteligencia-design.md

## Restrições e foco da revisão

Preservar autorização ADMIN, rotas, revisões e fatos financeiros. Não persistir simulações. Nunca ordenar cobertura parcial como resultado final. Não calcular sobre uma página isolada. Não projetar futuro a partir de período futuro/sem data. Preservar nulos e negativos. Reconciliar versão com main na integração.

- [x] Criar testes do domínio e observar falha; implementar intelligence.ts reutilizando aggregateSales, com fontes por grupo e agrupamento por cliente.
- [x] Testar consulta com mocks: autorização antes de ler banco e resultado independente de paginação; enriquecer queries.ts sem alterar hashes históricos.
- [x] Criar testes de interação; implementar intelligence-panel.tsx e integrar na página existente usando o mesmo período/filtros e componentes shadcn.
- [x] Sincronizar manifestos 1.16.0 e notas em português. Validar versão, permissões e fontes.
- [x] Executar testes pertinentes, tipos, lint, build e revisão visual; registrar evidências, limitações e estado Git.
