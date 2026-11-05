# E3.2 — Bloqueios acionáveis e previsão por pedido na negociação

Data: 04/11/2026, America/Sao_Paulo. Estado: desenho e plano aprovados pelo usuário em 04/11/2026 ("Aprovado"), execução direta escolhida e implementação local realizada. [Entrega e limites](../reviews/2026-11-04-e3-2-previsao-comercial.md). Revisão independente do desenho sem perguntas materiais pendentes; revisão da implementação com três casos materiais corrigidos e testados. Plano em `../plans/2026-11-04-e3-2-previsao-comercial.md`. Sem integração/publicação; homologação humana pendente.

## Intenção e decisões

Dar à produção próximas ações verificáveis e ao comercial uma estimativa explicada por pedido antes de combinar entrega. O usuário escolheu incluir a simulação antes da venda. Preservar planejamento, scheduler, confirmações e comandos existentes.

Base conferida: origin/main 97974840f206f682b6036f7214c8bf8fa860afa7, versão 1.17.0. A pasta operacional está em 8399c6f/1.13.0 com documentos locais preservados. Este desenho parte de worktree isolada da main. Auditoria local de 04/11, PENDENCIAS, ROADMAP-SELLER e desenho/plano/relatório E3.1 foram consultados; antigos limites de testes não são considerados bloqueios atuais.

## Abordagens

1. Diagnóstico por venda com conexão à negociação, sem simulação pré-venda: menor escopo, mas não atende à escolha posterior do usuário.
2. **Escolhida: diagnóstico mais cenário hipotético pelo orçamento principal.** Reutiliza o motor sobre uma cópia integral da instalação; exige premissas explícitas, sem reservar capacidade.
3. Otimizador novo com promessa automática: descartado por duplicar planejamento e pressupor capacidade de etapas não modeladas.

## Primeiro incremento

### Bloqueios e prioridades

Transformar causas existentes em dados estruturados: código estável, causa, entidade afetada, próxima ação, destino e critério verificável de resolução. Preservar mensagens compatíveis para consumidores atuais; não fazer regras dependerem da comparação de textos. Deduplicar apresentação sem perder linhas afetadas.

Cobrir máquina inativa, material inativo/não inventariado, reservas insuficientes/alteradas, cor, duração, perfil/encaixe e OP/máquina incompatível; acrescentar explicação para calendário ausente, falta de janela no horizonte de 90 dias e término ativo não confirmado. Quando o motor propaga um impedimento, atribuir origem somente quando demonstrável; caso contrário explicar a dependência sem inventar lote causador. Atalhos abrem fluxos existentes e respeitam permissões. Nenhuma correção automática.

Explicar posição persistida da fila, lote ativo, prazo produtivo da OP e ordenação por prazo quando aplicável. O scheduler compartilha equipe entre máquinas: não afirmar que a posição local determina sozinha o horário. Sem ranking novo ou reordenação automática.

### Leitura por venda

Usar venda/lineKey → OP/saleLineKey → participações/lotes, junto a entregas líquidas e compromissos líquidos de estoque acabado. Reutilizar semântica e correções dos módulos de produção; não equiparar produto igual a vínculo comercial. Todas as linhas vendidas entram, inclusive sem OP, OP em rascunho, sem lote ou com lote em rascunho/cancelado.

Mostrar por linha: vendido, entregue líquido, disponível comprometido, saldo produtivo coberto por participações válidas e saldo sem cobertura. Não contar novamente peça boa já comprometida/entregue nem quantidade conciliada/liberada da participação. Peças boas sem compromisso identificável são pendência de destinação, não disponibilidade garantida ao pedido. Falhas/cancelamentos produtivos não reduzem quantidade vendida. Excesso, ausência ou ambiguidade de vínculo gera inconsistência explícita, sem truncar silenciosamente para produzir cobertura completa. Vendas LEGACY recebem diagnóstico de cobertura insuficiente; não converter modo automaticamente.

Se todas as quantidades restantes dependerem de lotes com retirada prevista confiável, mostrar o maior término necessário como **retirada produtiva estimada**, condicionado a peças boas e conciliação. Quantidade já disponível não ganha horário histórico inventado. Um lote retirado sem peças conciliadas suficientes mantém pendência. Não denominar esse resultado pedido pronto. Quando faltar cobertura essencial, manter previsões parciais por linha, mas omitir data agregada completa.

### Simulação antes da venda

Entrada pela negociação e seu orçamento principal vigente, incluindo todas as linhas. Sem principal, orientar seleção existente. Após venda vinculada, usar diagnóstico real e impedir duplicação do orçamento como demanda nova nesta simulação.

Proposta do agente: cenário temporário, descartado ao sair, sem tabela/migração/histórico de cenários neste incremento. Não cria OP, lote, reserva, venda, evento comercial ou compromisso. Nenhum dado hipotético vira confirmação operacional.

Por linha, distribuir exatamente a quantidade orçada em lotes hipotéticos. Não agrupar itens distintos automaticamente. Informar máquina ativa/tecnologia compatível, unidades, duração de impressão por lote, preparação, retirada, material/cor e disponibilidade declarada a partir de um instante. Divisões, perfil e encaixe são premissas declaradas pelo usuário. Linhas não produtivas exigem disponibilidade declarada e motivo; nenhuma exclusão implícita.

Memória V2 válida e fingerprint vigente podem sugerir máquina e tempo. Mostrar origem/quantidade de referência e caráter provisório; divisão em lotes exige revisão explícita da duração de cada lote, sem repetir silenciosamente tempo fixo por peça nem presumir paralelismo. Memória ausente/desatualizada permite preenchimento manual identificado, sem alterar custo ou margem do orçamento.

Acrescentar os lotes ao fim da fila de cada máquina escolhida, preservando a ordem existente e a ordem declarada dos hipotéticos. Calcular baseline e cenário com o mesmo instante, todas as máquinas e equipe, inclusive ocultas por filtros. Reutilizar forecast e calendários, sem modificar seu algoritmo. Para disponibilidade futura, usar uma cópia derivada com janelas da máquina limitadas pelo instante declarado, conservadoramente para a simulação inteira dessa máquina; mostrar essa restrição e possíveis impactos. Não deslocar apenas o horário exibido após o cálculo. Decisão técnica pode substituir essa adaptação por solução equivalente comprovada, sem alterar o motor ou ignorar precedência.

O estoque atual é evidência auxiliar, não reserva. Informar indisponibilidade conhecida; chegada futura só entra como hipótese declarada. Se material, duração, compatibilidade, calendário ou disponibilidade estiverem indefinidos, explicar o que falta e não gerar data completa. Não fabricar cobertura ou confirmações na resposta operacional; objetos hipotéticos são separados e identificados no adaptador puro de cenário.

Mostrar término de retirada simulado, itens sem cobertura e impacto nos lotes/pedidos existentes, inclusive outras máquinas. Sem sugestão automática de melhor máquina ou posição. Um cenário que atrase terceiros continua sendo hipótese visível, nunca autorização para alterar fila.

### Pós-produção, transporte e compromisso

Três conceitos separados: retirada produtiva estimada, entrega estimada no cenário e data combinada já registrada na venda/documento. Nenhum cálculo grava ou substitui data combinada/promessa comercial.

Proposta do agente para evitar um segundo scheduler: a equipe informa **data/hora prevista de liberação após acabamento, inspeção e embalagem**, com motivo, ou declara essas etapas dispensadas. A liberação deve ser posterior ou igual à última retirada necessária. É uma premissa externa de capacidade, sem dedução automática de setup/finishing da precificação.

Para retirada local: disponibilidade estimada ao cliente depende também do instante de atendimento informado. Para envio: informar previsão de chegada, posterior à liberação, e justificativa/fonte de transporte. Não inventar calendário de transportadora nem converter dias úteis sem calendário. Datas em America/Sao_Paulo. Premissa essencial ausente deixa entrega sem previsão, preservando a retirada produtiva parcial quando válida.

Essas premissas também podem complementar temporariamente a leitura da venda, sem persistir ou transformar leitura em compromisso. Retirada já concluída e saldo pronto são fatos separados da premissa futura de entrega. Pedido integralmente entregue mostra situação realizada, sem nova previsão.

## Consistência, acesso e experiência

Leitura autenticada ADMIN/OPERATOR, autorização no servidor com usuário ativo; nenhum indicador financeiro adicional liberado. Consultas coerentes em transação RepeatableRead, validação estrita e limites de tamanho de cenário definidos no plano. Reutilizar loadPlanningSource, forecast e funções de saldo, sem chamar consultas que gravem custos/status.

Resultado identifica instante, revisão da fila, versão/hash do orçamento ou venda, fontes e premissas. Validade proposta de 60 segundos; expiração, retorno à tela ou edição de contexto exige recalcular. Não permitir apresentar resultado anterior como atual após troca de principal/versão, edição de premissas ou resposta fora de ordem. Servidor relê fontes a cada simulação; revisão de planejamento isolada não cobre todas as alterações. Resultado continua identificado como cenário datado, sem garantia mesmo dentro da validade.

Planejamento mantém lista/calendário e detalhe existentes; negociação ganha acesso à simulação junto à decisão comercial e leitura por venda. shadcn do projeto obrigatório na futura implementação visual, temas e teclado preservados, rótulos independentes de cor, erros junto aos campos e resultado anunciado. Sem números de versão duplicados.

## Fora deste incremento

Transferência de lotes reais, reimpressão causal, novo otimizador, contribuição/hora de lotes reais, comissão, alertas, margem, capacidade automática de acabamento/transporte, conversão automática do cenário em produção e envio ao cliente. Não refazer E3.1 ou E4.

## Critérios de aceite e verificação

1. Cada causa existente tem próxima ação e resolução verificável; propagação e falta de janela não culpam entidade sem evidência.
2. Fixtures com múltiplas OPs/lotes, pedido misto, demanda sem OP/lote, pronta/entregue parcialmente, correções e cancelamentos demonstram cobertura integral sem dupla contagem. Retirada sem conciliação não conclui pedido.
3. Cenário cobre exatamente todas as linhas/unidades; mudanças de quantidade invalidam sugestões. Duração manual/provisória tem origem explícita; material desconhecido ou incompatibilidade impede data completa.
4. Duas máquinas demonstram disputa da equipe e impacto cruzado. Disponibilidade futura impede preparação anterior, com calendários/exceções/horizonte preservados. Sem janela não significa atraso resolvido.
5. Acabamento/embalagem e transporte ausentes deixam entrega indisponível. Premissas anteriores à retirada/liberação são rejeitadas; dispensas são explícitas. Data combinada não é alterada.
6. Baseline/cenário não modificam entradas, banco, revisão, fila, estoque, eventos ou reservas. Venda vinculada não recebe duplicação hipotética do orçamento.
7. Expiração, troca de principal/versão, edição e resposta fora de ordem não exibem resultado como vigente. ADMIN/OPERATOR e usuário inativo têm cobertura de autorização.
8. Testes de domínio/UI, integrações somente em PostgreSQL sintético descartável exclusivo, tipos/lint/build, inspeção desktop/375px/temas/teclado. Nenhuma sessão fictícia na operação.

## Próxima fase e limites de autorização

Desenho e plano aprovados, execução direta concluída localmente, com evidências e limites no relatório. Guias Next e skill shadcn lidos antes das alterações visuais; dependências instaladas pelo lock somente na worktree. Versão 1.17.0 preservada, sem PR/push/merge/publicação, migração operacional ou atualização dos contêineres existentes. Futura PR autorizada exige incremento único SemVer comparado à main, manifestos/notas/rodapés/Atualizações consistentes. Implementação e testes não significam integração, publicação ou homologação humana.
