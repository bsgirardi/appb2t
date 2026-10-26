# Revisão da experiência administrativa

Status: aprovado pelo usuário e implementado. Verificação e limitações em `docs/superpowers/reviews/2026-10-25-administrativo-ux.md`.

## Intenção e decisões confirmadas

O usuário se perde em muitos campos semelhantes. A revisão cobre toda a área administrativa, deve destacar campos obrigatórios e simplificar o trabalho sem retirar a complexidade do negócio. Deve reduzir rolagem e mudanças de tela. Foi escolhida a reorganização por tarefa, usando a skill shadcn e os componentes existentes.

## Abordagens

1. Ajustar somente rótulos, espaçamentos e botões: menor esforço, mas mantém formulários extensos e fragmentação.
2. Reorganizar por tarefa: essenciais visíveis, resumo contextual, detalhes progressivos e edição curta no mesmo contexto. Recomendada e escolhida pelo usuário.
3. Separar todos os assuntos em abas ou etapas: reduz altura inicial, mas exige mais alternância e esconde relações. Não será o padrão.

## Objetivos e limites

- Tornar explícitos o contexto, os dados necessários e a próxima ação.
- Manter valores, situação e pendências próximos da tarefa.
- Reduzir altura inicial sem diminuir legibilidade nem esconder campos obrigatórios vazios.
- Preservar regras, permissões, cálculos, validações, histórico, controle de versão e proteção contra operações duplicadas.
- Não alterar contratos de API, banco, políticas comerciais ou a loja pública como parte desta revisão.
- Não prometer ausência de rolagem: listas extensas e telas pequenas precisam continuar utilizáveis com zoom e teclado.
- Não introduzir novos cadastros rápidos ou operações que as APIs atuais não suportam.

## Padrão de tela proposto

Cabeçalho compacto: nome da tarefa, identificação do registro, situação e ação principal. Navegação lateral mantém as rotas atuais, os grupos e permissões; ajustar nomes ambíguos e indicar a localização atual.

No computador, conteúdo principal flexível e resumo lateral de aproximadamente 280–320 px, quando a largura comportar. O resumo acompanha a rolagem sem cobrir conteúdo; mostra valores relevantes, situação e pendências. Formulários usam até duas colunas para campos curtos e relacionados; descrições, itens e tabelas usam a largura disponível.

Barra de ações aderente à parte inferior da janela quando necessária, com salvar e cancelar, sem duplicar envios nem cobrir o último campo. Em telas estreitas, uma coluna, resumo compacto no fluxo e ações adaptadas à largura. Não usar alturas fixas que cortem conteúdo nem múltiplas regiões de rolagem para o formulário.

Seções adicionais usam Accordion ou Collapsible com título e resumo do preenchimento. Podem começar recolhidas somente quando não tiverem obrigatórios pendentes ou erros. Abas ficam reservadas a conjuntos independentes já existentes, como configurações e listagens financeiras; não criar um assistente obrigatório de etapas.

## Campos, obrigatoriedade e validação

Revisar a regra real nos schemas e nas condições da operação antes de marcar um campo. Diferenciar salvar rascunho de confirmar, publicar ou concluir: não exigir no rascunho dados necessários somente em uma transição posterior.

Mostrar texto “Obrigatório” junto ao rótulo dos campos exigidos na ação atual, além da semântica required/aria-required apropriada. Não depender de cor ou asterisco isolado. Opcionais ambíguos podem receber “Opcional”. Exigências condicionais devem atualizar o rótulo conforme as escolhas e explicar a condição quando ainda não estiver ativa. Exemplos existentes: justificativas para correções e datas anteriores.

Campos com nomes semelhantes recebem explicação de finalidade: descrição do produto, resumo no catálogo e descrição para buscadores; preço de venda, custo calculado e forma de exibição do preço. Unidades e moeda acompanham os campos.

Ao tentar salvar, preservar dados, abrir as seções com erro, mostrar erro junto ao campo e mover foco para o primeiro controle inválido. Um resumo acessível pode apontar para os erros. Não calcular contador de pendências por campos vazios indiscriminadamente: usar a validação da ação e não contar campos opcionais. Erros gerais e respostas incertas permanecem em Alert; não transformar falha de rede em suposto sucesso.

## Botões e feedback

Uma ação principal por contexto, com verbo e objeto: Salvar produto, Salvar orçamento, Registrar recebimento. Ações secundárias usam variantes existentes; ações irreversíveis mantêm confirmação e apresentação destrutiva apropriada.

Outras ações podem ser agrupadas em menu quando houver muitas, mantendo a tarefa frequente visível. A ordem vem da situação e das permissões reais; não inventar transições nem automatizá-las. Ícones de ações importantes devem ter texto visível. Estados de envio bloqueiam duplicação e mostram o que está acontecendo.

Painel lateral (Sheet) para edições curtas existentes, sem navegação de rota, quando isso reduzir ida e volta. Detalhes longos continuam em página ou no ambiente de trabalho existente. Um painel por vez, com título acessível, retorno do foco, preservação da seleção e confirmação ao descartar alterações. Não aninhar painéis e diálogos de edição.

## Aplicação por módulo

| Módulo | Essencial visível | Detalhes e contexto |
| --- | --- | --- |
| Dashboard | Pendências e atalhos para tarefas já disponíveis | Indicadores em segundo plano, sem inventar novos cálculos |
| Clientes | Identificação e contato necessário | Dados adicionais recolhíveis; edição curta contextual |
| Solicitações | Cliente, pedido recebido, situação e próxima ação permitida | Origem e histórico acessíveis no mesmo contexto |
| Produtos | Identificação, descrição principal, preço e situação | Agrupar apresentação, venda, personalização, custos e busca; essenciais primeiro; custo e prévia resumidos ao lado |
| Kits e coleções | Nome, composição ou produtos vinculados, situação | Detalhes comerciais e publicação agrupados; manter regras de desconto e revisão |
| Orçamentos e vendas | Cliente, itens, totais e situação | Condições, observações e custos progressivos; resumo de desconto, frete e total sempre próximo; preservar rascunhos e confirmações |
| Produção e planejamento | Ordem, itens, situação, quantidades e próxima tarefa | Agrupar ações de execução; reservas, medições, custos e histórico expansíveis; preservar justificativas e reconciliação |
| Estoque | Item, saldo e operação escolhida | Diferenciar entrada, saída, reserva e ajuste conforme comandos existentes; histórico e identificações progressivos |
| Financeiro | Tipo de operação, descrição, valor, datas e vínculos exigidos | Explicar lançamento versus movimentação; contas, parcelas e baixas conforme operação; resumo financeiro contextual |
| Calculadora e rentabilidade | Entradas essenciais e resultado atual | Parâmetros técnicos, composição e histórico acessíveis; não alterar fórmulas nem referências salvas |
| Configurações e aparência | Grupo atual, dados essenciais e ação específica | Separar parâmetros da operação, equipe e identidade; prévia quando já disponível |
| Minha conta | Identificação e ações da conta | Campos sensíveis e feedback explícitos |

## Design e componentes

Decisão proposta pelo implementador: preservar identidade, fontes, paleta e base Radix atuais. Usar tokens semânticos e variantes shadcn existentes. Ajustar a composição dos componentes antes de criar novos estilos. Não trocar preset nem sobrescrever componentes em lote.

Usar FieldGroup/FieldSet e composição de Card onde adequado, compatibilizando o Field local para evitar quebra dos formulários atuais. Usar Tabs, Accordion, Sheet, Alert, Badge e componentes de menu conforme a necessidade. Consultar a documentação atual pelo CLI antes de implementar componentes; conferir os guias locais de Next.js antes de alterar código.

Proposta visual: texto dos controles e rótulos legível (aproximadamente 14 px no computador), títulos discretos, maior separação entre assuntos do que entre campos relacionados. Não compactar o sistema apenas reduzindo fonte. Área de toque adequada no celular e foco visível em todos os controles.

## Sequência e critérios de aceitação

1. Mapear formulários, schemas e ações por módulo; registrar essenciais, condicionais, opcionais e permissões.
2. Criar base comum de campo, seção, resumo e ações, com migração compatível.
3. Aplicar em todos os módulos em grupos revisáveis, começando por produtos e comércio e seguindo produção, estoque, financeiro e demais áreas.
4. Verificar fluxos representativos com dados existentes ou fixtures locais, sem efeitos em serviços externos.

Conferir navegador em 1366×768 e 1920×1080, celular em 390 px e zoom de 200%. Sem perda de campos, sobreposição de ações, rolagem horizontal da página ou armadilhas de foco. Tabelas extensas podem ter rolagem horizontal localizada.

Comparar antes/depois das principais tarefas: localizar obrigatórios, corrigir erro, salvar produto, editar orçamento, registrar produção, entrada de estoque e lançamento financeiro. Registrar redução de rolagem e navegação quando possível, sem inventar métricas. Campos obrigatórios devem estar sinalizados e não permanecer escondidos ao validar. Detalhes opcionais continuam editáveis e persistidos.

Executar typecheck, lint e testes relevantes existentes. Acrescentar testes de comportamento para obrigatoriedade condicional, abertura/foco de erros e preservação de dados onde a revisão introduzir esses comportamentos. Validar perfis ADMIN e OPERATOR e proteção contra envio duplicado.

## Decisões deixadas à implementação

Escolha exata de espaçamentos, larguras responsivas, ordem interna de campos relacionados e seleção das edições curtas que cabem em Sheet. Essas decisões devem respeitar as regras reais e os critérios acima. Uma ausência de suporte atual não autoriza criar uma nova regra de negócio.
