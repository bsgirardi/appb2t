# B2T · Calculadora de impressão 3D

Ferramenta interna para precificação de filamento e resina, com PostgreSQL centralizado, contas individuais e configurações exclusivas de administradores. Interface responsiva em português, valores em reais e motor decimal independente para futura integração com catálogo.

## O que está incluído

- Calculadora de material, energia, máquina, manutenção, falhas, acabamento, fixação e lucro.
- Painel separado de materiais, impressoras, custos/taxas e equipe.
- Administrador cria contas e configura a operação. Operador consulta os parâmetros e calcula.
- Senhas com scrypt e salt; cookies HttpOnly; sessões revogadas na troca de senha e desativação.
- Gravação com versão para evitar sobrescrita entre administradores.
- Next.js / TypeScript / Prisma / PostgreSQL, Dockerfile com múltiplos estágios e Docker Compose.

O catálogo de produtos é uma próxima etapa. Nenhuma conta ou tarifa de demonstração é criada automaticamente na instalação.

## Executar com Docker

Requer Docker Engine em execução, containers Linux e Docker Compose v2.

1. Copie `.env.example` para `.env` (`Copy-Item .env.example .env` no PowerShell).
2. Substitua `POSTGRES_PASSWORD` por uma senha aleatória longa **apenas com letras e números**, pois o Compose a insere na URL do banco. Pode gerar uma senha hexadecimal com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
3. Para teste local, mantenha `APP_URL=http://localhost:3000`. Se alterar `APP_PORT`, ajuste `APP_URL` também.
4. Execute:

```sh
docker compose build
docker compose up -d
docker compose ps
docker compose --profile tools run --rm admin
```

O comando `admin` pergunta nome, e-mail e senha sem exibi-la. Ele cria apenas o primeiro administrador; novos acessos são cadastrados na seção Equipe. O banco inicia primeiro, as migrações são aplicadas e só então a aplicação sobe.

Abra [http://localhost:3000](http://localhost:3000). Entre com a conta criada e configure materiais, impressoras e custos. Não há valores de produção presumidos: preencha todas as taxas, usando `0` para as que não se aplicam.

O volume `postgres_data` preserva os dados entre reinícios. **Não execute `docker compose down -v` sobre uma instalação com dados que deseja manter.**

```sh
docker compose logs --tail 100 app migrate
docker compose restart app
docker compose down
```

### Acesso de outros dispositivos

Instale os containers em um servidor acessível pela equipe. A configuração padrão publica a porta somente em `127.0.0.1`, para uso atrás de um proxy reverso no mesmo servidor.

- Configure um domínio e HTTPS no proxy reverso, apontando para `127.0.0.1:3000`.
- Defina `APP_URL=https://calculadora.seudominio.com.br`, sem subcaminho.
- Preserve o cabeçalho `Origin` e o host original no proxy. Requisições mutáveis só aceitam a origem configurada.
- Recrie a aplicação com `docker compose up -d --build`.
- Todos os dispositivos acessam o mesmo domínio. Não é necessário instalar banco em cada um.

`APP_BIND` pode ser ajustado explicitamente quando o proxy estiver em outra infraestrutura. O PostgreSQL permanece sem porta publicada. Produção externa em HTTP é recusada na autenticação; use HTTPS. Hospedagem, domínio e certificados não são provisionados por este repositório.

## Desenvolvimento local

Node.js 22.20 ou superior compatível, npm e PostgreSQL 17+.

```sh
npm ci
npx prisma generate
npm run db:migrate
npm run admin:create
npm run dev
```

Defina `DATABASE_URL` com a conexão do seu banco e `APP_URL=http://localhost:3000` no ambiente. Next.js lê `.env`; para executar scripts como `admin:create`, exporte a variável na sessão ou use `node --env-file=.env --import tsx scripts/create-admin.ts`. Prisma lê `.env` para migrações. Nunca versione `.env`.

O build não consulta o banco; o banco é exigido ao acessar dados protegidos. Para verificar a aplicação em modo produção sem Docker: `npm run build` e `npm start`.

## Testes

```sh
npm run test:unit
npm run typecheck
npm run lint
npm run build
```

Para integração, suba o banco dedicado (porta **55432**, sem relação com o banco de produção):

```sh
docker compose -f compose.test.yaml up -d --wait
```

PowerShell:

```powershell
$env:DATABASE_URL='postgresql://b2t_test:b2t_test_local_only@127.0.0.1:55432/b2t_test'
npm run db:migrate
npm test
```

Bash:

```sh
export DATABASE_URL='postgresql://b2t_test:b2t_test_local_only@127.0.0.1:55432/b2t_test'
npm run db:migrate
npm test
```

**Os testes de integração limpam as tabelas de `b2t_test`.** O código recusa outra combinação de host/banco antes da limpeza. Nunca use a URL de produção para testes. A senha em `compose.test.yaml` serve exclusivamente para o banco local descartável.

## Fórmulas

`t` é o tempo total em horas. Filamento usa gramas/kg; resina usa ml/litro.

| Parcela | Cálculo |
| --- | --- |
| Material | consumo ÷ 1000 × preço por kg/litro |
| Energia | t × watts ÷ 1000 × tarifa por kWh |
| Máquina | t × aquisição ÷ (meses × dias/mês × horas/dia) |
| Manutenção | (material + energia) × manutenção% |
| Subtotal | material + energia + máquina + manutenção |
| Falhas | subtotal × falhas% |
| Acabamento | subtotal × acabamento% |
| Custo total | subtotal + falhas + acabamento + fixação |
| Preço sugerido | custo total × (1 + acréscimo% / 100) |

Nas parcelas percentuais, divida o percentual informado por 100. O lucro representa **acréscimo sobre o custo**, não margem sobre a venda. R$ 10 de custo com acréscimo de 200% resulta em R$ 30 de venda.

Os cálculos mantêm casas decimais intermediárias. A exibição usa duas casas, com arredondamento HALF_UP. Uma simulação representa o trabalho inteiro informado, sem multiplicação automática por quantidade. Parâmetros são carregados ao abrir a tela; use **Atualizar parâmetros** para carregar alterações de outro dispositivo.

## Backup e restauração

Faça backups regulares fora do volume Docker e teste a restauração. Os comandos abaixo evitam redirecionar binários pelo PowerShell:

```sh
docker compose exec -T db pg_dump -U b2t -d b2t -Fc -f /tmp/b2t-backup.dump
docker compose cp db:/tmp/b2t-backup.dump ./b2t-backup.dump
```

Guarde o arquivo em local protegido; ele contém dados internos e hashes de senha. Para testar a restauração **em banco novo**, mantendo o banco original:

```sh
docker compose cp ./b2t-backup.dump db:/tmp/b2t-restore.dump
docker compose exec -T db createdb -U b2t b2t_restore
docker compose exec -T db pg_restore -U b2t -d b2t_restore --no-owner --exit-on-error /tmp/b2t-restore.dump
docker compose exec -T db psql -U b2t -d b2t_restore -c 'SELECT count(*) FROM "User";'
```

Em uma recuperação real, valide o banco restaurado antes de trocar a conexão da aplicação. O procedimento não sobrescreve automaticamente dados de produção.

## Estrutura e manutenção

- `src/domain/calculation`: validação, contratos e motor de cálculo.
- `src/server`: sessões, usuários e operações de banco.
- `src/app/api`: autorização e endpoints.
- `src/components`: calculadora, painel e formulários.
- `prisma/migrations`: migrações versionadas; produção usa `migrate deploy`, nunca `db push`.
- `docs/superpowers`: especificação e plano aprovados.

As imagens Docker acompanham a série Node 22 e PostgreSQL 17. O lockfile fixa dependências npm; atualizações de imagens devem ser validadas antes de atualizar uma instalação. A CLI Prisma e ferramentas de bootstrap ficam no estágio `tools`; o runtime usa a saída standalone e usuário sem privilégios.
