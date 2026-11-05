# Produção e Estoque Implementation Plan

**Goal:** Melhorar leitura e navegação sem alterar comandos operacionais.
**Architecture:** Compor componentes administrativos existentes nos painéis atuais; proteção de saída reutiliza o mecanismo de histórico existente.
**Tech Stack:** Next 16, React, shadcn/ui local, Vitest.
**Spec:** docs/superpowers/specs/2026-11-05-producao-estoque-design.md

## Restrições

Sem schema ou dependências novas; sem escrita no banco publicado; preservar autorização, idempotência, concorrência, estoque e valoração. Versão única por entrega.

## Tarefas

- [x] Testar e implementar resumo de ordens em `components/production`, incluindo metas canceladas e máquinas não definidas.
- [x] Testar e implementar proteção de troca de ação em `components/admin`, reutilizando `useDocumentExit`; atualização e ações internas de formulário devem preservar campos.
- [x] Compor resumo, estados de carga/erro/vazio nos painéis; organizar detalhe e esconder listas durante edição.
- [x] Atualizar filtros/paginação/contexto nas páginas de Produção e Estoque.
- [x] Validar testes existentes, tipos, lint e prévia fictícia. Registrar evidências e limites.
- [x] Comparar versão disponível de main e registrar 1.20.0 nos manifestos e histórico (funcionalidade compatível de proteção de saída).

## Foco da revisão

Metas canceladas não podem inflar pendências; ausência de máquina não é bloqueio presumido; falhas de carga não podem abrir registro anterior como novo; refresh não descarta campos; operador não deve ver ações financeiras exclusivas.

## Registro de execução

Decisão: preservar a worktree criada pelo chat e executar o recorte com os componentes existentes, conforme autonomia expressa no pedido. Não alterar os motores ou criar novo kanban. Revisão independente concluída e achados corrigidos. Evidências, verificações e limites em `docs/superpowers/validations/2026-11-05-producao-estoque-ux.md`. PR autorizada no pedido de continuidade. Merge e publicação operacional não autorizados.
