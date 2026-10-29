# Otimização do deploy APP B2T

> Execução: superpowers:executing-plans nesta branch, sem publicar.

**Objetivo:** remover o chown recursivo medido em 4796,6 s e reaproveitar caches locais.
**Arquitetura:** base → deps → build → runtime; deps → tools. Node 22, Next 16.4.2, Prisma 6, PostgreSQL 17.
**Especificação:** Fase 2 aprovada nesta conversa em 28/10/2026.

## Restrições
- Não alterar produção, .env, main ou Docker global. Não fazer push/merge.
- Manter scripts, standalone, verificações TS, persistência, portas e healthchecks.
- Uma versão PATCH por entrega e notas em português.

## Plano
- [x] Testes shell: builds sequenciais, falhas, retomada antes de migrar, imagem incorreta, no-op e bloqueio.
- [x] Separar tools, corrigir permissões na cópia e persistir caches npm/Next.
- [x] Identificar imagens por commit e compartilhar tools entre migrate/admin.
- [x] Medir etapas/indisponibilidade e verificar imagem publicada.
- [x] Atualizar documentação, versão e histórico.
- [x] Validar shell, Compose, imagens Linux, cache, permissões, tipos, lint e testes pertinentes.
- [x] Revisão independente; entregar sem publicar.

## Evidências e decisões
- Servidor: checkout 7fe37d9, runtime 1.4.1. Tools: npm ci 69,2 s; build 2247,3 s; chown 4796,6 s; exportação 330,5 s.
- Backup continua com app parada. Não retornar automaticamente após começar migração.
- Testes/configurações TS ficam no contexto; dependências completas em tools, sem segundo npm ci.
- Cache vazio deve funcionar. Nunca limpar caches compartilhados para comparar desempenho.
- Instalações legadas não têm Compose anterior arquivado: preservar inspect privado e exigir recuperação manual após migração.
- Revisão encontrou seleção latest antiga após subprocesso: corrigida com aliases somente após saúde/identidade e testes de falha. Snapshot com drift é marcado não confirmado.
- 925 testes em 275 arquivos aprovados em Linux; 18 cenários shell, Git e flock aprovados. Evidências e limitações em ../reviews/2026-10-28-deploy-cache.md.
