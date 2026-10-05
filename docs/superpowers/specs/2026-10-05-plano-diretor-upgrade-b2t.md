# Plano Diretor de Upgrade B2T — gestão interna integrada

Data: 05/10/2026.

Status: plano diretor aprovado pelo usuário em 05/10/2026, autorizando o detalhamento da primeira entrega. A implementação depende da especificação e do plano de execução da entrega; este documento não os substitui.

## 1. Objetivo e decisões

Evoluir a operação da própria B2T conectando orçamento, venda, produção, materiais, entrega e resultado. A unidade de acompanhamento é o pedido, preservando os vínculos comerciais e financeiros já existentes.

Sucesso significa conseguir responder: quanto cobrar; quais pedidos produzir; se há material; o que atrasou; quanto cada pedido consumiu; e qual foi sua contribuição efetiva para o resultado.

Decisões confirmadas: benchmark Makers Flow, gestão interna integrada e este plano diretor aprovados. A sequência de entregas, o escopo inicial e as regras de integração orientam o detalhamento. A execução direta registrada no planejamento anterior permanece como referência; não se presume autorização para implementar este novo escopo.

Não fazem parte deste ciclo: plataforma para múltiplas empresas, assinaturas, cadastro público de operadores, emissão fiscal, integração bancária, cobrança automática, checkout ou conexão transacional com marketplaces. Kits, consignação e revenda ficam condicionados à necessidade real da B2T. O Makers Flow orienta a comparação, não determina a inclusão de todos os seus módulos.

## 2. Evidência e limites

Base: benchmark autenticado aprovado, README, esquema Prisma, motor de cálculo, contratos comerciais, serviços de vendas e financeiro, especificações anteriores e registro de validação do repositório.

Esta análise do estado da B2T é estática. Não houve nova execução de testes, inspeção do banco ou validação da instalação em uso. Registros em VALIDACAO.md são evidência histórica, não testes executados nesta revisão. Recursos do Makers Flow documentados sem transação permanecem não verificados quanto a seus efeitos.

### Matriz inicial de diferenças

| Área | B2T encontrada | Referência Makers Flow | Tratamento proposto |
| --- | --- | --- | --- |
| Precificação | Material único, energia, depreciação, manutenção percentual, falhas, acabamento, fixação e markup | Múltiplos materiais, lote/peça, mão de obra, canais, margem e quantidade | Ampliar motor com versão e memória de cálculo |
| Materiais e impressoras | Cadastros e parâmetros de custo; FDM e resina | Estoque de materiais e parâmetros de máquinas | Reutilizar cadastros; adicionar movimentos, unidades e rastreabilidade |
| Produtos | Preço independente, cálculo salvo, galeria, coleções e opções comerciais | Catálogo, composição, estoque, kits e faixas | Preservar catálogo; acrescentar ficha produtiva e estoque em etapas |
| Clientes e orçamentos | Cadastro, documentos, estados, impressão e cópias históricas | Cadastro e propostas multitem | Reutilizar; vincular versão do custo ao documento novo |
| Vendas | Venda, prazo, estados operacionais e parcelas | Fluxo comercial e conexão declarada com produção | Evoluir vínculo com ordens, evitando duplicar vendas |
| Produção | Estados EM_PRODUCAO e PRONTA na venda; modelo dedicado de ordem não localizado | Quadro e baixa declarada de materiais | Criar execução por ordem, quantidade, máquina e apontamento |
| Estoque | Material tem preço; modelos de movimentos/reservas não localizados | Filamentos, insumos e produtos acabados | Implementar saldos rastreáveis e reservas |
| Financeiro | Contas, lançamentos, parcelas, baixas, estornos, transferências e caixa | Caixa, compromissos e relatórios | Preservar recebíveis; acrescentar visão de rentabilidade |
| Loja | Catálogo, SEO, opções e lista local para contato | Vitrine com contato e edição visual | Preservar; avaliar captura interna da solicitação posteriormente |
| Gestão | Relatórios de caixa; custo real por ordem não localizado | DRE, canais, metas e projeções | Priorizar previsto versus realizado antes de cenários avançados |

“Não localizado” refere-se ao código examinado. O diagnóstico operacional deve confirmar fluxos e limitações antes de transformar estas linhas em requisitos definitivos.

## 3. Contratos de integração

Fluxo principal: cálculo → orçamento → venda → ordem de produção → entrega. Estoque registra reservas e consumos vinculados à produção; financeiro mantém parcelas e recebimentos vinculados à venda. Um recebimento não conclui produção, e concluir produção não registra recebimento.

- Reutilizar identidades de clientes, produtos, materiais, impressoras, orçamentos e vendas. Não criar cadastros paralelos para os novos módulos.
- Manter dimensões comercial, produtiva, logística e financeira separadas. A apresentação pode reuni-las no pedido. A compatibilidade com os estados atuais será definida na especificação de produção, incluindo pedidos parcialmente concluídos.
- Preservar preço negociado e documentos emitidos. Novas regras de custo não recalculam silenciosamente o histórico.
- Versionar premissas e resultados dos novos cálculos. Histórico sem custo completo deve aparecer como informação indisponível, nunca como lucro integral.
- Movimentos de estoque e financeiros devem ter origem, responsável e data. Correções geram movimentos de compensação; não apagam a trilha.
- Repetir uma requisição, concluir novamente uma ordem ou receber respostas concorrentes não pode duplicar consumo, entrada ou recebível.
- Confirmar venda continua produzindo recebíveis pelo mecanismo existente. Produção não cria uma segunda cobrança.
- ADMIN mantém controle das configurações e financeiro. Permissões operacionais novas serão explícitas; custos e dados internos continuam fora das respostas públicas.
- Preservar precisão decimal, proteção de concorrência, rascunhos em erro e interface em português para computador e celular.

## 4. Entregas e dependências

| ID | Entrega | Resultado verificável | Dependência | Prioridade |
| --- | --- | --- | --- | --- |
| U0 | Diagnóstico operacional e critérios de referência | Percorrer cálculo, produto, orçamento, conversão, venda e financeiro em ambiente de teste; registrar diferenças e casos de referência | Base atual | P0 |
| U1 | Precificação avançada e custo histórico | Explicar custo de lote/unidade e preço por modalidade; preservar documentos anteriores | U0 | P0 |
| U2 | Estoque de materiais e insumos | Entradas, reservas, consumo, perdas e ajustes explicarem saldo físico e disponível | U0; ficha de consumo alinhada com U1 | P0 |
| U3 | Ordens de produção e entrega | Executar itens de venda, registrar consumo/tempo, falhas e quantidades entregues sem efeitos duplicados | U1 e U2 | P0 |
| U4 | Rentabilidade operacional | Comparar custo estimado/real e contribuição por pedido, produto e canal | U1 e U3; financeiro existente | P1 |
| U5 | Atendimento e planejamento | Acompanhar próxima ação, prazos e capacidade; reduzir transcrição de solicitações do catálogo | U3; U4 para análises de resultado | P1 |
| U6 | Expansões seletivas | Kits, consignação, importação de fatiamento ou cenários conforme demanda demonstrada | Especificação própria | P2 |

Ordem recomendada: U0 → U1 → U2 → U3 → U4 → U5. U6 não é compromisso de implementação. A experiência móvel e o tratamento de estados vazios fazem parte de cada entrega, não de uma reforma posterior.

## 5. Primeira entrega funcional: U1

### Escopo proposto

1. Composição com vários materiais, consumo e purga separados, respeitando unidades e tecnologia. Não converter volume de resina em massa sem premissa explícita.
2. Quantidade do lote, tempo de máquina, preparação por lote e acabamento por unidade. Permitir insumos e embalagem com custo explícito, ainda sem movimentar estoque.
3. Separação entre custos produtivos, taxas variáveis sobre a venda e despesas fixas. Evitar incluir o mesmo custo em dois campos.
4. Modalidades de markup sobre custo, margem de contribuição alvo e preço informado; mostrar as bases e o impacto das taxas. Não chamar markup de margem.
5. Perfil de canal com taxas preenchidas pela B2T e faixas de quantidade. Sem atualização automática de tarifas ou aconselhamento tributário.
6. Memória do cálculo com entradas, versão das regras, custo de lote/unidade, preço sugerido e contribuição estimada.
7. Integração com produto e documentos novos mediante ação explícita. Aplicar sugestão ao rascunho não publica preço nem altera orçamento emitido.

### Preservação e transição

O cálculo atual continua reproduzível como versão anterior. Manutenção percentual e acabamento percentual não serão convertidos automaticamente para valores por hora. A especificação detalhada definirá a convivência das versões, o mapeamento de campos e as validações de denominador e limites monetários.

Produtos antigos continuam editáveis. Atualizar sua ficha de custo exige ação explícita e não altera o preço final automaticamente. Documentos emitidos permanecem intactos; vínculos de custo completos começam nos novos documentos ou em revisões formalmente permitidas.

### Aceite funcional

- Cálculos anteriores mantêm seus resultados no modo anterior.
- Um lote de várias peças distingue preparação única de acabamento por peça.
- Dois materiais e a purga aparecem individualmente na memória do custo.
- Taxa percentual sobre venda não é tratada como percentual sobre custo.
- Margem alvo impossível gera erro claro, sem ajuste silencioso do percentual.
- Preço informado abaixo do custo mostra contribuição negativa de forma explícita.
- Alterar tarifa ou material não muda orçamento já emitido nem preço publicado.
- Troca de modalidade não reutiliza um percentual com significado diferente sem explicação e validação.
- Operador consegue completar o fluxo em celular sem perder os dados após erro.

Fora de U1: ordens, reservas, compras, baixa de material, custo real, kits, arquivos 3D, importação de fatiadores e integrações externas.

## 6. Regras a fechar nas especificações seguintes

U2: unidade de cada insumo; identificação por rolo/lote; método de valorização; inventário inicial com data e origem; política de saldo insuficiente; reserva parcial; devolução e desperdício. Não criar estoque inicial a partir de preços cadastrados nem inferir saldo zero como contagem confirmada.

U3: ordem para estoque ou venda; divisão de itens entre ordens; execução parcial; máquina/responsável; momento de consumo e entrada de acabado; correção de apontamento; reimpressão; cancelamento antes e depois do consumo; entrega parcial. Não consumir simultaneamente a ficha estimada e o apontamento real.

U4: conceito de contribuição e resultado; taxas efetivas versus estimadas; frete; perdas; descontos; devoluções; custos fixos e período; cobertura de custo real. Compra de material, consumo de material e saída de caixa não são o mesmo evento econômico e não podem ser somados como três despesas do pedido.

U5: necessidade de funil comercial separado; responsável e próxima ação; capacidade útil das máquinas; prazos prometidos; consentimento e revisão de solicitações externas antes de criar documentos comerciais.

## 7. Validação, implantação e métricas

Cada entrega terá especificação e plano próprios. Critérios comuns: testes de regras relevantes, integração com banco isolado, permissões, concorrência, cancelamentos/compensações, migrações preservando registros e inspeção dos fluxos em computador/celular. Executar verificações de tipos, lint e build quando houver código. Consultar a documentação Next.js instalada antes de alterações, conforme AGENTS.md.

Implantação por entrega, com backup verificável e procedimento de recuperação definido antes de migrar. Registros anteriores continuam legíveis; novos indicadores mostram quando faltam dados históricos. Não preencher lacunas históricas com estimativas apresentadas como fatos.

Métricas a medir antes e depois: tempo para preparar orçamento, quantidade de redigitações, percentual de pedidos com custo previsto, percentual de ordens com consumo real completo, divergência de inventário, pedidos entregues no prazo e diferença entre contribuição prevista/real. Definir metas após levantar a linha de base; não inventar ganhos percentuais.

Não há estimativa de prazo nesta versão. Estimar esforço por entrega após diagnóstico, escopo aceito e levantamento das migrações; separar desenvolvimento, validação e implantação.

## 8. Próxima decisão e documentos de referência

Revisar este plano diretor, em especial a ordem U1–U3 e o escopo de U1. Após sua aprovação, detalhar U0/U1 com as regras de cálculo, exemplos numéricos, experiência de uso, compatibilidade e testes de aceite. A especificação detalhada será revisada antes do plano de implementação e da alteração do produto.

Referências locais:

- [Gestão interna já aprovada](2026-09-29-gestao-interna-index.md).
- [Calculadora original](2026-09-28-calculadora-3d-design.md).
- [Vendas e orçamentos](2026-09-29-vendas-orcamentos-design.md).
- [Financeiro](2026-09-29-financeiro-design.md).
- [Registro histórico de validação](../../VALIDACAO.md).
- Benchmark aprovado: Mapa Funcional — Makers Flow, 05/10/2026, 63 páginas. Os IDs de funcionalidades e backlog do benchmark são referências de descoberta; U0–U6 são as entregas específicas da B2T.
