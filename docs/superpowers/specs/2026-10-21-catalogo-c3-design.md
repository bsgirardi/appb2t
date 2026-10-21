# C3 — Quantidades, kits e montador 2D

Data: 21/10/2026. Base funcional: C1 e C2 integrados em `d9497ad`, com C2 publicada localmente em 21/10. Estado: desenho em conversa aprovado; esta especificação escrita aguarda revisão do usuário. A aprovação anterior autoriza escrever este documento, sem iniciar implementação ou publicação.

## 1. Objetivo e decisões recebidas

Permitir que o visitante compreenda preços por quantidade, escolha componentes elegíveis de um kit, personalize cada linha e organize suas fotos em uma composição 2D. A seleção, a composição e as condições comerciais chegam ao atendimento existente de C2 e acompanham o orçamento, sem criar venda ou pagamento.

Decisões explícitas do usuário:

- Fora de kits, personalizações diferentes têm contagens independentes: cinco peças Ana e cinco Bia são dois lotes de cinco.
- Preço do kit é a soma dos componentes escolhidos, com desconto conforme a quantidade de itens no kit.
- Todas as unidades contam, inclusive componentes repetidos; não contar somente produtos diferentes.
- Desconto do kit não acumula com faixas individuais dos produtos.
- Cada faixa pode usar percentual ou valor fixo em reais. O valor fixo é abatido uma única vez do total do kit.
- Somente produtos permitidos pela equipe podem compor cada kit.
- A equipe cadastra as regras; o visitante escolhe peças/quantidades/personalizações e organiza fotos. Mover uma foto não muda a quantidade.
- Itens sob consulta deixam o total pendente. A composição e as regras aplicadas acompanham a solicitação e o orçamento de C2.

Os limites, cálculos e comportamentos detalhados abaixo são propostas desta especificação, sujeitas à sua revisão. Exemplos numéricos são testes ilustrativos, não descontos ou ofertas a publicar.

## 2. Escopo e abordagem

Evoluir a base atual: configurador, revisão da lista, recuperação de tentativa, recebimento idempotente e preparação atômica de um Quote. Criar cadastro próprio de kits que referencia produtos existentes; kit não é um segundo estoque nem um SKU que substitui seus componentes.

Alternativas consideradas:

| Abordagem                                                                  | Consequência                                                                  |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Kits como grupos de linhas existentes, com regras e composição versionadas | Recomendada: mantém quantidades e personalizações rastreáveis até o orçamento |
| Kit como uma única linha de produto e preço fechado                        | Oculta componentes e contradiz o preço pela soma escolhido pelo usuário       |
| Montador separado que apenas envia uma imagem ou mensagem                  | Fragmenta o recebimento de C2 e perde o cálculo estruturado                   |

C3 inclui faixas individuais, cadastro de kits, montador, resumo e integração completa até edição/emissão/impressão do orçamento. Pacote de unidades iguais pode ser representado por kit com um único produto elegível; não criar outro motor de preço. C3 não inclui kits de preço fechado, kits aninhados, 3D real, escala física, remoção automática de fundo, arquivos do visitante, aprovação de arte, checkout, frete calculado, cobrança ou reserva. Arte/anexos permanecem em C4; checkout em C5.

## 3. Faixas de quantidade fora de kits

A equipe pode cadastrar até dez faixas por produto, com quantidade mínima distinta e preço-base unitário positivo. Quantidades mínimas inteiras entre 1 e 99; vence a faixa de maior mínimo que não ultrapasse a quantidade da combinação. Sem faixa aplicável, usar o preço-base público existente.

Faixa troca o preço-base unitário; adicionais de personalização de C1 são somados depois, por unidade. Uma escolha sob consulta mantém o preço final sob consulta, mesmo havendo faixa. Não alterar o cálculo interno de custos nem substituir estimativas de rentabilidade por essa referência pública.

Combinação comercial usa produto, cor, tamanho, respostas normalizadas e revisão comercial; não inclui posição, foto ou identificador visual. Respostas diferentes, inclusive nomes diferentes, não compartilham a faixa. Linhas idênticas do mesmo contexto são somadas antes da avaliação, respeitando o limite por combinação. Não somar linha avulsa com linha de kit, nem linhas pertencentes a kits diferentes.

Exemplo ilustrativo: base R$ 20,00, faixa a partir de dez com base R$ 18,00 e adicional de nome R$ 2,00. Dez Ana usam R$ 20,00/unidade; cinco Ana mais cinco Bia usam R$ 22,00/unidade em cada lote. O resumo apresenta a faixa aplicada e os adicionais sem sugerir economia em relação a um preço anterior fictício.

## 4. Cadastro de kits e elegibilidade

Disponível a ADMIN e OPERATOR ativos, seguindo as permissões existentes de manutenção de produtos; configuração de aparência continua com sua permissão atual. Alterações exigem versão esperada, validam todos os dados no servidor e registram autor/data. Não sobrescrever edições concorrentes.

Cada kit possui identificador estável, nome até 160 caracteres, descrição até 2.000, publicação ativa/inativa, posição editorial, revisão comercial, lista de até 50 produtos permitidos e até dez faixas de desconto. Não criar avaliações, destaque de vendas ou descontos de exemplo em produção.

Uma faixa contém quantidade mínima inteira de 1 a 1.980 e exatamente um tipo: percentual com até duas casas, maior que zero e menor que 100%; ou valor fixo monetário positivo, com até duas casas. Mínimos repetidos, tipos misturados na mesma faixa e valores fora do limite monetário existente são rejeitados. Sem faixa aplicável, desconto zero. Não escolher a faixa pelo maior abatimento: vence o maior mínimo elegível.

Kit ativo exige nome e ao menos um produto permitido atualmente ativo e disponível. A vitrine oferece apenas produtos simultaneamente permitidos, ativos e não indisponíveis. Desativar kit/produto ou retirar permissão impede novas seleções; um rascunho anterior não é apagado e recebe indicação para revisão. Os snapshots já recebidos não mudam.

Alterar publicação, produtos permitidos ou regras comerciais incrementa a revisão do kit. Mudança de preço/configuração do produto continua incrementando sua revisão própria. Revisões visuais são separadas das comerciais: trocar foto ou posição editorial, isoladamente, não altera preço ou a faixa.

Uma foto de composição opcional referencia uma imagem existente do próprio produto, sem substituir sua galeria. A equipe pode escolher um ativo com fundo transparente quando já disponível. Sem ativo específico, usar a capa identificada como imagem ilustrativa. Não exigir processamento de imagem nem introduzir novo upload nesse ciclo.

## 5. Preço do kit

Cada montagem possui um identificador de instância: duas montagens do mesmo kit são grupos separados. Não existe multiplicador implícito de kit; as quantidades são sempre as unidades de seus componentes. Cada linha pertence a um kit ou é avulsa, nunca a dois grupos ao mesmo tempo.

Para um kit com todas as linhas de referência:

1. Calcular cada preço unitário pela base pública e adicionais configurados de C1, **ignorando faixas individuais**.
2. Somar as quantidades das linhas do kit para obter `Q`, incluindo repetições e personalizações diferentes.
3. Somar os subtotais das linhas para obter `S`.
4. Escolher a faixa de maior mínimo menor ou igual a `Q`.
5. Percentual: `D = arredondar(S × percentual / 100, 2)`. Valor fixo: `D = valor cadastrado`, uma vez por instância. Sem faixa: `D = 0`.
6. Referência líquida do kit: `S − D`. Frete não entra na base do desconto.

Usar Decimal e arredondamento HALF_UP. Validar valores intermediários e finais contra o limite monetário existente. Se `D >= S`, bloquear a referência/continuação com erro explícito para revisão; não limitar silenciosamente o desconto, trocar de faixa ou produzir total zero/negativo. O mesmo vale ao reduzir quantidades. O cadastro pode conter um desconto fixo que só seja válido para determinadas composições; o montador sinaliza as composições inválidas antes de enviar.

Exemplo ilustrativo: dois componentes a R$ 30,00 e três a R$ 20,00 têm `Q=5` e `S=R$ 120,00`. Uma faixa de 10% resulta em R$ 108,00; uma faixa fixa de R$ 15,00 resulta em R$ 105,00. As duas faixas não são aplicadas juntas.

Se qualquer linha estiver sob consulta, `S` completo, `D` aplicado e líquido do grupo são nulos. Mostrar quantidade, soma dos componentes com referência e regra elegível, com indicação de que o abatimento e o total dependem da definição dos valores. Não aplicar desconto a um subtotal parcial nem usar zero para representar consulta. A seleção válida sob consulta pode ser recebida em C2.

Em uma lista com vários kits e itens avulsos, apresentar cada grupo separadamente. Soma de valores conhecidos não é total fechado quando houver pendência. Desconto de um kit não incide sobre outro grupo ou sobre itens avulsos.

## 6. Limites e identidade da seleção

Manter até 20 linhas comerciais no total da lista e até 99 unidades por combinação/contexto. Isso permite até 1.980 unidades totais; as faixas individuais continuam limitadas a 99 e as faixas do kit a 1.980. Não elevar silenciosamente os limites de C1/C2 para atender grandes lotes. Até 20 instâncias de kit, todas não vazias, cabem no limite global de linhas. Não aceitar estruturas aninhadas.

A identidade da linha incorpora contexto avulso ou identificador da instância do kit. Assim, o mesmo produto/configuração pode existir avulso e em dois kits com cálculos independentes. Dentro da mesma instância, adicionar configuração idêntica soma quantidades; Ana e Bia continuam distintas. Trocar uma linha entre contextos exige ação explícita e nova conferência de preço. IDs são únicos e estáveis, inclusive em recuperação legada; não gerar IDs que colidam com os já fornecidos.

## 7. Experiência do montador

Entrada pela área de conjuntos da vitrine e links de kits publicados. Preservar busca/retorno de catálogo e a lista já existente. A página explica quais peças estão incluídas por escolha; elementos de cenário ou embalagem não viram componentes faturáveis por aparecerem na foto.

Desktop: produtos elegíveis à esquerda, composição ao centro e resumo à direita. Celular: seleção, composição e resumo em painéis acessíveis, sem comprimir três colunas. Manter Poppins, tokens da vitrine e identidade B2T; cadastro interno segue o padrão administrativo.

Cada linha comercial tem uma representação fotográfica com nome e quantidade. Uma linha com 50 unidades exibe uma foto e indicador de 50, sem criar 50 imagens ou cobrar por nós visuais. Selecionar a representação permite editar a linha pelo configurador existente. Fotos não simulam automaticamente o nome digitado, material, encaixe ou dimensão real.

Operações: adicionar/remover linha, editar opções/personalização, alterar quantidade, mover a foto, trazer à frente/enviar para trás, zoom e reenquadrar. Arraste possui alternativas por botões e teclado, com foco visível e anúncio da ação. Posição limitada à área útil, coordenadas normalizadas e ordenação finita; rejeitar NaN, infinitos, IDs órfãos ou repetidos. Uma composição salva associa exatamente uma posição a cada linha do kit.

Posição é preferência visual, sem escala garantida. Zoom e tamanho de tela não mudam quantidade ou dimensão contratada. Oferecer desfazer/refazer para as últimas 50 alterações locais da montagem; uma edição comercial desfeita volta a exigir revisão atual do servidor. Zoom/pan são preferências de visualização, não alterações comerciais.

Salvar o rascunho local com versão de formato, seleção e composição; recuperar após recarga. Estado de desfazer/refazer pode reiniciar após recarga. Dados de contato permanecem apenas na recuperação de tentativa de C2, não no armazenamento persistente da montagem. Em armazenamento indisponível, avisar e manter alternativa em memória. Formato inválido não é substituído silenciosamente; oferecer recuperação/descartes explícitos. Não sobrescrever uma montagem editada em outra aba sem sinalizar conflito e oferecer escolha da versão.

## 8. Revisão e recebimento C2

Ação do montador: **Revisar conjunto**; depois a lista existente permite **Enviar solicitação**. O servidor recalcula elegibilidade, faixas, adicionais e desconto com dados próprios. Nunca confiar em preço, percentual, valor de desconto ou rótulo enviado pelo navegador.

Revisão mostra base dos componentes, faixa aplicada, desconto, referência líquida ou pendências, condições e composição ilustrativa. Mudança comercial desde a referência vista exige confirmação específica antes de nova tentativa. Linha removida/indisponível/não permitida impede envio até revisão; estado visual é preservado para correção. Mudança somente de foto não exige reconfirmar preço.

Proposta de contrato versionado da seleção: linhas comerciais, grupos de kit, referências vistas e composição normalizada. Snapshots recebidos guardam linhas, quantidades, revisões de produto/kit, tabela completa de faixas do kit recebida, regra escolhida, valores calculados ou nulos, rótulos e posições. Guardar referência/versionamento das imagens, não bytes ou data URLs na submissão. Histórico deve ter alternativa textual se a imagem atual for removida.

Manter chave de tentativa de C2 e recibo público atual sem contato/linhas. O hash de conteúdo inclui grupos, associação das linhas e posições normalizadas recebidas, além do contato e seleção; não inclui zoom/pan, rótulos derivados ou parâmetros de navegação. Reenviar a mesma tentativa preserva seu payload e retorna o mesmo recibo, mesmo após alterar kit/produto. Movimentar uma foto durante tentativa pendente não modifica a tentativa já preservada nem autoriza substituí-la silenciosamente.

Confirmar recebimento não limpa a lista automaticamente. Limpeza explícita compara contexto, seleção e composição enviados: linhas ou grupos movidos, alterados ou acrescentados em outra aba não são apagados. Sem recuperação local confiável, manter os mesmos avisos de C2.

## 9. Atendimento e orçamento

Área interna apresenta **recebido** separado de **catálogo atual**, com composição ilustrativa, resumo textual completo, tabela/regra recebida e condições. Contato/cliente continuam passando pela revisão explícita de C2; novo recebimento não cadastra Customer. Preço sob consulta exige resolução positiva pela equipe.

Ao preparar, preços unitários e quantidades são revisados. Linhas avulsas partem da referência individual recebida. Componentes de kits partem das bases/adicionais recebidos, sem faixas individuais. O servidor calcula o desconto de cada kit usando as quantidades e preços revisados e sua tabela recebida congelada; destaca quando a faixa ou valor difere da referência original. Aplicar condições atuais do catálogo em lugar das recebidas exige revisão explícita, não atualização silenciosa do histórico.

O documento mantém componentes em linhas distintas. A sugestão inicial de `Quote.discount` é a soma dos descontos de kits resolvidos; não embutir o mesmo abatimento nos preços unitários. Se houver desconto comercial adicional negociado, a equipe informa separadamente durante a preparação e vê o desconto global resultante. Rejeitar desconto global igual ou superior ao subtotal. Frete é somado depois, conforme o fluxo existente.

Preservar metadados opcionais versionados no documento: grupos originais, associação das linhas, regras recebidas, composição e cálculo realizado na preparação. Não copiar o grupo inteiro em cada linha; associar por identificadores estáveis. Esses metadados são derivados pelo servidor durante a preparação; editores genéricos não podem forjar grupos/origens ou substituir o histórico recebido. Origem recebida e cálculo da preparação são históricos imutáveis; o preço e desconto atuais do documento são negociados pela equipe.

Em edição posterior de Quote, não reaplicar faixas do catálogo atual. A interface identifica o cálculo histórico e o desconto comercial atual. Alterar preço, quantidade, composição comercial das linhas ou desconto exige confirmação explícita de que a equipe revisou o desconto resultante antes de salvar/emitir; registrar essa revisão, invalidando a confirmação se houver outra alteração. Duplicar, reordenar ou excluir linhas não transfere a origem para outra linha nem aplica descontos históricos uma segunda vez. Novas linhas não entram automaticamente em um kit recebido.

Manter uma única transação para Quote + vínculo + estado/evento de C2. Repetição ou concorrência retorna o orçamento já vinculado, sem duplicata. Snapshots de emissão congelam composição, origens, cálculo de preparação e valores negociados. Impressão mostra componentes/quantidades, desconto global uma vez e resumo legível de agrupamento; composição pode aparecer como ilustração, nunca como arte aprovada ou escala física.

Conversão existente em venda preserva os metadados opcionais e os valores comerciais congelados, sem reaplicar o desconto de kit. Não introduzir automação de estoque/produção ou novos passos financeiros neste ciclo. Exercitar os caminhos compartilhados de edição/conversão para que schemas estritos não descartem nem rejeitem registros com a nova origem.

## 10. Persistência, fronteiras e compatibilidade

Migração aditiva para definição de kit, produtos permitidos e referências/snapshots de grupo na solicitação. Faixas individuais são configuração comercial opcional do produto. Formatos novos são explicitamente versionados; leitores continuam aceitando seleções/snapshots C1/C2 e orçamentos legados sem grupos. Não reinterpretar rascunho antigo como kit nem reconstruir descontos históricos inexistentes.

Produtos sem faixas mantêm preço atual. Solicitação antiga conserva todas as linhas e seu único vínculo; snapshot C2 v1 permanece legível. Antes de gravar, os leitores normalizam para os contratos de domínio; invariantes comerciais não dependem da posição de uma linha no array.

Manter limite público de 256 KiB em streaming, esquema estrito, validação de origem, respostas no-store e cotas de C2. Seleção acima do limite deve ser orientada para redução, preservando o rascunho; não truncar texto/composição. Edição autenticada de orçamento continua com corpo limitado a 16 MiB e até 100 linhas. Validar também o tamanho dos snapshots produzidos pelo servidor e seu roundtrip no editor.

Revisão e recebimento leem produto, kit e permissão sob uma estratégia transacional consistente, sem adquirir outra conexão do mesmo pool dentro da transação. Plano técnico deve fixar uma ordem única de locks compatível com a manutenção administrativa e testar concorrência com pool de uma conexão. Recibo confirmado precede cotas/revalidação; rejeição comercial conserva o débito de tentativa conforme a regra de C2.

Rotas de manutenção/atendimento exigem sessão e permissões; cookie de cota não autentica. Nunca revelar contatos ou composição de solicitação por protocolo. Lista/montador/revisão de seleção pessoal ficam fora do sitemap e com noindex; páginas editoriais de kits publicados podem ser indexáveis, mas preço sob consulta não gera preço numérico fictício em dados estruturados. Não registrar contatos, textos de personalização ou chaves em logs.

## 11. Acessibilidade e qualidade visual

Conferir 320/390/1440 px, claro/escuro e preferência de movimento reduzido no navegador integrado. Alvos de pelo menos 44 px em ambas as densidades. Sem overflow horizontal, truncamento de regra/preço importante ou ação coberta por barra fixa. Erros associados ao campo e foco no primeiro erro; resultado de adicionar/mover/remover/desfazer anunciado sem depender de cor.

Montador acessível por teclado e por lista textual equivalente. Cada imagem tem identificação e ação de edição; composição não é o único modo de entender o pedido. Sem animação automática, download de imagens arbitrárias ou geração de miniaturas durante arraste. Reutilizar fotos e carregar somente ativos necessários, mantendo a interação responsiva no limite de 20 linhas.

## 12. Critérios de aceite

1. Cinco Ana e cinco Bia avulsas são avaliadas separadamente; linhas realmente idênticas do mesmo contexto são somadas corretamente.
2. Faixa individual troca apenas a base e soma adicionais depois; consulta continua nula.
3. Kit usa somente produtos permitidos e disponíveis; contador considera todas as unidades de todas as suas linhas.
4. Faixa elegível é determinística nos limites exatos; percentual e valor fixo nunca se acumulam, e valor fixo é abatido uma vez por instância.
5. Kit não usa faixas individuais; grupos e itens avulsos não compartilham contagem ou desconto.
6. Decimal/arredondamento e limites monetários corretos; desconto inválido não vira valor zero, negativo ou corte silencioso.
7. Com consulta, mostrar valores conhecidos e pendência, sem desconto parcial aplicado ou total fechado fictício.
8. Mover/reenquadrar/alterar zoom não muda a quantidade, preço ou faixa. Vinte linhas são representadas sem multiplicar imagens pelas unidades.
9. Teclado/botões substituem arraste; desfazer/refazer e recarga preservam dados conforme a política descrita.
10. Erro de armazenamento, formato antigo/inválido e conflito entre abas não apagam silenciosamente a montagem.
11. Mudança de regra/elegibilidade exige nova revisão; retry confirmado anterior devolve o mesmo recibo e snapshot.
12. Outra aba altera linha ou posição durante envio: limpeza explícita preserva o trabalho novo; tentativa pendente mantém seu conteúdo original.
13. Atendimento resolve consulta e revê cliente sem vínculo automático; snapshot recebido não muda com o catálogo atual.
14. Preparação aplica cada desconto de kit uma vez no desconto global, preserva componentes e deixa cálculo histórico consultável.
15. Edição/reordenação/duplicação/exclusão/emissão preservam origens, exigem revisão de desconto quando pertinente e não duplicam benefícios.
16. Preparadores concorrentes geram um único Quote; falha posterior à inserção reverte todas as partes do vínculo.
17. Impressão/conversão existentes preservam valores e metadados opcionais; documentos legados continuam válidos.
18. Migração ensaiada sobre backup restaurado preserva dados históricos. Testes mutáveis e contas fictícias somente em bancos descartáveis.
19. Fluxo visual completo no navegador integrado, nas larguras/temas definidos, com captura e inspeção de imagens. Distinguir ensaio manual de falhas induzidas por testes.

## 13. Próxima etapa e limites da aprovação

Revisar esta especificação escrita antes de preparar o plano executável, com contratos, arquivos, locks, migração, testes, ordem de entregas e método de execução. Implementação aguarda aprovação do documento e do plano conforme o fluxo escolhido. Integração e publicação têm autorização própria; a instalação C2 permanece preservada durante o desenho.

Auto-revisão: decisões explícitas separadas dos detalhes propostos; cálculo individual e de kit sem acumulação; consulta e valores negativos tratados; identidade incorpora contexto; recuperação e retry incluem composição; desconto global não duplica abatimento; formatos legados e fluxo de conversão contemplados. Nenhum código de produto, dependência, schema ou dado operacional foi alterado nesta etapa.
