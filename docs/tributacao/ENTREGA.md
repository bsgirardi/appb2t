# Tributação gerencial — entrega local 1.27.0

**Atualização de 07/11/2026:** usuário autorizou criar PR e fazer merge com main. Candidata permanece 1.27.0 sobre main 1.26.0 reconferida; suíte fiscal incluída na matriz CI com banco exclusivo. Depois dos checks, a rotina de distribuição será executada pelo SHA integrado; PR, merge e Release efetivos serão registrados no resumo da PR e em `.b2t/`. Implantação não autorizada. O texto abaixo preserva o estado da entrega local anterior a esse pedido.

07/11/2026, America/Sao_Paulo. Desenho aprovado pelo usuário neste chat. Branch `codex/tributacao-brasileira`, worktree gerenciada `34b6/appb2t`, base main `2351b6f4ad5f967f4bbb92b0cf22045adce30862` / 1.26.0. Implementação local para revisão; sem push, PR, merge, distribuição ou implantação operacional.

## Entregue

- Configurações → **Preço e margem**: MEI/SIMEI com DAS mensal editável ou Simples com alíquota efetiva informada, sem default de 4%. Competência inicial/final obrigatórias, origem, data, situação de conferência, operação coberta e motivo. Mostra perfil vigente e histórico; substituição explícita, sem apagar revisões.
- Ativação exige declaração ADMIN de cobertura de produtos e conferência/remoção de eventual imposto duplicado nas taxas dos canais. Não identifica imposto pelo rótulo da taxa nem modifica canal automaticamente.
- Calculadora preserva o formulário adotado na unificação. Competência e operação ficam nos detalhes; tributo aparece separado das taxas comerciais, com efeito no preço, contribuição e resultado após depreciação. Serviço/outra operação, perfil ausente e vigência incompatível não são tratados como isenção.
- Comparadores de quantidade/canais/descontos e vínculos comerciais usam o mesmo cálculo; taxa+tributo ≥100% não produz preço negativo de cobertura. O comparador confere também o tributo arredondado em centavos ao apresentar preços de cobertura/meta.
- DAS do MEI não é rateado por peça nem abatido das vendas: fica separado como previsão de custo fixo mensal. A ajuda oficial de 2026 não determina incidências nem preenche o valor da empresa.
- **Financeiro → Previsão tributária**: competência, DAS mensal, parcela conhecida sobre vendas, base descoberta, motivos e referências por linha. Não soma previsão com título/pagamento nem modifica caixa. Memórias salvas guardam fontes e resultado; concorrência entre consulta e salvamento é detectada por impressão digital das fontes.
- Rentabilidade detalhada acrescenta efeito tributário estimado separado dos indicadores operacionais existentes. Custos realizados completos não transformam o tributo informado em apuração fiscal realizada. Sem cobertura integral, resultado após tributos fica indisponível.

## Contratos preservados

`tax.algorithm=1` identifica explicitamente o algoritmo novo. Sem bloco fiscal, o dispatcher usa V2 original; `src/domain/pricing/calculate.ts` não foi alterado. Dados produtivos, arredondamentos e resultados das memórias legadas não recebem backfill.

Premissa comercial copiada no snapshot contém referência/revisão, regime, taxa aplicável, operação, competência e vigência. Fonte, valor mensal e metadados privados são copiados separadamente em `PricingSnapshot.taxEvidence`, fora do DTO comercial. Perfil substituído continua disponível para reproduzir referência histórica. Atualizar parâmetros exige revisão explícita. O estado fiscal real não é inferido pelo nome da empresa ou pelo CNPJ.

Confirmação de venda direta/PDV/checkout, conversão de orçamento e confirmação de consignação gravam `Sale.taxConfirmedAt` nas vendas novas. Orçamento convertido conserva a premissa original; fora da vigência na competência da venda, o resumo fica parcial em vez de resolver outro perfil silenciosamente. A competência do relatório é confirmação comercial, não apuração oficial por caixa/competência.

Vendas antigas sem data fiscal identificada são contadas separadamente, sem atribuição fictícia de mês. Cancelamento exclui venda da consulta corrente, mantendo snapshots e memórias salvas intactos. A receita registrada no B2T não é assumida como total fiscal da empresa.

Perfis, origem, DAS e resumos financeiros/salvos são ADMIN nas páginas, rotas e serviços. OPERATOR mantém os efeitos comerciais autorizados e não recebe valor mensal, fontes privadas ou faturamento consolidado. O impresso comercial e os documentos emitidos não recebem metadados fiscais privados.

## Evidência de validação

- **20 testes unitários fiscais** passaram na revisão independente final antes do último teste de arredondamento; após essa correção, o revisor executou **18 testes** de cálculo fiscal e comparação, sem nova regressão material.
- Suíte fiscal real em PostgreSQL descartável exclusivo: **7 testes aprovados**, incluindo concorrência de perfil, sobreposição, ADMIN/OPERATOR, catálogo mínimo, metadados privados, idempotência, congelamento, cancelamento, consignação, mudança entre competências e orçamento→venda.
- Regressões de serviços: **19 testes aprovados** de estimativas, vínculos comerciais, títulos, baixas e consultas de rentabilidade, executados no mesmo banco exclusivo com guarda explícita.
- Migração real da base anterior e reaplicação: documentos e JSONs legados preservados, novas colunas nulas, sem perfil ou obrigação fabricados. Ensaio em outro banco sintético exclusivo da tarefa.
- HTTP real em servidor Next isolado: login sintético, endpoints ADMIN/OPERATOR (401/403/200), DTO mínimo, competência inválida (422) e proteção de origem (403). Não foi confundido com teste de serviço.
- Navegador: Configurações, alteração MEI→Simples em base sintética, aviso de revisão salva, histórico antigo preservado, cálculo com 4% sintético, financeiro e memória salva. Desktop e 390×844, claro/escuro, seletor por teclado e detalhes expansíveis. Largura móvel conferida: viewport 390, documento 375, sem transbordamento horizontal no resumo examinado.
- Evidências locais sintéticas, não versionadas: `.b2t/tax/`, incluindo logs e capturas `calculator-desktop-light.png`, `settings-mobile-light.png` e `mobile-light.png`. Não contêm dados operacionais; o 4% e o DAS de prévia não são configuração real da B2T.
- Suíte unitária completa: **985 testes em 231 arquivos aprovados**; conferência direcionada posterior: **21 testes fiscais em quatro arquivos aprovados**. Uma melhoria final de acessibilidade dos erros acrescentou mais um teste; os **seis testes de UI fiscal** passaram depois dela, incluindo abertura automática dos detalhes e identificação do campo inválido sem perder o rascunho.
- Tipagem, lint sem avisos e build de produção aprovados; build inclui as novas rotas de previsão/perfis/memórias. `git diff --check` aprovado. Manifestos e referências APP_VERSION conferidos.

Revisão independente identificou dois P2: competência ausente em consignação e preço de cobertura negativo quando taxas+tributo ultrapassavam 100%. Ambos reproduzidos em testes vermelhos, corrigidos e verificados novamente. A conferência visual revelou um alerta sem perfil antes de preencher os dados produtivos; corrigido para consultar o catálogo independentemente desses campos, com teste vermelho→verde. O caso de custo fracionário/tributo arredondado também foi reproduzido e corrigido. Não há achado material conhecido pendente da revisão realizada.

## Migração e reprodução

Migração aditiva: `20261107140000_tax_profiles`. Cria controlador/revisões fiscais e memórias de resumo; acrescenta `taxEvidence` em PricingSnapshot e `taxConfirmedAt` em Sale. Restrições de revisão positiva, substituição com FK/unique e estado único. Não reclassifica empresas, não recalcula preços e não altera saldos.

Testes destrutivos de limpeza têm guarda obrigatória: `TAX_DISPOSABLE_DATABASE=1`, URL local explícita com usuário `tax_test` e banco `b2t_tax_test`; não aceitam banco operacional. Para migração, criar **outro banco vazio** `b2t_tax_migration` no PostgreSQL descartável exclusivo e fornecer `TAX_MIGRATION_DATABASE_URL`. `npm run test:tax` executa os fluxos e `npm run test:tax:migration` ensaia atualização/reaplicação. O script HTTP exige servidor sintético em 127.0.0.1:3037 e usuários da prévia criados no banco descartável; não apontar para a operação.

O servidor isolado desta tarefa iniciou e permitiu HTTP/visual. Isso não modifica nem invalida os registros históricos de outras tarefas que tiveram início de servidor rejeitado. Nenhum bloqueio foi contornado.

Após a inspeção, o navegador e o servidor de prévia foram encerrados. O tamanho do navegador foi restaurado. PostgreSQL descartável e seu volume anônimo foram removidos após conferir identificação e rótulo exclusivos; logs e evidências sintéticas ficam na worktree.

## Limites fiscais e estado de entrega

Parâmetros são informados pelo ADMIN; não há cálculo automático de RBT12, faixas, anexo, enquadramento, exceções, retenções ou IBS/CBS regular. Serviços e operações especiais não são cobertos pela alíquota única. Frete cobrado gera cobertura parcial, sem inferir dedução fiscal. Valor do DAS, taxa efetiva, base e operação continuam sujeitos à conferência do responsável/contador. Sem suporte nacional completo, NF-e/NFC-e/NFS-e, declarações, guias, SEFAZ ou pagamentos.

Fontes oficiais, consulta de 07/11/2026, transição e cadastro público estão em [INVESTIGACAO.md](INVESTIGACAO.md) e [DESENHO.md](DESENHO.md). Nenhum cadastro fiscal operacional foi preenchido nesta entrega.

Versão candidata **1.27.0**, incremento MINOR único sobre main 1.26.0 reconferida. Package/lock raiz/lock package raiz coincidem; APP_VERSION continua nos dois rodapés e em Atualizações. Notas portuguesas adicionadas sem substituir o histórico. Sem tag no repositório. Recomparar main antes de futura PR/integração autorizada.
