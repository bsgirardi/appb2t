# Build Dependencies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Reutilizar instalação quando apenas a versão muda e reduzir tools sem perder comandos.

**Architecture:** Estágio de manifestos derivados; deps completo normalizado; tools-deps com subconjunto do lock resolvido offline; manifestos reais restaurados nas imagens finais.

**Tech Stack:** Node 22, npm 10, Docker BuildKit, Prisma6, Next16, testes node:test.

**Spec:** docs/superpowers/specs/2026-10-29-build-dependencies-design.md

## Global Constraints

- Deploy manual e local, sem automação externa ou alterações globais.
- package.json fonte única da versão; PATCH 1.11.1 e histórico preservado.
- Nenhuma verificação ou script de dependência desabilitado na instalação efetiva.
- Manifestos originais preservados; hooks raiz impedem normalização de deps.

## Review Focus

- Alteração real de dependência ou lock deve invalidar instalação.
- Resolução offline não pode selecionar versão diferente do lock original.
- Tools deve executar Prisma e imports de criação/recuperação administrativa.
- Cache não deve esconder versão incorreta em runtime/tools.
- Propriedade e leitura com contexto 0600 devem continuar funcionando.

## Task 1: Manifestos e alvos Docker

- [x] Criar testes node:test para normalização, hooks, versões e entradas inválidas; reproduzir falha antes da implementação.
- [x] Implementar scripts/docker/build-manifests.mjs com CLI e funções testáveis, sem mutar entradas.
- [x] Introduzir estágio manifests, deps completo e tools-deps mínimo; recompor manifesto final com versão real.
- [x] Resolver lock tools offline com cache vazio e verificar que pacotes selecionados mantêm versões e integridades originais.
- [x] Construir os dois alvos, verificar Prisma/admin/permissões e comparar tamanho com baseline1.11.0 na mesma engine.

## Task 2: Regressão de cache e entrega

- [x] Construir revisão com alteração apenas de versão em contexto temporário; confirmar npm ci em cache e versões finais corretas.
- [x] Validar alteração de dependência como invalidação, mantendo lock coerente.
- [x] Executar shell, tipos/lint/versão e suíte apropriada com PostgreSQL exclusivo.
- [x] Atualizar documentos, versão 1.11.1 e notas; revisão independente e PR com resultados reais, sem previsão de desempenho.
