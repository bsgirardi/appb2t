# Catálogo e Kits — plano de implementação

> Execução direta com superpowers:executing-plans; revisão independente ao final.

**Goal:** localizar produtos/kits e editar com segurança, preservando contratos comerciais.
**Architecture:** listas completas já carregadas pelo servidor; busca/filtro local com contexto na URL. Reutilizar useDocumentExit nos formulários com impressão digital dos campos dinâmicos, galeria e memória. Sem migração ou alteração dos motores.
**Tech Stack:** Next 16, React 19, TypeScript, shadcn local, Vitest.
**Spec:** desenho de 05/11/2026 aprovado pelo usuário no chat, disponível na PR #42.

## Restrições

- Preservar regras, rotas, ADMIN/OPERATOR, checkout e concorrência.
- Separar esta branch de implementação da PR documental #42, sem merge/deploy.
- Estado e disponibilidade não são sinônimos; busca cobre somente a coleção efetivamente carregada.
- Testar histórico, filtros combinados, galerias, composição, falhas, conflitos e salvamento.

## Tarefas

- [x] Escrever testes das listas: nome/acentos, filtro de estado, vazio, URL/histórico, erro de atualização mantendo registros. Observar falha, implementar helper e controles compartilhados em components/admin e integrar ProductPanel/KitPanel.
- [x] Escrever testes de saída nos formulários: texto, galeria, composição, cancelamento recusado, falha/conflito e salvamento. Observar falha; reutilizar useDocumentExit com estado completo e liberar somente após sucesso.
- [x] Organizar apresentação: status, identificação, resumos, ações compartilhadas e Empty. Preservar as seções já existentes; conferir mobile/desktop, teclado e temas.
- [x] Executar regressões, tipos/lint/build, revisão independente e correções. Documentar evidências e limites; preparar versão MINOR conforme main atual, sem alterar notas anteriores.

## Registro

- Base: main 1.20.0, 4524ca1. PR #42 documental separada (1.20.1), ainda sem merge na abertura desta branch.
- Decisão: consultas de produtos e kits não têm paginação/take na leitura administrativa; filtrar o conjunto carregado preserva a arquitetura. Não criar requisição por tecla.

## Resultado e limite

Implementação e revisão concluídas: 880 unitários, 34 focados, tipos/lint/build aprovados; sem schema, permissões ou operação alterados. Revisão corrigiu rascunho de custo e corridas assíncronas. A tarefa de apresentação tem implementação concluída, mas sua conferência visual solicitada no item permanece aberta:

- [ ] Validar no navegador celular/desktop, teclado/foco e temas com fixtures. Automação retornou inventário vazio; prévia reproduzível em tests/catalog-admin-preview.html, porta 4321. Não tratar jsdom como aceite visual.

Versão 1.21.0 preparada, sem merge ou publicação. PR #42 documental separada; reconciliar notas e versões antes da integração.

## Continuidade em 06/11/2026

Reconciliação com main 1.21.1 e PR #42 documental 1.21.2; funcionalidade preparada em 1.22.0, sem novo incremento por commit de resolução. Revisão independente identificou perda de foco nos filtros; duas regressões RED→GREEN e sincronização sem remontar o formulário. Evidências atuais e limite de confirmação nativa em docs/ux-catalogo-kits/ENTREGA.md. A tarefa visual permanece parcialmente aberta; sem autorização de merge ou publicação.
