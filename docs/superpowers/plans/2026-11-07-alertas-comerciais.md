# Alertas comerciais — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Execução direta neste chat.

**Goal:** Prioridades comerciais acionáveis, sem inferir resposta ausente.
**Architecture:** Projeção pura de datas civis e consultas existentes na mesma transação; componentes shadcn instalados.
**Tech Stack:** Next 16.4, Prisma, React, Vitest.
**Spec:** docs/superpowers/specs/2026-11-07-alertas-comerciais-design.md

## Restrições globais
Sem persistência adicional, mensagens, migração ou acesso operacional. Critério novo de inatividade pendente. Janela atual de 7 dias preservada até decisão. Sem push/PR/merge/publicação.

## Tarefas
- [x] Testar projeção de vencimento/principal/estados e contatos civis, duplicidade e lacunas; observar RED.
- [x] Implementar src/domain/dashboard/commercial-alerts.ts e integrar src/server/dashboard/commercial.ts na transação; observar GREEN.
- [x] Expor cobertura e detalhes acessíveis na PriorityTable, preservando outros painéis; testes de UI/links/consulta/autorização.
- [x] Executar regressões, tipos/lint/build e prévia sintética. Registrar limites reais.
- [x] Atualizar acompanhamentos relacionados preservando histórico. Versão única de funcionalidade 1.25.0 preparada para revisão, conferir main antes de futura PR.

## Decisões e execução
07/11: dados existentes não distinguem envio e resposta; pergunta enviada, sem regra inventada. Começar contatos/vencimento e lacunas independentes.

Verificações finais: 29 testes focados aprovados; tipos/lint/build 1.25.0 aprovados; revisão independente sem achados, fronteiras sugeridas incorporadas. Suíte completa reiniciada com arquivos estáveis após interrupção da rodada afetada por mudança concorrente de versão. Decisão comercial de inatividade segue pendente.

Conclusão da validação: 915 testes unitários em 220 arquivos, tipos, lint e build final aprovados. Main reconferida bd0b4eb/1.24.0. Entrega local parcial, aguardando exclusivamente critérios de inatividade/sem retorno; sem commit/push/PR/merge/publicação.
