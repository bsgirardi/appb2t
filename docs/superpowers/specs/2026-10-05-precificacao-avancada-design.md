# B2T — U0/U1: diagnóstico e precificação avançada

Data: 05/10/2026. Status: especificação detalhada aprovada pelo usuário, autorizando a elaboração do plano técnico. Origem: [Plano Diretor aprovado](2026-10-05-plano-diretor-upgrade-b2t.md).

## 1. Resultado e limites

A equipe deve preparar uma estimativa de lote com materiais, máquina, trabalho e despesas comerciais, explicar seu preço e preservar essa memória nos novos documentos. Produtos, orçamentos e vendas atuais continuam funcionando. A modalidade antiga permanece reproduzível.

U0 confirma o comportamento atual em ambiente isolado. U1 acrescenta o motor e a experiência avançada, parâmetros administrativos, memória privada de custos e vínculo com os documentos. Não inclui estoque, compras, ordens produtivas, custo realizado, kits, importação de arquivos, tributação automática ou integrações de pagamento. Simulações não movimentam dinheiro nem materiais.

Esta especificação foi produzida por leitura do código e documentação, sem executar fluxos ou testes nesta etapa. As decisões novas abaixo são propostas de produto e precisam da revisão deste documento.

## 2. Diagnóstico U0 antes da implementação

Registrar a versão do código usada na validação e reproduzir em banco exclusivo de teste:

1. Cálculo FDM e resina do caso legado definido na seção 5.
2. Produto com custo salvo e preço final diferente da sugestão; editar custo sem publicar outro preço.
3. Orçamento com produto e linha avulsa, emissão e conversão em venda; verificar cópias históricas e unicidade da conversão.
4. Confirmação da venda, parcelas, recebimento parcial e estorno; garantir ausência de recebíveis duplicados.
5. ADMIN e OPERATOR, impedimento de visitante, exibição pública sem custos e erro de edição concorrente.

Registrar resultado por cenário e evidência, separando falha observada de comportamento desejado. Falhas que impeçam preservar esses contratos exigem correção delimitada antes de U1. Não usar nem limpar dados operacionais reais. A validação histórica existente não substitui esta linha de base.

## 3. Entradas da modalidade avançada

Cada estimativa representa um lote homogêneo de um produto, com uma tecnologia e uma impressora. Produtos compostos por processos mistos e várias máquinas ficam para evolução posterior.

| Grupo | Dados e significado |
| --- | --- |
| Lote | Quantidade inteira de unidades boas pretendidas, de 1 a 100.000 |
| Materiais | De 1 a 20 linhas; referência e versão do cadastro, nome, preço por kg/litro, consumo útil por unidade e desperdício planejado fixo do lote |
| FDM | Consumo em g e preço em R$/kg; desperdício pode representar purga |
| Resina | Consumo em ml e preço em R$/litro; desperdício planejado em ml, sem conversão de densidade |
| Máquina | Referência, potência, aquisição, meses/dias/horas de amortização; minutos fixos do lote e minutos equivalentes por unidade |
| Custos produtivos | Energia em R$/kWh, manutenção em R$/hora de máquina e reserva percentual para falhas |
| Trabalho | Preparação em minutos por lote, acabamento em minutos por unidade, tarifa de trabalho em R$/hora |
| Complementos | Até 30 linhas com descrição, quantidade por lote ou unidade e custo unitário; inclui embalagem, fixação, pintura e insumos |
| Canal | Perfil administrativo, taxas percentuais sobre receita dos itens e despesa comercial fixa por lote; cada componente deve ter rótulo |
| Preço | Modalidade: markup sobre custo completo, margem de contribuição alvo ou preço unitário informado |
| Quantidades | Até 10 cenários adicionais de quantidade; recalculam o mesmo modelo de lote |

Tempo equivalente por unidade não significa que todas as peças sejam impressas sequencialmente. A tela explica a premissa e permite informar tempo fixo total de uma placa e tempo unitário zero. Para simular outra ocupação de placa é preciso revisar os tempos; o sistema não infere capacidade nem fatiamento.

O desperdício planejado já informado não é contabilizado novamente como material útil. A reserva de falhas é uma provisão adicional e explícita de custo, não uma quantidade prevista de estoque nem uma taxa probabilística de reimpressão.

Não fornecer tarifas presumidas. Parâmetros novos começam não configurados; zero é válido quando informado explicitamente. A modalidade antiga continua disponível enquanto o administrador configura a nova.

## 4. Fórmulas e significado dos resultados

Usar decimal com 40 algarismos de precisão e HALF_UP, preservando intermediários. Percentuais abaixo são frações. N é a quantidade; T é o tempo de máquina do lote em horas.

- T = (minutos fixos + N × minutos por unidade) / 60.
- Material = soma de ((N × consumo útil por unidade + desperdício fixo) / 1000 × preço por kg/litro).
- Energia = T × potência / 1000 × tarifa de energia.
- Depreciação = T × aquisição / (meses × dias/mês × horas/dia).
- Manutenção = T × tarifa de manutenção por hora.
- Base de falhas = material + energia + manutenção. A nova reserva não incide sobre depreciação nem trabalho e complementos.
- Reserva de falhas = base de falhas × percentual de falhas.
- Trabalho = (preparação + N × acabamento) / 60 × tarifa horária.
- Complementos = soma das linhas fixas do lote e das linhas por unidade multiplicadas por N.
- V = material + energia + manutenção + reserva de falhas + trabalho + complementos + despesa comercial fixa do lote.
- D = depreciação. Custo completo modelado C = V + D.
- f = soma das taxas proporcionais do canal; não há incidência de uma taxa sobre outra.

V é a base de custos tratados como variáveis nesta simulação. Trabalho é precificado por atividade; quando representar salário fixo, o resultado não equivale a uma DRE contábil. A interface identifica essa premissa e chama o resultado de contribuição estimada. Depreciação é exibida separadamente e não entra como saída de caixa.

### Preço sugerido e efetivo

- Markup m sobre custo completo: receita teórica R = C × (1 + m) / (1 − f). A taxa é recuperada pelo denominador; com f = 0, mantém a interpretação usual do markup.
- Margem de contribuição alvo g: R = V / (1 − f − g). Exigir f + g < 1. A modalidade não garante cobertura da depreciação; a tela mostra aviso quando o resultado após depreciação for negativo.
- Preço informado p: R = N × p. Não existe preço mínimo obrigatório; mostrar prejuízo e preservar a decisão comercial.
- Nos modos sugeridos, preço unitário ofertável = R / N arredondado para 2 casas HALF_UP; receita ofertável = preço unitário ofertável × N. Recalcular taxas e margens sobre essa receita, sem prometer igualdade exata com a margem alvo após arredondamento.
- Taxas estimadas = receita ofertável × f. Contribuição estimada = receita ofertável − taxas − V. Resultado após depreciação = contribuição − D. Margem de contribuição = contribuição / receita ofertável; se receita zero, exibir “não aplicável”.

Memória e indicadores usam intermediários decimais; apresentação monetária usa 2 casas e informa a possível diferença de centavos entre componentes arredondados. Essa estimativa de taxas não gera lançamento financeiro.

### Quantidades

Cada cenário repete as mesmas fórmulas para outro N. Preparação, desperdício fixo, tempo fixo e despesas fixas são cobrados uma vez por cenário. Custos e tempos unitários multiplicam N. Resultados não viram descontos automáticos nem alteram o catálogo; aplicar cenário exige seleção explícita. Mostrar que extrapolar quantidades pressupõe as mesmas condições de máquina e lote.

## 5. Exemplos obrigatórios de aceite

### Legado

Caso já existente em tests/unit/calculation.test.ts: 100 g a R$ 100/kg, 2 horas, 100 W, energia R$ 1/kWh; aquisição R$ 2.400 em 12 meses × 25 dias × 8 horas; manutenção 10%, falhas 10%, acabamento 10%, fixação R$ 0,20, markup 200%.

Devem permanecer: material 10; energia 0,2; máquina 2; manutenção 1,02; subtotal 13,22; falhas 1,322; acabamento 1,322; total 16,064; preço 48,192. A mesma entrada de consumo em ml/litro reproduz o resultado para resina. Nenhuma fórmula V2 será aplicada a esse registro.

### Lote avançado

N = 10. Material A: 10 g/unidade, 10 g de purga fixa, R$ 100/kg → R$ 11. Material B: 5 g/unidade, sem purga, R$ 200/kg → R$ 10. Máquina: 120 minutos fixos, zero por unidade, 100 W, energia R$ 1/kWh → R$ 0,20. Depreciação R$ 1/h → R$ 2. Manutenção R$ 0,50/h → R$ 1. Falhas 0%.

Preparação 30 minutos e acabamento 3 minutos/unidade, tarifa R$ 20/h → R$ 20. Embalagem R$ 1/unidade → R$ 10. Despesa comercial fixa R$ 2/lote. V = R$ 54,20; D = R$ 2; C = R$ 56,20. Taxa f = 10%.

| Modalidade | Receita teórica | Preço unitário ofertável | Receita ofertável | Contribuição | Resultado após depreciação |
| --- | --- | --- | --- | --- | --- |
| Markup 100% | 124,888888… | 12,49 | 124,90 | 58,21 | 56,21 |
| Contribuição alvo 30% | 90,333333… | 9,03 | 90,30 | 27,07 | 25,07 |
| Preço informado R$ 8 | 80,00 | 8,00 | 80,00 | 17,80 | 15,80 |

Na margem alvo, margem efetiva é aproximadamente 29,98%, consequência do arredondamento unitário. No cenário N = 20, mantendo as premissas fixas, material = 41; energia = 0,2; manutenção = 1; trabalho = 30; embalagem = 20; despesa comercial = 2; V = 94,2 e D = 2. O tempo permanece 2 horas porque o exemplo usa somente tempo fixo; a interface deve deixar isso evidente.

Casos adicionais: custo completo R$ 10, taxa 0% e preço R$ 8 mostram resultado −R$ 2; preço zero permite resultado negativo e margem não aplicável; f = 20% e g = 80% são recusados; custo zero não produz divisão por zero; troca de markup 200% para margem não transporta 200% para o novo campo.

## 6. Validação e permissões

Valores de entrada são decimais não negativos, com até 6 casas, sem notação científica, NaN ou Infinity; aceitar vírgula decimal sem separador de milhar. Preservar limites atuais de máquina: meses 1–1200, dias 1–31, horas/dia > 0 e ≤ 24. Limite decimal de entrada: 999999999999,999999. Valores monetários persistidos em 2 casas respeitam Decimal(18,2), inclusive totais; resultados excedentes são recusados antes de gravar.

Tempo total de máquina e soma do consumo útil devem ser positivos. Consumo total por linha ≤ 1.000.000 g/ml; tempo de máquina ≤ 100.000 horas. Preparação ≤ 6.000.000 minutos por lote; acabamento ≤ 6.000.000 minutos por unidade, sujeito aos limites de resultados. Falhas entre 0 e 100%; markup ≥ 0; taxas individuais ≥ 0 e soma < 100%; margem alvo ≥ 0 e < 100%, além da restrição de denominador. Quantidades de complementos aceitam decimais; contagem de peças permanece inteira.

Materiais devem corresponder à tecnologia e preços de cadastro. ADMIN configura preços, energia, manutenção, trabalho, falhas, perfis e metas de preço. OPERATOR seleciona referências/perfis, informa consumo, quantidade e tempos e mantém a capacidade comercial existente de negociar preço final; não substitui tarifas administrativas. Custos unitários de complementos são definidos por ADMIN em um cadastro simples de referências de custo, sem saldo de estoque; OPERATOR informa quantidades.

Cada campo de modalidade guarda seu próprio valor; trocar modo usa o padrão configurado ou o último valor daquele modo. Atualizar parâmetros exige ação explícita e mostra as alterações antes de substituir o rascunho. Novos cálculos não selecionam referências inativas; registros históricos continuam legíveis. Verificações de autorização e cálculos persistentes acontecem no servidor.

## 7. Experiência e ações

Na calculadora, manter “Cálculo original” e oferecer “Cálculo por lote”. Organizar o novo fluxo em lote/materiais, máquina/trabalho, complementos/canal e resultado. Resumo mostra quantidade, custo unitário, preço unitário, receita, contribuição e resultado após depreciação, com acesso à memória completa. Valores inválidos não mostram um preço válido anterior como se fosse atual.

Ações distintas: simular; aplicar ficha ao rascunho de produto; anexar estimativa ao item de orçamento; usar preço sugerido. Salvar produto e emitir orçamento mantêm seus efeitos atuais e confirmações visíveis. Nunca juntar publicação, venda e produção no mesmo botão.

ADMIN pode configurar referências ausentes; OPERATOR recebe orientação para solicitar configuração. Formulários mantêm dados em falha ou conflito, usam rótulos e mensagens por campo, navegação por teclado e apresentação funcional em 390 px. Campos de custo ficam exclusivamente na área interna; impressão da proposta para cliente não inclui esses dados.

## 8. Compatibilidade, memória e documentos

### Produtos e versão do motor

Objetos de cálculo existentes sem versão são V1. O leitor não regrava esses JSONs apenas por consultá-los. Novos cálculos avançados recebem versão explícita V2, entradas, resultados recalculados pelo servidor, data, responsável e referências/versões dos parâmetros usados.

Reutilizar Material, Printer e Product, sem duplicar cadastros. Novos perfis de canal, parâmetros V2 e referências de complementos possuem versão e estado ativo. A ficha V2 de produto é interna; materialId antigo deixa de ser a única fonte para composição múltipla. Contratos públicos continuam expondo somente campos comerciais permitidos.

Converter ficha V1 para V2 é uma cópia para rascunho, com quantidade inicial 1 e consumo/tempo originais como totais do lote. Manutenção percentual, acabamento percentual e fixação não são convertidos silenciosamente em tarifas horárias ou complementos. Exibir pendências de revisão e exigir preenchimento explícito antes de aplicar a nova ficha. Preservar a ficha V1 anterior no histórico da alteração. Preço final permanece igual até ação comercial explícita.

### Orçamentos e vendas

Memórias de custo por item são privadas e separadas da cópia comercial usada na impressão. Não adicionar custos ao objeto compartilhado com o cliente. Uma linha pode ter memória V2 anexada ou “sem estimativa”; ausência não equivale a custo zero.

Anexar estimativa vincula-a à identidade estável da linha e à quantidade calculada. A implementação deve acrescentar identidade de linha onde ela não existir; posição no array não é identificador. Duplicar ou reorganizar linhas não troca suas memórias. Alterar quantidade invalida a estimativa daquela linha até recalcular/confirmar; alterações de descrição ou referência exigem reconfirmação. Alterar preço preserva custo e atualiza o comparativo interno.

Emitir orçamento congela a memória anexada. Converter orçamento copia a memória para a venda uma única vez, mantendo sua proveniência. Venda direta pode receber estimativas no rascunho; confirmação congela-as. Documentos antigos permanecem sem memória V2 e não ganham custos retroativos.

Nesta entrega, a contribuição por item é antes de descontos e frete do documento. Se houver desconto global ou frete, mostrar “resultado global não apurado nesta etapa”; não somar contribuições como lucro final do pedido. Rateios e rentabilidade global são U4. Não se altera o cálculo do total comercial nem das parcelas.

Quantidades simuladas e preços de cenários não criam tabela pública de descontos. Dados históricos continuam disponíveis quando cadastros forem inativados. Documentos emitidos não consultam parâmetros atuais para reconstruir custo.

## 9. Estrutura de implementação a preservar no plano

Manter o motor V1 em src/domain/calculation e acrescentar motor V2 puro, validação e tipos discriminados, compartilhados entre interface e servidor. Não introduzir outro serviço ou banco.

Adaptar os contratos de produto, os editores de cálculo e os serviços de persistência para suportar ambas as versões. Isolar parâmetros V2 dos parâmetros legados. Acrescentar persistência privada de estimativas comerciais com identidade de linha e origem; a migração será aditiva e testada com documentos anteriores.

Áreas existentes a considerar: src/domain/calculation, src/domain/products, src/domain/commerce, src/components/calculator, src/components/products, src/components/commerce, src/server/products.ts, src/server/quotes.ts, src/server/sales.ts e prisma/schema.prisma. O plano de execução definirá arquivos, interfaces, migrações e testes exatos após aprovação desta especificação.

## 10. Verificação e entrega

Cobrir o caso V1, as três modalidades V2, lote/peça, dois materiais, unidades de resina, desperdício, arredondamento unitário, faixas, zero e limites. Testar denominadores inválidos, negativos, referências inativas e incompatíveis, parâmetros ausentes e resultado excedendo capacidade monetária.

Integração: persistir/reabrir V1 e V2, atualizar parâmetros sem mudar histórico, proteger tarifas contra OPERATOR, emitir/converter com memória privada, reorganizar linhas, invalidar custo por quantidade e não duplicar memória/recebível por reenvio ou concorrência. Verificar que catálogo, APIs públicas e impressão comercial não expõem custos.

Validar rascunhos após falha, conflitos de versão, alternância de modalidade, acesso por teclado e celular. Executar testes relevantes, tipos, lint e build. Consultar os guias Next.js instalados antes de escrever código. Usar banco isolado para testes/migrações; produção exige backup verificado e procedimento de recuperação, sem reversão destrutiva improvisada.

Entregar evidências e limitações reais em docs/VALIDACAO.md. Critério de encerramento: cenários aceitos e preservação dos contratos atuais, não quantidade de telas novas.

## 11. Revisão necessária

Revisar especialmente: definição da contribuição versus depreciação; custos fixos do lote e tempos equivalentes; permissões administrativas; limites da estimativa por item quando há desconto/frete; e transição V1/V2. Após aprovação, escrever o plano técnico de execução em tarefas verificáveis. Esta etapa não altera código nem banco.
