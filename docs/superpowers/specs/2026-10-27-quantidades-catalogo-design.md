# Quantidades comerciais no catálogo

## Intenção e decisões da conversa

Após a entrega de clareza das ofertas, permitir quantidade mínima por produto e pedidos acima de 99 unidades. O usuário escolheu manter preço de referência automático pelas faixas cadastradas, com confirmação final pela equipe. Novos filtros ficam para uma entrega posterior.

Abordagens consideradas:

1. **Referência automática para grandes pedidos — escolhida.** Preserva faixas e adicionais e amplia a validação de quantidades em todas as etapas que consomem o catálogo.
2. Grandes pedidos sempre sob consulta. Exigiria precificação manual por volume mesmo para peças com faixas já cadastradas; não escolhida.

Não alterar automaticamente um produto para sob consulta por causa do volume. Produtos e opções explicitamente sob consulta continuam assim. Compra direta mantém as permissões e as condições existentes; esta mudança não ativa compra direta onde ela não é permitida.

## Limites propostos pelo implementador

- Limite técnico de **100.000 unidades por linha/configuração**, alinhado ao limite já existente nos itens de orçamento e venda da gestão.
- Manter máximo de 20 linhas na seleção do catálogo e os limites atuais de grupos e campos de personalização.
- Total máximo derivado de um conjunto: 20 × 100.000 = 2.000.000 unidades, substituindo o limite derivado atual de 1.980. Aplicar o mesmo valor nos cálculos e nos snapshots de conjunto.
- Não ampliar limites monetários. Recusar resultados que ultrapassem os limites atuais, sem truncar ou arredondar quantidades.

Esses limites são escolhas técnicas propostas, não compromissos de capacidade produtiva ou de prazo.

## Quantidade mínima por produto

- Adicionar `minimumQuantity` inteiro ao cadastro do produto, entre 1 e 100.000; default 1.
- Adicionar migração compatível que inicializa produtos existentes com 1. Incluir restrição de banco coerente com os limites.
- Clientes antigos que omitem o campo preservam o valor existente em atualizações; na criação, usam 1. Não permitir que uma edição antiga apague um mínimo já configurado.
- Incluir o campo nos contratos de leitura administrativa e pública e no formulário comercial do produto.
- Uma alteração do mínimo conta como revisão comercial, como uma mudança de preço.
- O mínimo vale para **cada linha da mesma configuração**: produto, cor, tamanho e respostas da personalização. Não somar nomes, artes ou cores diferentes para completar o mínimo.
- O mesmo mínimo do produto vale para seus componentes em conjuntos. Não somar peças entre conjuntos separados ou com peças avulsas para satisfazer o mínimo. Não criar exceção de mínimo específica para kits nesta entrega.
- Não criar múltiplos obrigatórios: com mínimo 5, quantidades 5, 6 e 7 são válidas.
- Novas configurações começam no mínimo atual. Listas e rascunhos existentes preservam suas quantidades e mostram o que precisa ser corrigido, sem aumento silencioso.

## Faixas e cálculos

- Centralizar os limites compartilhados de quantidade do catálogo, evitando substituições indiscriminadas de qualquer número 99 no projeto.
- Quantidades de linhas e limites de faixas aceitam 1 a 100.000. O mínimo de um produto é validado na camada que conhece a oferta; schemas genéricos de rascunho não dependem de consulta ao banco.
- Preservar o cálculo atual: usar a maior faixa cujo limiar não excede a quantidade; somar os adicionais por unidade; multiplicar pela quantidade, mantendo Decimal e o tratamento de centavos existente.
- A ausência de faixa nova não impede quantidade maior. A última faixa existente continua valendo acima do seu limiar.
- Preservar faixas existentes mesmo quando o mínimo do produto aumenta acima de seu limiar: continuam servindo como regra de preço para quantidades permitidas.
- Em conjuntos, continuar usando preço-base dos componentes com adicionais e o desconto próprio do conjunto; não aplicar faixas individuais junto com o desconto do conjunto.
- Verificar limites e arredondamento dos descontos fixos e percentuais de conjuntos com grandes quantidades.

## Experiência de quem consulta

- Card e produto mostram mínimo quando maior que 1, com texto que esclarece a aplicação por configuração/personalização.
- Formulários de produto mostram mínimo e máximo, aceitam números inteiros e avisam sobre quantidade abaixo do mínimo ou acima do limite.
- Substituir os seletores que geram 99 opções na lista e na montagem de conjuntos por campos numéricos acessíveis. Nunca gerar 100.000 elementos de opção no navegador.
- Permitir editar o rascunho temporariamente vazio sem convertê-lo em 0 ou NaN em payloads enviados; bloquear confirmação enquanto inválido e indicar o campo.
- Não alterar automaticamente quantidade ao subir o mínimo, somar linhas ou confirmar revisões. Se uma combinação ultrapassar 100.000, recusar a combinação e preservar as linhas anteriores.
- A tabela de faixas continua visível e esclarece adicionais. O aviso de mínimo aparece separado dos limiares de desconto.

## Validação no servidor e preservação do histórico

- Validar mínimo atual e máximo no servidor durante revisão da seleção, envio da solicitação, preparação/conversão e fluxos de checkout que já revisam o catálogo. Não confiar no valor recebido do navegador como fonte do mínimo.
- Uma lista com quantidade abaixo do novo mínimo deve apontar a linha e o mínimo exigido, preservando as escolhas para correção.
- Mudança da regra comercial exige a reconfirmação já usada pelo sistema. Preservar os mecanismos existentes de revisão, idempotência e proteção contra catálogo alterado durante a operação.
- Atualizar limites dos snapshots e documentos gerados a partir do catálogo para que pedidos acima de 99 percorram todo o fluxo, incluindo componentes de conjuntos e conversão em orçamento/venda.
- Manter snapshots e documentos antigos legíveis. Não modificar preço, quantidade ou termos de orçamentos, vendas e compras já emitidos/aprovados por causa do novo mínimo do catálogo.
- Manter o schema histórico V1 restrito às quantidades antigas caso ele represente exclusivamente o formato legado; ampliar schemas dos formatos atuais. Aumentar limites não exige, por si só, invalidar rascunhos legados ou mudar versão do envelope.

## Fora do escopo

Filtros, nova taxonomia de coleções, upload de arte, alterações de disponibilidade ou prazo em função da quantidade, descontos inventados, mudanças na fórmula de custos, relaxamento de permissões e publicação automática.

## Critérios de aceitação

- Produto existente mantém comportamento com mínimo 1 após migração.
- Produto com mínimo 5 recusa 4 e aceita 5 ou 6; quantidades de configurações diferentes não se compensam.
- Pedidos de 99, 100, 1.000 e 100.000 funcionam; 100.001, decimais, vazios e valores não finitos não são confirmados.
- Caso numérico independente: base R$ 20, faixa a partir de 100 por R$ 16, adicional R$ 2; 100 unidades resultam em R$ 18 por unidade e R$ 1.800 de subtotal.
- Uma linha abaixo do novo mínimo em lista salva permanece editável, sem alterar sua quantidade silenciosamente.
- Kit com componente acima de 99 chega à revisão e ao orçamento sem aplicar faixa individual; totais e descontos do conjunto continuam corretos.
- Tentar combinar linhas acima do máximo preserva a seleção anterior.
- Validar respostas sob consulta, concorrência de revisão, compatibilidade de clientes antigos e leitura de documentos históricos.
- Verificar domínio, interface e integração com PostgreSQL isolado, além de build, lint, celular e computador. O banco de produção não é ambiente de teste.

## Entrega e versão

Continuar a partir da branch local da etapa anterior, ainda não publicada, sem duplicar implementações nem apagar trabalho aprovado. Atualizar a versão uma vez por PR entregue, considerando a versão atual de main. Como esta etapa acrescenta funcionalidade compatível, a entrega agregada deve usar incremento MINOR e uma entrada de histórico coerente que inclua as etapas entregues; não tratar a versão local 1.2.2 como uma publicação já realizada. Preservar entradas de versões publicadas.

O implementador pode decidir organização de módulos e testes, nomes de mensagens e estrutura visual dentro dos componentes existentes. Deve resolver o bloqueio de banco/executor ou informar precisamente a verificação que não conseguiu concluir; não afirmar suíte completa aprovada sem evidência.
