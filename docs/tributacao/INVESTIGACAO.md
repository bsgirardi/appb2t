# Tributação brasileira — investigação e proposta de primeiro recorte

Consulta: 07/11/2026, America/Sao_Paulo. Registro inicial da investigação; desenho posteriormente aprovado e implementação local em [ENTREGA.md](ENTREGA.md). O conteúdo abaixo preserva as descobertas e estados anteriores. Este registro não certifica apuração fiscal.

## Complemento após resposta do usuário — 07/11/2026

Usuário escolheu configuração manual MEI/Simples Nacional nas configurações da empresa e DAS fixo mensal em “Preço e margem”; informou identificação empresarial para pesquisa pública. Consulta oficial Receita no navegador confirmou SIMEI e Simples desde 29/09/2026 e ausência de opção pelo regime regular IBS/CBS na situação atual. CADESP individual pendente por CAPTCHA, sem tentativa de solução. Pesquisa cadastral secundária indicou São José do Rio Preto/SP e atividades de fabricação/comércio/reparação, sem provar operações praticadas. Não copiados endereço residencial ou contatos pessoais.

[Desenho concreto para aprovação](DESENHO.md), com fontes, premissas, base limitada da estimativa, vigência, custos mensais, permissões e histórico. Texto abaixo preserva o momento anterior à resposta; perguntas sobre regime configurável foram resolvidas pela preferência recebida, não devem ser repetidas. Ainda sem código funcional ou aprovação deste desenho.

## Base conferida e isolamento

- `origin/main`: `2351b6f4ad5f967f4bbb92b0cf22045adce30862`, versão 1.26.0. PRs #49/#50 integradas; consulta `gh pr list --state open` sem PR aberta nesta conferência.
- Chat de integração consultado por leitura: `01a1b5bc-c285-77c0-ab36-0bb54515ff8b`. Seu relato de pacote disponível não comprova implantação operacional.
- Worktree gerenciada exclusiva `C:/Users/Administrador/.codex/worktrees/34b6/appb2t`, branch `codex/tributacao-brasileira`. A pasta operacional e seus arquivos modificados/não rastreados foram preservados.
- Lidos AGENTS.md, PENDENCIAS.md e ROADMAP-SELLER.md, incluindo registros locais antigos e registros atuais da main. Nenhum acesso a banco operacional, documentos de clientes ou segredos. Não foi consultado cadastro real da empresa.
- Versão mantida em 1.26.0 nesta investigação. O incremento único e as notas de release serão preparados na entrega destinada à PR, comparados novamente com main; nenhuma PR autorizada neste pedido.

## O que o projeto informa hoje

O cadastro `CompanyAppearance` contém identidade comercial, contato, endereço livre e aparência. Não há campos estruturados de enquadramento, regime, CNAE, UF/município fiscal ou vigência. Não é possível deduzir o enquadramento real pelo código, pelo nome comercial ou pelo endereço livre. MEI/SIMEI, porte ME/EPP, natureza jurídica, atividade e regime precisam ser conceitos distintos. Não pedir CNPJ ou credenciais para preencher essa lacuna.

| Área | Evidência no código | Consequência para o recorte |
| --- | --- | --- |
| Motor legado | `src/domain/calculation/calculate.ts` | Custos e markup, sem tributo dedicado; preservar memórias legadas e seu significado |
| Precificação V2 | `src/domain/pricing/calculate.ts`, `types.ts`, `validation.ts` | Decimal com precisão 40 e HALF_UP; taxas percentuais de canal afetam denominador do preço e contribuição; preço ofertado arredondado por unidade |
| Referências | `src/domain/pricing/resolve.ts`, `src/server/pricing/resolve.ts` | Versões esperadas para configurações e catálogo; referência alterada gera conflito |
| Memórias | `src/server/pricing/estimates.ts`, modelo `PricingSnapshot` | Entradas e resultados persistidos; idempotência por ator/chave/hash; transação RepeatableRead |
| Documentos | `src/server/pricing/document-costs.ts` | Vínculos por linha, impressão digital, revisões, congelamento e cópia orçamento→venda; conservar esses contratos |
| Preço praticado | `src/domain/pricing/document-costs.ts` | Comparação recalcula o motor em INFORMED com a entrada salva; alteração futura do algoritmo exige versionamento explícito |
| Rentabilidade | `src/server/profitability/sources.ts`, `src/domain/profitability/calculate.ts` | Custo produtivo separado de taxa fixa do canal; taxas previstas recalculadas na receita negociada; não inserir imposto só no resultado da calculadora e esquecê-lo aqui |
| Financeiro | `src/server/finance/entries.ts`, `settlements.ts`, modelos `FinancialEntry`, `Settlement`, `CashMovement` | Título, baixa e movimento já distintos, com auditoria/idempotência; simulação não deve chamar esses comandos |
| Permissões | rotas `src/app/api/finance`, `src/server/profitability/authorization.ts` | Financeiro e rentabilidade ADMIN; catálogo/estimativa de preço autenticados; não expor faturamento acumulado ao OPERATOR ao ampliar o catálogo |
| Versão | `src/lib/version.ts`, login, shell e `/atualizacoes` | APP_VERSION vem do package.json; preservar fonte única |

Não foi encontrada implementação fiscal dedicada nas fontes examinadas. Como o nome das taxas por canal é livre, um administrador pode ter registrado imposto informalmente ali. A ausência de campo fiscal não prova ausência de tributo nos parâmetros reais. Antes de ativar qualquer perfil, conferir e substituir explicitamente eventual parcela já incorporada, mantendo a memória antiga intacta.

## Fontes oficiais e limites temporais

Todas as URLs abaixo foram consultadas em 07/11/2026. São fontes para delimitar o desenho, não regras já ativadas. Planalto bloqueou a leitura das LC 123/214; consultadas as publicações oficiais da Câmara como alternativa. A página da Resolução CGSN 140 retornou sem texto legível; seu consolidado ainda precisa de conferência antes de implementar regra automática.

1. [LC 123 consolidada — Câmara](https://www2.camara.leg.br/legin/fed/leicom/2006/leicomplementar-123-14-dezembro-2006-548099-normaatualizada-pl.pdf), art. 18-A: recolhimento SIMEI fixo mensal, independentemente da receita mensal. Para 2026, limite geral anual de R$ 81 mil; início de atividade proporcional a R$ 6.750 por mês. Exceções, elegibilidade e efeitos do excesso não foram implementados. Não automatizar enquadramento.
2. [Valores MEI 2026 — Portal do Simples](https://www8.receita.fazenda.gov.br/simplesnacional/Noticias/NoticiaCompleta.aspx?id=c3b2044c-ff97-432a-b33c-ecf2a3df6dc3): para competências de 2026, INSS ordinário R$ 81,05, mais R$ 1 de ICMS e/ou R$ 5 de ISS quando contribuinte. Transportador autônomo de cargas tem regra diferente. Não escolher incidência pela tecnologia de impressão nem transportar o valor para 2027.
3. [Perguntas e Respostas do Simples](https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/PerguntaoSN.pdf), atualização parcial 09/10/2026, item 5.3.1: até 2026, alíquota efetiva depende de RBT12, anexo, nominal e dedução; início de atividade exige regra própria. Receita auferida/recebida depende da opção de apuração. O próprio manual avisa atualização incompleta da reforma; não basta para implementar 2027.
4. [LC 214 consolidada — Câmara](https://www2.camara.leg.br/legin/fed/leicom/2025/leicomplementar-214-16-janeiro-2025-796905-normaatualizada-pl.html), arts. 343, 346 e 348: em 2026, alíquotas de teste IBS/CBS não se aplicam às operações dos optantes do Simples. Não adicionar 1% ao DAS. A transição de 2027 exige nova regra temporal, não prorrogação das condições de 2026.
5. [Receita — opções para 2027](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/setembro/simples-nacional-2027-entenda-os-novos-prazos-e-faca-sua-escolha-com-consciencia-e-tranquilidade/): opção pelo Simples e opção pelo regime regular IBS/CBS são decisões distintas. A situação efetiva da empresa para 2027 precisa ser informada; não inferir pela opção atual nem repetir prazos de notícias anteriores de agosto.
6. [LC 238/2026 — publicação original da Câmara](https://www2.camara.leg.br/legin/fed/leicom/2026/leicomplementar-238-21-outubro-2026-800071-publicacaooriginal-181678-pl.html), arts. 1–3 e 10: prevê limite transitório MEI R$ 110 mil para 2027 e R$ 140 mil a partir de 2028; ampliação condicionada à consideração da renúncia na LOA dos exercícios indicados. Não antecipar limites em 2026 nem ativar os futuros sem verificar condições e regulamentação. Remissão de débitos está fora do pedido e não autoriza cancelar títulos.

UF e município ainda não informados: não há conclusão sobre benefícios, ICMS fora do DAS, ISS, retenções ou operações interestaduais. Nenhum NCM, CFOP ou CST/CSOSN foi atribuído. Não há suporte prometido para todos os regimes.

## Alternativas reais apresentadas, ainda sem escolha

**A — Perfil vigente com parâmetros conferidos pelo contador (recomendada).** Atender apenas o regime e as operações reais da empresa. Parâmetros identificados como informados/estimados, com origem, base e vigência; revisão ADMIN; perfil copiado para a memória do cálculo. Menor custo e mais explicável, mas exige manutenção humana das premissas. A taxa informada não equivale a apuração oficial.

**B — Cálculo automático de alíquota efetiva no Simples.** Exige RBT12 completo inclusive receitas externas ao B2T, segregações, anexo validado, início de atividade, exceções e regras estaduais/municipais. Pode reduzir digitação, mas aumenta o recorte e exige fontes e dados ainda ausentes. Não assumir que vendas registradas no B2T representam a totalidade fiscal da empresa.

Recomendação técnica não é aprovação do usuário. O desenho definitivo será escrito após conhecer regime, operação e abordagem escolhida.

## Proposta concreta para conferir com o responsável

- Perfil fiscal com revisões imutáveis: regime efetivamente confirmado, situação de validação, início/fim de vigência, operação coberta, parâmetros decimais, origem, consulta e responsável pela validação. Mudança gera revisão; rejeitar conflito concorrente e intervalos ambíguos.
- Na calculadora, resumo simples de efeito e detalhes progressivos; reutilizar formulário atual. Sem perfil válido, distinguir “não configurado”, “fora da vigência” e “operação não coberta” de zero imposto. Cálculo comercial sem tributos pode continuar identificado como incompleto; não exibir resultado fiscal definitivo.
- SIMEI: obrigação fixa separada. Rateio gerencial opcional somente com base explícita aprovada (ex.: receita mensal planejada) e memória da hipótese. Sem base, não fabricar percentual por venda. Obrigação mensal e rateio não podem ser somados como duas despesas no consolidado.
- Se a empresa estiver fora do SIMEI: primeiro definir base e parâmetro aplicáveis ao caso, com validade por competência e operação. Taxa genérica sem condições não cobre Simples inteiro. Ausência de parâmetro não vira alíquota zero.
- Guardar snapshot completo da premissa, regra/versão do motor, resultado, base, arredondamento e fonte. Ler passado sem resolver perfil atual; “atualizar referências” cria revisão explícita. Orçamento emitido, venda confirmada e memória legada permanecem reproduzíveis.
- Tributo estimado em componente separado de comissão/cartão e custo produtivo. Exibir contribuição e resultado após depreciação com seu efeito, sem chamar isso de lucro líquido ou DRE. Rever desconto, frete e base da venda com o contador antes de definir fórmulas.
- No financeiro ADMIN, distinguir previsão gerencial, valor apurado externamente informado, título a pagar e pagamento. Primeira proposta: previsão consultiva e identificação dos títulos registrados pelo fluxo existente; nenhuma criação, baixa ou compensação automática. Vínculo eventual precisa ser explícito e idempotente, sem novo desconto no resultado da mesma provisão.
- OPERATOR recebe somente premissas comerciais autorizadas e efeito do cálculo; cadastro fiscal completo, RBT12, documentos e consolidado continuam restritos. Não colocar informação fiscal privada no documento comercial público por conveniência de persistência.
- Produto/PDV/orçamento mantêm decisão humana do preço; não publicar ou alterar preço do catálogo automaticamente.

## Informações solicitadas, sem resposta nesta investigação

Regime/enquadramento real e desde quando; fabricação própria/revenda/serviço; UF/município; parâmetros já confirmados pelo contador. Pode constar “a confirmar”. Para período de 2027, verificar a opção IBS/CBS efetiva se relevante. Não solicitar credenciais, documentos pessoais ou dados de clientes.

Depois dessas respostas: fechar operação/competência cobertas, validar com o contador incidência/base e dados de referência, apresentar desenho concreto para aprovação e só então planejar/implementar. A aprovação do objetivo geral não confirma essas escolhas fiscais novas.

## Critérios preparados para a futura implementação

1. Exemplos numéricos reproduzíveis do regime efetivo, com base, competência, fonte e parâmetros aprovados; nenhuma alíquota fictícia usada como padrão.
2. Fronteiras de vigência, parâmetros ausentes, operação não coberta, mudança de perfil, concorrência e revisão explícita.
3. Reproduzir snapshots antigos, orçamento→venda, preço informado, descontos, frete, comparadores de canais/lotes e correções comerciais sem recalcular passado silenciosamente.
4. Precisão decimal e regra de arredondamento definida por camada; unitário×quantidade e rateios reconciliados. Denominador inválido e taxa+meta incompatíveis devem gerar indisponibilidade explicada.
5. Taxa antiga eventualmente incluindo imposto: substituição explícita; obrigação fixa/rateio e provisão/título/pagamento sem dupla contagem. Calcular preço não cria registros financeiros.
6. ADMIN/OPERATOR em rotas e serviços; migração aditiva/reaplicação e preservação sintética em PostgreSQL exclusivo caso haja migração.
7. Tipos/lint/build e regressões pertinentes; visual desktop/celular, teclado e temas usando shadcn do projeto. Ler guias Next locais antes de código. Sem contornar bloqueios de execução de servidor.

Verificação deste estágio: leitura estática, consulta Git/GitHub e fontes oficiais; sem dependências instaladas na worktree, testes funcionais, HTTP, banco ou migração. Não houve alteração de produto, versão, push, PR, merge, distribuição ou implantação.
