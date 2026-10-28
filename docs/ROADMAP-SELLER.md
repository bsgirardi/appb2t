# B2T — evolução de preço, produção e vendas

Atualizado em: 28/10/2026.

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
| E1 | Calculadora e decisões de preço | Em implementação | E1.1 entregue na PR #19 (1.7.0); detalhar E1.2 de canais e descontos |
| E2 | Rentabilidade e explicação de desvios | Em implementação | E2.1 entregue na PR #21 (1.8.0); próximos componentes e rankings pendentes |
| E3 | Fila visual e previsão para o comercial | Em implementação | E3.1 entregue na PR #22 (1.9.0), com banco exclusivo validado; demais incrementos pendentes |
| E4 | Funil de negociações e próximos contatos | Em implementação | E4.1 entregue na PR #23 (1.10.0), com migração e concorrência validadas; demais incrementos pendentes |
| E5 | Pontos de venda e consignação | Pendente | Começar após E4 |
| E6 | Conteúdo de anúncios e integrações externas | Pendente | Começar após E5 |

Situações permitidas: Pendente, Em detalhamento, Em implementação, Em validação, Implementada ou Concluída. Registrar impedimentos e dependências em texto, sem marcar uma etapa como concluída apenas porque o código foi escrito.

## E1 — Calculadora e decisões de preço

### Propostas

- [x] Contribuição estimada por hora de impressora, com premissas explícitas (E1.1; validação focada, sem merge/publicação).
- [ ] Comparação simultânea entre canais com taxas configuradas, sem presumir tarifas atuais de marketplaces.
- [ ] Simulação de descontos e efeito na margem.
- [ ] Distinguir preço para cobrir os custos modelados de preço para alcançar a meta comercial.
- [x] Ampliar comparação de lotes: custo/preço por peça, contribuição total, tempo e material (E1.1; validação focada, sem merge/publicação).
- [ ] Salvar, identificar e comparar simulações, reaproveitando as memórias já existentes.
- [ ] Avaliar importação de G-code/3MF: formatos suportados, dados disponíveis, limites e conferência humana antes de aplicar.
- [ ] Avaliar projeção mensal limitada por capacidade livre e demanda informada, distinguindo-a de previsão de vendas.

### Critérios propostos de conclusão

Comparar um mesmo produto por quantidade, canal e desconto com memória reproduzível; preservar o motor legado, as estimativas históricas e a decisão comercial do operador. Importação e projeção mensal podem virar incrementos próprios, desde que a decisão e as pendências sejam registradas explicitamente.

## E2 — Rentabilidade e explicação de desvios

- [ ] Comparar margem orçada, efeito da negociação e margem realizada.
- [ ] Explicar diferenças por material, falhas, trabalho, desconto, frete e taxas, conforme as fontes disponíveis.
- [ ] Ranking por produto, cliente e canal, com período e população definidos.
- [ ] Manter custos incompletos/provisórios distintos dos resultados completos.
- [ ] Sugerir revisão da ficha quando houver desvios recorrentes, sem alterar parâmetros automaticamente.

Critério proposto: demonstrar de onde vem cada desvio, reconciliar valores com as fontes e não contar perdas ou despesas duas vezes. Caixa, contribuição e resultado após depreciação permanecem indicadores distintos.

## E3 — Fila visual e previsão de entrega

- [x] Calendário visual por impressora sobre o planejamento existente (E3.1 local; validação focada, sem integração/publicação).
- [x] Simular reordenação e mostrar impacto nos prazos antes de aplicar (E3.1 local; confirmação, concorrência de banco ainda sem validação).
- [ ] Explicar prioridades e bloqueios com ações para resolvê-los.
- [ ] Avaliar transferência de lote para máquina compatível.
- [ ] Apresentar contribuição por hora como apoio, preservando compromissos e prazos assumidos.
- [ ] Simplificar a execução pelo operador: preparar, iniciar, apontar falha, retirar e concluir.
- [ ] Avaliar reimpressão vinculada à falha original e seus custos.
- [ ] Disponibilizar previsão ao comercial antes da promessa ao cliente, considerando também etapas posteriores à impressão.

Critério proposto: uma alteração de programação deve indicar pedidos afetados e respeitar calendários, material, compatibilidade e confirmação de capacidade. Previsão não equivale a garantia de entrega.

## E4 — Negociações

- [x] Oportunidade com etapas contato, levantamento, proposta, negociação, ganho e perdido (E4.1; validação PostgreSQL exclusiva, sem merge/publicação).
- [x] Responsável, próximo contato e pendências (E4.1; validação focada e PostgreSQL exclusiva, sem merge/publicação).
- [x] Histórico de interações e motivos de perda (E4.1; sem merge/publicação).
- [ ] Vínculo com os orçamentos e suas versões.
- [ ] Margem durante a negociação, incluindo desconto, frete e comissão quando aplicáveis.
- [ ] Consulta ao prazo produtivo.
- [ ] Alertas internos de propostas sem retorno ou próximas do vencimento.
- [x] Fechamento usando a conversão atual, sem duplicar vendas ou recebíveis (E4.1; concorrência real e rollback validados em banco exclusivo, sem merge/publicação).

Critério proposto: acompanhar uma oportunidade até a venda ou perda, com histórico e próxima ação claros. Mensagens externas e automações de envio exigem escopo próprio.

## E5 — Pontos de venda e consignação

Prioridade proposta: lojas parceiras e consignação. Atendimento de balcão/feira é uma experiência distinta e precisa ter sua inclusão confirmada no desenho da etapa.

- [ ] Cadastro de parceiros, responsáveis e condições comerciais.
- [ ] Estoque por local e remessas com confirmação de recebimento.
- [ ] Registro de vendas, devoluções e perdas.
- [ ] Comissões, acertos periódicos e valores a receber.
- [ ] Alertas de reposição e resultado por parceiro/produto.
- [ ] Rastreabilidade com estoque e financeiro existentes.
- [ ] Decidir o escopo do balcão/feira: busca rápida, carrinho, desconto, pagamento, estoque e comprovante.

Critério proposto: rastrear remessa → saldo no parceiro → venda/devolução/perda → comissão → acerto. Remessa em consignação não deve gerar venda ou receita antecipadamente.

## E6 — Conteúdo de anúncios e integrações

- [ ] Gerar títulos e descrições a partir dos dados confirmados da ficha do produto.
- [ ] Adaptar conteúdo por canal e permitir revisão.
- [ ] Organizar fotos e informações para exportação.
- [ ] Biblioteca de anúncios e rascunhos.
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
