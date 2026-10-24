# appb2t — build e instalação em outro servidor

Para a instalação limpa pelo GitHub no servidor da B2T, com porta 1992, rede appb2t_network, banco em pasta própria e configuração fora do clone, use [INSTALACAO_SERVIDOR.md](INSTALACAO_SERVIDOR.md). Esse guia também cobre as próximas atualizações. As seções abaixo são a referência geral, incluindo migração de uma instalação com dados.

Pacote de código para Linux/Docker, com fontes, imagens e migrações. Não contém banco, contas reais, senhas, .env ou dependências instaladas. Inclui Roboto administrativo, favicon, Next.js 16.4.2 e catálogo com aprovação de arte C4 e checkout C5. A instalação local recebeu C5 em 23/10/2026; este pacote também pode preparar outro servidor conforme os passos abaixo.

## 1. Preparar o servidor

Requisitos: Docker Engine com contêineres Linux, Docker Compose v2 ou superior e acesso à internet para baixar imagens e pacotes durante o build. Não é necessário instalar Node.js no servidor. Reserve memória suficiente para o build Next.js (4 GB ou mais recomendados).

Copie a pasta appb2t inteira e entre nela. Crie o arquivo de ambiente:

```sh
cp .env.example .env
```

No PowerShell, use `Copy-Item .env.example .env`. O exemplo agora contém as opções do servidor externo. Para uso local, ajuste .env:

- POSTGRES_PASSWORD: senha nova, longa e aleatória, apenas com letras/números, pois é inserida na URL PostgreSQL.
- APP_URL: endereço externo exato, por exemplo https://appb2t.seudominio.com.br, sem caminho adicional. Para uso local, http://localhost:3000.
- APP_BIND=127.0.0.1: mantém a aplicação acessível somente pelo servidor/proxy local.
- APP_PORT=3000: porta local do aplicativo.
- POSTGRES_DATA_PATH=postgres_data: volume nomeado da instalação local; no servidor externo, use /etc/docker/appb2t/dados/postgres_data. Não mudar o caminho de uma instalação com dados sem transferência explícita.
- APP_NETWORK_NAME=appb2t_network: rede bridge própria, compartilhada somente pelos serviços deste projeto. O PostgreSQL não publica porta no host. Outros projetos devem usar nomes de rede próprios.

DATABASE_URL do exemplo é usada em execução fora do Docker. No Compose, a conexão é montada automaticamente com o serviço db. Usuário e banco continuam chamados b2t; mudar o nome do projeto não exige renomear o banco.

Configure domínio e HTTPS em um proxy reverso apontando para 127.0.0.1:3000. Preserve o Origin e o host original. O limite de upload do proxy deve aceitar 52 MiB. Se o proxy estiver em outro servidor/contêiner, adapte a rede e APP_BIND à infraestrutura. A autenticação externa exige HTTPS. Não exponha a porta do PostgreSQL.

## 2. Fazer o build

Na pasta appb2t:

```sh
docker compose config --quiet
docker compose --profile tools build
```

O Dockerfile usa Node 22, instala pelo package-lock, gera Prisma, verifica tipos e compila Next.js. A imagem final inclui standalone, arquivos estáticos e public. O build não necessita de dados de produção.

A geração de páginas está limitada a dois processos em next.config.ts para reduzir o pico de memória no Docker local. Não executar build simultaneamente à suíte/bancos de teste; preferir host de build separado para evitar indisponibilidade da operação em máquinas com pouca memória. O limite foi adotado após OOM observado na instalação local com aproximadamente 2 GiB disponíveis.

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

O nome Compose é appb2t. Sem POSTGRES_DATA_PATH, ou com POSTGRES_DATA_PATH=postgres_data, o volume continua appb2t_postgres_data. Com caminho absoluto nessa variável, o banco usa a pasta do host, como no .env.example do servidor. Não há transferência automática entre volume e pasta. Na instalação antiga, b2t-calculadora_postgres_data continua separado. Executar Compose com outro nome ou mudar a origem do mount pode abrir um banco novo e vazio; isso não significa que os dados antigos foram apagados.

Para administrar a instalação antiga pelo código renomeado, especifique seu nome original em cada comando, por exemplo:

```sh
docker compose -p b2t-calculadora ps
```

Não renomeie nem apague volumes para realizar esta mudança. Não execute `docker compose down -v` sobre dados que deseja preservar. A publicação local de 16/10 preservou o projeto b2t-calculadora e seu volume original; o nome appb2t continua sendo o padrão para novas instalações.

## C4: preparação e recuperação da candidata

C4 publicado localmente em 23/10/2026, no projeto appb2t e volume appb2t_postgres_data. Consulte o [registro operacional](docs/superpowers/2026-10-23-publicacao-c4.md). Migrações aditivas: `202610230001_art_approval` e `202610230002_art_document_bindings`. Não usar `db push` nem importar fixtures na operação.

Configure `ART_ACCESS_KEY` com 32 bytes aleatórios representados por 64 caracteres hexadecimais. O Compose passa essa variável ao runtime; sem ela, a emissão de links informa a configuração pendente e as funcionalidades anteriores continuam disponíveis. Não registrar a chave no Git, logs, tickets ou chat. Guarde-a em local protegido junto à configuração de recuperação. O banco conserva somente hashes dos tokens; respostas idempotentes de emissão conservam a identidade do acesso, e o segredo é derivado por HMAC da chave de instalação.

Rotacionar a chave não revoga automaticamente links e sessões já emitidos, que continuam limitados pelos hashes, revogação e prazo salvos. Para invalidá-los, revogue o acesso pelo painel. Após rotação, não recupere uma emissão antiga com a mesma chave de operação: gere um novo link no painel. Não reutilizar senha do banco, senha de administrador ou chave de outro aplicativo.

Antes da implantação autorizada, gere backup novo, restaure em PostgreSQL 17 separado, aplique as migrações e compare os dados legados. Faça um ciclo de arte com arquivos demonstrativos no ambiente isolado; confira imagem, download PDF, decisão, revogação, orçamento/venda e bloqueio produtivo. O runtime standalone precisa incluir `@cantoo/pdf-lib` e suas dependências: validar upload PDF na imagem Docker, além do build. O parser roda em worker com timeout de cinco segundos e heap de 128 MiB, rejeitando trabalhos que excedam esses limites.

Preserve bytes originais, prévias, manifestos, comandos e decisões no backup. Após gravar C4, não executar downgrade cego para código anterior: exigências de aprovação precisam continuar protegendo a produção. Prefira correção para frente; restauração exige coordenar aplicação, chave e banco e definir explicitamente o ponto de recuperação. Não apagar tabelas/volumes nem restaurar backup antigo sobre novas decisões sem conciliação.

## Manutenção

### Preferência de tema e administrador local

O primeiro administrador da instalação local já foi criado pelo procedimento oficial em 23/10/2026. A criação interativa da seção 3A continua necessária em instalações novas. Credenciais não fazem parte deste pacote.

O botão Tema permite Automático, Claro e Escuro, com preferência por navegador e sincronização entre abas. Não altera paletas da empresa nem requer migração. Resultado e limites de verificação no [registro de encerramento](docs/superpowers/2026-10-23-tema-e-encerramento.md).

### Checkout C5

C5 publicado localmente em http://localhost:3000 após integração do [PR #5](https://github.com/bsgirardi/appb2t/pull/5). Consulte o [registro operacional C5](docs/superpowers/2026-10-23-publicacao-c5.md) para backup, imagens fixadas, migração, comparação dos dados e verificações. A migração preservou as 95 projeções legadas e o volume operacional.

`CHECKOUT_ACCESS_KEY` é uma chave própria de 32 bytes aleatórios em hexadecimal, independente de `ART_ACCESS_KEY`. Configure-a privadamente antes de emitir links de compra; não registre o valor em Git ou logs. O Compose transmite a variável ao runtime. A ausência da chave impede emissão de links, sem presumir pagamento ou ativar ofertas. Rotação exige emissão de novo link; revogue links/sessões antigos pelo painel se precisar invalidá-los imediatamente.

Produtos e kits antigos continuam com compra direta desabilitada. A equipe deve habilitar conscientemente as modalidades, conferir preço/faixas/adicionais e informar instruções públicas reais de pagamento. Retirada exige endereço da loja. Cálculo automático permanece indisponível sem integração real. Pagamentos e devoluções financeiras são externos; registro, estorno, reservas e liberação continuam na gestão existente.

Checkout usa sessões privadas com validade de sete dias, cookies HttpOnly e SameSite=Strict, e links compartilhados manualmente. Conferência não gera venda/recebível; compra direta e aceite de orçamento geram venda e parcelas uma vez. Pedido de cancelamento aguarda conclusão pela equipe. Não interpretar confirmação comercial como pagamento ou aprovação de arte.

As cotas de revisão/confirmação são por sessão. Inicialização e troca de link usam limite compartilhado conservador na ausência de uma origem confiável de IP; não confiam em cabeçalhos encaminhados pelo visitante. Instalações com maior volume devem definir um ingresso confiável antes de refinar esse limite.

Antes de publicação autorizada: backup novo com aplicação parada, restauração isolada, migração `20261023190000_catalog_checkout` e comparação das projeções legadas. Depois de novas compras C5, não fazer downgrade cego para C4: preserve os registros, a chave e a proteção contra duplicação. A implementação em worktree e a candidata de validação não substituem autorização de integração/publicação.

Configure backup automático com retenção, cópia fora do servidor e restauração testada. Antes de atualizar uma instalação com dados, gere backup atual e preserve a imagem anterior. As migrações ficam em prisma/migrations e não devem ser removidas da entrega.

Consulte [PENDENCIAS.md](PENDENCIAS.md) antes de publicar externamente. A preparação da pasta não configura domínio, proxy, certificados ou agendamento de backups.

## C3: atualização de uma instalação C2

Estado em 22/10/2026: versão 1.1.0 integrada pelo [PR #3](https://github.com/bsgirardi/appb2t/pull/3) e publicada localmente em http://localhost:3000. Migração `202610220001_catalog_kits` aplicada após backup final com aplicação parada; 82 projeções históricas idênticas antes/depois. Imagem `appb2t:1.1.0` saudável e volume original preservado. A porta 3104 e seu banco separado continuam exclusivos de conferência. Para outras instalações C2, siga o procedimento abaixo. Identificação dos backups e resultados no [registro da release](docs/superpowers/2026-10-22-release-1.1.0.md).

1. Antes da publicação autorizada, gere novo backup consistente do banco operacional e preserve a imagem anterior. O backup do ensaio de 22/10 não substitui o backup imediatamente anterior à troca.
2. Restaure esse backup em PostgreSQL 17 separado, sem reutilizar o volume operacional. Aplique as migrações pendentes pelo serviço `migrate`, incluindo `202610220001_catalog_kits`, e compare os registros anteriores usando suas colunas originais. O ensaio C3 já executado preservou contagens e hashes de 82 projeções históricas; detalhes e identificação da imagem estão no [relatório de validação](docs/superpowers/2026-10-22-catalogo-c3-validacao.md).
3. Depois do ensaio aprovado, use o nome Compose e o volume efetivos da instalação existente, conforme a seção de preservação de volumes. Aplique a migração aditiva e só inicie a nova aplicação após seu sucesso. Não importe fixtures, usuários fictícios ou o banco da candidata na instalação operacional.
4. Confira `/api/health`, login, produtos/fotos, documentos legados e um fluxo controlado de kit até preparação de orçamento. O kit deve aplicar seu desconto uma vez, sem acumular faixas individuais; consulta mantém o total pendente. Verifique também impressão e preservação de valores históricos antes de liberar o atendimento.

**Retorno de versão:** preserve o banco migrado, seus novos registros e o backup. C2 não foi validada para ler os metadados `catalogKits` gerados por C3 e usa contratos estritos anteriores; portanto, não trate a troca pela imagem C2 como rollback compatível depois de criar documentos C3. Se for necessário interromper a nova versão, suspenda novas gravações e use uma versão compatível ou um procedimento de recuperação previamente ensaiado. Não remova tabelas/colunas, não descarte o volume e não restaure um backup antigo sobre registros novos sem um plano explícito de reconciliação.
