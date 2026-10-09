# U4 — Rentabilidade operacional

Data: 09/10/2026. Base de código examinada: `edd0afc`.

Status: especificação para revisão. Escopo de abertura aprovado em 09/10/2026; esta especificação ainda não foi aprovada. Próxima etapa: plano de implementação após revisão deste documento.

## 1. Objetivo e limites

O ADMIN deve explicar a diferença entre custo previsto e realizado, contribuição operacional e resultado após depreciação por pedido, produto e canal. Documentos comerciais, preços, parcelas e recebimentos permanecem nas fontes existentes. U4 não cria movimentação física nem financeira.

Inclui memória de cálculo, cobertura por componente, complementos administrativos auditáveis, canal efetivo e agrupamentos. Exclui DRE, rateio de despesas fixas de período, metas, cenários, devolução comercial/financeira e publicação automática. Os indicadores seguem a convenção gerencial de U1, sem se apresentarem como lucro líquido ou demonstração contábil.

## 2. Fontes e identidades

| Dado | Fonte autoritativa |
| --- | --- |
| Receita e quantidades | Venda confirmada, seus itens e totais comerciais |
| Previsão produtiva | DocumentCostRevision congelada e PricingSnapshot V2 válido |
| Produção | Eventos, origens, compromissos, entregas líquidas e revisões U3 |
| Valorização de materiais | U2, através do cálculo de custos U3 |
| Canal efetivo e complementos | Revisões administrativas U4 |
| Recebido e a receber | Serviço financeiro existente, somente para contexto |

Identidade de linha: `SaleItem.lineKey`; histórico sem chave usa `legacy:<SaleItem.id>` exclusivamente para identificação, sem fabricar vínculo de custo. Produto usa seu ID, com descrição histórica da linha disponível. Linhas livres ficam em “Sem produto vinculado”.

Canal efetivo reutiliza PricingChannel como identidade, com nome e versão copiados para a revisão U4. Não depende do canal da estimativa e não muda ao editar o cadastro. Canal ausente aparece como “Não informado”; isso não impede cálculo monetário quando todos os custos estiverem documentados. Canais inativos permanecem legíveis no histórico.

## 3. Base temporal e população

Filtro padrão: mês civil corrente em America/Sao_Paulo, por confirmação da venda. Usar o primeiro CommerceEvent da venda com ação CONFIRM ou CONVERT, ordenado por createdAt e ID. CONVERT é confirmação válida da venda originada de orçamento. Não usar emissão do orçamento, vencimento, recebimento ou updatedAt.

Sem evento comprovável, mostrar em filtro separado “Sem data de confirmação”; não inferir data nem inserir a venda em um período arbitrário. Datas inicial e final são inclusivas como dias civis, convertidas para intervalo de instantes com limite final exclusivo. Intervalo inválido é recusado.

O título informa “Vendas confirmadas no período — resultado acumulado atualizado”. A data dos custos não limita o cálculo: correções posteriores afetam a visão atual da mesma coorte. Não é resultado econômico reconhecido no mês.

Rascunhos ficam fora. Canceladas aparecem em visão de exceções com custos conhecidos, sem receita nem margem consolidadas com vendas normais. Venda normal não entregue aparece na população e na previsão; seu realizado permanece parcial/provisório.

## 4. Receita, previsão e fórmulas

Receita R = subtotal − desconto + frete cobrado. Usar valores comerciais salvos; frete cobrado entra uma única vez. Recebimentos, compras e baixas de caixa não são somados nem deduzidos como custos do pedido.

Para cada cenário (previsto/realizado):

- V = custo produtivo sem depreciação, incluindo extras produtivos aplicáveis.
- E = encargos comerciais, incluindo taxas percentuais e cobrança fixa.
- F = frete pago pelo vendedor.
- D = depreciação produtiva.
- Contribuição operacional = R − V − E − F.
- Resultado após depreciação = R − V − E − F − D.
- Margem = contribuição / R × 100; R igual a zero produz margem indisponível.

Valores negativos permanecem explícitos. V inclui mão de obra e manutenção conforme U1/U3; esses componentes não significam necessariamente saída de caixa individual.

Previsão exige snapshot V2 congelado, vínculo VALID, identidade e quantidade compatíveis. Ausência, versão sem componentes compatíveis ou vínculo inválido tornam o componente indisponível. Não recalcular o histórico usando tabelas atuais.

V previsto soma material, energia, manutenção, falhas, mão de obra e extras da memória. D vem da depreciação. A cobrança fixa do canal sai do grupo produtivo e entra em E, sem alterar o total. Preservar a cobrança fixa de cada memória vinculada, inclusive em pedido multitem; não supor que valores repetidos representem uma única tarifa de pedido.

Taxas percentuais previstas são reaplicadas sobre a receita negociada de cada linha após desconto, sem frete cobrado, conforme a base de venda de produtos usada em U1. A memória informa essa base. Diferenças entre a base efetiva do canal e a premissa estimada são resolvidas pelo valor efetivo declarado, sem alterar a previsão congelada.

Frete pago previsto não existe em U1: é complemento estimado U4 obrigatório para a previsão completa, admitindo zero explícito. Revisões desse complemento permanecem históricas e não se apresentam como estimativas feitas na confirmação quando informadas posteriormente. Preço sugerido de U1 é referência separada, nunca receita da venda.

## 5. Realizado e alocação produtiva

Usar entregas líquidas (entrega original mais correções) para o custo realizado atribuído à venda. Compromissos ainda reservados aparecem separadamente como custo alocado não entregue. Nenhum desses grupos será somado duas vezes.

Para origem produtiva, reutilizar valorização e distribuição U3 por origem e destino. U4 necessita da decomposição por componente: estender o cálculo puro de distribuição U3 para aplicar os mesmos pesos a cada componente, mantendo o total já existente como autoritativo. Distribuir depreciação com limite do total de cada destino; o restante do total define o custo sem depreciação. Resíduos dos demais componentes são reconciliados de modo determinístico com esse subtotal. Testes devem provar conservação dos totais, componentes e não negatividade nos casos válidos.

Ordem de estoque pode atender várias vendas: cada entrega recebe somente sua alocação. Nunca atribuir o custo integral da ordem a cada venda. Cancelamento/fechamento sem peças boas não transforma custo em zero.

Origens OPENING/ADJUSTMENT com initialValue conhecido usam esse valor total e as unidades de entrada para rateio. Sem decomposição, o custo total pode ser conhecido e o resultado após custo total pode ser calculado, mas contribuição antes de depreciação fica indisponível. A interface deve usar o rótulo “Resultado após custo total — composição indisponível” nesse caso. initialValue ausente continua desconhecido; U4 não permite preencher arbitrariamente o custo produtivo legado.

Perdas absorvidas pelo custo das peças boas já estão na origem e não geram dedução extra. Perda sem peças boas de linha encerrada vinculada diretamente à venda é atribuída à respectiva linha comercial, uma vez. Perdas físicas de origens, saídas de ajuste e perdas de ordens sem vínculo comercial permanecem em painel separado de perdas não atribuídas, com data do fato e fonte, fora dos totais de pedidos. Esse painel tem filtro temporal próprio, explicitamente distinto da coorte de vendas.

Nenhum complemento manual pode registrar como despesa adicional uma perda ou consumo já presente no custo U3.

## 6. Complementos, conferência e correções

Uma revisão U4 por venda contém canal efetivo, frete previsto, encargos comerciais efetivos, frete efetivo, extras efetivos por linha, conferência de extras e situação comercial excepcional. Cada valor distingue UNKNOWN de DECLARED; zero exige ação explícita. Valores efetivos são informados como montantes, não inferidos de pagamentos ou tarifas atuais.

Encargos comerciais efetivos cobrem integralmente taxas e cobranças fixas da venda, substituindo os estimados apenas no realizado. Frete efetivo é o custo do vendedor, separado do cobrado do cliente. Não se permite sobrescrever material, energia, manutenção, mão de obra ou depreciação U3 por valor digitado.

Cada extra previsto em U1 precisa de conferência: coberto por fonte U3 identificada, substituído por complemento efetivo ou não ocorrido com justificativa. Extra novo efetivo também pode ser registrado. Não ocorrido não equivale a esquecimento: exige registro expresso. Mesmo sem extras previstos, o ADMIN declara que não há outros extras ou registra os existentes.

Referência U3 usada na conferência não acrescenta valor; apenas comprova cobertura no custo produtivo. Conferências não podem utilizar duas vezes a mesma parcela da fonte. Complemento novo exige identificador de origem/documento, descrição, linha e declaração de que não está em U3. O sistema bloqueia referências duplicadas identificáveis; a confirmação do ADMIN é necessária para despesas sem documento verificável.

Revisões são imutáveis: salvar nova revisão substitui a visão vigente e preserva anterior, autor, instante, data efetiva e motivo. Correção exige justificativa e referência da revisão substituída. Valores de substituição são não negativos; remover um complemento é operação explícita na revisão, não exclusão física. Não criar débitos/créditos financeiros.

Escrita usa expectedVersion e operationKey. Repetição de mesma chave, autor e payload devolve o resultado anterior; mudança de payload conflita. Autorização vigente é verificada antes de replay. Concorrência não pode substituir silenciosamente revisão recém-salva. Rascunho, payload e chave ficam preservados após resposta incerta até recuperação.

## 7. Cobertura e exceções

Cobertura é calculada por componente e indicador; não há um único booleano que transforme todo o pedido em conhecido.

| Estado | Regra |
| --- | --- |
| Indisponível | Nenhuma base suficiente para aquele indicador |
| Parcial | Existem valores conhecidos, mas faltam quantidades, componentes ou conferências |
| Provisório | Componentes presentes, mas fonte provisória ou execução ainda aberta |
| Completo | Todas as quantidades entregues, fontes encerradas/definitivas e complementos conferidos para o indicador |

Ordem relevante ainda aberta, valorização provisória, demanda não entregue ou perda vinculada não valorizada impedem realizado completo. O relatório mostra subtotais conhecidos e motivos; contribuição realizada numérica só é publicada quando sua cobertura está completa. Previsão completa pode existir antes de entrega.

Declarações de extras são vinculadas ao fingerprint das fontes conferidas. Alteração dessas fontes exige nova conferência. Canal desconhecido não invalida custos; separação de depreciação ausente invalida contribuição, mas pode conservar resultado após custo total.

Devolução comercial não é deduzida a partir de uma correção U3. Correção física reabre cobertura quando reduz entrega líquida. ADMIN pode marcar “Pendência comercial/devolução”, com motivo; essa marca exclui a venda dos indicadores consolidados até resolução explícita documentada. U4 não oferece valor de reembolso nem ajuste da receita original. Canceladas ficam sempre excluídas dos indicadores normais, mesmo quando tenham recebido pagamentos.

## 8. Rateio e agregação

Desconto: proporcional ao valor bruto de cada linha. Frete cobrado, frete pago e encargos efetivos do pedido: proporcionais à receita de produtos após desconto. Se essa soma for zero, usar quantidades; se não houver quantidades válidas, recusar cálculo como fonte inconsistente. Extras e perdas diretamente identificados pertencem à linha indicada.

Usar decimal de precisão compatível com U1/U3. Distribuir em unidades mínimas (centavo para valores comerciais; seis casas para custos) pelo método dos maiores restos, com desempate pela posição e chave de linha. Não permitir total negativo como artefato de arredondamento. A soma dos rateios fecha exatamente com a origem; apresentação arredonda a duas casas e identifica eventuais diferenças de exibição de custos subcentavo.

Grupos por produto e canal efetivo são derivados do mesmo conjunto de pedidos. Não calcular total apenas da página visível. Para cada indicador, mostrar população total, quantidade e receita cobertas, valor conhecido e exclusões. Consolidar contribuição completa somente de pedidos com contribuição completa; resultado após custo total tem sua própria cobertura. Margens agregadas dividem as somas do mesmo conjunto.

Comparação de variação exige ambos os cenários completos no mesmo conjunto. Variação de custo = realizado − previsto; variação de contribuição = realizada − prevista. Não comparar universos diferentes sem aviso nem calcular média simples de margens.

## 9. Arquitetura e persistência

Domínio puro em `src/domain/profitability`: tipos/validação, rateio, cobertura, cálculo e agregação. Serviços em `src/server/profitability`: leitura das fontes, revisões administrativas, apuração e consultas. UI e rotas privadas próprias; não incluir campos U4 nos DTOs públicos ou operacionais.

Adicionar modelos próprios, com nomes finais definidos no plano:

- Estado administrativo por venda, versão e ponteiro da revisão vigente.
- Revisão administrativa imutável: payload validado/versionado, predecessor, autor e datas.
- Registro idempotente de comandos U4, isolado do cache operacional U3.
- Apuração imutável por venda: versão do motor, fingerprint das fontes, IDs de revisões, entradas necessárias à reprodução, resultados/coberturas e instante de apuração.

Relacionamentos com venda e autor usam restrição de exclusão; índice único impede duplicação de revisão por versão e de apuração por fingerprint/versão do motor. Dinheiro em JSON é string decimal validada, nunca ponto flutuante binário. Migração aditiva não preenche custo ou canal histórico.

Consultas GET são somente leitura. Elas montam uma visão coerente das fontes em transação de leitura RepeatableRead e executam o cálculo puro para refletir o estado atual. Extrair o montador puro de custos U3 hoje acoplado a ensureProductionCostRevision, preservando comportamento de seus chamadores; leitura U4 não deve chamar helper que escreve revisão ou toma locks de escrita.

Ação explícita “Registrar apuração” guarda a memória calculada numa transação coerente. A apuração registra o estado observado, não promete impedir fatos posteriores. O histórico identifica revisões antigas; leitura atual compara fingerprints e sinaliza diferenças. Alterações de compra/valorização precisam entrar no fingerprint, mesmo sem mudança da venda ou da ordem. Não selecionar simplesmente a última revisão U3 como prova de atualização.

Leituras carregam fontes em lotes, com filtros e paginação validada. Agregações abrangem toda a população filtrada numa mesma visão consistente; não fazer atualização de todos os pedidos ao abrir a página. Erro de leitura nunca retorna totais parciais apresentados como relatório completo. Para escritas, seguir ordem de locks existente (venda antes de recursos subordinados), revalidar versão e tratar conflito com mensagem recuperável.

## 10. Interface e proteção

Rota `/rentabilidade`, navegação ADMIN. Filtros por confirmação, situação, produto, canal e cobertura; resumo com receita da população, valores cobertos e contadores; lista de pedidos; agrupamentos por produto/canal. Detalhe do pedido apresenta previsto/realizado, diferenças, componentes, fontes, lacunas, revisão administrativa e histórico de apurações.

Formulário separa previsões de valores efetivos e exige escolha explícita para zero. Nenhum clique em “Atualizar visão” escreve valores ou fecha conferência. Mensagens em português, navegação por teclado, estados vazio/erro/carregamento e layout utilizável em 390 e 1440 pixels.

Página, rotas, serviços e replay exigem ADMIN ativo, consultado no momento da operação. Autenticação/origem/validação seguem os padrões existentes. Sem dados de custos em cache compartilhado público, DTO OPERATOR, catálogo ou mensagem de erro. Proteção deve ser testada diretamente nas APIs, não apenas pela ausência do menu.

## 11. Aceite verificável

1. R=200, V=80, E=10, F=20, D=5: contribuição 90, margem 45%, resultado 85. Recebimento não altera esses valores.
2. Preço sugerido diferente do negociado: previsão usa receita negociada e taxas sobre produtos líquidos; o snapshot permanece intacto.
3. Frete/taxa desconhecidos bloqueiam indicador; zero explícito resolve somente a lacuna correspondente.
4. Pedido com linhas 100 e 50 e desconto 30: receitas de produtos 80 e 40. Frete 12 rateia 8 e 4. Linhas gratuitas e base toda zerada exercitam fallback por quantidade.
5. Ratear 0,01 entre três pesos iguais conserva 0,01 e desempata pela ordem estável. Repetir cálculo produz o mesmo resultado.
6. Uma origem atende duas vendas: soma dos custos atribuídos e saldos fecha com a origem. Compra, consumo e pagamento não triplicam custo.
7. Perda com peças boas não é duplicada; linha encerrada sem boas e vinculada à venda conserva perda; perda sem vínculo fica separada.
8. Entrega parcial/reimpressão/correção não gera contribuição completa prematura. Peças de abertura sem composição permitem somente indicadores suportados.
9. Compra valorizada tardiamente altera visão atual e fingerprint, preservando apuração antiga, documentos, parcelas e saldos.
10. CONFIRM e CONVERT entram na coorte correta, incluindo limites de dia em São Paulo. Ausência de evento e cancelamento não contaminam a população normal.
11. Cobertura agregada usa o mesmo universo de numerador/denominador; filtros e paginação não alteram totais indevidamente.
12. Extra coberto por U3 não soma novamente; mudança de fonte invalida conferência; fonte repetida é recusada.
13. Salvar/repetir/corrigir revisão testa autorização atual, idempotência, conflito de versão e rollback. Apuração histórica é reproduzível.
14. ADMIN/OPERATOR/anônimo/inativo testados; computador/celular sem perda de rascunho após erro ou timeout.

## 12. Validação e implantação

Antes de código, ler os guias relevantes de `node_modules/next/dist/docs/`, conforme AGENTS.md. Plano de execução deve separar domínio, persistência, integração de fontes, interface e validação. Usar banco isolado para integração, sem apontar testes ao operacional.

Executar testes de regras e integrações acima, regressões pertinentes U1/U2/U3/financeiro, tipos, lint, build e inspeção de interface. Migração deve ser ensaiada em cópia restaurada, comparando conteúdo das tabelas preexistentes. Publicação requer backup corrente verificável e recuperação coordenada da aplicação/banco, preservando novas revisões se já existirem.

Esta etapa produziu documentação e inspeção estática. Não houve teste novo de aplicação, alteração de código, migração ou implantação.
