# Atualização do servidor — plano

**Objetivo:** atualizar código e publicar a aplicação com dois comandos Bash.
**Arquitetura:** scripts independentes, bloqueio compartilhado, backup antes de migrar, saúde pelo Compose existente.
**Spec:** ../specs/2026-10-27-atualizacao-servidor-design.md

- [x] Criar scripts em scripts/atualizar-{projeto,docker}.sh.
- [x] Validar com comandos simulados: sucesso, Git sujo, falhas de build, dump, migração e saúde; nenhuma migração após dump inválido.
- [x] Substituir procedimento longo de atualização no guia por dois comandos; explicar adoção inicial e recuperação.
- [x] Atualizar manifestos e histórico para PATCH 1.4.1; verificar APP_VERSION nos rodapés e acesso autenticado ao histórico.
- [x] Conferir sintaxe Bash, testes dos scripts, consistência da versão e diff. Não publicar no servidor nesta tarefa.

Validação: sintaxe Bash e oito cenários simulados aprovados (sucesso, build, dump, dump inválido, migração, saúde, Git e bloqueio). No Git Bash, flock é simulado; em Linux o teste utiliza flock real. Docker e WSL indisponíveis por permissão neste ambiente; não houve implantação real. Manifestos, histórico e uso de APP_VERSION nos rodapés conferidos.

Revisão final da entrega 1.4.1 em 27/10/2026: revisão independente sem problemas importantes; sintaxe Bash e oito cenários simulados aprovados; lint e build de produção aprovados; suíte da aplicação aprovada com 821 testes em 254 arquivos. A execução excluiu cópias locais em .superpowers/ e arquivos alheios em .agents/. A rodada final usou exclusivamente o banco local descartável b2t_test, sem concorrência de outra suíte. Manifestos, histórico, APP_VERSION nos dois rodapés e acesso autenticado à página /atualizacoes conferidos. Docker/Linux e restauração real não foram exercitados; nenhuma publicação no servidor foi executada.