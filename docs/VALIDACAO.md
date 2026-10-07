# Verificação da primeira versão

Data: 28/09/2026.

## Resultados

- 49 testes aprovados: 37 unitários/interface e 12 de integração com PostgreSQL real.
- TypeScript e ESLint sem erros ou avisos.
- Build de produção Next.js concluído, incluindo cliente Prisma e saída standalone.
- Servidor standalone executado localmente; a verificação HTTP de autenticação e permissões também passou nessa versão de produção.
- Auditoria npm sem vulnerabilidades conhecidas nas versões instaladas.
- `docker compose config --quiet` aprovado.
- Navegador: login de administrador, exemplo de venda de R$ 48,19, edição e salvamento de material com vírgula decimal, painel de custos, layout de celular e logout pela conta.
- Operador: acesso direto à página administrativa mostra acesso restrito; o menu não mostra configurações.
- Verificação HTTP adicional: oito leituras/mutações administrativas recusadas ao operador (403), dados da calculadora permitidos com sessão, acesso anônimo recusado (401), origem externa recusada, cookie HttpOnly/SameSite e revogação no logout.
- Revisão independente encontrou dois problemas corrigidos com testes que falharam antes da correção: tempo composto apenas por espaços e mensagens de validação padrão em inglês. Não restaram achados adiados.

## Limitações de verificação

O Docker Desktop local não conseguiu iniciar o engine Linux. Foi possível validar a configuração Compose, mas não executar build das imagens, healthchecks dos containers ou restauração de backup via Docker. Os testes de banco usaram PostgreSQL 18.4 temporário e isolado; a implantação especifica PostgreSQL 17. A documentação de backup foi revisada, mas a restauração ainda deve ser exercitada no servidor de destino.

O projeto está preparado para instalação. Domínio, HTTPS e publicação externa não foram configurados. As contas e dados usados na prévia são fictícios, em banco separado; não são criados na instalação de produção.

## Decisões de execução

1. Usar o diretório inicial e a branch `feat/calculadora`, conforme plano aprovado, pois não havia código existente para isolar.
2. Registrar progresso diretamente em arquivos compatíveis com PowerShell, sem depender dos auxiliares de shell da habilidade de execução.
3. Manter Prisma 6 com API estável e corrigir a dependência transitiva `deepmerge-ts` via override. Usar Vitest 4.1.11 com Vite 7, evitando o binding nativo do Rolldown que não carregou neste Windows. O lockfile e a auditoria registram o resultado; mudanças futuras devem passar pela suíte.
4. Testar com PostgreSQL temporário diante da falha do Docker, sem substituir o banco nem a forma de implantação do produto. O risco residual é a execução das imagens não ter sido confirmada neste computador.
5. Corrigir a tradução das mensagens de validação junto com o problema de espaços no tempo, porque o idioma português faz parte dos requisitos aprovados.

As decisões não alteram as fórmulas nem o escopo aprovado. Commits permanecem locais; nenhum remoto ou serviço externo foi publicado.

## Portfólio e produtos — 28/09/2026

Implementados `/portfolio` público e `/produtos` protegido, com fotos, descrição, preço, condições de pagamento, inativação/reativação e edição de todos os parâmetros da calculadora por produto. A migração `202609280002_products` foi aplicada aos bancos locais isolados `b2t_test` e `b2t_preview`; não foi aplicada a uma instalação de produção.

Verificações realizadas nesta etapa:

- Suíte completa: **84 testes aprovados em 18 arquivos**, incluindo PostgreSQL real.
- Testes de domínio, imagem e formulário criados antes da implementação dos respectivos módulos; falhas iniciais por módulo ausente e aprovação posterior observadas.
- Fluxo integrado usando os Route Handlers reais: upload multipart, normalização WebP, cálculo no servidor, edição preservando foto, inativação, foto privada de produto inativo, permissão de operador e recusa de sessão de usuário desativado. Somente o contexto de cookies do Next é substituído nesse teste; sessão, banco e serviços são reais.
- Projeção pública sem parâmetros internos; snapshot preservado após alterações globais e referências inativas; conflito concorrente preservando texto e foto atomicamente.
- Interface automatizada: edição de custos e prévia de preço, atualização de configurações apenas no rascunho, upload com prévia, preservação de dados em erros e inativação/reativação com versão atual.
- TypeScript, ESLint e `git diff --check` aprovados.
- Build de produção Next.js aprovado com as novas rotas dinâmicas.
- Revisão independente do código não encontrou problemas materiais. A navegação móvel foi ajustada para permitir quebra de linha com os novos itens.

Limitações desta etapa:

- A inicialização do servidor de prévia foi recusada pela revisão automática da ferramenta de execução, com a mensagem `blocked by policy` e sem justificativa adicional. A inspeção visual no navegador em 1440px/390px e o fluxo manual completo não foram executados. Os testes de componentes não substituem essa inspeção visual.
- Docker Desktop retornou erro 500 ao consultar o engine Linux. Build e execução dos contêineres não foram confirmados. Os testes usam PostgreSQL 18.4 local, enquanto o Compose de implantação usa PostgreSQL 17.
- Persistência foi exercitada em transações reais; reinício completo do banco/aplicação e restauração de backup não foram repetidos nesta etapa.

Decisões de execução: continuar no checkout e branch existentes `feat/calculadora`, mantendo a integração local; registrar progresso com ferramentas nativas do Windows em vez dos auxiliares Bash; reutilizar PostgreSQL de teste isolado diante da indisponibilidade do Docker. O custo dessas escolhas é não haver isolamento adicional de checkout e permanecer pendente a verificação específica dos contêineres. Não houve push, merge ou publicação externa.

## Catálogo, coleções e aparência — 29/09/2026

- Preço final informado separadamente da sugestão, galeria de 1–10 fotos, carrossel acessível, coleções e personalização administrativa implementados.
- Suíte completa: 106 testes aprovados em 27 arquivos, com PostgreSQL real isolado; TypeScript e ESLint aprovados.
- Migração completa em banco descartável da versão anterior preservou preço 75,15, snapshot e bytes da foto. Migração de galeria também testada em tabela temporária.
- Docker Linux voltou a funcionar: imagens de produção construídas, migrações aplicadas e aplicação saudável em projeto de validação separado, acessível somente por loopback.
- Navegador: produto criado com dez fotos, troca da capa, reabertura com todas as imagens, alteração de custos mantendo preço final 75,00, criação de coleção e troca do nome da empresa. Carrossel público navegável, filtro e imagens carregados.
- HTTP de produção: visitante acessa portfólio e fotos; API de produtos exige sessão; operador acessa produtos/coleções e não altera aparência. Reinício do banco e da aplicação preservou fotos, preço, coleções e marca.
- Visual: rótulos de custos passaram de 10px para 14px. Variantes clara/escura renderizadas em fixture isolada do formulário real, em 1440/390px; sem overflow horizontal. Catálogo real verificado em 390px. O navegador disponível não oferece emulação de preferência de cor; a troca do tema do sistema durante a sessão não foi exercitada. A fixture seleciona a regra CSS de cada tema, sem mudar preferências do computador.
- Revisão independente tentada, mas o agente não iniciou por falta de créditos do ambiente. Foi feita revisão local pelo autor, que é menos independente. Ela identificou URL de logo inalterada após substituição; corrigida com chave de imagem renovada, teste inicialmente falhando e suíte 106/106 após a correção. Não há parecer independente desta entrega.
- Decisões: manter checkout/branch aprovados; usar cabeçalhos `Task` para compatibilidade dos auxiliares de execução; prosseguir com revisão local diante da indisponibilidade do revisor. Custos residuais: sem isolamento adicional de checkout e possibilidade de pontos cegos do autor. Metadados e identidade são carregados em execução, permitindo build Docker sem banco conectado.

Esta validação atualiza as limitações antigas de Docker e início da prévia descritas acima. Não houve publicação externa, push ou merge. Vendas e financeiro pertencem às próximas entregas aprovadas.

## Clientes, orçamentos e vendas — 30/09/2026

- Implementados clientes privados, orçamentos com emissão/aprovação/reabertura, snapshots comerciais e arquivo de logo, impressão privada, vendas diretas/conversão, parcelas, estados operacionais e cancelamento.
- Suíte após correção de revisão: 132 testes aprovados em 40 arquivos, com PostgreSQL real. TypeScript, lint, build local e build Docker executados; imagens de validação contêm a entrega comercial. O ajuste final do parcelamento é coberto pelo teste de regressão.
- Concorrência: mesma conversão repetida cria uma venda e seus recebíveis uma única vez. Falha de constraint durante a gravação desfaz venda, parcelas, operação idempotente e mudança do orçamento. Confirmação não registra pagamento.
- Navegador: cliente fictício → orçamento com preço negociado R$ 100 → emissão → aprovação → entrada R$ 20 + duas parcelas R$ 40 → venda → produção → pronta → entregue. Resumo manteve recebido R$ 0 e pendente R$ 100.
- HTTP de produção com operador confirmou acesso comercial, recusa de visitante e impressão sem notas privadas do cliente/documento. Reinício do banco e aplicação preservou snapshots, eventos, parcelas, estado entregue e vínculo com orçamento convertido.
- Visual: aplicativo real no tema escuro, tela móvel 390px sem overflow horizontal; impressão com fundo claro e cabeçalhos legíveis. Formulários reais renderizados em fixture nos temas claro/escuro, incluindo 390px. Alternância do tema do sistema e diálogo nativo de impressão/PDF não foram automatizados. Capturas preservadas no diretório de evidências desta entrega.
- Revisão independente comercial concluída: nenhuma falha crítica; um achado importante no parcelamento com entrada em 31/01 foi reproduzido por teste falhando e corrigido. Vencimentos agora mantêm 28/02, 31/03 e 30/04. Observação menor adiada: os horários do histórico comercial seguem o fuso do navegador; datas civis e validações de validade usam São Paulo.
- Escopo financeiro nesta etapa: recebíveis persistentes e resumo com recebido zero. Baixas, contas e caixa pertencem à entrega financeira seguinte; não há integração bancária/fiscal.

## Financeiro interno — 30/09/2026

- Implementados contas/categorias, obrigações avulsas parceladas, recebíveis comerciais, baixas parciais, estornos, transferências em duas contas, ajustes auditados, painel, fluxo realizado/projetado e CSV. Todas as páginas e 18 famílias de rotas financeiras exigem ADMIN, reforçado nos serviços.
- Suíte completa: **168 testes aprovados em 52 arquivos**, com PostgreSQL real isolado. TypeScript, lint sem avisos e build Docker de produção aprovados. Casos incluem disputa entre baixa e cancelamento, duas baixas concorrentes, replay idempotente, rollback após falha entre registros, transferência sem segunda perna, abertura/inativação de contas, exportação de 10.001 registros recusada e neutralização de fórmulas.
- Migração no PostgreSQL 17 do Docker preservou exatamente ids, valores, vencimentos e vínculos das três parcelas existentes; a categoria de receita foi atribuída sem recriar os recebíveis.
- Navegador real: contas com saldos 100/50, transferência de 25 resultando em 75/75 e recebimento parcial de 10 sobre parcela de 20, com restante 10 e estado PARCIAL. HTTP de produção confirmou recebido 10/pendente 90 na venda, estorno, despesa 30 com baixa parcial 15, replay, estorno completo da transferência e ajuste/estorno. Posição final: saldo 135, a receber 100, a pagar 15, saídas realizadas 15.
- Reinício de banco e aplicação preservou contas, obrigações, movimentos, painel e fluxo de caixa. Backup PostgreSQL em formato custom foi restaurado em **novo banco**, mantendo a origem; contagens e hashes de todas as linhas ordenadas coincidiram em 11 tabelas financeiras/comerciais. Evidências e cópia do backup ficam no diretório local de validação, ignorado pelo Git.
- Revisão visual encontrou rolagem horizontal no fluxo de caixa em 390px; corrigida limitando as colunas do grid e mantendo rolagem dentro das tabelas. Componentes reais de painel, baixa e fluxo foram renderizados em fixtures clara/escura. A fixture e o aplicativo real atualizado apresentaram largura 390 e conteúdo 375, sem overflow da página. Navegação de campo por Tab conferida. A preferência do sistema não foi alterada; a fixture seleciona as mesmas regras CSS de cada tema.
- O histórico comercial passou a usar São Paulo, resolvendo a observação menor da revisão anterior. O cabeçalho da área financeira também recebeu o nome correspondente.
- Limitações: revisão desta entrega realizada pelo próprio autor, sem novo parecer independente; comportamento de troca da preferência do sistema e diálogo nativo de impressão/PDF não automatizados. Não houve publicação externa, push, merge ou integração bancária/fiscal.

## Catálogo comercial e SEO — 01/10/2026

- Vitrine responsiva, busca, ordenação, paginação, páginas individuais, contato contextual, campos de SEO e prévia no editor implementados. Sitemap, metadados sociais, canonical e dados estruturados de produto/oferta e navegação adicionados.
- Suíte completa desta entrega: 173 testes aprovados em 54 arquivos; verificação de tipos e lint aprovados. Build local e build Docker de produção aprovados. Após o ajuste de streaming, build Docker, lint e verificações HTTP executados novamente.
- Migração `202609300001_catalog_seo` aplicada no ambiente Docker existente `b2t-portfolio-validation`, após backup. Os hashes dos registros completos de produto (excluindo os dois campos novos) e das dez imagens foram idênticos antes/depois da migração. Backup e hashes em `test-results/catalog-seo`, ignorado pelo Git.
- Navegador real: catálogo e produto inspecionados em desktop e 390px; editor e campos SEO também verificados em 390px. Largura do conteúdo móvel de 375px para viewport de 390px, sem overflow horizontal. Galeria passou da foto 1 para 2; busca sem resultado mostrou estado vazio. Imagens e logo carregaram.
- Editor: título/descrição SEO do produto de validação foram preenchidos, salvos, reabertos e confirmados no HTML público. Os dois textos foram restaurados para vazio ao terminar, retomando os valores automáticos. Preço, descrição comercial e fotos preservados. A gravação incrementa a versão normalmente.
- Verificação HTTP revelou resposta 200 para URLs inexistentes e antigas devido ao `loading.tsx` ancestral. Removida a fronteira de streaming antecipado; o novo script `scripts/check-catalog-http.mjs` falhou antes da correção e passou na imagem corrigida. Confirmados 404 reais, 308 com Location correto, catálogo indexável, busca/ordenação sem indexação, login sem indexação, API privada retornando 401 e sitemap válido.
- Aplicação e banco saudáveis em `http://localhost:3100`, acessíveis apenas por loopback. O início direto de servidor no Windows continuou bloqueado pela revisão automática; a validação foi concluída pelo fluxo Docker já existente no projeto. Essa pendência de inspeção visual está resolvida.
- Conforme orientação do usuário, domínio e publicação externa ficam a cargo do proxy. O README explica a configuração de APP_URL externa e preservação dos cabeçalhos. Nenhuma publicação externa, push ou merge foi realizada. Preferência de tema do sistema não foi alterada; esta inspeção usou o tema claro ativo.

## Edição da loja e dados comerciais — 01/10/2026

- Implementados banners (até 3, com imagens existentes das coleções), vitrines (até 4 coleções, 4 produtos ativos cada), ordem editável das seções e texto sobre a loja. Configuração restrita a administradores e integrada à versão da aparência.
- Produtos ganharam código único normalizado, descrição curta, especificações, cores, tamanhos, disponibilidade e prazo de produção. Os campos preservam compatibilidade com edições antigas. Opções compartilham o preço, sem estoque individual. Seleção de opções incluída no contato por WhatsApp/e-mail; indisponíveis oferecem consulta de reposição. SEO inclui SKU e disponibilidade explícita, sem inventar estoque.
- Suíte completa: **180 testes aprovados em 56 arquivos** com PostgreSQL 17 isolado. Os novos casos cobrem normalização/duplicidade de SKU, preservação em edições legadas, opções e prazo inválidos, ordem das vitrines, exclusão de produtos/coleções inativos, conflito de versão, permissão e conteúdo da mensagem de contato. A primeira execução revelou dois erros na preparação dos novos testes (nome de coleção abaixo do mínimo e ambiente DOM ausente); corrigidos antes da execução final aprovada.
- TypeScript, ESLint e build Docker de produção aprovados. Migração aplicada no projeto separado `b2t-portfolio-validation`, aplicativo saudável em `http://localhost:3100`. Backup antes da atualização e hashes em `test-results/merchandising`: produtos, dez imagens e identidade existentes permaneceram idênticos após migração, excluindo somente os novos campos da comparação.
- Navegador real: criação/salvamento/reabertura de banner, destaque, texto e ordem de seção; cadastro/salvamento/reabertura de SKU, descrição curta, opções, especificações e prazo. Página pública refletiu os dados e a ordem escolhida. Seleção de cor e tamanho liberou contato e compôs a mensagem correta; nenhum contato foi enviado.
- Catálogo, detalhe, editor de produto e editor de aparência conferidos em 390px (conteúdo 375px, sem rolagem horizontal da página); catálogo/detalhe também em desktop. Capturas em `test-results/merchandising`. Os valores temporários de demonstração foram retirados ao final pela interface, preservando o produto e a identidade anteriores; versões avançaram normalmente. Banners e destaques ficam vazios até a configuração real pelo administrador.
- Verificação HTTP aprovada: indexação pública, privacidade, sitemap, páginas inexistentes 404 e redirecionamento de slug 308. Esta entrega segue sem IA, visualização 3D ou integração com marketplaces. Domínio/proxy externo não alterados. Nenhum push, merge ou publicação externa.

## Lista de orçamento do visitante — 01/10/2026

- Adicionada lista pública local ao navegador, com até 20 combinações e 99 unidades por combinação. Opções iguais são somadas; opções diferentes permanecem separadas. Cabeçalho acompanha a quantidade e a página permite alterar/remover itens e continuar escolhendo.
- Valores nunca vêm do armazenamento do visitante: consulta pública limitada valida identificadores, quantidades e opções e usa preços atuais com cálculo decimal. Produtos inativos não expõem nome/preço; indisponíveis e opções alteradas bloqueiam a preparação até revisão. O botão de preparar contato consulta novamente o servidor.
- Mensagem única com itens, códigos, opções, quantidades, valores e links, disponível por WhatsApp/e-mail conforme Aparência ou por cópia. Nenhuma criação de cliente, orçamento interno, venda, reserva ou cobrança. Nenhum envio automático. Links longos dependem do aplicativo; cópia do texto serve como alternativa.
- **187 testes aprovados em 58 arquivos**, incluindo reprecificação, limite de itens/quantidade, opções, privacidade, origem da requisição, rejeição de preço enviado pelo cliente, preservação após falha de rede e invalidação do contato após edição. TypeScript, ESLint, build Docker de produção e verificação HTTP aprovados. Lista com noindex/follow, fora do sitemap.
- Navegador real: adicionar duas unidades, navegar à lista, recarregar mantendo seleção, mudar para três unidades e conferir total R$ 225,00 sobre unitário R$ 75,00; preparar mensagem e remover item retornando ao estado vazio. Contato vazio do ambiente local exibiu alternativa de cópia; WhatsApp foi validado nos testes, sem envio real. Não foi alterado nenhum produto ou contato do banco.
- Desktop e celular de 390px inspecionados; conteúdo móvel de 375px, sem overflow horizontal. Capturas em `test-results/inquiry`. Item local de teste removido ao concluir. Aplicação de validação saudável em `http://localhost:3100`; esta etapa não exige nova migração de banco. Sem publicação externa, push ou merge.

## SEO do catálogo e informações da loja — 01/10/2026

- Título/descrição SEO do catálogo editáveis em Aparência, com limites de 70/170 caracteres e fallback de nome/slogan. Metadados de produto e coleção preservados; buscas continuam sem indexação.
- Página Sobre a loja reutiliza o texto institucional cadastrado. Página Ajuda reúne até 12 perguntas/respostas, com edição, remoção e reordenação administrativas. Respostas usam elementos nativos expansíveis por teclado. Nenhum texto institucional ou política comercial é inventado/preenchido automaticamente.
- Páginas entram no rodapé e sitemap somente com conteúdo; esvaziá-las remove os links e retorna 404 real. Metadados incluem título, descrição, URL canônica e compartilhamento. Configurações anteriores recebem campos vazios, sem migração adicional. Limite JSON de Aparência ampliado para 256 KiB para acomodar as respostas; limites de logo e formulário total preservados.
- **190 testes aprovados em 60 arquivos** com PostgreSQL real. TypeScript, ESLint e build de produção aprovados. Verificação HTTP ampliada para páginas institucionais, exercitada tanto com conteúdo publicado quanto vazio.
- Navegador: edição/salvamento/reabertura de SEO, texto institucional e FAQ; HTML público confirmou título/descrição personalizados. Links do rodapé e página Sobre conferidos; pergunta expandida por Enter. FAQ e editor verificados em 390px, conteúdo 375px sem overflow horizontal. Inspeção identificou campos de texto estreitos no editor de aparência; ampliados para toda a largura com altura mínima e redimensionamento vertical.
- Conteúdo temporário retirado pela interface ao final; dados reais e identidade preservados, com avanço normal de versão. Capturas em `test-results/store-information`. Instalação local de validação atualizada em `http://localhost:3100`. Nenhum push, merge, publicação externa ou configuração de domínio/proxy.

## Salvamento de produtos completos — 02/10/2026

- Corrigido limite de envio dos dados de produto: 16 KiB recusava combinações válidas de descrição, especificações e condições de pagamento, especialmente com caracteres acentuados. O limite passou a 256 KiB, mantendo a validação de cada campo, origem, quantidade de fotos e tamanho total do formulário.
- Regressão reproduzida com teste falhando antes da correção. Após o ajuste, os 6 testes direcionados de leitura multipart e ciclo HTTP autenticado passaram. Criação e edição preservaram os textos completos no PostgreSQL de teste; envio acima de 256 KiB sem Content-Length continuou recusado. Nenhum dado real de produto foi alterado.
- Esta correção não exige migração e não altera o layout.
- TypeScript, ESLint, build Docker e verificações HTTP do catálogo aprovados. Aplicação de validação atualizada e saudável em `http://localhost:3100`. A suíte completa não foi repetida nesta correção pontual; foram executados os testes diretamente afetados. Sem publicação externa, push ou merge.

## Produtos da mesma coleção — 02/10/2026

- Página individual ganhou a seção Mais da mesma coleção, com até quatro produtos em ordem de nome, usando os cartões existentes. Consulta no servidor considera apenas coleções compartilhadas ativas, exclui o produto atual, produtos inativos e indisponíveis, sem duplicação e sem expor custos. Sem resultados, a seção é omitida. Seleção por cadastro, sem IA ou rastreamento.
- Três testes de integração do catálogo aprovados, incluindo limite, ordenação, duplicação, coleções inativas, produto inexistente/inativo e projeção pública. O novo teste inicialmente usou versão desatualizada após associar coleções; corrigido para ler a versão vigente antes de inativar. TypeScript, lint, build Docker e verificações HTTP aprovados.
- Navegador real: seção e navegação entre peças conferidas no computador e em 390px; largura do conteúdo de 375px sem overflow horizontal. Capturas em `test-results/related-products`. Três produtos e uma coleção criados exclusivamente para esta inspeção foram removidos ao concluir, sem modificar os registros anteriores.
- Ambiente local de validação atualizado. Não exige migração; sem publicação externa, push ou merge. A suíte completa não foi repetida; testes concentrados no serviço alterado.

## Fechamento do escopo e pendências — 02/10/2026

As funcionalidades previstas nas três especificações de gestão interna estão implementadas: catálogo/aparência, clientes/orçamentos/vendas e financeiro. As melhorias posteriores solicitadas para apresentação comercial, edição e SEO também estão implementadas, incluindo páginas individuais, informações da loja, lista de orçamento e produtos da mesma coleção.

Pendências de operação/publicação:

- Cadastrar conteúdo real da loja: fotos, banners, contatos, texto institucional e respostas comerciais. Campos não são preenchidos com informações inventadas; valores usados em testes foram retirados.
- Na implantação atrás do proxy do usuário, definir APP_URL externa e validar HTTPS, cabeçalhos, URLs canônicas e acesso às imagens/sitemap. O domínio não é uma dependência para concluir o código local.
- Após a publicação, verificar a propriedade no Google Search Console e enviar o sitemap, mediante acesso à propriedade.

Limites de validação que continuam abertos: mudança da preferência de tema do sistema durante a sessão e diálogo nativo de impressão/PDF. Inspeções anteriores de temas com fixtures e páginas de impressão não substituem essas verificações. As últimas entregas tiveram revisão pelo próprio autor, sem novo parecer independente.

Não são pendências desta entrega: IA, visualização 3D, marketplaces, checkout/pagamento online, integrações bancárias/fiscais e estoque/preço por variação. Permanecem fora do escopo atual.

Validação consolidada concluída: **193 testes aprovados em 60 arquivos**, com PostgreSQL isolado, incluindo todas as últimas alterações. TypeScript, ESLint e verificação de diferenças aprovados. Verificação HTTP confirmou indexação, privacidade, sitemap, páginas de produto, 404 e redirecionamentos 308; contêiner da aplicação saudável. Build Docker da última alteração já havia sido aprovado na etapa anterior. Nenhuma nova funcionalidade ou mudança de dados reais nesta consolidação.

## Loja na raiz e identidade B2T — 02/10/2026

- A home pública agora é `/`. Entradas `/portfolio` e `/catalogo` retornam 308 preservando parâmetros. Links de retorno, busca, coleções, breadcrumbs e sitemap apontam para a raiz; URLs de produto, informações e orçamento e API de consulta foram preservadas. Calculadora permanece autenticada para equipe, sem alteração dos papéis ADMIN/OPERATOR.
- Tailwind CSS 4 com PostCSS e Button shadcn/ui local (MIT). Camadas CSS mantêm estilos administrativos existentes, sem Preflight global. Cabeçalho, abertura institucional, cards e botões públicos usam a nova base; estilos das páginas secundárias recebem tokens e acabamento B2T. Não foi reescrito todo o CSS da gestão.
- Identidade documentada em `docs/identidade/IDENTIDADE-B2T.md` a partir dos dez PNGs fornecidos: paleta oficial, Poppins, uso do logo, mascote, voz, aplicações e decisões digitais. Logo e mascote copiados sem alteração para `public/brand`; Dockerfile inclui esses ativos. Não foram alterados cadastros, contatos, preços, imagens de produtos ou identidade armazenada.
- Home com um h1 editorial, catálogo com h2, cards com imagem navegável e sem carrossel embutido; galeria completa permanece no produto. Busca preserva termo e coleção. Seções comerciais previamente configuradas continuam sendo exibidas.
- Build local e Docker aprovados. Os 121 testes unitários existentes passaram; outros 3 testes novos passaram junto aos testes diretamente afetados (13 casos em 4 arquivos). Integração direcionada: 11 testes em 4 arquivos aprovados com PostgreSQL isolado `b2t_test` na porta 55432, cobrindo catálogo, informações, lista e autenticação. A suíte inteira de integração não foi repetida.
- Verificação HTTP aprovada contra `http://localhost:3100`: home indexável e canônica na raiz, aliases com 308 e filtros preservados, calculadora redirecionada ao login, API privada 401, busca/ordenação sem indexação, sitemap, produtos, 404 e slug antigo 308.
- Inspeção no navegador: home desktop e celular 390px, fotos clicáveis, detalhe, inclusão na lista, preparação da mensagem e remoção do item de teste. Conteúdo móvel com 375px dentro de viewport de 390px, sem overflow horizontal. A troca de viewport demora a refletir no navegador; dimensão real conferida antes de validar. Nenhuma mensagem enviada. Capturas em `test-results/b2t-home`.
- Ambiente de validação atualizado e saudável em `http://localhost:3100`. Não exige migração nova e não houve publicação externa, push ou merge. Conteúdo de produto continua sendo o cadastro de validação existente; fotografias comerciais e contato continuam dependentes de preenchimento pela operação.


## 02/10/2026 — descoberta da loja e painel compacto

- Home com coleções visuais e filtros removíveis. Contexto de busca, coleção, ordenação e página acompanha o produto; retorno recupera a seleção, com canonical limpa. Miniaturas selecionáveis adicionadas sem remover controles anteriores.
- Administração com tema compacto isolado e 80 comandos migrados para Button shadcn, além do menu/perfil. Campos de 36 px confirmados no desktop; 44 px no celular. Menu recolhível, perfil e saída visíveis no celular. Cores cadastradas e regras ADMIN/OPERATOR preservadas.
- 131 testes unitários em 38 arquivos aprovados. Após ajustes finais, 13 testes diretamente afetados em 4 arquivos aprovados novamente. Dez testes de integração de catálogo, autenticação e orçamento aprovados no banco isolado b2t_test. TypeScript, ESLint, build Docker e diff-check aprovados.
- Verificação HTTP aprovada após atualização final: indexação, privacidade, sitemap, produtos, 404 e 308. Ambiente b2t-portfolio-validation saudável em http://localhost:3100; ambiente da porta 3000 não atualizado.
- Inspeção visual em tema escuro: calculadora desktop a 1366 px (conteúdo 1351 px) e celular a 390 px (conteúdo 375 px); sem overflow de página. Listagem, tabela e editor de materiais também conferidos no celular, sem salvar dados. Cálculo de validação com 100 g e 2 h retornou R$ 48,19. Capturas em test-results/compact-admin/desktop.jpg e mobile.jpg.
- Fluxo coleção → busca galeria → menor preço → produto → retorno conferido no navegador, mantendo os filtros. Terceira miniatura selecionada, estado e foto atual confirmados; canonical do produto sem query. Paginação coberta por teste de roundtrip de URL; conjunto visual tem apenas um produto, sem múltiplas páginas.
- Nenhuma migração nova, alteração de cadastro, publicação externa, push ou merge nesta etapa. SDD Lean e aplicação administrativa da identidade registrados em docs/identidade.


## 02/10/2026 — apresentação da lista de orçamento

- Lista com cartões Tailwind, capa atual, opções, quantidade/subtotal, etapas de revisão e resumo destacado. Comandos da lista e contato direto do produto usam Button shadcn. Ajustado fundo transparente de botões ghost na loja, pois não há Preflight global.
- Resposta pública de revisão inclui imageUrl somente para produto ativo. A lista persistida continua sem preço, nome ou foto. Testes confirmam imagem nula para produto retirado, preço atual, bloqueio de indisponibilidade e ausência de criação de registros comerciais.
- Oito testes unitários de orçamento/comercialização e três testes de integração de orçamento aprovados; TypeScript e ESLint aprovados. Build de produção aprovado.
- No navegador: adição de item de validação; revisão inicial de R$ 75,00; alteração para 2 unidades atualizando total para R$ 150,00 e invalidando mensagem anterior; nova preparação com quantidade/total corretos. Nenhuma mensagem enviada. Desktop e celular 390 px conferidos; conteúdo móvel 375 px, sem overflow da página.
- Capturas salvas em test-results/inquiry-design/desktop.jpg e mobile.jpg. Item temporário retirado pela interface; estado vazio confirmado. Ambiente de validação atualizado e saudável em http://localhost:3100. Nenhuma migração nova ou publicação externa nesta etapa.
# Migração completa shadcn — 03/10/2026

- Baseline: 131 unitários, tipos e lint aprovados. Migração: 139 unitários, tipos, lint, diff sem erros de whitespace e build Docker aprovados.
- Integrações: 72/72 aprovadas no runtime Linux da imagem de ferramentas, exclusivamente contra `b2t_test` em localhost:55432. No Windows, 69/72 passaram; três concorrências apresentaram P2028, reproduzido com duas transações SELECT 1 independentes da aplicação. Não houve alteração de domínio para contornar isso.
- Aplicação local de revisão: porta 3100, recriada preservando DATABASE_URL, APP_URL e configuração efetivos. Porta 3000 não foi atualizada.
- Capturas: `test-results/shadcn-completo`; matriz principal com 150 combinações de rota/papel/tema/largura, mais detalhes, editores, estados e impressão. Desktop 1366 px, celular 390 e 320 px, temas claro/escuro. Tabelas usam rolagem interna; geometria da página e erros de JavaScript conferidos.
- Comportamentos verificados: FormData, required, checkbox disabled; Sheet/Escape/foco; Tabs/Accordion por teclado; rascunho/cancelamento, erro de atualização, pendência e repetição financeira; contexto de catálogo, galeria, lista local e impressão.
- Limitações: Sobre/Ajuda sem conteúdo retornam 404 no ambiente; FAQ preenchida conferida em fixture. Revisão independente interrompida por falta de créditos do serviço; fechamento revisado pelo implementador. Sem certificação de acessibilidade, mensagens externas, alteração de dados comerciais, push ou merge.
- Relatório de cobertura, exceções e decisões: [REVISAO-SHADCN.md](identidade/REVISAO-SHADCN.md).

## Upgrade de precificação — linha de base U0 — 05/10/2026

- Trabalho isolado na branch codex/precificacao-avancada, base 3a343d099351364c37bc3923d0ea9bd5106732ee. Nenhuma alteração na instalação operacional.
- Docker inicialmente indisponível; recuperado pelo usuário. PostgreSQL de teste 17 em 127.0.0.1:55432/b2t_test saudável, após recuperação automática normal de inicialização. Alternativa portátil baixada mas não inicializada nem usada.
- Base anterior: 139 testes unitários existentes aprovados; 72 testes de integração em 25 arquivos aprovados com o cliente Prisma V1 e as 12 migrações anteriores. Cobertura existente inclui preços históricos, conversão única, parcelas, recebimentos/estornos, permissões e concorrência; não foram duplicados testes equivalentes.
- Novo motor puro V2: 39 casos novos e os anteriores aprovados, total 178 testes unitários em 43 arquivos. Testes direcionados do motor e compatibilidade V1: 62 aprovados em 5 arquivos. Tipos verificados antes das alterações de persistência. A integração V2 ainda está em andamento.
- Limitação observada na suíte de interface existente: aviso de navegação não implementada no JSDOM, sem teste falhando. A validação real de navegação será feita no navegador na entrega.

## Precificação avançada U0/U1 — validação de 06/10/2026

- Branch isolada `codex/precificacao-avancada`, baseada em `3a343d099351364c37bc3923d0ea9bd5106732ee`; instalação operacional preservada.
- Motor V2 com Decimal de 40 algarismos, limites, FDM/resina, materiais e complementos, taxas, markup, contribuição e preço informado. Fórmula V1 preservada.
- Suíte completa inicial: 196 testes unitários em 48 arquivos e 90 integrações em 32 arquivos aprovados no PostgreSQL local `127.0.0.1:55432/b2t_test`. TypeScript aprovado. Compilação Next.js 16.3.6 de produção aprovada. Aviso de navegação interna do ESLint corrigido com `useRouter`, seguindo a documentação instalada.
- Fluxo integrado: configuração → produto V2 → orçamento emitido → venda única → recebimento parcial (30 de 78, saldo 48). Inativação de material e mudança de tarifas não alteram memórias históricas; reenvios não duplicam parcelas ou movimentos.
- Regressão adicional de exclusão total de itens/custos reproduzida e corrigida: rascunho vazio com remoção explícita pode ser salvo; consumidores antigos sem identidades continuam bloqueados quando há custos associados. Cinco testes de memória comercial aprovados após a correção.
- Navegador Edge isolado via Playwright empacotado: ADMIN em 1366/390 px, calculadora em claro/escuro; produto V2, parâmetros, orçamento, venda e impressão sem overflow horizontal. OPERATOR em ambos os temas/larguras e tentativa de escrever parâmetros retorna 403. Nenhum erro de JavaScript capturado. Capturas com transições desabilitadas evitam registrar cores intermediárias da troca de tema.
- O controle integrado de navegador não iniciou (falha ao gravar arquivos do runtime); validação feita em perfil descartável de Edge, sem usar sessões pessoais. Evidências locais em `test-results/pricing-v2`; JSONs registram geometria, permissões e erros. Nenhuma publicação ou mensagem externa.
- A página de impressão foi conferida sem `snapshotId`, tarifas, custo por peça ou seção de custos privados. Inspeção visual não equivale a certificação formal de acessibilidade.
- Revisão independente final realizada; correções e nova validação descritas abaixo.
- Aceitação complementar no navegador: V1 calculando, V2 anexado ao item mantendo R$ 8,00, falha de rede preservando o rascunho, salvamento posterior e parâmetros ausentes sem valores presumidos. PDF da proposta gerado em ambiente de teste. Labels dos seletores V2 receberam espaçamento explícito após a inspeção visual.
- Gate conjunto após ajustes: 287/287 testes em 80 arquivos aprovados (196 unitários e 91 integrações); build de produção com checagem TypeScript aprovado, ESLint sem avisos/erros e diff sem erros de whitespace.

### Revisão independente e correções

A revisão final, feita por outro agente em modo somente leitura, não encontrou falhas críticas. Três pontos importantes foram reproduzidos por testes e corrigidos:

1. A memória privada agora exibe as premissas originais de máquina, amortização, tempos, tarifas, trabalho, complementos, canal e modalidade, mantendo a precisão das entradas e sem consultar cadastros atuais.
2. A conversão V1 preserva tecnologia, consumo e tempo mesmo quando material/impressora anteriores estão inativos ou sem vínculo. Apenas as referências pendentes precisam ser selecionadas novamente.
3. Erros do cálculo são associados aos campos por `aria-invalid` e `aria-describedby`, incluindo preço com mais de duas casas, limite de consumo por linha e margem mais taxas. Conflitos de referências e limites de cálculo mantêm mensagens identificáveis.

Nove regressões novas cobrem esses pontos; as falhas foram observadas antes das correções. A suíte direcionada passou com 22 testes. A validação unitária completa após os ajustes passou com 205 testes em 49 arquivos; build com TypeScript e ESLint também aprovados. Na primeira repetição integral o Docker estava parado, impedindo conexão com o PostgreSQL; a execução foi interrompida, o Docker recuperado e a suíte de integração repetida no banco exclusivo.

Pendência menor de auditoria: a estimativa conserva os valores resolvidos de todos os parâmetros, mas não o número da versão do conjunto global de tarifas. Os resultados históricos continuam reproduzíveis; o vínculo com essa versão administrativa específica fica para uma melhoria posterior. A revisão não deixou comportamentos sem avaliação e não houve segunda rodada de revisão independente.

### Fechamento da validação

- Após a recuperação do Docker: **205/205 unitários e 91/91 integrações**, total **296 testes em 81 arquivos**, aprovados. Compilação de produção com TypeScript, ESLint e `git diff --check` aprovados.
- A revisão automática de autorização bloqueou iniciar o servidor local de produção na porta 3200, retornando somente `blocked by policy`. Não se contornou esse bloqueio: a inspeção visual complementar usou HTML estático do componente corrigido, com o CSS compilado, sem servidor. Memória expandida conferida em 1366/390 px, claro/escuro, sem overflow. Os fluxos completos de navegador anteriores e os nove testes de regressão cobrem o restante.
- Os arquivos de evidência ficam em `test-results/pricing-v2`; a aplicação operacional não foi atualizada. Branch e checkout isolado permanecem disponíveis para revisão e integração.

### Decisões de execução

1. Referências inativas continuam legíveis no histórico; novas estimativas exigem referências ativas e versões atuais. Consequência: pode ser necessário escolher uma substituta para recalcular.
2. Alterar quantidade ou identidade torna o custo desatualizado; removê-lo permite emitir sem custo, identificado como ausente. Consequência: a cobertura de rentabilidade pode ser incompleta.
3. Com Docker indisponível no início, o motor puro avançou antes do gate de banco U0. A linha de base foi concluída antes da persistência. Consequência potencial: progresso condicionado à recuperação do ambiente.
4. O helper de custo documental passou da tarefa 2 à 7, junto dos testes de seus consumidores. Consequência: mudança apenas da fronteira entre tarefas.
5. PostgreSQL portátil oficial foi baixado como alternativa ao Docker, mas não foi inicializado nem usado; o Docker foi recuperado. A alternativa foi abandonada; seu material temporário permaneceu na pasta ignorada `.superpowers/sdd/2026-10-05-precificacao-avancada`, pois a remoção recursiva foi bloqueada pela revisão automática de autorização (`blocked by policy`). Não há serviço PostgreSQL alternativo.
6. Reutilizou-se a cobertura U0 existente, em vez de duplicar testes equivalentes. Consequência potencial: dependência da abrangência dos testes legados; cenários novos receberam regressões próprias.
7. A aceitação visual da tarefa 5 foi consolidada na tarefa 9; wrappers preservaram os componentes originais. Consequência: problemas visuais seriam identificados no gate final, que foi realizado.
8. Os limites locais existentes de 256 KiB para orçamentos/vendas foram mantidos. Consequência: crescimento futuro de payload exige nova revisão explícita.
9. Edge isolado/Playwright substituiu o controle integrado de navegador que não iniciou. Consequência: particularidades exclusivas do navegador incorporado não foram validadas.
10. A revisão independente foi tratada como um gate separado após a aceitação da tarefa 9, evitando duas revisões equivalentes. Consequência: seus ajustes reabriram testes e foram verificados na única rodada de correções prevista.

## Estoque integrado U2 — validação de 07/10/2026

Implementação em checkout isolado. A primeira suíte completa com as telas passou com 338 testes em 95 arquivos. Depois foram adicionados os testes de aceite integrado, duplicidade de vínculo de material, limites/resíduos de valorização, compra já paga e preservação de imagens/financeiro na migração. A contagem final é registrada abaixo após a execução integral.

O aceite integrado reproduz 1.000 g → reserva de 1.200 g → consumo de 300 g → recebimento de 500 g, com físico 1.200/reservado 900/disponível 300. A conferência gera três parcelas sem caixa; somente a baixa parcial cria movimento financeiro. Cancelamento pago é recusado e cancelar venda libera reservas sem devolver consumo.

Navegador Edge headless em base isolada: ADMIN/OPERATOR, 1.440/390 px, claro/escuro, sem erros de página ou overflow. Cadastro, contagem inicial e recebimento por operador executados pela interface; operador não recebe campos de custo. Evidências em `test-results/stock-u2` (inclui screenshots e `browser.json`). Build Next de produção aprovado. Atualização pontual de `source-map-js` 1.2.1→1.2.2 corrige seu advisory; permanecem cinco avisos encadeados do mesmo problema de `braces` em globbing do ESLint de desenvolvimento, sem versão corrigida publicada. Não foi aplicado downgrade incompatível do Next.

Decisões técnicas: locks de catálogo antes dos itens evitam corrida com alteração de tecnologia; consulta de custo reprocessa fatos atuais; cancelamento conserva entrada e compensação e exclui ambas da valorização ativa; bloqueio conservador de movimentos posteriores exige devolução/ajuste; resoluções financeiras de devolução permanecem em comandos imutáveis. Resíduo de arredondamento é carregado cumulativamente entre alocações, fechando o total arredondado sem reescrever alocações anteriores quando uma nova é anexada.

Produção permanece na versão anterior até backup novo, ensaio restaurável, revisão independente e migração/publicação explicitamente autorizadas nesta conversa.

Validação antes da revisão independente: **344/344 testes em 96 arquivos**, TypeScript e ESLint sem erros, `git diff --check` aprovado e build de produção aprovado. Ensaio em PostgreSQL temporário a partir de backup operacional: restauração + duas migrações aplicadas; conteúdo integral de **36 tabelas preexistentes** comparado por contagem/hash, sem alterações. Produção ainda sem as migrações U2.

### Revisão independente U2 e passagem de correção

Revisor independente gpt-6-astra, modo somente leitura, faixa `6f304b2..c00a56f`. A execução foi interrompida por créditos e retomada pelo mesmo revisor após “Continue”. Nenhum achado crítico; quatro importantes reproduzidos e corrigidos: custo manual inflado ao devolver consumo negativo; crescimento exponencial do cálculo com devoluções; perda de parcelas selecionadas na paginação do vínculo; ajuste positivo ponderado sem custo que não poderia ser conferido depois. O caso de 22 ciclos levava 27,7 segundos antes da correção; a regressão agora passa abaixo do limite de 5 segundos.

O retry após mudança de dia, inicialmente classificado como menor, foi elevado a importante porque a recusa de uma operação já concluída pode induzir reenvio duplicado. A recuperação idempotente agora antecede a validação temporal para recebimentos/reservas/consumos. As cinco correções tiveram teste falhando antes e passando depois. Sem comportamentos descartados pelo revisor e sem nova rodada de revisão; validação final pela suíte. Acrescentados testes de devoluções manuais sucessivas e cancelamento de venda concorrente com reserva/consumo.

Fechamento após correções: **352/352 testes em 96 arquivos**, TypeScript, ESLint e `git diff --check` aprovados. Imagens Docker runtime/tools reconstruídas com as correções. Verificação da imagem no banco restaurado: `/api/health` 200, `/` 200, `/api/stock/items` 401 anônimo, `/estoque` 307 para login. Nenhum achado da revisão ficou pendente.
