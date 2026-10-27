# E2.1 — implementação local e validação

Data: 27/10/2026. Base: main 1.5.1, commit `d74ee7515898ef3ad892543fa61d02994c262799`. Branch local: `codex/e2-reconciliacao`. Worktree: `C:/Users/Administrador/.codex/worktrees/e2-reconciliacao/appb2t`.

## Entrega

Desenho e plano aprovados neste chat. Implementada projeção pura de leitura em `src/domain/profitability/reconciliation.ts`, com contribuições e margens na receita da memória, previstas na venda e realizadas. Efeitos comerciais separam preço praticado, desconto, frete cobrado e base das taxas; efeitos realizados separam custo produtivo agregado, encargos e frete pago. Valores positivos aumentam a contribuição.

O detalhe existente mostra resumo e detalhes expansíveis por linha, fonte da memória/conferência, motivos de indisponibilidade e confirmação de igualdade por trecho somente com cobertura completa. Receita zero mantém valor monetário e margem indisponível. A referência é a receita da memória de preço, sem afirmar que foi orçamento enviado ou história de negociação.

Sem alteração do motor `calculateSale`, rateios, fontes, DTO persistido, engineVersion `u4-v1`, apurações/revisões históricas, permissões, parâmetros ou bancos. Perdas/complementos são lidos pelos custos já apurados e não somados novamente; reservas e recebimentos não entram como custo/receita adicional. Depreciação mantém indicador próprio.

## Verificação executada

- Instalação própria de dependências na worktree; nenhum `.env` operacional copiado.
- Base de domínio: 14 testes aprovados em 4 arquivos antes da implementação.
- RED observado: módulos de domínio/interface ausentes, conforme passos do plano. GREEN: testes novos e regressões relacionados aprovados.
- Verificação final: `npx vitest run tests/unit/profitability-reconciliation.test.ts tests/unit/profitability-reconciliation-ui.test.tsx tests/unit/profitability-ui.test.tsx tests/unit/profitability-calculate.test.ts tests/unit/profitability-coverage.test.ts tests/unit/profitability-allocation.test.ts tests/unit/profitability-aggregate.test.ts`: **34 testes em 7 arquivos aprovados**.
- `npm run typecheck`: aprovado após geração do Prisma Client pelo build. A primeira execução, feita antes dessa geração na cópia nova, falhou por tipos Prisma ausentes; não houve correção de código para esse preparo.
- `npm run lint`: aprovado.
- `npm run build`: aprovado, incluindo rota `/rentabilidade/[id]`.
- Revisão independente somente leitura: sem achados acionáveis; não substitui validação visual nem integração operacional.
- Prévia isolada com Vite e fixtures sintéticas, sem conexão com banco: desktop 1280 px e móvel 375 px; estados completo, incompleto, receita zero/resultado negativo e múltiplas linhas. Detalhe de linha expandido conferido. Largura de página 360 px para viewport 375 px; sem rolagem horizontal da página. Tabelas mantêm rolagem local acessível conforme componente existente.
- `git diff --check`: aprovado.

## Limites

`npm test -- tests/unit` reproduziu a limitação já registrada: `RangeError: Maximum call stack size exceeded` no transporte de mensagens do Vitest (`send`, `post`, `serialize`). A execução não terminou com resumo; somente seus processos nesta worktree foram interrompidos. Não declarar suíte completa aprovada. O comando completo sem filtro inclui integrações de banco e não foi executado nesta entrega sem banco descartável dedicado.

Integrações de banco não executadas, pois não há mudança de fonte, persistência ou schema. Compatibilidade histórica exercitada pela forma do DTO existente em fixture serializada; não foram acessadas apurações operacionais reais. Prévia usa componentes/estilos reais com dados sintéticos, não comprova o fluxo autenticado operacional.

## Decisões e continuidade

- Receita de referência pode ser nula quando falta memória; não representar ausência por zero.
- Taxas de referência usam seis casas e efeito da base usa diferença contra taxa prevista efetivamente calculada, fechando sem inventar causa para arredondamento.
- Explicação derivada evita mudar engineVersion ou regravar histórico. O histórico de apurações mantém sua interface existente; este incremento apresenta a explicação no detalhe atual.
- Execução direta, com revisão independente final; registros de execução/evidências sintéticas locais permanecem em `.superpowers/sdd/2026-10-27-e2-reconciliacao/`, ignorado pelo Git, inclusive para diagnóstico da suíte completa.
- E2 permanece parcial: componentes/falhas detalhados, rankings por produto/cliente/canal e critérios de recorrência/revisão humana da ficha continuam em E2.2–E2.4. E1 permanece independente e parcial, conforme acompanhamento; não foi alterada ou integrada.
- Versão mantida em **1.5.1**, pois não há PR entregue. Antes de uma futura PR autorizada: reconsultar main/E1, aplicar incremento MINOR uma única vez, sincronizar manifestos e notas em português, conferir APP_VERSION nos rodapés e página Atualizações.
- **Sem PR, push, merge, publicação, migração, atualização de contêineres ou alteração operacional.** Trabalho preservado em branch local para revisão.
