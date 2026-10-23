# Publicação C4 — 23/10/2026

Publicação local autorizada pelo usuário após implementação e validação. C5 permanece somente documentado, sem implementação de checkout nesta publicação.

## Código e validação

Branch `codex/catalogo-c4`, base `5e5ec24`, implementação `dde14b5` e `f519ffb`. A atualização Next.js/eslint-config-next 16.4.2 e o teste de relógio determinístico foram preservados separadamente em `19e206c`; o histórico da preparação local foi registrado em `f5eb30e`. Decisões C5 em `6c80eec`.

Suíte Linux/Node 22 final: 683 testes aprovados em 211 arquivos, nenhuma falha. Tipagem, lint, build standalone e auditorias de produção/completa aprovados; as auditorias retornaram zero vulnerabilidades conhecidas. Revisão independente teve quatro achados corrigidos com regressões. O teste HTTP final na imagem Docker confirmou PDF passivo aceito, PDF com JavaScript rejeitado, download privado e bloqueio sem sessão. A resolução do parser no worker e o rastreamento da entrada CJS foram corrigidos e revalidados.

No navegador, aprovação demonstrativa e recibo após recarga, painel da equipe com revogação, 320/390/1440 px sem transbordamento e foco visível por teclado. Tema claro e movimento reduzido não tiveram certificação visual nesta rodada por falta de emulação no navegador disponível. Detalhes no [registro de validação](2026-10-23-catalogo-c4-validacao.md).

## Procedimento operacional

Preservar projeto Compose `appb2t`, banco PostgreSQL 17 e volume `appb2t_postgres_data`. Não importar fixtures nem dados antigos. A chave `ART_ACCESS_KEY` operacional é gerada separadamente e conservada somente na configuração privada. Imagem anterior preservada como `appb2t:before-c4-20261023`; candidata validada identificada como `appb2t:c4-20261023` e ferramenta de migração como `appb2t:c4-20261023-tools`.

O ensaio anterior restaurou o backup em banco separado e aplicou as duas migrações C4; as contagens/hashes das 85 tabelas legadas foram preservados na instalação vazia. Para a troca final: parar a aplicação, gerar backup novo, comparar projeções antes/depois da migração e subir a imagem fixada. Não executar downgrade cego após novas decisões C4: preferir correção para frente ou restauração conciliada.

## Resultado

Publicação local concluída em http://localhost:3000. Backup final com aplicação parada: `X:/codex/appb2t/backups/publicacao-c4-20261023/final.dump`, 209891 bytes, SHA-256 `22002829DF6DD69BB11D02D218DE7FA1340590458A26FE2A653BC8B9DABE14E2`. Configuração privada, scripts, projeções e captura operacional ficam na mesma pasta ignorada.

Ambas as migrações C4 foram aplicadas com sucesso; as 85 projeções anteriores ficaram idênticas. O backup final foi restaurado em b2t_c4_final_restore, exclusivamente no PostgreSQL de testes, e migrado novamente; comparação das 85 projeções idêntica antes/depois.

Runtime appb2t:c4-20261023, ID sha256:4868b6ce0845c5ee3c0855dfaeff17d0ccf5c71c551b99066cbc5ac0ff0f487f, contêiner healthy. Volume appb2t_postgres_data preservado. Tags Compose padrão appb2t-app/appb2t-migrate/appb2t-admin também apontam às imagens C4.

HTTP: saúde, catálogo, login e página de arte 200; dashboard redireciona para login (307); revisão sem sessão 403; API interna sem login 401. Página privada com no-store/no-referrer. Chave operacional configurada e parser presente. Navegador confirmou orientação para abrir link privado. Zero usuários operacionais; nenhuma fixture ou conta criada. Primeiro administrador continua interativo, sem senha no chat.

Publicação externa com domínio/HTTPS e backups automáticos fora desta máquina continuam pendentes. [PR #4](https://github.com/bsgirardi/appb2t/pull/4) integrado em main, merge `9b6acbed553b4e6a033cd193b4501cfe8c15db59`. Checkout original X:/codex/appb2t sincronizado por fast-forward; árvore de código idêntica à implementação validada f519ffb. A configuração Compose operacional foi conferida novamente a partir do checkout original e segue healthy.

Os arquivos locais anteriores já contemplados na integração foram preservados no stash identificado por `Preserve pre-C4 local files already integrated through PR4`, sem reaplicar duplicatas. .agents e skills-lock.json permaneceram intactos, locais e fora dos commits. Worktree e evidências isoladas conservados para continuidade de C5. Marco Git: c4-2026-10-23.
