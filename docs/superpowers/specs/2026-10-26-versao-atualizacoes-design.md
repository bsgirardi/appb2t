# Versão e página de Atualizações

Data: 26/10/2026

## Objetivo

Identificar a versão instalada e permitir que administradores e operadores consultem as novidades do sistema em linguagem simples.

## Proposta

- Atualizar de 1.1.0 para 1.2.0, refletindo as funcionalidades novas dos dashboards. Manter package.json como fonte única da versão e sincronizar package-lock.json.
- Exibir “Versão 1.2.0” no rodapé de todas as telas administrativas, com link para /atualizacoes. No login, exibir a versão abaixo do formulário, visível também no celular.
- Criar /atualizacoes, protegida pelo acesso existente do painel e disponível para administradores e operadores. Adicionar “Atualizações” ao menu.
- Mostrar a versão atual em destaque e histórico em ordem decrescente, com versão, data e seções de Novidades, Melhorias e Correções quando houver conteúdo. Reutilizar Card e Badge existentes, respeitando temas e telas pequenas.
- Iniciar o histórico com 1.2.0 (seis dashboards, seleção e filtros de período, novos indicadores, gráficos e prioridades; rodapés e página de Atualizações) e 1.1.0 (registro de 22/10/2026: catálogo com faixas e kits, navegação administrativa e dashboard inicial). Documentar apenas entregas confirmadas; não afirmar implantação remota ou validação com movimentação real.
- Manter as notas em arquivo versionado, atualizado nas próximas releases. Não incluir dados internos, credenciais, commits ou logs técnicos na página.

## Abordagens

Uma lista versionada junto do código é a opção proposta: simples de manter e acompanha cada release. Um editor de novidades no banco acrescentaria cadastro e permissões sem necessidade atual. Um histórico automático do Git exporia detalhes técnicos inadequados para os usuários.

## Escopo e verificação

Não requer alteração do banco. Conferir versão única, acesso pelos dois perfis, login móvel, menu ativo, temas, tipagem e lint. Não realizar nova implantação ou merge sem necessidade do escopo atual.
