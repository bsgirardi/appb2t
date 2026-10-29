# E6.1 — Rascunhos para Instagram e WhatsApp

Estado: desenho completo aprovado pelo usuário em 29/10/2026. Canais Instagram e WhatsApp, com preparação de material revisável para publicação manual. Base remota conferida: main 1.11.1, `e273091b0ecb6a4532b5ea7f503bc49873dc2b14`.

Revisão independente de planejamento em 29/10/2026: nenhuma pergunta material pendente (“nothing important left”). Próxima etapa: confirmação do plano e execução direta em isolamento.

## Intenção e situação atual

A equipe deve conseguir transformar uma ficha cadastrada em material comercial consistente, revisar o texto, organizar fotos e guardar rascunhos por canal. Hoje o produto já possui nome, descrição curta/completa, especificações, cores, tamanhos, disponibilidade, prazo, quantidade mínima, personalização e até dez fotos ordenadas. Também possui SEO, mas não há biblioteca de anúncios ou integração com redes sociais. Custos, margens e memórias de cálculo são dados internos e não são fontes de conteúdo exportável.

Esta é uma funcionalidade compatível, com persistência e interface próprias: cabe um desenho completo e uma implementação em incrementos internos. A E6 ampla continuará parcial, pois IA e integrações externas permanecem pendentes.

## Abordagens

1. **Rascunhos e exportação manual, escolhida:** modelos de texto determinísticos usando a ficha, edição humana e fotos existentes. Entrega valor sem contas externas, custos de provedor ou permissões em redes sociais.
2. Geração por IA: pode criar variações de estilo, mas depende de provedor, custo, tratamento dos dados e limites que ainda não foram definidos. Etapa futura.
3. Publicação e sincronização diretas: exigem contratos de API, autenticação, permissões, tratamento de falhas e confirmação no canal. Etapa futura própria, por canal.

A escolha dos canais e da publicação manual foi do usuário. Modelos, limites, estados e decisões técnicas abaixo são propostas para tornar esse recorte implementável.

## Entrega para a equipe

- Entrada **Anúncios** no grupo Vendas, em `/anuncios`, para ADMIN e OPERATOR autenticados, seguindo as permissões atuais de produtos. Biblioteca compartilhada, sem novo papel de usuário.
- Lista paginada de 20 itens, busca por identificação interna/nome do produto, filtros de canal e estado. Ordenação por atualização decrescente e ID como desempate. Indicadores de alterações na ficha e de fotos ausentes.
- Criar rascunho escolhendo produto e canal, com identificação interna editável. Seletor de produtos paginado, pesquisável por nome/código e limitado à projeção necessária; não carregar fichas com custos ou todo o catálogo.
- Detalhe em `/anuncios/[id]`: referência da ficha, texto editável, fotos selecionadas em ordem, estado e ações contextuais. A leitura nunca altera o cadastro do produto nem o SEO.
- Ações: salvar, obter nova sugestão, manter texto após conferir mudanças da ficha, marcar como revisado, voltar a rascunho, arquivar/restaurar, copiar texto revisado e baixar material revisado.
- Rascunhos diferentes podem referenciar o mesmo produto/canal; a identificação interna e os IDs os distinguem. Não haverá exclusão permanente pela interface.

## Conteúdo e geração

Um rascunho representa **um produto e um canal**. Trocar produto ou canal significa criar outro rascunho; não transformar um já revisado silenciosamente. Kits e anúncios de vários produtos ficam fora deste incremento.

Gerar somente de uma lista explícita de campos públicos: nome, descrições, especificações, cores, tamanhos, disponibilidade, prazo de produção, quantidade mínima e indicação de personalização. Campos vazios são omitidos, sem preencher medidas, materiais, benefícios, estoque ou condições inexistentes. Não consultar arquivos de fabricação para deduzir características.

- **Instagram:** primeira linha com o nome, apresentação curta, características disponíveis e convite genérico para pedir orçamento. Texto simples com quebras de linha, editável.
- **WhatsApp:** apresentação direta do produto, características/opções, quantidade mínima quando aplicável, disponibilidade/prazo e convite para consultar condições. Pode ser copiado para conversa ou adaptado manualmente ao catálogo.
- Disponível no catálogo não significa pronta entrega: não gerar essa promessa. Prazo cadastrado deve ser descrito como prazo de produção, sem inventar frete ou prazo total de entrega. Opções de personalização não são todas incluídas automaticamente no preço.
- Neste incremento os modelos não inserem preço: usar convite para consultar valores e condições. Não exportar preço interno de itens sob consulta, custos, margens, memórias de cálculo, estoque interno, contatos de clientes ou dados de parceiros.
- Não acrescentar links automaticamente: a instalação usa endereço local e não deve gerar chamadas com localhost. A pessoa pode revisar/inserir um endereço público no texto por sua iniciativa.
- Identificação interna e título: até 120 caracteres cada; texto: até 5000 caracteres. São limites internos deste editor, não promessa de aceitação em formulários ou APIs das plataformas. A publicação manual exige conferência no canal.

Textos sugeridos não usam IA nem serviços externos. O texto é livre para edição; a garantia de não inventar informações aplica-se à geração do sistema. Quem revisar deve conferir os acréscimos manuais. A prévia usa texto escapado, sem HTML interpretado.

## Fotos e material exportado

- Selecionar de 1 a 10 fotos existentes do produto, sem repetição e em ordem explícita; ao criar, sugerir a ordem atual do cadastro. Reordenar com botões acessíveis, além de eventual arraste opcional, e mostrar a primeira como capa.
- Não aceitar URLs remotas nem arquivos novos no rascunho. Inclusão/edição de fotos continua na ficha do produto. Validar no servidor que cada ID pertence ao produto.
- Referências não duplicam os arquivos no banco. Se a foto for removida, mostrar a ausência e exigir substituir/remover a seleção antes de revisar ou exportar; não perder silenciosamente a seleção nem completar com outra foto.
- **Copiar texto** e **Baixar material** só se habilitam com uma revisão vigente. Copiar inclui título e corpo com separação consistente, sem dados internos.
- Baixar um ZIP com `texto.txt` UTF-8 (título e corpo), `fotos/01.jpg` até `10.jpg` e `referencia.json` com produto, canal, ID/versão do rascunho e instante de geração. O manifesto contém apenas identificação e referência pública, sem atores, e-mails ou dados internos.
- Converter cópias das fotos existentes para JPEG, preservando proporção e enquadramento, sem aumentar dimensões nem ultrapassar 1600 px no lado maior; fundo branco quando houver transparência. Não modificar os originais e não aplicar cortes, filtros, remoção de fundo ou geração de imagens. Não prometer adequação automática a todo formato de post/story.
- Limitar o conjunto de imagens de entrada a 30 MiB por exportação e o JPEG de saída a no máximo 5 MiB por imagem. Se exceder, rejeitar integralmente com orientação para selecionar menos fotos; não entregar pacote parcial. Tamanho final e nomes são controlados pelo servidor, sem usar texto livre como caminho.
- Reutilizar `sharp`; tornar `fflate` uma dependência direta na versão já resolvida pelo projeto (0.8.3), pois hoje é transitiva. ZIP sem compactar novamente os JPEGs. Sem armazenamento público dos pacotes ou nova infraestrutura externa.
- Registrar **material gerado**, com versão e data; isso não significa que houve download concluído, envio ao cliente ou publicação no canal. Não haverá estado automático “Publicado”.

## Estados, revisão e alterações da ficha

Estados persistidos: **Rascunho**, **Revisado** e **Arquivado**. Criar, alterar título/corpo/seleção de fotos ou atualizar a referência do produto deixa o item em Rascunho e invalida a revisão anterior. Restaurar um arquivado também volta a Rascunho; arquivar preserva dados e não permite exportação.

Guardar uma fotografia estruturada dos campos públicos utilizados e a versão do produto no momento da captura. Para este incremento, qualquer alteração da versão do produto após a captura indica **Ficha alterada** e impede marcar como revisado, copiar pelo botão ou exportar. É uma escolha conservadora: até uma alteração interna da ficha poderá exigir nova conferência; não implementar um comparador de alterações semânticas nesta etapa.

Para resolver a alteração da ficha, apresentar a referência salva e os valores atuais. Oferecer duas ações explícitas: **Manter meu texto e atualizar referência** ou **Aplicar nova sugestão**. A segunda mostra uma prévia e exige confirmação antes de substituir texto editado. Ambas preservam a seleção de fotos que ainda existe, apontam ausências e voltam a Rascunho. Nada reescreve o texto automaticamente.

Marcar como revisado exige título/corpo não vazios, fotos válidas, referência atual e confirmação “Conferi o texto, as fotos e a disponibilidade deste material”. Registrar autor, data e versão da revisão. O estado revisado é controle interno, não aprovação do Instagram/WhatsApp.

Produtos não publicados ou indisponíveis podem ter material preparado internamente, com alerta explícito. A geração deve informar corretamente a disponibilidade e não prometer venda imediata. Publicar ou despublicar o produto altera sua versão e exige nova conferência. Não publicar produtos ao criar/revisar anúncios.

## Dados, autorização e concorrência

Migração aditiva para rascunhos e registros de exportação, sem reescrever produtos, estoques, documentos ou históricos existentes. Modelo de rascunho: ID, produto relacionado, canal enumerado INSTAGRAM/WHATSAPP, identificação interna, título, corpo, IDs ordenados de fotos, snapshot com versão de formato, versão da ficha, estado, versão otimista, criação/atualização e autoria/revisão. Relação com produto impede remoção física enquanto houver referências; não criar nova API de remoção de produto.

Criar com chave de idempotência por ator: repetição do mesmo conteúdo retorna o mesmo rascunho; reutilização com outro conteúdo retorna conflito. Vários rascunhos intencionais usam chaves distintas. Atualizações/revisão/arquivamento exigem `expectedVersion`; dois operadores não podem sobrescrever mudanças silenciosamente. Erro 409 preserva o conteúdo local para recarregar e comparar.

API privada em `/api/anuncios` e subrotas por ID, com autenticação ativa, validação estrita, limites de corpo e origem para mutações conforme `jsonBody`/`endpoint` existentes. ADMIN e OPERATOR têm as mesmas ações deste módulo; visitantes não acessam textos, fotos privadas ou ZIPs. Sem links públicos, credenciais externas ou dados em logs/notas de versão. Consultas e downloads usam `no-store`.

Exportação por POST com versão esperada. Em transação curta com snapshot coerente, ler rascunho revisado, versão atual da ficha, seleção e bytes das fotos. Validar e capturar o material dessa versão; montar o ZIP fora da transação. Alterações posteriores não tornam o pacote gerado um pacote da versão nova: o manifesto identifica a versão capturada. Registrar a exportação dessa versão, sem marcar a versão atual do rascunho como exportada caso já tenha sido editada. Falhas na montagem não registram sucesso. Limitar a duas montagens simultâneas por processo e responder 429 às excedentes, com possibilidade de tentar novamente.

## Interface, padrões e acesso

Usar a skill local `.agents/skills/shadcn/SKILL.md`, componentes instalados e semântica do projeto: Table/Empty para biblioteca, Card com composição completa, FieldGroup/Field para formulário, ToggleGroup para os dois canais e Alert para pendências. Reutilizar os padrões existentes de confirmação para substituição/arquivamento. Não acrescentar editor rico, chat, rede social simulada ou biblioteca de arraste nesta etapa.

Erros junto aos campos, estados de carregamento, foco após ações, feedback acessível ao copiar e alternativas por teclado para ordenar fotos. Desktop e celular sem rolagem horizontal. Distinguir “Salvar”, “Marcar como revisado” e “Baixar material”; não usar botão “Publicar”. Nenhum detalhe de infraestrutura ou cálculo deve aparecer no fluxo comercial.

## Critérios verificáveis

1. Criar e reencontrar rascunhos independentes para Instagram e WhatsApp a partir do mesmo produto; modelos têm apresentação distinta e só usam campos permitidos.
2. Campos vazios, preço sob consulta, encomenda, indisponibilidade, personalização e quantidade mínima não produzem afirmações ou números inventados.
3. Alterar e revisar textos, selecionar/ordenar fotos, arquivar/restaurar e preservar edição local em conflito concorrente.
4. Duplicidade por repetição de criação é impedida sem impedir múltiplos rascunhos intencionais.
5. Mudança na ficha ou remoção/troca de foto invalida a revisão e exige conferência; atualizar referências não perde texto editado sem confirmação.
6. Somente revisão vigente permite copiar pelo botão/exportar; visitantes e IDs de fotos de outro produto são recusados. Pacote nunca contém custo, margem, cliente, credencial ou arquivo de fabricação.
7. ZIP legível, JPEGs ordenados com proporção preservada, limites de tamanho e nomes seguros; falhas sem pacote parcial/sucesso falso; exportação identifica a versão capturada durante concorrência.
8. Biblioteca e seletor paginados; uso dos componentes shadcn existentes, navegação da equipe e validação visual em desktop/celular.
9. Migração real e reaplicação em PostgreSQL exclusivo, preservando dados sintéticos legados; testes de domínio, API, permissões, concorrência e regressões, lint, tipos, build e revisão final.
10. Na PR de entrega, incremento MINOR uma vez sobre a main vigente (1.12.0 se continuar em 1.11.1), manifestos sincronizados, rodapés via APP_VERSION e notas em português. Histórico anterior e acesso ADMIN/OPERATOR a Atualizações preservados. Sem tags automáticas.

## Limites e próximos passos

Não inclui IA, Facebook como terceiro canal, marketplaces, contratação de serviços, autenticação social, postagem automática, WhatsApp API, envio de mensagens, sincronização de pedidos/estoque, anúncios pagos ou métricas. E6.1 não autoriza publicar o sistema, realizar migração operacional ou integrar uma PR futura.

Após revisão independente do desenho e aprovação do usuário: plano de execução direta em isolamento, com teste vermelho/verde por comportamento e revisão independente final. Antes da implementação, reler os guias locais Next relevantes; preparar um banco descartável exclusivo, sem compartilhar bancos das etapas E1–E5 e sem modificar os contêineres operacionais. Registrar E6 como Em detalhamento agora e atualizar evidências a cada entrega, preservando os arquivos de acompanhamento dos outros chats.
