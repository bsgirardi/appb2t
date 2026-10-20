# C2 — Solicitação integrada e atendimento

Data: 20/10/2026. Estado: desenho em conversa aprovado; especificação escrita para revisão. Base funcional: C1 integrado na main em `0b6f934`. Esta etapa não implementa nem publica C2.

## 1. Objetivo e limites

Receber no sistema a seleção configurada do visitante, confirmar seu recebimento e permitir que a equipe prepare o orçamento existente. Preservar cada personalização, quantidades, natureza do preço e contexto recebido, inclusive quando o catálogo mudar depois.

Fluxo aprovado: lista → revisão → nome e WhatsApp ou e-mail → envio sem conta → protocolo → atendimento interno → revisão de cliente e valores → orçamento em rascunho. Recebimento não confirma venda, preço final, pagamento, estoque, aprovação de arte ou início de produção.

Ficam fora: conta do visitante, acompanhamento público por protocolo, notificações automáticas, chat, anexos, aprovação de arte, montador 2D, checkout, reserva e conversão automática em venda. WhatsApp/e-mail continuam canais complementares abertos conscientemente pelo usuário; não equivalem ao recebimento no sistema.

## 2. Alternativas e decisão

1. **Solicitação própria e preparação assistida**, escolhida: recebe itens sob consulta e mantém a intenção original separada do documento comercial.
2. Criar Quote imediatamente: não escolhida, pois as regras atuais exigem preços positivos e cliente revisado para o documento completo.
3. Continuar apenas com mensagem externa: não escolhida, pois não oferece recebimento persistente ou fila interna.

A solicitação não duplica cadastro de cliente ou documento de orçamento. Guarda o contato recebido como parte da intenção e, após revisão humana, referencia os registros existentes.

## 3. Envio pelo visitante

- Manter os limites de C1: 1–20 linhas e 1–99 unidades por linha; campos e opções seguem a definição de cada produto. A lista vazia não pode ser enviada.
- Nome obrigatório de 2–120 caracteres. Escolher WhatsApp ou e-mail como canal preferido e informar seu contato válido. Um segundo contato é opcional. E-mail tem até 254 caracteres; telefone é normalizado para formato internacional, com padrão brasileiro para números nacionais de 10/11 dígitos e limite de 15 dígitos após DDI. Não pedir documento, endereço, senha ou data de nascimento.
- Mostrar, antes do botão, o que será enviado, para que a equipe usará os dados e a distinção entre referência e consulta. Nenhum consentimento de marketing é presumido.
- Revisar no servidor preços, publicação, disponibilidade, opções e respostas no envio. Não confiar nos rótulos, totais ou preços enviados pelo cliente.
- Mudança em relação à revisão confirmada retorna conflito com os itens afetados, sem gravar solicitação. O cliente corrige/reconfirma explicitamente. Produto retirado ou indisponível impede envio. Itens sob consulta válidos podem ser recebidos, com preços e subtotais nulos e soma conhecida separada, sem total fechado fictício.
- Validação das linhas e gravação do snapshot usam uma visão transacional consistente. Uma edição posterior do catálogo não modifica o snapshot aceito.
- Durante envio, desabilitar novas submissões da mesma tentativa. Erro mantém lista e contato preenchidos. Sucesso só aparece depois da confirmação persistente do servidor.

## 4. Confirmação e reenvio

Cada tentativa lógica recebe uma chave aleatória de 256 bits antes da requisição. O servidor guarda seu hash único e o hash do conteúdo normalizado; a chave bruta não entra em logs, URLs ou protocolo.

- Mesma chave e mesmo conteúdo: devolver o mesmo protocolo e instante de recebimento, mesmo que o catálogo tenha mudado desde o primeiro aceite. Não refazer a operação comercial nem criar nova solicitação.
- Mesma chave com conteúdo diferente: conflito, sem sobrescrever o que foi recebido.
- Pedidos simultâneos com a mesma chave: restrição única e transação garantem um único recebimento; a resposta perdedora recupera o resultado confirmado.
- Falha ou timeout não significam que o envio falhou. Mostrar “Ainda não foi possível confirmar o recebimento” e oferecer “Verificar recebimento”/“Tentar novamente” com a mesma chave. Não criar outra chave automaticamente.
- A consulta de resultado exige a chave secreta no corpo de POST, retorna apenas protocolo, instante e confirmação, e não expõe contato ou itens. Um resultado ainda ausente não é apresentado como prova de que a tentativa anterior nunca será concluída.
- Persistir tentativa pendente e conteúdo mínimo necessário em sessionStorage desta aba, com aviso de recuperação local. Se indisponível, manter em memória e avisar que fechar/recarregar pode impedir a recuperação. Nunca substituir conteúdo pendente silenciosamente. Após sucesso, retirar contato e payload da recuperação, conservando apenas recibo/chave nesta sessão.
- Uma nova solicitação igual com outra chave não é mesclada automaticamente: pode ser uma intenção legítima. A proteção cobre reenvio da mesma tentativa, não deduplicação universal por telefone ou nome.

Protocolo de exibição: `SOL-` seguido de sequência única com pelo menos seis dígitos. A confirmação informa “Solicitação recebida”, protocolo, data/hora e próximo passo do atendimento, sem prometer prazo não cadastrado. Protocolo sozinho não autoriza consulta pública de dados.

A seleção não é apagada automaticamente. Após confirmar, oferecer limpar apenas as linhas enviadas que ainda tenham o mesmo conteúdo; novas linhas e alterações feitas em outra aba devem ser preservadas. Não reenviar o mesmo conteúdo por um segundo botão sem intenção explícita.

## 5. Atendimento interno

Adicionar **Solicitações** à área administrativa. ADMIN e OPERATOR ativos podem listar, consultar e atender; visitantes e sessões inválidas não podem acessar qualquer contato ou detalhe.

Listagem paginada de 20 registros, ordenada do mais recente, com filtro de estado e busca por protocolo/nome. Exibir protocolo, recebimento, nome, canal preferido, número de linhas, indicação de consulta e responsável. Evitar contato completo em listagem quando não necessário.

Detalhe apresenta o snapshot recebido e, separadamente, situação atual do catálogo. Mudanças posteriores não reescrevem o recebido. Mostrar nomes, códigos, cor/tamanho, perguntas e respostas, quantidade, referência unitária/subtotal conhecidos e condições comerciais recebidas. Não incluir custos, margens ou dados de outros clientes em superfícies públicas.

Estados:

| Estado | Entrada e saída |
|---|---|
| RECEBIDA | Estado inicial; pode iniciar atendimento ou encerrar com motivo. |
| EM_ATENDIMENTO | Exige responsável ativo; pode trocar responsável, preparar orçamento ou encerrar com motivo. |
| ORCAMENTO_PREPARADO | Possui vínculo único com Quote em rascunho; oferece abrir esse orçamento. Não acompanha automaticamente os estados posteriores do orçamento. |
| ENCERRADA | Exige motivo; pode reabrir em atendimento, preservando histórico e responsável ativo. |

Preparadas não podem ser reabertas para gerar outro orçamento em C2. Descartar ou reabrir o orçamento segue as regras existentes do próprio documento. Não há exclusão física de solicitação na interface de C2.

Notas internas de até 2.000 caracteres por evento, separadas do texto do visitante. Registrar autor, data, ação, motivo, troca de responsável e vínculo criado. Alterações exigem versão esperada; concorrência devolve conflito e pede recarga, sem sobrescrever o trabalho de outra pessoa.

## 6. Cliente e preparação do orçamento

Receber uma solicitação não cria nem altera Customer. A equipe pode buscar clientes existentes por contato normalizado e nome; possíveis correspondências são sugestões internas. Não vincular automaticamente por coincidência de telefone/e-mail, não sobrescrever cadastro existente e não revelar correspondências ao visitante.

Antes de preparar:

1. Escolher cliente ativo existente ou criar conscientemente pelo cadastro existente, revisando nome, tipo e contato. Os campos obrigatórios continuam obedecendo ao cadastro atual; não inventar documento ou endereço.
2. Revisar cada linha recebida. Manter Ana e Bia em linhas distintas com identificadores estáveis. Transferir opções e respostas para descrição comercial legível e para metadados estruturados versionados vinculados à linha do orçamento.
3. Confirmar preços de referência e informar preço positivo para cada linha sob consulta. Quantidade e preço final podem ser negociados pela equipe, com registro do que foi preparado; o snapshot recebido permanece imutável.
4. Informar condições e campos necessários ao orçamento pelo fluxo existente. Estimativas de custos não são inventadas ou vinculadas automaticamente à configuração; a revisão de custos existente continua disponível.

Preparar cria exatamente um Quote em RASCUNHO e o vínculo com a solicitação na mesma transação, registrando o evento e o novo estado. Repetição, clique duplo ou concorrência devem retornar o orçamento já vinculado; não criar dois. Refatorar somente o necessário do serviço de gravação para reutilizar suas regras dentro da transação, sem gravar Quote separadamente e tentar vinculá-lo depois.

Não truncar personalizações silenciosamente ao atingir o limite atual de descrição de 1.000 caracteres. A prévia deve indicar os excessos e exigir que a equipe ajuste a descrição comercial; os metadados completos permanecem acessíveis no orçamento e o snapshot original na solicitação. A emissão deve preservar esses metadados no snapshot do documento; a impressão exibe a descrição comercial revisada. Extensão de arte/produção e novos anexos ficam em C4.

Produto posteriormente inativo não pode ser enviado como productId ativo apenas para contornar a validação existente. A equipe pode preparar a linha como item avulso, com confirmação explícita, mantendo a origem na solicitação e a descrição revisada.

## 7. Persistência e contratos

Prever entidades de solicitação, linhas/snapshot versionado, eventos e limite de submissão. Solicitação contém identificador interno, sequência pública, estado, versão, contato recebido, instante, responsável opcional, vínculo único com orçamento, hash de tentativa e hash do conteúdo. Valores monetários usam decimal; consulta é ausência de preço, não zero.

Linhas guardam identificador estável, produto de origem quando disponível, revisão comercial recebida, conteúdo normalizado e rótulos resolvidos no servidor, quantidades, preços conhecidos e condições relevantes. Não copiar dados de cálculo interno. O vínculo com o produto não pode apagar o snapshot quando o cadastro mudar.

Contrato público de submissão recebe apenas contato, chave e seleção de C1. Payload máximo de 256 KiB, conferido em streaming, esquema estrito e mesma validação de origem/JSON existente. Retornar apenas recibo público. Rotas internas usam sessão, permissões e versão esperada. Todos esses retornos têm no-store; formulários, recibo e área interna são noindex e ficam fora do sitemap.

Adicionar limitação persistente no banco, compartilhada entre processos: até 10 novas tentativas por identificador aleatório de navegador em 15 minutos e até 300 por hora na instalação. O identificador é fornecido pelo servidor em cookie HttpOnly, SameSite=Lax e Secure quando HTTPS. Trocar cookie não contorna o limite global; isso não é tratado como proteção completa contra ataque distribuído. Retorno de recibo já existente para a mesma chave não consome nova cota. Excesso devolve 429 e orientação de nova tentativa, sem descartar conteúdo. Não usar contato do visitante como chave de bloqueio global nem confiar arbitrariamente em cabeçalhos de IP do cliente.

Chaves secretas, contatos e personalizações não aparecem em logs técnicos. C2 não implementa disparo externo, exportação em massa, rotina automática de retenção ou apagamento de registros comerciais; acesso segue a área interna existente. A recuperação local contém somente a tentativa desta aba e é removida após confirmação.

Migração aditiva: preservar todos os produtos, clientes, Quote/QuoteItem, documentos emitidos, eventos e registros operacionais. Metadados novos de linha/documento são opcionais para registros antigos e não reconstituem personalizações históricas inexistentes.

## 8. Experiência e recuperação

Manter Poppins e identidade da vitrine; área interna segue o padrão administrativo existente. C2 amplia a lista com revisão, contato e confirmação sem redesenhar a home.

Campos possuem rótulos, erros associados e foco no primeiro erro; atualizações de envio/recibo usam anúncio acessível. Preservar teclado, alvos de 44 px, claro/escuro, movimento reduzido e ausência de overflow em 320/390/1440 px. Textos longos e falhas não ocultam a ação de recuperação.

Não mostrar sucesso antecipado, criar cliente ao abrir tela, aceitar preço do cliente como verdade ou habilitar envio externo automaticamente. Confirmação incerta tem apresentação própria, diferente de validação rejeitada.

## 9. Critérios de aceite

1. Visitante envia Ana/Bia como linhas distintas e recebe um protocolo persistente, sem conta.
2. Sem nome, sem canal válido, com lista vazia ou dados excessivos: rejeitar com erro localizado, mantendo o rascunho.
3. Revisar no envio as regras atuais e exigir reconfirmação de mudança; não gravar parcialmente uma seleção inválida.
4. Item sob consulta é recebido com valor nulo e indicação clara, sem total fechado fictício.
5. Mesma chave/conteúdo, inclusive concorrente ou após mudança de catálogo, produz um único recebimento e o mesmo recibo.
6. Mesma chave com conteúdo diferente retorna conflito sem alterar o recebido.
7. Timeout após commit e recarga permitem recuperar o recibo; falha de armazenamento tem aviso e alternativa em memória.
8. Falha de rede não limpa seleção/contato; limpeza pós-sucesso preserva linhas novas/alteradas e não reenvia automaticamente.
9. Visitante não consulta detalhes pelo protocolo, não enumera contatos e não acessa rotas internas. Cotas e limite de stream são exercitados.
10. ADMIN/OPERATOR atendem; concorrência de versão não sobrescreve estado, responsável ou notas.
11. Alterar produto ou cliente depois não reescreve o snapshot recebido ou documento emitido.
12. Vincular/criar cliente exige revisão explícita; recebimento público não altera Customer.
13. Preparação mantém configurações e linhas distintas; consulta sem preço resolvido ou descrição excessiva não passa silenciosamente.
14. Preparar simultaneamente cria um único rascunho e vínculo atômico; falha de qualquer parte não deixa orçamento órfão.
15. Fluxos existentes de editar, emitir e imprimir orçamento continuam válidos, preservando metadados novos e compatibilidade de registros antigos.
16. Nenhuma solicitação inicia venda, financeiro, estoque, produção ou envio de mensagem externa.
17. Migração preserva dados históricos; testes mutáveis usam exclusivamente banco descartável.
18. Conferência visual no navegador integrado cobre envio, erros, confirmação incerta, recibo e atendimento nas larguras/temas definidos; registrar exatamente a cobertura executada.

## 10. Próxima etapa

Após aprovação desta especificação escrita, elaborar plano de implementação com contratos, arquivos, testes, migração e método de execução. Não implementar nesta etapa. Publicação de C2 requer autorização própria, backup, ensaio de restauração e verificação da candidata; a autorização de publicação de C1 não se estende automaticamente a C2.
