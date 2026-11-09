# Configurações e calculadora — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar o desenho aprovado com uma calculadora e configurações sem repetição entre abas.
**Architecture:** Um workspace de configurações compõe painéis existentes. Estado compartilhado de parâmetros preserva rascunhos e versão entre custos e preço. A calculadora conserva o formulário guiado e proteção de saída.
**Tech Stack:** Next.js 16.4.2, React, TypeScript, shadcn local, Vitest/Testing Library.
**Spec:** ../specs/2026-11-09-configuracoes-calculadora-design.md

## Global Constraints
Sem migração de banco; manter APIs, permissões e memórias históricas. Reutilizar componentes locais. Não publicar nem integrar sem autorização de entrega.

## Review Focus
Troca de abas deve preservar rascunhos; salvamentos sucessivos devem usar versão atual; campos comerciais/fiscais devem aparecer uma vez; operadores não podem criar canais; remoção da calculadora original não pode quebrar o rascunho atual ou consultas históricas.

## Task 1: Configurações por assunto
**Files:** criar `src/components/settings/settings-workspace.tsx`; alterar `settings-panel.tsx`, `pricing-settings-panel.tsx` e `src/app/(private)/configuracoes/page.tsx`; testar `tests/unit/settings-workspace.test.tsx`.
**Interfaces:** `SettingsWorkspace` recebe AdminData, PricingCatalogDTO, CommercialSettingsDTO e TaxProfilesDTO. `SettingsPanel` aceita abas restritas e modo embutido. Painéis de parâmetros compartilham estado e versão por provider.
- [x] Escrever testes de isolamento, navegação e preservação de rascunhos; observar falha.
- [x] Compor as seis abas, separar custos de produção e padrões de preço, preservar cadastros e salvamentos.
- [x] Verificar salvamentos sucessivos e erros, e testes existentes de configurações.

## Task 2: Calculadora única e cadastro de canais
**Files:** alterar `calculator-workspace.tsx`, `guided-pricing-form.tsx`, `use-pricing-draft.tsx`; criar `channel-registration.tsx`; testar `calculator-workspace.test.tsx` e `pricing-v3-ui.test.tsx`.
**Interfaces:** formulário guiado recebe `canManageChannels`; hook incorpora e seleciona canal retornado pela API sem reiniciar rascunho.
- [x] Testar ausência do formulário original e cadastro/seleção de canal sem perder quantidade; observar falha.
- [x] Retirar consulta ao formulário original do workspace, preservar proteção de saída e aplicação ao produto; portar cadastro de canais deste chat.
- [x] Verificar cenários de falha e permissão, com os testes existentes de cálculo e versões históricas.

## Task 3: Versão e validação
- [x] Incrementar PATCH sobre origin/main uma vez, sincronizar manifestos e adicionar nota em português.
- [x] Executar testes pertinentes, tipos, lint e build; revisar alterações e conferir rodapés/histórico.
- [x] Registrar resultados, criar commit local e entregar estado de merge/publicação.

## Registro de execução
Execução direta neste chat conforme aprovação do usuário. A pasta original está em versão antiga com alterações alheias; a implementação usa uma worktree limpa sobre origin/main 1.27.13. A correção de canal anterior será portada sem trazer manifestos ou arquivos antigos.

### Resultados intermediários
- Baseline: 4 arquivos de testes, 8 testes aprovados antes da alteração.
- Falhas esperadas reproduzidas antes da implementação: workspace ausente, presença do formulário original e ausência do cadastro de canal.
- Novos fluxos: navegação por teclado, isolamento de assuntos, rascunhos e versão compartilhada; cadastro de canal, falha de rede e permissão; proteção de saída da calculadora/comparações.
- Revisão independente: nenhum achado funcional relevante; ajuste menor de rotulagem acessível em Equipe aplicado e testado.
- Tipos, lint e build de produção passaram. A conferência visual local usou dados sintéticos e o CSS real, em desktop e tela pequena; sem rolagem horizontal na página.
- A primeira suíte ampla teve 1042 testes aprovados e 2 expectativas antigas sobre o formulário original. As expectativas foram atualizadas para o fluxo aprovado, com reexecução direcionada verde; a suíte ampla foi repetida com sucesso: 242 arquivos e 1.044 testes aprovados.
- Versão de origin/main conferida novamente: 1.27.13. Esta entrega usa PATCH 1.27.14, sem tocar notas anteriores.
- Ruling: rascunhos ficam montados dentro de abas ocultas, evitando perda ao alternar. Os parâmetros compartilham um provider e salvamento explícito conjunto; custos percentuais antigos não foram convertidos nem removidos dos dados históricos.

### Entrega local
- Suíte final: `npx vitest run tests/unit --fileParallelism --maxWorkers=2 --reporter=dot` — 242 arquivos, 1.044 testes aprovados.
- `npm run typecheck`, `npm run lint` e `npm run build` aprovados; lint direcionado e tipos repetidos após o ajuste acessível.
- Testes de versão confirmam manifestos, histórico e rodapés reais de login/painel, incluindo Atualizações para ADMIN e OPERATOR.
- Branch: `codex/configuracoes-calculadora`. Sem push, PR, merge, Release ou implantação. Nenhuma operação em banco de produção.
- A prévia temporária foi removida. Captura local com dados sintéticos preservada fora do repositório.
