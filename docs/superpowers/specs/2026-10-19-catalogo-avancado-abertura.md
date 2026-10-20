# Evolução do catálogo B2T com experiência visual avançada

Data: 19/10/2026.

Status: direção e proposta desta abertura aprovadas pelo usuário em 19/10/2026, com pedido de iniciar a implantação em novo chat/contexto. Inclui visual avançado junto dos fluxos, montador 2D e checkout por último. Esta aprovação se refere ao documento de abertura; a especificação detalhada de cada ciclo e o plano técnico ainda serão elaborados.

## 1. Objetivo e decisões recebidas

Evoluir o catálogo da própria B2T para que o visitante encontre uma peça, entenda o que recebe, configure sua personalização e monte uma seleção com informações suficientes para o atendimento preparar o orçamento. A apresentação visual avançada integra cada entrega, incluindo a montagem de conjuntos.

Decisões explícitas do usuário:

- Iniciar o planejamento da aplicação à B2T.
- Fazer o visual avançado em conjunto com as melhorias funcionais.
- Elaborar o checkout por último.
- Montador de conjuntos em composição visual 2D com fotos, arraste, quantidades e resumo de preço, conforme resposta do usuário em 19/10/2026.

Interpretação inicial: melhorar a descoberta, a apresentação do produto e a montagem de conjuntos, aproveitando o catálogo e a gestão existentes. A modalidade 2D está decidida; os comportamentos detalhados a seguir continuam propostos para revisão.

Sucesso esperado: o cliente consegue entender e configurar a oferta sem depender de várias mensagens para esclarecer medidas, quantidade, nome, arte ou composição. A equipe recebe a intenção completa, revisa preço e viabilidade e a transforma nos documentos comerciais existentes.

## 2. Base atual a preservar

O código atual já oferece coleções, campanhas, busca, ordenação e paginação; retorno ao resultado com contexto; galeria; descrição curta e especificações; disponibilidade e prazo produtivo; cores e tamanhos; relacionados; lista de orçamento e contato por WhatsApp/e-mail.

A gestão já possui precificação avançada, orçamento e conversão em venda, estoque, produção, rentabilidade e planejamento. O catálogo deve se integrar a esses registros, sem duplicar clientes, produtos, vendas ou cobranças.

Limites encontrados:

- Item da lista contém produto, cor, tamanho e quantidade, sem personalização própria por linha.
- Lista permite até 20 combinações e até 99 unidades por combinação. Oferta pública de lotes maiores exige revisão desse contrato e dos fluxos associados.
- Revisar a lista e preparar mensagem não registra uma solicitação recebida pela B2T.
- O preço público atual não representa automaticamente todas as combinações de personalização ou faixas de quantidade.
- Documento comercial recebe descrição, quantidade e preço por linha; a configuração aprovada precisa ser preservada de maneira explícita ao integrar novas opções.

Base visual: identidade B2T, Poppins na vitrine, componentes locais e adaptação Nova existente. Paleta editável da loja e identidade administrativa permanecem independentes.

## 3. Alternativas de abordagem

| Abordagem | Vantagem | Custo ou limite | Avaliação |
|---|---|---|---|
| Evolução integrada da base atual | Aproveita catálogo, documentos e gestão; permite entregar experiência completa por fluxo | Exige definir contratos de opção, preço e solicitação antes de implementar | Recomendada |
| Reconstrução completa da vitrine | Maior liberdade de organização | Amplia regressões e repete capacidades já disponíveis | Sem justificativa atual |
| Acrescentar recursos independentes | Entregas pequenas isoladas | Pode fragmentar identidade, repetir formulário e criar divergência de valor | Útil apenas para ajustes pontuais |

Proposta: evolução integrada, com direção visual comum desde a primeira entrega. O montador avançado entra no ciclo de conjuntos, sem adiar toda a qualidade visual para uma reforma posterior.

## 4. Direção visual proposta

### Identidade e linguagem

Preservar logo, assinatura e identidade B2T. Tom próximo, criativo e claro; campanhas podem ter personalidade sem reproduzir personagens ou humor dos benchmarks. Mascote aparece pontualmente, com prioridade para fotos reais dos produtos.

Paleta de referência da marca: azul `#0066CC`, laranja `#FF7A00`, verde `#4CAF33`, azul-escuro `#0D2B52`, cinza `#E9EDF2` e fundo `#F8FAFC`. Esses valores orientam a composição; a implementação deve respeitar os tokens e a configuração de aparência existentes. Poppins conserva sua função no catálogo.

### Composição

Home com campanha focal e acesso direto a coleções por uso e ocasião. Fotos grandes, textos alinhados à esquerda e hierarquia que priorize o produto. Reduzir decoração que afaste a oferta das primeiras telas. Não usar carrossel automático como condição para encontrar informações essenciais.

Página de produto com galeria e área de configuração próximas. No desktop, resumo acompanha a escolha sem cobrir conteúdo; no celular, ação e total ficam acessíveis sem esconder campos ou mensagens. Imagens devem preservar proporção; preço, prazo e condições permanecem como texto da interface.

### Interação avançada

Seleção visual de cor, tamanho e acabamento quando os dados permitirem; estado selecionado perceptível por texto e forma, além da cor. Atualização do resumo ao alterar opções; troca de foto só quando houver imagem correspondente real. Ausência de imagem específica não deve gerar uma simulação apresentada como foto do produto.

Montador com área de composição, seleção de peças, quantidades, edição da personalização e resumo. As operações precisam ter alternativa por botões e teclado; arrastar nunca será a única forma de montar o conjunto.

### Montador 2D

Direção proposta para desktop: seleção de produtos à esquerda, composição ao centro e resumo à direita. A área central é o elemento visual principal; nome, opções e quantidades continuam legíveis fora dela. No celular, alternar seleção e composição mantendo acesso ao resumo, sem comprimir três colunas na mesma tela.

Usar uma foto de composição específica por produto, preferencialmente com fundo transparente e enquadramento consistente. Preservar a foto original da galeria. Um produto sem ativo preparado continua acessível na lista e tem representação identificável, sem remoção de fundo improvisada em tempo de execução.

Interações propostas: adicionar e retirar peças, posicionar por arraste ou teclado, selecionar a peça para editar suas opções, alterar quantidade, aproximar a visualização e reenquadrar a composição. Incluir desfazer/refazer para alterações da montagem; a política de recuperação após recarga será definida na especificação.

Posição na composição é uma preferência visual, não altera preço ou disponibilidade. Quantidade e personalização são dados comerciais. Produtos iguais com personalizações diferentes devem permanecer como itens distintos; mover uma foto não pode criar uma nova unidade faturável.

Para lotes grandes, representar cada linha com sua foto e quantidade, evitando desenhar centenas de cópias. A composição permanece ilustrativa e sem escala garantida. Alterar zoom não muda dimensão contratada da peça.

O resumo deve mostrar nome, opções, quantidade, valor unitário e subtotal quando definidos. Se houver item sob consulta, separar a soma dos valores conhecidos e sinalizar a pendência; não apresentar essa soma como total fechado do conjunto. Frete permanece à parte.

Ao concluir a montagem, a ação proposta é “Revisar conjunto” e depois “Solicitar orçamento”. Até o ciclo de checkout, não há confirmação de compra nem pagamento nesse fluxo.

Movimento responde às ações do cliente, com opção de movimento reduzido. Evitar animações repetitivas, excesso de blocos idênticos e efeitos que prejudiquem leitura ou carregamento.

## 5. Fluxos propostos

### Descoberta

Campanha ou coleção → busca/refinamento → lista → produto. Preservar filtros e posição lógica no retorno. Ordenações e selos comerciais precisam refletir dados ou curadoria explícita, sem apresentar destaque editorial como ranking automático de vendas.

### Produto personalizado

Produto → opções → campos específicos → quantidade → resumo → adicionar à seleção. Exemplos de campo: nome, frase, tema e orientação de arte. Cada produto define quais campos se aplicam e quais são obrigatórios; a lista não pode depender apenas de uma observação geral.

Preço de opção pode ser definido ou depender de análise. Quando houver análise, mostrar o estado de consulta e não inventar um valor final. Produção e transporte são conceitos separados; aprovação da arte pode ser condição explícita de início.

### Conjunto

Coleção elegível → peças e quantidades → composição visual → personalizações por peça → resumo → solicitação. Distinguir conjunto escolhido pelo cliente, kit fixo e pacote de unidades iguais. O efeito visual não pode ocultar que as quantidades comerciais são a referência do pedido.

Se a prévia não estiver em escala, informar isso. Cenário, base ou embalagem ilustrativa só entram na oferta quando cadastrados como componentes incluídos. Preservar seleção após erros e ao retornar ao catálogo.

### Solicitação e atendimento

Revisão pelo cliente → identificação e contato necessários → envio → confirmação e identificador → revisão interna. A confirmação significa recebimento da solicitação, sem confirmar venda, disponibilidade final, pagamento ou reserva de produção.

Atendimento confere produto, configuração, quantidade, arte e valor; vincula ou cria o cliente com revisão; prepara o orçamento existente. Reenvio ou resposta incerta não pode gerar múltiplas solicitações iguais inadvertidamente. Mensagem de WhatsApp é um canal complementar, sem equivaler a envio já concluído.

### Checkout ao final

Elaborar depois de estabilizar produto, configuração, preço, solicitação e conjuntos. Nessa etapa serão definidas modalidades de venda, entrega, pagamento, reserva, cancelamento e recuperação de confirmação incerta. Não escolher provedor ou tratar um botão de pagamento como checkout completo nesta abertura.

## 6. Ciclos de desenho propostos

Cada ciclo precisa de especificação própria, critérios de aceite e plano revisado antes de implementar. A ordem abaixo é funcional, sem estimativa de prazo.

| Ciclo | Escopo | Resultado revisável |
|---|---|---|
| C1 Catálogo e produto | Direção visual, conteúdo comercial, galeria, descoberta e configuração por item | Home, listagem e produto com estados de escolha, consulta e indisponibilidade |
| C2 Solicitação integrada | Lista revisável, recebimento e atendimento, preservando configurações | Intenção completa chega à equipe e prepara orçamento existente |
| C3 Quantidades e conjuntos | Faixas comerciais, kit/pacote/conjunto e montador 2D com fotos, arraste e resumo | Seleção visual preserva quantidades, composição e condições |
| C4 Arte e continuidade | Referências, aprovação e transmissão para documentos/produção, conforme desenho de anexos | A configuração aprovada acompanha a operação |
| C5 Checkout | Especificação de compra, frete, pagamento e efeitos operacionais | Fluxo transacional definido após o catálogo estabilizar |

O desenho de C1 já considera C3 para compartilhar linguagem e componentes de configuração. A execução pode ser incremental sem deixar uma versão visual provisória como entrega final de cada ciclo.

## 7. Administração e conteúdo necessários

Prever manutenção pela equipe dos campos de produto, opções de personalização, fotos relacionadas, limites de caracteres, adicionais e condições de consulta. Kit e conjunto precisam de elegibilidade e política de composição; não basta permitir qualquer combinação pública.

Campos comerciais devem ser reutilizados nas superfícies públicas para evitar repetir prazo e preço em banner, descrição e foto. Produtos antigos seguem válidos sem preenchimento artificial; as capacidades novas são ativadas conscientemente para cada oferta.

Conteúdo real necessário: fotos principais e de uso, medidas, material e cuidados, o que acompanha, exemplos de personalização e coleções prioritárias. Não criar avaliações, descontos, estoque ou promessas de prazo fictícios.

## 8. Regras de integração a detalhar

- Configuração de um item não pode se misturar com a de outro item do mesmo produto.
- Preço exibido precisa identificar se é referência, consulta ou valor definido, com unidade e quantidade claras.
- Alteração no catálogo não reescreve orçamento emitido ou configuração aprovada.
- Validar opções, preço e disponibilidade no servidor ao revisar ou receber a solicitação.
- Quantidade de kit, unidades por kit e quantidade de cada componente são dimensões distintas.
- Salvar composição visual não significa reservar material nem iniciar produção.
- Arquivos de referência precisam de limites, acesso controlado e política de retenção definidos no ciclo correspondente.
- Não expor custos internos, margens, dados de outros clientes ou controles administrativos na vitrine.
- Solicitações públicas precisam de proteção contra abuso e recuperação de falha sem perda do rascunho.
- Checkout futuro reutiliza os conceitos aprovados; pagamento não pode duplicar venda, recebível ou baixa.

## 9. Critérios transversais propostos

- Usar em 320/390/1440 px, nos temas suportados, sem transbordamento da página.
- Ações públicas com área acessível de pelo menos 44 px, foco visível, rótulos e navegação por teclado.
- Preservar lista e personalização ao recarregar e ao recuperar erro, segundo política de persistência a definir.
- Estados de carregamento, vazio, erro, opção retirada e preço alterado têm orientação concreta.
- Composição visual e resumo textual representam os mesmos itens e quantidades.
- Total e unidade não sugerem que frete ou serviço sob consulta já estejam incluídos.
- Produto existente sem configuração nova mantém o fluxo atual.
- Testes funcionais cobrem opções inválidas, duas personalizações do mesmo produto, mudanças de catálogo, quantidades de fronteira e reenvio.
- Verificação visual usa imagens demonstrativas identificadas como tal; publicação comercial depende de conteúdo real.

## 10. Escopo posterior ou condicionado

Checkout permanece por último. Cashback, fidelidade, avaliações verificadas, venda de arquivos digitais, geração automática de modelos e atualizações automáticas de tarifas não entram por associação com os benchmarks. Dependem de objetivo comercial e especificação próprios.

Visualização 3D real não integra o escopo escolhido. A composição 2D avançada usa fotos e recortes preparados, com foco na escolha comercial e na combinação visual. Nenhuma geração automática de modelos 3D é necessária para esse fluxo.

## 11. Próxima definição

Modalidade visual definida: composição 2D. Após a aprovação desta abertura, detalhar o primeiro ciclo com telas, regras de configuração e condições de preço no novo chat solicitado. A especificação escrita será apresentada para revisão antes do plano de implementação; esta abertura não substitui os artefatos detalhados de cada ciclo.

Não houve alteração de código de aplicação, banco, configuração, produção ou dependências. Alterações administrativas já presentes no checkout foram preservadas. Este arquivo registra somente a abertura do planejamento.
