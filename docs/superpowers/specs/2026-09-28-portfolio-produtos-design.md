# Portfólio público e administração de produtos

## Objetivo e decisões aprovadas

Exibir produtos de impressão 3D em `/portfolio`, sem exigir login, com foto, nome, descrição, valor em reais e formas de pagamento. Usuários ativos autenticados, tanto ADMIN quanto OPERATOR, podem cadastrar, editar, inativar e reativar produtos da equipe.

O usuário aprovou o desenho em conversa em 28/09/2026, incluindo preços calculados pela fórmula existente e parâmetros salvos por produto. Alterações nas configurações gerais não modificam automaticamente os preços publicados. Esta especificação escrita detalha esse desenho para revisão antes do plano de implementação.

Trata-se de um novo módulo integrado à aplicação Next.js, Prisma e PostgreSQL existente. Não haverá checkout, cobrança, pedido ou cadastro público de usuários nesta entrega. As formas de pagamento são informações comerciais exibidas ao visitante.

## Telas e navegação

### Catálogo público

`/portfolio` apresenta uma grade responsiva de produtos ativos, seguindo a identidade visual existente. Cada cartão contém foto com texto alternativo, nome, descrição, preço e condições de pagamento. Descrições preservam quebras de linha e são renderizadas como texto, sem HTML fornecido pelo usuário.

A página tem identificação B2T e acesso à área interna. Um catálogo sem produtos mostra um estado vazio adequado. Uma falha na consulta mostra indisponibilidade, sem apresentar um catálogo vazio como se a consulta tivesse funcionado.

A rota inicial mantém o comportamento existente. A área interna ganha links para Produtos e para o portfólio público. Não é necessária uma página pública de detalhes para atender ao escopo.

### Administração

`/produtos`, dentro do grupo privado existente, lista ativos e inativos com nome, foto, preço e estado. Permite criar, editar, inativar e reativar. A ação de excluir solicitada pelo usuário significa inativação; não remove o registro do banco.

O formulário possui três grupos: apresentação do produto, parâmetros de produção e composição do preço. Campos obrigatórios: nome, descrição, foto, formas de pagamento e todos os valores necessários ao cálculo. As formas de pagamento são texto livre, por exemplo: “Pix ou cartão em até 3 vezes sem juros”. Não são calculadas taxas ou parcelas automaticamente.

A foto será enviada pelo formulário, com prévia. A proposta técnica é aceitar JPEG, PNG e WebP até 5 MiB, validar e decodificar a imagem no servidor e normalizar para um formato de imagem seguro com dimensão máxima de 1600 pixels. SVG e arquivos inválidos são recusados. A foto anterior permanece ao editar sem enviar uma substituta. Erros de envio preservam os demais campos.

Botões de envio ficam desabilitados enquanto a operação está em andamento. Erros preservam o rascunho. Sucesso atualiza a listagem. Conflitos de edição solicitam recarregar o produto, sem sobrescrever silenciosamente o trabalho de outro usuário.

## Cálculo e reajuste

O formulário carrega materiais, impressoras e configurações por meio do serviço existente. A seleção de material e impressora respeita a tecnologia e copia seus valores para o rascunho do produto. Os valores copiados podem ser ajustados para aquele produto por qualquer usuário autorizado a gerenciá-lo.

Todos os campos do motor de cálculo ficam disponíveis:

- Tecnologia FDM ou resina; consumo em gramas ou mililitros; horas e minutos de impressão.
- Preço do material por quilograma ou litro.
- Valor de aquisição da impressora, meses de amortização, dias de uso por mês, horas de uso por dia e potência em watts.
- Tarifa de energia, percentual de manutenção, provisão para falhas, acabamento, fixação em reais e acréscimo sobre o custo.

O resultado é atualizado no rascunho usando `src/domain/calculation/calculate.ts`, com detalhamento dos custos. O servidor valida as entradas com os esquemas existentes e executa o mesmo motor antes de salvar. O cliente não pode fornecer um preço arbitrário como resultado definitivo.

O preço público corresponde ao resultado `sale`, formatado em BRL com duas casas decimais. Os parâmetros são persistidos com decimais representados como strings, preservando a precisão usada no motor. O valor publicado é salvo como decimal com duas casas, com o mesmo arredondamento de `formatBRL`; valores acima da capacidade da coluna são recusados.

Editar um produto carrega seus parâmetros salvos, mesmo que os cadastros originais tenham sido alterados ou inativados. Um comando explícito “Carregar configurações atuais” recarrega os valores globais e dos cadastros selecionados no rascunho; o preço público só muda após salvar. Se material ou impressora não estiver mais ativo, o formulário solicita outra seleção para essa atualização e preserva os parâmetros salvos até lá.

Na ausência de configurações ou cadastros iniciais, o formulário explica o que falta e orienta o administrador a configurar, ou o operador a procurar um administrador. Produtos existentes continuam editáveis com seus parâmetros salvos.

## Dados e persistência

Adicionar modelo Product com identificador, nome, descrição, condições de pagamento, ativo, versão, datas de criação e alteração, parâmetros completos de cálculo em JSON e preço publicado Decimal. Guardar também as referências opcionais de material e impressora usadas para carregar valores atuais, sem depender delas para reproduzir o cálculo salvo.

A imagem normalizada e seu tipo MIME ficam em um registro separado ProductImage, vinculado ao produto, evitando carregar bytes nas listagens. Essa escolha usa o PostgreSQL e seus backups existentes, sem exigir serviço externo ou volume adicional no contêiner. É adequada ao catálogo inicial; um armazenamento de objetos pode ser adotado se o volume de fotos exigir.

Criar ou substituir a foto e salvar os dados do produto deve ser atômico. Não criar uploads órfãos antes de existir um produto. A migração é aditiva e preserva os dados atuais.

Atualizações verificam `expectedVersion`, usando o padrão de concorrência já empregado nos cadastros existentes. Inativação e reativação também verificam a versão. Não existe exclusão definitiva de produto na API.

## Servidor e permissões

Separar consultas públicas e privadas explicitamente. A consulta pública seleciona apenas os campos de apresentação de produtos ativos. Parâmetros, custos, margens e referências internas não entram no HTML, nos dados serializados ou nas respostas públicas.

As operações privadas usam `requireActor()` no servidor, inclusive leituras administrativas e upload da foto. Não basta proteger o layout. Manter as restrições existentes de ADMIN para configurações globais; editar os parâmetros de um produto não altera materiais, impressoras ou custos gerais.

Usar os padrões existentes de respostas e erros. Operações JSON mantêm a verificação de origem atual. O envio de imagem requer processamento multipart separado, com verificação de origem e limite de bytes efetivamente lidos, sem aumentar o limite global de JSON.

A rota de foto pública verifica que o produto está ativo. Para produtos inativos, a foto só pode ser consultada por usuário autenticado. Usar resposta sem cache para impedir que novas requisições recebam dados obsoletos após inativação ou substituição. Conteúdo que um visitante já baixou não pode ser revogado.

Consultas públicas e privadas refletem os dados persistidos sem cache estático. Inativar remove o produto e sua foto de novas consultas públicas; reativar restaura sua exibição. Sessões inexistentes, expiradas ou de usuários inativos não permitem mutações.

## Organização proposta

- Domínio de produtos: esquemas, tipos privados e projeção pública.
- Serviço de produtos: persistência, preço autoritativo, concorrência e consultas.
- Serviço de imagens: validação, normalização e leitura autorizada.
- Rotas Next.js: catálogo, painel protegido e operações de produtos/imagens.
- Componentes: grade pública, listagem administrativa e formulário com campos de cálculo.

Reutilizar o motor e os componentes visuais existentes. Consultar os guias instalados em `node_modules/next/dist/docs/` antes de escrever código Next.js, conforme AGENTS.md. Não duplicar as fórmulas em um novo módulo.

## Verificação e critérios de aceitação

1. Visitante abre `/portfolio` sem sessão e vê apenas produtos ativos e campos públicos.
2. Visitante não lê dados administrativos nem cria, altera, inativa, reativa ou envia fotos; testar as rotas diretamente.
3. ADMIN e OPERATOR conseguem executar todo o fluxo de produtos; as configurações globais continuam exclusivas de ADMIN.
4. Preço salvo corresponde ao motor existente, inclusive arredondamento; preço adulterado pelo cliente não é aceito como fonte de verdade.
5. Alterações globais não modificam produtos salvos; carregar configurações no rascunho também não publica até salvar.
6. Campos inválidos, arquivos inválidos, fotos acima do limite e conflitos são tratados sem perda do registro anterior.
7. Inativação remove produto e imagem das novas consultas públicas; reativação os restaura.
8. Testar estados vazios, formulário, prévia do cálculo e persistência; verificar a interface em largura de computador e celular.
9. Executar testes unitários e de integração pertinentes, análise de tipos, lint e build. Informar explicitamente qualquer verificação que o ambiente impeça.

## Estado de revisão

Revisão interna: requisitos cobertos, fórmulas reaproveitadas, limites de acesso explícitos, preço por produto consistente com a aprovação em conversa. Próxima etapa: revisão desta especificação pelo usuário, seguida do plano de implementação.
