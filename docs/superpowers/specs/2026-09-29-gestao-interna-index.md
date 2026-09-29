# Evolução da gestão interna — índice das especificações

## Decisões confirmadas

Em 29/09/2026, o usuário aprovou o desenho de três entregas: catálogo e aparência; clientes, orçamentos e vendas; financeiro. Confirmou gestão interna primeiro, sem integrações bancárias, cobrança externa ou emissão de notas fiscais.

A aprovação em conversa autoriza detalhar estas especificações. Elas registram as regras propostas para revisão escrita antes dos planos de implementação. Não representam funcionalidades já implementadas.

## Ordem e dependências

1. [Catálogo, coleções e aparência](2026-09-29-catalogo-aparencia-design.md): galeria de fotos, preço final independente, coleções, identidade da empresa, melhoria visual e tema automático. Pode ser entregue e usado sem os módulos seguintes.
2. [Clientes, orçamentos e vendas](2026-09-29-vendas-orcamentos-design.md): processo comercial e constituição de parcelas a receber. Inclui a estrutura mínima dos recebíveis para que confirmar uma venda já produza obrigações persistentes, antes da interface financeira completa.
3. [Financeiro](2026-09-29-financeiro-design.md): usa os recebíveis da entrega 2 e acrescenta contas financeiras, pagamentos, despesas, transferências, estornos e fluxo de caixa. Não recria parcelas já geradas pelas vendas.

Cada entrega terá um plano próprio. A execução direta nesta conversa permanece como método escolhido pelo usuário; não será necessário escolher novamente o método em cada entrega.

## Regras compartilhadas

- Uma empresa/equipe, utilizando o Next.js, Prisma e PostgreSQL existentes. Acesso fechado; sem inscrição pública.
- ADMIN administra configurações da empresa e financeiro. ADMIN e OPERATOR gerenciam produtos, coleções, clientes, orçamentos e fluxo operacional de vendas.
- Visitantes veem apenas o catálogo, imagens publicadas, coleções ativas e informações públicas da empresa. Nenhum cliente, documento comercial, custo ou dado financeiro entra nas respostas públicas.
- Regras de autorização verificadas no servidor, inclusive no acesso direto a APIs. Sessões inativas, expiradas ou revogadas não autorizam operações.
- Valores monetários em BRL, representados com aritmética decimal. Quantias financeiras e preços finais usam duas casas decimais, HALF_UP. Cálculos internos de custos preservam a precisão existente.
- Valores finais persistidos limitados a Decimal(18,2). O servidor recusa valores fora da capacidade do banco e não confia em totais fornecidos pelo navegador.
- Operações persistentes usam transação quando envolvem mais de um registro. Edições usam versão para detectar concorrência; conflitos preservam o rascunho e não sobrescrevem silenciosamente.
- Documentos, conversões, parcelas, baixas e estornos possuem vínculos e restrições únicas para impedir duplicação por reenvio ou concorrência.
- Datas de vencimento e validade são datas civis, sem conversão que mude o dia. Eventos guardam timestamp UTC e exibem America/Sao_Paulo.
- Interface e mensagens em português, responsivas, com campos rotulados, foco visível e estado de carregamento/erro/vazio. Erros não descartam campos preenchidos.
- Migrações versionadas preservam os dados existentes. Testes de integração usam bancos isolados. Antes de escrever código Next.js, consultar a documentação instalada indicada por AGENTS.md.
- Sem emissão fiscal, Pix/boleto automático, conciliação bancária externa, integração contábil ou checkout público nesta etapa. Os meios de pagamento são registros internos.

## Contratos entre entregas

O catálogo fornece identidade do produto e preço final vigente para iniciar uma linha de orçamento. O documento salva uma cópia de nome, descrição e preço, não uma referência que permita alterar retroativamente o conteúdo ao editar o catálogo.

Um orçamento aprovado é convertido em no máximo uma venda. A venda possui parcelas identificadas e constitui contas a receber exatamente uma vez na confirmação. Financeiro registra liquidações contra essas parcelas sem alterar o total do documento comercial.

Cancelamento de venda sem recebimento vigente cancela seu saldo aberto. Venda com recebimento vigente só pode ser cancelada depois de estornar os recebimentos pela área financeira, por administrador; os registros históricos permanecem.

Mudanças no nome/logo/contatos aplicam-se às páginas atuais e aos novos documentos. Orçamentos emitidos e vendas preservam os dados da empresa usados na emissão.

## Critérios de encerramento

Cada entrega exige seus testes de domínio, permissões, integração e interface, análise de tipos, lint e build. A entrega visual inclui verificação em computador e celular, nos temas claro e escuro; o financeiro inclui casos de centavos, concorrência e estorno. Limitações de ambiente devem ser relatadas com precisão e não registradas como testes aprovados.

Revisão interna deste conjunto: limites de acesso, preservação de preços, fronteira comercial/financeira, cancelamentos e arredondamento estão descritos nos documentos vinculados. Próxima etapa: revisão das especificações escritas pelo usuário.
