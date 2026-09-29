# Entrega 1 — catálogo, coleções e aparência

## Objetivo e autoridade

Implementar as mudanças aprovadas em conversa: várias fotos por produto em carrossel, preço final independente da sugestão da calculadora, coleções, administração mais legível, configuração de identidade visual exclusiva de administradores e modo escuro automático.

Este documento segue as [regras compartilhadas](2026-09-29-gestao-interna-index.md). Substitui a política da especificação de 28/09/2026 que publicava automaticamente o resultado da calculadora como preço do produto. A fórmula da calculadora não muda.

## Preço sugerido e preço final

`Product.price` passa a representar o preço final informado pelo usuário autenticado. O preço sugerido continua calculado pelo mesmo motor, a partir do snapshot de parâmetros do produto, e permanece interno.

O formulário exibe os dois valores com rótulos inequívocos: “Preço sugerido pela calculadora” e “Preço final de venda”. O preço final é obrigatório, positivo, com até duas casas decimais; aceita vírgula na digitação. Não é alterado ao selecionar impressora/material, carregar configurações atuais, mudar custos ou salvar o formulário.

A ação explícita “Usar preço sugerido” copia a sugestão arredondada para o campo de preço final no rascunho. Publicação ocorre somente ao salvar. Preço abaixo do custo gera aviso informativo com valores, sem impedir a decisão comercial do usuário. A composição de custos permanece disponível, claramente identificada como informação interna.

Ao atualizar a instalação, os preços já publicados permanecem intactos no mesmo campo. Nenhum produto precisa ser recadastrado e nenhuma migração recalcula seu valor comercial. O servidor valida preço final e parâmetros separadamente, sem substituir o preço final pelo cálculo.

## Galeria e carrossel

Cada produto suporta de 1 a 10 fotos. O painel permite enviar várias, visualizar miniaturas, ordenar e remover fotos da seleção. A primeira foto na ordem é a capa. Há botões acessíveis para mover uma imagem para antes/depois; arrastar não será o único mecanismo.

O carrossel público mostra a capa inicialmente e permite navegação manual por controles anterior/próxima e indicadores, com suporte a teclado e toque. Não há avanço automático. Para uma única imagem, não aparecem controles sem utilidade. O nome do produto e a posição da foto compõem o texto alternativo.

Manter JPEG, PNG e WebP estático, até 5 MiB e 40 milhões de pixels por foto, normalizados no servidor para WebP com até 1600 pixels por dimensão. Rejeitar SVG, arquivos corrompidos e animações. O limite total de requisição multipart de produto passa a 52 MiB; o campo JSON mantém limite explícito de 16 KiB. O limite é aplicado aos bytes lidos, mesmo sem Content-Length. O proxy precisa aceitar esse tamanho.

Produto, fotos novas, remoções e ordenação são salvos na mesma transação e sob a mesma versão do produto. Não há upload órfão publicado antes do salvamento. A remoção da última foto é recusada. Uma falha de arquivo ou de concorrência preserva o conjunto anterior no banco e o rascunho na interface.

`ProductImage` ganha identificador próprio, relação muitos-para-um com Product e posição. A migração transforma cada imagem atual em posição zero sem alterar seus bytes. A rota antiga `/api/products/[id]/image` continua servindo a capa para compatibilidade; uma rota por identificador serve as demais imagens e verifica sua relação com o produto. Novas consultas públicas só servem fotos de produtos ativos. Listagens recebem metadados/URLs, nunca bytes.

## Coleções

Adicionar `/colecoes` na área privada para ADMIN e OPERATOR. Cada coleção tem nome (2–120 caracteres), descrição (até 2000), capa opcional, ordem de exibição, estado ativo e versão. Uma coleção pode ter vários produtos; um produto pode pertencer a várias coleções. A relação é única por par coleção/produto.

O editor do produto permite escolher coleções. O painel da coleção também permite atribuir/remover produtos, com verificação de versão da coleção. Edições de associação devem atualizar as versões afetadas para que os dois pontos de edição não sobrescrevam alterações concorrentes.

O catálogo apresenta navegação por coleções e uma opção “Todos os produtos”. Somente coleções ativas e produtos ativos aparecem. Um produto sem coleção continua em “Todos”. Inativar uma coleção não inativa seus produtos; suas associações permanecem para reativação. Inativar um produto remove sua exibição em todas as coleções públicas.

A capa é um upload com as mesmas regras das fotos de produtos. Se não houver capa, pode-se exibir a capa do primeiro produto ativo associado; se não houver produto ativo, usar um estado visual neutro. Uma coleção ativa vazia pode ser consultada e mostra estado vazio, sem revelar produtos inativos. URLs usam identificadores estáveis, sem depender do nome para manter links após renomeação.

## Identidade da empresa

Criar `/configuracoes/aparencia`, protegida por ADMIN no servidor. Campos: nome da empresa (2–120), nome curto (até 30), slogan (até 160), e-mail público, telefone público, endereço público (até 500), texto do rodapé (até 300), cor principal e cor de destaque para cada tema, e logo opcional.

Dados de contato são opcionais; quando vazios, não deixam blocos ou links quebrados. Endereço e telefone são texto; e-mail é validado. Campos de texto são renderizados escapados, sem aceitar HTML/CSS arbitrário. Cores aceitam apenas hexadecimal `#RRGGBB`.

Logo aceita JPEG, PNG ou WebP estático, até 2 MiB e 16 milhões de pixels, normalizado até 1024 pixels por dimensão com transparência preservada. Permitir substituir ou remover; na ausência, usar uma marca textual com o nome da empresa. Bytes ficam no banco em registro separado e são incluídos no backup existente.

O formulário oferece prévia local e botão Salvar. Publicar identidade só ao salvar, com controle de versão e validação no servidor. A identidade aparece no login, cabeçalho/menu internos, catálogo, rodapé e metadados de páginas. Posteriormente, documentos comerciais copiarão a identidade vigente na emissão, conforme a entrega 2.

Instalação sem configuração usa os valores B2T atuais. O serviço expõe um DTO público limitado aos campos de apresentação; campos de auditoria, usuários e parâmetros internos não são disponibilizados a visitantes.

## Administração e tema automático

Reorganizar navegação e hierarquia visual para acomodar Produtos, Coleções, Calculadora e Configurações sem perder responsividade. A melhoria inclui campos, tabelas, botões, avisos, estados desabilitados, resumo de custos e cartões de preço.

Usar tokens semânticos de cor: fundo, superfície, texto, texto secundário, borda, marca, sucesso, aviso e erro. Substituir cores fixas conflitantes nas telas existentes. Texto de uso corrente tem pelo menos 14 px; rótulos auxiliares pelo menos 12 px. Informação não depende exclusivamente de cor.

Modo automático segue `prefers-color-scheme` em todas as páginas, incluindo login e catálogo, desde a renderização inicial, sem flash de fundo claro em preferência escura. Mudanças do sistema se refletem durante a sessão. Não é necessário salvar uma preferência individual nesta entrega.

As paletas claro/escuro possuem cores de superfície e texto compatíveis. Na prévia e no salvamento de cores da marca, escolher texto branco ou escuro pelo contraste e recusar combinações sem contraste de pelo menos 4,5:1 para texto normal. Cores de marca não substituem indiscriminadamente cores de tabelas e custos. Na composição de custos, usar rótulos e valores legíveis; marcadores coloridos são auxiliares.

## Migração e integração

Preservar imagens, preços, parâmetros, referências e estados atuais. Criar coleções e configuração de aparência sem exigir dados de demonstração. A migração e o novo serviço devem manter a compatibilidade da rota de capa durante a atualização.

Continuar validando permissões em cada rota. O catálogo público recebe preço final, descrições, coleções ativas e URLs de fotos, sem preço sugerido, composição de custo ou margem. Manter os parâmetros de cálculo completos apenas no painel privado.

## Aceitação

- Alterar custos muda a sugestão sem mudar o preço final; usar sugestão e salvar publica somente a ação explícita.
- Migração preserva preço e foto de um produto existente.
- Enviar, ordenar, remover e substituir imagens funciona com concorrência e rollback; última foto não pode ser removida.
- Carrossel funciona com 1 e 10 fotos, teclado e toque; não publica foto de produto inativo.
- Coleções filtram corretamente e não revelam associações inativas; edição pelos dois painéis detecta conflito.
- OPERATOR gerencia catálogo/coleções, mas não salva aparência. Visitante não altera nenhum dado.
- Logo, nomes, contatos e cores atualizam somente após salvar; valores inválidos preservam a configuração anterior.
- Conferir páginas em 1440px e 390px, temas claro/escuro, foco, contraste e ausência de rolagem horizontal inesperada.
- Testes de domínio, HTTP, PostgreSQL e interface, typecheck, lint, build e execução Docker.

Revisão interna: comportamento do preço substituído explicitamente; migração sem perda; limites de mídia e de publicação definidos; dependência dos módulos comerciais limitada à leitura de preço e identidade.
