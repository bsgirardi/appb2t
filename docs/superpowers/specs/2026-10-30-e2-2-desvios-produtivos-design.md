# E2.2 — detalhamento do custo produtivo

Data: 30/10/2026. Desenho aprovado pelo usuário em 30/10/2026; implementação e validação local concluídas em 04/11/2026, conforme [relatório](../reviews/2026-11-04-e2-2-desvios-produtivos.md). Revisão independente anterior à aprovação sem lacunas materiais. Base remota conferida: main `ce38daa`, versão 1.14.0. Isolamento: branch `codex/e2-2-desvios-produtivos`. Ordem E1–E6 mantida; E2.3 e E2.4 ficam fora deste incremento.

## Intenção e limites

Explicar a variação produtiva da E2.1 por material, trabalho, energia, manutenção, extras e provisão prevista para falhas, com origem verificável e parcela não reconciliada explícita. A explicação não constitui diagnóstico causal. Preservar receita, contribuição, depreciação, resultado e caixa nos indicadores existentes.

Não alterar motores de preço/produção/rentabilidade, rateios, documentos, memórias, revisões ou apurações anteriores. Sem schema ou migração prevista. Sem rankings, recorrência, revisão automática da ficha, reimpressão vinculada ou medição nova de falhas.

## Fontes verificadas

| Fonte | Disponível hoje | Limite |
| --- | --- | --- |
| `pricing/types.ts`, `pricing/calculate.ts` | Resultado congelado V2: material, energia, manutenção, trabalho, extras e provisão de falhas; depreciação separada | A provisão incide sobre material + energia + manutenção; não mede falha efetiva nem inclui trabalho |
| `profitability/sources.ts` | Vínculo comercial congelado, fingerprint e quantidade compatíveis; total previsto sem encargo fixo comercial | A projeção atual ExpectedCost descarta os componentes previstos; precisa receber campos opcionais da mesma memória |
| `production/cost-sources.ts`, `production/costs.ts` | Consumos valorizados por movimentação vinculada; tempos e tarifas congeladas nos eventos; componentes por linha produtiva | Custos dos eventos mistos não são separados entre unidades boas e falhas |
| `production/cost-allocation.ts` | Partilha existente entre origens e entregas, com normalização de precisão | Mostrar como custo atribuído por rateio, sem afirmar medição exclusiva da peça vendida |
| `profitability/sources.ts` | DELIVERED; LOSS de linha vinculada encerrada sem boas; reservas separadas | LOSS já integra o custo; valor inclui depreciação e não deve virar efeito adicional |
| `consignment/costs.ts` | Componentes de origens produtivas e fontes CONSIGNMENT_SOLD | Perda em custódia é evento distinto; não confundir com falha produtiva |
| `profitability/origin-values.ts` | Abertura com valor total e partilha | Não há composição: não reconstruir material/trabalho nem considerar ausência como zero |
| `profitability/calculate.ts` | Complementos administrativos por linha; conferências de extras/revisão/entrega | U3_SOURCE e NOT_OCCURRED são confirmações, não novos débitos |
| `profitability/assessments.ts` | JSON imutável de entrada/resultado; engineVersion u4-v1 | Apurações antigas não contêm novos campos; não enriquecer com fontes atuais |

Código relevante da pasta operacional e da main comparado: sem diferença nesses módulos. Lidos proposta/plano/relatório E2.1, relatório E1.2, AGENTS, PENDENCIAS, roadmap e auditoria locais. E1.2 reutiliza PricingSnapshot; não exige refazer E1. A publicação atual não foi consultada: 1.12.0 é apenas a última publicação confirmada no encaminhamento.

## Abordagem proposta

Uma extensão de leitura do detalhe atual é a opção compatível com o recorte: campos opcionais da memória congelada e projeção pura de reconciliação. Recalcular pela ficha atual rompe a comparação histórica; criar uma coluna de falhas por diferença fabrica causalidade. Reconstrução causal por evento exigiria novas regras de medição e pertence a outro incremento.

Abordagem aprovada: apresentar componentes no detalhe de cada linha; o resumo da venda mantém a ponte agregada E2.1. Sem novos controles de edição. Reutilizar componentes shadcn instalados e padrões de tabela/detalhamento do projeto; conferir desktop e 375 px.

## Contrato e identidade verificável

Acrescentar componentes previstos opcionais a ExpectedCost, extraídos exclusivamente do resultado congelado validado já usado. Nenhum lookup da ficha atual. Dados ausentes/invalidáveis tornam apenas a abertura dependente indisponível; o total histórico existente permanece autoritativo.

Para material, trabalho, energia e manutenção: efeito na contribuição = previsto − realizado atribuído. Extras previstos são comparados aos complementos administrativos atribuídos; extras confirmados em U3 permanecem nos seus componentes produtivos e não são debitados outra vez. Rotular essa comparação como diferença entre classificação prevista e atribuição realizada, sem prometer correspondência individual de extra com material/trabalho.

A provisão prevista para falhas é apresentada separadamente como parcela do orçamento produtivo. No realizado, a parcela adicional nessa linha de reconciliação é zero **porque o custo já está nos componentes**, não porque não houve falha. O custo causal de falhas efetivas permanece indisponível quando não medido separadamente. A provisão liberada na identidade é uma convenção de decomposição contábil, nunca uma economia comprovada por ausência de falhas.

Identidade: variação produtiva agregada E2.1 = soma dos efeitos por componente + parcela não reconciliada. Calcular resíduo por diferença decimal contra os totais autoritativos, sem distribuí-lo para forçar correspondência. Resíduo não zero aparece com origem/limite, nunca como falha; resíduo de precisão não ganha causa econômica.

Uma abertura só fica reconciliada quando componentes exigidos e totais são completos, igualdade exata confere e parcela não reconciliada é zero. A ponte agregada E2.1 pode estar reconciliada mesmo se a abertura não estiver. Cobertura incompleta/provisória não fornece efeito definitivo: conservar valores conhecidos e motivos. Na ausência de componentes previstos, mostrar total e abertura indisponível, sem subtrair somas parciais como se fossem completas.

## Origem e falhas

Mostrar identificador da memória/linha, fontes de entrega e complementos com seus identificadores já disponíveis. Os componentes realizados atuais são agregados: listar fontes que compõem o agregado, sem afirmar valor individual por componente de cada fonte.

LOSS recebe seção informativa “já incluído”: fonte, valor total e aviso de que inclui depreciação. Não somar LOSS de novo, nem deduzir seu componente por proporção inventada. Falhas incorporadas às boas recebem explicação do limite de medição; não usar quantidade de falhas para repartir custo de evento misto. Neste incremento não ampliar contrato para expor causas/quantidades por evento, nem prometer separação causal que o motor não produz.

Reservas, movimentações, perdas e complementos não constituem linhas adicionais de custo na ponte. Depreciação permanece fora da contribuição; recebimentos permanecem no caixa. Origem de abertura sem composição e mistura de origens não permitem abertura completa. Consignação mantém fontes e comissão próprias, sem tratar perdas em custódia como falhas fabris.

Campos novos alteram o fingerprint atual de fontes e podem exigir nova conferência humana de extras. Não atualizar sourceHash das revisões antigas, não migrar confirmações automaticamente nem editar apurações. Apurações novas podem guardar campos opcionais; o motor monetário e engineVersion permanecem u4-v1 se nenhuma regra monetária mudar. Incluir compatibilidade de JSON antigo nas regressões.

## Critérios de aceite

1. Previsto: material 50, energia 5, manutenção 5, trabalho 20, extras 10, provisão 6 = 96. Realizado: material 60, energia 6, manutenção 6, trabalho 24, complementos 10 = 106, depreciação 4 à parte. Efeitos: −10, −1, −1, −4, 0, +6; total −10, igual à E2.1; resultado após depreciação não interfere nessa identidade. +6 não comprova ausência de falhas.
2. Linha LOSS com total 30 já nos componentes, inclusive depreciação: exibi-la como informação; contribuição e efeitos não se alteram ao abrir a seção. Falha em evento com boas não gera parcela adicional.
3. Extra confirmado U3_SOURCE mantém custo na origem; NOT_OCCURRED não debita; COMPLEMENT já incluído entra uma vez. Múltiplas confirmações não multiplicam valores.
4. Snapshot antigo sem componentes, abertura sem composição, fontes mistas, memória ausente, entrega incompleta, conferência vencida e provisório mantêm motivos; zero declarado continua diferente de desconhecido.
5. Componente inesperado, soma divergente e precisão de seis casas deixam parcela não reconciliada explícita. Nenhum fechamento baseado em arredondamento visual de centavos; números negativos e receita zero não provocam divisão inválida.
6. Comparar DTO recebido antes/depois: projeção não muta fonte ou histórico. Apuração antiga renderiza sem campos opcionais e sem consulta de enriquecimento atual.
7. Consignação produtiva e abertura, múltiplas linhas/entregas e rateios preservam totais. Comissões/frete não migram para custo produtivo. Regressões E2.1 permanecem válidas.
8. Testes focados de domínio/interface e leitura de fontes, tipos, lint e build em isolamento. Como a leitura de fontes muda, validar também integração em banco sintético descartável exclusivo, com proteção explícita de URL e sem aproveitar setup que trunque bancos compartilhados. Não presumir bloqueios antigos do Vitest.

## Entrega e próximos passos

Após aprovação deste desenho: elaborar plano executável, fixar configuração exclusiva dos testes e implementar em isolamento. Antes do código, reler os guias Next locais pertinentes e aplicar a skill shadcn do projeto na interface. Revisão independente e verificação final antes da entrega.

No registro inicial deste desenho houve somente inspeção e documentação. A execução posterior aprovada está registrada no relatório, com testes e build, sem PR, push, merge, publicação ou migração operacional. Versão permanece 1.14.0. Futura PR exige autorização própria, incremento único sobre main vigente, manifestos/notas em português sincronizados e conferência de APP_VERSION nos rodapés e Atualizações. E2.3/E2.4 e homologação humana continuam pendentes.
