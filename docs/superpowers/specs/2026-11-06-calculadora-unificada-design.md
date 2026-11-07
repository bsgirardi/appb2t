# Calculadora unificada — proposta para revisão

Data: 06/11/2026. Base conferida: origin/main `16a6466`, versão 1.22.0. Branch isolada: `codex/calculadora-unificada`. Situação inicial: inventário e desenho. Execução posterior autorizada com “Continue”; implementação e limites em ../../calculadora-unificada/ENTREGA.md. A autorização inclui desenhar e implementar, sem push, PR, merge, publicação ou migração operacional.

## Intenção e direção já definida

Preservar a aparência e a organização da calculadora original, reunindo os recursos reais de V2/V3 em uma experiência principal. Simplificar reduz escolhas de interface e redigitação, não capacidades. Precificar e revisar um produto devem terminar num rascunho consciente, sem duplicar cadastro, mudar preço automaticamente ou alterar documentos emitidos.

## Inventário verificado no código

| Superfície | Capacidade e comportamento atual | Decisão proposta |
| --- | --- | --- |
| Original (`calculator-form`, `cost-breakdown`) | FDM em g, resina em ml; um material e uma máquina; horas/minutos; consumo do trabalho completo; resultado automático; atualização explícita de parâmetros; composição em duas colunas, título, seleção de tecnologia, seções numeradas e preço destacado | Preservar essa linguagem visual; manter o motor original acessível em seção secundária identificada, sem conversão implícita |
| V2 (`batch-pricing-form`, `use-pricing-draft`) | Quantidade; até 20 materiais com consumo/peça e perda fixa/lote; tempo fixo e incremental por peça; trabalho de preparação e acabamento; até 30 complementos por peça/lote; canal, taxas e custo comercial fixo; markup, margem alvo ou preço informado; referências versionadas e comparação de atualização | Compartilhar estado e operações existentes; nenhuma reimplementação das fórmulas |
| V3 (`guided-pricing-form`) | Usa o mesmo hook/motor V2; tempo em horas/minutos; essenciais primeiro; custos adicionais expansíveis; resultado lateral e aplicação; comparações de quantidade/canais/descontos | Base técnica da composição principal; retirar nomes de versão da navegação principal |
| Comparadores E1.1/E1.2 | Quantidades; canais e descontos com preço por canal ou comum; cobertura versus meta; biblioteca e memória imutável; reutilização com parâmetros atuais e desconto sem reaplicação | Manter componentes e serviços; comparar dentro do fluxo, biblioteca como ação secundária |
| Produto (`product-form`, `product-pricing-editor`) | Recebe snapshot ao criar produto; ficha por lote ou cálculo legado; edição do cadastro existente preserva identidade; preço final separado, botão explícito para usar sugestão; proteção de saída pelo estado serializado | Abrir a composição unificada dentro do produto; comparação antes/depois e bloqueio de aplicação até revisão; levar estado interno da revisão à proteção de saída |
| Orçamentos/vendas (`line-pricing-editor`, `line-pricing-controls`, formulários comerciais) | Ficha por item, quantidade fixada pelo documento, confirmação de correspondência; anexação da memória separada do preço comercial; bindings e fingerprints detectam desatualização | Reutilizar formulário comum com quantidade bloqueada; preservar confirmação, bindings e documentos emitidos |
| Biblioteca (`comparison-detail`, `comparison-reuse`) | Leitura histórica e reutilização explícita, hoje encaminhando para produto novo | Preservar reprodução; usar o formulário comum na reutilização. A revisão de produto existente entra pelo cadastro existente, nunca pelo atalho de criação |

## Diferenças matemáticas que a interface deve respeitar

O original calcula manutenção em percentual de material + energia, acabamento percentual e fixação; a provisão de falhas inclui a depreciação na base. V2 calcula manutenção por hora, trabalho por tempo, complementos e despesas do canal; sua reserva usa material + energia + manutenção. V2 ajusta taxas sobre receita e tem arredondamento comercial unitário. Ambos usam Decimal com precisão 40, ROUND_HALF_UP. Sua equivalência não pode ser presumida.

Históricos originais continuam no motor original. Ao preparar nova ficha por lote para um produto legado, copiar apenas consumo, tempo e referências identificáveis; explicar o que não se converte, mostrar ambos os resultados e exigir a revisão das bases. Não inventar equivalência entre fixação antiga e complemento novo. Se referência estiver inativa/alterada, mostrar a ausência e exigir substituição, preservando o rascunho.

## Abordagens consideradas

1. **Recomendada: composição original com estado e motor V2 existentes.** Reaproveitar a V3 e seus controles, compondo os cartões e o resumo segundo a original; usar a mesma composição nos editores embutidos. Concentra o fluxo, mantém cálculos e evita redigitação. Exige cuidado nos rascunhos internos e diferenças de bases.
2. Ampliar o formulário original com outro estado de cálculo: conservaria seu JSX, mas duplicaria lógica de referências, comparações, validação e aplicação, com maior risco de divergência. Não recomendada.
3. Manter as três abas com nomes melhores: menor alteração, mas perpetua a escolha que o usuário já decidiu remover. Descartada pela direção expressa.

A escolha visual original já está definida pelo usuário. A recomendação técnica não reabre essa escolha.

## Proposta visual e fluxo principal

- Cabeçalho da original: “Calculadora de impressão 3D”, orientação breve e atualização de parâmetros; sem abas Original/V2/V3.
- Esquerda: cartão “01 Dados da impressão”, escolha visual Filamento/Resina, quantidade, material, impressora, consumo e horas/minutos. “Adicionar material” fica junto do material, sem abrir outro fluxo.
- Cartão “02 Formação do preço”: canal, modalidade e seu único campo relevante. A meta da equipe permanece somente leitura conforme permissões atuais.
- “Trabalho, perdas e complementos” recolhido, com resumo dos valores efetivamente usados e abertura automática em erros. Dados preenchidos não são escondidos sem indicação.
- “Parâmetros aplicados” recolhido, atualização com conferência antes/depois e opção de manter referências anteriores. Atualizar referência não salva produto nem muda preço comercial.
- Direita: custo completo por peça e preço sugerido/oferta distinguido conforme modo; contribuição e resultado após depreciação do lote; detalhes/memória expansíveis; avisos de cobertura e arredondamento. Não chamar esses indicadores de lucro líquido ou caixa.
- Comparações: quantidade e canais/descontos acessíveis abaixo do resumo. Usar oferta muda só o rascunho e identifica preço informado; salvar comparação usa biblioteca existente. Voltar da biblioteca deve preservar contexto quando houver rascunho.
- Ação “Aplicar ao produto”: cria memória pelo serviço/idempotência existentes. Produto novo vai ao formulário existente com snapshot. Produto em edição recebe a memória no mesmo cadastro e mantém o preço final. Não criar produto adicional.
- “Cálculo original e memórias” como acesso secundário explícito. Manter montado quando aberto para preservar a simulação ao alternar; escolher esse recurso não transfere números automaticamente para o motor por lote.
- Celular: cartões em uma coluna, resultado após os essenciais; ações com tamanho adequado, rótulos e unidades sempre visíveis. Nenhum resumo fixo sobrepondo campos.

## Única lacuna de entrada proposta para decisão

A original recebe consumo total do trabalho; V2/V3 recebem consumo por peça. Propõe-se entrada inicial **total do lote**, alinhada ao fatiador, e opção explícita **por peça**. Essa é uma proposta, não uma decisão já confirmada. Pergunta enviada ao usuário em 06/11.

Se total for adotado: guardar o texto total no rascunho de interface; adaptar com Decimal para o consumo/peça que o contrato atual exige. Nunca arredondar a dois decimais nem usar Number na conversão. Mostrar a quantidade e a base ao lado de cada consumo. Alterar quantidade mantendo total preserva o total e recalcula a distribuição; trocar base preserva o consumo equivalente e explicita a operação. Comparar quantidades deve usar consumo equivalente por peça e perda fixa, informando que o tempo fixo não escala automaticamente. Fichas antigas abrem na base por peça que foi persistida, sem conversão no carregamento. Cobrir divisões não terminantes por 3/7 e limites do contrato; se houver diferença além da precisão suportada, apresentar a base por peça existente em vez de persistir aproximação silenciosa. Não alterar schema ou motor para viabilizar apenas uma conveniência visual.

Se por peça for escolhida: manter o contrato atual, rotular explicitamente e exibir o total calculado junto; tempo total do lote continua independente do consumo. A camada de adaptação de total não é necessária nesse caso.

## Revisão de produto e limites comerciais

1. Abrir “Revisar custo” no produto existente; manter produto, preço final e memória atual visíveis. Nenhum cadastro duplicado.
2. Carregar catálogo atual sem sobrescrever a memória; apresentar diferenças das referências que a ficha usa, incluindo indisponíveis.
3. Após conferência explícita, abrir rascunho preenchido com os dados produtivos preservados. Comparar custo e sugestão anteriores e novos, com quantidade e bases. Origem legada recebe o aviso de mudança de modelo e confirmação específicos.
4. “Aplicar ficha revisada” cria snapshot e atualiza apenas o estado de custo do formulário do produto. A memória anterior continua no histórico; salvar produto é ação posterior.
5. Preço final fica como estava. “Usar preço sugerido” preenche o campo comercial por decisão explícita. Mostrar diferença antes de salvar. Não modificar tabelas de quantidade, políticas comerciais ou preços de documentos anteriores.
6. Cancelar revisão restaura a ficha anterior; erro de API preserva a revisão e permite repetir com a mesma chave para o mesmo conteúdo. Guardar dirty state do editor antes de existir snapshot aplicado; navegação, Voltar/Avançar, troca de modo e cancelamento não podem descartar silenciosamente.

Não prometer rascunho persistente após fechar o navegador: a proteção atual é de saída. Persistência nova só se for necessária e desenhada separadamente.

## Critérios verificáveis para implementação

- Paridade dos resultados com calculate/calculateV2 existentes, sem mudar fórmula: FDM/resina, 1 e vários materiais, frações e arredondamentos, tempos totais/incrementais, perda fixa, trabalho, extras por peça/lote, taxas e três modalidades. Reusar fixtures sintéticas do projeto e incluir divisões não terminantes se houver entrada total.
- Alternar recursos mantém rascunhos. Entrada inválida não deixa preço anterior apresentado como vigente. Erros avançados abrem seção correspondente e recebem foco acessível.
- Comparadores E1.1/E1.2 mantêm valores, cobertura versus meta e aplicação única do desconto; quantidade fixada em documentos continua bloqueada, sem atalho de usar outra quantidade.
- Revisão de produto com referências iguais, alteradas, inativas e faltantes; antes/depois histórico versus rascunho; identidade preservada; preço final inalterado ao atualizar referência/aplicar custo; confirmação explícita para legado.
- Produto novo e existente chegam ao formulário correto; falha/repetição não duplica memória; cancelar revisão e sair com mudanças acionam proteção; edições de nome, fotos e informações comerciais não são perdidas.
- Memórias históricas e documentos emitidos preservados; não recalcular registros em leitura ou introduzir backfill/migração.
- ADMIN/OPERATOR mantêm acessos atuais no servidor. UI sintética não prova autorização: executar testes de autorização existentes apropriados e registrar o limite.
- Tipagem, lint, testes focados e build; inspeção real da prévia sintética desktop/celular, claro/escuro, teclado e erros. Banco somente se indispensável, instância sintética exclusiva descartável; nunca operacional.

## Fora do recorte e evolução

PDV presencial é próxima frente separada. E2.4 está em outro chat. Impostos brasileiros por enquadramento/regime/operação são direção futura, sem tabelas ou regras fiscais inferidas agora; preservar taxas como parâmetros identificados sem renomeá-las para tributo fiscal. MakerWorld, G-code/3MF e integrações novas não incluídos. Não copiar modelos de custo de referências externas.

## Coordenação e entrega

Revisão visual paralela lida sem enviar mensagens: chat `01a1b225-0dec-7a82-b0a6-2ac71cf533ff` entregou ajustes locais em `codex/admin-espacamento`, versão preparada 1.22.1; sem merge/publicação segundo seu relato. Evitar admin.css, design.css, shell e primitivas compartilhadas nesse recorte; reconciliar alterações pontuais em product-form antes da integração. Não copiar sua versão ou presumir deploy.

Permissões efetivas desta sessão: filesystem unrestricted/danger-full-access e aprovação never. Foram usadas leitura, fetch e escrita somente na worktree isolada; nenhum modo de permissão foi alterado pela criação do chat.

Versão permanece 1.22.0 na fase de desenho, sem PR entregue. Futura PR funcional: incremento MINOR único comparado à main daquele momento, manifestos/APP_VERSION/notas portuguesas sincronizados, sem tags. Não publicar sem instrução específica. Fontes operacionais locais modificadas e não rastreadas foram lidas/preservadas, sem stash ou reset.
