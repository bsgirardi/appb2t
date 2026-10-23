# Segurança e execução local

Objetivo: corrigir os alertas de produção do Next.js e preparar uma instalação vazia neste computador, conforme autorizado. Referências: SEGURANCA.md e PRODUCAO.md.

- [x] Confirmar auditoria anterior e disponibilidade de Next.js/eslint-config-next 16.4.2.
- [x] Fixar ambos em 16.4.2, preservando as demais dependências e regras de lint; conferir o lockfile e os guias instalados.
- [x] Executar auditorias completa e de produção, testes unitários no Node 22, tipagem, lint e build.
- [ ] Recuperar a inicialização Docker/WSL, inventariar volumes antes de iniciar o banco vazio e preservar bancos de outros aplicativos.
- [ ] Executar migrações e suíte completa somente no banco dedicado b2t_test; validar build Docker e instalação local antes de publicar.
- [ ] Registrar resultados e bloqueios. Criar o primeiro administrador interativamente quando a instalação estiver pronta.

Não importar dados antigos, usar audit fix --force, rebaixar lint ou avançar C4/C5 nesta manutenção. A auditoria vulnerável já reproduz a falha de segurança; a regressão será verificada pela auditoria e pela suíte existente, sem testes artificiais de versão.

## Resultado da rodada

Next.js/eslint-config-next 16.4.2 instalados; diff do lockfile restrito à família Next. Auditoria de produção zerada e cinco alertas altos de desenvolvimento preservados. Node 22.23.4: 399 testes unitários/99 arquivos, tipagem, lint e build Windows aprovados. Diff sem erros de espaços. Branch local `codex/seguranca-next-local`, sem commit ou publicação.

Docker: VM Hyper-V inicialmente sem memória; depois iniciou, mas a API retornou 500 e o serviço interno recusou conexão. Reinício controlado excedeu 90 segundos, com processos ainda ativos e estado `stopping`. Reiniciar o Windows e conferir Docker antes de retomar os passos de banco/integração. Nenhum volume, banco ou conta foi criado nesta rodada.

## Validação e instalação local concluídas — 23/10/2026

Docker recuperado e inventário inicial sem contêineres/volumes. PostgreSQL 17 dedicado de testes criado na porta 55432; 23 migrações aplicadas. Suíte completa no contêiner Linux/Node 22: 651 testes em 199 arquivos aprovados, saída zero (160,13 s). As tentativas Windows sem progresso foram interrompidas e não contam como validação completa.

O teste planning-flow dependia do horário atual e falhava antes das 08h20 de São Paulo ao registrar um marco futuro. Falha reproduzida isoladamente; relógio fixado apenas nesse teste e restaurado ao terminar. Cenário isolado e suíte completa aprovados. A aplicação não foi alterada por essa correção de teste.

Build Docker aprovado. Instalação vazia iniciada com Compose: app e banco saudáveis, migração concluída. HTTP: /api/health, / e /login retornam 200; /dashboard retorna 307 para /login. Banco operacional próprio appb2t_postgres_data, separado de appb2t-test_test_data; contagem de usuários zero. Primeiro administrador ainda precisa ser criado interativamente com `docker compose --profile tools run --rm admin` no terminal local. Não informar senha no chat.

Atualização Next.js/eslint-config-next 16.4.2 instalada localmente. Auditoria de produção zerada; cinco alertas altos de desenvolvimento continuam pendentes upstream. C4 e C5 permanecem para etapas futuras. Sem commit ou push nesta rodada.
