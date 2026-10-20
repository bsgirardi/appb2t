# C1 — Implementação e verificação

Atualização: 20/10/2026. Branch: `codex/catalogo-c1`. Base: `d1c204e`.

## Estado da entrega

Implementação de C1 disponível em worktree isolada. T1–T7 implementadas. T8 já tem conferência real no navegador integrado nos temas escuro e claro, após o usuário iniciar manualmente a candidata. A preferência de movimento reduzido ainda não foi conferida; não declarar aceite visual integral ou publicação.

Worktree: `C:\Users\117774\.codex\worktrees\catalogo-c1\b2t-calculadora`. O checkout original em `X:\code\b2t-calculadora` conserva o trabalho administrativo de outro chat. Não houve merge, push, atualização de ZIP, publicação ou migração operacional.

## O que mudou

- Cadastro existente ganhou campos de personalização, adicionais unitários, consulta, condição do prazo, conteúdo incluído e associação de foto.
- Produto usa galeria ampliada, configurador, resumo de referência e edição de linhas. Escolhas preservam identidade própria e contexto do catálogo.
- Lista v2 migra v1, conserva diferentes nomes, trata falha de armazenamento e permite recuperação explícita de conteúdo inválido.
- Revisão consulta regras atuais no servidor, exige confirmação das alterações e apresenta consulta sem total fictício. Mensagem extensa mantém o conteúdo copiável.
- Projeção pública oculta preço interno nas ofertas sob consulta. Ordenação separa os grupos antes de paginar; JSON-LD não apresenta valor fixo para configuração de preço variável.
- Campanha válida principal recebe foco; cartões e relacionados compartilham a natureza comercial do preço.

## Revisão independente e correções

Revisão de `d1c204e..a5a4ef7`, incluindo o ajuste de contato que estava no working diff. Nenhum Critical; três Important, todos tratados com testes que primeiro reproduziram a falha:

1. Cor/tamanho totalmente retirados do cadastro: a edição agora mantém a escolha antiga visível e exige removê-la explicitamente antes de salvar.
2. Quantidade incompleta: rascunho tem contrato próprio e preserva textos com quantidade vazia, fracionária ou fora do intervalo; validade comercial é exigida ao concluir.
3. Revisões que convergem: confirmação oferece combinação explícita e atômica, respeitando 99 unidades e preservando ambas as linhas se falhar.

Também foram verificados o vínculo com produto da linha em edição, recuperação de campo retirado, falha de cota sobre rascunho existente, aviso de memória na página do produto e foco no campo após colagem de resposta excessiva. Não houve segunda rodada de revisor; as correções foram verificadas por regressões automatizadas.

O revisor não avaliou visual/responsividade em navegador nem implantação operacional; essas fronteiras permanecem explícitas.

## Verificações já observadas

- Base anterior: 300 testes unitários aprovados.
- Suíte unitária: 332 testes aprovados na execução final; inclui as regressões da revisão e de erro localizado após colagem.
- Integração focal: 22 testes em sete arquivos aprovados, com produto/cadastro/galeria/ordenação/contato; inclui corpo acima de 16 KiB, limite de 256 KiB em stream, remoção transacional de foto e conflito de edição.
- Build de produção Next.js 16.3.8 e verificação de tipos aprovados após todas as correções. A análise ESLint terminou sem erros.
- Suíte geral final, com o código congelado: **536 testes aprovados e uma falha em 537**, em 163 arquivos. A falha é `tests/integration/planning-flow.test.ts:184`, com “Marco efetivo não pode ser futuro”. A mesma falha foi reproduzida isoladamente no commit-base `d1c204e`: o teste usa marcos às 8h do próprio dia e a execução ocorreu antes desse horário em São Paulo. Nenhum arquivo de planejamento foi alterado. A suíte global não é declarada totalmente aprovada.

Banco usado: PostgreSQL temporário `b2t_test`, exposto somente em `127.0.0.1:55431`, contêiner `b2t-catalog-c1-test-db`, dados em tmpfs, sem volume operacional. Os testes conferem host local e nome do banco antes de TRUNCATE; a fixture de navegador exige também a porta 55431. Nenhum dado, custo ou contato real foi usado.

## Inicialização da candidata e conferência no navegador integrado

A revisão automática rejeitou duas tentativas de iniciar a candidata local em `127.0.0.1:3104` com `blocked by policy`, sem motivo adicional. A primeira usava o processo Next de teste; a segunda, inicialização oculta no Windows. Não foram feitas tentativas de contornar o bloqueio por outro serviço ou aplicação.

O usuário iniciou a candidata manualmente e confirmou “ready”. A conferência real foi feita no navegador integrado, conforme pedido explícito, com 21 estados no tema escuro: home, resultados, produto configurável, produto sob consulta, indisponível, lista preenchida e lista vazia, em 320/390/1440 px. Nenhum desses estados apresentou overflow horizontal; os botões públicos conferidos mantiveram altura mínima de 44 px. Capturas de viewport foram gravadas e amostras inspecionadas visualmente. As imagens são as demonstrações identificadas da fixture.

Artefatos preparados: `tests/fixtures/catalog-c1.ts` (18 produtos fictícios; execução da fixture confirmada) e `scripts/check-catalog-c1-browser.cjs` (sintaxe conferida; substituído nesta rodada pela interação com o navegador integrado, não executado como runner). As imagens de logo/mascote são explicitamente de demonstração, não fotografias de ofertas comerciais. A fixture precisa ser recriada depois da suíte de integração, pois os testes limpam o banco descartável.

A referência de comparação da base foi preservada fora da raiz de código em `C:\Users\117774\.codex\worktrees\catalogo-c1\base-d1c204e-reference`, para não entrar nas próximas descobertas de testes. Logs detalhados permanecem na pasta ignorada `.superpowers/sdd/2026-10-19-catalogo-c1/` da worktree.

### Fluxos observados no navegador integrado

- Ana e Bia ficaram em linhas distintas; base de R$ 25 + adicional de R$ 5 resultou em R$ 30/unidade e R$ 60 para duas unidades.
- Recarga preservou a lista. Editar Ana para Ana Maria preservou Bia.
- Um terceiro item sob consulta gerou soma conhecida de R$ 60 e aviso de que não havia total fechado; não foi exibido zero fictício.
- Campo obrigatório vazio recebeu foco e erro associado. Uma observação com 500 caracteres sem espaços não causou overflow.
- Quantidade vazia e texto novo foram recuperados após recarga, com conclusão desabilitada até corrigir quantidade.
- Remoção dos itens mostrou o estado vazio. A lista foi recomposta com dados fictícios ao final.
- Cópia da mensagem incluiu as duas personalizações. Nenhum contato externo foi aberto ou enviado.
- Acabamento Fosco selecionou foto 1; Especial selecionou foto 2 e mudou o valor para consulta. A galeria respondeu à seta do teclado.
- Simulação exclusivamente no produto fictício do banco descartável alterou base de R$ 25 para R$ 26. A lista mostrou referência anterior R$ 30 e atual R$ 31, bloqueou o contato e só liberou a mensagem após confirmação das duas linhas; novo total R$ 62.
- Nenhum erro/aviso foi retornado pelo console do navegador na rodada.

### Evidências e limites restantes

Capturas locais, `evidence-dark.json` e `evidence-light.json` em `test-results/catalog-c1/iab/`. A leitura inicial de imagens ainda não carregadas inclui imagens abaixo da dobra com lazy loading; isso não foi classificado como falha de imagem. Fotos visíveis foram inspecionadas nas capturas. Captura de página inteira não funcionou na API do navegador; foram usadas capturas de viewport.

Ressalva menor: o link textual “Ver minha lista →” pode quebrar a seta em uma linha isolada na largura de 390 px. Sua ativação por teclado foi confirmada; o clique automático no centro do retângulo do link não navegou nessa quebra. Ajuste visual permanece listado, sem alteração da candidata durante o ensaio.

O navegador integrado só anunciou controles de visibilidade e largura, sem emulação de tema ou preferência de movimento. O usuário trocou para tema claro e confirmou “pronto”. Foram conferidos mais 18 estados: home, resultados, produto configurável, sob consulta, indisponível e lista preenchida nas larguras de 320/390/1440 px. Todos sem overflow horizontal, com fundo claro confirmado. Capturas representativas do produto móvel e lista desktop foram inspecionadas. A mensagem preparada preservou Ana/Bia e total de R$ 62; console sem erros/avisos. O estado vazio e erros de formulário não foram repetidos em claro. Para finalizar integralmente T8, conferir a preferência de movimento reduzido e registrar as limitações da recuperação de falha de rede/armazenamento (coberta nos testes automatizados, sem injeção de falha nesta rodada do navegador). Publicação e migração real continuam como etapa própria posterior.

