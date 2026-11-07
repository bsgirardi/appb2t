# E2.4 — recorrência de desvios produtivos

06/11/2026. Base reconferida: main `16a6466`, versão 1.22.0. Critérios numéricos e recorte aprovados pelo usuário neste chat. Documento detalha decisões técnicas conservadoras; implementação ainda não iniciada.

## Intenção e limites

Sugerir a administradores a conferência humana da ficha quando custos produtivos comparáveis excederem reiteradamente a memória congelada. Não provar causalidade, alterar fichas, preços, parâmetros, custos, documentos, revisões ou apurações. Sem novas escritas de negócio ou migração. Rentabilidade permanece ADMIN, com revalidação do usuário ativo. E2.1/E2.2, rankings e metas existentes são preservados.

## Critérios aprovados

- Produto + configuração produtiva equivalente + mesma quantidade por linha.
- Últimos 90 dias civis inclusivos em America/Sao_Paulo, encerrando hoje, pela primeira confirmação/conversão da venda. Custos são os atuais na leitura; não é fotografia histórica do realizado.
- Pelo menos cinco pedidos distintos comparáveis e independentes.
- Pelo menos três pedidos e 60% da amostra elegível com custo realizado excedendo o previsto em 10% e R$ 5 por linha, simultaneamente.
- Somente linhas totalmente entregues, reconciliadas e com conferência vigente sustentam sugestão. Demais linhas aparecem com seus motivos, fora do cálculo.
- Pedidos que compartilham origem produtiva não contam como observações independentes.

Interpretação técnica proposta: limites inclusivos (>= 10%, >= R$ 5, >= 60%); manter precisão decimal, arredondar somente na apresentação. Custo previsto zero não permite percentual e torna a linha inelegível, com motivo explícito. Não há limiar adicional de cobertura populacional aprovado: mostrar elegíveis/total e motivos de exclusão, sem declarar representatividade estatística.

## Abordagens

1. Agregar por produto: rejeitada porque mistura configurações, lotes e premissas de custo.
2. Comparar configuração congelada e quantidade, projetando evidências em leitura: recomendada e escolhida no recorte aprovado. Mais conservadora, podendo produzir amostra pequena.
3. Gravar alertas e tarefas com estados: adiada; acrescentaria fluxo e persistência não pedidos.

## Comparabilidade verificável

Ler somente a PricingSnapshot V2 já validada pelo vínculo comercial congelado. Não reconstruir custo passado com catálogo atual. Uma assinatura canônica inclui produto, quantidade e todos os campos produtivos congelados: tecnologia; materiais (referência/versão, unidade, preço, consumo e desperdício); impressora (referência/versão e valores); tempos de máquina/setup/acabamento; energia, manutenção, trabalho, provisão de falhas e extras (referência/versão, base, quantidade e custo). Ordenar coleções semanticamente sem eliminar duplicatas; normalizar decimais equivalentes. Excluir nomes de exibição e parâmetros comerciais: canal, taxas, modo de precificação, markup, margem alvo e preço informado.

Incluir versões e valores produtivos é escolha conservadora do implementador: mudança de premissa separa grupos, mesmo quando se poderia argumentar equivalência física. Assinatura representa equivalência das premissas registradas, não certifica identidade física de cor/geometria/arte não registradas. Mostrar configuração e essa limitação. Sem produto, memória válida ou entrada V2 integralmente legível: não agrupar por descrição, informar indisponibilidade.

## Elegibilidade e independência

Excluir canceladas, pendências comerciais, ausência de data, data fora da janela, entrega parcial, custos provisórios/incompletos, conferência ausente ou desatualizada, composição indisponível ou não reconciliada. Reutilizar reconcileProductiveLine e cobertura do motor, sem substituir pela cobertura financeira de contribuição (frete/taxas não definem desvio produtivo). Exigir confirmação de linha vigente mesmo na consignação; não deduzir conferência do custo completo.

Rastrear cada fonte a productionLine.id, unidade mínima independente disponível no modelo; origens acabadas distintas da mesma linha de produção compartilham essa chave. Entregas, perdas produtivas já atribuídas e vendas em consignação devem manter esse vínculo. Estoque de abertura sem linha produtiva rastreável fica inelegível. Falta de chave nunca vira independência presumida. Não inferir ordem produtiva independente a partir de id de entrega.

Escolha conservadora para evitar pseudorrepetição: entre todas as linhas candidatas da janela, construir componentes conexos por pedido ou chave produtiva compartilhada, antes da separação por configuração e da exclusão por cobertura. Um componente só pode sustentar uma observação. Se contiver mais de um pedido ou mais de uma linha, mostrar como evidência dependente, fora do denominador e do numerador; não selecionar arbitrariamente a linha mais favorável, somar linhas para atingir R$ 5 nem tratar linhas do mesmo pedido como repetições. Usar a janela completa para detectar compartilhamento, mesmo se o usuário filtrar produto. Não afirmar independência fora da janela.

Amostra elegível N é o número de pedidos independentes com exatamente uma linha elegível para o grupo. Desvio material por linha: actualProductive - expectedProductive >= 5 e (actualProductive - expectedProductive) * 100 >= expectedProductive * 10, com expectedProductive > 0. Sugestão somente se N >= 5, K >= 3 e K * 100 >= N * 60. Não avaliar por média ou somente entre linhas desviantes. Não compensar diferenças de componentes para inventar causa.

## Consulta e apresentação propostas

Seção própria em /rentabilidade com janela fixa de 90 dias explicitada e leitura independente dos filtros temporais/rankings atuais. O filtro de produto dessa seção seleciona linhas, não pedidos inteiros; paginação apenas após o cálculo da população. Sem filtros de cobertura que removam silenciosamente o denominador. Explicar a diferença para o relatório existente. Mostrar critérios sempre, grupos sem amostra suficiente e grupos sem recorrência, evitando que vazio pareça ausência comprovada de desvios.

Por grupo: produto, quantidade, configuração resumida, N, K, fração K/N, total candidato e exclusões por motivo (contagem de motivos pode sobrepor). Texto de ação: “Conferir a ficha”, com observação de que a diferença não demonstra sua causa. Abrir evidências por pedido/linha, data, memória, revisão/conferência vigente ou vencida, previsto/realizado produtivos, diferença em reais/percentual, componentes, valores conhecidos, status provisório/incompleto e parcela não reconciliada. Exibir ids/fontes existentes e links autorizados ao detalhe; não atribuir custo individual de componente a uma fonte quando o DTO só fornece o agregado.

Perdas produtivas vinculadas entram uma única vez, conforme E2.2. Perdas sem venda e perdas em custódia ficam nos indicadores próprios, sem transformar em falha fabril. Provisão prevista de falhas não é custo causal medido. Preço, desconto, frete, encargos e comissão não entram no teste. Depreciação, contribuição, resultado e caixa permanecem separados.

Usar shadcn do projeto, componentes administrativos existentes, tabelas com rolagem local, cabeçalhos acessíveis, expansão por teclado e estados vazios claros. Sem botão que grave revisão da ficha ou confira dados automaticamente.

## Validação e entrega

Testes sintéticos de fronteira (5 pedidos, 3/5, 3/6, 10%, R$ 5), zero, decimais, múltiplas configurações/quantidades, mesma produção com várias origens, dependência transitiva, linhas do mesmo pedido, cancelamentos, perdas e custo não reconciliado. Asserções de invariância a preço/desconto/frete/taxas/comissão e paginação. Integração READ ONLY em PostgreSQL sintético descartável exclusivo, com contagem de revisões/apurações antes/depois; não usar bancos em uso por outros chats. Autorização ADMIN/OPERATOR, prévia sintética responsiva e teclado; tipos/lint/build e regressões pertinentes.

Atualizar PENDENCIAS e ROADMAP ao entregar, distinguindo desenho/implementação/testes/aceite. Sem push, PR, merge, publicação, migração operacional ou alteração de contêineres existentes. Versão 1.22.0 preservada nesta preparação; futura PR deve reconferir main, incrementar uma vez e sincronizar manifestos/notas/APP_VERSION. Acesso efetivo agora irrestrito no ambiente; isso não amplia a autorização externa.
