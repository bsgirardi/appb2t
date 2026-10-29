# E1.2 — Canais, descontos e cenários salvos

Data: 29/10/2026. Base conferida: main local/remota 6e901a7, versão 1.12.0.
Situação: abordagem com cenários nomeados e salvos aprovada; detalhes deste desenho propostos para aprovação. Não há implementação.

## Intenção e limites

Permitir que ADMIN e OPERATOR comparem o mesmo lote em canais configurados, decidam o desconto e recuperem a justificativa do preço. Preservar calculateV2, cálculo original, comparação E1.1, memórias antigas e decisão humana. O resultado é estimado, não lucro líquido, venda, capacidade livre ou garantia comercial.

Inclui comparação simultânea, desconto percentual, preços de cobertura e meta e biblioteca privada de comparações imutáveis identificadas. Não inclui tarifas presumidas, integrações externas, G-code/3MF, projeção mensal, margem nas oportunidades E4, publicação automática de preço, edição em massa ou novos modelos de comissão. Não modifica documentos ou rentabilidade histórica.

## Diagnóstico e abordagens

calculateV2 já resolve MARKUP, CONTRIBUTION e INFORMED, com custo fixo do canal por lote e taxas percentuais somadas sobre a receita. PricingScenarios compara até dez quantidades, em V2 e V3. PricingSnapshot preserva entrada/resultado/autoria, mas não tem nome, biblioteca ou contexto de desconto. O endpoint atual de estimativas apenas cria memória para aplicar a produto/documento; não deve mudar seu contrato.

Abordagens apresentadas: (1) comparação transitória, menor entrega mas sem recuperação; (2) comparação com memória nomeada e salva, mais persistência e interface, mas justificativa recuperável. O usuário aprovou (2). A antiga proposta de E1.3 para identificar memórias passa a integrar este recorte; E1 ampla continua parcial pelos demais incrementos.

## Simulação e preço de referência

Decisões propostas pelo agente: dentro da calculadora V2/V3, comparar de 1 a 10 alternativas identificadas por canal e desconto; quantidade e premissas produtivas comuns vêm do lote atual. Desconto é percentual, de 0 a 100, com até duas casas. Pode haver o mesmo canal com descontos distintos; duplicatas exatas não agregam linhas. Não gerar produto cartesiano de quantidades, canais e descontos.

Oferecer duas bases explícitas para a comparação: preço comum informado por peça (para avaliar a mesma oferta em canais distintos) ou preço calculado por canal no modo atual (para avaliar políticas de preço). A base inicial proposta é preço calculado por canal, sem desconto. Mostrar em cada alternativa modo, base e preço antes do desconto; nunca comparar preços distintos como se fossem a mesma oferta. Na base comum, exigir preço explícito com centavos; não preencher um valor oculto. No modo INFORMED, o preço do formulário é a base comum inicial visível.

Preço final por peça = preço de referência por peça × (1 − desconto/100), arredondado HALF_UP a centavos. Receita final = preço final × quantidade. Reavaliar pelo calculateV2 em INFORMED, preservando todos os custos e taxas do canal. Desconto é aplicado uma vez, antes das taxas. Mostrar desconto efetivo em reais decorrente do arredondamento. Frete não modelado não será inventado como custo. Não oferecer desconto em reais neste incremento.

Apresentar contribuição, margem de contribuição, resultado após depreciação, receita, custo completo, taxas discriminadas e custo fixo por lote. Comparar com a alternativa sem desconto do mesmo canal para mostrar variação de contribuição em reais e margem em pontos percentuais. Zero de receita produz margem não aplicável; resultados negativos permanecem visíveis.

## Cobertura e meta

Usar aritmética Decimal com precisão compatível com calculateV2. Sejam V o custo variável modelado (inclui fixo comercial), F o custo completo (V + depreciação), n a quantidade, t a soma das taxas/100 e m a meta de contribuição/100.

Preço mínimo de cobertura por peça = F / [n × (1 − t)], arredondado PARA CIMA a centavos. É a cobertura após depreciação, não a mera contribuição zero. Não garante pagar despesas fixas não modeladas.

Preço para meta de contribuição por peça = V / [n × (1 − t − m)], arredondado PARA CIMA a centavos, quando t + m < 1. Exibir a meta percentual configurada separadamente da política MARKUP; markup não é margem. O preço mínimo que atende cobertura E meta é o maior dos dois. A meta pode ser atendida com resultado após depreciação negativo: apresentar as duas condições independentes.

O arredondamento para cima vale somente para os novos indicadores de piso/meta; não altera o arredondamento legado do motor. Verificar as condições pelos resultados efetivos do motor, não pela formatação visual. Se taxas + meta >= 100%, marcar a meta como inviável naquele canal e continuar mostrando cobertura e oferta INFORMED; não derrubar outras alternativas. Se a base escolhida exigir cálculo CONTRIBUTION inviável, marcar apenas essa alternativa sem preço de referência, permitindo mudar para preço comum. Limites monetários/consumo/tempo existentes continuam válidos, sem infinito ou valores truncados.

Exemplo sintético verificável: n=10, V=90, F=100, taxas=10%, meta=20%. Cobertura R$ 11,12/peça, meta R$ 12,86/peça. Base R$ 15,00 e desconto 10% dão R$ 13,50/peça, receita R$ 135,00, taxas R$ 13,50, contribuição R$ 31,50, margem 23,333…%, resultado após depreciação R$ 21,50. Sem desconto a contribuição é R$ 45,00; variação −R$ 13,50 e −6,666… pontos percentuais.

## Memória e biblioteca

Salvar explicitamente uma comparação com nome obrigatório de 1 a 120 caracteres, até 10 alternativas válidas e ordenadas; autoria e data pelo servidor. Não salvar automaticamente a cada edição. Não há vínculo obrigatório a produto/cliente: o nome identifica a simulação. Sem exclusão/edição/renomeação de memórias neste recorte; refazer cria uma nova comparação. Buscar por nome, ordenar por data decrescente e paginar, permitindo selecionar até 10 alternativas de comparações salvas para consulta lado a lado. Mostrar quantidade e identificação da origem em cada coluna/cartão; não somar cenários incompatíveis ou classificá-los automaticamente como melhores.

Reutilizar PricingSnapshot para entrada e resultado efetivo de cada alternativa. Adicionar estrutura própria para comparação, nome, versão do contrato, premissas comuns/modo de referência e itens com canal congelado, desconto, preço de referência e vínculo ao snapshot. Persistir também os indicadores derivados com versão de cálculo para exibição histórica; leitura não recalcula memórias com catálogo ou fórmulas novos. Todas as estruturas são adicionais, sem backfill obrigatório nem alteração de snapshots antigos. Biblioteca E1.2 contém somente comparações salvas por este fluxo, não todos os snapshots comerciais existentes.

Salvar em transação única e idempotente por ator/chave, verificando hash do pedido; reenvio igual retorna o mesmo conjunto, conteúdo diferente com mesma chave gera conflito. Resolver catálogo e todas as referências no servidor sob visão consistente. Calcular preços/resultados no servidor: nunca confiar nos totais do cliente. Mudança de versão, desativação ou remoção de referência antes do salvamento exige revisão explícita; não atualizar parâmetros silenciosamente. Comparação histórica continua legível se referências mudarem ou forem desativadas. Salvar não depende de a oferta cobrir custos: prejuízo é decisão permitida e claramente sinalizada.

ADMIN e OPERATOR autenticados podem criar e consultar as comparações da equipe, seguindo o escopo privado já usado para preços e sem acesso público. Exibir autor/data. Dados não incluem clientes ou credenciais. Limitar quantidade de itens e tamanho do pedido, validar autorização no servidor em leitura e escrita e usar paginação limitada.

## Recuperação e aplicação

Abrir uma memória mostra exatamente suas premissas e resultados históricos, sem substituí-los pelos atuais. Comparar memórias é consulta. Para reutilizar no formulário, criar rascunho com revisão explícita dos parâmetros atuais: referências indisponíveis devem ser substituídas pelo operador. Preservar a memória original. Se houver mudança de custo/taxa, recalcular e mostrar antes de permitir aplicação.

No comparador vivo, ação explícita usa canal e preço final INFORMED no formulário; não aplica desconto outra vez. Essa ação não publica nem salva produto/documento; a aplicação existente continua separada. Em documentos de quantidade fixa, manter essa quantidade e os limites atuais. Não aplicar desconto ao documento comercial automaticamente: a oferta final é um preço informado, e descontos posteriores do documento continuam distintos e devem ser explicados como adicionais.

## Interface e decisões deixadas à implementação

Seguir a skill shadcn local e componentes instalados, acessibilidade, erros associados aos campos, navegação por teclado e apresentação legível em tela estreita. Oferecer comparação na calculadora e biblioteca privada acessível a ambos os perfis. Resultado inválido não mantém resultado anterior como atual. Exibir alertas por alternativa, sem depender apenas de cores.

Nomes de tabelas/rotas/componentes, tamanho de página (limitado), composição responsiva e organização interna ficam para o plano. Não criar um segundo motor nem formulário produtivo independente. Ler os guias Next locais pertinentes antes de qualquer código; não instalar dependências antes da aprovação do desenho.

## Critérios de aceite e validação

1. Mesmo lote preserva material/tempo/fixos; taxas e custo comercial são os configurados de cada canal, sem tarifa externa presumida.
2. Ambas as bases de preço são explícitas; descontos 0%, 100% e valores intermediários coincidem com o motor em preço final INFORMED, incluindo centavos e variações.
3. Exemplo financeiro acima, casos de piso fracionário, meta inviável, zero/negativo e cobertura versus meta independente são testados.
4. Memória salva após recarga preserva nome, ordem, autoria, entrada, desconto, preço e resultados; mudança de catálogo não altera leitura histórica.
5. Reenvio idempotente, chave com conteúdo diferente, referências concorrentes alteradas, rollback integral e acesso não autenticado têm testes em banco exclusivo descartável.
6. Comparar/reabrir não altera produtos, documentos, preços publicados ou memórias existentes; aplicação exige ação humana e revisão atual quando necessária.
7. Comparação E1.1, modos legados e snapshots comerciais permanecem compatíveis; testes relacionados, tipos, lint e build devem passar. Validar desktop/celular e ADMIN/OPERATOR com dados sintéticos.
8. Migração real e reaplicação somente em banco descartável exclusivo E1.2, com preservação de fixtures legadas; nunca usar operação/bases dos demais chats.

## Entrega e acompanhamento

Worktree isolada: C:/Users/Administrador/.codex/worktrees/e1-2-canais-descontos/appb2t; registro no aplicativo ainda pendente. Documentos locais pós-publicação copiados integralmente para conservar o contexto; originais operacionais preservados. Não importar stash antigo.

Versão permanece 1.12.0 durante o desenho. Futura entrega funcional deverá preparar incremento MINOR único comparado à main vigente, manifestos sincronizados, notas portuguesas e rodapés via APP_VERSION; não criar tags. PR, push, merge, publicação, banco operacional e atualização de contêineres exigem autorização específica ainda não concedida. Após aprovação deste desenho, escrever plano executável e implementar em isolamento conforme o fluxo aplicável.
