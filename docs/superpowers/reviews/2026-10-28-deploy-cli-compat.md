# Correção de compatibilidade do deploy — 1.10.3

## Problema reproduzido

Compose run não aceita --no-build, tanto no CLI local como no Compose 5.6.1 Debian. Os testes simulados anteriores aceitavam a flag e não detectaram a incompatibilidade. A publicação 1.10.2 foi interrompida antes de executar novas migrações; o banco permaneceu com 27 registros completos. A aplicação 1.4.1 foi retomada. Janela conservadora da primeira tentativa: 143 s, incluindo suspensão por stdin de um procedimento operacional em background.

Também foi observado que compose start app pode iniciar dependências. Uma imagem original ausente impede o tag de recuperação, embora o container continue executando. Na operação foi criado um snapshot sem pausa e ensaiado: 103 projeções legadas idênticas após migração, health e login 1.4.1 aprovados no banco restaurado.

## Correção

- Migrar/status com run --rm --no-deps --pull never -T --interactive=false. Confirmar imagem tools existente antes da pausa.
- Validar os parsers run/exec com --help no preflight. Não aplicar --no-build a run; manter em up, onde é suportado.
- Fechar stdin do pg_dump; pg_restore recebe o arquivo explicitamente.
- Recuperar por docker start com ID exato e polling de saúde, sem dependências ou troca de imagem.
- Interromper antes dos builds quando a imagem atual estiver ausente; snapshot não é criado automaticamente.
- Teste real da CLI executa imagem local com stdin fechado e contexto de build inexistente: comprova que a execução não depende de build/pull/TTY.

## Plano e validação

- [x] Reproduzir rejeição de --no-build no CLI real e fazer o cenário de sucesso simulado falhar.
- [x] Implementar comandos compatíveis e recuperação direta.
- [x] Validar 22 cenários shell em Linux, fluxo Git/flock e CLI real; tipos, lint, 3 testes de versão/rodapés, builds tools/runtime e revisão independente aprovados.
- [ ] Entregar PATCH 1.10.3 em PR separada, pois 1.10.2 já foi integrada; não incrementar novamente a mesma PR.
- [ ] Publicar manualmente após os testes, com novo backup final e comparação de integridade.

Não alterar .env, dados comerciais ou configurações globais; não limpar cache compartilhado. Os tempos de construção já medidos no Debian para 1.10.2 são 217 s em tools e 1075 s em runtime; novos tempos serão registrados na publicação corrigida.
