# Publicação local 1.12.0 — 29/10/2026

Usuário autorizou abrir PR, conferir CI, integrar e publicar localmente com backup/migração, e depois auditar as pendências do roadmap incluindo outros chats.

[PR #31](https://github.com/bsgirardi/appb2t/pull/31) integrada às 11:16:19 UTC, commit `6e901a7cf2fa7f405b6d3167fd789e709cb03188`. Main local sincronizada por fast-forward. Versão única 1.12.0 da PR preservada, sem novo incremento ou tags. O conector GitHub retornou 404 para o repositório privado; GitHub CLI autenticado concluiu a operação e a PR foi anexada ao chat.

## Validação do código

[CI da PR aprovado](https://github.com/bsgirardi/appb2t/actions/runs/40862830322): tipos/lint/build; suíte padrão com **989 testes em 294 arquivos** (685 unitários + 304 integrações), E3 com 29, E4 com 21, E5 com 32 e E6 com 9 testes. As suítes têm casos sobrepostos; não somar esses números como casos únicos. O CI de push na main foi iniciado separadamente; a aprovação usada para integrar foi a execução da PR no head exato `7b801dacbef6a7fc9c6c0969d4c38d8f1f538e9b`.

Imagens runtime e tools construídas para o commit integrado, com etiqueta OCI de revisão conferida. Runtime contém sharp e fflate e manifesta 1.12.0; ferramentas também manifestam 1.12.0. [Validação funcional e limites da E6.1](reviews/2026-10-29-e6-anuncios.md).

## Backup e migração

Instalação anterior: 1.10.1. Imagem, configuração, ambiente, identidade do contêiner/banco/mounts e alterações locais preservados privadamente em `backups/publicacao-1.12.0-20261029/`. Documentos locais preservados também em stash identificado no próprio backup; skills e arquivos de outros chats mantidos. As cópias locais dos quatro documentos E5 foram preservadas antes de receber suas versões rastreadas da main; estas contêm os registros anteriores e a integração posterior.

Aplicação parada antes do backup final. `final.dump`: **263485 bytes**, SHA-256 `92f4b28f2b3f786ab85c7c9bdefc1e54bec90eb8919aafb05edd4e7f001c5a7a`. Formato custom verificado e restauração real em PostgreSQL 17 isolado, sem portas publicadas, sem usar o volume operacional. Migrações ensaiadas nesse banco antes da operação.

**106 projeções das colunas anteriores idênticas** em quatro comparações: restauração, ensaio migrado, banco operacional migrado e aplicação publicada. Aplicadas `202610280001_consignment` (E5) e `202610290001_advertising_drafts` (E6). Mesmo contêiner PostgreSQL e mesmos mounts, incluindo volume de dados, preservados. Não foram criados usuários, sessões artificiais ou operações fictícias no banco publicado; nenhuma senha foi alterada.

Aplicação e banco saudáveis. Imagem em execução identificada pelo commit integrado, aliases app/tools atualizados somente após a conferência. Configuração instalada e imagem registradas privadamente para recuperação. PostgreSQL isolado de restauração removido; backup final e imagem anterior preservados.

## Conferência publicada

- `http://localhost:3000`: catálogo, login e saúde retornam 200.
- `/anuncios`, `/atualizacoes` e `/pontos-de-venda` sem sessão redirecionam 307 ao login; `/api/anuncios` retorna 401.
- Login conferido no navegador com **1.12.0**; captura em `.superpowers/e6-publicado-login.jpg`.
- Painel e histórico usam APP_VERSION; cobertura dos componentes reais ADMIN/OPERATOR e ensaio autenticado em base fictícia constam da validação E6/CI. Não havia sessão operacional autenticada disponível para conferir essas telas no navegador publicado.
- Instalação permanece limitada a `127.0.0.1:3000`. Publicação externa/HTTPS, backups automáticos externos e aceite dos fluxos reais pela equipe continuam pendentes de operação.

O código integrado/publicado é 1.12.0. Este registro pós-publicação e a auditoria do roadmap são documentação local de acompanhamento, ainda sem uma nova PR; não representam outro incremento de versão ou nova publicação.
