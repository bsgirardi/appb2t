# E1.1 — verificação e entrega

Data: 27/10/2026. Versão: 1.6.0. Branch: `codex/e1-comparacao-lotes`.
Base consultada: main 1.5.0, `403740897a9d81b7ad87d0dece40b4f80ca52483`.

## Resultado

Comparador existente ampliado, sem alterar `calculateV2`, requisições comerciais,
persistência, banco ou permissões. `PricingScenario` acrescenta tempo de máquina,
consumo por material e contribuição por hora; resultados financeiros continuam
vindos do V2. Indicadores usam os mesmos valores normalizados pelo schema e
Decimal com precisão 40. A comparação altera o formulário somente ao selecionar
explicitamente uma quantidade.

## Evidências

- TDD inicial: dez falhas esperadas por indicadores e conteúdo ausentes; dez
  testes que já verificavam comportamento existente passaram. Após implementação,
  52 testes de quatro arquivos passaram.
- Revisão independente apontou compatibilidade com vírgula decimal em chamadas
  diretas; teste novo reproduziu `DecimalError` antes da correção. Após usar o
  schema normalizado também nos indicadores, revisão confirmou a correção.
- Execução relacionada final: 78 testes aprovados em nove arquivos:
  pricing-scenarios, pricing-scenarios-ui, pricing-v2, pricing-validation,
  pricing-ui, pricing-review, product-pricing-ui, commerce-pricing-ui e app-version.
- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm run build`: aprovado, com compilação e geração de rotas completas.
- `app-version` confirma package.json, versões raiz e packages[""] do lock,
  histórico, rodapé de login e painel e Atualizações para ADMIN e OPERATOR.
- Prévia Vite temporária somente com fixtures: conferidos 10 e 20 peças,
  custos, contribuições, consumo e mensagem de quantidade inválida. Desktop com
  duas colunas e viewport 375 × 812 com coluna única; largura de conteúdo 360 px,
  sem transbordamento horizontal. Evidências locais em `.superpowers/sdd/2026-10-27-e1-comparacao-lotes/` (ignoradas pelo Git).
- Harness temporário removido e servidor de prévia encerrado. Nenhuma conexão
  com banco operacional, publicação ou mudança de contêiner.

## Limites

`npm run test:unit -- --reporter=dot` foi executado e reproduziu recursão de
`post(serialize(_req))` no transporte do Vitest, seguida por
`RangeError: Maximum call stack size exceeded` em PromiseRejectCallback.
A execução foi interrompida após repetição sem resumo conclusivo; não há contagem
completa confiável. Esse tipo de falha já estava registrado em PENDENCIAS.md;
esta entrega não determina a causa raiz nem declara a suíte completa aprovada.
Não foram executadas integrações que preparam/limpam banco, pois não houve
configuração explícita de banco dedicado nesta worktree.

Prévia visual utilizou fixtures, não login operacional ou dados reais. Não foi
realizada publicação. A instalação na 1.4.0 é informação recebida, não verificação
operacional nova. E1.1 implementado não significa E1 completa: canais, descontos
e memórias reproduzíveis comparáveis ainda precisam dos próximos incrementos.

## Estado de integração

[PR #19](https://github.com/bsgirardi/appb2t/pull/19) criada em rascunho com o limite da suíte completa explícito. Implementação em `dff8fd7`.
Sem merge em main, sem publicação e sem migrações. Não há tag automática.
