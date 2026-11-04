# Etapa 3 — decisões comerciais na negociação

Data: 04/11/2026. Base remota conferida: `origin/main` d1d7ac0, versão 1.15.0. Branch `codex/admin-ux-etapa3`, worktree 4fbd.

## Resultado

Consulta explícita do orçamento principal dentro da negociação. Mostra versão/status consultados, cobertura de custos por item, canal preservado, receita estimada, contribuição, margem de contribuição, resultado após depreciação e tempo de máquina estimado. Custos inválidos/ausentes não produzem indicadores. A atualização descarta resultado anterior inclusive em falha; trocar o principal ou sua versão reinicia o contexto.

Reutiliza o GET autenticado de orçamento, `compareLineCost`, fingerprints e snapshots existentes. Não há novas rotas, migrações, gravações, recebimentos, reservas ou movimentações. A oferta atual é avaliada sobre as premissas preservadas; não substitui custos pelo catálogo atual. Consultas não alteram versões ou históricos.

## Diagnóstico e dependências

- E1.2 já entrega comparação simultânea de canais e taxas, desconto percentual, cobertura versus meta, biblioteca e reutilização de memórias. Nenhum desses recursos foi recriado.
- Planejamento já tem calendário, fila e simulação. O novo painel oferece acesso direto e tempo de máquina por item. Não calcula uma nova data de entrega ou promete capacidade disponível.
- Etapa 1: chat “Painel administrativo — etapa 1 de UX/UI”, branch `codex/admin-ux-etapa1`, commit 355e2a6, 1.15.1 local. Etapa 2: chat “Painel administrativo — etapa 2: rotina…”, branch `codex/admin-ux-etapa2`, commit 38dd157, 1.16.0 local. Chats lidos sem envio de mensagens; nenhuma branch incorporada. A base remota desta entrega continua 1.15.0.
- Esta entrega também prepara 1.16.0, incremento MINOR comparado à main. Se a etapa 2 for integrada primeiro, conciliar a versão e reunir as notas antes da integração, preservando históricos. Não tratar números de branches paralelas como releases já publicadas.

## Limites financeiros e operacionais

Indicadores por item são anteriores ao desconto/frete globais, cujos valores ficam visíveis. Margem consolidada não apurada: rateio de desconto/frete e eventual incidência de taxas sobre frete exigem decisão financeira específica. Não presumir esse tratamento. Canal e taxas são os preservados na memória e podem diferir dos cadastros atuais. Cobrir custos modelados não garante pagar despesas fixas não modeladas.

Tempo de máquina não inclui calendário, fila ou prazo garantido. Não somar lotes ou assumir processamento sequencial/paralelo. Simular um orçamento ainda não convertido na fila exigiria um novo contrato operacional; este incremento encaminha ao planejamento existente sem criar compromisso.

## Arquivos

- `src/components/opportunities/decision.tsx`: painel de consulta.
- `src/domain/opportunities/decision.ts`: projeção pura por item com Decimal.
- `src/components/opportunities/detail.tsx`: inclusão do painel.
- `tests/unit/opportunity-decision*.test.*`: cálculos, obsolescência, efeitos colaterais e acesso.
- `package.json`, `package-lock.json`, `src/lib/releases.ts`: versão e notas.
- Plano: `docs/superpowers/plans/2026-11-04-admin-ux-etapa3.md`.

## Validação

Testes dirigidos passaram: consulta GET sem mutações, bloqueio não autenticado antes da leitura, ADMIN/OPERATOR, preço atual com snapshot congelado, identidade/quantidade alteradas, custos ausentes, negativos/zero, tempo fracionário, falha sem resultado anterior e troca do principal durante consulta. Testes existentes de negociações, comparações e custos também passaram.

Suíte unitária completa: 188 arquivos, 761 testes aprovados em 177,78 s. Após acrescentar o caso de zero/negativo e tempo fracionário, os 12 testes de decisão comercial e versão também passaram. Tipos, lint e build de produção passaram. Testes de versão confirmam manifestos sincronizados, rodapé do login, rodapé administrativo e `/atualizacoes` para ADMIN/OPERATOR. Revisão independente sem defeitos acionáveis.

Inspeção visual com os componentes/CSS reais e dados fictícios em prévia local: desktop e 390 px, claro/escuro. Largura do documento e viewport de 390 px, sem transbordamento horizontal; Tab do botão de atualização chega a Consultar planejamento. Evidências PNG nesta pasta. A prévia não usa sessões autenticadas nem banco; teste HTTP usa serviço mockado e não substitui integração real com banco. Nenhum banco operacional foi acessado. Não houve mudança no servidor, schema ou transações existentes.

Estado: entrega local revisável; sem PR, push, merge ou publicação em produção.
