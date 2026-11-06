# Distribuição privada de imagens prontas — desenho

Data: 05/11/2026. Abordagem aprovada no chat; documento detalhado para revisão antes da implementação.

## Objetivo e restrições

Retirar a compilação do servidor de produção on-premises (~1906 MiB de RAM), mantendo portabilidade para uma VM Linux na nuvem. GitHub será usado para código e distribuição de arquivos, sem Actions, GHCR ou serviço adicional de build. A indisponibilidade do GitHub impede novas entregas, mas não a execução da versão instalada.

O repositório de código continua bsgirardi/appb2t. Proposta de nome para o novo repositório privado: bsgirardi/appb2t-distribuicao, a conferir antes de criar. Produção terá acesso somente de leitura a esse repositório. Nenhum segredo, ambiente, backup ou dado operacional será publicado.

## Alternativas e decisão

- Imagens anexadas às Releases do repositório atual: menos configuração, porém mistura permissões de fonte e distribuição.
- Repositório privado de distribuição com imagens anexadas às Releases: escolhido, separa permissões e permite implantação por download.
- Binários em commits Git: descartado por crescimento cumulativo do histórico.

Não depender de registry privado nem enviar o pacote por SSH. O operador executa manualmente o atualizador no servidor, que busca uma entrega específica no GitHub.

## Construção local

Gerar imagens dentro de Docker Linux, a partir de um commit completo e limpo pertencente a origin/main, sem incorporar alterações do workspace. Conferir arquitetura remota; padrão inicial proposto linux/amd64. Não compilar nativamente no Windows nem copiar seu node_modules.

Preservar Dockerfile em etapas, Next standalone, cache npm/Next, tools separado, usuário não root e geração Prisma correspondente ao schema. Executar tipos, lint, testes apropriados e build; testes de banco somente em banco isolado. Ambiente de build sintético, sem acesso ao banco operacional. Não desativar erros TypeScript.

Manter Debian slim e Node suportado pelo projeto. Verificar a versão atual de main antes de fixar a referência. Atualizações da base devem gerar novo digest, reconstrução testada e nova entrega; não atualizar pacotes dentro de containers em execução. Preservar caches nas builds normais; atualização controlada da base deve invalidar as camadas pertinentes. Não introduzir atualização de major do Node ou troca para Alpine nesta entrega.

## Contrato da entrega

Release publicada, não draft/prerelease, selecionada explicitamente por tag; nunca resolver latest silenciosamente. Proposta de identificador: app-v<VERSAO>-<COMMIT12>-<BUILDID>, permitindo reconstruções de segurança do mesmo commit sem sobrescrever a entrega anterior. A criação da tag no repositório de distribuição é parte explícita da publicação da Release; não criar tags no repositório de código automaticamente.

Arquivos anexados:

- images.tar.gz: docker save das imagens appb2t-app e appb2t-tools com tags exclusivas por entrega, comprimido. Nunca docker export.
- manifest.json: schemaVersion=1, release, appVersion, sourceRepository, sourceCommit (40 hex), platform, baseReference, imagens app/tools com tag e imageId sha256, arquivo, tamanho comprimido, estimativa de armazenamento descomprimido e SHA-256.
- compose.production.yaml e metadados/checksums correspondentes: configuração sem build, sem segredos, caminhos de dados parametrizados. Os scripts revisados ficam versionados no repositório de distribuição.

Rejeitar publicação se qualquer arquivo atingir 2 GiB, limite por asset do GitHub. Medir tamanho real antes; divisão de arquivos fica fora do escopo inicial. Publicar primeiro draft, subir todos os assets, conferir checksums/metadados e somente então publicar a Release; sem sobrescrever assets publicados. Falha deixa somente draft incompleto e não altera produção.

Checksum detecta corrupção; a confiança na origem decorre do acesso autenticado ao repositório autorizado via HTTPS. Não alegar assinatura criptográfica independente. Credencial de publicação separada da credencial de leitura de produção.

## Download e preparação no servidor

Dependências explícitas: Linux, Docker/Compose, Bash, flock, curl, jq, gzip e sha256sum. Token fine-grained com Contents:read restrito ao repositório de distribuição, em arquivo privado fora do Git, sem token em argumentos, URLs, logs ou imagens. Validar TLS; não encaminhar Authorization para outro host ao seguir redirecionamentos dos assets.

Bootstrap inicial documentado: instalar o script revisado e configurar o repositório e credencial. O atualizador não executa automaticamente scripts recém-baixados. Código novo do atualizador exige atualização explícita e revisão de compatibilidade. A configuração Compose candidata faz parte da entrega confiável e é preservada para auditoria.

Antes de alterar serviço: obter bloqueio por instalação, validar opções e nomes, identidade da instalação existente, Docker/Compose, credencial sem exibi-la, Release/manifest, arquitetura, espaço em staging e DockerRootDir, configuração candidata e existência da imagem anterior. Downloads com nome temporário, timeout e tentativas limitadas; renomear somente após tamanho/checksum corretos. Rejeitar nomes com caminhos, campos desconhecidos perigosos, duplicidade de assets e referência externa arbitrária.

Carregar images.tar.gz com docker load mantendo app ativa. Conferir image IDs, plataforma, versão e revisão OCI contra o manifesto. A identidade local é imageId; não presumir RepoDigest de registry em imagens transferidas por save/load. Não fazer pull nem build como fallback. Limitar concorrência e medir I/O durante o ensaio, pois load ainda usa disco no servidor pequeno.

## Troca e recuperação

Reutilizar o comportamento de preservação, backup final, migração, saúde e recuperação já existente. Preservar o mesmo banco, mounts, segredos, rede e bindings da instalação; não trocar volume por padrão nem executar compose down. Ensaiar a primeira configuração candidata contra o inspect e o Compose instalado.

Somente após imagens e configuração válidas: preservar imagem/configuração anteriores, parar app, fazer dump/checksum, aplicar migrações com tools da mesma entrega e iniciar app com --no-build e --pull never. Conferir saúde, imageId e versão. Atualizar registro instalado somente após confirmação. Medir fases e janela real de indisponibilidade.

Falha antes da parada mantém a aplicação anterior. Falha depois da parada e antes de iniciar migração tenta iniciar o container anterior exato e verifica saúde. Depois de iniciar migração, não retornar automaticamente imagem/banco: avaliar compatibilidade e migração parcial. Preservar backups e imagem anterior, sem prune global. Repetição da mesma entrega saudável e sem migração pendente encerra sem recriar app.

O deploy não garante zero downtime; backup/migração/troca permanecem na janela. Blue-green e proxy ficam fora desta entrega. A primeira implantação requer backup restaurado e ensaio isolado antes de tocar produção.

## Portabilidade

Mesmo pacote em host Linux compatível on-premises ou VM na nuvem. Transferir banco e arquivos persistentes por backup/restauração em procedimento separado, configurar ambiente, volumes, rede, domínio e TLS. Não presumir que instalar imagem migra dados. Para ARM, produzir e validar pacote separado; nunca usar emulação em produção sem decisão explícita.

## Validação e entrega

Testes de contrato e fluxo com falhas de autorização, rede, asset ausente, checksum/tamanho incorreto, manifesto inválido, arquitetura errada, disco insuficiente, concorrência, load falho, configuração incompatível, migração falha e saúde falha. Em todas as falhas de preflight, provar ausência de stop/build/pull/migração e não vazamento de credenciais. Testar idempotência, recuperação e tags de reconstrução.

Ensaio real Docker local com pacote exportado/carregado em instalação isolada, migrações em banco descartável e comparação de dados. Medir build, pacote, importação, memória/disco e manutenção, sem prometer tempo com base em outra máquina. Publicação remota operacional é etapa separada da implementação e dos testes.

Implementar a partir de origin/main atualizado, preservando alterações locais. Nesta consulta origin/main está em 1.20.0, enquanto o checkout atual está em 1.13.0. Incremento proposto MINOR por nova funcionalidade de publicação, recalculado antes da integração; sincronizar package.json/package-lock.json, releases.ts e conferir APP_VERSION em login/admin e acesso autenticado a /atualizacoes. Uma atualização por PR, sem tags automáticas de código.

## Fontes

- https://docs.docker.com/reference/cli/docker/image/save/
- https://docs.docker.com/reference/cli/docker/image/load/
- https://docs.docker.com/build/building/best-practices/
- https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
- https://docs.github.com/en/rest/releases/assets
- Guias locais da versão instalada em node_modules/next/dist/docs.

## Limites desta aprovação

O usuário aprovou a arquitetura de distribuição. Nome do repositório acima é uma proposta do implementador. Preparar scripts, testes e documentação faz parte da implementação; confirmar disponibilidade/permissões do nome antes de criá-lo. Não mudar servidor, dados, credenciais ou publicar uma entrega operacional durante a preparação local.
