# Catálogo e aparência — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar galeria, preço final independente, coleções, identidade configurável e temas claro/escuro legíveis.

**Architecture:** Evoluir os serviços e formulários existentes, preservando Product.price e migrando imagens para relação um-para-muitos. Coleções e aparência terão serviços próprios; tokens CSS e um componente de marca compartilhado aplicarão identidade e tema às telas atuais.

**Tech Stack:** Next.js instalado, React, TypeScript, Prisma/PostgreSQL, Zod, decimal.js, sharp, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-catalogo-aparencia-design.md` e regras de `2026-09-29-gestao-interna-index.md`, no mesmo diretório.

**Execução:** direta nesta conversa, conforme escolha já aprovada. Este plano aguarda revisão escrita; não muda essa escolha.

## Global Constraints

- `Product.price` passa a representar o preço final informado pelo usuário autenticado.
- Ao atualizar a instalação, os preços já publicados permanecem intactos no mesmo campo.
- Cada produto suporta de 1 a 10 fotos.
- JPEG, PNG e WebP estático, até 5 MiB e 40 milhões de pixels por foto, normalizados no servidor para WebP com até 1600 pixels por dimensão.
- O limite total de requisição multipart de produto passa a 52 MiB; o campo JSON mantém limite explícito de 16 KiB.
- Logo aceita JPEG, PNG ou WebP estático, até 2 MiB e 16 milhões de pixels, normalizado até 1024 pixels por dimensão com transparência preservada.
- ADMIN e OPERATOR gerenciam produtos e coleções; aparência exige ADMIN.
- Modo automático segue `prefers-color-scheme` em todas as páginas, incluindo login e catálogo.
- Texto de uso corrente tem pelo menos 14 px; rótulos auxiliares pelo menos 12 px.
- Validar contraste mínimo de 4,5:1 para texto normal. Não publicar custo, margem ou sugestão.
- Consultar os guias instalados em `node_modules/next/dist/docs/` antes de alterar código Next.js.

## Review Focus

- Recarregar custos depois de negociar preço: o preço final não muda (tarefa 1).
- Reutilizar identificador de foto de outro produto: servidor recusa sem modificar nenhuma imagem (tarefa 2).
- Salvar associações simultaneamente pelos painéis de produto e coleção: detectar versão antiga (tarefa 3).
- Marca com cores extremas e logo transparente: manter contraste e canal alfa nos dois temas (tarefa 4).
- Primeira renderização e alteração do tema do sistema: sem flash claro nem textos invisíveis (tarefa 5).

## Arquivos e contratos compartilhados

Preservar `src/domain/calculation` como única fórmula. Evoluir `src/domain/products/{types,validation}.ts`, `src/server/products.ts`, `src/lib/{product-request,product-client}.ts` e componentes em `src/components/products`. Criar domínios/serviços de coleções e aparência. Isolar a marca em `src/components/shell/brand.tsx`, retirando sua implementação de `app-shell.tsx` para reaproveitar no catálogo, login e impressão futura.

### Tarefa 1: Separar preço final da sugestão

**Arquivos:** alterar os arquivos de domínio/serviço de produtos, `product-form.tsx`, `cost-breakdown.tsx`, `tests/fixtures/product.ts`, `tests/unit/{products,product-form}.test.*`, `tests/integration/{products,product-http}.test.ts`.

**Interfaces:** ProductInput ganha `price: string`. Renomear `productPrice(calculation)` para `suggestedProductPrice(calculation: CalculationInput): string`. ProductDTO mantém price como preço final; sugestão é derivada dos parâmetros privados. Criar `parseFinalPrice(raw: string): string`, positivo, até duas casas, máximo `9999999999999999.99`.

- [ ] Testar preço final `"75,00"` normalizado para `"75.00"` com sugestão `"48.19"`; salvar novos custos preserva `"75.00"`. Testar `0`, negativos, três casas e overflow recusados. Substituir o teste antigo que rejeitava o campo price, pois a regra mudou explicitamente.
- [ ] Executar `npx vitest run tests/unit/products.test.ts tests/unit/product-form.test.tsx tests/integration/products.test.ts tests/integration/product-http.test.ts`; observar falhas pela política antiga, usando somente o banco isolado `b2t_test`.
- [ ] Implementar validação e persistência independentes, sem migração de preço. No formulário, adicionar preço final obrigatório, aviso quando abaixo do custo e “Usar preço sugerido” que altera apenas o rascunho. Atualizar mensagens de refresh para distinguir sugestão de publicação.
- [ ] Testar `expect(saved.price).toBe("75.00")` após recarregar custos; clicar em “Usar preço sugerido” muda o campo, mas não chama fetch de gravação. Reexecutar os testes e confirmar aprovação.
- [ ] Commit: `feat: separar preco final da sugestao de custos`.

### Tarefa 2: Galeria atômica e carrossel acessível

**Arquivos:** alterar `prisma/schema.prisma`, `src/server/{products,product-images}.ts`, `src/lib/{product-request,product-client}.ts`, rotas atuais de produtos, `src/domain/products/types.ts`, `product-form.tsx`, `product-catalog.tsx`; criar migração `202609290001_product_gallery`, `src/components/products/{product-gallery-editor,product-carousel}.tsx`, `src/app/api/products/[id]/images/[imageId]/route.ts`, `tests/integration/product-gallery.test.ts`, `tests/unit/{product-gallery,product-carousel}.test.tsx`; ampliar testes de multipart/imagem existentes.

**Interfaces:** `ProductImageDTO = { id: string; url: string; position: number }`; DTO público ganha `images: ProductImageDTO[]`, conservando imageUrl como capa. `ImageSelection = { id: string } | { uploadKey: string }`; ProductInput inclui `images: ImageSelection[]`. `readProductRequest(request)` retorna `{ input: unknown; uploads: Record<string, NormalizedImage> }`; multipart usa campo data e arquivos `photo:<uploadKey>`. `createProduct(actor, input, uploads)` e `updateProduct(actor, id, input, uploads)` recebem esse mapa. Exportar `normalizeImage(bytes, limits: { maxBytes: number; maxPixels: number; maxDimension: number }): Promise<NormalizedImage>` e manter wrapper `normalizeProductImage` com limites atuais.

- [ ] Testar migração de um registro antigo: quantidade de fotos continua 1, bytes idênticos, preço idêntico e posição 0. Testar 1/10 fotos aceitas, 0/11 recusadas, chave repetida, upload sem referência, imagem alheia, ordem inválida, remoção da última, arquivo corrompido e stream acima de 52 MiB sem Content-Length.
- [ ] Executar `npx vitest run tests/integration/product-gallery.test.ts tests/unit/product-request.test.ts tests/unit/product-gallery.test.tsx tests/unit/product-carousel.test.tsx`; confirmar falhas esperadas.
- [ ] Migrar ProductImage: novo id, productId não único, position e índice único `(productId, position)`. Para evitar colisões temporárias de ordem, atribuir posições transitórias dentro da transação antes das posições finais. Produto/fotos/lista de ordem compartilham expectedVersion e transação; validar todos os ids e uploads antes de remover qualquer foto.
- [ ] Implementar editor com miniaturas, remoção e botões mover antes/depois; revogar URLs de preview. Implementar carrossel manual com botões, indicadores, teclado e gesto horizontal, respeitando movimento reduzido. Uma única foto não mostra controles. A rota antiga retorna a capa; a rota nova verifica produto, foto e visibilidade. Processar imagens sequencialmente para limitar pico de memória.
- [ ] Testar `expect(await imageCount(product.id)).toBe(2)` e ordem/capa após salvar; conflito com nova foto deixa bytes antigos. Em UI, verificar que dois cliques em Próxima mudam posição sem salvar e que teclado/toque não acionam navegação global. Reexecutar testes; atualizar testes anteriores para o novo contrato e confirmar aprovação.
- [ ] Commit: `feat: adicionar galeria e carrossel de produtos`.

### Tarefa 3: Coleções e associações concorrentes

**Arquivos:** criar `src/domain/collections/{types,validation}.ts`, `src/server/{collections,catalog-memberships}.ts`, `src/components/collections/{collection-panel,collection-form}.tsx`, `src/app/(private)/colecoes/page.tsx`, `src/app/api/collections/route.ts`, `src/app/api/collections/[id]/route.ts`, `src/app/api/collections/[id]/image/route.ts`, `tests/integration/collections.test.ts`, `tests/unit/collections-ui.test.tsx`; alterar produto, catálogo, navegação, esquema e criar migração `202609290002_collections`.

**Interfaces:** CollectionInput `{ name, description, active, position, productIds: string[], removeImage?: boolean, expectedVersion?: number }`, com versão obrigatória na atualização; CollectionDTO acrescenta id, version, imageUrl opcional. ProductInput ganha `collectionIds: string[]`. `saveCollection(actor: Actor, id: string | undefined, input: unknown, image?: NormalizedImage): Promise<CollectionDTO>`; `listCollections(actor): Promise<CollectionDTO[]>`; `listPublicCollections(): Promise<PublicCollectionDTO[]>`; `listPublicProducts(collectionId?: string): Promise<PublicProductDTO[]>`. PublicCollectionDTO contém apenas id, name, description, imageUrl. Controle de associação usa um advisory lock transacional de equipe, `hashtext('b2t:catalog-memberships')`, adquirido antes de verificar versões/associações.

- [ ] Testar produto em duas coleções, “Todos” incluindo produto sem coleção, coleção inativa omitida, produto inativo omitido, coleção ativa vazia e capa fallback sem produto privado. Testar duas gravações pelos editores diferentes e exigir um conflito em vez de perda silenciosa.
- [ ] Executar `npx vitest run tests/integration/collections.test.ts tests/unit/collections-ui.test.tsx`; observar falha inicial.
- [ ] Criar Collection, CollectionProduct com par único e CollectionImage. Nas mudanças de associação, serializar leitura/escrita com o lock acima, conferir a versão da entidade editada, incrementar versões dos produtos/coleções cuja associação mudou. Isso invalida rascunhos abertos no outro editor sem exigir mapas de versões no cliente. Não incrementar entidades cujas associações não mudaram.
- [ ] Implementar CRUD/inativação e seleção em ambos os formulários; capa opcional com normalizador da tarefa 2; JSON de coleções até 128 KiB e até 1000 productIds por gravação, explicitando o limite na interface. Produto continua com JSON até 16 KiB. Usar `/portfolio?colecao=<id>` com parâmetro validado, links estáveis, fallback de capa e estado vazio.
- [ ] Verificar `expect(allProducts).toHaveLength(3)` e coleção filtrada com apenas seus ativos; imagem de coleção inativa exige sessão. Reexecutar os testes, os de produtos e typecheck.
- [ ] Commit: `feat: organizar produtos em colecoes`.

### Tarefa 4: Identidade visual administrável

**Arquivos:** criar `src/domain/appearance/{types,validation,colors}.ts`, `src/server/appearance.ts`, `src/components/settings/appearance-panel.tsx`, `src/components/shell/brand.tsx`, `src/app/(private)/configuracoes/aparencia/page.tsx`, `src/app/api/appearance/route.ts`, `src/app/api/appearance/logo/route.ts`, `tests/unit/appearance.test.ts`, `tests/integration/appearance.test.ts`, `tests/unit/appearance-ui.test.tsx`; alterar shell/login/catálogo/layout, esquema e criar migração `202609290003_appearance`.

**Interfaces:** `CompanyIdentityDTO = { name, shortName, slogan, email, phone, address, footer, logoUrl: string | null }`; `PublicAppearanceDTO = CompanyIdentityDTO & { lightPrimary, lightAccent, darkPrimary, darkAccent }`; `AppearanceDTO = PublicAppearanceDTO & { version: number }`. `getPublicAppearance(): Promise<PublicAppearanceDTO>` entrega somente apresentação, sem versão/autoria. `getAppearance(actor: Actor): Promise<AppearanceDTO>` exige ADMIN e inclui versão para edição. `saveAppearance(actor: Actor, input: unknown, logo?: NormalizedImage): Promise<AppearanceDTO>` exige ADMIN no serviço; input inclui expectedVersion e removeLogo. `contrastRatio(a: string,b: string): number`; `readableText(background: string): '#ffffff' | '#111827'` recusa fundo quando nenhum atende 4,5:1.

- [ ] Testar valores B2T sem registro, salvamento por ADMIN, recusa de OPERATOR/visitante, conflito, hex inválido, injeção CSS/HTML escapada, logo transparente preservado, SVG/animado rejeitados. `expect(contrastRatio('#000000','#ffffff')).toBeCloseTo(21)`; validar também cores extremas e contraste de texto escolhido.
- [ ] Executar `npx vitest run tests/unit/appearance.test.ts tests/integration/appearance.test.ts tests/unit/appearance-ui.test.tsx`; observar falhas.
- [ ] Criar registro único CompanyAppearance e logo separado. Aplicar limites da especificação para cada texto/arquivo, salvar atomicamente com versão e distinguir remover de preservar logo. Rota GET pública seleciona somente apresentação; mutações usam requireAdmin e assertAdmin.
- [ ] Implementar prévia local e salvamento explícito. Extração Brand recebe identidade, sem buscar dados dentro de componente cliente. Carregar identidade no servidor e aplicá-la no login, shell, catálogo, rodapés e metadata. Contatos vazios não geram links vazios. Não carregar bytes do logo nas listagens.
- [ ] Reexecutar testes e confirmar que mudanças de rascunho não chegam ao DTO público até salvar. Testar logo transparente em fundo claro/escuro.
- [ ] Commit: `feat: configurar identidade visual da empresa`.

### Tarefa 5: Revisão visual e tema automático

**Arquivos:** alterar `src/app/globals.css`, layout, shell e componentes de calculadora/settings/produtos/coleções/aparência; criar `src/app/theme.css`, `tests/unit/theme.test.tsx`; atualizar testes de componentes afetados.

**Interfaces:** tokens `--bg`, `--paper`, `--ink`, `--muted`, `--line`, `--brand`, `--on-brand`, `--success`, `--warning`, `--danger`, com variantes claro/escuro em CSS. Cores de identidade entram como variáveis hex validadas; `prefers-color-scheme` e `color-scheme` controlam a renderização desde o primeiro paint, sem estado JavaScript duplicando a preferência.

- [ ] Definir verificação visual que falha na versão atual: composição de custo com texto de 9–10 px e contraste insuficiente. Testar renderização de rótulos, valores, avisos e foco com props de aparência; não criar teste que apenas procura texto no arquivo CSS.
- [ ] Inspecionar no navegador a calculadora, produto e configurações nos dois temas antes da mudança; registrar fontes/contrastes observados. Usar emulação de preferência do navegador quando disponível, sem alterar a configuração global do computador.
- [ ] Implementar tokens e substituir cores fixas conflitantes; atender 14 px para texto corrente e 12 px para auxiliares. Ajustar tabelas, campos, estados, navegação e composição de custos, incluindo marcadores auxiliares. Tema acompanha mudança do sistema sem salvar preferência por usuário.
- [ ] Verificar 1440px/390px, temas claro/escuro e primeiro carregamento; contraste de textos normais ≥4,5:1, foco visível, menus acessíveis e ausência de overflow inesperado. Executar `npm run test:unit`, typecheck e lint. Se emulação não estiver disponível, documentar o limite e validar a variante CSS em teste isolado, sem afirmar verificação manual inexistente.
- [ ] Commit: `style: melhorar legibilidade e aplicar tema automatico`.

### Tarefa 6: Migração e validação integrada

**Arquivos:** atualizar `README.md`, `docs/VALIDACAO.md`, fixtures/setup de testes e este plano.

- [ ] Executar migrações em banco descartável contendo produto da versão anterior; comparar preço, snapshot e bytes antes/depois. Não usar banco real para testes destrutivos.
- [ ] Executar suíte completa `npm test` com `b2t_test`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`. Resultado esperado: todos aprovados; testes antigos ajustados somente onde o requisito mudou.
- [ ] Validar no Docker isolado: upload de dez fotos, ordenar/capa, coleção, personalização, troca de custos sem alteração de preço final, sessão de operador e visitante. Reiniciar serviços e conferir persistência. Registrar capturas relevantes e limitações concretas.
- [ ] Revisar o diff completo por revisor independente, como exigido pela execução direta; corrigir problemas materiais com regressão que falha antes da correção e passa depois.
- [ ] Atualizar README sobre preço final, limites de mídia/proxy, coleções, marca, tema e migração. Registrar evidências e commit `docs: validar catalogo e aparencia`.

## Revisão do plano

Cobertura: preço (1), galerias/migração (2), coleções/concorrência (3), identidade/permissões (4), legibilidade/tema (5), operação (6). Contratos de mídia e preço usados pelas tarefas posteriores estão definidos acima. Rotas públicas continuam restritas a apresentação. Próxima entrega consome Product.price e CompanyIdentityDTO, sem depender de componentes visuais.
