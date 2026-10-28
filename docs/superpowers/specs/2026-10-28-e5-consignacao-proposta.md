# E5.1 — Parceiros e custódia em consignação

Data: 28/10/2026. Estado: proposta de abordagem para escolha; não é desenho aprovado nem plano de implementação.

## Base conferida

Leitura do AGENTS.md, PENDENCIAS.md e roadmap na instalação original. Main local e remota em `7fe37d9`, versão 1.10.1. E1.1–E4.1 integradas; as etapas amplas continuam parciais. Os limites antigos de recursão do Vitest e de indisponibilidade do banco E4 foram superados pela manutenção/validação registrada em 28/10; não são impedimentos atuais presumidos.

- `StockItem` e `StockMovement` representam insumos/complementos, com reservas e valoração; não são o cadastro de peças prontas.
- `FinishedStock`, `FinishedOrigin` e `FinishedMovement` já oferecem peças por produto, origem produtiva/abertura, quantidades e correções. Não possuem dimensão de local.
- `finished-stock.ts` calcula físico, reservado e disponível; `restrictedOriginSale` protege peças exclusivas de outra venda. `fulfillment.ts` reserva por origem e exige demanda de venda; `FinishedCommitment.saleId` é obrigatório.
- `ProductionDelivery` exige venda e compromissos; reutilizá-la como remessa criaria um vínculo comercial indevido. Não criar venda fictícia para movimentar consignação.
- A confirmação comercial e `createSaleReceivables` criam parcelas/recebíveis. A remessa deve passar fora dessa confirmação.
- O financeiro já tem títulos, baixas parciais, contas, movimentos, estornos e auditoria. Acerto futuro deve vinculá-los, sem criar um segundo caixa.
- Comandos de produção coordenam planejamento, idempotência e bloqueios de estoque. E5 precisa participar dessa mesma coordenação para disputar peças com reservas, ajustes e entregas existentes.
- Rentabilidade trata `LOSS` e `ADJUSTMENT_OUT` como perdas em consultas específicas. Remessa não pode ser disfarçada de perda/ajuste; custos e perdas na custódia precisam de contrato explícito para evitar duplicidade.

## Abordagens para escolha

1. **Custódia primeiro — recomendada.** E5.1 entrega parceiro, condições registradas, remessa, recebimento, saldo, retorno e perda física. E5.2 conecta venda efetiva, comissão e acerto ao comercial/financeiro. Permite validar conservação das peças antes de acrescentar obrigações financeiras. Limite: E5.1 sozinha ainda não atende lojas que já precisem registrar vendas pelo módulo.
2. **Ciclo vertical completo.** Entregar desde o cadastro até venda efetiva, comissão e acerto em uma única entrega. Já atende operação comercial completa, mas exige decidir também devedor, preço praticado, comissão retida/paga, periodicidade, cancelamento e reflexos no custo/recebíveis. Maior superfície de migração e concorrência.

Não recomendar cadastro isolado sem movimento nem saldo independente atualizado manualmente: não comprovariam a rastreabilidade solicitada. A prioridade proposta é loja parceira; balcão/feira permanece fora deste recorte, sujeito a decisão própria.

## Recorte proposto de E5.1

Parceiro com nome, contato, endereço do local, responsável interno ativo e condições comerciais descritivas. ADMIN mantém cadastro/condições e autoriza perdas/correções; OPERATOR consulta e registra expedição, recebimento e retorno. Tudo privado e auditado; parceiro não ganha acesso externo. Proposta inicial: um local por parceiro; múltiplas filiais ficam para evolução explícita.

Rascunho da remessa não reserva peças. Expedição confirmada retira atomicamente apenas peças disponíveis e elegíveis do local interno para trânsito, mantendo referência às origens e à remessa. Reserva de venda e remessa concorrentes não podem consumir as mesmas peças. O saldo existente de produção passa a representar o local interno; a apresentação deve explicar a diferença entre peças internas, em trânsito e no parceiro.

Recebimento é conferência registrada por usuário interno, com nome de quem recebeu, data civil e observação; não equivale a prova externa automática. Permitir recebimentos parciais: quantidade pendente continua em trânsito. Divergência não desaparece nem vira perda automaticamente.

Retorno é aberto contra saldo confirmado no parceiro, passa a trânsito de retorno e só fica disponível internamente após conferência. Perda em trânsito ou no parceiro exige administrador, motivo, quantidade e vínculo à origem/remessa. Não gera cobrança automática. Correções compensam eventos com motivo; não apagam história. Bloquear compensação se movimentos dependentes impedirem a conservação; detalhar matriz no desenho completo.

Produtos sem estoque pronto ativo/inventariado, peças comprometidas e origens exclusivas não liberadas são inelegíveis. Kits compostos e configurações personalizadas sem identidade física inequívoca ficam fora do primeiro recorte; não converter quantidade comercial em componentes implicitamente. Transferência direta entre parceiros também fica fora.

Não criar venda, parcela, recebível, baixa, comissão ou receita ao expedir/receber/retornar. Não apresentar resultado financeiro ou custo ausente como zero. Condições descritivas de E5.1 não são cálculo automático de comissão.

## Critérios verificáveis propostos

1. Com 20 peças internas livres, expedir 8 resulta em 12 internas e 8 em trânsito. Receber 6 resulta em 12 internas, 6 no parceiro e 2 em trânsito, sem novo título, venda ou movimento de caixa.
2. Retornar 2 das 6 recebidas deixa 4 no parceiro e 2 em trânsito de retorno; conferi-las devolve o interno a 14. Perder 1 das 2 ainda em trânsito de ida deixa 14 internas + 4 no parceiro + 1 em trânsito + 1 perdida = 20.
3. Impedir quantidade fracionária, nula em movimentos, negativa, acima do saldo, origem incompatível e recebimento acima do pendente. Rascunho não altera disponibilidade.
4. Duas expedições concorrentes e disputa com reserva/ajuste/entrega devem conservar saldo sob locks reais PostgreSQL. Falha no meio da transação não deixa movimento órfão. Repetir chave/payload retorna o mesmo resultado; reutilizar chave com payload diferente conflita.
5. Parceiro inativo não recebe nova remessa; retornos e resolução de pendências continuam possíveis. Não excluir parceiro/remessa com histórico. Edição de condições não reescreve fatos anteriores.
6. Consulta por parceiro/produto discrimina trânsito de ida, confirmado, trânsito de retorno, retornado e perdido, com origem e autor/data/motivo dos eventos. Não duplicar peças no consolidado.
7. Permissões verificadas no servidor, incluindo usuário desativado e papel alterado. Interface com componentes instalados e skill shadcn do projeto, teclado e largura móvel.
8. Migração aditiva preserva estoque e histórico atuais; testes regressivos cobrem projeções de disponibilidade, planejamento e rentabilidade para impedir que transferências sejam interpretadas como venda/perda.

## Dependências antes de implementar

- Escolher abordagem e aprovar desenho completo. O desenho deve fechar estados/correções, identidade elegível, autorizações, representação do local e conservação por origem, inclusive compatibilidade com ajustes/valoração atuais.
- Adaptar o contrato do estoque pronto: o schema atual não expressa local nem compromisso sem venda. Reutilizar origens e movimentos; desenhar vínculo de custódia e novos tipos explícitos, sem sobrecarregar `FinishedCommitment` com venda fictícia.
- Definir integração de custos: transferência mantém proveniência e não reconhece perda nem receita; perdas físicas devem aparecer uma única vez nas projeções apropriadas. E5.1 não promete resultado por parceiro.
- E5.2 precisará decidir devedor (parceiro/cliente final), momento do registro da venda efetiva, preço e condições congeladas, arredondamento, comissão retida versus paga separadamente, fechamento por período e correções após baixa. Venda de peças já no parceiro não pode provocar segunda saída do estoque interno nem dupla apropriação de custo.
- Reposição e resultado por parceiro/produto ficam posteriores à base de saldos e ao contrato comercial; não presumir dependência de incrementos E1–E4 ainda pendentes.

## Execução e estado da entrega

Antes de código, preparar worktree E5 exclusiva a partir da main vigente, ler os guias locais Next.js relevantes e a skill shadcn para alterações visuais. Plano de testes deve ter configuração E5 própria, variável específica e allowlist de banco descartável; jamais carregar setup que trunque banco operacional ou de outra etapa. Criar/alterar contêineres não está autorizado nesta etapa.

Nesta entrega: inspeção estática e proposta documental, sem testes funcionais, build ou acesso a banco. Não houve implementação, migração, PR, merge ou publicação. Versão 1.10.1 preservada; eventual PR exige autorização específica, incremento SemVer comparado à main atual, manifestos/notas/rodapés consistentes. Não incrementar apenas pela proposta local.

Próxima ação: escolher custódia primeiro ou ciclo completo; então escrever desenho completo, revisar e obter aprovação antes do plano executável. A ordem E1–E6 aprovada não é aprovação destes detalhes.
