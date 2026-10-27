# Descoberta de produtos — filtros comerciais do catálogo

Estado: desenho aprovado pelo usuário em 27/10/2026 para implementação direta. Base: main 1.3.0, PR #15 integrada.

## Objetivo e contexto

Facilitar a escolha de produtos sem refazer a vitrine. Hoje já existem busca por código/nome/descrição, coleções ativas como categorias, ordenação, paginação e retorno aos resultados. A próxima etapa acrescenta critérios comerciais sobre essa estrutura e preserva a continuidade da navegação.

## Abordagens consideradas

1. **Filtros comerciais sobre as coleções existentes (recomendação):** aproveitar os dados cadastrados de preço e disponibilidade. Entrega útil sem exigir recategorização ou novo cadastro.
2. **Reorganizar categorias primeiro:** exige decisões da equipe sobre taxonomia e classificação dos produtos; adia o uso dos dados comerciais já disponíveis.

O usuário aprovou a primeira abordagem e este documento antes da implementação.

## Comportamento proposto

- Um formulário GET de filtros junto aos resultados, combinando coleção, busca, preço mínimo/máximo, disponibilidade e ordenação, com botão Aplicar filtros. Adaptável ao celular, usando os componentes atuais.
- Disponibilidade usa os estados já cadastrados: todos, disponível, sob encomenda, consulte disponibilidade e indisponível. O padrão preserva todos os produtos ativos atualmente publicados.
- Preço é o **preço-base de referência por unidade**. Não inclui adicionais, descontos por quantidade, frete ou preço final negociado. Explicar isso junto aos campos.
- Faixa inclusiva: mínimo e máximo opcionais. Com qualquer limite de preço, incluir somente produtos com preço público de referência; produtos sob consulta não possuem valor comparável. Exibir explicação e permitir remover o limite facilmente.
- Aceitar reais com vírgula ou ponto e até duas casas decimais, sem agrupadores de milhar; zero é limite válido. Rejeitar valores negativos, excessivos, não numéricos ou mínimo acima do máximo. Limite alinhado ao Decimal(18,2) existente.
- Entradas inválidas vindas de URL aparecem preservadas no formulário, com erro compreensível; não executar a listagem como se uma faixa válida tivesse sido aplicada. Corrigir e reaplicar restaura os resultados.
- Os filtros ativos aparecem em marcadores removíveis. Remover um preserva os demais. Limpar filtros remove todos e retorna ao catálogo geral.
- Alterar busca, coleção, disponibilidade, preço ou ordenação reinicia a paginação. Paginar preserva os critérios. Contagem e páginas devem usar exatamente o mesmo conjunto filtrado.
- Abrir um produto, editar sua configuração e voltar aos resultados preserva os filtros. A busca do cabeçalho também preserva os demais critérios, sem perder o contexto em dispositivos móveis.
- URLs de compartilhamento do produto e canônicas continuam limpas; contexto de retorno aceita apenas os campos conhecidos, sem URLs arbitrárias.
- Nenhum produto inativo ou coleção inativa será exposto pelos novos filtros. Histórico, orçamento, mínimo por configuração e checkout mantêm as regras da versão 1.3.0.

## Compatibilidade e limites

Sem nova coluna ou migração: utilizar preço, modo público e disponibilidade já existentes. Novos campos de contexto são opcionais, com padrões compatíveis com URLs, listas e rascunhos anteriores. Os schemas estritos de contexto e os links consumidores devem evoluir juntos.

Fora desta etapa: busca sem acentos, tolerância a erros de digitação, sugestões automáticas, sinônimos, múltiplas categorias simultâneas, nova taxonomia, filtros por ocasião/material/prazo, alteração de preços, cadastro em lote, frete automático ou publicação automática da próxima PR. Não inventar classificações ausentes.

## Critérios de aceitação

- Combinar coleção + busca + disponibilidade + preço retorna e conta apenas os produtos correspondentes, inclusive ao paginar e ordenar.
- Sob consulta permanece no catálogo geral e no filtro correspondente, mas sai da faixa de preço por não ter referência pública.
- Preços com centavos, limites inclusivos, campos vazios, zero, valores inválidos e faixa invertida têm comportamento explícito.
- Abrir/voltar, editar uma linha salva, pesquisar no cabeçalho e remover um marcador preservam os demais critérios; rascunhos antigos continuam legíveis.
- Conferir teclado, rótulos, mensagens e ausência de extravasamento em 320/390/1440 pixels e temas claro/escuro.
- Testes de domínio e integração com PostgreSQL descartável, testes de interface para os fluxos modificados, tipagem, lint e build.

## Decisões deixadas ao implementador

Organização de módulos, nomes dos parâmetros de URL, agrupamento visual e mensagens finais, respeitando componentes e identidade existentes. Para uma entrega posterior compatível sobre main 1.3.0, preparar versão MINOR 1.4.0 uma única vez na PR e conferir main novamente antes de integrar. Esta proposta não autoriza novo merge/publicação sem instrução do usuário.
