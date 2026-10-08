# Backlog consolidado e abertura do U3

Data: 07/10/2026. Base inspecionada: branch `feat/calculadora`, HEAD `4faf429`, implementação U2 `76eb2ec`. Este documento registra descoberta e proposta inicial; não é especificação aprovada nem plano autorizado de implementação.

Atualização posterior nesta conversa: usuário confirmou venda+estoque e acabado sem negativo, e aprovou integralmente `2026-10-07-producao-entrega-design.md`. Plano preparado em `../plans/2026-10-07-producao-entrega.md`, aguardando revisão. O restante deste registro conserva a descoberta inicial.

## Estado confirmado

Checkout limpo antes desta documentação. Containers operacional de aplicação, banco operacional e banco de teste saudáveis na consulta desta sessão. U0/U1 e U2 concluídos; publicação U2 registrada em `docs/VALIDACAO.md`, seção final de 07/10. Os 352 testes/96 arquivos, build, tipos, lint e revisão independente são evidência da entrega anterior; não foram reexecutados nesta descoberta somente de leitura.

Os checklists originais de U2 não indicam funcionalidades faltantes: o fechamento de `plans/2026-10-06-estoque-integrado.md` os sucede. As declarações antigas de “não implementado” ou “produção anterior” nas fontes devem ser lidas com seus registros posteriores de fechamento.

## Pendências reais e sequência

| Prioridade | Entrega/ação | Evidência e limite |
| --- | --- | --- |
| P0 | U3: ordens e entregas parciais, consumo/tempo, falhas, reimpressões, correções e cancelamentos | `prisma/schema.prisma` tem Sale/SaleItem e estados comerciais, mas não ordens ou entregas por quantidade; README declara esse limite. Depende de desenho próprio. |
| P1 | U4: rentabilidade por pedido/produto/canal | U1 oferece estimativa; custo real consolidado não está implementado. Definir taxas efetivas, frete, descontos, perdas/devoluções e cobertura incompleta. Compra, consumo e pagamento não serão três despesas somadas. |
| P1 | U5: responsáveis, próxima ação, prazos e capacidade; captura revisada de solicitações do catálogo | Venda já tem prazo/notas; catálogo prepara contato, sem criar pedido automaticamente. Não confundir esses recursos com planejamento de capacidade ou atendimento completo. |
| Condicional | U6: kits, consignação, importação de fatiamento e cenários | Plano diretor exige demanda e especificação próprias; não são compromisso aprovado. |
| Menor | Identificar versão global de tarifas na memória U1 | `src/domain/pricing/types.ts` e `resolve.ts`: versão é validada na requisição, mas não integra PricingV2Input resolvido; valores históricos são preservados. |
| Evidência | Testar mudança de tema do sistema durante sessão e diálogo nativo de impressão/PDF | `docs/VALIDACAO.md` registra inspeções de temas e impressão, sem comprovar esses dois comportamentos nativos. Não são bugs demonstrados. |
| Evidência | Revisões independentes ausentes em algumas entregas antigas | Limite histórico, não funcionalidade faltante; U1/U2 possuem revisão registrada. |
| Operação | Habilitar estoque e registrar contagem inicial real | U2 não infere quantidade pelo cadastro de preço. Não consultar nem alterar dados operacionais para inventar contagem. |
| Operação | Fotos, banners, contatos, institucional e FAQ reais | Dependem da operação; não inserir exemplos em produção. |
| Condicional | Exposição pública | Domínio/proxy, APP_URL HTTPS, cabeçalhos, canonical, imagens e sitemap; Search Console depende de acesso. Localhost:3000 já está publicado. |
| Manutenção | Reavaliar advisory transitivo de braces quando houver atualização pertinente | Última evidência U2: cinco avisos encadeados do mesmo DoS no globbing de desenvolvimento do ESLint. Não houve auditoria nova nesta sessão; não afirmar que continua sem correção hoje. source-map-js já atualizado para 1.2.2. Sem audit fix --force ou downgrade incompatível de Next. |

**Pendência removida após inspeção:** horários comerciais já explicitam `America/Sao_Paulo` em `src/components/commerce/sale-detail.tsx` e `quote-detail.tsx`. A observação histórica de fuso do navegador está superada no código atual.

Fora do ciclo: multiempresa, assinaturas, cadastro público de operadores, IA/3D, checkout/pagamentos online, marketplaces transacionais, integração bancária/fiscal e estoque/preço por variação sem escopo próprio.

## U3: entendimento e alternativas

Objetivo: permitir que a equipe saiba o que precisa produzir e entregar, execute parcialmente os itens e registre material e tempo reais sem alterar preço negociado, documentos, recebíveis ou pagamentos. Reutilizar cadastros e estoque U2. ADMIN mantém custos/financeiro; OPERATOR executa sem receber dados de custo.

Alternativas consideradas:

1. **Recomendada: ordens próprias, vinculadas às linhas da venda, com apontamentos e entregas por quantidade.** Permite divisão e rastreabilidade sem acoplar produção ao pagamento. Produção para estoque depende da decisão abaixo.
2. Acrescentar somente estados/campos à venda: menor alteração, mas não resolve múltiplas execuções, perdas e entregas parciais de forma auditável.
3. Incluir planejamento automático de capacidade: antecipa U5, amplia decisões e dependências sem ser necessário para executar U3.

### Decisão de negócio confirmada

O usuário confirmou nesta conversa: U3 deve permitir produção para venda **e para estoque**, com atendimento de vendas futuras pelas peças prontas. O detalhamento está na proposta `2026-10-07-producao-entrega-design.md`. Essa confirmação fecha o escopo de pronta-entrega, sem representar aprovação antecipada das demais regras da especificação.

### Proposta a desenvolver na especificação

- Ordem vinculada a uma venda, com uma ou mais linhas; uma linha pode ser dividida entre ordens. Evitar misturar vendas na primeira versão. Quantidade alocada não pode superar demanda restante sob concorrência.
- Apontamento identifica executor, máquina utilizada quando aplicável, tempo de máquina, preparação/acabamento e quantidades boas/falhas. A responsabilidade planejada é distinta do autor efetivo. Falha não atende demanda; reimpressão referencia a tentativa anterior e registra novos consumos/tempos.
- Ficha estimada apenas sugere material. Confirmar apontamento real gera os movimentos U2 uma única vez. Não consumir novamente ao concluir ordem ou entregar. Tempo/material ausente aparece como cobertura incompleta, não zero real.
- Entregas registram quantidades por linha, data e autor. Não excedem quantidade boa disponível nem a quantidade vendida. Parcialidade aparece separadamente do resumo da venda; recebimentos financeiros continuam independentes.
- Antes de consumo, cancelar ordem libera seu saldo de reserva; depois, preserva consumos e exige destinação explícita do produzido. Cancelar produção não cancela venda. Cancelamento comercial continua sujeito às proteções financeiras existentes e precisará considerar entregas efetivas.
- Correções por eventos compensatórios com motivo, referência e limites líquidos; material usado/perdido não volta ao estoque automaticamente. Propor correção administrativa para manter a governança U2.
- Para vendas antigas, não inventar ordens, quantidades entregues, tempo ou consumo histórico. Definir adesão explícita ao fluxo novo e indicação de histórico sem detalhamento. Preservar leitura e funcionamento do legado.
- Se produção para estoque for incluída, definir entrada de peças boas, reserva/saída para venda e rastreabilidade de custo provisório antes de fechar contratos. Não publicar disponibilidade comercial automaticamente nem introduzir estoque por cor/tamanho.

### Pontos de integração confirmados no código

- `SaleItem.lineKey` é identidade estável já usada por reserva; é nullable no esquema, portanto o tratamento de linhas legadas precisa ser explícito.
- `StockReservation` exige `saleId`; não suporta hoje reserva exclusiva para ordem sem venda. `StockItem` não tem vínculo a Product. Produção para estoque exige extensão, não apenas uma nova tela.
- `consumeStock` abre sua própria transação. O apontamento precisa extrair/reutilizar um helper com transação compartilhada, mantendo autorização, locks, liberação de reserva e valorização; evitar transações aninhadas independentes.
- Ordem de locks atual começa pela operação, passa por venda e itens ordenados; inserir locks de ordens antes dos itens e revisar todos os caminhos concorrentes, inclusive cancelamento da venda.
- `transitionSale` aceita sequência linear e bloqueia ENTREGUE com reservas abertas. U3 precisa projetar o resumo a partir da execução/entrega sem liberar ou consumir reservas silenciosamente e sem bloquear uma entrega parcial por material destinado ao restante.
- `cancelSale` verifica recebimentos, cancela obrigações e libera reservas na mesma transação. O novo módulo deve preservar esse contrato e impedir cancelamento que abandone entregas/ordens sem tratamento.
- Guias Next instalados consultados: route handlers e server/client components. Rotas privadas continuam com autorização no servidor e DTOs sem custos para operador.

## Aceite a detalhar

1. Venda de 10 peças dividida em ordens de 6 e 4: não permitir alocação concorrente de uma 11ª peça.
2. Primeira tentativa de 6 gera 5 boas e 1 falha; entrega de 3 deixa 2 boas disponíveis e 7 peças a entregar. Reimprimir a falha não duplica demanda ou cobrança.
3. Repetir ou concorrer o mesmo apontamento/entrega produz um único efeito; mesma chave com dados diferentes é conflito. Falha transacional não deixa consumo sem apontamento.
4. Estimativa e consumo real nunca são somados como duas baixas. Consumo U2 anterior à adoção não pode ser repetido ao vincular uma ordem.
5. Correção de produção já entregue exige resolver dependência; devolução de material não excede consumo líquido. Cancelamento não fabrica saldo físico nem apaga perda.
6. Valores negociados, snapshots, parcelas e pagamentos mantêm valores e identidades. OPERATOR não recebe custos nem no replay de comando.
7. Vendas históricas mantêm dados e não ganham fatos produtivos fictícios. Testar computador/celular, erros, rascunhos e conflitos.
8. Se estoque acabado entrar no escopo: concluir, reservar e entregar parcialmente sem entrada/saída duplicada; custo desconhecido permanece desconhecido e valor transferido não conta como novo consumo.

## Preparação do plano e implantação

Sequência proposta, ainda não plano executivo: contratos/migração → ordens/alocações → apontamentos integrados ao U2 → falhas/correções/cancelamentos → entregas/compatibilidade → consultas e interface → aceite e ensaio de migração. Incluir produto acabado somente após decisão de escopo. Arquivos e assinaturas finais serão definidos após fechamento da especificação.

Critérios de implantação: testes de domínio e integração com banco exclusivo `b2t_test` em localhost:55432; tipos/lint/build; migração ensaiada em restauração isolada, comparação dos registros legados; validação visual/permissões/concorrência; revisão; backup novo verificável e recuperação coordenada de banco/aplicação. Nunca rodar testes mutáveis em produção nem apagar `b2t-calculadora_postgres_data`.

Backup U2 de referência: `backups/stock-u2-20261007/final.dump`, SHA256 `6F65878D7A2B302B6D8ACBE6B9393E4D1D46595DBBC60BC2DFFA8485099E14AF`, runtime anterior em `previous-runtime.tar`/`b2t-before-stock:20261007`. São evidências registradas, não novo backup para implantação U3.

Próximo passo: fechar regras produtivas e revisar a proposta de especificação. Produção para venda e estoque está confirmada; não há aprovação atribuída à especificação completa, ao plano ou à implantação U3. As menções condicionais acima preservam o levantamento anterior à resposta do usuário.
