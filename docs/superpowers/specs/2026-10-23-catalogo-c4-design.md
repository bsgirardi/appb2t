# C4 — Arte, aprovação e continuidade

Data: 23/10/2026. Estado: especificação aprovada pelo usuário nesta conversa; implementação não iniciada.

## Objetivo e decisões recebidas

A equipe prepara referências e artes em imagens ou PDF; o cliente revisa por link privado e aprova uma versão determinada ou pede ajustes. A configuração aprovada acompanha orçamento, venda e produção sem substituir o aceite comercial.

Decisões explícitas nesta conversa: aprovação direta pelo cliente por link privado; JPEG, PNG, WebP e PDF; anexos enviados somente pela equipe. C4 precede C5. Não importar banco anterior, inventar credenciais, provedor de pagamento ou políticas comerciais. Preservar alterações locais de segurança e testar mutações exclusivamente em banco separado.

## Abordagens

Escolhida pelo usuário: equipe anexa arquivos e compartilha o link de revisão. Aproveita o atendimento existente e evita exigir conta ou upload público do cliente.

Alternativa considerada: cliente também envia arquivos. Facilita a coleta, mas amplia recebimento público, cotas e recuperação de upload; fica fora de C4.

Decisão técnica proposta: evoluir a aplicação Next/Prisma/PostgreSQL atual, com arquivos privados no PostgreSQL e migração aditiva. Reutilizar componentes locais e os vínculos de origem C2/C3. Armazenamento externo criaria configuração e recuperação adicionais sem necessidade comprovada.

## Fluxo interno

ADMIN e OPERATOR ativos acessam Arte no atendimento de uma solicitação. Um pacote de arte tem identidade própria, número sequencial de revisão e vínculo explícito com uma ou mais linhas recebidas. Um conjunto pode compartilhar uma revisão quando a equipe selecionar todas as linhas correspondentes; o cliente vê a abrangência textual e as personalizações.

Cada revisão contém instruções, referências e arquivos finais. Referências são identificadas como apoio; somente arquivos marcados como arte final integram o aceite. Publicar exige pelo menos uma arte final e a conferência das linhas abrangidas. A revisão publicada fica imutável. Corrigir arquivo, instrução ou abrangência cria outra revisão; não substitui bytes anteriores.

Proposta técnica para vigência: criar um rascunho não substitui a revisão publicada nem suspende seu aceite. Publicar a nova revisão faz a substituição e a suspensão atomicamente; a equipe recebe aviso explícito desse efeito antes de confirmar. Alterar a configuração comercial relevante da linha continua invalidando a aplicabilidade imediatamente, mesmo sem publicar nova arte.

Cada linha tem no máximo um pacote vigente. Todas as artes finais necessárias àquela linha entram nesse pacote e são aprovadas juntas. Publicação valida a exclusividade sob lock; pacotes históricos permanecem consultáveis internamente. Transferir linha para outro pacote é substituição explícita com o mesmo efeito de suspensão, sem herdar o aceite do pacote anterior. Ao retirar linha de um pacote, sua exigência de arte permanece pendente até nova vinculação/aprovação; a retirada não dispensa o requisito.

A equipe copia o link e o envia conscientemente pelo canal de atendimento. C4 não envia mensagens automaticamente. A tela mostra o estado real: rascunho, aguardando cliente, ajustes solicitados, aprovado ou substituído. Expiração/revogação pertencem ao acesso e não apagam a decisão histórica.

Não exigir arte de solicitações antigas ou de produtos sem essa necessidade. A equipe marca explicitamente as linhas que exigem aprovação antes de produzir. Depois da conversão em venda, manter acesso ao mesmo pacote pelo vínculo comercial, sem depender de retornar à lista de solicitações.

## Página do cliente e decisão

O link dá acesso somente a uma revisão e à descrição das linhas abrangidas. Não expõe dados cadastrais completos, custos, notas internas, outras revisões, solicitações ou documentos comerciais. Exibir versão, instruções, arquivos finais e referências claramente separados.

Imagens têm prévia acessível. PDF tem download explícito; não prometer renderização em todos os navegadores. A página informa que todos os arquivos finais listados integram a versão, inclusive PDFs. Não interpretar código, JavaScript ou anexos contidos no PDF.

Para aprovar, o cliente informa nome e confirma que revisou a versão e seus arquivos. Para pedir ajustes, informa nome e comentário obrigatório. A interface esclarece: a aprovação é da arte; não confirma compra, pagamento ou início de produção. Nome declarado não constitui verificação independente de identidade: qualquer pessoa com o link válido pode decidir.

Registrar decisão, revisão, manifesto com hashes dos arquivos, nome declarado e horário do servidor. Não coletar IP ou documento pessoal como prova artificial. Após decisão, mostrar recibo persistido; reenvio da mesma operação retorna o mesmo resultado. Aprovar e pedir ajustes concorrentes não podem ambos vencer. Uma decisão é terminal para aquela revisão; mudança posterior exige revisão nova.

Uma revisão substituída não aceita decisões, mesmo por uma aba aberta anteriormente. O servidor verifica vínculo, revisão atual, validade do acesso e estado na mesma transação da decisão. Resposta perdida permite consultar o resultado e repetir a operação sem duplicá-la.

## Acesso privado

Propostas técnicas a confirmar junto desta especificação: token aleatório de 256 bits, somente hash persistido; validade inicial de sete dias, com expiração exibida à equipe. Renovação gera outro token e revoga o anterior, preservando eventual decisão já registrada. Revogação imediata disponível à equipe.

Usar segredo no fragmento do link e trocá-lo via POST por autorização restrita à revisão, em cookie HttpOnly. Não colocar segredo em query, caminho de download, logs ou armazenamento local. A autorização nunca se amplia para outra revisão; cada acesso a arquivo revalida revogação e expiração. A implementação deve acomodar duas revisões abertas sem conceder acesso cruzado.

Página e respostas privadas usam no-store, noindex e Referrer-Policy no-referrer; sem recursos externos ou telemetria. Requisições mutáveis validam origem, tamanho e cotas de tentativas. Visualizar ou abrir o link por GET não aprova nada. A autorização por link não depende da sessão administrativa.

## Arquivos e conservação

Limites técnicos propostos: dez arquivos por revisão, dez MiB por arquivo e cinquenta MiB no total; textos até 4.000 caracteres. Upload sequencial com progresso e recuperação por chave de operação evita um multipart gigante. Falhas parciais conservam o rascunho; somente arquivos efetivamente recebidos podem ser publicados. Cotar também rascunhos e revisões por solicitação para impedir crescimento ilimitado; limite inicial de vinte revisões por pacote, com mensagem explícita e sem exclusão automática.

Validar formato pelos bytes. Imagens estáticas usam validação e normalização com sharp, limite de quarenta milhões de pixels; persistir o original privado e a prévia normalizada separadamente. O aceite referencia o hash do original e a prévia exibida. Não usar o normalizador atual para substituir silenciosamente o original aprovado.

PDF: validar com parser mantido, rejeitar arquivos inválidos, criptografados e recursos ativos/embutidos detectados; servir exclusivamente como download, application/pdf, nosniff e nome sanitizado. Não anunciar antivírus ou sanitização completa sem mecanismo real. Escolha do parser e limites de complexidade ficam para o plano, após verificar a dependência; não aceitar PDF apenas por extensão ou prefixo.

Proposta de conservação: nenhuma exclusão automática em C4. Revisões publicadas, decisões e arquivos referenciados são preservados no backup PostgreSQL. Remover arquivos só de rascunhos não publicados; limpeza administrativa e retenção temporal exigem política futura explícita. Esses padrões são propostas técnicas, não política comercial já aprovada.

## Documentos e produção

Preservar identidade estável por linha, inclusive duas personalizações do mesmo produto e componentes de kit. O vínculo não se baseia em posição de array nem somente no produto. Alterar personalização, quantidade, descrição ou abrangência invalida a aplicabilidade do aceite para a linha alterada; conservar a evidência anterior e exigir revisão explícita. Alterar preço, desconto ou frete não modifica a arte nem equivale a novo aceite comercial.

Orçamento em rascunho pode existir com arte pendente. Emissão congela o estado e as referências disponíveis naquele momento; aceite posterior gera evento separado, sem reescrever documento emitido. Conversão copia a identidade e a evidência aplicável para a venda. A impressão identifica revisão/estado e não inclui tokens privados. O cliente não ganha acesso ao orçamento pela página de arte.

Bloquear liberação de ordem e novos apontamentos produtivos para linhas marcadas como exigindo arte enquanto não houver aprovação aplicável. O bloqueio não atinge ordens para estoque nem linhas legadas sem exigência. Uma nova revisão invalida a autorização para novos apontamentos das linhas afetadas, preservando consumo, peças e eventos anteriores. Não desfazer produção física nem reservar material automaticamente. Integrar o bloqueio às transações e à ordem de locks existente, evitando corrida entre aprovação, revisão e liberação.

Não introduzir dispensa administrativa de aprovação nesta entrega. Correções comerciais e destinação de peças já produzidas continuam nos fluxos existentes; publicar revisão exige aviso quando já houver produção registrada.

## Aceite e validação

- Fluxo completo solicitação → arquivos → publicação → link → ajustes → nova revisão → aprovação → orçamento/venda → produção, sem alteração de valores ou duplicação financeira.
- Regressões para acesso sem token, token expirado/revogado, arquivo de outra revisão, aba antiga, duas decisões concorrentes, decisão repetida e resposta perdida.
- Arquivos falsificados, excesso de bytes/pixels/arquivos, PDF inválido/criptografado/ativo, upload parcial e reenvio.
- Duas personalizações iguais de produto, kit e reordenação preservam vínculos; mudança relevante exige revisão; documentos históricos e originais não são regravados.
- Produção bloqueada apenas onde exigido; corrida com revisão não contorna bloqueio; fatos anteriores e modo legado preservados.
- Interface a 320/390/1440 px, teclado, foco, alvos públicos de 44 px, estados vazio/erro e movimento reduzido.
- Migração e suíte mutável somente em b2t_test separado; tipos, lint, build e revisão antes de publicação. Backup e ensaio de restauração precedem migração operacional autorizada.

## Fora de C4 e sequência

Sem uploads públicos, STL/3MF, editor de arte, assinatura digital certificada, envio externo automático, conta de cliente, checkout, cobrança ou reserva automática. Não usar aprovação de arte para aprovar comercialmente o orçamento.

Após aprovação desta especificação: elaborar plano técnico, implementar e validar C4. Depois detalhar C5 com decisões reais de compra, entrega, pagamento, cancelamento e efeitos operacionais; a abertura existente não define essas regras nem um provedor.
