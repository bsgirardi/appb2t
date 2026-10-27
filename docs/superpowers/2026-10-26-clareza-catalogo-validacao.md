# Clareza comercial do catálogo — validação

Início: 26/10/2026. Fechamento: 27/10/2026. Versão preparada: 1.2.2. Base: main 1.2.1 (53b3ad7).

## Entrega

- Cards esclarecem preço por unidade e possíveis adicionais e mostram o prazo cadastrado com transporte separado.
- Detalhe reúne disponibilidade, prazo, condição de início cadastrada e pagamento perto da personalização.
- Tabela mantém todas as faixas visíveis, ordenadas por quantidade, inclusive antes de preencher a personalização. Ao configurar a peça, indica a faixa aplicada ao preço-base; adicionais continuam no preço unitário e subtotal.
- Produtos sob consulta e componentes de conjuntos não anunciam faixas individuais como ofertas calculáveis.
- Coleções exibem descrições existentes; campos opcionais ausentes não geram informações fictícias.
- Ações do cabeçalho quebram linha em telas estreitas, mantendo a lista acessível com o rótulo de tema automático.

## Evidências

- Teste de regressão falhou pela tabela ausente antes da implementação e passou depois.
- Testes focais: 19 aprovados na primeira verificação. A cobertura posterior inclui consulta com resposta obrigatória ainda ausente.
- Execução ampla anterior à correção da revisão, com pool de threads: 477 aprovados, 289 falhas de preparação por ausência do banco local b2t_test, em 118 arquivos de integração. Nenhuma falha de teste unitário nessa execução. Esse resultado não equivale a aprovação da suíte final.
- Prévia local usa os componentes reais com dados fictícios. Conferidos produto, catálogo, consulta, conjunto, prazo de um dia e prazo ausente; temas claro e escuro; larguras de 320, 390 e 1440 pixels sem transbordamento horizontal da página.
- Conferência interativa: preço-base de R$ 16,00 para 25 unidades, adicional de R$ 2,00, referência final de R$ 18,00 por peça e subtotal de R$ 450,00. Todas as três faixas continuam visíveis.
- TypeScript e ESLint aprovados na primeira verificação; verificações finais e revisão independente registradas no fechamento abaixo.

## Revisão independente

A revisão identificou um caso em que uma opção sob consulta ainda permitia mostrar faixas enquanto outro campo obrigatório estava vazio. Dois testes (texto livre e seleção) reproduziram o erro antes da correção e passaram depois. A apresentação agora considera efeitos de consulta já selecionados sem alterar o cálculo ou a validação do pedido. A reprodução no navegador confirmou nome vazio, opção sob consulta selecionada e ausência da tabela.

A conferência de versão renderizou os componentes reais de login e painel, além do histórico para administradores e operadores; as três verificações passaram com 1.2.2. Aparência da empresa e navegação foram substituídas por dados de teste, sem autenticação ou banco de produção.

## Ambiente e limites

- O executor padrão Vitest apresentou recursão no transporte RPC tanto na base original quanto na candidata. A execução por threads concluiu a suíte e identificou os testes de integração bloqueados pelo banco.
- Docker Desktop não conseguiu iniciar o serviço do banco. Nenhum banco de produção foi acessado nem houve criação de pedido.
- O vínculo de dependências entre unidades de disco impediu o build de Turbopack e a resolução de fontes no Webpack. A verificação final usa uma cópia física das mesmas dependências no worktree, sem instalação ou mudança de bibliotecas.
- A prévia isolada verifica apresentação e interação dos componentes; não substitui a validação das rotas e persistência com PostgreSQL.
- Novas tentativas da suíte ampla voltaram a apresentar a recursão RPC do executor, inclusive com threads e sem interceptar console. Foram interrompidas. A verificação final dos cenários alterados passou em quatro arquivos com 25 testes, incluindo os três controles temporários de versão; não há alegação de suíte completa aprovada.

## Fechamento

- Build de produção padrão, com Turbopack e verificação TypeScript, aprovado após usar dependências físicas no worktree.
- ESLint e `git diff --check` aprovados.
- Revisão independente: um achado importante corrigido com falha anterior e aprovação posterior dos dois testes de regressão; nenhum outro achado acionável.
- Versões raiz e do pacote raiz do lockfile, APP_VERSION e primeira entrada do histórico coerentes em 1.2.2, com data de publicação preparada para 27/10/2026. Notas antigas preservadas.
- Cabeçalho em 320 pixels confirmado com largura de conteúdo de 305 pixels, sem cortar a ação da lista de orçamento.

## Estado da publicação

Alterações preparadas em branch isolada. Sem publicação ou merge automático.
