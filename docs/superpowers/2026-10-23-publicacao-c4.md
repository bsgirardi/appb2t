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

Publicação em execução. Backup final, comparação operacional, saúde HTTP, identidade da imagem e integração Git serão registrados após os comandos concluírem. A criação do primeiro administrador continua interativa, sem senha no chat ou credenciais inventadas.
