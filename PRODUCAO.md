# appb2t — build e instalação em outro servidor

Pacote de código para Linux/Docker, com fontes, imagens e migrações. Não contém banco, contas reais, senhas, .env ou dependências instaladas. Inclui Roboto administrativo, favicon, Next.js 16.3.8 e adaptação Nova/catálogo. A instalação local foi atualizada em 16/10/2026; este pacote também pode preparar outro servidor conforme os passos abaixo.

## 1. Preparar o servidor

Requisitos: Docker Engine com contêineres Linux, Docker Compose v2 ou superior e acesso à internet para baixar imagens e pacotes durante o build. Não é necessário instalar Node.js no servidor. Reserve memória suficiente para o build Next.js (4 GB ou mais recomendados).

Copie a pasta appb2t inteira e entre nela. Crie o arquivo de ambiente:

```sh
cp .env.example .env
```

No PowerShell, use `Copy-Item .env.example .env`. Edite .env:

- POSTGRES_PASSWORD: senha nova, longa e aleatória, apenas com letras/números, pois é inserida na URL PostgreSQL.
- APP_URL: endereço externo exato, por exemplo https://appb2t.seudominio.com.br, sem caminho adicional. Para uso local, http://localhost:3000.
- APP_BIND=127.0.0.1: mantém a aplicação acessível somente pelo servidor/proxy local.
- APP_PORT=3000: porta local do aplicativo.

DATABASE_URL do exemplo é usada em execução fora do Docker. No Compose, a conexão é montada automaticamente com o serviço db. Usuário e banco continuam chamados b2t; mudar o nome do projeto não exige renomear o banco.

Configure domínio e HTTPS em um proxy reverso apontando para 127.0.0.1:3000. Preserve o Origin e o host original. O limite de upload do proxy deve aceitar 52 MiB. Se o proxy estiver em outro servidor/contêiner, adapte a rede e APP_BIND à infraestrutura. A autenticação externa exige HTTPS. Não exponha a porta do PostgreSQL.

## 2. Fazer o build

Na pasta appb2t:

```sh
docker compose config --quiet
docker compose --profile tools build
```

O Dockerfile usa Node 22, instala pelo package-lock, gera Prisma, verifica tipos e compila Next.js. A imagem final inclui standalone, arquivos estáticos e public. O build não necessita de dados de produção.

## 3A. Instalação nova, sem dados anteriores

```sh
docker compose up -d --wait
docker compose --profile tools run --rm admin
docker compose ps
```

O serviço migrate aplica as migrações antes de iniciar a aplicação. O comando admin solicita nome, e-mail e senha interativamente; cria somente o primeiro administrador. Não há contas ou produtos de demonstração.

Abra o APP_URL configurado. Para conferência local:

```sh
curl -f http://127.0.0.1:3000/api/health
curl -I http://127.0.0.1:3000/favicon.ico
docker compose logs --tail 100 app migrate
```

## 3B. Levar os dados existentes

O ZIP não transfere os dados automaticamente. Obtenha um backup PostgreSQL atual e consistente da instalação antiga; preserve a origem até validar o destino. Use o procedimento operacional já estabelecido, incluindo ensaio de restauração. Backups antigos podem não conter as alterações mais recentes.

No destino novo, ainda sem executar `up` de todos os serviços, suba apenas o banco:

```sh
docker compose up -d --wait db
docker compose cp backup.dump db:/tmp/backup.dump
docker compose exec -T db pg_restore -U b2t -d b2t --no-owner --no-privileges --single-transaction --exit-on-error /tmp/backup.dump
```

Esses passos pressupõem banco de destino vazio e backup no formato custom do pg_dump. Execute uma linha por vez e prossiga somente se a anterior terminar com sucesso. Se já houver tabelas, não prossiga com a restauração: use outro destino vazio e confira o procedimento. A restauração usa transação única para não manter alterações parciais em caso de erro. Não use --clean ou restaure sobre dados recentes sem conciliação.

Antes de iniciar a aplicação, confirme que pg_restore terminou sem erros e com código de saída zero (`echo $?` imediatamente após o comando no Bash, ou `$LASTEXITCODE` no PowerShell). Somente depois dessa confirmação, execute:

```sh
docker compose up -d --wait
```

Interrompa a implantação se a restauração ou qualquer migração falhar.

Confira login, contagens/cadastros, fotos, paletas, vendas, estoque e financeiro antes de mudar o domínio para o novo servidor. Contas e senhas do backup são preservadas; não execute a criação do primeiro administrador se ele já existir. Revise sessões restauradas e permissões de acesso. Exclua a cópia temporária do backup do contêiner após a validação.

## Nome do projeto e preservação de volumes

O novo nome Compose é appb2t. Por padrão, o volume será appb2t_postgres_data. Na instalação antiga, b2t-calculadora_postgres_data continua separado. Executar Compose com outro nome pode abrir um banco novo e vazio; isso não significa que o volume antigo foi apagado.

Para administrar a instalação antiga pelo código renomeado, especifique seu nome original em cada comando, por exemplo:

```sh
docker compose -p b2t-calculadora ps
```

Não renomeie nem apague volumes para realizar esta mudança. Não execute `docker compose down -v` sobre dados que deseja preservar. A publicação local de 16/10 preservou o projeto b2t-calculadora e seu volume original; o nome appb2t continua sendo o padrão para novas instalações.

## Manutenção

Configure backup automático com retenção, cópia fora do servidor e restauração testada. Antes de atualizar uma instalação com dados, gere backup atual e preserve a imagem anterior. As migrações ficam em prisma/migrations e não devem ser removidas da entrega.

Consulte [PENDENCIAS.md](PENDENCIAS.md) antes de publicar externamente. A preparação da pasta não configura domínio, proxy, certificados ou agendamento de backups.
