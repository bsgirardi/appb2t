# E3.1 — Calendário visual e simulação da fila

Data: 27/10/2026, America/Sao_Paulo.
Estado: recorte e desenho aprovados pelo usuário em 27/10/2026 (“Aprovado”). Plano elaborado em `../plans/2026-10-27-e3-fila-visual.md`, aguardando revisão; implementação não iniciada.

## Intenção e base conferida

Permitir à equipe enxergar ocupação por impressora e avaliar consequências de uma troca de ordem antes de confirmá-la. Aproveitar U5, sem recriar lotes, calendários, reservas, apontamentos ou agendador.

Main local e remota conferidas em `d74ee7515898ef3ad892543fa61d02994c262799`, versão 1.5.1. E1.1 consta entregue na PR #19 em rascunho e E2.1 na PR #21 em rascunho, ambas propondo 1.6.0; não estão em main e não significam conclusão de E1/E2. Fontes: acompanhamento original, código de main e referência remota; não houve consulta operacional ou nova validação das PRs.

`scheduler.ts` já projeta 90 dias com equipe única, calendários e exceções, preparação, impressão contínua, espera e retirada. `queue.tsx` aplica subir/descer e ordem por prazo diretamente. `reorderQueue` exige a fila futura completa, usa revisão global, idempotência e auditoria. Filtros não podem restringir o universo do cálculo. Bloqueios vêm de `batch-read.ts`; marcos e conciliação já existem no detalhe.

## Abordagens

1. **Recomendada: calendário e prévia sobre U5.** Reutiliza previsão e comando existentes; acrescenta comparação antes/depois e confirmação. Menor risco e nenhuma dependência de novos contratos econômicos.
2. Calendário somente de leitura. Mais simples, mas deixa a mudança imediata da fila sem análise de impacto; insuficiente para o primeiro incremento proposto.
3. Agenda nova com otimizador e promessa comercial. Duplica regras e exige contratos de pós-produção ainda ausentes; não recomendada.

A abordagem 1 foi aprovada pelo usuário em 27/10/2026, após apresentação desta proposta.

## Experiência proposta

- Na tela existente de planejamento, alternar lista/calendário. Semana inicial com navegação dentro do horizonte de 90 dias; eixo comum de tempo e uma faixa por impressora, com datas em America/Sao_Paulo.
- Identificar preparação, impressão, espera pela equipe e retirada por texto e legenda, além de cor. Lote abre o detalhe existente. Em telas pequenas, rolagem local e lista equivalente acessível por teclado.
- Sem calendário, duração ou término confiável, exibir lote em seção sem previsão e explicar a causa; nunca posicionar uma data inventada. Filtro muda só a exibição.
- Subir/descer e ordenar por prazo passam a montar um cenário temporário. Mostrar antes/depois, retirada prevista, prazo produtivo e risco de atraso de cada lote afetado, inclusive de outras máquinas pela disputa da equipe. Cancelar descarta tudo sem comando de escrita.
- Resumo lista OPs e linhas afetadas, lotes mistos e quantidades, distinguindo prazo ausente, previsão indisponível e ausência de alteração. O DTO atual identifica OP/linha; não chamar OP de venda nem supor que possui vínculo comercial.
- Exibir referência temporal e revisão. Aplicar exige confirmação explícita após a prévia; não prometer reserva de capacidade. Se revisão mudar ou houver falha, exigir atualização e nova prévia. Como o relógio também altera previsão, recalcular a prévia com referência atual antes da confirmação final; definir no plano um limite de validade explícito e cobrir avanço temporal em testes.
- Aviso permanente: retirada prevista encerra a ocupação modelada; acabamento, inspeção, embalagem e transporte ainda não estão cobertos. Previsão não é garantia de entrega.

## Contratos e integridade

Proposta: extrair construção de `PlanningInput` reutilizável no servidor e função pura de cenário com permutação validada dos PENDING/SCHEDULED de uma máquina. Preservar ativos e todos os dados de material, duração, confirmações e composição; executar o mesmo `forecast` para toda a instalação e o mesmo instante nas duas alternativas. Comparação inclui qualquer intervalo ou motivo alterado, não apenas mudança no indicador de atraso.

Prévia autenticada somente de leitura, sem reservas, consumo ou auditoria de comando fictício. Aplicação continua pelo comando de reordenação, com revisão, permutação completa, autorização e idempotência existentes. Revisão não cobre passagem de tempo: a prévia deve permanecer identificada como estimativa, e a aplicação não afirma igualdade futura de horários. O plano deve verificar quais alterações de estoque/produção invalidam revisão de planejamento antes de confiar nela; se houver lacuna, revalidar dados atuais no servidor na confirmação, sem ampliar silenciosamente este recorte.

Não alterar motor nem corrigir comportamentos do scheduler sem defeito reproduzido e escopo explícito. Nenhuma migração prevista. Antes de código Next/React, ler guias locais da versão instalada e skills aplicáveis. Implementação futura em worktree exclusiva a partir da main atual, sem copiar `.env` ou compartilhar banco de testes de outras etapas.

## Dependências concretas e próximos incrementos

- E3.1 usa contratos atuais; não depende de merge E1/E2. Bloqueios detalhados com atalhos ficam para E3.2; E3.1 preserva causas e acesso ao detalhe.
- Transferência: `saveBatch` exige `plannedPrinterId` da linha igual à máquina do lote. Não basta arrastar entre faixas. Exige desenho da mudança U3, revisão de todos os lotes da linha, material, tecnologia, perfil, encaixe e nova duração confirmada.
- Contribuição/hora: E1.1 calcula cenários de precificação, sem contrato aprovado de contribuição para lote misto real. Exige definir fonte, cobertura, rateio e tempo usado; jamais reordenar automaticamente por esse indicador ou sobrepor compromissos.
- Operação: marcos preparar/iniciar/interromper/retirar e vínculos de apontamento já existem. Simplificar a apresentação depois de conferir conciliação; retirada física não equivale a peças boas ou custo realizado.
- Reimpressão: verificar saldo conciliado e vínculo explícito à falha/tentativa original, evitando duplicar demanda, perdas e custos. E2.1 explica desvios agregados e não entrega esse vínculo.
- Comercial: há vínculo opcional OP→venda no modelo, ausente do DTO de lote. Exige projeção por venda/linha com cobertura de toda demanda (inclusive sem lote), pós-produção e transporte com premissas explícitas; retirada de um lote não determina entrega de um pedido. Não fornecer data final quando etapas essenciais estiverem desconhecidas.

Esses itens continuam pendentes em E3, sem refazer módulos nem reabrir a ordem E1–E6.

## Critérios verificáveis de E3.1

1. Calendário reproduz intervalos do forecast existente, inclusive atravessando meia-noite/exceções; espera não libera máquina. Dado indisponível gera explicação, sem data fictícia.
2. Simular não muda entradas, posições persistidas, revisão, material ou eventos; cancelar não envia escrita.
3. Cenário inclui fila completa e máquinas ocultas por filtros. Fixture com duas máquinas demonstra impacto cruzado da equipe e lista todas as OPs/linhas afetadas.
4. Rejeitar IDs duplicados, omitidos, desconhecidos, de outra máquina ou ativos. Ativos preservam marcos reais e posição de execução.
5. Comparar datas e motivos antes/depois: novo atraso, atraso resolvido, prazo ausente, indisponibilidade e término não confirmado. Não tratar `late=false` sem retirada como cumprimento de prazo.
6. Aplicar uma vez usa confirmação explícita, revisão e chave idempotente. Concorrência ou avanço temporal relevante invalida prévia; erro preserva explicação e pede nova simulação.
7. Calendário/lista operáveis por teclado, rótulos independentes de cor e prévia desktop/375 px sem rolagem horizontal da página.
8. Testes focados de domínio/UI e integração de concorrência quando houver banco exclusivo descartável; tipagem, lint e build. Relatar separadamente o limite conhecido da suíte Vitest, sem atribuir resultados de E1/E2 a E3.

## Estado de entrega

Desenho aprovado e plano preparado; nenhum teste funcional executado. Sem código, PR, push, merge, publicação, migração, banco ou contêiner alterado. Não há incremento de versão nesta entrega documental local. Futura PR exige versão e notas conforme AGENTS.md, reconciliadas com main e PRs concorrentes. Próxima ação: revisar plano e escolher método de execução em isolamento.
