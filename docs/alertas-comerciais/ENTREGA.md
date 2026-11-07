# Alertas comerciais — entrega local parcial

07/11/2026 · branch `codex/alertas-comerciais` · base main `bd0b4eb` / 1.24.0 · versão preparada 1.25.0.

## Comportamento implementado

- Na prioridade existente do Comercial e da Visão geral: contatos agendados antes do dia civil atual, propostas vigentes de hoje até sete dias à frente (janela preexistente).
- Cada negociação tem uma linha reunindo contato atrasado e vencimento do principal; responsável, próxima ação, prazo e motivo levam ao detalhe correto. Avulsos levam ao orçamento.
- Só ENVIADO/APROVADO ainda válidos, sem rascunhos/expirados/recusados/cancelados/convertidos. GANHO/PERDIDO não geram prioridades. Orçamentos secundários não substituem principal encerrado. Venda cancelada não reabre orçamento convertido.
- Datas civis com hoje em America/Sao_Paulo. Hoje não é contato atrasado. Retirar ou atualizar prazo/principal/estado recalcula a projeção; sem marcas artificiais, persistência nova, agendador, mensagem ou alteração de etapa.
- Critérios e cobertura expansíveis com links: falta de validade, próximo contato e principal em PROPOSTA/NEGOCIACAO não equivale a tudo em dia. Sem responsável, o detalhe informa ausência; não inventa titular para orçamento avulso. Ausência de registros tem texto próprio.
- ADMIN/OPERATOR mantêm a leitura global já existente das negociações. Nova seleção carrega somente dados de acompanhamento, sem financeiro. Autorização de rotas e detalhes preservada.

## Decisões comerciais pendentes

Perguntado ao usuário: confirmar/manter sete dias (ou outra janela) e escolher alternativa honesta de inatividade com prazo. **Sem retorno não implementado**: INTERACTION registra texto livre, não direção, envio comprovado ou resposta do cliente. Emissão/ENVIADO e tempo desde criação não demonstram falta de resposta. Não foi criada coleta/persistência nova sem decisão. A solicitação ampla continua parcial até essa decisão.

## Evidências

- 7 arquivos e 29 testes direcionados aprovados: projeção, consultas sintéticas ADMIN/OPERATOR, UI, filtros, autorização dos painéis, manifestos, login/admin/Atualizações.
- RED observado antes de implementar domínio; dois testes de consulta falharam nos comportamentos antigos e passaram após integração; UI falhou antes da expansão e passou após implementação.
- Fronteiras: hoje/dia sete/dia oito, vencido, estados terminais, secundários, principal convertido/ausente, duplicidade, falta de data, atualização de contato, dezembro/janeiro e meia-noite São Paulo.
- Build Next de produção aprovado (80 páginas), sem .env operacional. Tipagem e lint finais aprovados, assim como nova execução de build com a versão 1.25.0 preparada.
- Revisão independente sem achados relevantes; 19 testes focados executados pelo revisor. Sugestão de fronteiras temporais incorporada nos testes.
- Prévia Vite sintética em desktop 1280×720 e iframe de 390 px; temas claro/escuro, expansão, foco e Tab até o link Abrir. A tabela conserva a rolagem horizontal interna existente no celular; não alarga o quadro. Destinos conferidos na árvore de acessibilidade e testes, sem navegar para registros fictícios.
- Suíte unitária completa final: **915 testes em 220 arquivos aprovados**, execução estável de 221,64 s. Avisos jsdom de navegação não implementada não produziram falhas. Primeira rodada interrompida após mudança concorrente da versão causar inconsistência no teste de manifestos; não foi tratada como aprovação.

Não executados: HTTP autenticado, persistência/consulta em PostgreSQL real ou homologação humana. Nenhum servidor Next iniciado, sem contorno ao bloqueio automático anteriormente relatado. Não foi acessado banco operacional, criada sessão/usuário artificial, migrado banco, copiado .env, enviado mensagem, modificado outro chat ou contêiner.

## Arquivos e reprodução

Domínio `src/domain/dashboard/commercial-alerts.ts`; consulta `src/server/dashboard/commercial.ts`; repasse da cobertura na visão geral/painel; componente `priority-table.tsx`. Testes novos em `tests/unit/commercial-alerts.test.ts` e ampliações dos testes existentes. Sem dependências ou schema novos.

Prévia: `node tests/commercial-alerts-preview-server.mjs`; abrir `http://127.0.0.1:4186/tests/commercial-alerts-preview.html` ou `http://127.0.0.1:4186/tests/commercial-alerts-mobile.html`. Somente fixtures, sem autenticação e sem dados reais.

![Desktop escuro, critérios e foco](desktop-escuro.png)
![Celular claro, tabela com rolagem interna](celular-claro.png)
![Ação alcançada pelo teclado](celular-acao-teclado.png)

## Estado da entrega

Worktree separada; pasta operacional X:/codex/appb2t e seus documentos/skills locais preservados. PENDENCIAS/roadmap atualizados somente nesta branch, mantendo histórico. 1.25.0 MINOR preparada uma única vez, manifestos sincronizados, APP_VERSION derivado do manifesto e notas em português; comparar novamente com main antes de futura PR. Sem commit/push/PR/merge/Release/publicação ou implantação operacional. Acesso efetivo usado sem alegar alteração da permissão do chat.

## Preparação da PR autorizada — 07/11/2026

Usuário solicitou “faca pr”. Main reconferida bd0b4eb/1.24.0; versão 1.25.0 já preparada foi mantida, sem segundo incremento. Revalidação de 23 testes em quatro arquivos aprovada (domínio, consulta, UI e versão/rodapés/Atualizações). Commit/push/PR autorizados; abertura em rascunho para revisão do recorte entregue, sem presumir aprovação do critério comercial pendente. Estados anteriores descrevem a entrega local antes dessa autorização. Sem merge, Release de distribuição ou implantação operacional.

[PR #50](https://github.com/bsgirardi/appb2t/pull/50) criada em rascunho, implementação `eaa8b3f`, versão 1.25.0. CI iniciado, resultado ainda pendente; sem merge/Release/deploy.
