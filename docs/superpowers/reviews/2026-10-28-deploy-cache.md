# Auditoria e validação do deploy manual — 1.10.2

## Escopo

Branch codex/deploy-cache, origin/main 7fe37d9 (1.10.1) conferida antes da entrega. Nenhum push, merge ou deploy. Produção Debian recebeu somente diagnóstico de leitura; o restante ocorreu no Docker Desktop local, com imagens e bancos de teste próprios. Não houve mudança no .env, Docker global ou containers existentes.

## Diagnóstico comprovado no Debian

Histórico BuildKit de 28/10: tools 2h04min24s; npm ci 69,2 s; Prisma/Next 2247,3 s; chown recursivo 4796,6 s; exportação tools 330,5 s. O dia anterior confirma chown 4661,8 s. Essa é a causa principal da espera prolongada. Next também escreve cache sem recuperação entre camadas invalidadas. Contexto transferido: 625,58 kB em 0,3 s, sem relevância no atraso observado.

Swap/I/O históricos não foram recuperados. A coleta ociosa não reproduz os recursos durante a construção. O cache global de 32,67 GB não foi limpo. A aplicação ativa estava em 1.4.1, embora checkout fosse 1.10.1; a imagem latest diferia da executada. Duas migrações ausentes no banco não foram aplicadas.

## Correção entregue

- Tools deriva de deps, sem Next ou .next, com arquivos administrativos e dependências completas.
- Cliente Prisma gerado em camada própria. COPY --chown substitui alteração recursiva; somente /app vazio recebe chown.
- Cache mounts npm e Next identificados pelo projeto, com propriedade do usuário node.
- Contexto exclui documentação, arquivos locais e entradas exclusivas do deploy; testes/configuração TypeScript continuam presentes.
- Builds sequenciais, imagens por commit, tools compartilhada entre migrate/admin, labels OCI, aliases latest somente após validação.
- Scripts preservam fast-forward e bloqueio, medem etapas/indisponibilidade, verificam imagem e saúde e pulam nova parada quando imagem/configuração/migrações correspondem.
- Backup falhou antes de migrar: tentar start do container existente. Após iniciar migração, exigir recuperação manual. Snapshot anterior confirmado somente quando hash e imagem correspondem ao container atual.

## Evidências locais

Linux Docker Desktop, aproximadamente 2 GB de RAM e 20 CPUs disponíveis; configurações/armazenamento diferem do Debian de 8 CPUs. Não converter estes tempos em promessa para produção.

- Primeiro tools novo: 86,4 s totais, incluindo download de base/frontend; npm ci 25,3 s; Prisma 2,0 s; exportação 37,0 s. Não houve etapa Next ou chown recursivo.
- Primeiro runtime novo: 72,2 s totais com deps já em cache; Next 55,4 s. Uma repetição idêntica posterior levou 1,53 s com camadas reutilizadas; não representa atualização funcional.
- Contexto alternativo com alteração de bytes em src/lib/errors.ts: Next executou novamente, compilação 6,8 s, TypeScript 27,8 s, RUN 41,2 s. O contexto tar muda metadados e também reinstalou deps; não é comparação controlada do tempo total.
- Montagem de cache inspecionada entre execuções: 145460 KiB presentes. Cache ausente do runtime final.
- Imagens locais: tools 368522658 bytes; runtime medido 153265587 bytes. Ambas executam como node/UID 1000.
- Origem tar com arquivos modo 0600: build tools e leitura de package.json/schema/scripts/módulos administrativos aprovados como UID 1000, sem EACCES.
- CLI administrativo carregado e argumento inválido recusado, sem criar usuário, sessão ou senha.
- 29 migrações aplicadas exclusivamente em PostgreSQL descartável. Dump custom validado e restaurado em outro banco, com 29 registros de migrações restaurados. Não comprova dados legados de produção.
- Health e login HTTP 200 no runtime candidato; login contém 1.10.2. Compose real isolado confirmou igualdade entre config --hash app e label com.docker.compose.config-hash.
- Shell Linux: 18 cenários Docker, atualização Git e bloqueio real aprovados. Incluem falha de stop, dump, catálogo, retomada, migração, saúde, imagem errada, aliases, no-op, mudança de configuração e migração pendente. Sentinela privada não aparece na saída.
- Typecheck, lint, sintaxe Bash, Compose, manifestos e teste de rodapés/Atualizações aprovados; 621 testes unitários em 152 arquivos aprovados.
- Suíte padrão completa em Linux, com PostgreSQL exclusivo na porta interna 55432/b2t_test (sem porta publicada no host): **925 testes aprovados em 275 arquivos**, 250,53 s. Suítes exclusivas E3/E4 não foram executadas, pois não houve alteração em seus módulos ou migrações.
- Build final após excluir entradas exclusivas do deploy: 47,76 s totais; Next 18,7 s, incluindo compilação 4,1 s e TypeScript 10,2 s. Variações de cache/carga impedem atribuir isoladamente essa diferença a uma alteração.

## Recursos e limites

Três amostras durante ensaio local, não picos: RAM disponível entre 951932 e 1046316 KiB; swap livre entre 441496 e 524308 KiB de 1048572 KiB. pswpout permaneceu 6323452; houve swap-in. PSI de I/O avg10 entre 7,01% e 12,06%, memória entre 0,62% e 1,71%. São métricas agregadas da VM compartilhada, não atribuíveis somente ao APP B2T; RSS máximo e latência de dispositivo por etapa continuam sem medição. Não foi alterada a configuração de memória do Docker.

## Revisão independente

P1 corrigido: o export de APP_IMAGE_TAG no subprocesso não persistia para comandos posteriores, que poderiam selecionar latest antigo. Aliases agora são publicados somente após identidade/saúde e verificados por testes. P2 tratado: snapshot com drift não é apresentado como Compose anterior confirmado. Revisão final sem bloqueadores; diff --check aprovado.

Dois docker tag não são atômicos. Uma falha retorna erro, sem sucesso falso; repetir o script após avaliar o estado repara aliases pelo caminho de no-op. Até reparar, não executar up com latest. A primeira entrega em instalação legada não tem Compose anterior completo; usar inspect privado e revisão manual.

## Antes de publicar

Autorização separada para push/PR/merge e deploy. Conferir novamente main e versão antes do merge. No Debian, registrar tempos e recursos por etapa durante o primeiro build autorizado; validar backup restaurável e compatibilidade das duas migrações pendentes com a imagem anterior. Health SELECT 1 não substitui verificações de versão e fluxos. Não há estimativa de tempo de produção após a correção.
