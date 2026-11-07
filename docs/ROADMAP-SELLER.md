# B2T — evolução de preço, produção e vendas

## 07/11/2026 — complemento de retorno do cliente implementado

Usuário aprovou envio/resposta explícitos, prazo ADMIN configurável e padrão 14 dias, contado do primeiro envio ainda sem resposta; lembretes não reiniciam a espera. Tipos de registro no histórico existente, vínculo ao principal/versão atual, alertas agrupados; notas antigas sem inferência. Configuração em Configurações com versão otimista e rota ADMIN; default14 sem preferência salva, mudança aplicada às esperas atuais. Nova migração somente para CommercialSettings; não há persistência de notificações.

Migração real/reaplicação em PostgreSQL exclusivo descartável preservou cliente/orçamento sintéticos e validou constraints. Seis integrações novas aprovadas, incluindo idempotência, permissões, concorrência da preferência, troca/volta do principal e reabertura. Revisão independente e prévia sintética desktop/390 px, temas e teclado; tipos/lint/build aprovados. Suíte unitária final: 928 testes em 224 arquivos aprovados; E4 completa: 27 testes em oito arquivos aprovados. [Entrega e evidências](alertas-comerciais/ENTREGA.md).

Mesma PR #50 e versão 1.25.0, sem segundo incremento. Atualização da PR autorizada pelo pedido anterior e por este complemento; sem merge, Release, implantação ou migração operacional. E2.4 permanece separada. Registros de pendência anteriores descrevem a situação antes dessa decisão e implementação; não os apagar. Alerta interno implementado em validação, com homologação humana/servidor HTTP ainda pendentes.

## 07/11/2026 — PR de alertas comerciais autorizada

Usuário solicitou “faca pr”. Preparação da branch `codex/alertas-comerciais` em 1.25.0 MINOR sobre main reconferida `bd0b4eb` / 1.24.0, sem novo incremento. Revalidação de 23 testes direcionados aprovada; suíte completa anterior com 915 testes em 220 arquivos, tipos/lint/build finais aprovados. PR em rascunho para o recorte de contatos atrasados e vencimentos; critérios de inatividade/sem retorno continuam pendentes e não foram presumidos aprovados. Commit/push/criação de PR autorizados; merge, Release de distribuição e implantação operacional permanecem separados e não realizados. [PR #50](https://github.com/bsgirardi/appb2t/pull/50) criada em rascunho, implementação eaa8b3f; CI iniciado, resultado ainda pendente. Histórico abaixo preservado.

## 07/11/2026 — alertas comerciais implementados parcialmente em isolamento

Base main `bd0b4eb` / 1.24.0, worktree `alertas-comerciais`, branch `codex/alertas-comerciais`. Contatos agendados atrasados e vencimento de propostas vigentes avulsas/principais integrados à prioridade atual; motivos da mesma negociação agrupados, responsável/próxima ação e links diretos. Encerradas, convertidas, rascunhos, propostas secundárias e expiradas não geram alerta de vencimento. Cobertura incompleta explícita, sem notificações persistidas ou mensagens externas; acesso ADMIN/OPERATOR preservado. E2.4 segue frente separada.

Janela existente de 7 dias preservada, com confirmação solicitada. **Sem retorno continua pendente**: histórico INTERACTION é texto livre, não identifica envio/resposta. Alternativa de inatividade e prazo perguntados ao usuário, sem implementação ou aprovação presumida. Não encerrar a caixa ampla de alertas.

Validação: 915 testes unitários em 220 arquivos, tipos/lint/build finais aprovados; 29 testes direcionados, revisão independente e prévia sintética desktop/390 px, teclado e temas. Sem HTTP autenticado ou consulta a banco real. Versão 1.25.0 preparada uma única vez para revisão local, manifestos/notas sincronizados. Sem commit/push/PR/merge/Release/deploy, migração ou acesso operacional. [Entrega e evidências](alertas-comerciais/ENTREGA.md). Reconciliar main/versão antes de futura PR autorizada. Registros históricos e alterações locais de outros chats preservados.

## 06/11/2026 — integração autorizada e versão conciliada

PRs #46 (1.22.1) e #47 (1.23.0) integradas. PDV passa a 1.24.0 MINOR nesta mesma PR #48, preservando notas anteriores. Validação adicional HTTP e migração serão registradas após execução. Publicação operacional não realizada. Registros anteriores mantêm o estado histórico.

## 06/11/2026 — preparação da PR do PDV autorizada

Usuário solicitou “faça pr”. Main reconferida em `16a6466` / 1.22.0; incremento MINOR único para 1.23.0, com manifestos e notas portuguesas sincronizados. PR #47 da calculadora também propõe 1.23.0 e permanece aberta; reconciliar versão e histórico antes do merge conforme a ordem de integração, incluindo a PR #46 visual. [PR #48 do PDV](https://github.com/bsgirardi/appb2t/pull/48) criada em rascunho; revalidação aprovada com 890 testes gerais em 215 arquivos, quatro testes de versão/rodapés/Atualizações, tipagem, lint e build. Ensaio HTTP autenticado integral continua pendente por bloqueio automático anterior, sem contorno. Commit/push/PR estão autorizados por este pedido; merge, Release e implantação operacional permanecem separados e não autorizados. PR #48 confirmada aberta e em rascunho, branch codex/pdv-presencial, implementação dd45e0e. CI iniciado e ainda pendente; sem merge, Release ou publicação.


## 06/11/2026 — PDV presencial implementado localmente

Decisões expressas do usuário: operação conectada; venda sem identificação permitida, com seleção opcional de cliente ativo ou cadastro real durante o atendimento; pagamento combinado dispensável. Implementação em worktree isolada, branch `codex/pdv-presencial`, base `16a6466` / 1.22.0. Tela `/pdv` com skill shadcn do projeto, compra, faixas de quantidade, desconto, Pix/dinheiro/cartão, troco, revisão e conclusão. Sale aceita identificação anônima explícita exclusivamente no contrato do PDV, sem criar cliente fictício. Venda, recebível, compromisso por origem e entrega são atômicos e reutilizam serviços existentes. Sem baixa automática nem ampliação do financeiro para operador. Rascunho versionado e recuperação da mesma compra protegem contra duplicação; outra edição salva exige escolha explícita.

Validação: suíte geral com 889 testes em 215 arquivos; nove integrações PDV e 15 regressões de vendas/entregas/cancelamento/financeiro, banco descartável exclusivo; 11 testes focados finais incluindo recuperação de conflito; migração real com venda/cliente/item legados preservados. Tipagem, lint e build aprovados; nova rodada final de build após ajuste da recuperação registrada no relatório. Conferência visual sintética desktop/375 px, teclado, foco e temas. Revisão independente encontrou dois P2, corrigidos com regressões e rechecados. [Entrega, telas e limites](pdv/ENTREGA.md).

Recorte: produtos simples disponíveis e peças prontas livres; kits, personalizações, encomendas, abertura/fechamento de caixa, evento/local, pagamentos mistos, fiscal e benefícios futuros não implementados nesta entrega. Informação de pagamento não confirma provedor; recebimento continua no financeiro atual. Ensaio HTTP autenticado integral preparado, mas não executado: revisão automática bloqueou iniciar o servidor Next isolado sem informar motivo além de “blocked by policy”. Não houve contorno.

Estado: implementação e validação local, versão base preservada em 1.22.0. Sem commit/push/PR/merge/Release/deploy ou migração operacional. Próxima ação: revisão humana da entrega e decisão externa sobre futura PR. Antes de PR, reconciliar com main e PRs #46/#47, preparar incremento MINOR único e notas conforme AGENTS.md. Não copiar arquivos desta worktree sobre a pasta operacional antiga com alterações de outros chats.


## 06/11/2026 — PDV presencial iniciado em isolamento

Necessidade de balcão/feira/rua confirmada pelo pedido; deixou de ser uma decisão sobre existir ou não PDV. Investigação da main 16a6466 / 1.22.0 e [proposta concreta](superpowers/specs/2026-11-06-pdv-presencial-proposta.md) preparadas em área isolada. Recomenda-se entrega imediata de peças disponíveis, reaproveitando confirmação comercial, reservas por origem, entregas e financeiro. Cliente é obrigatório no contrato atual; não há suporte anônimo presumido. Operador não ganhou permissão de baixa financeira. Aguardam resposta: conexão/offline, comprador não identificado e pagamento único/combinado. Caixa completo, encomendas dentro do PDV, eventos/locais e estorno rápido são limites propostos, não requisitos aprovados.

Estado: investigação e proposta; sem implementação, testes funcionais, PR, merge, Release, deploy ou migração operacional. Versão preservada. Calculadora PR #47 e revisão visual PR #46 consultadas por leitura, sem presumir integração/publicação. Alterações da pasta operacional preservadas. Próxima ação: fechar decisões, desenho e plano e implementar o recorte autorizado.


## 06/11/2026 — PR da calculadora autorizada

Usuário autorizou preparar e criar PR. Versão 1.23.0 MINOR única sobre main 1.22.0 (`16a6466`), com manifestos e notas portuguesas sincronizados. Revalidação de preparação aprovada: 897 testes, tipagem, lint, build e quatro testes de versão/rodapés; [PR #47](https://github.com/bsgirardi/appb2t/pull/47) criada para revisão; CI será acompanhado pelo GitHub. Sem autorização de merge, Release ou publicação operacional. O registro de implementação abaixo preserva o estado anterior à preparação da PR.


## 06/11/2026 — calculadora unificada em revisão local

Base main reconferida em 1.22.0 / `16a6466`, com #42/#43 integradas; referências anteriores abaixo são históricas. Experiência principal com composição original, recursos por lote existentes e revisão de produto com referências atuais e antes/depois; preço final e memórias preservados. Comparadores E1.1/E1.2 reutilizados. Implementação na worktree `codex/calculadora-unificada`, com 897 testes unitários, tipagem, lint e build aprovados; conferência visual sintética desktop/celular e temas. Sem PR, merge, publicação ou banco operacional. Versão base 1.22.0 mantida; incremento único reservado à futura PR. [Entrega, evidências e limites](calculadora-unificada/ENTREGA.md). Consumo segue por peça até decisão específica sobre entrada total; tempo principal do lote em horas/minutos. PDV presencial é frente separada; tributação brasileira por regime/operação segue direção futura, sem regras fiscais inferidas. A revisão de espaçamentos local de outro chat permanece separada.


## 06/11/2026 — ajustes de espaçamento em revisão local

Main 1.22.0 (`16a6466`) reconferida com #42/#43 integradas. Menu com rolagem independente, perfil acessível e espaçamentos corrigidos em campos e cartão de produto. Versão 1.22.1 preparada em isolamento, com inspeção visual sintética desktop/celular e temas, 47 testes de interface/regressão e 4 de versão aprovados; tipagem e lint aprovados. [Evidências e limites](ux-admin-espacamento/ENTREGA.md). Sem PR, merge ou publicação. Registros abaixo mantêm o estado histórico de suas respectivas entregas.

Atualizado em 06/11/2026. Main de referência: 1.21.1 / 4786a8b.

## Fila atual após as entregas de 05/11/2026

| Estado | Entrega / próxima ação | Evidência e limite |
| --- | --- | --- |
| Integrada | E3.2: bloqueios acionáveis, cobertura por pedido e simulação comercial | PR #38, 1.18.0; previsão depende das premissas, sem garantir entrega |
| Integrada | Metas mensais persistidas, revisões e acompanhamento | PR #39, 1.19.0; histórico das metas não congela realizado; migração operacional pendente nos destinos ainda não atualizados |
| Integrada | UX de Orçamentos/Vendas e proteção de Voltar/Avançar | PRs #39/#40, 1.19.0/1.19.1 |
| Integrada | UX de Produção/Estoque, saldos, filtros, resumos e proteção de rascunhos | PR #41, 1.20.0; não encerra todas as expansões de planejamento E3 |
| Pendente | Publicar a versão integrada no destino escolhido | Backup/restauração, migrações por destino, saúde e versão; merge não comprova publicação |
| Em validação | Aceite humano dos fluxos reais | Pode acontecer durante o uso; registrar problemas sem operações fictícias na instalação publicada |
| Pendente | Backup externo automático e restauração periódica | Escolher destino, retenção e responsável |
| Em validação | Recorte visual aprovado: Catálogo e Kits (PR #43, sem merge) | Implementação: localizar produtos/kits, compreender publicação/disponibilidade e editar sem perda de campos; sem redesenhar a loja pública ou mudar regras |
| Pendente | E2.4 e alertas internos de propostas | Recorrência, amostra e cobertura a definir; sem mensagens externas ou revisão automática da ficha |

Esta fila substitui as recomendações datadas abaixo que ainda apontam metas salvas, prazo comercial e UX comercial/produtiva como ausências integrais. As PRs #38–#41 foram conferidas no GitHub e as notas da main consultadas; não foi repetida a execução dos testes nesta revisão documental. Publicações: local 1.18.0 (registro operacional local, fora desta PR) e tentativa remota cancelada (registro operacional local, fora desta PR). PR documental reconciliada em 1.21.2 sobre main 1.21.1; sem merge ou deploy.


[Desenho proposto de Catálogo e Kits](superpowers/specs/2026-11-05-catalogo-kits-ux-design.md), com abordagem, restrições e critérios de aceite; aprovado e implementado na PR #43, ainda em validação e sem merge.

## Registros históricos anteriores à consolidação

## 04/11/2026 — E3.2: PR e integração autorizadas

Preparação da PR em **1.18.0** (MINOR único sobre main 9797484/1.17.0), com manifestos/notas sincronizados. Usuário autorizou PR e integração; resultados de CI/merge serão registrados quando concluídos. Publicação operacional e homologação humana permanecem separadas. Os registros seguintes preservam as fases anteriores desta entrega.

## 04/11/2026 — E3.2 implementada e em validação local

Recorte aprovado e implementado na branch `codex/e3-2-previsao-comercial`, base main 9797484/1.17.0. Bloqueios têm próxima ação e resolução verificável; a venda tem cobertura por item e a negociação permite simular todos os itens do orçamento principal antes de vender, sem reservar capacidade. Pós-produção e transporte têm premissas explícitas, sem confundir retirada produtiva e entrega combinada. Impactos identificam lotes, OPs e vendas vinculadas. [Testes, revisão e limites](superpowers/reviews/2026-11-04-e3-2-previsao-comercial.md).

Implementação local, sem integração/publicação/PR/push ou migração operacional; versão mantida 1.17.0. Homologação humana permanece pendente. E3/E4 amplas continuam parciais: transferência, reimpressão causal, contribuição/hora de lote real, alertas e comissão continuam incrementos próprios. Documentos/skills da pasta operacional preservados. Próxima ação possível: revisar esta entrega local e autorizar especificamente eventual PR.

Os registros de detalhamento abaixo preservam a situação anterior à implementação.

## 04/11/2026 — E3.2 em detalhamento autorizado

Desenho aprovado pelo usuário em 04/11/2026. [Plano em sete tarefas](superpowers/plans/2026-11-04-e3-2-previsao-comercial.md) preparado e autorrevisado; próxima ação: revisão do plano/escolha de execução. Sem implementação, testes funcionais, PR/push/merge/publicação ou alteração operacional. Registro abaixo preserva o momento anterior à aprovação.

Usuário escolheu incluir simulação antes da venda, pelo orçamento principal, além dos bloqueios acionáveis e diagnóstico por pedido. [Desenho para aprovação](superpowers/specs/2026-11-04-e3-2-previsao-comercial-design.md): cenário temporário sem reserva, cobertura de toda demanda, impacto cruzado da equipe e pós-produção/transporte com premissas explícitas. Revisão independente sem perguntas materiais pendentes. Base main 9797484/1.17.0 em isolamento; alterações locais operacionais preservadas. Próxima ação: aprovação do desenho e plano. Implementação, testes funcionais, integração, publicação e homologação humana ainda não realizados neste incremento; sem PR/push ou mudanças operacionais. E3/E4 amplas continuam parciais.

Atualizado em: 04/11/2026. E2.2 implementada em isolamento, com validação e entrega registradas ao final. Main reconferida em 1.14.0 com E1.2 integrada; publicação atual não reconferida. Auditoria de 29/10 e registros históricos abaixo preservados.

## Como continuar em outro chat

Este é o arquivo de acompanhamento deste conjunto de melhorias. Leia-o junto com `AGENTS.md` e `PENDENCIAS.md` antes de continuar. Atualize este arquivo na mesma entrega de cada etapa, preservando decisões e evidências anteriores.

Pedido inicial sugerido para outro chat:

> Leia docs/ROADMAP-SELLER.md, confira o estado atual do código e continue a próxima etapa pendente na ordem aprovada. Atualize o acompanhamento com o que foi implementado, validado e publicado, sem confundir essas situações.

O usuário aprovou a ordem das seis etapas abaixo em 27/10/2026. Os itens são propostas de escopo para detalhamento, não uma aprovação de todos os detalhes de implementação. Antes de implementar cada etapa, conferir o código atual, definir os critérios finais e seguir o fluxo de desenho e planejamento aplicável. Não refazer módulos existentes.

## Objetivo

Conectar preço, margem e prazo: permitir à equipe decidir quanto cobrar, até onde negociar, quando entregar e onde melhorar o resultado. Usar o STL Seller como referência de experiência, aproveitando a base integrada do B2T.

Referência externa: https://www.youtube.com/watch?v=lIZhC4Lf68k

A análise da live foi visual, sem transcrição disponível. Algumas funcionalidades foram demonstradas; outras apenas apareceram em menus ou apresentações. O comportamento do concorrente não deve ser tratado como especificação técnica comprovada.

## Situação inicial verificada

Leitura de código em 27/10/2026; versão local do package.json: 1.3.0. Esta análise não executou testes nem validou a instalação publicada.

- Precificação V2: lote, FDM/resina, múltiplos materiais, desperdício fixo, energia, manutenção, falhas, trabalho, complementos, depreciação, taxas por canal e modos markup/margem/preço informado.
- Comparação de quantidades existente, com apresentação centrada no preço por peça.
- Rentabilidade: previsão versus realizado, fontes produtivas, revisões e indicação de cobertura dos dados.
- Planejamento: lotes por impressora, calendários, previsão, ordem por prazo, bloqueios e sugestões de agrupamento por máquina/material/cor.
- Comercial: clientes, orçamentos, validade, eventos, aprovação e conversão em venda; vendas, parcelas e entrega.
- Estoque e produção integrados. Não foi identificado módulo dedicado de consignação/pontos de venda nem funil completo de oportunidades nas fontes examinadas.

Fontes principais: `src/domain/pricing/`, `src/components/pricing/`, `src/domain/profitability/`, `src/server/profitability/`, `src/components/planning/`, `src/domain/planning/`, `src/components/commerce/` e `prisma/schema.prisma`.

Desenhos históricos úteis: `docs/superpowers/specs/2026-10-05-precificacao-avancada-design.md`, `2026-10-09-rentabilidade-u4-design.md` e `2026-10-10-planejamento-u5-design.md`, na mesma pasta. Confirmar o comportamento no código; esses documentos não substituem a verificação atual.

## Ordem aprovada e acompanhamento

| Etapa | Entrega | Situação | Próxima ação |
| --- | --- | --- | --- |
| E1 | Calculadora e decisões de preço | Em implementação | E1.1 publicada; E1.2 implementada localmente em 1.14.0, validada, sem publicação |
| E2 | Rentabilidade e explicação de desvios | Em implementação | E2.1 publicada; E2.2 implementada em isolamento, sem integração/publicação; rankings e recorrência separados |
| E3 | Fila visual e previsão para o comercial | Em implementação | E3.1 da PR #22 publicada e concorrência validada; detalhar bloqueios e execução |
| E4 | Funil de negociações e próximos contatos | Em implementação | E4.1 da PR #23 publicada, incluindo orçamentos; detalhar margem, prazo e alertas de proposta |
| E5 | Pontos de venda e consignação | Em implementação | E5.1 da PR #26 publicada na instalação 1.12.0; decidir balcão/feira sem refazer consignação |
| E6 | Conteúdo de anúncios e integrações externas | Em implementação | E6.1 da PR #31 publicada em 1.12.0; IA e integrações ainda dependem de desenho próprio |

Situações permitidas: Pendente, Em detalhamento, Em implementação, Em validação, Implementada ou Concluída. Registrar impedimentos e dependências em texto, sem marcar uma etapa como concluída apenas porque o código foi escrito.

Estado consolidado em 29/10/2026: todos os primeiros incrementos E1.1–E6.1 estão integrados e disponíveis na instalação local 1.12.0. As etapas amplas permanecem parciais. [Auditoria por chat/PR/código e pendências reais](superpowers/reviews/2026-10-29-roadmap-auditoria.md). [Backup, migração e publicação 1.12.0](superpowers/2026-10-29-publicacao-1.12.0.md). Os registros datados de preparação abaixo são históricos, não impedimentos atuais.

## E1 — Calculadora e decisões de preço

### Propostas

- [x] Contribuição estimada por hora de impressora, com premissas explícitas (E1.1, PR #19 integrada e publicada).
- [x] Comparação simultânea entre canais com taxas configuradas, sem presumir tarifas atuais de marketplaces. (E1.2 implementada localmente; versão 1.14.0 preparada, sem publicação.)
- [x] Simulação de descontos e efeito na margem. (E1.2 implementada localmente; versão 1.14.0 preparada, sem publicação.)
- [x] Distinguir preço para cobrir os custos modelados de preço para alcançar a meta comercial. (E1.2 implementada localmente; versão 1.14.0 preparada, sem publicação.)
- [x] Ampliar comparação de lotes: custo/preço por peça, contribuição total, tempo e material (E1.1, PR #19 integrada e publicada).
- [x] Salvar, identificar e comparar simulações, reaproveitando as memórias já existentes. (E1.2 implementada localmente; versão 1.14.0 preparada, sem publicação.)
- [ ] Avaliar importação de G-code/3MF: formatos suportados, dados disponíveis, limites e conferência humana antes de aplicar.
- [ ] Avaliar projeção mensal limitada por capacidade livre e demanda informada, distinguindo-a de previsão de vendas.

### Critérios propostos de conclusão

Comparar um mesmo produto por quantidade, canal e desconto com memória reproduzível; preservar o motor legado, as estimativas históricas e a decisão comercial do operador. Importação e projeção mensal podem virar incrementos próprios, desde que a decisão e as pendências sejam registradas explicitamente.

Auditoria: o comparador já informa se o preço cobre os custos modelados e distingue contribuição de resultado após depreciação. A comparação dedicada entre preço de cobertura e preço para meta permanece pendente em E1.2; não refazer o aviso existente.

## E2 — Rentabilidade e explicação de desvios

- [x] Comparar margem da memória de preço, efeito comercial e margem realizada, sem presumir histórico de negociação (E2.1, PR #21).
- [x] Explicar preço praticado, desconto, frete e taxas e a variação agregada do custo produtivo (E2.1).
- [x] Abrir a variação produtiva por material, trabalho e provisão de falhas, conforme rastreabilidade disponível (E2.2 implementada em isolamento; sem integração/publicação). Custos causais de falhas não medidos separadamente permanecem indisponíveis; parcela não reconciliada explícita. [Relatório](superpowers/reviews/2026-11-04-e2-2-desvios-produtivos.md).
- [ ] Ranking por produto, cliente e canal, com período e população definidos.
- [x] Manter custos incompletos/provisórios distintos dos resultados completos (E2.1).
- [ ] Sugerir revisão da ficha quando houver desvios recorrentes, sem alterar parâmetros automaticamente.

Critério proposto: demonstrar de onde vem cada desvio, reconciliar valores com as fontes e não contar perdas ou despesas duas vezes. Caixa, contribuição e resultado após depreciação permanecem indicadores distintos.

## E3 — Fila visual e previsão de entrega

- [x] Calendário visual por impressora sobre o planejamento existente (E3.1, PR #22 integrada e publicada).
- [x] Simular reordenação e mostrar impacto nos prazos antes de aplicar (E3.1; concorrência validada na suíte E3 exclusiva).
- [ ] Explicar prioridades e bloqueios com ações para resolvê-los.
- [ ] Avaliar transferência de lote para máquina compatível.
- [ ] Apresentar contribuição por hora como apoio, preservando compromissos e prazos assumidos.
- [ ] Simplificar a execução pelo operador: preparar, iniciar, apontar falha, retirar e concluir.
- [ ] Avaliar reimpressão vinculada à falha original e seus custos.
- [ ] Disponibilizar previsão ao comercial antes da promessa ao cliente, considerando também etapas posteriores à impressão.

Critério proposto: uma alteração de programação deve indicar pedidos afetados e respeitar calendários, material, compatibilidade e confirmação de capacidade. Previsão não equivale a garantia de entrega.

## E4 — Negociações

- [x] Oportunidade com etapas contato, levantamento, proposta, negociação, ganho e perdido (E4.1, PR #23 integrada e publicada).
- [x] Responsável, próximo contato e pendências (E4.1; filtros de contato atrasado existentes).
- [x] Histórico de interações e motivos de perda (E4.1).
- [x] Vínculo com orçamentos, identificação da versão atual e orçamento principal (E4.1); comparação imutável entre revisões é escopo distinto.
- [ ] Margem durante a negociação, incluindo desconto, frete e comissão quando aplicáveis.
- [ ] Consulta ao prazo produtivo.
- [x] Alertas internos de propostas sem retorno ou próximas do vencimento (implementados na PR #50, em validação; padrão14 configurável ADMIN e registros explícitos, sem merge/publicação).
- [x] Fechamento usando a conversão atual, sem duplicar vendas ou recebíveis (E4.1; concorrência real e rollback validados em banco exclusivo).

Critério proposto: acompanhar uma oportunidade até a venda ou perda, com histórico e próxima ação claros. Mensagens externas e automações de envio exigem escopo próprio.

## E5 — Pontos de venda e consignação

Prioridade proposta: lojas parceiras e consignação. Atendimento de balcão/feira é uma experiência distinta e precisa ter sua inclusão confirmada no desenho da etapa.

- [x] Cadastro de parceiros, responsáveis e condições comerciais (E5.1, PR #26).
- [x] Estoque por local e remessas com confirmação de recebimento (um local por parceiro, E5.1).
- [x] Registro de vendas, devoluções e perdas (E5.1).
- [x] Comissões nos dois modelos, acertos periódicos e valores a receber (E5.1).
- [x] Alertas internos por saldo mínimo de reposição e resultado por parceiro/produto (E5.1; sem mensagens externas automáticas).
- [x] Rastreabilidade com estoque e financeiro existentes (E5.1).
- [ ] Decidir o escopo do balcão/feira: busca rápida, carrinho, desconto, pagamento, estoque e comprovante.

Critério proposto: rastrear remessa → saldo no parceiro → venda/devolução/perda → comissão → acerto. Remessa em consignação não deve gerar venda ou receita antecipadamente.

## E6 — Conteúdo de anúncios e integrações

- [x] Gerar títulos e descrições a partir dos dados confirmados da ficha do produto.
- [x] Adaptar conteúdo por canal e permitir revisão (Instagram e WhatsApp).
- [x] Organizar fotos e informações para exportação manual.
- [x] Biblioteca de anúncios e rascunhos.
- [ ] Definir provedores, custos, créditos e tratamento de arquivos antes de adotar IA.
- [ ] Definir integrações reais por marketplace separadamente: autenticação, permissões, publicação, pedidos e sincronização.

Critério proposto: produzir e exportar material comercial consistente com o produto, sem inventar características ou disponibilidade. Publicação automática só conta como entregue após verificação no canal escolhido.

## Melhorias relacionadas — sem prioridade autônoma aprovada

- Ficha do produto: arquivos/versionamento, perfil de impressão, consumo e tempo realizados, disponibilidade e licença de uso.
- Assistente para consultar atrasos, desvios, propostas e reposição, com links para os registros que sustentam as respostas.

Esses itens devem ser incorporados a uma etapa quando necessários ou receber priorização explícita. Não ampliar silenciosamente as seis entregas.

## Regras de entrega e atualização

1. Trabalhar na ordem aprovada; registrar divisões em incrementos e qualquer mudança de escopo.
2. Antes de editar, conferir branch, alterações locais, instruções e estado atual. Não usar dados operacionais em testes destrutivos.
3. Marcar caixas somente com evidência. Recursos adiados ficam pendentes com motivo; não apagar pendências para encerrar a etapa.
4. Em cada entrega atualizar a tabela, as caixas, a próxima ação e o registro abaixo. Vincular desenho/plano, arquivos relevantes, validação e PR/commit quando existirem.
5. Registrar separadamente: implementado, validado, integrado em main e publicado. Informar pendências de migração/configuração.
6. Cumprir `AGENTS.md` em toda PR, inclusive documentação: versão única nos manifestos, notas em português, consistência dos rodapés e histórico; comparar com main antes do merge. Um incremento de versão por PR. Não criar tags automaticamente.
7. Este arquivo de acompanhamento não autoriza por si só publicar, contratar provedores ou enviar mensagens externas.

## Registro de entregas

### 27/10/2026 — criação do acompanhamento

- Ordem E1–E6 aprovada pelo usuário e registrada.
- Diagnóstico inicial baseado em leitura de código; nenhuma melhoria de produto implementada nesta entrega.
- Validação: revisão do documento, links locais de referência e diff de documentação.
- Versão do produto observada: 1.3.0; sem incremento nesta criação local, pois nenhuma PR foi preparada ou entregue. Aplicar a regra de versão ao preparar a PR que incluir este documento.
- PR/merge/publicação: não realizados nesta entrega.
- Próxima ação: detalhar E1, começando por comparação de canais, descontos, contribuição por hora e apresentação dos cenários existentes.

### 27/10/2026 — E1.1 em desenho

- Código atual conferido: comparação de até dez quantidades sobre `calculateV2`, apresentação de preço por peça e snapshots com entradas/resultados preservados.
- Primeiro incremento proposto: ampliar comparação de lotes com custos, contribuição, margem, resultado após depreciação, tempo, material e contribuição por hora. Não refazer o motor V2.
- Desenho: [E1.1 — comparação de lotes](superpowers/specs/2026-10-27-e1-comparacao-lotes-design.md), aguardando aprovação; plano de implementação ainda não elaborado.
- Canais/descontos e comparação de memórias ficam nos incrementos seguintes propostos. Importação G-code/3MF e projeção mensal continuam pendentes em avaliações separadas.
- Verificação nesta etapa: leitura das fontes e testes existentes; testes, build e validação visual não executados.
- Main consultada: 1.5.0, commit `403740897a9d81b7ad87d0dece40b4f80ca52483`. Versão local 1.5.1 e alterações de Docker/manifestos/notas pertencem a trabalho separado e foram preservadas.
- Isolamento: worktree nativa solicitada a partir de `origin/main`; preparação ainda em andamento no momento deste registro.
- Implementação / validação funcional / PR / merge: não realizados. Sem incremento de versão, pois nenhuma PR foi preparada ou entregue.
- Publicação: não realizada; instalação operacional permanece na 1.4.0 conforme contexto recebido, sem nova validação operacional. Nenhuma migração ou atualização de contêineres.
- Próxima ação: aprovar o recorte E1.1, elaborar plano e implementar no isolamento quando disponível.

### 27/10/2026 — E1.1 entregue para revisão

- Desenho aprovado, plano executado e implementação na worktree `C:/Users/Administrador/.codex/worktrees/e1-decisoes-preco/appb2t`, branch `codex/e1-comparacao-lotes`.
- Comparação ampliada com custo/preço por peça, receita, contribuição, margem, resultado após depreciação, tempo, material e contribuição/hora; motor V2 e memórias preservados.
- Validação: 78 testes relacionados aprovados, teste comercial reforçado repetido (5 aprovados), tipagem, lint e build aprovados, revisão independente sem achados pendentes e prévia desktop/375 px sem rolagem horizontal. Suíte unitária completa reproduziu recursão do Vitest e foi interrompida sem resumo; integrações de banco não executadas.
- [Desenho](superpowers/specs/2026-10-27-e1-comparacao-lotes-design.md), [plano](superpowers/plans/2026-10-27-e1-comparacao-lotes.md) e [relatório](superpowers/reviews/2026-10-27-e1-comparacao-lotes.md).
- Versão de desenvolvimento 1.6.0; [PR #19](https://github.com/bsgirardi/appb2t/pull/19) em rascunho, implementação `dff8fd7`, acompanhamento `725e707`. Merge e publicação não realizados. Instalação operacional permanece na 1.4.0 conforme contexto recebido; sem migração ou alteração de contêineres.
- E1 continua parcial: canais/descontos e comparação de memórias pendentes; importação G-code/3MF e projeção mensal em avaliações separadas. Próxima ação: revisar E1.1 e resolver/aceitar explicitamente o limite de testes antes de integrar; detalhar E1.2 sem publicar nem integrar sem autorização.

### 27/10/2026 — E2 iniciada: análise e proposta E2.1

- Leitura de AGENTS.md, pendências, roadmap, domínio, fontes, agregação, consulta, detalhe e testes existentes de rentabilidade; acompanhamento e chat E1 conferidos. E1.1 está na PR #19 em rascunho, sem merge/publicação; E1 não foi presumida concluída.
- [Proposta E2.1](superpowers/specs/2026-10-27-e2-desvios-proposta.md): reconciliar receita da memória → previsto na venda negociada → realizado, no detalhe existente, com fontes, cobertura e critérios numéricos. Abordagem recomendada ainda sujeita à escolha e aprovação; plano executável ainda não elaborado.
- Dependência: E2.1 pode usar contratos já existentes na main 1.5.0; comparação de simulações de canais/descontos depende dos próximos contratos E1. Não reutilizar a worktree ou banco de E1. Detalhamento por componentes/falhas, rankings e recorrência ficam nos próximos incrementos E2.
- Validação desta entrega: inspeção estática e conferência de diferenças documentais. Sem testes funcionais, integração, build ou validação operacional; resultados de E1 não são validação de E2.
- Implementação / PR / merge / publicação: não realizados. Versão inalterada por não haver PR entregue. Nenhuma migração, banco ou contêiner alterado; trabalho local de outros chats preservado.
- Próxima ação: escolher o recorte e aprovar desenho E2.1, então planejar e executar em isolamento a partir da main atual. PR/merge exigem autorização específica; publicação permanece proibida.

### 27/10/2026 — desenho E2.1 aprovado e plano preparado

- Usuário aprovou o recorte e desenho neste chat. [Plano E2.1](superpowers/plans/2026-10-27-e2-reconciliacao.md) preparado e conferido contra os critérios aprovados.
- Decisão técnica do plano: projeção pura para apresentação sobre o DTO existente, preservando motor, engineVersion e avaliações históricas. Reconciliação monetária por linha/venda, taxas com precisão compatível e cobertura independente por trecho.
- Implementação e validação funcional ainda não iniciadas; revisão documental com `git diff --check`. Versão inalterada. Sem PR, merge, publicação, migração ou mudança operacional.
- Próxima ação: revisão do plano pelo usuário; recomendação de execução direta neste chat, em worktree própria. E1 continua parcial e não foi alterada.

### 27/10/2026 — E2.1 implementado localmente

- Desenho/plano aprovados e execução direta em worktree própria `C:/Users/Administrador/.codex/worktrees/e2-reconciliacao/appb2t`, branch `codex/e2-reconciliacao`, a partir da main 1.5.1 (`d74ee75`). E1 não foi alterada nem presumida concluída.
- Detalhe da venda agora explica receita da memória → previsto na venda → realizado, com margens por etapa, efeitos comerciais/produtivos agregados, cobertura independente e fontes por linha. Projeção somente de leitura; motor, apurações persistidas e engineVersion preservados. Perdas/complementos não são somados novamente.
- Validação: 34 testes relacionados em 7 arquivos, tipagem, lint e build aprovados. Revisão independente sem achados acionáveis. Prévia sintética desktop/375 px com estados completo/incompleto/negativo e múltiplas linhas, sem rolagem horizontal da página; tabelas com rolagem local.
- Limite: suíte unitária completa reproduziu recursão conhecida do Vitest, interrompida sem resumo. Integrações de banco e validação autenticada operacional não executadas. [Relatório e limites](superpowers/reviews/2026-10-27-e2-reconciliacao.md).
- Versão mantida em 1.5.1: entrega local, sem PR/push/merge/publicação. Nenhuma migração, alteração de banco ou contêiner. Futura PR exige autorização específica e incremento MINOR comparado à main, com notas e manifestos sincronizados.
- E2 permanece parcial: componentes/falhas detalhados, rankings e recorrência/revisão da ficha pendentes. Próxima ação: revisar E2.1 e resolver/aceitar explicitamente limite da suíte completa antes de eventual integração; detalhar E2.2 quando autorizado. Publicação permanece proibida.

### 27/10/2026 — E3 iniciada: inspeção e proposta E3.1

- Conferidos AGENTS.md, pendências, acompanhamento original e código U5 atual. Main local/remota em `d74ee75`, versão 1.5.1. E1 #19 e E2 #21 constam em rascunho no acompanhamento; não foram presumidas integradas ou concluídas, nem seus chats alterados.
- [Proposta E3.1](superpowers/specs/2026-10-27-e3-fila-visual-proposta.md): calendário por impressora e simulação antes de confirmar reordenação, preservando o scheduler e comandos U5. Critérios incluem impacto entre máquinas pela equipe compartilhada, OPs/linhas afetadas, ausência de dados, concorrência e acessibilidade.
- Dependências registradas: transferência exige coerência com máquina planejada U3; contribuição/hora de lote exige contrato além dos cenários E1; reimpressão exige conciliação e vínculo à falha; previsão comercial exige cobertura da demanda e etapas posteriores à retirada. E3.1 pode usar a main sem depender de E1/E2.
- Desenho: proposta para escolha/aprovação, sem plano executável ou implementação. Validação: inspeção estática e conferência documental; sem testes funcionais, build, banco ou validação operacional.
- Versão 1.5.1 preservada; sem PR, push, merge ou publicação. Nenhuma migração ou alteração de contêineres. Trabalho local de outros chats preservado. Isolamento exclusivo será preparado antes da implementação.
- Próxima ação: aprovar recorte e desenho de E3.1 e elaborar plano; itens amplos de E3 permanecem pendentes. Futura PR exige incremento e notas comparados à main atual; integração/publicação dependem de autorização específica.

### 27/10/2026 — desenho E3.1 aprovado e plano preparado

- Usuário aprovou o recorte e desenho de calendário visual e simulação da fila sobre U5. [Plano E3.1](superpowers/plans/2026-10-27-e3-fila-visual.md) preparado, com cinco tarefas e critérios de validação.
- Decisões do plano: prévia de leitura integral, comparação pelo mesmo instante, confirmação com revisão e fingerprint recalculado no servidor, validade de 60 segundos e invalidação ao cruzar fronteira temporal prevista. Reutilizar infraestrutura de comando e idempotência; nenhum novo agendador ou migração.
- Inspeção adicional: comandos de estoque/produção e edição de máquina incrementam revisão; criação de máquina não o faz, tornando necessária conferência integral. Testes atuais truncam banco compartilhável em porta fixa: planejar configuração E3 exclusiva, sem usar banco de E1/E2 nem alterar contêineres.
- Validação: autorrevisão documental e `git diff --check`; sem testes funcionais, implementação, PR, merge ou publicação. Versão mantida em 1.5.1. E1/E2 e suas edições preservadas.
- Próxima ação: revisão do plano e escolha do método; recomendada execução direta neste chat em worktree própria. Sem autorização de integração ou publicação.

### 27/10/2026 — E3.1 implementado localmente

- Desenho/plano aprovados e execução direta em worktree própria `C:/Users/Administrador/.codex/worktrees/e3-fila-visual/appb2t`, branch `codex/e3-fila-visual`, base main 1.5.1 (`d74ee75`). E1/E2 preservadas, sem interação ou mudança de seus chats.
- Calendário semanal por impressora com fases e dados ausentes; reordenação acumulável simulada antes da confirmação, comparação de intervalos/OPs/linhas afetadas inclusive entre máquinas; prévia de leitura e confirmação com dados atuais, revisão, validade temporal e idempotência. Motor U5 e fatos produtivos preservados.
- Validação: 45 testes focados aprovados em execuções separadas, tipagem, lint e build aprovados. Prévia sintética desktop/375 px, claro/escuro, teclado e rolagem local sem transbordamento da página. Revisão independente com dois achados P2 corrigidos e regressões verificadas. [Relatório e limites](superpowers/reviews/2026-10-27-e3-fila-visual.md), [desenho](superpowers/specs/2026-10-27-e3-fila-visual-proposta.md), [plano](superpowers/plans/2026-10-27-e3-fila-visual.md).
- Limites: execução completa de UI reproduziu recursão do transporte do Vitest; suíte completa não validada. Banco exclusivo `localhost:55433/b2t_e3_test` indisponível, integrações/API/concorrência de banco não executadas. Sem validação autenticada operacional. Não reutilizado banco de outra etapa.
- Implementação em `49652b4` (com commits anteriores da branch); versão mantida em 1.5.1 nesta entrega local, sem PR, push, merge ou publicação. Nenhuma migração ou alteração de banco/contêineres. Eventual PR requer autorização específica e incremento MINOR sobre main atual, com notas e manifestos sincronizados.
- E3 permanece parcial: bloqueios com ações específicas, transferência, contribuição/hora de lote, simplificação de execução, reimpressão e previsão comercial completa seguem pendentes conforme dependências do desenho. Próxima ação: validar em banco exclusivo e resolver/aceitar explicitamente limite da suíte antes de eventual integração; depois detalhar próximos incrementos quando autorizado.

### 27/10/2026 — PR E3.1 criada após autorização

- [PR #22 em rascunho](https://github.com/bsgirardi/appb2t/pull/22), branch `codex/e3-fila-visual`, versão 1.6.0 (MINOR), sobre main 1.5.1 (`d74ee75`). Manifestos sincronizados, notas em português e histórico anterior preservado; sem incremento adicional nesta mesma PR.
- Revalidação: 46 testes focados aprovados em execuções separadas (35 domínio/guarda, 6 simulação, 2 calendário, 3 versão/rodapés/Atualizações ADMIN/OPERATOR), tipagem, lint e build aprovados. Suíte completa e integrações de banco continuam sem validação, conforme relatório; criação da PR não representa aceite desses limites para merge.
- Implementação `49652b4`, preparo de versão `ba573f8`; PR aberta e em rascunho, anexada ao chat. E1 #19 e E2 #21 também propõem 1.6.0; reconsultar main e reconciliar versão/notas conforme ordem de integração. Nenhum desses chats ou branches foi alterado.
- Sem merge, publicação, migração ou alteração de banco/contêineres. E3 permanece parcial; próxima ação: revisar PR, validar ambiente exclusivo e resolver/aceitar limite da suíte antes de eventual integração, que exige autorização específica.

### 28/10/2026 — E5 iniciada: inspeção e proposta E5.1

- Conferidos AGENTS.md, PENDENCIAS.md, roadmap original e módulos de estoque pronto/insumos, produção, comercial, financeiro e rentabilidade. Main local/remota `7fe37d9`, versão 1.10.1; E1.1–E4.1 integradas e publicação local registradas, etapas amplas ainda parciais. Limites históricos de testes não tratados como impedimentos atuais.
- [Proposta E5.1](superpowers/specs/2026-10-28-e5-consignacao-proposta.md): recomendação de parceiros e custódia primeiro, com remessas, recebimento parcial, saldos, retorno e perda; alternativa de ciclo completo para escolha. Balcão/feira fora do recorte proposto, sem presumir decisão final.
- Dependências concretas: estoque pronto não tem local, compromissos/entregas exigem venda e recebíveis nascem da confirmação comercial. Remessa precisa de custódia própria vinculada às origens, coordenação com reservas e tipos que não sejam classificados como perdas. Venda/comissão/acerto e resultado por parceiro exigem contrato adicional.
- Desenho: proposta de abordagem, ainda sem aprovação ou plano executável. Implementação: não iniciada; isolamento exclusivo previsto antes de código. Validação: inspeção estática e conferência documental, sem testes funcionais/build/banco. PR/merge/publicação/migração: não realizados. Versão 1.10.1 preservada.
- Arquivos/alterações dos outros chats preservados; nenhum chat alterado ou contatado. Próxima ação: escolher abordagem, escrever/aprovar desenho completo e planejar. PR, merge e publicação não autorizados; não alterar contêineres nem banco operacional.

### 28/10/2026 — ciclo completo E5.1 escolhido e desenho preparado

- Usuário escolheu entregar o ciclo completo já e confirmou ambos os modelos: comissão retida pela loja ou recebimento integral com comissão paga separadamente. A proposta de custódia primeiro foi superada por essa decisão.
- [Desenho completo E5.1](superpowers/specs/2026-10-28-e5-consignacao-design.md) preparado e submetido a revisão independente, sem perguntas materiais pendentes para planejar. Inclui parceiros, custódia por origem, remessas/recebimento parcial, vendas efetivas, devoluções/perdas, títulos/baixas existentes, comissões, acertos mensais/complementares, reposição e resultado por parceiro/produto.
- Propostas adicionais claramente identificadas para aprovação: parceiro como devedor nos dois modelos (sem recebimento direto de consumidor), um local por parceiro, comissão percentual, condições congeladas na confirmação da venda, correção comercial integral por cancelamento/relançamento. Balcão/feira, portal externo e múltiplas filiais fora do recorte.
- Desenho ainda não aprovado; plano e implementação não iniciados. Validação: inspeção de contratos de estoque/comercial/financeiro/custos, revisão independente e git diff --check; sem testes funcionais/build/banco. Main remota reconferida `7fe37d9`, versão 1.10.1 preservada.
- Sem PR, merge, publicação, migração ou alteração de contêineres. Próxima ação: aprovar desenho completo e então elaborar plano com isolamento e banco E5 exclusivos. Escolha da abordagem não equivale à aprovação dos detalhes novos.

### 28/10/2026 — desenho completo E5.1 aprovado e plano preparado

- Usuário aprovou o desenho completo com os dois modelos de comissão, parceiro devedor, local único e correção comercial integral. [Plano E5.1](superpowers/plans/2026-10-28-e5-consignacao.md) preparado com sete tarefas, contratos de integração e critérios de validação; autorrevisado contra o desenho.
- Plano cobre domínio/persistência, custódia, venda/títulos, custos/rentabilidade, acertos/correções, consultas/UI e validação integrada. Inclui auditoria da ordem de locks e guardas dos caminhos legados, sem usar confirmação U3 para gerar título bruto no modelo retido.
- Isolamento previsto antes de código: worktree E5 própria e banco exclusivo via E5_TEST_DATABASE_URL, allowlist localhost/127.0.0.1:55435/b2t_e5_test. Não usar setup/banco de outra etapa; não iniciar/alterar contêineres. Disponibilidade do banco não verificada nesta entrega.
- Validação desta entrega: leitura dos contratos e configuração atual, autorrevisão documental e git diff --check. Implementação, testes funcionais, build, migração, PR, merge e publicação não realizados. Versão preservada em 1.10.1.
- Próxima ação: revisão do plano e escolha do método; recomendada execução direta neste chat com revisão independente final. E5 segue em detalhamento até início de implementação; publicação/PR/merge continuam sem autorização.

### Modelo para próximas atualizações (preenchimento seguinte)

Copiar e preencher a cada entrega, mantendo a mais recente acima deste modelo:

- Data e etapa/incremento:
- Situação e itens concluídos:
- Decisões e itens adiados:
- Desenho/plano e arquivos principais:
- Verificações executadas e resultados:
- Limitações ou verificações ainda pendentes:
- Versão / PR / commit:
- Merge em main:
- Publicação e migrações/configurações:
- Próxima ação concreta:

### 27/10/2026 — PR E2.1 criada após autorização

- [PR #21 em rascunho](https://github.com/bsgirardi/appb2t/pull/21), branch `codex/e2-reconciliacao`, versão 1.6.0 (MINOR), baseada na main 1.5.1 (`d74ee75`). Manifestos sincronizados, notas em português e histórico anterior preservado.
- Revalidação: 37 testes em 8 arquivos aprovados, incluindo consistência da versão, rodapés de login/admin e Atualizações para ADMIN/OPERATOR; tipagem, lint e build aprovados. Limite da suíte completa continua registrado no relatório.
- E1 #19 também propõe 1.6.0; reconsultar main e reconciliar versão/notas antes do merge conforme a ordem de integração. E1 continua independente e não foi alterada.
- Implementação `d55c309`, preparo de versão `c4227cf`; sem merge, publicação, migração ou atualização de contêineres. Instalação operacional preservada. E2 permanece parcial.

### 27/10/2026 — E4 iniciada: inspeção e proposta E4.1

- Início de E4 expressamente solicitado pelo usuário; E1–E3 continuam parciais e não foram presumidas concluídas. Main local/remota conferidas em `d74ee75`, versão 1.5.1. Chats anteriores não foram alterados nem receberam mensagens.
- [Proposta E4.1](superpowers/specs/2026-10-27-e4-negociacoes-proposta.md): oportunidade própria, responsável, próxima ação, pendências, interações e perda; vínculo aos orçamentos existentes e ganho pela conversão atual, incluindo aceite privado e proteção contra duas vendas de uma oportunidade.
- Dependências: E4.1 pode usar main atual; histórico integral de versões, alertas de retorno/vencimento, margem global e prazo comercial completo ficam para incrementos específicos. Versão de concorrência não equivale a arquivo de propostas anteriores; emissão interna não prova contato com cliente.
- Estado: abordagem recomendada para escolha, desenho ainda não aprovado e plano não elaborado. Critérios verificáveis e riscos de concorrência registrados na proposta.
- Validação: inspeção estática e `git diff --check`; sem testes funcionais, build ou banco. Implementação / PR / merge / publicação: não realizados. Versão preservada, sem migração ou alteração de contêineres; arquivos e alterações existentes preservados.
- Próxima ação: escolher abordagem e ajustar recorte, escrever/aprovar desenho completo e então planejar execução em isolamento e banco E4 exclusivos. PR/merge exigem autorização específica; publicação permanece proibida.

### 27/10/2026 — abordagem E4.1 aprovada e desenho preparado

- Usuário aprovou oportunidade própria vinculada aos orçamentos. [Desenho completo E4.1](superpowers/specs/2026-10-27-e4-negociacoes-design.md) preparado; revisão independente sem perguntas materiais pendentes para planejar.
- Detalhados estados, cliente/responsável, próxima ação civil, histórico privado, idempotência, vínculos sem transferência, ganho por conversão administrativa/aceite privado e venda vencedora única. Perda exige retirada prévia de oferta privada ativa; publicação/conversão respeitam encerramento sob a coordenação atual.
- Decisões adicionais do desenho são propostas técnicas, não aprovação presumida: cliente cadastrado obrigatório, ausência de desvínculo/exclusão, reabertura de perda para levantamento e cancelamento de venda sem reabertura automática. Versões integrais, margem e prazo completo seguem fora de E4.1.
- Main remota reconferida em `d74ee75`, 1.5.1. Verificação documental com `git diff --check`; sem implementação, testes funcionais ou build. Plano ainda não elaborado. Sem PR/push/merge/publicação, banco, migração ou alteração de contêineres.
- Próxima ação: aprovar desenho completo e elaborar plano de execução em isolamento. Abordagem aprovada não foi registrada como aprovação dos novos detalhes do desenho.

### 27/10/2026 — desenho E4.1 aprovado e plano preparado

- Usuário aprovou o desenho completo de oportunidade própria, responsável, próxima ação, histórico e fechamento integrado. [Plano E4.1](superpowers/plans/2026-10-27-e4-negociacoes.md) preparado com seis tarefas, interfaces, critérios e testes; autorrevisado contra o desenho.
- Plano prevê migração aditiva e execução em worktree E4 própria. Integrações terão configuração exclusiva com E4_TEST_DATABASE_URL e allowlist localhost/127.0.0.1:55434/b2t_e4_test, sem reutilizar setup/bancos de outras etapas. Disponibilidade do banco ainda não verificada; não há autorização para alterar contêineres.
- Verificação desta entrega: leitura de serviços, setup de testes e contratos; revisão documental e git diff --check. Nenhuma implementação, teste funcional, build, migração ou alteração operacional. Versão permanece 1.5.1, sem PR/push/merge/publicação.
- Próxima ação: revisar o plano e escolher método. Recomendada execução direta neste chat com revisão independente ao final, por compartilhamento de transações comerciais; implementação ainda não iniciada. E4 permanece parcial/em detalhamento e E1–E3 preservadas.

### 28/10/2026 — E4.1 implementado localmente

- Desenho/plano aprovados e execução direta em worktree própria `C:/Users/Administrador/.codex/worktrees/e4-negociacoes/appb2t`, branch `codex/e4-negociacoes`, base main 1.5.1 (`d74ee75`). E1–E3 e arquivos de outros chats preservados.
- Oportunidade própria com responsável, próxima ação/data civil, pendências, interações e perda/reabertura auditadas; vínculo a orçamentos e ganho integrado à conversão administrativa e ao aceite privado, com venda vencedora única e guardas para ofertas ativas. Lista/detalhe privados e vínculo no orçamento; não recriados documentos, venda ou parcelas.
- Validação: 28 testes focados/regressões em 15 arquivos, tipagem, lint, build e verificações estáticas de schema/SQL aprovados. Prévia SSR sintética desktop/375 px sem overflow observado e Tab nativo conferido. Revisão independente com três P2: filtro corrigido com regressão RED→GREEN e lacunas de testes preparadas.
- Limites: PostgreSQL exclusivo `127.0.0.1:55434/b2t_e4_test` indisponível; integração, migração real e concorrência de banco não validadas. Suíte unitária completa reproduziu recursão conhecida do Vitest, interrompida sem resumo. Sem fluxo autenticado operacional. [Relatório e limites](superpowers/reviews/2026-10-28-e4-negociacoes.md).
- Commits de implementação até `b7a4da2`; versão mantida 1.5.1 nesta entrega local, sem PR/push/merge/publicação, migração real ou atualização de contêineres. Futura PR exige autorização específica e incremento MINOR sobre main atual, manifestos/notas sincronizados.
- E4 permanece parcial/em validação: vínculo à versão atual implementado, histórico integral de propostas, alertas de retorno/vencimento, margem global e prazo comercial completo continuam pendentes. Caixas amplas não encerradas antes de validação de persistência. Próxima ação: disponibilizar banco E4 por procedimento autorizado e executar integrações, além de resolver/aceitar limite da suíte antes de eventual integração.

### 28/10/2026 — E4.1 validado em PostgreSQL e PR autorizada

- Usuário autorizou validar migração/concorrência e criar PR. Instância PostgreSQL 17 E4 descartável exclusiva, sem volumes persistentes, sem atualizar contêineres existentes e sem usar bancos operacional/compartilhados.
- Migração real base → E4 aprovada, preservando dados sintéticos em sete tabelas comerciais legadas; reaplicação, ausência de backfill, FK e venda vencedora única conferidos. Validador reproduzível em tests/e4/migration-validation.ts.
- 21 integrações em 6 arquivos aprovadas. Cenários forçam espera real de dois comandos pelo bloqueio PostgreSQL; cinco rodadas finais de 10 casos aprovadas, incluindo disputa admin/aceite privado, perda/publicação/aceite, vínculo/cliente e rollback. Fixtures corrigidas para os contratos existentes; nenhuma regra de produto flexibilizada.
- 31 testes unitários/UI/regressões, tipagem, lint e build aprovados; manifestos/rodapés/Atualizações conferidos. Revisão independente adicional com um caso condicional separado para garantir disputa aceite/perda em toda execução. [Relatório de validação e preparo da PR](superpowers/reviews/2026-10-28-e4-validacao-pr.md).
- Versão da branch preparada em 1.6.0 MINOR sobre main remota 1.5.1 (d74ee75), sem alterar dependências ou repetir incremento. PR em preparo; URL será registrada após criação. Merge/publicação/migração operacional não realizados.
- Limite restante: suíte unitária completa ainda sem resumo por recursão conhecida do Vitest; manter PR em rascunho até resolver/aceitar explicitamente esse limite. E4 ampla permanece parcial: versões integrais, margem, alertas de retorno/vencimento e prazo completo pendentes. Antes do merge reconciliar versão/notas com main e PRs paralelas.

### 28/10/2026 — PR E4.1 criada após validação e autorização

- [PR #23 em rascunho](https://github.com/bsgirardi/appb2t/pull/23), branch codex/e4-negociacoes, versão 1.6.0 sobre main 1.5.1. Implementação/validação até ca7012c; banco E4 descartável removido após verificações, contêineres existentes preservados.
- Migração real e 21 integrações aprovadas; cinco rodadas finais de 10 casos com disputa real de locks aprovadas. Mais 31 testes unitários/UI/regressões, tipagem, lint e build aprovados. [Relatório atual](superpowers/reviews/2026-10-28-e4-validacao-pr.md).
- PR vinculada ao chat, aberta em rascunho. Sem merge/publicação/migração operacional. Limite da suíte completa por recursão Vitest mantido explícito para decisão antes de integrar; reconciliar versão/notas com main e PRs paralelas antes do merge. E4 ampla segue parcial.

### 28/10/2026 — integração autorizada das quatro PRs

PRs #19, #21, #22 e #23 reconciliadas nas versões 1.7.0, 1.8.0, 1.9.0 e 1.10.0. Os registros acima são históricos da preparação. A validação atual cobre todos os unitários em lotes e checkout principal, regressão geral PostgreSQL, E3 exclusiva, migração/concorrência E4 e build/tipos/lint. [Evidências e limites](superpowers/reviews/2026-10-28-integracao-prs.md). Publicação e migração operacional permanecem separadas; E1–E4 amplas continuam parciais.

### 28/10/2026 — manutenção e publicação local 1.10.1

E1.1–E4.1 integradas e disponíveis na instalação local com suas migrações. PR #25 resolve descoberta de testes, recursão de validação e observação de concorrência em pool pequeno, acrescenta CI real e publica a versão 1.10.1 com 103 projeções legadas preservadas. [Registro de publicação e limites](superpowers/2026-10-28-publicacao-1.10.1.md). A validação humana com a equipe e os próximos incrementos de cada etapa continuam pendentes; domínio externo e backup externo não foram configurados.


### 28/10/2026 — E5.1 implementada e validada localmente

E5.1 implementada e validada localmente em worktree isolada, branch `codex/e5-consignacao`: ambos os modelos de comissão, custódia, vendas, títulos, acertos, correções, custos, reposição e resultado. 661 testes unitários e 32 integrações/regressões aprovados; migração real/reaplicação em PostgreSQL exclusivo, tipos, lint e build aprovados. Revisão independente com dois P2 corrigidos e testados. [Relatório e limites](superpowers/reviews/2026-10-28-e5-consignacao.md). Versão 1.10.1 preservada; sem PR/push/merge/publicação ou migração operacional. Próxima etapa: revisão humana e preparação de PR quando autorizada. E5 em validação; balcão/feira fora do recorte.

### 28/10/2026 — PR E5.1 autorizada e em preparação

Usuário autorizou criar a PR do ciclo completo. Branch `codex/e5-consignacao` preparada em 1.11.0 MINOR sobre main 1.10.1 (`7fe37d9`), com manifestos e notas sincronizados. Validações da implementação: 661 unitários e 32 integrações/regressões, migração real/reaplicação exclusiva, tipos, lint e build aprovados. Revalidação da preparação: 661 unitários, 3 testes específicos de versão/rodapés, lint e build aprovados. Sem merge/publicação/migração operacional. [Evidências e limites](superpowers/reviews/2026-10-28-e5-consignacao.md).

### 28/10/2026 — PR E5.1 criada

[PR #26](https://github.com/bsgirardi/appb2t/pull/26) aberta para revisão, versão 1.11.0, branch codex/e5-consignacao. Revalidação de preparação aprovada; CI iniciado e resultado ainda pendente. Sem merge/publicação/migração operacional. E5 segue em validação.

### 29/10/2026 — E6.1 com canais definidos e desenho preparado

Usuário aprovou Instagram e WhatsApp como primeiros canais e preparação de material para revisão/publicação manual. [Desenho E6.1](superpowers/specs/2026-10-29-e6-anuncios-design.md) preparado: biblioteca privada por produto/canal, textos de campos confirmados, seleção/ordem de fotos, revisão vigente, exportação de texto/fotos e tratamento de alterações da ficha. Revisão independente sem perguntas materiais pendentes. Detalhes são propostas aguardando aprovação do desenho completo; não há código, dependências instaladas, migração ou implementação nesta entrega. IA, marketplaces e integração/postagem automática permanecem pendentes. Base main 1.11.1 (`e273091`), versão preservada; sem PR, push, merge ou publicação. Próxima ação: aprovar desenho e elaborar plano de execução em isolamento. E6 ampla permanece parcial/em detalhamento.

### 29/10/2026 — desenho E6.1 aprovado e plano preparado

Usuário aprovou o desenho completo da biblioteca para Instagram e WhatsApp. [Plano E6.1](superpowers/plans/2026-10-29-e6-anuncios.md) preparado e autorrevisado: seis tarefas de domínio, persistência/API, exportação, interface shadcn, migração/CI e entrega com revisão final independente. Método direto em isolamento preservado; confirmação do plano é a próxima ação antes de implementar. Banco previsto exclusivo em localhost:55436/b2t_e6_test, sem compartilhar bases das outras etapas ou alterar serviços operacionais. Main reconferida em 1.11.1 (`e273091`); versão preservada nesta preparação. Somente documentação e git diff --check; nenhum código, instalação, teste funcional, migração, PR, push, merge ou publicação executados. E6 permanece em detalhamento.

### 29/10/2026 — E6.1 implementada em isolamento

Plano aprovado e executado na branch local `codex/e6-anuncios`, sobre main 1.11.1 (`e273091`), com versão 1.12.0 preparada. Biblioteca privada para Instagram/WhatsApp, sugestões determinísticas, revisão vigente, seleção e ordem das fotos, cópia e ZIP para publicação manual, comparação de edições e arquivamento/restauração. Migração real/reaplicação preservou onze projeções legadas; nove testes E6 e regressões E3/E4/E5 aprovados. Ensaio desktop/celular e acesso de administrador/operador confirmados com dados fictícios. Revisão independente encontrou dois problemas, reproduzidos e corrigidos com testes. [Relatório, evidências e limites](superpowers/reviews/2026-10-29-e6-anuncios.md). Verificações gerais finais registradas no relatório. Sem PR, push, merge, publicação ou migração operacional; IA, marketplaces e postagem automática continuam pendentes. A pasta operacional e o trabalho dos demais chats foram preservados.

### 29/10/2026 — E6.1 integrada/publicada e roadmap auditado

Usuário autorizou PR, CI, merge e publicação local, seguidos da conferência das pendências dos outros chats. [PR #31](https://github.com/bsgirardi/appb2t/pull/31) integrada, commit `6e901a7`, versão 1.12.0. CI aprovado com 989 testes padrão e suítes E3–E6; backup final restaurado, migrações E5/E6 ensaiadas e aplicadas, 106 projeções legadas e mesmo banco/volume preservados. Login publicado exibe 1.12.0; saúde e proteção das rotas conferidas. [Registro de publicação](superpowers/2026-10-29-publicacao-1.12.0.md).

Lidos os chats E1–E5 e confrontados com PRs e código atual. Corrigidos itens já entregues de E2 (reconciliação/cobertura), E4 (orçamentos) e E5 (ciclo completo), sem apagar o histórico. Antigos limites de Vitest e falta de banco foram resolvidos pela manutenção/CI posteriores. [Auditoria e pendências reais](superpowers/reviews/2026-10-29-roadmap-auditoria.md). Próxima recomendação: E1.2, comparação de canais e descontos. Documentação pós-publicação mantida localmente, sem segunda PR, novo incremento de versão ou publicação; originais preservados em backup/stash.

### 29/10/2026 — E1.2 com abordagem aprovada e desenho em revisão

Usuário aprovou comparar canais/descontos com cenários nomeados e salvos, reaproveitando as memórias existentes. Desenho em `superpowers/specs/2026-10-29-e1-2-canais-descontos-design.md`: bases explícitas de preço, cobertura versus meta, histórico imutável e aplicação humana. Detalhes ainda propostos, sem aprovação do documento completo ou implementação. E1.3 de identificação/recuperação de cenários foi incorporada ao recorte aprovado; importação e projeção mensal continuam separadas. Preparação em worktree isolada sobre main 6e901a7, versão 1.12.0 preservada; registro da worktree no aplicativo pendente. Sem PR/push/merge/publicação, migração ou alteração operacional. Originais locais de acompanhamento/auditoria preservados.

### 29/10/2026 — desenho E1.2 aprovado e plano preparado

Usuário aprovou o desenho completo após revisão independente sem lacunas materiais. Plano em `superpowers/plans/2026-10-29-e1-2-canais-descontos.md`, seis tarefas com banco exclusivo proposto em localhost:55437/b2t_e12_test, autorrevisado e aguardando confirmação do plano/método. Recomendada execução direta neste chat com revisão independente final. Somente documentação, versão 1.12.0 preservada; sem código, instalação de dependências, testes funcionais, migrações ou ações remotas/operacionais.


### 29/10/2026 — E1.2 implementada em isolamento

Desenho/plano aprovados e execução direta na branch `codex/e1-2-canais-descontos`. Base reconciliada com main `c3b3dae` (1.13.0), versão preparada 1.14.0. Comparação de canais/descontos, cobertura versus meta e biblioteca nomeada imutável, com reutilização após revisão atual e sem aplicar descontos duas vezes. Migração/reaplicação preservaram sete projeções sintéticas; oito testes E12 passaram, bem como tipos/lint/build e suítes E3–E6. Revisão independente teve dois P2 reproduzidos e corrigidos com regressões. Apresentação estática desktop/375 px conferida; prévia autenticada bloqueada pela revisão automática. Suíte padrão completa aprovada: 1.023 testes em 304 arquivos. [Relatório e limites](superpowers/reviews/2026-10-29-e1-2-canais-descontos.md). Sem PR/push/merge/publicação, migração operacional ou atualização de contêineres existentes; E1 ampla continua parcial, com importação e projeção mensal separadas.

### 29/10/2026 — PR E1.2 autorizada

Usuário autorizou enviar a branch e abrir a PR. Main remota reconferida em c3b3dae (1.13.0); entrega mantém 1.14.0, sem novo incremento. Validações anteriores completas preservadas no relatório; manifestos/rodapés/histórico reconferidos na preparação. Merge, publicação e migração operacional permanecem sem autorização.

### 29/10/2026 — PR E1.2 criada

[PR #34](https://github.com/bsgirardi/appb2t/pull/34) aberta para revisão, versão 1.14.0 sobre main 1.13.0, branch `codex/e1-2-canais-descontos`. Rechecagem da preparação: manifestos sincronizados e três testes de versão/rodapés/Atualizações aprovados. Validação completa anterior no relatório; CI da PR pendente. Sem merge, publicação ou migração operacional.

### 30/10/2026 — reconciliação da PR #34 para merge autorizado

Usuário autorizou verificar e integrar as PRs pendentes. A única aberta é #34. Main avançou para ae006a2 (1.13.1, PR #33); conflitos limitados aos manifestos/histórico foram resolvidos preservando integralmente 1.13.1 e mantendo E1.2 em 1.14.0, sem novo incremento. Regressão focada: 25 testes em seis arquivos aprovados; 29 cenários de atualização Docker simulados em Linux aprovados. CI da PR será reexecutado sobre a base reconciliada antes da integração. Sem publicação ou migração operacional.

### 30/10/2026 — E2.2 iniciada: fontes e desenho

Main remota conferida em ce38daa, versão 1.14.0, com E1.2 integrada pela PR #34. Continuação pela E2.2 conforme encaminhamento; E2.3/rankings e E2.4/recorrência permanecem separados. Lidos os documentos locais de acompanhamento e auditoria antes do isolamento, sem sobrescrever alterações da pasta operacional.

[Proposta E2.2](superpowers/specs/2026-10-30-e2-2-desvios-produtivos-design.md): abrir componentes da memória congelada versus componentes realizados atribuídos, explicar provisão de falhas sem inventar custo causal, perdas já incluídas e parcela não reconciliada. Desenho para aprovação; plano e implementação ainda não iniciados. Worktree própria, branch codex/e2-2-desvios-produtivos, a partir da main vigente.

Validação desta fase: inspeção estática das fontes, comparação dos módulos relevantes com a main e revisão documental. Sem teste funcional/build, PR/push/merge, publicação, migração ou alteração de contêiner. Versão preservada em 1.14.0; versão efetivamente publicada não reconferida nesta fase. Próximo passo: aprovação do desenho e plano executável. E2 permanece parcial.

### 30/10/2026 — desenho E2.2 aprovado e plano preparado

Usuário aprovou o desenho E2.2. Plano executável em docs/superpowers/plans/2026-10-30-e2-2-desvios-produtivos.md preparado e autorrevisado: componentes congelados opcionais, projeção pura, interface por linha, integração/histórico em banco E22 exclusivo e verificação final. Banco previsto localhost:55438/b2t_e22_test, variável E22_TEST_DATABASE_URL e setup com guarda própria; ainda não provisionado.

Método recomendado: execução direta neste chat com revisão independente final, aguardando revisão do plano e confirmação do método. Somente documentação nesta fase; sem código de produto, dependências instaladas, testes funcionais/build, banco, PR/push/merge ou publicação. Versão 1.14.0 preservada; E2.3/E2.4 continuam separados. A pasta operacional permanece intacta.

### 04/11/2026 — E2.2 implementada e validada em isolamento

Desenho/plano aprovados e execução direta na branch codex/e2-2-desvios-produtivos, base main ce38daa/1.14.0. Detalhamento por material, trabalho, energia, manutenção, extras/complementos e provisão prevista para falhas; fontes e cobertura explícitas, perdas já incluídas e parcela não reconciliada sem atribuição causal inventada. Motores, rateios, memória/documentos e apurações históricas preservados; leitura ampliada pode exigir nova conferência humana pelo fingerprint atual.

Validação final: 752 unitários Windows; 1.056 testes padrão Linux/Node 22 com banco sintético exclusivo; 14 integrações E22 em Windows e Linux; tipos, lint, build e revisão independente sem achados. Prévia sintética desktop/375 px e teclado conferidos, sem overflow da página. Tentativas Linux anteriores e ajustes exclusivos de ambiente registrados no relatório; nenhuma regra de produto flexibilizada. Recursos descartáveis e prévia removidos após validação, serviços existentes preservados.

[Relatório e limites](superpowers/reviews/2026-11-04-e2-2-desvios-produtivos.md). Versão mantida em 1.14.0; sem PR/push/merge, publicação ou migração operacional. Integração/publicação requerem autorização específica; futura PR exige SemVer/notas únicos sobre main vigente. E2 ampla continua parcial: E2.3/rankings e E2.4/recorrência permanecem separados; homologação humana pendente.
