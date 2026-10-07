# B2T · Calculadora de impressão 3D

Ferramenta de precificação de filamento e resina com catálogo público de produtos, PostgreSQL centralizado, contas individuais e configurações exclusivas de administradores. Interface responsiva em português, valores em reais e motor decimal compartilhado entre calculadora e catálogo.

## O que está incluído

- Calculadora de material, energia, máquina, manutenção, falhas, acabamento, fixação e lucro.
- Painel separado de materiais, impressoras, custos/taxas e equipe.
- Portfólio público com foto, descrição, preço e formas de pagamento; painel de produtos para administradores e operadores.
- Administrador cria contas e configura a operação. Operador consulta os parâmetros e calcula.
- Senhas com scrypt e salt; cookies HttpOnly; sessões revogadas na troca de senha e desativação.
- Gravação com versão para evitar sobrescrita entre administradores.
- Next.js / TypeScript / Prisma / PostgreSQL, Dockerfile com múltiplos estágios e Docker Compose.

Nenhuma conta, produto ou tarifa de demonstração é criada automaticamente na instalação.

## Portfólio e produtos

### Catálogo e SEO

O catálogo público tem busca por nome/descrição/código, filtros por coleção, ordenação por preço/nome/novidade e paginação de 12 produtos. Cada produto publicado tem uma página própria com galeria, preço, condições e contato pelo WhatsApp (usa o telefone configurado em Aparência; números brasileiros sem DDI recebem 55). Sem telefone válido, o contato usa o e-mail, quando disponível.

Em **Produtos → Editar → Informações para venda**, configure código único (SKU), descrição curta dos cards, especificações, cores, tamanhos, disponibilidade e prazo de produção em dias úteis. SKU é normalizado para maiúsculas; campos vazios são opcionais. Cores e tamanhos usam o mesmo preço e não controlam estoque por variação. O visitante seleciona as opções antes de abrir o contato; a mensagem inclui código, escolhas e link do produto. Produtos indisponíveis oferecem consulta de reposição. O prazo de produção não inclui entrega. Produtos anteriores começam como **Consulte disponibilidade**, sem pressupor estoque.

Em **Aparência → Página inicial do catálogo**, administradores editam até 3 banners, até 4 coleções em destaque, o texto sobre a loja e a ordem das seções. Cada banner pode usar a capa de uma coleção (ou a primeira foto de um produto ativo dela); sem coleção, mostra texto e aponta para todos os produtos. Cada vitrine exibe até 4 produtos ativos. Coleções inativas e vitrines vazias são ocultadas. Busca, filtros e paginação levam diretamente ao catálogo, sem repetir banners. Salvar aparência publica as alterações com proteção contra edições simultâneas.

Os dados estruturados de produto incluem SKU quando preenchido e disponibilidade apenas para produtos explicitamente disponíveis/indisponíveis. As opções comerciais não alteram custos da calculadora nem snapshots de orçamentos/vendas existentes.

Em **Aparência → Busca e compartilhamento do catálogo**, edite título (até 70 caracteres) e descrição (até 170) da página inicial. Esses textos também alimentam o compartilhamento social. Campos vazios usam nome/slogan; coleções e produtos mantêm seus próprios metadados.

O texto **Sobre a loja** ganha página própria em `/portfolio/sobre`. Em **Perguntas frequentes**, adicione até 12 perguntas com respostas, reorganize-as ou remova-as; a página `/portfolio/ajuda` oferece respostas expansíveis por mouse e teclado. Use informações reais da operação; nenhuma política comercial é preenchida automaticamente. Páginas sem conteúdo retornam 404 e não aparecem no rodapé nem no sitemap. Salvar conteúdo publica as páginas e seus links; esvaziá-lo retira as páginas. As configurações existentes recebem padrões vazios, sem nova migração. O orçamento do visitante continua sem indexação.

### Lista de orçamento do visitante

Na página do produto, escolha as opções e a quantidade e use **Adicionar à lista de orçamento**. O link **Minha lista** permite ajustar quantidades, remover itens e conferir os valores. Combinações iguais são somadas; cores/tamanhos diferentes permanecem em linhas separadas. Limites: 20 combinações e 99 unidades por combinação.

A lista é local ao navegador e guarda somente identificadores, opções e quantidades; preços vêm do servidor. Ao usar **Conferir e preparar contato**, a aplicação consulta novamente preços, publicação, disponibilidade e opções atuais. Produtos retirados, indisponíveis ou com opções alteradas são sinalizados e impedem preparar a mensagem até a revisão. O resumo usa cálculo decimal, informa total de referência sem frete e pode ser aberto no WhatsApp/e-mail ou copiado. O visitante confirma o envio no aplicativo de contato. Links muito longos podem depender dos limites do aplicativo; **Copiar lista** oferece alternativa.

Essa solicitação não cria cliente, orçamento interno, venda, reserva de estoque ou cobrança. A equipe registra o orçamento interno após o atendimento. A lista não é compartilhada entre dispositivos, pode ser perdida ao limpar dados do navegador e funciona somente em memória se o armazenamento estiver bloqueado. `/portfolio/orcamento` não é indexável nem incluído no sitemap. A consulta pública de valores tem limite de tamanho e não aceita preços enviados pelo visitante.

No editor, **Busca e compartilhamento** permite preencher título e descrição para buscadores; em branco, usa o conteúdo do produto. A prévia acompanha o rascunho sem publicar. As URLs contêm o identificador e o nome legível; nomes antigos redirecionam permanentemente para o endereço atual. Produtos inativos retornam 404 na página pública e saem do sitemap.

Antes de atualizar, aplique todas as migrações pendentes com `npm run db:migrate`, incluindo `202609300001_catalog_seo` e `202610010001_storefront_merchandising`. Elas preservam produtos, preços e imagens. Configure `APP_URL` com o domínio público HTTPS para gerar links canônicos, mensagens e sitemap corretos. `/sitemap.xml` lista produtos e coleções ativos; `/robots.txt` permite imagens públicas. O catálogo e as páginas de produto permitem indexação; buscas/ordenações ficam com `noindex,follow` e as telas internas mantêm `noindex`. Dados estruturados incluem Product/Offer e BreadcrumbList, sem inventar estoque, avaliações ou prazos.

Após publicar no domínio definitivo, cadastre esse domínio no Google Search Console e envie `/sitemap.xml`. Essa verificação depende de acesso à propriedade e não é feita pela aplicação. Indexação e posicionamento não são garantidos. A loja permite editar banners e opções comerciais, mas não inclui checkout, cobrança online, promoções ou estoque/preço por variação.

Atrás de um proxy reverso, `APP_URL` deve representar a URL externa usada pelos clientes, incluindo HTTPS quando o TLS termina no proxy; não use o endereço interno do contêiner. Preserve `Origin` e o host original. A aplicação continua atendendo HTTP na porta interna 3000. O domínio é configurado na implantação, sem alteração no código.

Para conferir uma instalação local já iniciada e com ao menos um produto publicado, execute `node scripts/check-catalog-http.mjs` (padrão: `http://localhost:3100`; ajuste `CATALOG_CHECK_URL` para outra porta local). A verificação é somente leitura e cobre indexação, acesso privado, sitemap, produto, 404 e redirecionamento permanente 308. O catálogo não usa `loading.tsx` antes da validação da rota, pois o streaming antecipado impediria definir esses status HTTP corretamente.

- `/`: loja B2T e catálogo público, sem login, com somente produtos ativos. Custos e margens não são expostos. `/portfolio` e `/catalogo` redirecionam com HTTP 308 para `/`, preservando busca, coleção, ordenação e paginação. As páginas individuais e a lista de orçamento mantêm seus endereços existentes.
- `/produtos`: painel protegido; ADMIN e OPERATOR podem criar, editar, inativar e reativar qualquer produto da equipe. Cadastro de usuários e configurações globais continuam exclusivos de ADMIN.
- **Novo produto**: informe nome, descrição, preço final, de 1 a 10 fotos e condições de pagamento. Selecione material e impressora, informe consumo/tempo e ajuste os custos necessários. Todos os campos da calculadora estão disponíveis por produto.
- **Preço final de venda** é independente da sugestão da calculadora. Recalcular custos e carregar configurações atuais não alteram o preço negociado. **Usar preço sugerido** copia a sugestão somente para o rascunho; **Salvar produto** publica o preço final informado. Referências inativas não impedem editar os valores previamente salvos.
- **Inativar** retira o produto do catálogo sem excluir seu registro. **Reativar** restaura a publicação. Em conflito de edição, preserve seu texto, volte à lista, use **Atualizar lista** e abra novamente a versão atual do produto.

Fotos: JPEG, PNG ou WebP estático, até 5 MiB e 40 milhões de pixels por imagem. O servidor normaliza para WebP de até 1600 pixels por dimensão. Produto, fotos e ordem são gravados juntos, com controle de versão. A primeira imagem é a capa; o catálogo oferece carrossel manual. Tudo fica no backup PostgreSQL, sem diretório de uploads. O proxy HTTP deve aceitar requisições multipart de até **52 MiB**. As condições de pagamento do catálogo são texto informativo; não executam cobrança.

**Coleções**: administradores e operadores agrupam produtos em várias coleções, definem capa opcional, ordem e estado ativo. Inativar coleção não inativa seus produtos. O catálogo público oferece filtros e mostra somente produtos e coleções ativos.

Na página do produto, **Mais da mesma coleção** apresenta até quatro outros produtos de coleções ativas compartilhadas, em ordem de nome. Produtos inativos ou marcados como indisponíveis não aparecem nessa seção. Não há duplicatas quando as peças compartilham várias coleções; sem resultados, a seção fica oculta. A seleção usa apenas os agrupamentos cadastrados.

**Aparência**: em `/configuracoes/aparencia`, administradores configuram nome, contatos públicos, rodapé, logo e cores dos dois temas. Logo aceita até 2 MiB/16 milhões de pixels e é normalizado até 1024 px, preservando transparência. As mudanças são publicadas ao salvar. O tema segue a preferência do sistema; os textos de marca usam contraste validado. Dados existentes sem configuração mantêm a identidade B2T.

As migrações de galeria preservam os bytes da foto antiga, o preço publicado e os parâmetros de custos; cada foto existente passa a ser a capa. Faça backup antes de atualizar e execute `migrate deploy` pelo serviço de migração.

Ao atualizar uma instalação existente, aplique a migração `202609280002_products` antes de servir a nova versão. No Compose, o serviço `migrate` já executa esse passo. Fora do Compose, com `DATABASE_URL` apontando ao banco correto, execute `npm run db:migrate` e depois faça o build/inicie a aplicação. A migração adiciona tabelas sem remover os cadastros existentes.

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

## Clientes, orçamentos e vendas

Administradores e operadores acessam **Clientes**, **Orçamentos** e **Vendas**. Clientes podem ser inativados sem apagar o histórico. O documento opcional é apenas um identificador informado pela equipe.

Salve um orçamento como rascunho, complete cliente, itens, validade e condições de pagamento e use **Emitir orçamento**. Ao selecionar um produto, seu preço final é copiado para a linha e pode ser negociado. A emissão preserva nome, contatos, logo e dados comerciais. A versão privada para impressão não inclui notas internas ou custos. Registrar envio/aprovação não transmite mensagens.

Orçamento aprovado e vigente pode virar uma única venda. Revise entrada, parcelas e vencimentos antes de confirmar. A soma precisa coincidir com o total; centavos são distribuídos nas primeiras parcelas. Confirmar cria contas a receber, sem registrar dinheiro recebido.

O fluxo é **Confirmada → Em produção → Pronta → Entregue**. Prazo e observações operacionais mantêm histórico. Antes da entrega, cancelamento exige motivo e ausência de recebimentos vigentes; os recebíveis são cancelados juntos. Conteúdo de venda confirmada não pode ser alterado retroativamente. Edições concorrentes geram conflito, preservando os dados preenchidos no formulário.

## Financeiro interno

Somente **ADMIN** acessa `/financeiro`, contas, categorias, obrigações, movimentos e exportações. Operadores continuam vendo apenas o resumo de recebimento nas vendas.

1. Cadastre as contas com o saldo inicial e sua data de referência. Após a primeira movimentação, corrija diferenças com **Ajustar saldo**, informando motivo. Contas ativas podem ficar negativas, com alerta; a inativação exige saldo zero.
2. Cadastre categorias de receita/despesa e lançamentos avulsos. O parcelamento divide o total em até 120 vencimentos mensais, preservando centavos. As parcelas das vendas são criadas automaticamente, sem duplicação. A categoria de receita de vendas permanece ativa.
3. Em **A pagar e receber → Ver detalhes → Registrar baixa**, registre um pagamento já realizado fora da aplicação, inclusive parcial. Escolha conta, valor, data e forma de pagamento. Isso atualiza o saldo e o resumo da venda; não envia dinheiro nem emite cobrança.
4. Use **Estornar baixa** para corrigir um registro. O movimento original permanece e um movimento inverso é registrado na data efetiva. A data precisa estar entre a baixa original e hoje; a conta deve estar ativa. Transferências são estornadas por inteiro, nas duas contas.
5. Lançamentos avulsos permitem alteração de valor/vencimento apenas sem baixa vigente. Recebíveis comerciais não têm edição livre: seu cancelamento cancela a venda de origem inteira e todas as parcelas, antes da entrega e após estornar todas as baixas. Nenhum histórico é apagado.

O painel separa **previsto** de **realizado**. A projeção parte do saldo atual, acrescenta o líquido dos vencidos em aberto e considera somente o restante das obrigações. Transferências e ajustes aparecem separados das entradas/saídas operacionais. Saldos anteriores à abertura são apresentados como sem referência. As datas são civis; os horários do histórico usam São Paulo.

Filtros por data usam vencimento nas obrigações e data efetiva nos movimentos. O saldo atual não é limitado pelo período ou categoria; corresponde às contas selecionadas. Como uma obrigação ainda sem baixa não possui conta de pagamento definida, filtrar por conta restringe as previsões às obrigações que já tiveram baixa naquela conta. Totais abrangem todos os registros filtrados, não apenas a página. CSV usa ponto e vírgula, proteção de fórmulas textuais e limite de 10.000 movimentos; refine os filtros se exceder.

Baixas, estornos, transferências, ajustes e lotes têm proteção contra reenvio da mesma operação. Migrações preservam os recebíveis existentes. Esta etapa não inclui integração bancária, emissão fiscal, cobrança automática Pix/boleto ou conciliação externa.

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

## Identidade e interface pública B2T

O guia está em [docs/identidade/IDENTIDADE-B2T.md](docs/identidade/IDENTIDADE-B2T.md), transcrito das referências fornecidas. A vitrine usa Poppins local, cores B2T, logo e mascote originais em `public/brand`; nenhum cadastro de produto, contato ou aparência é substituído.

A camada visual pública usa Tailwind CSS 4 e o componente Button do shadcn/ui, adaptado localmente em `src/components/ui` (licença MIT incluída). `components.json` configura a adição de componentes. `src/app/design.css` organiza tokens e camadas, sem Preflight global. Cabeçalho, abertura e cards usam utilitários Tailwind; páginas secundárias reutilizam os estilos existentes com tokens B2T. A área administrativa também usa Button shadcn e Tailwind, com tema compacto isolado em `src/app/admin.css`: campos de 36 px, botões de 34 px e tabelas com menor espaçamento no desktop. No celular, controles passam a 44 px e o menu pode ser recolhido. Cores administrativas configuradas e permissões permanecem, inclusive acesso autenticado de ADMIN e OPERATOR à calculadora.

O contêiner de produção inclui a pasta `public`, necessária para logo e mascote. Banners e coleções configurados continuam disponíveis após a abertura institucional. Não há migração de banco nesta alteração. Para conferir entradas antigas, filtros, SEO e proteção administrativa: `node scripts/check-catalog-http.mjs` contra a aplicação local de validação.


### Descoberta e continuidade da navegação

A home apresenta coleções ativas com capas existentes. Busca, coleção, ordenação e página acompanham os links dos produtos; “Voltar aos resultados” recupera a seleção. Trocar/remover um filtro reinicia a paginação, preservando os demais critérios. A busca mantém coleção e ordenação. URLs canônicas e links enviados no orçamento continuam limpos. Galerias com várias fotos oferecem miniaturas selecionáveis, além de teclado, setas e gestos.


A lista de orçamento usa cartões com a capa atual de cada produto, etapas de revisão/preparação/contato e resumo destacado. O servidor fornece a URL da imagem apenas para produtos ativos; o armazenamento local continua limitado a identificadores, opções e quantidades. O contato depende de nova conferência e de ação explícita do visitante.
# Biblioteca visual

A interface usa componentes locais shadcn/ui em `src/components/ui`, tokens B2T em `src/app/design.css` e densidade administrativa em `src/app/admin.css`, sem Preflight global. Use Input, NativeSelect, Checkbox, Textarea, Field/Notice, Button, Card e Table nos novos consumidores. Preserve os contratos nativos de formulário e use as exceções de impressão documentadas.

Cobertura, adaptações do registro e evidências: [revisão shadcn](docs/identidade/REVISAO-SHADCN.md).

## Precificação por lote (V2)

A calculadora mantém o **Cálculo original** e oferece **Cálculo por lote**, com múltiplos materiais, tempos fixos e por peça, preparação/acabamento, complementos, taxas do canal e três modalidades de preço. FDM usa gramas por kg; resina usa ml por litro. Cenários de quantidade conservam as premissas de lote; ocupação da placa e fatiamento precisam ser revisados pela equipe.

Em **Configurações → Configurar precificação por lote**, ADMIN cadastra tarifas, markup/margem padrão, canais e complementos. Não há valores presumidos: informe zero explicitamente quando um custo não existir. OPERATOR pode simular e aplicar estimativas, mas não alterar tarifas. Mudanças de cadastros exigem revisão de referências antes de um novo cálculo.

**Aplicar estimativa** preserva a ficha de custo e mantém o preço comercial. **Usar preço sugerido** é uma ação separada; preço zero pode ser simulado, mas não publicado como preço comercial. Produtos V1 continuam disponíveis; a conversão é explícita e arquiva a ficha anterior na mesma transação do salvamento.

Orçamentos e vendas em rascunho podem receber uma estimativa por item. Reordenar preserva a associação; duplicar cria uma nova identidade sem copiar o vínculo de custo. Alterações de quantidade, descrição ou produto deixam o vínculo desatualizado: recalcule ou remova a estimativa antes de emitir/confirmar. Um item sem estimativa permanece identificado como sem custo. Emissão e confirmação congelam a memória; reabertura e nova edição conservam revisões anteriores. Conversão copia a memória e sua origem sem recalcular tarifas ou duplicar recebíveis.

A contribuição por item é anterior a descontos e frete. Quando existem, a tela informa **resultado global não apurado nesta etapa**. Trabalho representa custo da atividade; depreciação é apresentada separadamente. Estimativas não geram estoque ou movimentos financeiros. Catálogo público e impressão comercial não recebem fichas privadas.

### Implantação e recuperação V2

A migração `202610050001_pricing_v2` é aditiva, sem tarifas iniciais nem regravação de documentos legados. Antes de produção: obter backup recuperável, ensaiar sua restauração numa base isolada e aplicar as migrações com uma versão da aplicação compatível com V2. Após gravar dados V2, não fazer downgrade cego para uma aplicação que só lê V1. Recuperar por correção para frente ou restauração coordenada de aplicação e banco; não apagar tabelas em uso. Esta entrega de desenvolvimento não executa a implantação em produção.

## Estoque integrado U2

A área **Estoque** controla materiais e insumos, sem alterar os preços comerciais automaticamente. Habilite o item e registre a contagem inicial (inclusive zero); “Não inventariado” significa que o saldo ainda é desconhecido. FDM usa gramas, resina usa mililitros e insumos podem usar unidades. Formulários convertem kg→g e litro→ml explicitamente.

- **Materiais:** físico, reservado, disponível, identificações opcionais de rolo/frasco/lote e razão imutável. Negativos exigem justificativa, inclusive por identificação.
- **Recebimentos:** administrador e operador registram a chegada física. O administrador confere valores por linha e gera parcelas a pagar ou vincula um grupo completo existente, inclusive já pago. A conferência não repete a entrada nem realiza pagamento.
- **Reservas:** na venda confirmada/em produção, consulte materiais e reserve quantidades por linha. Consumir libera a reserva correspondente. Cancelar a venda libera o restante; a entrega exige consumir ou liberar reservas abertas.
- **Reposição:** lista itens com falta disponível, sem somar novamente reserva e consumo.

O administrador escolhe média ponderada ou referência manual. Compras sem custo conferido mantêm a valorização provisória. Entradas posteriores cobrem déficits por ordem de lançamento; revisões de custo preservam os eventos. A mudança de método exige ausência de pendências, motivo e referência de abertura. **Aplicar referência à calculadora** é uma ação explícita, com valor anterior/novo; não altera produtos ou documentos históricos.

Devolução de consumo referencia a saída. Devolução ao fornecedor referencia a compra e deixa uma pendência financeira: o administrador mantém a dívida justificadamente ou reduz/cancela o principal sem baixa vigente. Pagamentos precisam ser estornados pelo financeiro antes da redução. Cancelar integralmente um recebimento é permitido somente sem movimentos posteriores dependentes, reservas comprometidas ou baixas vigentes.

Em erro de conexão, mantenha o formulário e tente novamente: a chave da operação evita duplicidade. Em conflito de versão, use **Atualizar dados sem apagar rascunho**, revise saldos/valores e reenvie. Para dividir recebimento entre identificações, adicione linhas do mesmo material.

### Publicação e recuperação do estoque

Migrações aditivas: `202610060001_stock` e `202610060002_stock_constraints`. Não criam saldos iniciais nem transformam todos os complementos em insumos. Faça backup PostgreSQL antes de publicar, restaure-o em banco isolado e compare produtos/imagens/documentos/financeiro antes e depois da migração. Preserve tabelas `StockCommand` e revisões de valorização: contêm idempotência e decisões financeiras das devoluções, não são cache descartável.

Após gravações U2, restauração de backup anterior remove essas gravações. Para reverter código, prefira manter o esquema aditivo e os dados, sem executar migrações destrutivas. Restaurar um backup operacional exige definir explicitamente o ponto de recuperação. Testes usam exclusivamente `b2t_test`; nunca use a URL operacional na suíte.

Limites desta entrega: uma localização, sem estoque de produtos acabados, ordens de produção/compra, emissão fiscal ou rentabilidade consolidada por pedido. O custo de consumo não gera despesa duplicada no financeiro.
