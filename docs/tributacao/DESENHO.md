# Tributação gerencial — desenho para aprovação

Data: 07/11/2026. Base: main `2351b6f`, 1.26.0. Desenho aprovado pelo usuário em 07/11/2026; implementação local descrita em [ENTREGA.md](ENTREGA.md). As seções de aprovação pendente abaixo preservam o texto apresentado antes do aceite.

## Decisão recebida

O usuário escolheu manter nas configurações da empresa duas opções simples: MEI e Simples Nacional com alíquota informada. O DAS do MEI deve aparecer como custo fixo mensal em “Preço e margem”, sem percentual fictício por venda. O CNPJ e a inscrição estadual foram fornecidos para pesquisa, sem autorização para emissão fiscal, declarações ou pagamento.

Isso seleciona a abordagem A da investigação: parâmetros gerenciais informados e versionados. A alternativa B, calcular automaticamente faixas e segregações do Simples, não faz parte desta entrega.

## Evidência cadastral e o que ela não responde

Consulta pública oficial da Receita realizada em 07/11/2026, às 11:58:55 conforme horário exibido pela página: optante pelo Simples Nacional e enquadrado no SIMEI desde 29/09/2026; não optante pelo regime regular de IBS nem de CBS na situação atual. [Resultado oficial](https://consopt.www8.receita.fazenda.gov.br/consultaoptantes/Home/ConsultarCnpj?vc=69376810000143).

Fontes cadastrais secundárias apontam São José do Rio Preto/SP, natureza de empresário individual, atividade principal de reparação de computadores/periféricos (95.11-8-00) e atividades secundárias de fabricação de artefatos plásticos (22.29-3-99), comércio de objetos de arte (47.89-0-03) e suvenires/bijuterias/artesanato (47.89-0-01). [Casa dos Dados](https://casadosdados.com.br/solucao/cnpj/69376810-bruno-de-souza-girardi-69376810000143), atualização declarada em 29/09/2026. São indícios cadastrais, não confirmação da operação efetivamente praticada ou classificação de cada venda. Endereço residencial, telefone e demais informações pessoais não serão copiados ao repositório.

CADESP: página pública acessível no navegador, mas a consulta individual exige CAPTCHA; não realizado. IE fornecida pelo usuário permanece informação declarada, não validação da situação estadual. Não é necessário resolver o CAPTCHA para implementar configuração manual. Cadastro do CNPJ não informa NCM, CFOP, CST/CSOSN, benefícios, retenções ou incidência de cada operação. CNAEs não serão usados para atribuir essas regras automaticamente.

## Experiência proposta

Em Configurações, um cartão “Preço e margem” reúne a configuração tributária sem esconder o formulário normal de custos nem renomear toda a calculadora.

| Campo | Comportamento |
| --- | --- |
| Regime para estimativa | MEI (SIMEI) ou Simples Nacional; também estado inicial “Não configurado”, sem simular isenção |
| Competência inicial/final | Mês/ano; fim obrigatório, evitando levar parâmetros de 2026 a 2027 silenciosamente |
| MEI: DAS mensal | Valor editável em reais, sem percentual de venda; sem valor financeiro predefinido pela migração |
| Simples: alíquota efetiva estimada | Percentual digitado pelo ADMIN; placeholder 4,00%, sem salvar 4% como padrão |
| Origem e conferência | Referência textual curta (ex.: orientação do contador e competência), data da conferência e situação “informado”/“conferido”; não exigir upload |
| Observação | Explica base, limite da estimativa e preservação dos cálculos anteriores |

Texto do Simples: “Informe a alíquota efetiva usada na sua estimativa, conferida no PGDAS-D ou com o contador. O total do DAS sozinho não determina essa alíquota.” Texto do MEI: “O DAS é fixo por mês. Informe o valor da competência; ele compõe a previsão de custos fixos mensais e não uma taxa por venda.”

Para 2026, exibir ajuda com fonte: INSS ordinário R$ 81,05, acrescido de ICMS R$ 1 e/ou ISS R$ 5 quando devidos. Não marcar incidências automaticamente nem preencher R$ 70. O valor de referência não inclui encargos por atraso. [Portal do Simples, valores 2026](https://www8.receita.fazenda.gov.br/simplesnacional/Noticias/NoticiaCompleta.aspx?id=c3b2044c-ff97-432a-b33c-ecf2a3df6dc3). Demais fundamentos e fronteiras temporais em [INVESTIGACAO.md](INVESTIGACAO.md).

A escolha atual confirmada no cadastro é MEI; mostrar essa informação como ajuda, sem hardcode do cadastro da B2T ou importação automática no banco. ADMIN confirma os parâmetros aplicáveis. Não exigir preenchimento fiscal em cada cálculo. OPERATOR só lê o efeito e o resumo comercial autorizado.

## Política de cálculo proposta

MEI: nenhuma dedução percentual por venda a título do DAS. A contribuição do lote continua antes dos custos fixos do mês. Mostrar aviso junto ao resultado e o DAS no resumo mensal ADMIN. Não ratear o DAS entre peças nesta etapa: isso precisaria de denominador planejado e produziria um custo gerencial diferente do tributo mensal.

Simples: estimativa manual `receita de produtos × alíquota efetiva informada / 100`, separada de taxas comerciais. Na simulação, a base é o preço final do lote. Em documentos, é o total de produtos após desconto alocado por linha; descontos/frete e situações especiais exigem conferência do contador. Frete cobrado diferente de zero ou operação com exceções fiscais fica com cobertura fiscal parcial, sem total apresentado como estimativa completa. Não inferir dedução fiscal de frete nem que o parâmetro informado cobre exceções. Serviços/receitas com tratamento diferente exigem outro recorte, não são automaticamente cobertos pela alíquota única.

Nos modos de formação do preço, somar a alíquota estimada às taxas percentuais somente no denominador pertinente, mantendo componentes separados no resultado. Rejeitar soma de taxa comercial, imposto e margem que torne o denominador não positivo. No modo preço informado, manter a decisão comercial e exibir o efeito estimado. Não somar o imposto a custo produtivo, comissão, depreciação ou retirada do proprietário. Contribuição e resultado após depreciação permanecem indicadores gerenciais; o DAS fixo não será abatido de cada venda.

Precisão: Decimal de precisão 40 e HALF_UP nos novos cálculos; intermediários sem arredondamento prematuro. Oferta comercial por unidade em centavos como hoje; imposto gerencial por linha arredondado em centavos, total igual à soma das linhas. Alocação de desconto reutiliza o motor existente com desempate estável. Essa política não declara ser o arredondamento do PGDAS-D. Memória inclui base, intermediário e valor final.

Exemplo sintético para verificar somente a integração matemática: receita R$ 100, custo variável R$ 60, depreciação R$ 10 e taxa comercial R$ 5. Com taxa fiscal informada de 4%, imposto gerencial R$ 4, contribuição R$ 31 e resultado após depreciação R$ 21. Os 4% não são alíquota atribuída à B2T. Com MEI sem outra incidência modelada, contribuição R$ 35, resultado após depreciação R$ 25; DAS mensal aparece separado. Ausência de outra incidência modelada não equivale a certificação de isenção.

## Vigência e preservação

Perfil com registro controlador para concorrência otimista e revisões append-only: número, regime, início/fim por competência, valores decimais, operação gerencial coberta, fonte, estado de conferência, autor e instante. Revisões não são editadas nem apagadas. Alteração/substituição exige motivo, versão esperada e referência substituída. Nenhuma mudança silenciosa por nome de taxa ou label.

Para novas consultas, selecionar a revisão mais recente não substituída que cubra a competência. Intervalos ativos sobrepostos são rejeitados. Substituição remove a referência anterior apenas da seleção futura, sem apagar seu conteúdo. Encerramento/troca de regime que corte intervalo cria substituições explícitas em transação. Mudança retroativa não recalcula snapshots, relatórios salvos, orçamentos ou vendas existentes.

Novos snapshots copiam revisão, parâmetros, fonte/consulta, vigência, base, status e versão do algoritmo. Dados antigos sem bloco fiscal são “memória anterior sem tributação identificada”; não preencher imposto zero nem recalcular pelo perfil atual. Manter interpretador do algoritmo V2 para snapshots legados e introduzir versão discriminada para o novo cálculo; não alterar a interpretação de entradas antigas pela simples edição de calculateV2.

Comparar preço praticado usa premissas congeladas da linha. Trocar referências cria nova estimativa e revisão explícita dos vínculos. Orçamento→venda copia a memória existente; não resolve o perfil fiscal atual na conversão. Documento comercial emitido e PDF não ganham dados fiscais privados ou alteração de valores por atualização do perfil. Não fazer backfill dos documentos antigos.

Taxas por canal têm rótulo livre e podem conter imposto cadastrado informalmente. Ativação exige declaração ADMIN de conferência dessas taxas; se houver parcela tributária, deve ser removida/revisada explicitamente para novos cálculos antes de aplicar o perfil, preservando memórias antigas. Não identificar ou remover automaticamente por palavra “imposto”.

## Financeiro e rentabilidade

No financeiro ADMIN, bloco separado “Tributos — previsão gerencial”, consultado por competência. Para MEI, um único custo fixo por competência, inclusive mês inicial sem proporcionalizar o DAS por dias. Meses sem perfil válido ficam indisponíveis. Para Simples, consolidar apenas vendas confirmadas com memórias fiscais vinculadas e base disponível; informar contagem/valor das vendas sem cobertura, inclusive legadas e frete fora do recorte. Total de registros B2T não será chamado de receita fiscal total da empresa.

O consolidado usa premissas congeladas das vendas. Cancelamento exclui a venda da visão corrente sem apagar o snapshot; indicar que é visão corrente. Para preservar a decisão consultada, “Salvar memória do resumo” guarda filtro, fontes/versões, coberturas e resultado imutável; reabrir memória salva não consulta perfil nem estado atual das vendas. Mudança de perfil pode alterar uma nova consulta do custo fixo mensal, mas nunca a memória já salva. Um perfil único percentual não representa apuração por caixa, RBT12 ou segregação oficial.

Não criar guia, título, baixa, provisão contábil oficial ou pagamento automaticamente. Para registrar valor realmente apurado, usar o fluxo manual de títulos e pagamentos existente. Nesta etapa não haverá reconciliação automática entre previsão e títulos; por isso apresentar os dois blocos separados, sem somá-los em um “total de despesas” novo ou abater a previsão do saldo bancário. Os totais existentes de caixa/a pagar continuam baseados em suas fontes atuais.

Rentabilidade por linha acrescenta componente fiscal estimado separado, com cobertura herdada da memória. Valor estimado continua estimado mesmo com custos produtivos realizados completos. Preservar indicadores originais para histórico sem bloco fiscal e exibir novos totais após tributos somente com cobertura suficiente. Não substituir um parâmetro por total do DAS ou por pagamento financeiro. Caixa não é regime fiscal de caixa.

## Permissões, escopo e validação

### Decisões técnicas explicitadas após revisão independente

1. **Operação coberta:** perfil tem declaração ADMIN obrigatória de que o parâmetro foi conferido para venda de produtos sem exceções identificadas. Sem essa declaração o perfil fica incompleto. Simulação guarda marcador “Venda de produtos” ou “Serviço/outra operação”; o primeiro é pré-selecionado e visível, com opção de mudar nos detalhes. Não classificar por descrição/CNAE. Linha de serviço/outra operação não recebe a alíquota única nem zero como se houvesse isenção. A declaração é gerencial e não prova incidência fiscal; a orientação ao ADMIN exige revisar o parâmetro se houver operação diferente. Campo manual de descrição de operação coberta limita a declaração sem criar sistema de códigos fiscais.
2. **Competência:** simulação tem competência de referência explícita, inicialmente mês atual de São Paulo; snapshot e orçamento conservam essa competência. Venda registra mês da confirmação, derivado do instante capturado na confirmação no novo bloco fiscal, e a competência da premissa de cada linha. Conversão de orçamento não altera a premissa. Se o mês confirmado não está dentro da vigência da premissa congelada, conservar a estimativa comercial original, mas marcar sem cobertura fiscal completa no mês da venda, com ação de revisão explícita. Não resolver perfil atual silenciosamente. Relatório usa mês de confirmação, não recebimento, vencimento ou criação do rascunho. Legado sem esse dado é exibido como sem cobertura identificável, sem inventar confirmação. O agrupamento é gerencial, não escolha oficial por competência/caixa.
3. **Cobertura parcial:** calcular e exibir parcela conhecida sobre produtos apenas quando suas premissas forem válidas, com rótulo “parcela estimada conhecida”, junto das causas e valores sem cobertura. Não exibir contribuição após tributos nem total fiscal completo quando houver parcela desconhecida. Resumo mensal soma parcelas conhecidas em subtotal explicitamente parcial e mostra contagens/base sem cobertura; não converte ausência em zero. A mesma política vale para frete, serviço, legado e vigência incompatível. Valores conhecidos não entram num total apresentado como integral.

Essas escolhas são propostas do autor, sujeitas à aprovação do desenho; não foram atribuídas ao usuário. A revisão independente apontou esses três pontos e eles foram resolvidos aqui sem aumentar a cobertura fiscal prometida.

Configurar perfil, consultar/guardar resumo mensal e acessar valor do DAS: ADMIN nas páginas, rotas e serviços. OPERATOR autenticado pode usar os efeitos comerciais autorizados na calculadora como hoje, sem obter perfil completo, fontes privadas, faturamento consolidado, RBT12 ou dados financeiros. Catálogo comercial recebe DTO mínimo (regime gerencial, taxa necessária, referência e vigência), não os metadados restritos. Não ampliar acesso existente à rentabilidade.

Primeira entrega não cobre: cálculo automático do Simples, todos os regimes nacionais, rateio de DAS por venda, tributação oficial de serviços, substituição tributária, monofásicos, retenções, benefícios, operações internacionais, apuração IBS/CBS regular, enquadramento automático ou transmissão fiscal. Sem perfil válido, manter cálculo comercial identificado como sem cobertura fiscal completa.

Verificar exemplos e limites numéricos, transição de competência, encerramento/substituição/concorrência, campo ausente e zero explícito, duplicidade de imposto em canal, fluxo preço→documento→venda, cópia de orçamento, preservação byte a byte dos snapshots/documentos sintéticos antigos, ADMIN/OPERATOR, migração aditiva e reaplicação em PostgreSQL descartável exclusivo. Conferir visual desktop/celular, teclado e temas; tipos/lint/build e regressões do domínio. Não usar banco ou credenciais operacionais, nem contornar bloqueio de servidor.

Implementação seguirá motores e componentes existentes, skill shadcn do projeto e guias Next locais. Divisão de arquivos, nomes internos e testes específicos ficam a cargo do implementador dentro destes contratos. Sem push/PR/merge/publicação/deploy nesta autorização. Na entrega preparar incremento MINOR único contra main vigente, manifestos e histórico sincronizados, APP_VERSION preservado e limites de validação explícitos.

## Aprovação pendente

As opções e o posicionamento do DAS foram pedidos pelo usuário; o tratamento de vigência, resumo mensal, base comercial limitada e ausência de rateio são propostas técnicas descritas acima. Aprovar este desenho autoriza implementá-las neste isolamento; não substitui validação contábil dos parâmetros que o administrador preencher.
