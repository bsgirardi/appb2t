# Versão e Atualizações — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Entregar versão 1.2.0 e histórico acessível à equipe.
**Architecture:** Versão proveniente de package.json; histórico estático versionado; rota privada reutiliza layout e componentes existentes.
**Tech Stack:** Next.js, React, TypeScript, shadcn.
**Spec:** docs/superpowers/specs/2026-10-26-versao-atualizacoes-design.md

## Restrições

Sem alterações de banco, dependências ou implantação. Disponível a ADMIN e operador; login mostra apenas versão.

## Foco de revisão

Versão consistente entre manifesto, lock e interface; acesso do operador; link ativo; datas sem deslocamento de fuso; rodapé móvel visível.

## Tarefa 1 — versão, rodapés e histórico

- [x] Sincronizar package.json/package-lock.json em 1.2.0 e exportar APP_VERSION em src/lib/version.ts.
- [x] Criar src/lib/releases.ts com histórico 1.2.0 e 1.1.0.
- [x] Incluir versão e link em app-shell.tsx, versão abaixo do formulário de login e menu Atualizações em admin-navigation.tsx.
- [x] Criar src/app/(private)/atualizacoes/page.tsx com Card e Badge existentes e datas explícitas.
- [x] Conferir navegação existente, tipagem, lint, build e apresentação responsiva. Mudança de conteúdo e interface reversível: não adicionar testes que apenas espelhem o texto.

## Verificações realizadas

- Versão 1.2.0 sincronizada em package.json e nas duas entradas do package-lock.json.
- Tipagem e lint aprovados.
- Testes existentes de navegação: 6 aprovados. O ambiente jsdom emitiu aviso de navegação entre documentos não implementada; nenhuma falha de teste.
- Revisão independente estática sem achados.
- Prévia isolada com operador: página e menu disponíveis, histórico e versão renderizados. Conferência visual no tema escuro e largura 390 px sem overflow horizontal. Prévia utiliza adaptador de navegação, não uma sessão autenticada real.
- Nenhuma alteração no banco ou implantação nesta etapa.

- Build de produção aprovado, incluindo TypeScript e rota /atualizacoes.
