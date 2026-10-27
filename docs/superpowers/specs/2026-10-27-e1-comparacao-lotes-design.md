# E1.1 — Comparação de lotes para decisão de preço

Data: 27/10/2026. Desenho aprovado pelo usuário no chat; E1.1 implementado em isolamento. Verificação e limites no relatório `../reviews/2026-10-27-e1-comparacao-lotes.md`.

## Intenção e diagnóstico

Ampliar a comparação existente para que a equipe avalie o resultado do lote,
além do preço por peça. A ordem E1–E6 permanece aprovada.

`calculateV2` já calcula custos, taxas, contribuição, margem efetiva e resultado
após depreciação. `calculateScenarios` chama esse motor para até dez quantidades,
sem alterar a entrada. `PricingScenarios` apresenta somente quantidade e preço.
`BatchPricingForm` permite escolher uma quantidade explicitamente e oculta essa
comparação em documentos com quantidade fixada. As memórias `PricingSnapshot`
preservam entrada e resultado; não constituem hoje uma biblioteca comparativa.

## Abordagem proposta

Ampliar o comparador atual, mantendo o motor V2 e os três modos de preço.
Uma tela independente duplicaria formulário e revisão de parâmetros. Incluir
canais, descontos e persistência simultaneamente ampliaria o primeiro incremento
antes de definir preço de referência, identificação e recuperação das simulações.
Esta abordagem foi aprovada pelo usuário no chat.

## Comportamento

Cada quantidade válida exibe custo completo por peça, preço oferecido por peça,
receita do lote, contribuição total, margem efetiva e resultado após depreciação.
Exibe também tempo de máquina, contribuição por hora e consumo por material,
identificado por nome e unidade, incluindo desperdício fixo uma vez por lote.
Usar apresentação legível em telas pequenas com rótulos explícitos e comparação
consistente entre cenários, seguindo os componentes visuais existentes.

Tempo de máquina = minutos fixos + minutos por peça × quantidade.
Contribuição por hora = contribuição do lote / (tempo de máquina em minutos / 60).
Esse indicador não inclui preparação/acabamento no denominador, não representa
lucro líquido e não mede capacidade livre. O motor exige tempo total positivo;
nenhuma divisão por zero deve aparecer na interface.

Cobertura dos custos completos modelados é indicada pelo resultado após
depreciação, preservando o aviso existente para resultado negativo. Cobertura
não implica atingir a meta comercial nem cobrir despesas fixas da empresa.
Mostrar modalidade e canal comuns aos cenários; no modo margem, contextualizar
a meta configurada e o arredondamento. No modo preço informado, preservar o
preço escolhido. Não criar um novo preço mínimo neste incremento.

Comparar não salva, publica ou aplica preços. Somente a ação existente de usar
uma quantidade muda o formulário; aplicar estimativa continua sendo ação separada.
Nenhuma migração, mudança de permissões ou alteração de memórias históricas.
Usar aritmética decimal para indicadores derivados e formatação brasileira na UI.

## Critérios verificáveis

1. Uma a dez quantidades inteiras de 1 a 100.000 mantêm a validação atual,
   inclusive limites de consumo e tempo do motor; entrada inválida não deixa
   resultados anteriores visíveis como atuais.
2. Cada resultado financeiro coincide com `calculateV2` para a quantidade;
   não há reimplementação das fórmulas de preço nem mutação da entrada.
3. Na fixture `lotFixture`, dez peças mantêm custo completo de R$ 56,20,
   preço unitário de R$ 12,49, contribuição de R$ 58,21 e resultado após
   depreciação de R$ 56,21. Duas horas de máquina geram contribuição de
   R$ 29,105/h antes da formatação; material A totaliza 110 g e B, 50 g.
4. Vinte peças preservam preparação e desperdício fixos uma vez por lote;
   materiais de resina são exibidos em ml, sem conversão por densidade.
5. Preço informado zero mantém margem não aplicável e valores negativos;
   prejuízo e margem abaixo da meta não são ocultados ou truncados.
6. Cobrir custos e atingir a meta comercial têm explicações distintas.
   Os modos markup, margem e preço informado mantêm seu comportamento.
7. Comparar não chama persistência; escolher quantidade altera apenas esse
   campo. Documentos de quantidade fixada continuam sem essa ação.
8. Verificar testes de domínio e interface relacionados, tipagem, lint,
   build e apresentação em tela estreita antes de entregar implementação.
   Testes de banco, se necessários posteriormente, somente em banco dedicado.

## Sequência restante da E1

- E1.2 proposto: comparação entre canais configurados e descontos, definindo
  explicitamente preço de referência e seu efeito na margem.
- E1.3 proposto: identificar, recuperar e comparar simulações, reaproveitando
  snapshots existentes, com memória reproduzível e regras próprias de gravação.
- Importação G-code/3MF e projeção mensal permanecem pendentes, em avaliações
  separadas. Não fazem parte do critério de aceite do E1.1.

A E1 completa continua pendente após E1.1 até comparar quantidade, canal e
desconto com memória reproduzível. Nenhuma caixa funcional foi concluída.

## Execução e entrega

Plano executável: `../plans/2026-10-27-e1-comparacao-lotes.md`.
Implementar em isolamento a partir da main atual, sem carregar alterações locais
da instalação. Main consultada: 403740897a9d81b7ad87d0dece40b4f80ca52483,
versão 1.5.0. Worktree nativa preparada em `C:/Users/Administrador/.codex/worktrees/e1-decisoes-preco/appb2t`, branch `codex/e1-comparacao-lotes`.

Versão funcional: 1.6.0. Manifestos e histórico em português sincronizados uma vez
nesta entrega; login, painel e Atualizações verificados por testes de APP_VERSION.

Implementação e validação focada realizadas. Suíte unitária completa reproduziu
recursão do transporte de erros do Vitest, sem resumo conclusivo. Merge e
publicação não realizados; migrações operacionais e contêineres não autorizados.
