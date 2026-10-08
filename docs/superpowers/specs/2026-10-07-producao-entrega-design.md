# U3 — Ordens de produção, produtos acabados e entrega

Data: 07/10/2026. Estado: especificação integral aprovada pelo usuário nesta conversa (“aprovado”), após confirmação de produção para venda/estoque e produto acabado sem saldo negativo. As expressões “proposta” abaixo preservam a apresentação revisada e agora aprovada. Próxima etapa autorizada: detalhar o plano de implementação; esta aprovação não afirma implantação realizada.

## 1. Resultado e escopo

A equipe deve conseguir dividir uma demanda em ordens, registrar execução parcial, falhas, reimpressões, material e tempo, identificar peças prontas e entregá-las parcialmente. Produção para estoque deve abastecer vendas futuras. Venda, estoque e financeiro conservam suas identidades; produzir e entregar não gera cobrança nem baixa financeira.

Reutilizar Product, Printer, User, Sale/SaleItem, snapshots U1 e razão de materiais U2. Uma localização de estoque, peças inteiras e sem saldo por cor/tamanho. Não inclui planejamento automático de capacidade, kits, consignação, devolução comercial com crédito, checkout ou fiscal. U4 tratará contribuição consolidada; U3 fornece fatos e cobertura de custo, sem anunciar lucro completo.

## 2. Decisões e alternativas

**Confirmado:** ordens para venda e para estoque, permitindo atender vendas futuras com produtos acabados. Permanecem as regras U2 de material negativo justificado, identificação opcional e separação ADMIN/OPERATOR.

**Abordagem recomendada:** ordens próprias e razão de produtos acabados por origem, reutilizando a razão U2 para materiais. Separar as quantidades de material e de peça permite rastrear o custo transferido sem tratar a peça fabricada como uma nova compra. A razão de acabado integra o módulo de estoque, sem duplicar cadastros de produtos.

Alternativas: ampliar apenas SaleStatus não expressa quantidades e tentativas; usar o custo médio de material diretamente para peças mistura transformação, perdas e revisões. Um planejador de máquinas completo amplia o escopo para U5.

**Confirmado pelo usuário:** produtos acabados não terão saldo negativo. Reservar/entregar somente peças boas existentes; faltas permanecem demanda de produção. Essa política é distinta do material negativo U2, que continua permitido com justificativa.

## 3. Ordens e demanda

Uma ordem tem origem VENDA ou ESTOQUE, número, prazo opcional, responsável planejado, notas e linhas. VENDA pertence a uma única venda confirmada; cada linha aponta a identidade estável de sua linha comercial. ESTOQUE exige produto cadastrado ativo por linha. Linha comercial avulsa pode ser produzida/entregue para a própria venda, mas não pode virar estoque comercializável sem vínculo explícito a um produto.

Uma venda pode ter várias ordens e ser atendida por produção própria, peças de estoque ou ambas. Quantidade entregue + peças boas comprometidas ainda não entregues + metas de produção ainda não atendidas não pode exceder a quantidade vendida. A meta de uma ordem representa peças boas, não tentativas. Falhas não reduzem a meta e uma reimpressão não cria demanda comercial adicional.

Estados da ordem: RASCUNHO, LIBERADA, EM_EXECUCAO, CONCLUIDA, CANCELADA. Rascunho não reserva nem movimenta. Liberar valida demanda e registra os compromissos. Primeiro apontamento inicia execução. Concluir exige metas atendidas e reservas de material resolvidas. Encerrar saldo não produzido é cancelamento parcial motivado, preservando a execução anterior e liberando demanda para outra ordem. Cancelamento total não apaga fatos.

Responsável e máquina planejados podem ser alterados com histórico. Apontamento conserva executor/máquina efetivos mesmo se os cadastros forem inativados depois. Antes de iniciar nova execução, usuário e máquina devem estar ativos e a tecnologia deve ser compatível. Etapas manuais podem dispensar máquina com indicação explícita.

## 4. Apontamentos e material

Cada apontamento pertence a uma linha de ordem: data efetiva, autor, executor, máquina quando aplicável, unidades boas/falhas, minutos de máquina/preparação/acabamento, consumo por item e identificação U2 opcional. Valores de tempo são decimais não negativos; campos não informados permanecem desconhecidos. Confirmação de completude distingue zero declarado de ausência de medição. Dados efetivos futuros são recusados; retroativos exigem motivo, seguindo São Paulo.

Uma execução pode registrar apenas consumo/tempo e completar quantidades depois, evitando obrigar baixa antecipada de peças. Registros sucessivos são incrementais, com resumo explícito do já apontado; não substituem totais anteriores. Falhas exigem motivo; nova tentativa pode referenciar a falha para rastreabilidade. Tempo/material da tentativa anterior permanecem registrados.

Ficha U1 sugere necessidades, mas requer revisão. A única baixa física é a confirmação do consumo real. Concluir ordem, fabricar peça ou entregar nunca reaplica ficha estimada. Perda de material já incluída no consumo da tentativa não gera uma segunda saída LOSS; descarte adicional só registra quantidade ainda não baixada.

Reservas de material podem pertencer à ordem para venda ou estoque. Reservas U2 antigas da venda podem ser repartidas por alocações auditáveis entre ordens, sem aumentar a reserva agregada. Consumo libera a parcela correspondente na mesma transação. Excedente exige confirmação e negativo exige motivo, inclusive para operador.

Consumo legado U2 pode ser associado por ADMIN a uma execução sem nova saída, respeitando venda/linha, item, quantidade líquida e unicidade da parcela associada. Consumo sem origem demonstrável permanece não atribuído; não inferir vínculo por descrição ou proximidade de data.

## 5. Produtos acabados

Cada registro de peças boas gera entrada por origem produtiva, independentemente de a ordem inteira estar concluída. A entrada conhece produto, quantidade, ordem/linha/apontamento e vínculo comercial quando existente. Peças boas de ordem VENDA ficam comprometidas com aquela linha; peças de ordem ESTOQUE ficam disponíveis para alocação explícita a uma venda. O mesmo produto pode ter várias origens e custos distintos.

Saldo físico = entradas líquidas menos entregas/perdas líquidas. Disponível = físico menos compromissos abertos. Reservar para venda não retira físico; entregar retira físico e libera compromisso atomicamente. Transferir compromisso não cria entrada/saída física. Proposta de seleção: origens mais antigas primeiro, mostradas para conferência; conservar alocações exatas no evento.

Controle de acabado é habilitado por ADMIN no produto. Abertura exige contagem real explícita, inclusive zero, sem inferir saldo da disponibilidade pública. Contagem inicial positiva pode registrar custo conhecido ou desconhecido; desconhecido nunca é zero. Ajustes físicos são administrativos, motivados e não geram conta a pagar. Uma origem de abertura não inventa ordem produtiva.

Não atualizar preço ou disponibilidade pública automaticamente. Opções comerciais não representam estoques separados; a equipe confere a correspondência das peças antes da alocação. Peças personalizadas vinculadas a uma venda não são liberadas para pronta-entrega silenciosamente.

## 6. Custos e cobertura para U4

Manter vínculos aos movimentos e revisões de valorização U2, preservando revisões anteriores. Guardar tempo real e premissas de máquina/tarifas usadas na liberação da ordem, incluindo versão global quando disponível. Premissas incompletas geram cobertura incompleta, sem impedir o registro físico.

Proposta de custo de origem produtiva: acumular material líquido e tempos da linha, inclusive tentativas falhas; dividir entre unidades boas líquidas dessa linha. Enquanto a linha não estiver encerrada, houver medições faltantes ou valorização U2 provisória, o custo unitário também é provisório. Linha encerrada sem nenhuma peça boa conserva custo de perda, sem divisão por zero. Linhas diferentes não compartilham custo por rateio implícito.

Novos apontamentos/reconciliações geram revisão de custo das origens e de suas alocações, inclusive peças já entregues, sem alterar evento físico, snapshot comercial, preço ou pagamento. U4 consultará uma revisão identificável, não somará valor de material com valor da peça que o incorpora. Transferência para acabado não é nova despesa financeira. ADMIN vê valores/cobertura; OPERATOR recebe somente dados operacionais.

## 7. Entregas e compatibilidade comercial

Entrega pertence a uma venda, com linhas, quantidades, origens, data, autor e observação. Somente quantidade boa comprometida pode ser entregue conforme a regra confirmada na seção 2. Entrega parcial mantém material reservado para o restante; entrega final exige resolver todas as reservas e metas abertas, sem consumo/liberação silenciosos.

Para vendas no fluxo U3, resumo comercial: CONFIRMADA sem execução nem peças atribuídas; EM_PRODUCAO enquanto houver atendimento iniciado e quantidade ainda sem peça pronta; PRONTA quando todas as peças restantes estiverem prontas; ENTREGUE quando todas forem entregues. Mostrar separadamente contadores produzido, pronto, entregue e faltante. Entrega parcial pode coexistir com EM_PRODUCAO ou PRONTA. Impedir botões antigos de avançar manualmente essas vendas para pular validações.

Novas vendas confirmadas após ativação usam U3. Vendas anteriores mantêm modo legado identificado e transições existentes até adesão explícita. ADMIN pode aderir venda não entregue/cancelada após reconciliar reservas/consumos e declarar quantidades prévias comprovadas; não inferir produção a partir de status PRONTA. Quantidades reconhecidas têm origem LEGADO, motivo e cobertura desconhecida, sem fabricar consumo histórico. Identidades lineKey ausentes são atribuídas sem alterar documentos/snapshots. Vendas entregues/canceladas permanecem leitura histórica.

Confirmar venda segue criando recebíveis apenas pelo mecanismo atual. Nenhum comando de ordem, entrada de acabado ou entrega cria parcela, recebimento, estorno ou lançamento de caixa.

## 8. Correções e cancelamentos

Eventos confirmados são imutáveis. ADMIN corrige por compensação referenciada com motivo, limites líquidos, versão e chave idempotente. Compensar uma quantidade boa exige que as peças ainda existam e não estejam entregues; resolver compromissos dependentes antes de reduzir a origem. Corrigir tempo não devolve material. Corrigir consumo só retorna material ao saldo mediante declaração de devolução física ou correção de lançamento comprovada, usando U2.

Cancelar ordem antes de apontar libera compromissos e reservas. Depois de apontar, conserva consumo/tempo/perdas e exige destinação das peças boas restantes: manter para a venda, transferir explicitamente para estoque de produto compatível ou registrar perda. Material consumido não retorna por cancelar. Estoque transferido conserva origem e custo, sem nova fabricação.

Erro de registro de entrega pode ser compensado por ADMIN, sem exceder a entrega líquida e com declaração de que o evento não ocorreu fisicamente. Retorno físico de cliente é fato distinto, preserva a entrega histórica e fica fora do fluxo de correção fictícia; devolução comercial/financeira exige escopo próprio. Não usar compensação de erro para simular devolução real.

Cancelar venda U3 exige nenhuma entrega líquida, destinação das peças/ordens e resolução de compromissos, além de recebimentos estornados conforme regra existente. A transação deve falhar por inteiro se qualquer condição impedir o cancelamento. Cancelar somente ordem jamais cancela recebíveis da venda.

## 9. Interface, permissões e transações

Área Produção com filtros por estado, prazo, responsável e origem; detalhe com metas, tentativas, material, tempo, peças prontas e histórico. Estoque ganha produtos acabados e origem das peças. Venda ganha atendimento por linha, criação/divisão de ordens, alocação de pronta-entrega e entrega parcial. Ações mostram efeitos físicos antes de confirmar e preservam rascunho/chave em erro de rede.

ADMIN e OPERATOR criam/liberam ordens, apontam, reservam peças existentes e entregam. ADMIN configura controle, inventaria, corrige e trata cancelamentos após apontamento; operador pode cancelar ordem sem apontamentos. OPERATOR não recebe custos nos DTOs nem em resposta idempotente. Catálogo público e impressão comercial não recebem dados internos.

Entidades lógicas: ordem/linhas, eventos de execução, vínculos de consumo, origens/movimentos/compromissos de acabado, entregas/linhas e comandos idempotentes. Esquema físico/assinaturas serão definidos no plano após revisão. Reservas U2 ganham suporte a ordem sem venda sem invalidar vínculos existentes; helpers compartilham a transação do comando produtivo.

Todas as mutações validam autorização no serviço, versão, integridade e capacidade sob locks. Ordem global proposta: operação → vendas ordenadas → ordens ordenadas → produtos acabados ordenados → itens de material ordenados → obrigações financeiras ordenadas. Adaptar todos os comandos que tocam esses recursos, incluindo correções U2 de consumos já vinculados; não permitir que uma rota genérica contorne as dependências produtivas.

Chave repetida/conteúdo igual retorna o mesmo resultado; conteúdo diferente conflita. Unicidade por origem e saldo sob lock protege também requisições com chaves distintas. Projeção de resposta respeita papel vigente; rollback inclui consumo, reserva, produção, entrega e resultado idempotente.

## 10. Aceite e implantação

- Venda 10, ordens 6+4: concorrência não aloca 11. Execução de 6 com 5 boas/1 falha permite entregar 3, deixa 2 prontas e 7 a entregar; reimpressão da falha não cria venda/recebível adicional.
- Estoque: fabricar 8, reservar 5 para venda e entregar 2 resulta em físico 6, comprometido 3, disponível 3. Retry não repete entrada/saída. Duas vendas disputando as últimas peças não excedem o saldo conforme a regra confirmada na seção 2.
- Ficha prevê 100g e consumo real é 120g: saída total 120g. Falha/reimpressão registra seus próprios valores reais, sem aplicar percentual estimado como nova baixa.
- Consumo/revisão U2 pendente mantém custo de acabado provisório; confirmação tardia revisa custo sem movimentar peça ou caixa. Ordem sem peças boas mantém perda; não divide por zero.
- Compensação acima da quantidade líquida, entrega sem peças e correção de origem já entregue são recusadas atomicamente. Cancelamento conserva perdas e não devolve material usado.
- Reservas U2 repartidas entre ordens mantêm total. Vínculo de consumo antigo não cria saída. Rota genérica U2 não permite desfazer material vinculado ignorando produto já entregue.
- Snapshots, preços, parcelas, pagamentos e dados legados preservados. ADMIN/OPERATOR, replay, desativação, computador/390px, erros e concorrência cobertos.
- Testes mutáveis exclusivamente em `b2t_test`/localhost:55432; tipos, lint, build, inspeção visual e revisão independente antes de preparar implantação.
- Migração aditiva ensaiada sobre backup restaurado isoladamente; comparar registros anteriores; novo backup verificável e recuperação coordenada de aplicação/banco. Não apagar volume operacional nem inserir exemplos em produção. Publicação U3 depende da etapa própria, não do término de build.

## 11. Próxima etapa

Especificação aprovada. Plano executivo: `../plans/2026-10-07-producao-entrega.md`. Revisar o plano antes da execução, preservando o método direto com revisão independente final. Implantação terá preparação e verificação próprias.
