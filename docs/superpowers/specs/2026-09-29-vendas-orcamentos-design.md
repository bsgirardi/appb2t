# Entrega 2 — clientes, orçamentos e vendas

## Objetivo e fronteira

Gerenciar o processo comercial interno desde o cliente e o orçamento até a produção, entrega e constituição de parcelas a receber. Segue as [regras compartilhadas](2026-09-29-gestao-interna-index.md) e depende do preço final e da identidade da empresa definidos na entrega 1.

ADMIN e OPERATOR podem operar clientes, orçamentos e vendas. Liquidação, estorno e administração de contas financeiras ficam exclusivamente para ADMIN na entrega 3. Não há aceite público online, envio de mensagens, integração fiscal, checkout, estoque automático ou cobrança externa nesta etapa.

## Clientes

Página `/clientes` com busca, paginação, criação, edição e inativação. Campos: nome obrigatório (2–160), tipo pessoa física/jurídica, documento opcional, e-mail opcional, telefone opcional, endereço opcional e observações internas (até 2000). Dados não são disponibilizados no catálogo.

Documento é um identificador informado pela equipe, sem consulta externa; normalizar espaços e pontuação e não afirmar validação fiscal. E-mail usa validação de formato. Não exigir documento para orçar.

Cliente inativo não pode ser escolhido para novo orçamento/venda, mas documentos antigos continuam legíveis. Não apagar clientes ligados a documentos. Ao editar um cliente, não alterar a cópia de seus dados em documentos já emitidos.

## Orçamentos

Página `/orcamentos` com busca por número/cliente, filtros por estado e datas, ordenação e paginação. Tela de detalhe com histórico e versão para edição concorrente.

Estados: RASCUNHO, ENVIADO, APROVADO, REJEITADO, EXPIRADO e CONVERTIDO. “Enviado” significa que a equipe registrou o envio realizado fora do sistema; a aplicação não transmite mensagens. Aprovação/rejeição também é registrada manualmente, com usuário e data.

Rascunho exige cliente ativo, validade, pelo menos uma linha e condições de pagamento para emitir. Cada linha contém produto opcional, descrição, quantidade inteira de peças de 1 a 100000 e preço unitário positivo em BRL. Selecionar um produto ativo copia seu preço final vigente; permitir linha personalizada para trabalho sob encomenda e permitir negociação do preço na linha.

Limite de 100 linhas por documento. Totais são calculados no servidor: subtotal = soma de quantidade × preço unitário; desconto em reais entre zero e o subtotal; frete não negativo; total = subtotal − desconto + frete, estritamente positivo. Quantias respeitam Decimal(18,2). Não acrescentar taxa ou percentual fiscal implícito.

Gravar snapshots do nome/descrição do produto, preço unitário, dados públicos da empresa e dados do cliente ao emitir. Após emissão, mudanças no catálogo, cliente ou logo não alteram o documento. Edição de conteúdo exige retornar explicitamente a RASCUNHO, gera registro de histórico e invalida a aprovação anterior; orçamento convertido não pode ser reaberto ou alterado.

Validade é inclusiva até o fim da data no fuso America/Sao_Paulo. Orçamento enviado vencido é exibido como EXPIRADO mesmo sem job agendado e não pode ser aprovado/convertido; orçamento aprovado precisa ser convertido até a validade ou revisado e aprovado novamente. O estado expirado é uma projeção por data para documentos elegíveis, sem reescrever eventos históricos.

Número sequencial gerado no banco, com prefixo ORC; lacunas são aceitas e números nunca são reutilizados. Emissão duplicada e transições concorrentes verificam versão. Impressão em página privada própria, com CSS de impressão e opção do navegador de salvar em PDF, sem custo/margem/observações internas. O documento inclui número, emissão, validade, cliente, itens, desconto, frete, total, condições e identidade da empresa.

## Vendas

Página `/vendas` com lista, busca, filtros por estado operacional/cliente/período e detalhe. Criar diretamente ou converter orçamento APROVADO vigente. Conversão é atômica e idempotente: cada orçamento vincula-se a no máximo uma venda, inclusive em concorrência. A venda preserva os snapshots e totais do orçamento.

Vendas diretas começam em RASCUNHO, com a mesma validação de itens e totais. Ao confirmar, congelam-se conteúdo comercial, cliente e condições. Número sequencial VEN é gerado no banco e nunca reutilizado.

Estados operacionais: RASCUNHO → CONFIRMADA → EM_PRODUCAO → PRONTA → ENTREGUE. Cancelamento pode ocorrer antes da entrega, sujeito às regras financeiras abaixo. Alterar prazo previsto ou observações operacionais permanece permitido com versão e histórico, sem modificar itens/preços. Correção de conteúdo comercial exige cancelar e criar nova venda; não editar retroativamente venda confirmada.

Orçamento convertido gera uma venda CONFIRMADA somente depois de definir o parcelamento. O usuário pode preparar e revisar o parcelamento antes de concluir a conversão. A conversão grava venda, itens, parcelas, vínculo com orçamento e histórico em uma única transação; se qualquer parte falhar, nada é convertido.

Exibir ao operador um resumo de recebimento da própria venda (total, recebido, pendente e vencido), sem expor contas bancárias, despesas ou caixa da empresa. Ações de recebimento/estorno remetem à área financeira e exigem ADMIN. Esse resumo é derivado dos lançamentos da entrega 3 e inicia com recebido zero.

## Parcelas e contrato financeiro

Antes de confirmar uma venda, informar de 1 a 120 parcelas, valores e vencimentos. Pode haver entrada e parcelas mensais. Para divisão automática, distribuir centavos pelo índice: R$ 100,00 em três parcelas resulta em R$ 33,34, R$ 33,33 e R$ 33,33. A soma deve ser exatamente igual ao total da venda. Se houver menos centavos que parcelas, recusar a divisão; nenhuma parcela pode ter valor zero.

Datas mensais preservam o dia original quando existe; nos meses curtos, usam o último dia daquele mês, sem acumular deslocamento para os seguintes. O usuário pode ajustar datas e valores antes da confirmação. Não há juros ou multa automática nesta versão.

Introduzir `FinancialEntry` como obrigação a receber/pagar, com tipo, valor positivo, vencimento, descrição, estado ativo/cancelado, versão e origem opcional em parcela de venda. `SaleInstallment` guarda número, valor e data; uma restrição única impede mais de um recebível para a mesma parcela. Origem comercial e valor confirmado não são editáveis como lançamento avulso.

A confirmação constitui recebíveis exatamente uma vez; não movimenta saldo de caixa e não presume pagamento. Status “pago/parcial/vencido” é derivado de liquidações válidas e da data, não de um checkbox manual no orçamento.

Cancelar uma venda com zero recebido vigente cancela seus recebíveis abertos atomicamente e mantém documentos e histórico. Se houver recebimento não estornado, recusar o cancelamento e informar que um administrador deve estornar os recebimentos primeiro. O cancelamento não executa reembolso externo. Venda entregue não é cancelada pelo fluxo comum; devolução comercial e reembolso externo ficam fora desta entrega.

## Modelo e histórico

Adicionar Customer, Quote, QuoteItem, Sale, SaleItem, SaleInstallment, FinancialEntry e registro de eventos comerciais. Usar relações para rastreabilidade e snapshots para o conteúdo histórico. Eventos guardam autor, instante, ação e motivo quando aplicável; não armazenam senha ou token de sessão.

As operações de aprovação, conversão, confirmação, cancelamento e transição operacional verificam estado atual e versão no servidor. A transação e restrições de banco impedem venda/recebível duplicado. Histórico não possui API de edição/exclusão.

## Interface e falhas

Navegação da área interna ganha Clientes, Orçamentos e Vendas. Formulários possuem resumo de totais sempre identificável, valores por linha, estados vazios e mensagens específicas para versão desatualizada, orçamento vencido, cliente/produto inativo e parcelas inconsistentes.

O botão de confirmação fica protegido contra cliques repetidos; a API continua idempotente independentemente da interface. Paginação usa tamanho padrão de 25 e máximo de 100. Filtros usam datas civis e enumerações validadas, sem montar SQL a partir de texto livre.

## Aceitação

- Operador cria cliente, emite orçamento, registra aprovação e converte uma única vez em venda.
- Mudanças posteriores no produto, cliente ou aparência não alteram documentos emitidos.
- Valores, desconto, frete e parcelas são recalculados/validados no servidor; entradas negativas, overflow e parcelas divergentes são recusados.
- Orçamento expirado não pode ser aprovado/convertido; edição de emitido revoga aprovação; convertido permanece imutável.
- Duas conversões/confirmacões concorrentes não duplicam venda nem recebíveis.
- Confirmar venda cria obrigações, mas não cria caixa recebido.
- Cancelamento sem recebimento cancela saldo aberto; com recebimento vigente é recusado sem efeitos parciais.
- Impressão omite custos, margens e observações internas; visitante não acessa documentos nem clientes.
- Testar centavos, virada de mês/ano, datas no fuso, estados operacionais, autorização, histórico e conflitos.
- Executar testes, typecheck, lint, build e verificação no navegador em computador/celular nos dois temas.

Revisão interna: separação entre obrigação e caixa definida; conversão e cancelamento compatíveis com a especificação financeira; emissão preserva identidade e preço histórico; entrega utilizável antes da interface financeira completa.
