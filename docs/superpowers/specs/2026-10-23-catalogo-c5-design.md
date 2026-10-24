# C5 — Checkout integrado do catálogo

Data: 23/10/2026. Estado: desenho aprovado explicitamente pelo usuário em 23/10/2026, incluindo as propostas de habilitação, parcela única da compra direta e acesso privado. Próxima etapa autorizada: elaborar o plano de implementação. Publicação depende de autorização posterior própria. As decisões comerciais estão em ../2026-10-23-catalogo-c5-decisoes.md.

## Objetivo e limites

Permitir compra direta de ofertas com preço definido e fechamento de orçamento revisado, com aceite explícito do total, entrega e condições. Reutilizar clientes, venda, parcelas, recebíveis, recebimentos, estoque e produção existentes. Pagamento acontece fora da aplicação e é registrado pela equipe.

Não criar gateway, transportadora, tarifas fictícias, reserva automática, conta de cliente, envio automático de mensagens ou devolução financeira automática. Não reinterpretar preço de referência como oferta firme nem aprovação de arte como aceite comercial. Não alterar documentos históricos ou importar dados na operação.

## Abordagens

1. Checkout integrado, escolhido pelo usuário: compra direta quando as condições estiverem completas; conferência quando houver pendência; aceite privado de orçamento revisado e conversão na gestão existente.
2. Conferência obrigatória de toda compra: simplifica a revisão humana, mas impede concluir automaticamente ofertas prontas. Não escolhida.

## Base observada

src/server/quotes.ts já controla rascunho, emissão, aprovação, validade civil em São Paulo e versões. src/server/sales.ts confirma venda ou converte orçamento aprovado, cria parcelas e recebíveis e protege operações por chave idempotente. O cancelamento exige tratamento produtivo, reservas e estorno prévio de recebimentos. Essas rotinas exigem ator administrativo hoje: não expor seus comandos ou DTOs diretamente ao público.

Solicitações C2 conservam seleção e origem por linha; a preparação de orçamento revisa cliente e itens. Kits C3 preservam componentes e desconto. C4 conserva arte e bloqueia produção quando exigida e ainda não aprovada. Preços públicos atuais são REFERENCE ou CONSULT; nenhum deles habilita compra direta implicitamente. O cookie de navegador C2 tem validade curta e não será a única autorização para consultar uma compra duradoura.

## Decisões comerciais aprovadas

- Compra direta e fechamento de orçamento revisado integram C5.
- Retirada, frete definido pela equipe e cálculo automático são habilitáveis por produto ou kit. Cotação automática depende de integração real futura.
- Frete pela equipe: envio inicial para conferência; confirmação da compra somente depois de receber total incluindo frete.
- Uma modalidade comum a todos os itens por pedido. Sem modalidade comum, o cliente divide explicitamente a seleção em pedidos separados.
- Compra direta revalida preço ao confirmar e exige nova confirmação quando mudar. Orçamento mantém total até a validade definida pela equipe.
- Carrinho, conferência e confirmação comercial não reservam materiais ou capacidade. Equipe usa os controles existentes e considera pagamento e arte quando exigidos.
- Cliente solicita cancelamento; equipe conclui após conferir pagamento e produção, pelos controles existentes.

## Propostas de comportamento submetidas à aprovação deste desenho

### Oferta e habilitação administrativa

Compra direta exige ativação explícita por produto ou kit e configuração publicada suficiente para resolver preço firme de todas as opções e quantidades permitidas. Ofertas existentes permanecem no fluxo de orçamento. Valores de referência continuam identificados como referência. Kit usa preço, desconto e quantidades consistentes com C3; kit não contorna restrições dos componentes. Componente indisponível ou incompatível impede compra direta.

Escolha de escopo proposta pelo autor: reutilizar preço base, faixas por quantidade e regras de kits já existentes; não criar nova matriz de acréscimos por opção ou combinação em C5. A equipe só ativa compra direta quando os valores existentes cobrem todas as configurações permitidas dessa oferta. Configuração que exige análise ou preço não resolvido encaminha à conferência; a ativação não transforma CONSULT em preço firme. A revisão administrativa deve avisar que as configurações elegíveis compartilham as regras de preço publicadas. Alterar configuração ou preço exige revalidação dessa elegibilidade.

Cadastro define modalidades permitidas e condições estruturadas para compra direta: inicialmente uma parcela integral com vencimento na data da confirmação em São Paulo, acompanhada de instruções públicas de pagamento externo mantidas pela equipe. Isso é uma proposta técnica/comercial deste desenho, ainda não uma decisão recebida. Sem configuração explícita, encaminhar à conferência em vez de inventar condições. Não oferecer parcelamento público arbitrário; orçamento revisado pode apresentar parcelas preparadas pela equipe usando o mecanismo existente. Nenhum clique registra pagamento.

### Seleção, entrega e revisão

Carrinho conserva linhas, personalizações e grupos de kit existentes. Itens sob consulta encaminham o pedido inteiro para conferência, com aviso anterior ao envio; cliente pode separar a seleção por vontade própria. Não fragmentar, enviar ou confirmar pedidos automaticamente.

Modalidades elegíveis são a interseção das permissões dos itens e componentes aplicáveis. Sem opção comum, explicar quais itens conflitam e permitir editar/remover, preservando o restante. Retirada tem frete zero explícito e local cadastrado. Entrega exige destinatário e endereço completos; registrar os dados no snapshot do pedido. Frete pela equipe permanece pendente, nunca zero implícito. Cotação automática sem provedor configurado fica indisponível, com orientação para outra modalidade permitida. Integração de cotação não faz parte da implementação C5 atual.

Revisão apresenta itens, configurações, quantidades, descontos, frete, total, modalidade, endereço/local de retirada, prazo produtivo e suas condições, instruções de pagamento e parcelas. Separar prazo produtivo de prazo de transporte; sem prazo real de transporte, informar que depende da equipe. Não prometer data de entrega. Mudança material de preço, configuração, entrega ou condições invalida a revisão exibida e exige novo aceite explícito.

### Compra direta

Cliente informa identificação e contato necessários e confirma resumo completo. Servidor verifica oferta ativa, disponibilidade comercial, configuração, quantidades, kits, preço, condições e modalidade em visão consistente. Conferência de disponibilidade não equivale a reserva ou garantia de estoque físico. Operação aceita produz um único registro de checkout e uma venda confirmada, com parcelas e recebíveis; recibo deixa explícito que pagamento está pendente de registro e produção segue os controles da equipe.

Cliente novo recebe cadastro mínimo com origem no checkout e validação dos campos. Não vincular a cliente existente somente por nome, telefone ou e-mail públicos: sem identidade autenticada, criar cadastro separado e sinalizar possível duplicidade à equipe, sem expor cadastros existentes. O tratamento de duplicidade fica na gestão; não fazer fusão automática. Identificação de cliente não habilita acesso a outros documentos.

Comandos públicos usam serviço transacional restrito, com autoria pública própria e trilha de origem; não inventar usuário administrativo. Reutilizar o núcleo de confirmação e geração financeira por extração interna, conservando permissões das rotas administrativas. Falha em qualquer parte não deixa venda, cliente ou recebível parcialmente criados.

### Conferência e orçamento revisado

Envio registra intenção e recibo, sem venda ou recebível. Reaproveitar atendimento e preparação de orçamento C2, preservando entrega solicitada e snapshot original. Equipe revisa cliente, preços, frete, prazo, condições e parcelas, emite orçamento e disponibiliza acesso privado. Mensagem/link é compartilhado manualmente pela equipe; não enviar automaticamente por WhatsApp ou e-mail.

Página privada mostra apenas a revisão comercial publicada. Equipe define parcelas estruturadas cuja soma corresponde ao total antes de disponibilizar confirmação. Aceite registra nome e concordância explícita com a revisão, aprova orçamento e converte em venda na mesma operação transacional. Não exigir aprovação prévia de arte para aceite comercial. Preservar bloqueio produtivo C4.

Orçamento vencido, reaberto, substituído ou revogado não aceita confirmação. Alterações do catálogo não reprecificam orçamento vigente emitido. Antes do aceite, equipe pode retirar a oferta comercial por ação explícita e auditada; isso não reescreve documentos. Orçamento já aprovado internamente e ainda não convertido exige conferência explícita da equipe antes de disponibilizar o fluxo público; não fabricar aceite do cliente nem gerar segunda venda. Venda já vinculada retorna somente o resultado autorizado.

### Acesso privado e recuperação

Sem consulta pública por protocolo. Para compra direta/conferência, sessão restrita emitida no envio permite recuperar o resultado no navegador. Equipe pode emitir link privado para continuidade em outro dispositivo. Para orçamento, usar link privado emitido pela equipe. Proposta técnica: segredo aleatório de 256 bits em fragmento, troca POST por cookie HttpOnly, hash persistido e validade de sete dias com revogação/renovação. Validade do acesso não estende validade comercial. Reaproveitar padrões C4, com autorização própria de checkout e escopo por pedido/revisão, sem acesso cruzado a artes, clientes ou documentos.

Exibir resultado, condições e solicitação de cancelamento sob esse acesso. Expiração exige novo link pela equipe; protocolo isolado não recupera dados. GET nunca confirma ou cancela. Respostas privadas: no-store, noindex e no-referrer, sem telemetria ou recursos externos. Aplicar validação de origem, esquemas estritos, limites e cotas nas operações públicas.

Uma tentativa conserva chave estável e hash do conteúdo. Mesma chave/conteúdo retorna o resultado original mesmo após mudança de catálogo; mesma chave com conteúdo diferente é conflito. Locks e unicidade protegem contra duas abas, concorrência entre equipe e cliente e dupla conversão. Idempotência comercial integra a transação completa, não apenas a gravação do recibo.

Em resposta perdida, mostrar confirmação incerta e permitir consultar/repetir a tentativa original. Não mostrar sucesso sem prova, limpar carrinho, trocar a chave ou confirmar novamente automaticamente. Após sucesso, limpeza explícita remove apenas linhas enviadas ainda inalteradas, preservando alterações em outra aba. Recibos retornam dados públicos mínimos, nunca DTO administrativo, custo ou notas internas.

### Cancelamento e operação

Pedido em conferência pode receber solicitação de cancelamento; equipe encerra atendimento e retira eventual oferta ainda não aceita, preservando histórico. Venda confirmada recebe solicitação auditada com motivo, sem alterar automaticamente venda, financeiro ou produção. Repetição não duplica solicitação pendente. Equipe usa cancelSale e os controles operacionais existentes; estorno contábil não significa transferência de dinheiro ao cliente. Solicitação não promete conclusão nem restituição automática. Estado e resposta da equipe ficam visíveis no acesso privado.

Não adicionar bloqueio automático por pagamento nesta etapa. Equipe continua responsável por liberação e reserva. Arte requerida mantém o bloqueio C4. Nenhum fluxo desfaz consumo ou produção física automaticamente.

## Dados, compatibilidade e decisões deixadas ao plano

Migração aditiva para habilitação comercial, modalidades, condições, checkout, revisões, endereço, sessões, decisões e solicitações de cancelamento. Vínculos exclusivos com solicitação/orçamento/venda evitam duplicação. Snapshots comerciais imutáveis e eventos preservam aceites e origem por linha/kit. Não copiar segredos para snapshots ou logs. Proposta de retenção: preservar registros comerciais e eventos, sem exclusão automática em C5.

O plano define nomes de tabelas/rotas, organização de componentes, limites de payload/cotas coerentes com C2/C4, ordem de locks e extração do núcleo transacional. Deve ler os guias locais do Next.js antes de escrever código. Não cabe ao plano inventar condições comerciais adicionais ou integrar cotação sem provedor escolhido.

Interface mantém identidade e componentes locais B2T. Oferecer revisão clara e ações distintas para enviar à conferência, confirmar compra, recuperar resultado e solicitar cancelamento. Atender 320/390/1440 px, teclado, foco, alvos de 44 px, claro/escuro e movimento reduzido. Não adicionar dependências ou redesenhar a vitrine sem necessidade.

## Critérios de aceite e validação

- Oferta legada/referência/consulta não vira compra direta sem ativação e condições completas.
- Compra direta gera exatamente uma venda, parcelas e recebíveis, sem recebimento ou reserva automática; falha transacional não deixa resíduos.
- Frete pendente registra somente conferência; cliente confirma após orçamento completo e vigente.
- Modalidades incompatíveis impedem pedido único; divisão e reenvio dependem de ação explícita.
- Preço alterado exige nova revisão; orçamento vigente mantém total; revisão vencida/substituída não aceita clique de aba antiga.
- Duas personalizações do mesmo produto e kits preservam identidades, valores, desconto, arte e configuração.
- Parcelas somam o total; não há pagamento presumido nem dados internos no retorno público.
- Resposta perdida, repetição, duas abas e corrida com equipe não duplicam operação; idempotência devolve resultado original.
- Sessão/link de outro pedido, token expirado/revogado e protocolo isolado não dão acesso; GET não muda estado.
- Cancelamento é solicitação até conclusão pela equipe; recebimentos e produção mantêm suas proteções.
- Fluxos administrativos e históricos existentes continuam válidos; conferência não exige criação prematura de cliente.
- Testes mutáveis somente em b2t_test, porta 55432, projeto appb2t-test. Nunca usar operação ou importar fixtures nela. Serializar build e suíte; parar banco de testes ordenadamente durante builds devido à memória Docker.
- Verificar tipagem, lint, testes relevantes e suíte, build e navegador com evidências, sem alegar verificações não executadas. Publicação exige autorização posterior própria.

## Próximo passo

Revisão independente do desenho concluída em 23/10/2026. A única dúvida impeditiva apontada foi a abrangência da precificação por configuração; a delimitação acima foi acrescentada como escolha explícita do autor para aprovação, reutilizando os preços existentes.

Revisar este desenho e suas propostas explícitas. Somente após aprovação elaborar o plano de implementação. Nenhum código de produto, banco, dependência ou runtime foi alterado para este desenho.
