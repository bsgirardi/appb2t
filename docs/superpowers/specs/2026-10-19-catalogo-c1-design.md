# C1 — Catálogo, produto e configuração por item

Data: 19/10/2026. Status: especificação proposta para revisão; ainda não aprovada.

Origem: `2026-10-19-catalogo-avancado-abertura.md`, cuja direção foi aprovada. Esta especificação detalha somente C1. Não autoriza publicação nem migração no banco operacional.

## 1. Resultado esperado e fronteiras

O visitante encontra um produto, entende a oferta, escolhe opções e personalização, confere quantidade e referência de preço e adiciona uma linha completa à lista. Duas peças iguais com nomes diferentes permanecem distintas. A equipe mantém essas opções no cadastro existente.

C1 entrega home, listagem, produto, cadastro e a adaptação mínima da lista necessária para preservar, editar e comunicar configurações. O acabamento visual integra a entrega funcional. C2 continua responsável por receber a solicitação, gerar identificador, tratar reenvio e preparar orçamento interno. C3 cuida de faixas, kits e montador 2D; C4 de arquivos e aprovação da arte; C5 de checkout.

A conclusão pública do C1 continua sendo preparar mensagem e abrir o canal de contato existente. Não há confirmação de recebimento, venda, pagamento, reserva ou início de produção. A mensagem inclui a configuração de cada linha. O texto da interface distingue claramente mensagem preparada de mensagem enviada.

## 2. Base conferida e escolha de abordagem

Leitura realizada na branch `feat/calculadora`, com alterações administrativas de outro trabalho presentes. Arquivos de aplicação não foram editados nesta etapa.

- `src/domain/products/inquiry.ts`: chave atual contém produto/cor/tamanho; até 20 combinações e 99 unidades por combinação.
- `src/lib/inquiry-store.ts`: armazenamento local v1, validação estrita, limite de leitura de 16 KiB e fallback em memória.
- `src/server/inquiry.ts`: revisão consulta produtos ativos e recalcula preço; não registra recebimento.
- `src/domain/products/validation.ts`: preço positivo obrigatório e edição com versão esperada.
- `src/app/portfolio/produto/[id]/[slug]/page.tsx`: preço também alimenta Offer nos dados estruturados; contexto de retorno já existe.
- `src/components/products/inquiry-panel.tsx`: revisão automática e nova conferência antes do contato; respostas antigas são associadas à seleção que as originou.
- Identidade: `docs/identidade/IDENTIDADE-B2T.md`. Aceite anterior: `docs/superpowers/2026-10-16-catalogo-integrado.md` e publicação de 16/10.

Alternativas consideradas para personalização:

| Alternativa | Consequência |
| --- | --- |
| Observação livre por produto | Simples, mas não expressa obrigatoriedade, opções válidas ou adicionais |
| Campos configuráveis limitados no produto | Recomendação: atende nome/frase/tema/acabamento, com validação e manutenção previsíveis |
| Motor genérico de regras e dependências | Amplia cadastro, combinações e testes sem necessidade comprovada no C1 |

Escolha proposta: campos configuráveis limitados, sem condicionais entre campos e sem matriz combinatória de estoque. Cores e tamanhos atuais permanecem como opções existentes; novos campos não os duplicam.

## 3. Telas e direção visual

### Home e resultados

Preservar rotas, busca, ordenações, paginação, campanhas e coleções existentes. A primeira campanha válida recebe foco editorial; demais campanhas ficam secundárias, sem carrossel automático. Sem campanha cadastrada, usar abertura B2T e acesso direto aos produtos. Não criar campanhas ou alegações comerciais fictícias.

Fotos predominam nos cartões, inteiras e sem corte no hover. Hierarquia: foto, nome, descrição curta quando disponível, preço com natureza explícita, disponibilidade e ação “Ver produto”. Produtos configuráveis podem mostrar “Personalizável” apenas quando o cadastro habilitar campos. Não inventar amostras de cor a partir do nome da cor.

Ordenações de preço usam o preço base público dos produtos com referência numérica. Produtos integralmente sob consulta ficam ao final em ambas as direções, com desempate estável pelo nome e identificador. A interface explica que a ordenação considera o preço base; adicionais dependem da configuração. Busca e filtros continuam preservados ao abrir e voltar do produto.

### Produto

Desktop: galeria ocupa aproximadamente três quintos da área principal; configuração e resumo ocupam o restante. Título, descrição curta, disponibilidade e prazo precedem as escolhas. Resumo acompanha a rolagem somente se couber na altura útil, sem esconder campos ou rodapé.

Celular: galeria, identificação comercial, escolhas, quantidade e resumo em sequência. Barra inferior compacta pode mostrar resumo e ação, respeitando área segura e com espaço reservado no conteúdo; erros levam ao campo correspondente. A barra não duplica controles de formulário nem cobre conteúdo. Em 320 px, quebra de linhas prevalece sobre truncamento de informações essenciais.

A galeria usa miniaturas acionáveis, imagem principal com proporção preservada, texto alternativo e navegação por teclado. Sem movimento automático. Trocar opção muda a foto apenas quando existir associação cadastrada; sem foto específica, permanece a galeria geral com indicação de que a imagem é ilustrativa da oferta, não uma prévia da personalização digitada.

Blocos comerciais próximos da escolha: o que acompanha, especificações existentes, prazo produtivo e condição de início quando cadastrada. Não derivar promessas de estoque físico da disponibilidade editorial. Frete fica separado.

### Linguagem compartilhada com C3

Poppins local, tokens editáveis da vitrine, fotos em superfícies neutras, marca B2T e adaptação Nova. Estados selecionados usam borda/ícone e texto, além de cor. Configurador, resumo monetário e apresentação textual de linha terão contratos reutilizáveis pelo montador; posição, zoom e foto de composição não entram no contrato comercial do C1. Não construir canvas nem cadastrar conjuntos antecipadamente.

## 4. Cadastro e modelo comercial proposto

Adicionar configuração opcional e versionada ao produto, validada integralmente no servidor. Persistência proposta: documento JSON validado no registro Product, mantendo preço, cores, tamanhos e imagens existentes. A versão da definição comercial é independente do formato do documento e muda quando regras comerciais/configuração mudam; a concorrência da edição continua usando a versão esperada do produto.

Produtos antigos recebem configuração vazia e preço de referência, sem exigir recadastro. Não alterar cálculo de custos, memória histórica ou preço interno obrigatório.

| Informação | Regra C1 |
| --- | --- |
| Natureza do preço público | Referência numérica ou sob consulta; consulta oculta o preço público, sem apagar o preço interno |
| O que acompanha | Texto simples opcional, até 1.000 caracteres |
| Condição de início do prazo | Texto simples opcional, até 240 caracteres; exibido junto ao prazo atual, sem mudar sua unidade |
| Campos personalizados | Até 8 por produto, ordenados, com identificador estável, rótulo até 60, ajuda até 160 e obrigatoriedade |
| Texto curto | Limite configurável de 1 a 120 caracteres; aplicável a nome/frase |
| Texto longo | Limite configurável de 1 a 500 caracteres; aplicável a orientação textual de arte |
| Escolha única | De 1 a 20 opções, identificadores estáveis e rótulos até 60 caracteres |
| Efeito comercial | Sem adicional, adicional fixo por unidade ou sob consulta |
| Foto de uma opção | Referência opcional a imagem existente do próprio produto |

Para texto, o efeito comercial aplica-se quando preenchido. Para escolha única, aplica-se o efeito da opção escolhida. Campo opcional vazio não cobra adicional. Adicionais são valores não negativos em reais com até duas casas, limitados ao intervalo monetário suportado pelo produto. Sem percentuais, descontos, fórmulas, adicionais por lote, arquivos, dependências ou listas de nomes por unidade neste ciclo. Para nomes diferentes, criar linhas diferentes.

O cadastro permite adicionar, ordenar, editar e remover campos/opções e informa que mudanças podem exigir revisão das listas dos visitantes. IDs não são recriados ao renomear ou ordenar. Campo novo recebe novo ID. Opção removida não é remapeada automaticamente para outra.

Associação visual C1: apenas opções dos novos campos de escolha única podem referenciar foto. Cores e tamanhos continuam com nomes e controles acessíveis, sem nova associação de foto neste ciclo. Se várias escolhas tiverem foto, prevalece a última escolha feita pelo visitante; ao abrir uma linha salva, prevalece a última opção com foto na ordem dos campos. Ao limpar a opção ativa ou remover sua foto, retornar à imagem principal. Essa regra afeta apenas a galeria.

Cadastros novos usam as permissões já aplicadas à edição de produto. A seleção pública de dados expõe apenas definição comercial necessária; custos, margens, cálculos, autores e dados administrativos ficam fora do DTO público.

## 5. Configuração, identidade e edição da linha

Linha comercial contém identificador estável de linha, produto, cor, tamanho, respostas por ID de campo/opção, quantidade e revisão comercial vista. Valores apresentados anteriormente podem ser preservados como referência local para comparação, nunca como fonte de preço. Rótulos guardados localmente servem para explicar escolhas antigas, não validam opções.

Identidade para agrupamento: produto + cor + tamanho + respostas canônicas + revisão comercial. Respostas ordenadas por ID; texto normalizado para Unicode NFC e sem espaços externos; preservar maiúsculas, acentos, quebras de linha e espaços internos. Resposta opcional vazia equivale a ausência. Quantidade, preço e posição visual não fazem parte da identidade.

Adicionar uma configuração idêntica soma quantidade, respeitando 99; configurações distintas criam linhas separadas, respeitando 20. Exceder limite mostra erro e mantém lista e formulário anteriores. O limite conta linhas configuradas, não só produtos.

“Editar configuração” abre a página do produto com referência à linha local e contexto de retorno, sem colocar nome/frase na URL. Salvar substitui a linha; cancelar mantém a anterior. Se a nova configuração coincidir com outra, combinar quantidades somente após informar o resultado e respeitar os limites; falha não remove nenhuma das linhas. Linha que não existe mais recebe orientação para adicionar novamente, sem sobrescrever outra.

Alterações de quantidade e respostas invalidam a mensagem preparada. Revisão comercial diferente exige apresentar mudanças e reconfirmar a linha, mesmo quando os IDs ainda forem válidos. Produto retirado, opção removida e novo campo obrigatório bloqueiam o preparo até correção/remoção; texto digitado permanece disponível para reaproveitamento.

## 6. Preço, consulta e revisão no servidor

O domínio compartilha regras de cálculo entre prévia e revisão, mas a revisão usa exclusivamente dados atuais do servidor. Valor unitário de referência = preço base + adicionais unitários aplicáveis; subtotal = valor unitário × quantidade, calculado com decimal e arredondamento monetário consistente com o projeto. Validar também limite do resultado antes de retornar ou formatar.

Se produto ou qualquer resposta aplicável exigir análise, a linha inteira fica “Sob consulta”: unitário e subtotal finais ficam ausentes. A interface pode explicar quais escolhas exigem análise; não mostra preço base como valor da configuração. Sem análise, usar “Referência por unidade” e “Subtotal de referência”, não promessa de preço final.

| Estado da lista | Resumo e ação |
| --- | --- |
| Todas válidas com referência | Total de referência, sem frete; pode preparar contato |
| Válidas, alguma sob consulta | Soma dos itens com referência + quantidade de linhas sob consulta; pode preparar contato |
| Todas sob consulta | Valor a confirmar; não apresentar R$ 0 como total; pode preparar contato |
| Opção inválida/produto indisponível | Subtotal apenas dos itens válidos identificado como parcial; corrigir antes de preparar |
| Revisão/preço mudou | Mostrar valor anterior se conhecido, valor atual e motivo; confirmar atualização antes de liberar contato |
| Falha na revisão | Manter lista, permitir tentar novamente e não liberar contato como se conferido |

Disponibilidade e natureza de preço são independentes: CONSULT não implica automaticamente preço sob consulta. UNAVAILABLE impede adicionar e preparar essa linha; consulta de reposição é ação separada e não exige preenchimento de personalização.

A API existente de revisão será ampliada, sem gravar solicitação. Rejeitar IDs desconhecidos, respostas repetidas, campos extras, quantidades inválidas, opções de outro produto e payload fora dos limites. Retornar mensagens por linha/campo. Preços ou rótulos enviados pelo cliente jamais substituem dados atuais. Não renderizar texto do visitante como HTML.

Revisão ao abrir lista e nova revisão ao preparar contato; respostas atrasadas não substituem a seleção mais recente. Uma mudança detectada na última conferência exige aceite explícito do novo resumo. A mensagem usa apenas o resultado da conferência correspondente à lista atual.

Todas as superfícies públicas seguem a mesma natureza de preço: cartões, produto, relacionados, lista, mensagem e dados estruturados. Produto sob consulta não publica Offer com preço interno; omitir Offer quando não houver oferta numérica representativa. Nunca publicar zero fictício. Não declarar preço final de opções ainda não selecionadas em metadados.

## 7. Persistência e recuperação

Armazenamento v2 com envelope de formato e linhas, limite de 256 KiB serializados. A aplicação também limita a requisição da revisão a 256 KiB, além dos limites semânticos. Contar bytes UTF-8. Não salvar arquivos nem dados de contato nesse rascunho.

Migrar a lista v1 válida uma única vez para linhas sem respostas e com revisão a conferir. Só considerar migração concluída após escrita v2 bem-sucedida. Manter v1 como cópia de recuperação, sem importá-la novamente quando v2 existir, inclusive vazio. Não escrever v1 a partir do aplicativo novo. Compatibilidade com abas de versões antigas fica restrita à recuperação: avisar para atualizar a aba, não tentar sincronizar formatos distintos.

Lista v2 inválida ou grande demais não é substituída silenciosamente por lista vazia. Informar falha de leitura, preservar o conteúdo original até escolha explícita de reiniciar e permitir copiar uma exportação textual de recuperação quando tecnicamente possível. Em indisponibilidade de armazenamento, manter em memória e avisar que a seleção pode não sobreviver à recarga.

Formulário ainda não adicionado/edição em andamento usa rascunho por produto e linha em sessionStorage, com os mesmos limites de campos; restaura na mesma aba após recarga e limpa após salvar ou cancelar explicitamente. Uma falha de armazenamento mantém estado em memória com aviso. Ao retomar, reconferir definição comercial antes de permitir concluir.

Texto completo não deve ir para URL, logs de requisição ou telemetria. O usuário pode remover uma linha ou limpar a lista explicitamente. O rascunho local não é cópia de um orçamento aprovado nem histórico comercial; snapshots imutáveis em documentos serão definidos no C2/C4.

Mensagens extensas permanecem copiáveis. Para evitar links excessivos, se a URL codificada de contato exceder 6.000 caracteres, oferecer copiar a mensagem completa e abrir o canal sem corpo, com instrução de colar. Não truncar configurações silenciosamente nem declarar envio concluído.

## 8. Limites dos módulos e integração

- Domínio comercial: definição, respostas, normalização, validação e cálculo puro; sem browser, banco ou posição 2D.
- Servidor de produto: persistência, concorrência, validação de associação das imagens e projeção pública.
- Servidor de revisão: busca de dados atuais, validação de linhas, resumo e mensagem; sem vendas ou recebimento.
- Estado local: migração, recuperação, identidade estável e edição; sem autoridade sobre preço.
- Componentes públicos: galeria, campos configuráveis, estado monetário e resumo; compartilham contratos para C3.
- Cadastro: extensão do editor comercial existente, sem criar um segundo cadastro de produtos.

Áreas previstas: domínio de produtos, tipos públicos, validação e servidor de produtos, editor comercial, galeria/contato, armazenamento/lista, revisão de inquiry, home/cartões e estilos próprios da vitrine. O plano deverá localizar as projeções no servidor e a rota HTTP antes de definir alterações por arquivo.

A implementação deverá ler os guias relevantes da versão instalada de Next em `node_modules/next/dist/docs/`, além das skills de interface aplicáveis. Esta etapa produz somente documentação, sem decisões baseadas em APIs presumidas.

## 9. Critérios de aceite verificáveis

1. Produto antigo, sem definição nova, mantém compra consultiva e sua lista v1 é recuperada sem perdas.
2. Nome “Ana” e nome “Bia” no mesmo produto/cor/tamanho geram duas linhas e aparecem separados na mensagem; repetição de “Ana” na mesma revisão soma unidades.
3. Limites de 20 linhas/99 unidades são respeitados em adicionar, editar, combinar, migrar e revisar; erro preserva dados anteriores.
4. Campo obrigatório vazio, ID inexistente, resposta duplicada, opção de outro produto e texto excessivo são rejeitados também no servidor.
5. Adicionais aplicam-se por unidade; campo opcional vazio não cobra; cálculo decimal e limites monetários são testados.
6. Item sob consulta não vira zero nem total fechado; lista mista mostra soma parcial identificada e permite contato quando válida.
7. Mudança de preço/revisão exige confirmação; remoção de campo/opção não perde texto nem remapeia escolhas silenciosamente.
8. Edição e cancelamento preservam identidade e demais linhas; resposta atrasada da API não sobrescreve seleção nova.
9. Foto associada pertence ao produto; remoção da foto recupera imagem principal; digitação não gera foto simulada.
10. Metadados e dados estruturados não vazam preço interno quando oferta pública está sob consulta.
11. Falha de rede/armazenamento, recarga e migração têm comportamento recuperável e mensagem clara.
12. Mensagem completa inclui opções/textos/quantidade e natureza do preço; contato extenso usa cópia sem truncamento.
13. Busca, paginação, retorno contextual, campanhas, coleções e relacionados mantêm os fluxos existentes.
14. Cadastro respeita autenticação, permissões e conflito de versão; dados de custo não chegam ao público.
15. Home, resultados, produto e lista são inspecionados em 320/390/1440 px, claro/escuro e movimento reduzido: sem overflow, fotos inteiras, foco visível, ações públicas de 44 px, textos longos legíveis e barra sem obstrução.
16. Fluxo completo funciona por teclado, com rótulos, erros associados e status anunciados; não depender apenas de cor ou arraste.

Testes previstos: unidades para contratos/cálculo/identidade/migração; integração de cadastro e revisão com banco descartável; componentes para edição e resposta atrasada; inspeção visual e fluxo integrado com dados fictícios identificados. Reutilizar a matriz anterior, acrescentando estados configuráveis, consulta, mudança de catálogo e recuperação. Nenhum teste mutável usa banco operacional.

## 10. Estratégia de entrega e pendências reais

Não há decisão de negócio bloqueante identificada para revisar esta proposta. Limites dos campos, adicionais apenas unitários e política de rascunho são escolhas propostas neste documento, sujeitas à revisão. Conteúdo real de cada produto será cadastrado pela equipe; não é necessário inventá-lo para validar a capacidade.

Depois da aprovação da especificação, elaborar plano técnico com etapas verificáveis e escolha de execução. Antes de código, criar isolamento a partir da base correta, inspecionando alterações compartilhadas: não transportar indiscriminadamente trabalho administrativo nem perder a abertura ainda não rastreada. Nesta fase documental, o arquivo novo pode ser versionado sozinho no checkout atual, sem tocar arquivos compartilhados.

Qualquer migração será aditiva, ensaiada em banco descartável; publicação real requer etapa própria com estado, backup e reversão concretos. Aprovar esta especificação não aplica migração ou publica a aplicação.

Auto-revisão: fronteiras C1/C2/C3 explícitas; configuração preservada de ponta a ponta até mensagem; preço sob consulta inclui SEO; persistência contempla v1, falha e recuperação; limites preservados; nenhum requisito de checkout ou 3D real introduzido. Implementação e testes de aplicação ainda não executados.
