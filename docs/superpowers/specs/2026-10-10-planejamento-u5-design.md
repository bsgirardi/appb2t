# U5 — Fila de produção e capacidade das máquinas

Data: 10/10/2026, America/Sao_Paulo.

Estado: especificação escrita aprovada pelo usuário em 10/10/2026 (“Aprovado”), após apresentação do documento registrado em 4c85427. Próxima etapa autorizada: elaborar e apresentar o plano de implementação. Não há autorização de implementação ou publicação U5.

## 1. Objetivo e limites

A B2T deve conseguir decidir o que imprimir em cada máquina, reunir peças compatíveis de pedidos distintos, conhecer a ocupação prevista e identificar ordens com risco de atraso. A equipe mantém controle da sequência. Sucesso é uma previsão explicável pelos lotes, durações, disponibilidade das máquinas e atendimento sequencial de uma pessoa.

Este primeiro recorte do U5 inclui fila, lotes, disponibilidade, sugestões e alertas. Atendimento comercial, próxima ação comercial e captura de solicitações do catálogo ficam para entrega posterior. Também ficam fora: integração com impressoras/fatiadores, leitura de arquivos, encaixe automático na mesa, multicolor, otimização matemática global e agenda de várias pessoas. Não se altera preço, documento comercial, cobrança ou lógica econômica U4.

## 2. Base verificada

Levantamento estático no checkout principal, HEAD 02b8b6d, inicialmente limpo. Não houve execução de testes, consulta ao banco ou inspeção visual nesta etapa.

- `ProductionOrder` já contém responsável e prazo opcional; `ProductionLine` contém máquina planejada e meta de peças. Ordens podem atender venda ou estoque.
- `src/server/production/orders.ts` valida máquina ativa/tecnologia e registra alterações de planejamento com versão e histórico.
- `src/server/production/queries.ts` lista ordens por número decrescente, com filtros de prazo, responsável, origem e estado. Isso não é uma sequência de execução por máquina.
- `ProductionEvent` registra tempo e quantidades efetivos por linha; não contém intervalos de ocupação de máquina. Minutos apontados não demonstram início/fim no relógio.
- `Printer.hoursPerDay` e `daysPerMonth` são premissas de custo, não calendário operacional. Serão preservados.
- U1 oferece tempo fixo e por unidade e materiais em snapshots. Não há prova de compatibilidade de cor/perfil/encaixe apenas nesses dados. U2/U3 já controlam reservas e consumo.

U4 está publicado. A inspeção visual completa U4 em 390/1440px e teclado permanece pendente em `../2026-10-10-u4-publicacao.md`. O bloqueio do comando local de demonstração não está resolvido; esta entrega não repetirá tentativas para contorná-lo.

## 3. Decisões confirmadas

1. Disponibilidade individual por máquina.
2. Impressão pode continuar sem presença da equipe quando o calendário da máquina permitir; iniciar outra depende da equipe.
3. Sugestão por prazo com ajuste manual.
4. Tempo do cálculo é referência inicial; duração do lote no fatiador deve ser confirmada antes de programar.
5. Um lote pode reunir peças de pedidos diferentes.
6. Sugestões agrupam mesmo material e mesma cor; usuário confere perfil e encaixe.
7. Material insuficiente mantém o lote pendente, sem ocupar capacidade programada.
8. Tempo padrão de retirada/preparação por máquina, ajustável por lote.
9. Uma pessoa atende uma máquina por vez.
10. Atrasos/falhas recalculam previsões preservando sequência.
11. Escopo inicial restrito a fila e capacidade.
12. Prazo orientador é o da ordem U3; lote misto usa o mais próximo. A resposta “Ok” a essa opção foi explicitamente interpretada e incorporada ao desenho aprovado.

## 4. Abordagem e componentes

Adotar planejamento assistido por lotes, ligado às linhas U3. Uma fila exclusivamente manual não atende às sugestões solicitadas; agendamento automático que reorganiza pedidos contraria a preservação da sequência escolhida.

Separar quatro responsabilidades: calendário operacional; composição e elegibilidade de lotes; cálculo determinístico das previsões; integração com demanda, material e fatos U3. O cálculo recebe dados operacionais e produz intervalos/alertas sem realizar movimentações.

Entidades lógicas novas: disponibilidade da máquina, calendário da equipe, exceções de calendário, lote, participações de linhas/quantidades, necessidades e vínculos de reserva, sequência por máquina, marcos operacionais e revisões de planejamento. Esquema físico, assinaturas e sequência de alterações serão definidos no plano. Reutilizar Printer, User, ProductionOrder, ProductionLine e razões U2/U3; não criar novos cadastros paralelos.

## 5. Lotes e sugestões

Cada lote representa uma impressão em uma máquina e contém participações de linhas U3, cada qual com quantidade inteira positiva. Só entram linhas de ordens liberadas/em execução com saldo a produzir. A soma das participações ativas e peças boas/canceladas não pode exceder a meta. Rascunhos não bloqueiam demanda; a confirmação do lote reivindica as quantidades atomicamente. Um lote pendente confirmado mantém sua composição, mas não ocupa máquina. Desmontar/cancelar libera apenas as quantidades ainda não executadas.

O lote registra máquina, material U2, cor operacional, confirmação do perfil/encaixe, duração confirmada e necessidade revisada de material. Cor é informação operacional confirmada, não novo saldo por variante nem inferência pelo nome do produto. Quando o item U2 não distingue cor, a equipe deve confirmar a quantidade disponível nessa cor; o sistema informa que essa verificação é manual. Informação ausente bloqueia sugestão automática de compatibilidade.

Sugestões usam igualdade de material/cor, tecnologia compatível e máquina planejada U3. Não realocam silenciosamente entre máquinas. Alterar máquina de linhas já alocadas exige revisão explícita dos lotes afetados; no recorte inicial uma linha mantém uma máquina planejada, podendo participar de vários lotes nela. Para paralelizar uma demanda entre máquinas, reutilizar a divisão de ordens/linhas U3.

Ordenar candidatos pelo prazo mais próximo, depois número de ordem e identificador estável. Sem prazo fica por último, identificado como tal. Oferecer grupos candidatos, sem alegar que cabem na mesa; o usuário escolhe quantidades e confirma montagem. Não atrasar automaticamente uma peça urgente para completar a mesa. Agrupamento é sugestão até aplicação explícita.

A referência U1 deve mostrar origem/versão e quantidade base; tempo fixo não é multiplicado por peça. Para lote misto, referências individuais não são tratadas como duração correta da impressão conjunta. Sem referência, mostrar “estimativa indisponível”. Programação exige minutos positivos confirmados pelo usuário a partir do fatiador. Troca de máquina/composição/perfil invalida essa confirmação e retira o lote da programação até revisão.

## 6. Material e elegibilidade

Antes de programar, confirmar necessidade de material e cobertura em reservas U2/U3. Vincular parcelas existentes sem reservá-las novamente; reservar somente a diferença mediante ação explícita usando os serviços existentes. Uma parcela não pode cobrir simultaneamente dois lotes. Para lotes mistos, manter parcelas por linha/ordem para compatibilidade com U3.

Saldo desconhecido, item não inventariado, material/cor não confirmado ou cobertura insuficiente impedem a programação. Estoque agregado suficiente não substitui verificação de cor quando ela não é rastreada no cadastro. A regra de bloqueio U5 não modifica a política U2 de consumo real negativo justificado.

Se uma reserva for liberada/reduzida, recalcular elegibilidade. Lote ainda não iniciado torna-se pendente e deixa de ocupar intervalos; conserva sua posição relativa para quando for regularizado. Isso não é reordenar os demais lotes. Lote iniciado mantém a ocupação e recebe alerta para conciliação; não apagar execução real. Revalidar material, demanda, máquina e versões no início.

Programar ou retirar da programação não consome material, não produz peças e não gera recebíveis. Cancelar lote desvincula sua cobertura sem liberar silenciosamente reservas da ordem; a resolução das reservas continua explícita em U3.

## 7. Calendários e algoritmo de previsão

ADMIN configura intervalos semanais por máquina e da equipe, exceções por data e indisponibilidades. Valores iniciais ficam não configurados; não inferir operação 24h nem usar parâmetros financeiros. Usar America/Sao_Paulo para apresentação e regras civis, persistindo instantes de execução com fuso inequívoco.

Impressão é contínua, sem pausa automática durante fechamento. Deve caber integralmente numa janela operacional contínua da máquina. Intervalos adjacentes são tratados como contínuos; uma máquina autorizada para noite pode atravessar a meia-noite. Sem janela suficiente no horizonte de 90 dias, mostrar “sem janela no horizonte”, não uma data inventada.

Para evitar contabilizar retirada duas vezes, modelar dois trechos por lote: preparação inicial e retirada final. O padrão da máquina tem os dois valores, ambos ajustáveis no lote; sua soma representa o tempo de atendimento acordado. Preparação ocorre antes da impressão; retirada após término, liberando a máquina. Cada trecho ocupa a única pessoa da equipe e a máquina, e deve caber inteiro num intervalo comum de disponibilidade. Os valores podem ser zero explicitamente; ausência de configuração não equivale a zero.

Uma máquina com impressão concluída continua ocupada até retirada. O prazo produtivo do lote é comparado com o término da retirada, não apenas com o fim da impressão. Acabamento posterior não é agendado neste recorte e deve aparecer como etapa não coberta: a previsão de impressão não equivale a previsão completa de entrega ou conclusão U3.

Preservar sequência confirmada por máquina e intervalos reais em andamento. Para disputar atendimento da pessoa, escolher a tarefa elegível com menor instante possível de início, depois menor prazo, retirada antes de preparação em empate e identificador estável como último critério. Não inserir tarefas que ultrapassem um atendimento real já iniciado. Mostrar a espera por equipe separadamente da espera por máquina.

O motor trabalha com a fila operacional completa, nunca apenas com os cartões da página visível. Calcular a partir de um instante de referência e revisão identificados. Revisão por mudança de dados e atualização da tela explicita a hora do cálculo. Sem telemetria ou tarefa em segundo plano implícita: o operador informa início, término e alterações da previsão restante. Impressão que ultrapassou o término previsto sem confirmação fica “término não confirmado”; sucessores ficam sem previsão confiável até informar tempo restante ou término. Não presumir liberação da máquina.

Ocupação deve distinguir impressão, atendimento, espera por retirada e indisponibilidade. Exibir carga prevista em horas e capacidade de calendário no período escolhido; não chamar soma de durações de utilização real. Contar intervalos uma única vez e não somar o mesmo tempo integral para cada pedido de um lote misto.

## 8. Estados, execução e integração U3/U4

Estados operacionais do lote: rascunho, pendente, programado, em preparação, imprimindo, aguardando retirada, encerrado e cancelado. Pendência tem motivos explícitos. Marcos de início/fim são confirmados por usuário, nunca pela passagem do relógio. Só existe um lote ocupante por máquina e um atendimento ativo da equipe.

Registrar atraso ou interrupção conserva fatos e sequência. Falha encerra a tentativa quando a máquina for efetivamente liberada; nova tentativa exige lote explícito para o saldo necessário. Não criar reimpressão automaticamente nem duplicar demanda. Antes de reivindicar novamente quantidades, reconciliar resultados da tentativa com apontamentos U3.

Marcos de agenda não geram automaticamente ProductionEvent, consumo, peças boas ou custos. Encerrar fisicamente o lote exige informar destinação das participações e vincular apontamentos U3 por linha, ou manter sinalização de conciliação pendente. A máquina pode ser liberada fisicamente enquanto há conciliação; as quantidades ainda não conciliadas continuam indisponíveis para novo lote para evitar duplicação.

No recorte inicial, apontamentos reais continuam explícitos por linha no U3. Não replicar a duração integral do lote em todas as linhas e não ratear custo silenciosamente. Quando o operador informar tempos por linha, apresentar a comparação da soma com o tempo efetivo do lote para revisão; tempo não distribuído permanece cobertura incompleta. Calendário é previsão, nunca evidência automática de custo real. Uma evolução para apontamento conjunto/rateio automático exige especificação própria.

Comandos U3 existentes devem respeitar participações ativas: apontamento independente, correção, mudança de máquina, redução de meta, encerramento ou cancelamento precisam reconciliar os vínculos afetados atomicamente. Preservar fatos confirmados; lotes futuros incompatíveis voltam à pendência. Correção que reabre demanda não cria lote automaticamente. Nenhuma alteração U5 substitui executor, máquina ou datas de eventos históricos.

Responsáveis continuam nas ordens U3. Lote misto mostra os responsáveis de suas ordens; autor de uma ação é auditado separadamente. O recurso único de atendimento representa capacidade da equipe, não uma atribuição automática de todas as ordens à mesma pessoa.

## 9. Interface e permissões

Área Planejamento integrada à Produção: pendências, fila por máquina, disponibilidade e detalhe de lote. Mostrar prazo, pedidos participantes, quantidades, estimativa versus tempo confirmado, material, posição, início/término previstos e motivo de espera. Sugestões têm ação de aplicar e revisão prévia. Reordenar também por botões/teclado, sem depender de arrastar.

Em celular, lista por máquina e detalhe progressivo; em desktop, comparação entre filas. Exibir estados vazios, ausência de calendário, dados incompletos, atraso e falta de material. Formulários preservam conteúdo e chave de operação em erro, e conflitos pedem recarregar/revisar sem sobrescrever alterações de terceiros.

ADMIN configura calendários e padrões, corrige marcos confirmados com motivo. ADMIN e OPERATOR consultam, compõem lotes, confirmam duração/material, programam, reordenam e registram execução operacional. Cancelamento após início segue restrições U3 sobre fatos e conciliação; operador não ganha poderes administrativos por usar U5. DTOs operacionais excluem valores de custo, inclusive replay idempotente. Nenhuma informação interna é exposta no catálogo público.

## 10. Integridade e persistência

Cada alteração valida usuário ativo, papel, versão da entidade e revisão da fila. Chave repetida com conteúdo igual não duplica lote, reserva ou marco; conteúdo divergente conflita. Auditar autor, instante, motivo quando cabível e antes/depois relevante.

Serializar alterações de agenda pelo recurso compartilhado da equipe antes de acessar os recursos produtivos existentes, mantendo uma ordem global consistente com os locks U3. Comandos U3 que afetam lotes entram na mesma coordenação antes dos locks existentes. O plano deve explicitar todos esses caminhos para evitar inversão de locks e corridas entre interfaces antigas/novas. Validações de demanda, reservas, máquina e atendimento acontecem na mesma transação da mudança.

Previsões podem ser recalculadas, mas mudanças confirmadas de sequência e marcos mantêm histórico. Aplicar sugestão exige que a revisão ainda seja atual; não aplicar uma previsão obsoleta. Migração aditiva não cria calendários, cores, tempos ou lotes fictícios para o histórico.

## 11. Critérios de aceite

- Lote com duas ordens mantém quantidades e vínculos individuais; o tempo de máquina aparece uma vez na capacidade, e nenhum evento financeiro é criado.
- Duas requisições disputando as últimas unidades ou a mesma reserva não alocam quantidade excedente, mesmo com chaves diferentes.
- Material/cor desconhecido ou insuficiente impede programação; perda de cobertura remove intervalos futuros e conserva ordem relativa.
- Alteração de composição invalida tempo confirmado; sugestão de agrupamento nunca confirma encaixe automaticamente.
- Máquina contínua e equipe 08h–18h: impressão que termina às 02h aguarda retirada a partir das 08h; próxima preparação respeita essa liberação.
- Duas máquinas terminam às 08h e cada retirada exige 10 minutos: atendimentos 08h–08h10 e 08h10–08h20, sem sobreposição e com desempate reproduzível.
- Máquina aberta apenas 08h–18h não recebe impressão contínua de 12 horas; não dividir automaticamente a impressão em dois dias.
- Manutenção, fim de semana e exceção da equipe deslocam previsões sem alterar parâmetros de custo ou sequência escolhida.
- Atraso informado desloca sucessores; fim previsto ultrapassado sem confirmação sinaliza incerteza em vez de liberar máquina.
- Falha preserva consumo/tempo U3; nova tentativa exige decisão e não duplica demanda nem remove o custo anterior.
- Apontamento/cancelamento pela interface U3 não deixa lote futuro reivindicando peças inexistentes; correção concorrente é tratada atomicamente.
- Ordem sem prazo, sem estimativa ou com etapas manuais pendentes apresenta limitações explícitas, nunca previsão completa de entrega.
- ADMIN/OPERATOR, usuário inativo, replay, conflito de versão, erro de rede e acesso público verificados.
- Fluxos de montar, programar, reordenar, iniciar, atrasar e retirar utilizáveis em 390px/1440px e teclado.

## 12. Validação e continuidade

Após aprovação deste documento, elaborar plano de implementação com tarefas, arquivos, migração, testes e método de execução para revisão. Antes de código Next.js, consultar guias instalados em `node_modules/next/dist/docs/`, conforme AGENTS.md.

Validação futura: regras de calendário e agregação com relógio controlado; integração e concorrência no banco isolado; regressões U2/U3/U4; tipos, lint, build e inspeção visual. Testes mutáveis não usam produção. Não se declara que esses testes foram executados nesta etapa documental.

Publicação U5 requer autorização própria, backup restaurado/verificado, ensaio de migração e plano de recuperação que preserve os novos fatos. Autorização U4 não se estende ao U5. O worktree antigo U4 e seus backups permanecem preservados; isolamento de implementação U5 será tratado quando essa etapa for autorizada.

Referências: `2026-10-05-plano-diretor-upgrade-b2t.md`, `2026-10-07-producao-entrega-design.md`, `../2026-10-10-u4-publicacao.md` e `../../VALIDACAO.md`.
