# Entregas com imagens prontas

O código permanece em `bsgirardi/appb2t`. Imagens são construídas na máquina de preparação, dentro do Docker Linux, e anexadas às Releases de um repositório **privado** de distribuição. O servidor baixa uma entrega explícita. Não usa Actions, GHCR, registry privado nem compila na produção.

GitHub é necessário para buscar novas entregas. Sua indisponibilidade não interrompe a aplicação instalada. Imagens, pacotes e caches não devem entrar em commits Git. Nunca publicar `.env`, banco, dumps, credenciais ou configuração operacional resolvida.

## Rotina obrigatória para cada integração em main

Esta sequência é a política de entrega do projeto, inclusive para manutenção e documentação. Ela é executada na máquina local pelo responsável pela integração; não existe automação Actions/GHCR de publicação. As instruções em `AGENTS.md` e no modelo de PR fazem os próximos trabalhos seguirem este mesmo procedimento.

1. Antes de integrar, atualizar a referência de main, conferir conflitos, versão/notas/rodapés e as verificações pertinentes. Aguardar as verificações da revisão exata que será integrada. Não contornar checks com falha. Havendo nova versão em outra PR, ajustar a candidata nesta mesma PR.
2. Integrar a PR autorizada. Obter o **mergeCommit.oid**, não o antigo SHA da branch. Buscar origin/main e confirmar que o commit integrado pertence ao seu histórico.
3. Em checkout limpo desse commit (ou fonte limpa extraída pelo gerador), executar o gate local e construir a entrega Linux adequada. A versão é a já integrada: não incrementá-la novamente, não reutilizar imagens da branch nem usar latest como identidade.
4. Validar manifesto, tamanhos e checksums. Publicar draft com todos os assets, conferir sua integridade remota e só então publicar a Release oficial. Não sobrescrever uma entrega anterior. Reconstrução recebe novo BuildId.
5. Se atualizador ou documentação mudaram, sincronizar os scripts revisados e o guia no repositório de distribuição. Isso não instala nada nos servidores.
6. Conferir pela API a Release publicada (draft/prerelease falsos), origem/versão/plataforma e os três assets. Registrar URL/identificador, SHA fonte, digest base, tamanho e SHA-256 do pacote. Atualizar o resumo da PR e guardar os metadados locais em `.b2t/`, sem credenciais. Esse registro de execução não exige outra PR de versão.
7. Informar separadamente: **código integrado**, **Release disponível**, **servidor atualizado ou não**. Não executar o atualizador operacional só porque houve merge. A aplicação segue na versão anterior até o operador realizar a implantação autorizada.

Exemplo na máquina local, a partir de uma PR já aprovada para integração (substituir 44 pelo número correto):

```powershell
git fetch origin main
gh pr checks 44
gh pr ready 44 # somente se ainda estiver em rascunho
$head = gh pr view 44 --json headRefOid --jq .headRefOid
gh pr merge 44 --merge --match-head-commit $head
if ($LASTEXITCODE) { throw 'Merge nao concluido; nao gerar uma entrega presumida.' }
$commit = gh pr view 44 --json mergeCommit --jq .mergeCommit.oid
git fetch origin main
git merge-base --is-ancestor $commit origin/main
if ($LASTEXITCODE) { throw 'Commit integrado nao confirmado em main.' }
$buildId = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$out = Join-Path $PWD ".b2t/entregas/$buildId"
pwsh -File scripts/distribution/build.ps1 -Commit $commit -BuildId $buildId -OutputDirectory $out
if ($LASTEXITCODE) { throw 'Build falhou; entrega pendente.' }
pwsh -File scripts/distribution/publish.ps1 -PackageDirectory $out -Repository bsgirardi/appb2t-distribuicao
if ($LASTEXITCODE) { throw 'Publicacao falhou; revisar draft e assets.' }
$manifest = Get-Content (Join-Path $out 'manifest.json') -Raw | ConvertFrom-Json
gh release view $manifest.release --repo bsgirardi/appb2t-distribuicao
```

Use os scripts do commit revisado/integrado, não os de um checkout antigo. Confira cada resultado antes de seguir; `gh pr checks` com estado pendente/falha impede o merge. Nas instalações que usam squash/rebase, obter igualmente `mergeCommit.oid` efetivo retornado pelo GitHub. A primeira entrega e mudanças de ambiente exigem o ensaio isolado descrito neste guia.

Falha depois do merge não desfaz o código integrado e não autoriza deploy incompleto: conservar a versão instalada, manter evidências e concluir/corrigir a distribuição. Não iniciar um novo incremento de versão apenas para repetir o build da mesma revisão.

## Preparação única na máquina local

Requisitos: PowerShell 7, Git, Node compatível com `.nvmrc`, Docker Linux e GitHub CLI autenticado com escrita apenas onde necessário. A plataforma padrão é `linux/amd64`; conferir o servidor. Para ARM, construir e testar pacote separado. O Docker local precisa de recursos para build e espaço para arquivo descomprimido e comprimido; não aplicar o orçamento de 2 GB da produção à máquina de build.

Depois de revisar/commitar os scripts, criar o repositório privado (uma vez):

```powershell
pwsh -File scripts/distribution/bootstrap-distribution.ps1 -Repository bsgirardi/appb2t-distribuicao
pwsh -File scripts/distribution/publish-updater.ps1 -Repository bsgirardi/appb2t-distribuicao
```

O segundo comando publica somente o atualizador revisado e este guia, com a referência do commit fonte. Não atualiza automaticamente scripts instalados nos servidores. Não criar outro repositório se o nome já existir sem conferir sua finalidade e privacidade.

## Gerar uma entrega

O código da funcionalidade precisa estar integrado em `main` antes de gerar a primeira entrega: o gerador aceita somente commit completo pertencente a `origin/main` e extrai fonte limpa por `git archive`, sem copiar mudanças locais. Não cria tags no projeto de código.

```powershell
pwsh -File scripts/distribution/build.ps1 -Commit COMMIT_COMPLETO -OutputDirectory X:/entregas/b2t/ENTREGA_NOVA
```

O gerador atualiza a referência `node:22-bookworm-slim`, registra seu digest e constrói com essa base exata. Preserva cache npm e Next. Executa tipos, lint e testes unitários em Docker com banco sintético; build Next também verifica tipos. Testes de integração/migração que exigem banco devem ser executados em banco descartável antes da promoção; não usar banco operacional. Não afirmar que testes unitários validam migração de dados.

Para renovação periódica das camadas de pacotes do sistema mesmo quando o digest base não mudou, usar `-RefreshSystemPackages`: executa uma reconstrução completa sem cache na máquina de preparação. Não fazer isso a cada atualização funcional. Containers em produção não recebem `apt upgrade`; recebem uma nova imagem testada. Rever também dependências/CVEs com a ferramenta local aprovada. O processo não afirma ausência de vulnerabilidades nem muda major do Node automaticamente.

O pacote contém `images.tar.gz`, `compose.production.yaml` e `manifest.json`. As tags incluem versão, commit e identificador de build. Reconstrução do mesmo código recebe outra identidade, sem substituir a entrega anterior. Cada asset precisa ter menos de 2 GiB. O gerador/publicador rejeita arquivos acima do limite, sem dividir silenciosamente.

## Publicar a entrega pronta

```powershell
pwsh -File scripts/distribution/publish.ps1 -PackageDirectory X:/entregas/b2t/ENTREGA_NOVA -Repository bsgirardi/appb2t-distribuicao
```

O comando valida o pacote, cria uma Release draft, sobe os três arquivos, compara tamanhos e SHA-256 informados pelo GitHub e publica somente após confirmação. Falha deixa draft para diagnóstico; ele não é consumido pela produção. Não há sobrescrita automática. Para corrigir draft incompleto, revisar e remover explicitamente o draft/tag apenas de distribuição ou gerar outro BuildId. Nunca remover uma entrega publicada usada por servidor sem plano de retenção.

## Instalação inicial do atualizador no Linux

Requisitos: Bash, Docker Engine/Compose com `config --format json`, `config --hash` e `up --pull never --wait`, util-linux/flock, curl **7.76 ou superior**, jq 1.6+, gzip e utilitários GNU. O operador precisa acessar DockerRootDir para medir disco. Os scripts não instalam ferramentas nem mudam limites do host.

Criar token fine-grained restrito ao repositório de distribuição com `Contents: read`. Guardar em arquivo pertencente ao usuário que executa o script, permissão **600**, fora do Git e da instalação publicada, por exemplo `/etc/b2t-distribuicao/token`. Não incluir token em URLs, comandos, capturas ou logs. Não reutilizar a credencial local de escrita.

Bootstrap único: clonar o repositório privado em diretório de ferramentas, usando autenticação interativa do Git/gerenciador de credenciais (token como senha, nunca na URL). Conferir um commit completo conhecido, `SOURCE_COMMIT` e revisar os três scripts antes de instalá-los. Fixar o checkout nesse commit e restringir escrita. Não executar scripts recém-baixados pela atualização normal.

```bash
git clone https://github.com/bsgirardi/appb2t-distribuicao.git /opt/b2t-distribuicao
git -C /opt/b2t-distribuicao checkout --detach COMMIT_REVISADO_DA_DISTRIBUICAO
```

A instalação existente deve manter `.env` e `compose.yaml`, com nome do projeto, bind/volume do PostgreSQL, rede e portas reais. O script preserva essa configuração e gera um Compose privado sem `build`, com imagens exatas e `pull_policy: never`. O Compose anexado à Release é referência de bootstrap **não aplicada automaticamente sobre a instalação**. Mudança de configuração de serviço exige revisão explícita; o atualizador rejeita divergências relevantes entre configuração e containers vivos.

Em VM nova, preparar diretórios/volume, configuração e segredos e restaurar o banco antes da atualização. Usar `compose.production.yaml` como referência após conferir caminhos. O atualizador exige app e banco ativos e não faz instalação/restauração inicial automaticamente.

## Atualizar o servidor

```bash
bash /opt/b2t-distribuicao/scripts/distribution/update.sh \
  --repository bsgirardi/appb2t-distribuicao \
  --release IDENTIFICADOR_EXATO_DA_RELEASE \
  --installation /etc/docker/appb2t \
  --token-file /etc/b2t-distribuicao/token
```

**Não usar `scripts/atualizar-docker.sh` no novo fluxo**: esse é o procedimento legado, que ainda compila no host. O novo atualizador não precisa do clone do código-fonte em produção, só da instalação e das ferramentas revisadas. A configuração e os dados existentes não são apagados.

Download, SHA-256, arquitetura, espaço, configuração e importação acontecem com app ativa. A reserva de disco é conservadora: três vezes a soma dos tamanhos das imagens, mais pacote comprimido e 1 GiB, conferida em staging e DockerRootDir. O script importa com `docker load`, confere IDs, labels, usuário não root e versão interna da app. Não usa `pull` ou build como fallback. Importação ainda usa disco: medir o primeiro ensaio antes de assumir ausência de degradação no host de 2 GB.

O token é enviado somente ao GitHub por HTTPS; curl não deve encaminhar Authorization para outro host nos redirecionamentos (não usar `--location-trusted`). Downloads têm limites de tamanho, tentativas e timeout. Checksums detectam corrupção; a confiança de origem depende do repositório autenticado e suas permissões, sem alegar assinatura independente.

Após preparação: preservar imagem/configuração, parar app, gerar dump, validar catálogo/checksum, aplicar migrações com tools da entrega, iniciar app sem build/pull e confirmar imagem/saúde. O script grava durações, resumo e manifesto instalado. O download tem sua etapa própria; o resumo de manutenção começa na fase de implantação. Conferir também login, versão, histórico e fluxos autenticados. Healthcheck isolado não substitui homologação.

`.b2t/` e `backups/` são privados. Staging falho e drafts ficam preservados para diagnóstico; revisar e limpar somente entregas locais antigas selecionadas, sem apagar backups nem executar prune global. O token temporário de curl é removido na saída, inclusive após falha.

## Falhas e recuperação

- Antes da parada: versão anterior permanece. Não há migração nem tentativa de compilar.
- Falha na parada/backup antes de iniciar migração: tentar iniciar o container anterior pelo ID e confirmar saúde.
- Após começar migração: sem rollback automático; avaliar migração parcial e compatibilidade antes de voltar imagem. Não restaurar banco por cima de novas escritas.
- Entrega já ativa, configuração igual, saudável e sem migrações pendentes: não recriar app.
- Publicação saudável com falha posterior de alias/registro: não afirmar falha da aplicação; revisar resumo e repetir para reparar o registro.

Ensaiar primeiro em instalação descartável: restaurar backup em PostgreSQL separado, verificar dados/migrações, executar update e medir importação/manutenção. Sem zero downtime garantido; backup, migração e troca continuam na janela. Não criar usuários, pedidos ou credenciais fictícias na operação para testar.

## Migração futura para nuvem

A mesma entrega roda em VM Linux com arquitetura compatível. Migrar banco e arquivos persistentes separadamente; configurar segredos, diretórios, firewall, domínio e TLS. Não trocar simultaneamente a versão major do PostgreSQL, a arquitetura e a versão da aplicação sem ensaios separados. O pacote não contém os dados da empresa.

## Verificações locais do mecanismo

```powershell
npm run test:docker
pwsh -File tests/docker/distribution-publish.ps1
pwsh -File tests/docker/distribution-build.ps1
docker build -t appb2t-distribution-test -f tests/docker/Dockerfile.distribution .
docker build -f tests/docker/Dockerfile.context .
```

Executar `bash tests/shell/distribution.sh` em Linux com jq e utilitários GNU, ou copiar scripts/testes para container de ferramentas sem montar o socket Docker. O teste simula comandos Docker e GitHub, não acessa produção. O teste real de `save/load` é adicional e precisa usar tags exclusivas, sem alterar aliases operacionais.
