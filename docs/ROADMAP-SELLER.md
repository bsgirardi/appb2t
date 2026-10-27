# B2T — evolução de preço, produção e vendas

Atualizado em: 27/10/2026.

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
| E1 | Calculadora e decisões de preço | Em implementação | E1.1 entregue na PR #19 em rascunho; detalhar E1.2 de canais e descontos |
| E2 | Rentabilidade e explicação de desvios | Em validação | E2.1 implementado localmente; revisar entrega e limite da suíte completa |
| E3 | Fila visual e previsão para o comercial | Pendente | Começar após E2 |
| E4 | Funil de negociações e próximos contatos | Pendente | Começar após E3 |
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

- [ ] Calendário visual por impressora sobre o planejamento existente.
- [ ] Simular reordenação e mostrar impacto nos prazos antes de aplicar.
- [ ] Explicar prioridades e bloqueios com ações para resolvê-los.
- [ ] Avaliar transferência de lote para máquina compatível.
- [ ] Apresentar contribuição por hora como apoio, preservando compromissos e prazos assumidos.
- [ ] Simplificar a execução pelo operador: preparar, iniciar, apontar falha, retirar e concluir.
- [ ] Avaliar reimpressão vinculada à falha original e seus custos.
- [ ] Disponibilizar previsão ao comercial antes da promessa ao cliente, considerando também etapas posteriores à impressão.

Critério proposto: uma alteração de programação deve indicar pedidos afetados e respeitar calendários, material, compatibilidade e confirmação de capacidade. Previsão não equivale a garantia de entrega.

## E4 — Negociações

- [ ] Oportunidade com etapas: contato, levantamento, proposta, negociação, ganho e perdido, a confirmar no desenho.
- [ ] Responsável, próximo contato e pendências.
- [ ] Histórico de interações e motivos de perda.
- [ ] Vínculo com os orçamentos e suas versões.
- [ ] Margem durante a negociação, incluindo desconto, frete e comissão quando aplicáveis.
- [ ] Consulta ao prazo produtivo.
- [ ] Alertas internos de propostas sem retorno ou próximas do vencimento.
- [ ] Fechamento usando a conversão atual, sem duplicar vendas ou recebíveis.

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
