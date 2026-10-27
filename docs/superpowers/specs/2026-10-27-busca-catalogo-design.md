# Busca do catálogo — acentos, palavras e erros leves

Estado: desenho para aprovação. Base: main 1.4.0, PR #16 integrada e publicada localmente. O usuário autorizou iniciar e solicitou explicitamente tolerância a erros de digitação; os limites e o comportamento abaixo são propostas do implementador para revisão.

## Objetivo

Encontrar produtos sem depender de acentos, maiúsculas ou ordem das palavras e ajudar quando houver erro leve de digitação, preservando os filtros comerciais da versão1.4.0. Hoje a busca compara o texto inteiro por trecho em nome, código e descrição, ignorando apenas maiúsculas.

## Abordagens consideradas

1. Busca normalizada por todas as palavras, sem aproximação: mais previsível, mas não atende ao pedido adicional de erros de digitação.
2. **Normalização e aproximação conservadora somente quando não há resultado exato (proposta):** usa PostgreSQL existente, mantém os filtros e identifica claramente os resultados aproximados. Não precisa de serviço ou cobrança externa.
3. Motor externo ou busca aproximada misturada à exata: aumenta dependências, operação e risco de resultados pouco relacionados. Fora desta etapa.

## Correspondência exata

- Ignorar acentos e caixa nos dois lados da comparação; não alterar textos cadastrados ou o texto digitado exibido ao visitante.
- Separar os termos por espaços, remover espaços excedentes e termos repetidos. Preservar o limite atual de100 caracteres. Não remover automaticamente artigos ou palavras curtas.
- Todas as palavras precisam aparecer no mesmo produto, independentemente da ordem; podem estar distribuídas entre nome, código e descrição. Cada termo continua aceitando correspondência por trecho, como a busca atual.
- Exemplo: “AZUL decoracao” encontra “Vaso de decoração azul”. Não retorna um vaso sem azul apenas por conter decoração.
- Pontuação dentro de um termo permanece literal. Percentual, sublinhado, aspas e outros caracteres digitados não viram curingas, expressões regulares ou SQL.
- Busca vazia ou apenas espaços equivale a navegar normalmente. Busca só com pontuação não pode virar busca ampla por ausência de palavras.

## Erros de digitação

- Primeiro contar os resultados exatos dentro de todos os filtros ativos. Se houver pelo menos um, mostrar somente esses resultados, inclusive nas páginas seguintes. Página vazia além do limite não aciona aproximação.
- Somente se a contagem exata for zero, procurar aproximações conservadoras nas palavras do **nome** dos produtos. Restringir a aproximação ao nome reduz ruído de descrições longas. Nome, código e descrição continuam aceitos nas correspondências exatas dos demais termos.
- Todos os termos continuam obrigatórios: cada um corresponde exatamente nos campos existentes ou, quando elegível, a uma palavra semelhante do nome. Nunca relaxar coleção, disponibilidade, preço ou publicação para obter resultados.
- Termos de até3 letras, termos com números ou pontuação e códigos de produto permanecem exatos. Não corrigir SKUs, números, medidas ou códigos automaticamente. A comparação exata continua ignorando acentos/caixa.
- Para termos somente de letras: de4 a8 caracteres, admitir uma inserção, remoção ou substituição, ou uma troca de duas letras vizinhas; a partir de9, admitir distância de edição de até2. Esses limites são escolhas conservadoras do implementador.
- Exemplos: “chavero” pode encontrar “Chaveiro”; “azlu” pode encontrar “azul”; “BR-002” não pode ser corrigido para “BR-001”. Ausência de candidatos suficientemente próximos permanece sem resultados.
- Exibir aviso acessível **“Resultados aproximados para ‘…’”** quando usado o segundo caminho. Não substituir silenciosamente a busca por uma palavra supostamente correta nem inventar uma sugestão única.
- Manter a ordenação escolhida (nome, recentes ou preço), paginação e total do mesmo conjunto correspondente. Não adicionar uma ordenação nova por relevância nesta etapa.

## Interface e continuidade

- Explicar brevemente que acentos e ordem das palavras não são necessários e que resultados aproximados são identificados.
- Quando nada for encontrado, orientar a conferir grafia ou usar menos palavras. Oferecer **remover somente a busca**, mantendo categoria, disponibilidade, preços e ordenação, e reiniciando a página. Continuar oferecendo acesso ao catálogo geral como ação distinta.
- Não apagar o texto ao retornar de um produto ou editar uma linha salva. Busca do cabeçalho, formulário, marcadores e links usam o mesmo contexto existente.
- Preservar URLs canônicas e links comerciais limpos. Produtos/coleções inativos, configurações, mínimos, consultas e checkout mantêm suas regras atuais.
- Sem histórico pessoal de pesquisas, telemetria nova, recomendações comerciais, sinônimos, IA ou autocorreção de texto.

## Persistência e implementação proposta

- Usar recursos do PostgreSQL17 já disponível: normalização por `unaccent` e distância limitada por `fuzzystrmatch`, ou mecanismo nativo equivalente que prove as regras acima. A disponibilidade dos dois módulos foi consultada no PostgreSQL local; ainda não foram instalados por esta etapa.
- Será necessária uma migração aditiva para habilitar os recursos escolhidos. Ela não deve modificar os textos dos produtos, preços, documentos ou outras tabelas de negócio; validar privilégios e disponibilidade antes da publicação.
- Comparação, filtragem, contagem e paginação devem ocorrer no banco, em snapshot coerente. Não carregar o catálogo inteiro ou listas ilimitadas de IDs na aplicação para filtrar depois.
- Consultas parametrizadas e ordenação por opções fixas; não interpolar texto do visitante como SQL. Aproximação trabalha sobre palavras de nome limitadas pelo cadastro e respeita os limites dos operadores usados, inclusive dados Unicode incomuns, sem causar exceções na página.
- Antes da entrega, testar uma massa fictícia representativa de5.000 produtos e termos exatos/aproximados, registrar ambiente e duração. Alvo operacional: cada busca completar em até1 segundo no ambiente de teste aquecido; se não cumprir, otimizar ou registrar a limitação antes da aprovação para publicação, sem esconder falhas ou reduzir silenciosamente resultados.

## Aceitação e entrega

- Testar acentos pré-compostos/decompostos, caixa, espaços, termos repetidos, ordem invertida e termos em campos diferentes.
- Testar prioridade exata global, ausência de mistura com aproximações, troca de letras, limites de distância, palavras curtas, códigos/números, curingas literais e texto malicioso.
- Combinar busca com coleção/preço/disponibilidade, consultar páginas seguintes e preservar CONSULT no final da ordenação por preço quando aplicável. O total deve reconciliar com os itens, sem expor inativos ou duplicar produtos.
- Verificar atualização/inativação de produto sem resultados antigos persistidos indevidamente. Preservar documentos e rascunhos anteriores.
- Testar banco descartável e navegador com dados fictícios,320/390/1440 pixels e claro/escuro; nenhuma fixture ou teste destrutivo no banco operacional.
- Preparar uma única versão MINOR1.5.0 se main permanecer1.4.0. Sincronizar manifestos, APP_VERSION, rodapés de login/admin e notas em português na página Atualizações, mantendo o histórico anterior. Conferir main novamente ao finalizar a PR.
- Implementação, PR, merge e publicação são estados distintos. A aprovação deste desenho autoriza a implementação; merge/publicação só ocorrerão mediante instrução posterior.

## Decisões deixadas ao implementador

Divisão em módulos, composição das consultas, DTO interno para indicar resultados aproximados, otimizações e redação final da ajuda, dentro das regras acima. Alterações de algoritmo que ampliem os limites de erro, retirem filtros ou incluam novos serviços exigem revisão do escopo.

Referências técnicas: [PostgreSQL17 — unaccent](https://www.postgresql.org/docs/17/unaccent.html) e [PostgreSQL17 — fuzzystrmatch](https://www.postgresql.org/docs/17/fuzzystrmatch.html).
