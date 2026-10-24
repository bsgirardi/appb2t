# Instalação pelo GitHub e atualização do servidor B2T

Guia para **Linux com Bash**, instalação nova e atualizações seguintes. Configuração de referência: domínio `https://somosb2t.com.br`, porta do host **1992**, rede Docker **appb2t_network** e PostgreSQL 17 em **/etc/docker/appb2t/dados/postgres_data**. Não há importação de usuários/dados da instalação local: o primeiro administrador será criado no novo servidor.

O GitHub fornece código e migrações. O banco, as senhas e as chaves permanecem no servidor. Os comandos abaixo não foram executados no seu servidor remoto.

## 1. Estrutura que permanece entre versões

| Caminho/recurso | Finalidade |
| --- | --- |
| `/opt/appb2t` | Clone do repositório; código atualizado pelo Git |
| `/etc/docker/appb2t/.env` | Configuração privada; fora do clone |
| `/etc/docker/appb2t/dados/postgres_data` | Arquivos do PostgreSQL; não apagar nem recriar nas atualizações |
| `/etc/docker/appb2t/backups` | Backups, configuração e identificação das versões anteriores |
| `appb2t_network` | Rede bridge própria dos serviços db/migrate/app/admin |
| `1992:3000` | Porta do host → porta interna da aplicação |

O PostgreSQL não publica porta no host. Dentro da rede, a aplicação acessa `db:5432`; `localhost` dentro do contêiner não aponta para o banco. O Compose monta DATABASE_URL automaticamente com POSTGRES_PASSWORD. DATABASE_URL no .env é necessário somente se executar ferramentas fora do Docker.

## 2. Pré-requisitos

- Docker Engine com contêineres Linux e Docker Compose v2; Git e OpenSSL.
- Pelo menos 4 GB de memória disponíveis para build, ou host de build separado. O Next está limitado a dois workers de páginas, mas build e bancos de teste não devem disputar memória com a operação.
- Autenticação para ler o repositório privado GitHub. Use autenticação Git/SSH do servidor; não coloque tokens na URL ou nos arquivos versionados.
- DNS, proxy HTTPS e firewall sob seu controle. Certificado e proxy não são criados por este repositório.

Execute os comandos como administrador do servidor, por exemplo após `sudo -i`. Os exemplos usam caminhos fixos; se escolher outros, ajuste todos os comandos de forma consistente.

```bash
set -euo pipefail
git --version
docker --version
docker compose version
openssl version

git clone https://github.com/bsgirardi/appb2t.git /opt/appb2t
cd /opt/appb2t
git switch main
```

Se o clone já existir, não clone por cima: confira sua origem/estado e use a seção de atualização. Interrompa em qualquer falha.

## 3. Preparar uma instalação realmente vazia

Este bloco **recusa sobrescrever um .env existente ou iniciar sobre uma pasta de banco preenchida**. Se encontrar dados, preserve-os e avalie uma atualização/migração; não apague a pasta para contornar a verificação.

```bash
set -euo pipefail
umask 077
install -d -m 700 /etc/docker/appb2t
install -d -m 700 /etc/docker/appb2t/backups
install -d -m 700 /etc/docker/appb2t/dados/postgres_data

if [ -e /etc/docker/appb2t/.env ]; then
  echo 'Configuração existente: não sobrescrever. Use a seção de atualização.' >&2
  exit 1
fi
if [ -n "$(find /etc/docker/appb2t/dados/postgres_data -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  echo 'Pasta do banco não está vazia: preserve os dados e interrompa a instalação nova.' >&2
  exit 1
fi

db_password="$(openssl rand -hex 32)"
art_key="$(openssl rand -hex 32)"
checkout_key="$(openssl rand -hex 32)"
cat > /etc/docker/appb2t/.env <<EOF
POSTGRES_PASSWORD=$db_password
POSTGRES_DATA_PATH=/etc/docker/appb2t/dados/postgres_data
APP_NETWORK_NAME=appb2t_network
APP_PORT=1992
APP_BIND=0.0.0.0
APP_URL=https://somosb2t.com.br
ART_ACCESS_KEY=$art_key
CHECKOUT_ACCESS_KEY=$checkout_key
EOF
chmod 600 /etc/docker/appb2t/.env
unset db_password art_key checkout_key
```

As três credenciais são novas e independentes; os comandos não as imprimem. Guarde uma cópia protegida fora do servidor. Nunca substitua esse .env pelo .env.example durante uma atualização. A senha POSTGRES_PASSWORD é a do banco, não a senha do administrador do aplicativo. Alterá-la somente no .env não altera a senha de um PostgreSQL já inicializado.

`APP_BIND=0.0.0.0` mantém sua configuração de acesso por outra máquina/rede. Restrinja a porta 1992 no firewall conforme o proxy que a utiliza. Se o proxy estiver no mesmo host e você quiser acesso só local, use `APP_BIND=127.0.0.1`. Outros projetos devem usar nome de rede e pasta de dados diferentes.

## 4. Subir banco, migrações e aplicação

Defina esta função no terminal. **Repita-a em cada novo terminal**, inclusive para manutenção. Ela fixa projeto, configuração privada e contexto de build; assim mudar de diretório não muda o banco utilizado.

```bash
dc() {
  docker compose -p appb2t \
    --project-directory /opt/appb2t \
    --env-file /etc/docker/appb2t/.env \
    -f /opt/appb2t/compose.yaml "$@"
}

dc config --quiet
# Builds sequenciais para limitar o pico de memória.
dc build migrate
dc build app
dc --profile tools build admin

dc up -d --wait db
dc run --rm --no-deps migrate
dc up -d --no-build --wait
dc ps
```

Prossiga somente se todos os comandos terminarem com código zero. O serviço migrate usa `prisma migrate deploy`, respeitando o histórico; não use `db push` nem reset. O Compose pode checar as migrações novamente ao iniciar sua dependência, sem reaplicar uma migração já concluída.

Crie o **primeiro administrador**, uma única vez:

```bash
dc --profile tools run --rm --no-deps admin
```

Informe nome, e-mail e senha com 12 a 128 caracteres no prompt. Nenhuma conta da instalação local vem pelo GitHub. Não execute esse comando em todas as atualizações; usuários adicionais são geridos pelo painel.

Confira a saúde e o mount efetivo:

```bash
dc exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{console.log(r.status);process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"
docker inspect "$(dc ps -q db)" \
  --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Type}} {{.Source}}{{end}}{{end}}'
```

O resultado do mount deve ser `bind /etc/docker/appb2t/dados/postgres_data`. Veja logs com `dc logs --tail 100 app migrate db`; não publique logs/configurações que contenham dados privados.

## 5. Domínio, HTTPS e redes separadas

Configure `somosb2t.com.br` no DNS e no proxy, com HTTPS válido. Se o proxy estiver no mesmo host, o destino será `http://127.0.0.1:1992`. Se estiver em outra máquina ou rede Docker, utilize um endereço do host acessível por esse proxy e a porta 1992; o nome `app` não resolve automaticamente entre redes separadas.

Encaminhe o host e o protocolo originais, preserve Origin e aceite uploads de até 52 MiB. APP_URL deve coincidir com a URL pública exata, sem caminho adicional. Exemplo do trecho relevante em Nginx no mesmo host (certificado/servidor HTTPS configurados separadamente):

```nginx
client_max_body_size 52m;
location / {
    proxy_pass http://127.0.0.1:1992;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Abra a URL pública, teste login, configure a empresa e cadastre um produto controlado. Confira imagens, emissão de link de arte, checkout e financeiro conforme seu fluxo. O aplicativo não presume que X-Forwarded-For é uma identidade confiável para relaxar cotas de acesso.

## 6. Próximas versões: atualizar sem perder persistência

Não editar compose.yaml no servidor: configure porta, rede, mount e domínio pelo .env externo. Antes de atualizar, leia as notas da versão, confirme compatibilidade de migração/PostgreSQL e reserve uma janela de manutenção. Não atualize a versão principal do PostgreSQL trocando apenas a tag da imagem.

Execute como administrador, em Bash. A aplicação será parada antes do backup e do build; isso evita gravações durante o backup final e reduz competição por memória. O banco permanece ativo.

```bash
set -euo pipefail
umask 077
dc() {
  docker compose -p appb2t \
    --project-directory /opt/appb2t \
    --env-file /etc/docker/appb2t/.env \
    -f /opt/appb2t/compose.yaml "$@"
}
cd /opt/appb2t
git switch main
git diff --exit-code
git diff --cached --exit-code

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="/etc/docker/appb2t/backups/$stamp"
install -d -m 700 "$backup_dir"
git rev-parse HEAD > "$backup_dir/commit-anterior.txt"
cp compose.yaml "$backup_dir/compose-anterior.yaml"
cp /etc/docker/appb2t/.env "$backup_dir/ambiente.env"
old_image="$(docker inspect --format '{{.Image}}' "$(dc ps -q app)")"
docker tag "$old_image" "appb2t-app:antes-$stamp"
printf '%s\n' "$old_image" > "$backup_dir/imagem-anterior.txt"

git pull --ff-only origin main
git rev-parse HEAD > "$backup_dir/commit-novo.txt"
dc config --quiet
dc stop app

# O dump binário é gravado no contêiner e copiado, sem redirecionar bytes pelo terminal.
dc exec -T db pg_dump -U b2t -d b2t -Fc -f /tmp/appb2t-predeploy.dump
dc exec -T db pg_restore --list /tmp/appb2t-predeploy.dump > /dev/null
dc cp db:/tmp/appb2t-predeploy.dump "$backup_dir/banco.dump"
sha256sum "$backup_dir/banco.dump" > "$backup_dir/banco.dump.sha256"

dc build migrate
dc build app
dc --profile tools build admin
dc run --rm --no-deps migrate
dc up -d --no-build --wait
dc ps
dc exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{console.log(r.status);process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"
```

Se qualquer comando falhar, o bloco para. Depois de `stop app`, ela pode permanecer parada: resolva a falha antes de iniciar. Não ignore erro de backup ou migração e não execute a próxima linha isoladamente para contorná-lo. Confira login, dados e funcionalidades afetadas antes de encerrar a manutenção.

O mount e o .env permanecem iguais; reconstruir imagens não apaga o banco. As migrações aplicam apenas alterações ainda pendentes. Não copie novamente o .env.example nem gere novas chaves. Se uma versão exigir variável adicional, acrescente-a preservando os valores existentes.

## 7. Backups, falhas e recuperação

- O backup inclui usuários, hashes de senha, dados comerciais, fotos e anexos persistidos no PostgreSQL. A pasta public do código vem pelo GitHub; o .env precisa de cópia privada separada.
- `pg_restore --list` confirma leitura do arquivo, mas não substitui um ensaio de restauração. Teste restauração periodicamente em PostgreSQL 17 isolado, banco vazio, sem apontar a aplicação de teste para a operação.
- A pasta de backups neste servidor não protege contra perda do servidor: configure cópia automática externa, retenção e teste de restauração. Esse agendamento não é instalado por este guia.
- A imagem anterior é preservada para investigação. Depois de uma migração ou de novos registros, não presuma que basta voltar a imagem: confirme compatibilidade ou prepare recuperação conciliada em destino vazio, com a versão e as chaves correspondentes ao backup.
- Não restaurar um backup antigo sobre registros recentes, não remover a pasta de dados e não usar `prisma migrate reset`, `db push` ou comandos de limpeza de volumes para atualizar.
- `docker compose down` sem `-v` não é necessário neste procedimento. `down -v`, remoção de volumes e `rm -rf` da pasta de dados não fazem parte de instalação/atualização.

## 8. Compatibilidade com a instalação local existente

O Compose aceita caminho absoluto em POSTGRES_DATA_PATH para o bind do servidor. Sem essa variável, mantém o alias `postgres_data`, que corresponde ao volume local `appb2t_postgres_data`; também é possível configurá-la explicitamente como `postgres_data`. Isso não move dados entre volume e pasta.

O .env.example está preparado para o novo servidor. Para um ambiente local separado: APP_BIND=127.0.0.1, APP_PORT=3000, APP_URL=http://localhost:3000 e POSTGRES_DATA_PATH=postgres_data. Nunca copiar o exemplo sobre o .env local em uso.

Referência detalhada e registros históricos: [PRODUCAO.md](PRODUCAO.md), [PENDENCIAS.md](PENDENCIAS.md).

## 9. Erro de build: COPY .npmrc, arquivo não encontrado

O .npmrc está versionado na raiz do repositório. Um clone completo inclui arquivos ocultos; cópia manual de arquivos ou um contexto de build incompleto pode deixá-lo de fora. O Dockerfile atualizado copia apenas package.json/package-lock.json para instalar e passa `--legacy-peer-deps` explicitamente, mantendo a configuração de dependências sem exigir o arquivo oculto.

Na pasta do clone, atualize o código e repita os builds:

```bash
cd /opt/appb2t
git pull --ff-only origin main
dc build migrate
dc build app
dc --profile tools build admin
```

Defina a função dc da seção 4 se estiver em outro terminal. Preserve o .env externo e a pasta do banco. Essa correção não exige apagar cache, banco ou volume. Se package.json/package-lock.json também faltarem, confira se o clone está completo e se o contexto é /opt/appb2t, conforme a função dc; não crie arquivos vazios para contornar COPY.
