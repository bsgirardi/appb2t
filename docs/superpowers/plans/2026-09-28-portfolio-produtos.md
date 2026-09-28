# Portfólio e produtos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Publicar um catálogo de produtos ativos e permitir à equipe autenticada gerenciar fotos, apresentação e preços derivados da calculadora existente.

**Architecture:** Adicionar Product e ProductImage ao PostgreSQL, com serviço de domínio que valida e calcula no servidor. Separar projeções públicas de dados administrativos e reutilizar sessão, validações e fórmula existentes. Salvar foto e produto na mesma transação; manter um snapshot dos parâmetros por produto.

**Tech Stack:** Next.js 16 instalado, React, TypeScript, Prisma 6, PostgreSQL, Zod, decimal.js, sharp para normalização de imagens e Vitest.

**Spec:** `docs/superpowers/specs/2026-09-28-portfolio-produtos-design.md` (aprovada pelo usuário).

## Global Constraints

- Usuários ativos autenticados, tanto ADMIN quanto OPERATOR, podem cadastrar, editar, inativar e reativar produtos da equipe.
- Alterações nas configurações gerais não modificam automaticamente os preços publicados.
- Não haverá checkout, cobrança, pedido ou cadastro público de usuários nesta entrega.
- JPEG, PNG e WebP até 5 MiB; dimensão máxima da imagem normalizada de 1600 pixels; rejeitar SVG.
- O preço público corresponde ao resultado `sale`, formatado em BRL com duas casas decimais.
- Não existe exclusão definitiva de produto na API.
- Consultar os guias instalados em `node_modules/next/dist/docs/` antes de escrever código Next.js, conforme AGENTS.md.
- Custos, margens e parâmetros não podem entrar nas respostas públicas.
- Preservar a rota inicial, a calculadora e as permissões das configurações globais.

## Review Focus

- Foto aparentemente pequena com dimensões enormes: limitar pixels decodificados e rejeitar antes da alocação excessiva (tarefa 2).
- Atualização concorrente de foto e texto: conflito preserva ambos os dados anteriores, sem substituição parcial (tarefa 3).
- Impressora/material inativado depois do cadastro: editar mantém snapshot; carregar parâmetros atuais exige nova seleção (tarefa 5).
- Preço válido no motor acima da capacidade do banco: erro de validação antes da persistência (tarefa 1).
- Inativação com visitante já usando o catálogo: nova consulta de catálogo/foto deve refletir estado atual, sem cache estático (tarefa 4).

## Estrutura dos arquivos

Domínio em `src/domain/products/{types,validation}.ts`; persistência em `src/server/products.ts`; processamento de imagens em `src/server/product-images.ts`; leitura multipart em `src/lib/product-request.ts`. Componentes públicos em `src/components/products/product-catalog.tsx`; componentes privados em `product-panel.tsx`, `product-form.tsx` e `product-calculation-fields.tsx` no mesmo diretório. Novas rotas seguem o padrão de `endpoint`, `ok` e `requireActor`.

### Tarefa 1: Contratos e validação do produto

**Arquivos:** criar `src/domain/products/types.ts`, `src/domain/products/validation.ts`, `tests/unit/products.test.ts`; reutilizar `src/domain/calculation/{types,validation,calculate}.ts`.

**Interfaces:** `ProductInput` contém name, description, paymentTerms, active, calculation: CalculationInput, materialId e printerId opcionais. Atualização acrescenta expectedVersion positivo. `PublicProductDTO` contém somente id, name, description, paymentTerms, price e imageUrl; `ProductDTO` acrescenta active, version, calculation e referências. `validateProduct(input: unknown): ProductInput`; `productPrice(calculation: CalculationInput): string` retorna decimal com duas casas.

- [x] Escrever testes para campos obrigatórios, limites de texto (nome 120, descrição 5000, pagamento 1000), chaves desconhecidas, vírgula decimal, horas/minutos e parâmetros inválidos; usar o exemplo de cálculo da especificação original: `expect(productPrice(example)).toBe("48.19")`. Verificar que campo `price` enviado pelo cliente é rejeitado e que resultado acima de `9999999999999999.99` é inválido.
- [x] Executar `npx vitest run tests/unit/products.test.ts`; confirmar falha por módulos ainda ausentes.
- [x] Implementar contratos, composição com `calculationSchema` e preço via `calculate`, usando Decimal ROUND_HALF_UP. Validar referências opcionais e limites; não duplicar a fórmula.
- [x] Reexecutar o teste e confirmar aprovação.
- [x] Commit dos arquivos dessa tarefa: `feat: definir dominio de produtos`.

### Tarefa 2: Recebimento e normalização de foto

**Arquivos:** criar `src/server/product-images.ts`, `src/lib/product-request.ts`, `tests/unit/product-images.test.ts`, `tests/unit/product-request.test.ts`; alterar `package.json` e lockfile para declarar sharp diretamente.

**Interfaces:** `NormalizedImage = { bytes: Uint8Array; mimeType: "image/webp" }`; `normalizeProductImage(bytes: Uint8Array): Promise<NormalizedImage>`; `readProductRequest(request: Request): Promise<{ input: unknown; image?: NormalizedImage }>`.

- [x] Escrever testes com imagens pequenas geradas em memória: JPEG/PNG/WebP aceitos; texto disfarçado, SVG, imagem corrompida e arquivo acima de 5 MiB recusados. Verificar saída WebP e dimensões até 1600; imagem acima de 40 milhões de pixels recusada. Testar origem inválida, corpo multipart sem Content-Length acima do limite, JSON malformado no campo `data` e campos multipart inesperados.
- [x] Executar os dois arquivos de teste; confirmar falhas esperadas antes da implementação.
- [x] Declarar sharp e implementar inspeção do formato, limite de entrada de 40 milhões de pixels, rotação por orientação e resize sem ampliação. Remover metadados pela regravação WebP. O limite de 5 MiB vale antes de decodificar.
- [x] Implementar leitura multipart com limite efetivo de 6 MiB durante leitura do stream, verificação de origem equivalente a `jsonBody`, um campo `data` com JSON até 16 KiB e no máximo um campo `photo`. Preservar o limite existente de JSON para todas as demais rotas.
- [x] Reexecutar os testes; confirmar aprovação e commit: `feat: validar fotos de produtos`.

### Tarefa 3: Persistência, cálculo autoritativo e concorrência

**Arquivos:** alterar `prisma/schema.prisma`, `tests/integration/setup.ts`; criar `prisma/migrations/202609280002_products/migration.sql`, `src/server/products.ts`, `tests/integration/products.test.ts`.

**Interfaces:** `createProduct(actor: Actor, input: unknown, image: NormalizedImage): Promise<ProductDTO>`; `updateProduct(actor: Actor, id: string, input: unknown, image?: NormalizedImage): Promise<ProductDTO>`; `setProductActive(actor: Actor, id: string, active: boolean, expectedVersion: number): Promise<ProductDTO>`; `listProducts(actor: Actor): Promise<ProductDTO[]>`; `getProduct(actor: Actor, id: string): Promise<ProductDTO>`; `listPublicProducts(): Promise<PublicProductDTO[]>`; `getProductImage(id: string, actor: Actor | null): Promise<NormalizedImage>`. Actor é obtido pela guarda na fronteira HTTP/página, nunca pelo corpo da requisição.

- [x] Escrever testes de criação/edição por ambos os perfis; preço 48.19 calculado; snapshot imune a mudanças globais; edição com referências inativas; projeção pública sem calculation, active ou version; inativar/reativar; acesso à foto inativa sem actor rejeitado. Duas atualizações na mesma versão devem produzir um sucesso e um conflito; uma atualização perdedora com foto não altera os bytes da vencedora.
- [x] Executar `npx vitest run tests/integration/products.test.ts`; confirmar falha pela ausência do serviço/modelo, usando exclusivamente banco local `b2t_test`.
- [x] Adicionar Product com calculation Json, price Decimal(18,2), versão, estado, timestamps e referências opcionais a Material/Printer com SetNull. Adicionar ProductImage com productId único, bytes Bytes e mimeType. Incluir ambas as tabelas na limpeza do banco de testes. Gerar cliente e aplicar migração apenas ao banco de testes identificado.
- [x] Implementar serviço com validação da tarefa 1 e transações para produto/foto. Validar referências fornecidas e compatibilidade de tecnologia; referências inativas já salvas não impedem edição do snapshot. Usar versão em updateMany e erro CONFLICT, sem apagar definitivamente registros. Selecionar campos públicos explicitamente e nunca buscar bytes para listagens.
- [x] Executar testes de produtos e configurações; confirmar aprovação e commit: `feat: persistir produtos e precos calculados`.

### Tarefa 4: Rotas protegidas e catálogo público

**Arquivos:** criar `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts`, `src/app/api/products/[id]/image/route.ts`, `src/app/portfolio/page.tsx`, `src/app/portfolio/error.tsx`, `src/app/portfolio/loading.tsx`, `src/components/products/product-catalog.tsx`, `tests/unit/product-routes.test.ts`, `tests/unit/product-catalog.test.tsx`; alterar `src/app/globals.css`.

**Interfaces:** GET/POST `/api/products` listam/criam com sessão; GET/PUT `/api/products/[id]` leem/alteram com sessão; PATCH recebe estritamente `{ active: boolean, expectedVersion: number }`. GET de imagem é público somente para produto ativo; inativo exige sessão. POST/PUT usam multipart da tarefa 2. `/portfolio` chama `listPublicProducts` no servidor, sem passar registros privados a componentes clientes.

- [x] Testar todas as operações privadas sem sessão (401), com ambos os perfis, sessão revogada e origem inválida. Testar imagem inativa anônima como 404 e autenticada como 200; tipo de conteúdo WebP, `Cache-Control: no-store` e `X-Content-Type-Options: nosniff`. Testar ausência de DELETE definitivo (405). Renderizar catálogo com preço, pagamento e estado vazio; garantir que markup recebido na descrição seja escapado.
- [x] Executar os testes novos e confirmar falhas esperadas.
- [x] Ler guias locais Next.js de páginas, Route Handlers, cookies e convenções de erro. Implementar rotas usando `endpoint`, guardas e serviços anteriores; usar params assíncronos. Marcar catálogo dinâmico e servir imagens sem cache; consultar sessão opcional sem exigir login no acesso público ativo.
- [x] Implementar grade responsiva, marca B2T e link à área interna, texto alternativo e estados de carregamento/erro/vazio. Preservar a rota `/`.
- [x] Executar testes novos, `npm run typecheck` e `npm run lint`; confirmar aprovação e commit: `feat: publicar portfolio com acesso protegido aos produtos`.

### Tarefa 5: Painel de produtos e calculadora editável

**Arquivos:** criar `src/app/(private)/produtos/page.tsx`, `src/components/products/product-panel.tsx`, `src/components/products/product-form.tsx`, `src/components/products/product-calculation-fields.tsx`, `src/lib/product-client.ts`, `tests/unit/product-form.test.tsx`, `tests/unit/product-panel.test.tsx`; alterar `src/components/shell/app-shell.tsx`, `src/app/globals.css`.

**Interfaces:** `ProductPanel({ products, data, role }: { products: ProductDTO[]; data: CalculatorData; role: "ADMIN" | "OPERATOR" })`; `ProductForm({ product?, data, role, onSaved, onCancel })` com onSaved(ProductDTO) e onCancel(): void; `ProductCalculationFields({ value, onChange })` recebe CalculationInput; `saveProductRequest(id: string | undefined, input: unknown, photo?: File): Promise<ProductDTO>` envia FormData preservando o contrato de ApiError.

- [x] Escrever testes para seleção compatível de material/impressora, preenchimento de todos os parâmetros, edição de cada grupo e prévia de preço. Testar carregamento dos atuais só no rascunho, preservação do snapshot quando referência inativada, rascunho preservado em erro/conflito e impedir envio duplicado. Verificar fluxo inativar/reativar com versão atual. Testar prévia e substituição de foto, e ausência de configurações com orientações por perfil.
- [x] Executar os dois arquivos de testes e confirmar falhas esperadas.
- [x] Implementar página protegida com guarda própria antes das consultas e carregamento de produtos/configurações. Implementar listagem, estado ativo/inativo e formulário com campos de apresentação, upload e todos os campos de CalculationInput. Reutilizar Field, Notice, CostBreakdown e calculate.
- [x] Implementar carregar configurações atuais: obter CalculatorData atualizado e copiar valores somente após validar seleções; preservar snapshot e informar necessidade de seleção quando referências estiverem inativas. Publicar somente ao salvar com sucesso. Revogar URLs de prévia criadas com URL.createObjectURL ao substituir/desmontar.
- [x] Implementar cliente multipart sem sobrescrever Content-Type, refletir mensagens/erros do servidor e atualizar listagem após sucesso. Adicionar Produtos para ADMIN/OPERATOR e link ao Portfólio no AppShell, com título correto no cabeçalho.
- [x] Executar testes novos e testes existentes de calculadora/configurações; confirmar aprovação e commit: `feat: gerenciar produtos com calculadora completa`.

### Tarefa 6: Verificação integrada e documentação operacional

**Arquivos:** alterar `README.md`, `docs/VALIDACAO.md`; ajustes corretivos nos arquivos anteriores somente se verificação os justificar.

**Interfaces:** fluxo real navegador → rotas → serviço → PostgreSQL, sem serviços externos adicionais para fotos.

- [x] Executar `npm run test:unit`, `npm run test:integration` usando banco local `b2t_test`, `npm run typecheck`, `npm run lint` e `npm run build`; registrar resultados reais. Seguir os comandos de banco do projeto sem imprimir segredos ou executar limpeza no banco de uso real.
- [ ] Verificar no navegador em 1440px e 390px: visitante abre catálogo; operador cria produto com foto e preço; administrador edita; inativação oculta; reativação restaura; formulário preserva edição em falha. Verificar navegação por teclado, rótulos, quebra de texto e ausência de rolagem horizontal.
- [ ] Verificar build Docker e disponibilidade de sharp no runtime quando Docker estiver disponível. Confirmar persistência de produto/foto após reinício no ambiente de teste. Se uma verificação não puder ser feita, documentar a limitação em vez de afirmar sucesso.
- [x] Documentar rotas, permissões, formatos/limites de foto, aplicação da migração e backup PostgreSQL incluindo fotos. Explicar atualização explícita de parâmetros e que pagamento é apenas informativo.
- [x] Revisar diff completo contra a especificação e rodar `git diff --check`. Corrigir falhas materiais, repetir somente verificações afetadas e registrar o resultado em `docs/VALIDACAO.md`.
- [x] Commit: `docs: registrar uso e validacao do portfolio`; informar ao usuário entregas, resultados e limitações concretas.

## Revisão do plano

Cobertura conferida: catálogo público (4), painel (5), permissões (3–4), cálculo e snapshot (1, 3, 5), fotos e atomicidade (2–3), concorrência (3), navegação e estados (4–5), operação e aceitação (6). Os cinco pontos de Review Focus têm testes nas tarefas indicadas. Plano aprovado e executado diretamente nesta conversa. Verificações de navegador, contêiner e reinício permanecem pendentes por limitações documentadas em docs/VALIDACAO.md.
