# Proteção de Voltar/Avançar

**Objetivo:** proteger o formulário comercial em travessias internas mesmo sem Navigation API cancelável.
**Base:** origin/main 1.19.0; trabalho isolado na branch codex/protecao-historico.
**Decisão:** coordenador único iniciado no layout raiz acompanha posições por metadados próprios em history.state. Preserva propriedades do Next e parâmetros da URL. Não cria entradas sentinelas, não substitui rotas e não grava dados do formulário no histórico.

- [x] Escrever testes para Voltar/Avançar sem Navigation API, saltos, confirmação, limpeza após salvar, substituição de estado e ouvintes.
- [x] Implementar coordenador com captura de popstate antes do Next. Recusa restaura a posição via history.go; aceitação libera o evento original. Navigation API cancelável continua como caminho antecipado, sem confirmação duplicada.
- [x] Integrar layout e hook compartilhado de Orçamentos/Vendas, preservando bloqueio de fechamento e links.
- [x] Verificar em navegador real com navegação SPA e formulário real, testes comerciais, tipos e lint; revisão independente.
- [x] Atualizar versão PATCH e notas em português após comparar main. Entregar sem merge/publicação.

**Revisão:** saltos de mais de uma posição, repetição durante restauração, entradas de outro documento, hashes, Strict Mode, estado interno do Next, formulários limpos e salvos. Saídas para outro documento continuam usando a confirmação nativa de beforeunload.


## Resultado

- Versão 1.19.1, comparada com origin/main 1.19.0 antes da entrega. Manifestos e notas sincronizados; APP_VERSION segue a única fonte em package.json.
- 42 testes passaram em 13 arquivos, incluindo os 11 novos testes do coordenador. Cobrem Back/Forward real do History do JSDOM, aceitação/recusa, saltos, chamadas repetidas durante retorno, marcador após recarga, Navigation API cancelável/não cancelável, ausência de confirmação duplicada, hashes, metadados do Next e erro ao gravar histórico. Teste de formulário confirma limpeza após salvar e proteção de novas alterações.
- TypeScript, ESLint dos arquivos alterados, compilação de produção do Next 16.4.2 e git diff --check passaram.
- Prévia local tests/history-preview.html usa os formulários reais e desativa Navigation API somente no teste. No navegador real, recusar Voltar e um salto de duas páginas manteve frete=12, URL com search=Ana&page=2 e hash da referência. Essa prévia simula o roteador; não conecta API/banco nem substitui teste autenticado no Next.
- A automação do navegador ficou bloqueada ao interagir com uma confirmação síncrona de Cancelar, então Avançar no navegador e o fluxo autenticado completo continuam para homologação durante o uso; Avançar foi verificado automaticamente com history.forward real no JSDOM. Nenhum banco ou ambiente operacional foi alterado.
- Revisão independente identificou perda de marcador na recriação do coordenador. O teste reproduziu a falha; o ajuste reutiliza sessão e índice válidos da entrada atual. Reavaliação sem novos bugs importantes.
- Não há sentinelas no histórico nem conteúdo de formulário persistido. A URL pode mudar brevemente durante o fallback do navegador, pois popstate acontece depois da travessia; a troca de tela pelo Next é bloqueada até restaurar a posição recusada. Saídas entre documentos continuam com a confirmação nativa de beforeunload.
- Arquivos centrais: src/lib/history-protection.ts; src/components/history-protection.tsx; src/app/layout.tsx; src/components/commerce/use-document-exit.ts. Sem alterações de regras comerciais, permissões ou migrations.
