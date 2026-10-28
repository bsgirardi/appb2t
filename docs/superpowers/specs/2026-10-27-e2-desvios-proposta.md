# E2.1 — proposta de reconciliação da rentabilidade

Data: 27/10/2026. Situação: recorte e desenho aprovados pelo usuário neste chat; implementação ainda não iniciada. Abordagem escolhida: reconciliação no detalhe da venda.

## Estado verificado

- E1.1: implementação 1.6.0 na PR #19 em rascunho, sem merge/publicação, conforme acompanhamento e leitura do chat E1. E1 continua parcial. Canais, descontos e comparação de memórias não foram entregues.
- Main local e referência origin/main consultadas: 1.5.0, `4037408`. Não foi feita nova consulta remota nesta análise.
- `sources.ts` recupera memória V2 congelada e compatível com a linha; já expõe `suggestedRevenue`, custos previstos, componentes realizados e fontes. O nome atual “sugerido” corresponde a `offeredRevenue`, que também pode ter sido informado pelo operador: usar “receita da memória”, sem afirmar que é meta ou orçamento enviado ao cliente.
- `calculate.ts` calcula previsto e realizado com a mesma receita negociada. Portanto a diferença atual mede custos/encargos/frete, não toda a negociação frente à memória.
- `detail.tsx` já mostra comparação, cobertura, composição e fontes. `aggregate.ts` já agrupa produto e canal; não há agrupamento por cliente nem ranking ordenado nesses resultados.
- `queries.ts` usa confirmação/conversão em São Paulo para o período, mês atual por padrão, população sem rascunhos, separação de exceções e paginação após agregação. Preservar essas regras até o desenho específico dos rankings.
- Produção valoriza material, energia, manutenção, trabalho e depreciação. Falhas podem estar incorporadas no custo das peças boas; ordens vinculadas encerradas sem peças boas entram como fonte LOSS. Não somar novamente essas perdas.

## Alternativas

1. **Recomendação: reconciliação no detalhe da venda.** Explicar primeiro uma venda e suas linhas, com fontes e igualdade verificável. Menor dependência de E1 e base para rankings posteriores.
2. Rankings primeiro: aproveita agrupamentos, mas mantém a negociação sem explicação e exige definir cliente, ordenação, cobertura e população comparável antes.
3. Toda E2 em um incremento: cobre também recorrência e revisão da ficha, mas amplia as decisões de atribuição e o risco de comparar populações distintas.

## Recorte recomendado

Acrescentar ao detalhe existente três posições: contribuição/margem na receita da memória, contribuição/margem prevista na venda negociada e contribuição/margem realizada. Mostrar a passagem em valores monetários; margens usam a receita de cada cenário e diferenças percentuais são pontos percentuais, nunca somas de percentuais com denominadores diferentes.

Proposta de cálculo por linha: M = receita de produtos da memória; G = receita bruta comercial; D = desconto rateado; F = frete cobrado rateado; N = G − D; V = custo variável produtivo previsto; p = taxa percentual prevista; k = encargo fixo previsto; S = frete previsto pago.

- Referência da memória: B = M − V − (M × p / 100 + k) − S. Frete cobrado da venda não pertence à memória; aparece separadamente na passagem.
- Efeitos comerciais: preço praticado G − M; desconto −D; frete cobrado +F; efeito da base das taxas −((N − M) × p / 100).
- B + efeitos comerciais = contribuição prevista existente na venda (N + F − V − taxas previstas sobre N − S).
- Efeitos realizados: custo produtivo previsto menos efetivo, taxas previstas menos efetivas, frete previsto pago menos efetivo. A soma com a contribuição prevista deve reproduzir a contribuição realizada existente.

Efeito comercial é comparação com uma memória de preço, não prova de histórico de negociação. Sem memória válida, não inferir referência a partir da ficha atual. Sem cobertura completa, mostrar motivos e valores conhecidos; não apresentar fechamento completo nem lucro parcial. Receita zero mantém contribuição monetária e margem indisponível.

Neste primeiro incremento, custo produtivo permanece agregado. Material, trabalho, energia, manutenção, extras e falhas serão abertos em E2.2 após definir a correspondência entre componentes previstos e realizados. A fonte LOSS pode ser identificada como informação já incluída, sem transformá-la em novo lançamento. Não atribuir causalidade a falhas apenas pela diferença de custo.

Caixa/recebimentos continuam separados. Depreciação tem uma passagem própria para o resultado após custo total; não integra a contribuição. Não alterar cadastros, parâmetros, snapshots, revisões ou avaliações históricas.

## Dependências de E1 e isolamento

E2.1 usa contratos já presentes na main; não precisa do comparador de E1.1 nem dos futuros simuladores de E1.2. Comparar cenários salvos de canais/descontos depende do contrato final de E1; adiar essa integração e qualquer afirmação de proveniência de negociação. Antes de implementar, conferir novamente main/E1 e possíveis mudanças em snapshots e versionamento.

Criar isolamento a partir da main atual somente na execução. Não reutilizar a worktree E1, arquivos de implementação ou banco de testes em uso por ela. Não usar banco operacional. Alterações locais de Docker, manifestos, notas e acompanhamento pertencentes a outros trabalhos devem permanecer intactas.

## Critérios verificáveis propostos

1. Memória 300, venda bruta 200, desconto 0, frete cobrado 0, V=80, p=5%, k=0, S=20: referência 185; efeito de preço −100 e de taxas +5; previsto negociado 90. Com custo efetivo sem depreciação 80, taxas 10 e frete pago 20, realizado 90. Depreciação 5 produz resultado 85 e não muda contribuição.
2. Desconto, frete cobrado, diferença de preço e mudança da base de taxas reconciliam separadamente, com rateio determinístico em múltiplas linhas. Não debitar desconto duas vezes.
3. Ausência de memória, composição, frete/taxas declarados, revisão desatualizada, entrega incompleta ou custo provisório impede somente os fechamentos que dependem desses dados; zero declarado difere de desconhecido.
4. Perdas vinculadas, falha incorporada em peças boas, complementos e reservas não geram custo adicional pela explicação. Venda cancelada/pendente mantém indicação de exclusão.
5. Valores negativos, receita zero, precisão de seis casas e apresentação em centavos são cobertos; resíduo de exibição não se torna uma causa comercial.
6. Testes de domínio/UI e fontes afetadas, tipagem, lint e build em isolamento; banco descartável exclusivo se integração exigir. Registrar separadamente a limitação conhecida do Vitest, sem substituir evidência por resultados de E1.

## Entrega posterior e itens restantes

Após escolha da abordagem e aprovação do desenho: elaborar plano executável, ler guias locais do Next pertinentes antes de código, implementar e validar. Reavaliar compatibilidade de DTOs e engineVersion de avaliações históricas antes de persistir qualquer novo resultado.

E2.2: componentes e explicação de falhas conforme rastreabilidade disponível. E2.3: ranking por produto, cliente e canal com cobertura e população comparável explícitas. E2.4: critérios de recorrência e sugestão de revisão humana da ficha, sem alteração automática.

Sem código de produto, testes, PR, merge ou publicação nesta entrega. Sem incremento de versão por não haver PR entregue; a futura PR exige incremento único comparado à main, manifestos/notas sincronizados e confirmação dos rodapés e Atualizações. PR e merge dependem de autorização específica; publicação continua proibida.
