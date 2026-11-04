# Etapa 4 — inteligência operacional

Escopo autorizado: apoiar decisões da pequena operação com rankings, metas e projeções explicáveis. Execução direta solicitada no encaminhamento; decisões de implementação abaixo são escolhas do implementador.

## Base e abordagem

Main inspecionada: 1.15.0, d1d7ac0. Etapas 1 (355e2a6), 2 (38dd157) e 3 (49e7553) permanecem em branches separadas. Não incorporar alterações dessas branches. A rentabilidade já lê fontes e revisões em transação RepeatableRead, seleciona primeira confirmação em America/Sao_Paulo, agrega produtos/canais e restringe acesso a ADMIN. Reutilizar essa consulta, autorização e motor.

Alternativas: criar módulo persistente de metas exigiria novas permissões, histórico e migração; duplicar dashboard/calculadora criaria regras concorrentes. Escolha: visão adicional dentro de Rentabilidade, com simulações transitórias, sem bibliotecas ou migrações.

## Comportamento

Rankings por produto, cliente cadastrado atual e canal efetivo da revisão. Critério: contribuição realizada absoluta decrescente; desempate nome/id. Somente grupos com todos os pedidos cobertos recebem posição. Outros permanecem visíveis como cobertura incompleta, sem posição. Cada grupo aponta à consulta filtrada ou aos pedidos fonte; nunca usar somente a página atual.

Meta transitória: faturamento (R$), contribuição realizada (R$) ou pedidos (unidades), no período selecionado. Valor positivo; realizado ausente permanece indisponível. Progresso negativo preservado em texto, barra limitada a 0–100%. A meta aceita período ainda em andamento; fim futuro e horizonte inválido bloqueiam apenas a extrapolação, sem esconder o realizado registrado.

Extrapolação: valor do histórico / dias corridos inclusivos × horizonte informado (1–366 dias). Apenas histórico datado normal, não futuro, com pedidos. Contribuição exige cobertura integral. Não inferir demanda nem capacidade: encaminhar ao planejamento existente para validar disponibilidade por impressora. Período que inclui hoje contém dia parcial, explicitamente indicado. Não extrapolar recebimentos nem lucro líquido.

## Limites

Receita segue os totais atuais dos pedidos confirmados, incluindo frete/desconto segundo motor existente. Recebimento é fato financeiro distinto. Contribuição não é lucro líquido; perdas sem pedido, despesas gerais e devoluções não registradas não são inferidas. Canceladas e pendências seguem exclusões atuais. Custos posteriores atualizam a leitura. Cenários não criam registros comerciais/financeiros/produtivos. OPERATOR conserva os acessos existentes; /atualizacoes permanece disponível para autenticados.

## Validação

Testes de ordenação, cobertura, ausência, zero, negativos, datas civis, virada de dia em São Paulo, paginação e autorização. Testes de interação e renderização, tipos/lint/build e prévia responsiva clara/escura. Notas e versão MINOR 1.16.0 relativas a main, sujeitas a conciliação com etapas paralelas antes de integração. Nenhum merge/publicação.
