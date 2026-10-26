# Revisão administrativa — entrega e verificação

Implementação aplicada em `X:/codex/appb2t`, preservando as alterações anteriores em documentação de instalação/produção e recuperação de administrador. Desenvolvimento realizado no worktree gerenciado `admin-ux`; nenhum envio remoto ou alteração de banco faz parte desta entrega.

## O que mudou

- Campos obrigatórios com indicação textual e semântica nativa; erro associado ao campo nos controles compartilhados e no cadastro principal de produto.
- Campos principais de produto em duas colunas no computador, custo resumido ao lado e fotos/coleções, personalização, detalhes comerciais, SEO e parâmetros técnicos progressivos.
- Resumo de orçamento/venda junto aos itens, preservando salvamento de rascunhos incompletos e regras de confirmação.
- Edição de clientes e configurações em painel lateral mantendo a listagem, filtros e foco de retorno. Alterações não salvas pedem confirmação de descarte.
- Resumos contextuais para ordens, planejamento, execução, recebimentos, movimentações de estoque e operações financeiras.
- Justificativa acompanha datas anteriores, falhas, ajustes e saldo negativo, inclusive conversão de unidades e identificação do material.
- Ações de formulário acessíveis durante a rolagem; nomes específicos para os botões de configurações e operações.
- Históricos e parâmetros adicionais recolhíveis em vendas, orçamentos, solicitações, calculadora e rentabilidade. Prioridades do dashboard antes dos indicadores.
- Tema, tamanho de leitura e composição responsiva compartilhados sem mudar contratos, fórmulas ou permissões.

## Revisão independente

Três achados P2 foram reproduzidos em testes antes da correção: X interno de configurações ignorava confirmação; estado de edição persistia após salvar; justificativa não acompanhava saldo negativo. Os testes passaram após as correções, e a revisão dos fixes não encontrou risco residual concreto.

## Verificação visual

Componentes reais com fixtures locais, sem APIs nem banco, em `tests/admin-preview.html`. Inspecionados produto, financeiro e painéis de clientes/configurações em 1366×768 e 1920×1080, tema claro e escuro. Verificada largura móvel de 390 px e área de 683×384, equivalente à área disponível em 1366×768 a 200%; não houve rolagem horizontal da página. A validação de reflow não substitui uma medição de zoom nativo do navegador.

No produto de teste, os quatro campos principais aparecem juntos na primeira dobra de 1366×768, com Salvar acessível. No financeiro, campos, explicação do efeito e ação cabem juntos em 1920×1080. Não foram medidas porcentagens de redução de rolagem.

Para abrir a prévia: `node tests/admin-preview-server.mjs`, depois `http://127.0.0.1:4174/tests/admin-preview.html`. A prévia serve apenas dados de teste; navegação Next.js é adaptada e não valida persistência em servidor.

## Verificações automáticas

- Build de produção: `node node_modules/next/dist/bin/next build --webpack` — aprovado, incluindo TypeScript e geração das 63 páginas.
- Typecheck separado — aprovado.
- ESLint do projeto — aprovado sem avisos na última execução.
- Testes de interface: 179 aprovados em 57 arquivos, usando `--pool=threads --disableConsoleIntercept`.
- Testes de domínio: 262 aprovados em 61 arquivos, mais os 5 testes de requisição multipart após corrigir sua preparação. Total: 446 assertions aprovadas em execuções por grupo.

Na baseline anterior à implementação, os 431 testes passaram nas assertions, mas `product-request.test.ts` gerou erro assíncrono `ReadableStream is already closed` no runtime Node 24. O erro foi isolado e corrigido somente na preparação do teste: o FormData é codificado antes de criar a requisição; mesmos bytes multipart e ausência de Content-Length, sem mudar a implementação ou o limite de upload. Os cinco testes passaram sem erro assíncrono depois do ajuste.

A execução conjunta dos testes de interface e domínio ainda apresentou recursão no transporte de erros do Vitest, tanto em forks quanto em threads. Os conjuntos completos de interface e domínio foram executados separadamente, sem ignorar erros, e passaram. Portanto, a evidência é de cobertura integral por grupos, não de uma execução única aprovada de `npm run test:unit` neste runtime.

Na preparação da PR em 25/10, os 267 testes de domínio/upload, TypeScript e ESLint passaram novamente. A repetição do grupo completo de interface voltou a encontrar recursão do executor, no worktree e no diretório principal. Os 179 testes de interface aprovados são evidência da execução anterior, não de uma nova execução completa aprovada nesta preparação. Os 60 arquivos de código/testes preparados no worktree foram comparados por hash com o projeto principal e coincidem. A PR explicita essa limitação; não há workflow de CI/publicação automática configurado no repositório.

Uma execução focada de interface passou com 41 testes em 14 arquivos: componentes administrativos compartilhados, produto, clientes, estoque, produção, financeiro e configurações. Comando: `node node_modules/vitest/vitest.mjs run tests/unit/admin- tests/unit/product-form.test.tsx tests/unit/customers-ui.test.tsx tests/unit/stock-ui.test.tsx tests/unit/production-ui.test.tsx tests/unit/finance-ui.test.tsx tests/unit/settings-ui.test.tsx --pool=threads --reporter=verbose --disableConsoleIntercept`.

Integrações de banco não foram executadas: a configuração exige o banco dedicado `localhost:55432/b2t_test` e limpa tabelas; os contêineres locais em uso pertencem à aplicação.

## Aplicação local

Depois da autorização para concluir o necessário, a imagem local foi reconstruída com `docker compose up -d --no-deps --build app`. Build Turbopack e inicialização aprovados. O banco existente continuou em execução. Como ele ainda estava somente na rede antiga `appb2t_backend`, foi conectado também à rede atual `appb2t_network` com alias `db`, preservando o contêiner e seus dados. `GET http://127.0.0.1:3000/api/health` respondeu HTTP 200 com `{"status":"ok"}` após a atualização.
