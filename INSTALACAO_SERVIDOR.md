# Instalação e atualização do servidor B2T

Guia para Linux com Bash. Projeto, configuração e persistência ficam juntos em **`/etc/docker/appb2t`**. Execute os comandos nessa pasta, como usuário com acesso ao Docker. O domínio de referência é `https://somosb2t.com.br`, com porta **1992** e PostgreSQL 17.

## Estrutura

```text
/etc/docker/appb2t/
├── compose.yaml
├── Dockerfile
├── .env                      # configuração privada
├── src/                      # código atualizado pelo Git
├── dados/
│   └── postgres_data/        # banco persistente
└── backups/                  # backups e configuração anterior
```

`.env`, `dados/` e `backups/` ficam fora do Git e do contexto de build Docker. Atualizar o código não deve substituir essas pastas. Não use `git clean -fdx`, limpeza de volumes ou `docker compose down -v` nessa instalação.

## 1. Instalação nova

Requisitos: Git, OpenSSL, Docker Engine com contêineres Linux e Docker Compose v2. Reserve pelo menos 4 GB de memória para o build. O acesso ao repositório privado deve estar configurado no servidor.

Os exemplos pressupõem um terminal de administrador (`sudo -i`). Para uma pasta que ainda não existe:

```bash
mkdir -p /etc/docker
git clone https://github.com/bsgirardi/appb2t.git /etc/docker/appb2t
cd /etc/docker/appb2t
```

Se a pasta já existir com configuração ou dados, não clone por cima. Use a seção de atualização ou de mudança do caminho.

### Configuração inicial

Execute uma única vez, somente para uma instalação vazia. O bloco recusa substituir um `.env` ou usar uma pasta de banco preenchida.

```bash
set -euo pipefail
umask 077
cd /etc/docker/appb2t
test ! -e .env || { echo 'Já existe .env; use o procedimento de atualização.'; exit 1; }
mkdir -p dados/postgres_data backups
test -z "$(find dados/postgres_data -mindepth 1 -maxdepth 1 -print -quit)" || {
  echo 'Já existem dados; interrompa a instalação nova.'; exit 1;
}
db_password="$(openssl rand -hex 32)"
art_key="$(openssl rand -hex 32)"
checkout_key="$(openssl rand -hex 32)"
cat > .env <<EOF
POSTGRES_PASSWORD=$db_password
POSTGRES_DATA_PATH=/etc/docker/appb2t/dados/postgres_data
APP_NETWORK_NAME=appb2t_network
APP_PORT=1992
APP_BIND=0.0.0.0
APP_URL=https://somosb2t.com.br
ART_ACCESS_KEY=$art_key
CHECKOUT_ACCESS_KEY=$checkout_key
EOF
chmod 600 .env
unset db_password art_key checkout_key
```

O Compose lê o `.env` desta pasta automaticamente. Não precisa de função auxiliar, `--env-file` ou caminhos adicionais. `POSTGRES_PASSWORD` é a senha do banco, independente da senha de acesso ao painel. `ART_ACCESS_KEY` e `CHECKOUT_ACCESS_KEY` são chaves independentes; preserve seus valores nas atualizações.

### Construir e subir

```bash
cd /etc/docker/appb2t
# Construção sequencial para reduzir o consumo de memória.
COMPOSE_PARALLEL_LIMIT=1 docker compose build app migrate
docker compose up -d --wait
docker compose --profile tools run --build --rm --no-deps admin
```

O último comando cria o primeiro administrador e solicita nome, e-mail e senha de 12 a 128 caracteres. Execute-o apenas uma vez. O serviço `migrate` aplica as migrações e precisa concluir antes de a aplicação iniciar. Não há importação de usuários ou dados locais pelo GitHub.

## 2. Uso diário

Dentro da pasta do projeto, estes são os comandos habituais:

```bash
cd /etc/docker/appb2t
docker compose up -d
docker compose ps
docker compose logs --tail 100 app migrate
```

`docker compose up -d` sobe o sistema com as imagens existentes. **Após baixar código novo, faça o build da seção seguinte:** `up -d` sozinho não recompila a versão instalada.

Para parar apenas a aplicação: `docker compose stop app`. Para conferir a saúde: `curl -f http://127.0.0.1:1992/api/health`.

## 3. Atualizar em dois comandos

No servidor Linux, entre na pasta do projeto:

```bash
cd /etc/docker/appb2t
```

**1. Baixar o código do GitHub:**

```bash
bash scripts/atualizar-projeto.sh
```

**2. Reconstruir os contêineres e subir a nova versão:**

```bash
bash scripts/atualizar-docker.sh
```

Execute o segundo comando somente se o primeiro terminar sem erro. Requisitos: Bash, Git, util-linux (flock), sha256sum e Docker Compose v2 com suporte a --wait. Use um usuário com acesso ao Docker e permissão de escrita na pasta. Não é necessário instalar Node.js no servidor.

### Primeira atualização com os novos comandos

Se os scripts ainda não existirem no servidor, baixe-os uma única vez com:

```bash
git pull --ff-only origin main
```

Depois execute o segundo comando acima. Nas próximas atualizações, use os dois scripts normalmente. O servidor deve estar na branch main, sem alterações locais; confira com git status. Se houver conflitos ou alterações, revise-os antes de prosseguir: os scripts não descartam arquivos.

### O que acontece automaticamente

O primeiro comando atualiza somente o código, sem reiniciar o sistema. O segundo constrói as imagens enquanto a aplicação continua disponível. Depois preserva a imagem anterior e a configuração, para a aplicação, gera e verifica o formato do backup PostgreSQL, aplica as migrações e inicia a aplicação aguardando sua saúde por até 180 segundos. O banco permanece em execução.

As ferramentas e a aplicação são construídas em sequência, com caches locais npm e Next. As imagens candidatas usam o commit como tag; ferramentas de migração e administração compartilham a mesma imagem. Cada etapa informa duração, e o sucesso exige conferir a imagem realmente executada e a saúde. Quando imagem, configuração e migrações já correspondem, não há nova parada. Consulte [medição e recuperação do deploy manual](docs/DEPLOY_MANUAL.md).

A pausa do atendimento começa no backup e termina quando a nova aplicação está saudável. Use uma janela de manutenção. O comando atualiza os contêineres do projeto; não atualiza o Docker Engine nem o sistema operacional. Não altera .env, chaves, usuários, porta ou localização do banco. Ambos os scripts impedem execuções simultâneas.

Os backups ficam em backups/atualizacao-DATA-ID/, com banco.dump, checksum, ambiente privado, identificação da imagem anterior e do código novo. A configuração do contêiner anterior também fica preservada; esses arquivos contêm informações privadas. A verificação de formato não substitui testes de restauração e cópia externa dos backups.

### Se falhar

O script interrompe na etapa que falhou e informa o caminho do backup, quando criado. Falha de build mantém a aplicação anterior em execução. Falha após a parada pode deixá-la indisponível. Consulte:

Se o backup falhar antes de iniciar migrações, o script tenta retomar apenas o container anterior pelo seu ID, sem substituir sua imagem ou iniciar dependências. Depois que uma migração começa, a recuperação exige análise manual de compatibilidade; não há rollback automático do banco.

```bash
docker compose logs --tail 100 app migrate db
docker compose ps
```

Corrija a causa antes de repetir o segundo comando. Se a aplicação estiver parada, o script recusará uma nova atualização: avalie o estado das migrações antes de iniciá-la. Não há rollback automático: migrações podem impedir o uso da imagem antiga. Não restaure backup antigo sobre registros novos, não apague volumes e não execute db push.

Ao concluir, confira login, rodapé, página **Atualizações** e os fluxos usados pela equipe. Não recrie o administrador nem copie novamente o .env.example.

## 4. Recuperar a senha de um administrador

```bash
cd /etc/docker/appb2t
docker compose --profile tools run --build --rm --no-deps admin npm run admin:create -- --reset-password
```

Com o banco ativo, informe e-mail do ADMIN ativo e a nova senha duas vezes no prompt. A senha fica oculta. O procedimento encerra as sessões dessa conta e limpa seu bloqueio temporário; não cria nem reativa usuários. Não informe a senha na linha de comando.

## 5. Domínio e acesso

Configure DNS e proxy HTTPS para `somosb2t.com.br`. No mesmo servidor, o proxy aponta para `http://127.0.0.1:1992`. Preserve `Host`, `X-Forwarded-Proto` e aceite uploads de até 52 MiB. `APP_URL` deve coincidir com a URL pública, sem caminho adicional.

`APP_BIND=0.0.0.0` permite acesso pela rede: restrinja a porta no firewall conforme seu proxy. Se o proxy estiver no mesmo host, pode usar `APP_BIND=127.0.0.1`. O PostgreSQL não expõe porta no host; a aplicação usa `db:5432` internamente. Certificado, proxy e backups automáticos não são instalados pelo projeto.

## 6. Instalação existente em outro caminho

O caminho anterior do código era `/opt/appb2t`. Se já existem `.env`, banco ou backups em `/etc/docker/appb2t`, **mantenha-os no lugar**. Não mova uma pasta de PostgreSQL em execução e não clone sobre a pasta preenchida.

Para reunir somente o código antigo com a persistência já existente no destino, faça backup, pare a aplicação e confira uma cópia com `rsync` (instale essa ferramenta se necessário):

```bash
# Conferência: não copia nem apaga arquivos.
sudo rsync -an --exclude='.env' --exclude='.env.*' --exclude='dados/' --exclude='backups/' /opt/appb2t/ /etc/docker/appb2t/
# Depois de conferir o resultado, copie sem sobrescrever configuração e dados.
sudo rsync -a --exclude='.env' --exclude='.env.*' --exclude='dados/' --exclude='backups/' /opt/appb2t/ /etc/docker/appb2t/
cd /etc/docker/appb2t
```

Esse procedimento pressupõe `.env` correto e persistência **já existentes no destino**, e inclui a pasta `.git`. Se o `.env` estiver apenas no caminho antigo, copie-o privadamente para o destino antes de iniciar. Preserve a origem até validar a atualização. Confira o mount abaixo e mantenha o mesmo nome Compose (`appb2t`, definido no arquivo). Não use `--delete` no rsync.

```bash
docker compose config --quiet
docker inspect "$(docker compose ps -q db)" --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Type}} {{.Source}}{{end}}{{end}}'
```

Na instalação descrita aqui, o mount deve ser `bind /etc/docker/appb2t/dados/postgres_data`. Se o banco atual usa volume nomeado, mantenha o valor atual de `POSTGRES_DATA_PATH` até planejar a transferência com backup e restauração; mudar a variável não transfere os dados. Não inicie outro banco vazio por engano.

## 7. Referência local e solução de problemas

Na instalação local existente, mantenha `POSTGRES_DATA_PATH=postgres_data`, `APP_PORT=3000`, `APP_BIND=127.0.0.1` e `APP_URL=http://localhost:3000`. Isso preserva o volume `appb2t_postgres_data`; o guia de pastas do servidor não altera essa instalação automaticamente.

Se o build informar arquivo ausente, confira se o clone contém `Dockerfile`, `package.json` e `package-lock.json` e execute os comandos na pasta do projeto. Atualize com `git pull --ff-only origin main` e repita a construção. O Dockerfile não exige copiar `.npmrc`. Não crie arquivos vazios para contornar erros de build.

Referência técnica e histórico: [PRODUCAO.md](PRODUCAO.md). Para levar dados entre servidores, consulte a seção de restauração nesse documento.
