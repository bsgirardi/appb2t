# Segurança das dependências — appb2t

## Candidata de segurança — 23/10/2026

Next.js e eslint-config-next atualizados de 16.3.8 para **16.4.2**, com versões exatas no package.json e lockfile. Auditoria de produção após a atualização: **zero vulnerabilidades**. A auditoria completa continua com cinco alertas altos na cadeia de desenvolvimento braces/micromatch/fast-glob/plugin de lint; não foi aplicado o rebaixamento para eslint-config-next 14.2.35 sugerido pelo npm nem audit fix --force. Sharp permanece em 0.35.5.

No novo computador, os 399 testes unitários em 99 arquivos passaram com Node 22.23.4; tipagem, lint e build Windows também passaram com Next.js 16.4.2. A integração, o build Docker e a publicação ainda estão pendentes. O Docker apresentou primeiro falta de memória no Hyper-V e depois erro 500 na API, impedindo iniciar o banco de testes. Nenhum banco foi importado ou migrado. O usuário escolheu instalação vazia; os bancos de outros aplicativos foram preservados.

Relatórios locais ignorados: `test-results/seguranca-20261023/audit-full.json` e `audit-production.json`. Esta candidata não altera a publicação 1.1.0 do computador anterior. A atualização só deve ser publicada após completar as verificações pendentes.

O reinício controlado `docker desktop restart --timeout 90` excedeu o limite ao tentar encerrar processos do Desktop; o estado final consultado foi `stopping`. A API 1.54 também falhou, descartando uma simples diferença de versão da API como solução. É necessário recuperar o Docker (próximo passo: reiniciar o Windows) antes da validação integrada. Nenhum encerramento forçado ou reinício do Windows foi executado pelo agente.

## Nova auditoria durante a sincronização local — 22/10/2026

A instalação limpa voltou a consultar o registro npm e identificou **seis pacotes sinalizados: um crítico em Next.js e cinco altos na cadeia de lint/braces**. Este resultado substitui o estado de zero alertas de produção registrado na auditoria anterior da release, que permanece como histórico. Evidência local: `test-results/release-1.1.0/sync-original-audit.json`.

O grupo Next.js inclui [otimização de imagens/SVG](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Server Actions](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) e [use cache com typed arrays](https://github.com/advisories/GHSA-673q-mjm6-r5xr). Os dois avisos críticos consultados indicam correção em 16.4.1; o npm propõe Next.js 16.4.2. A instalação atual usa sharp 0.35.5, a mitigação indicada para o aviso de imagens, e não foi encontrado uso de `use cache`/`cacheComponents` no código/configuração. Isso não elimina a pendência de atualização nem constitui auditoria completa de exposição.

Próxima manutenção prioritária: atualizar Next.js e seu pacote de lint compatível, ler os guias da versão instalada e executar testes/build antes de publicar a correção. A sincronização/limpeza não alterou dependências versionadas nem a aplicação em execução; não foi aplicado audit fix --force.

## Histórico: auditoria anterior de22/10/2026 — versão1.1.0

Auditoria repetida: `npm audit --omit=dev` sem alertas; auditoria completa com cinco alertas altos da cadeia braces/lint já descrita abaixo. Vite foi atualizado de7.3.6 para7.3.7 e Vitest de4.1.11 para4.1.12, eliminando três alertas adicionais (um alto e dois moderados) das ferramentas de desenvolvimento/testes. Next.js16.3.8 e as regras de lint foram preservados; não foi aplicado `audit fix --force` nem o rebaixamento incompatível sugerido pelo npm. Evidências locais ignoradas em `test-results/release-1.1.0/audit-*.json`.

## Histórico — revisão de15/10/2026

Complemento de validação em 16/10: build Docker com Next.js 16.3.8 aprovado na candidata visual; catálogo executado em ambiente isolado. Isso resolve o bloqueio de build descrito no histórico abaixo, sem publicação ou nova auditoria de dependências. Registro em `docs/superpowers/2026-10-16-catalogo-integrado.md`.

Publicação posterior em 16/10: a mesma candidata foi instalada localmente em http://localhost:3000, com backup e restauração de teste aprovados. A instalação local agora executa Next.js 16.3.8. Registro em `docs/superpowers/2026-10-16-nova-publicacao.md`; os parágrafos de implantação abaixo descrevem o estado histórico anterior.

## Correção aplicada

Next.js e eslint-config-next passaram de 16.3.6 para 16.3.8, com versões fixadas no package.json e no lockfile. A atualização permanece na mesma linha de manutenção. O npm audit anterior apontava seis avisos no pacote Next.js, incluindo SSRF no otimizador de imagens e problemas de cache; todos tinham correção indicada na versão 16.3.8.

## Pendência upstream

O aviso [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) afeta braces até 3.0.3 e ainda não possui versão corrigida publicada na data da revisão. O relatório contabiliza cinco pacotes por propagação na mesma cadeia:

eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces.

Essa cadeia é de desenvolvimento. No plugin Next instalado, fast-glob processa a configuração settings.next.rootDir; o projeto não configura esse campo. Não foi identificado caminho de entrada de requisições da aplicação para essa função. Essa análise reduz o alcance observado, mas não elimina o alerta nem equivale a uma auditoria completa de segurança.

Manter configurações de lint sob controle do projeto e não executar ferramentas sobre configurações não confiáveis. Acompanhar a correção upstream e repetir npm audit após atualizações. Não foi usado audit fix --force: a sugestão automática de rebaixar eslint-config-next para 14.2.35 não corresponde à linha Next.js 16 usada pelo projeto.

As regras de lint foram preservadas. Não há supressão do relatório ou substituição artesanal da biblioteca vulnerável.

## Implantação

A correção é entregue no código e no pacote para novo build. A instalação antiga continua com sua imagem anterior até uma implantação explícita. Nenhum banco ou credencial real integra o pacote.

## Validação realizada

- npm audit --omit=dev: zero vulnerabilidades conhecidas.
- npm audit completo: cinco alertas altos da cadeia de lint descrita acima.
- npm run test:unit: 298 testes passaram, em 71 arquivos.
- npm run lint: passou.
- npm run build no Windows: passou com Next.js 16.3.8, incluindo TypeScript e geração das páginas.
- Build Docker desta atualização: não executado até o fim, pois Docker Desktop retornou erro de inicialização antes do build. Repetir o build Linux/Docker no servidor de destino conforme PRODUCAO.md. O build Docker validado anteriormente era da versão 16.3.6.

Não foi reiniciado ou atualizado nenhum serviço da instalação existente. A indisponibilidade do Docker impediu reconfirmar sua saúde nesta rodada.

## Validação e instalação local concluídas — 23/10/2026

Docker recuperado e inventário inicial sem contêineres/volumes. PostgreSQL 17 dedicado de testes criado na porta 55432; 23 migrações aplicadas. Suíte completa no contêiner Linux/Node 22: 651 testes em 199 arquivos aprovados, saída zero (160,13 s). As tentativas Windows sem progresso foram interrompidas e não contam como validação completa.

O teste planning-flow dependia do horário atual e falhava antes das 08h20 de São Paulo ao registrar um marco futuro. Falha reproduzida isoladamente; relógio fixado apenas nesse teste e restaurado ao terminar. Cenário isolado e suíte completa aprovados. A aplicação não foi alterada por essa correção de teste.

Build Docker aprovado. Instalação vazia iniciada com Compose: app e banco saudáveis, migração concluída. HTTP: /api/health, / e /login retornam 200; /dashboard retorna 307 para /login. Banco operacional próprio appb2t_postgres_data, separado de appb2t-test_test_data; contagem de usuários zero. Primeiro administrador ainda precisa ser criado interativamente com `docker compose --profile tools run --rm admin` no terminal local. Não informar senha no chat.

Atualização Next.js/eslint-config-next 16.4.2 instalada localmente. Auditoria de produção zerada; cinco alertas altos de desenvolvimento continuam pendentes upstream. C4 e C5 permanecem para etapas futuras. Sem commit ou push nesta rodada.
