# Catálogo e Kits — desenho do próximo recorte visual

Estado: abordagem e recorte aprovados pelo usuário em 05/11/2026; desenho abaixo proposto para revisão antes da implementação. Base inspecionada: main 1.20.0 (`4524ca1`). Esta PR é documental.

## Objetivo

A equipe deve localizar produtos e kits, compreender seu estado e editar sem perder campos. Reutilizar a identidade B2T e os padrões já aplicados a Clientes, Orçamentos, Vendas, Produção e Estoque. A vitrine pública não faz parte deste recorte.

## Abordagens

1. **Evoluir listas e editores existentes (recomendada e alinhada ao recorte aprovado):** mantém galerias, cálculo, personalização, composição de kits e contratos de gravação; acrescenta busca/filtros e proteção de edição. Menor risco de regressão.
2. Substituir tudo por um novo painel único: aumentaria a migração de formulários e acoplamento sem benefício demonstrado. Não recomendada.

## Evidência atual

`src/components/products/product-panel.tsx` renderiza os produtos recebidos, contagem ativo/inativo, atualização, edição e ativação. `src/components/kits/kit-panel.tsx` apresenta cartões com estado, quantidade de produtos permitidos e faixas. Nenhum desses painéis contém busca/filtros próprios na revisão consultada. `product-form.tsx` já usa TaskLayout/FormSection; `kit-form.tsx` usa FormSection/FormActions e trata conflito de versão. Não reconstruir esses recursos.

## Experiência proposta

- Cabeçalho com título, descrição curta e ação principal. Lista e editor continuam separados.
- Busca por nome e filtro de estado usando os dados reais já disponíveis. Critérios na URL para preservar retorno e histórico; não introduzir paginação remota nem afirmar busca global sobre uma coleção parcial. Conferir o contrato de carregamento antes da implementação.
- Contagem dos resultados e ação de limpar; distinguir cadastro vazio de busca sem resultados. Manter imagem, nome, preço e ações dos produtos; manter composição e faixas dos kits.
- Estado acompanhado de texto e semântica coerente com o modelo: ativo/inativo não deve ser renomeado como disponível/indisponível em estoque. Não inferir publicação só pela aparência.
- Editores agrupam identificação, composição/custos, condições e publicação, reutilizando as seções existentes. Resumo e salvar/cancelar acessíveis no desktop e celular.
- Reutilizar a proteção administrativa existente contra cancelamento, links, recarga e Voltar/Avançar; incluir campos dinâmicos, fotos e composição. Salvar com sucesso libera somente o rascunho correspondente. Falha ou conflito mantém campos e exige conferência antes de sobrescrever.
- Atualizar lista não descarta formulário. Carregamento, sucesso e falha possuem feedback acessível, sem remover registros anteriores após uma falha de consulta.

## Restrições

shadcn local obrigatório; Roboto administrativo; tokens oficiais e temas claro/escuro. Manter rotas, permissões ADMIN/OPERATOR, expectedVersion, cálculos, memórias, preços, descontos, imagens e regras de personalização/checkout. Sem migrações, novas bibliotecas ou alterações na vitrine por este desenho. Publicação/merge exigem autorização separada. Datas e versões devem ser reconferidas na execução.

## Critérios de aceite

1. Busca e estado combinam corretamente e são preservados ao editar/retornar e usar o histórico.
2. Filtro sem resultados pode ser limpo; cadastro vazio oferece criação quando permitida.
3. Cancelar ou sair de um formulário alterado pede confirmação; recusar mantém campos e contexto. Incluir mudanças feitas por seleção, galeria e remoção de item.
4. Erros de API e conflitos não apagam o rascunho nem criam duplicações. Publicação/ativação seguem as regras atuais.
5. Operador e administrador conservam seus acessos, sem exposição nova de dados restritos.
6. Conferir teclado/foco, celular de 390 px e desktop nos dois temas; sem transbordamento da página, com rolagem interna onde necessária.
7. Regressões de formulário de produto, galeria, precificação, kits, checkout e versão passam conforme os arquivos afetados. Usar fixtures e banco exclusivo se necessário, sem operações fictícias na instalação publicada.

## Decisões deixadas à implementação

Escolher componentes instalados e tamanho das seções pela inspeção visual; decidir necessidade de helper compartilhado somente se Produtos e Kits tiverem comportamento equivalente. Caso a proteção atual não cubra galerias/seleções, reproduzir e testar a lacuna antes de corrigir. Não ampliar o escopo para Coleções, Anúncios ou Financeiro sem nova necessidade aprovada.

## Próximo passo

Revisar este desenho e preparar o plano de implementação após seu aceite. A aprovação do recorte não é registrada como aprovação presumida de cada detalhe acima.
