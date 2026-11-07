# Piloto: cadastro e edição de produto

07/11/2026 · branch `codex/piloto-produto` · base main 1.27.0, SHA `a5805f40578a50b7007b4b10b55bf58c85e393d5`.

## Continuidade e escopo

DESIGN.md, COMPONENTS.md, UI_ROADMAP.md, orientação AGENTS e os dois arquivos atualizados da skill shadcn foram trazidos da etapa anterior sem escrever na origem. Os manifestos e a entrada 1.27.1 foram reaproveitados para uma futura entrega conjunta, sem segundo incremento. A skill frontend-design e sua licença foram copiadas da localização indicada no handoff; não há dependência documental invisível da worktree antiga.

O piloto reduz repetição e aplica os contratos instalados aos dados principais. Não propõe nova marca. Paletas configuradas, Roboto na gestão, Poppins na loja, temas, cálculos, permissões e fluxo de envio não foram alterados. Não remove CSS compartilhado, não instala componentes nem troca primitivas.

## Inventário observado e responsabilidades

| Consumidor real                | Controles e composição                                                                               | Responsabilidade / decisão                                                                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dados principais               | Field/Input, TextareaField/Textarea, FieldGroup, Card                                                | Nome e preço mantêm Field; descrição e pagamento migram do markup manual para TextareaField. Label, obrigatório e erro passam pelo mesmo contrato local. IDs, names, required, maxLength, valores e eventos preservados. |
| Ações                          | Button outline/sm e submit, FormActions, useDocumentExit                                             | Sugestão continua opt-in junto ao preço; salvar/pending/disabled e proteção de saída mantidos. Nenhuma variante nova.                                                                                                    |
| Fotos / coleções / ativo       | ProductGalleryEditor: Field file, Button, imagens; Checkbox e Label nativos                          | Upload, limites, ordenação, capa e requisito de uma foto preservados; detalhes permanecem montados.                                                                                                                      |
| Preço público / imagem de kit  | NativeSelect e option nativos, Label                                                                 | Manter tipos nativos, seleção e preço interno. Sem conversão para Select customizado.                                                                                                                                    |
| Compra / quantidades           | CheckoutOfferFields e QuantityTierEditor: Field, NativeSelect, Checkbox e Button                     | Contratos de entrega, pagamento e faixas intactos; agrupamento e validação continuam nos editores.                                                                                                                       |
| Personalização / venda / busca | ProductConfigurationEditor, ProductCommercialEditor, Field, Textarea, NativeSelect, Checkbox, Button | Seções opcionais continuam progressivas. Textarea manual de SEO permanece fora da migração dos campos principais; não alegar conversão integral.                                                                         |
| Produção / ficha por lote      | ProductCalculationFields, ProductPricingEditor, Field, NativeSelect, Button, Card                    | Fórmulas, ficha aplicada, seleção de referências, erros e parâmetros preservados. A instrução de tempo maior que zero e exemplo de minutos continuam próximos dos campos.                                                |
| Resumo / prévia / mensagens    | TaskLayout, CostBreakdown ou PricingResult, details, Image, Notice/Alert                             | Resumo e prévia acompanham o rascunho. Notice conserva alert/status. Conteúdo opcional não passa a montagem condicional.                                                                                                 |

`globals.css` mantém estrutura/fieldset/min-width; `admin.css` mantém densidade e layout responsivo; `design.css` continua a ponte de estados e compatibilidade. A nova receita `.admin-ui .product-essential-fields` define apenas coluna, gap de 16 px e margem dos campos diretos. Largura integral favorece textos de até 5000/1000 caracteres; preço e sugestão ficam consecutivos. Estados, tamanhos de controle e paleta continuam com ui/* e CSS existente. Não foi demonstrada equivalência transversal suficiente para remover os overrides antigos, portanto nenhum foi removido.

## Instruções: antes e depois

Antes havia guia geral do AdminForm e um segundo parágrafo enumerando nome, descrição, pagamento, preço, fotos e produção, repetindo a explicação de “Obrigatório”. Descrição e pagamento eram required, mas não exibiam a indicação visual dos outros Field.

Agora há uma orientação contextual: preencher os campos “Obrigatório”, adicionar pelo menos uma foto e conferir produção. AdminForm aceita `requiredGuide={false}`; padrão true preserva outros consumidores. Os quatro campos principais têm indicação consistente. Requisitos de foto e produção continuam nas seções correspondentes; o texto junto à ação ainda explica quando o preço será publicado. Não há alteração da validação: ProductForm continua noValidate com schema de domínio, e AdminForm mantém revelação/foco de erros e eventos nativos.

## Evidências e limites

Teste antes da implementação: dois testes novos falharam pelos motivos esperados (guia duplicado e opção ainda não implementada). Após a composição, ambos passaram. A revisão independente do diff não encontrou regressões e repetiu os 20 testes de produto/campos.

Inspeção no servidor Vite existente, exclusivamente com fixtures sintéticas, sem banco, login real ou sessão artificial na aplicação operacional:

- Desktop: 1440 px claro e 1280 px escuro automático; resumo ao lado e ação próxima à tarefa. Em 1440 px, campos principais com 791 px e fonte computada Roboto; sem overflow horizontal.
- Celular: 390 × 844 px claro e escuro explícitos; labels, indicadores e orientação quebram dentro da largura. Descrição de 1070 caracteres usa rolagem interna; Tab da descrição avança ao pagamento com foco visível e sem overflow da página.
- Erro de produção: horas reduzidas a zero, seção recolhida e Salvar. Seção reabriu e foco foi ao campo Horas, com mensagem local; descrição de 1070 caracteres e preço 48.19 preservados. Sem necessidade de backend.
- Ao clicar Voltar com rascunho, o diálogo nativo de confirmação bloqueou a ferramenta de inspeção (timeout); a conclusão manual desse diálogo não foi homologada. Teste automatizado cobre recusar saída preservando texto e confirmar saída chamando onCancel.

Capturas locais entregues fora do repositório: produto-desktop-claro.png, produto-celular-claro.png, produto-celular-escuro.png e produto-erro-producao.png na pasta de visualizações deste chat. Não contêm dados reais. Inspeção não equivale a homologação de persistência, leitor de tela, zoom ou matriz transversal de loja/login/portais. 320/768 px não foram inspecionados nesta rodada; nenhum componente de portal ou CSS global foi alterado.

Verificação final: **46 testes aprovados em 11 arquivos**, cobrindo produto, revisão do fluxo, ficha de preço, requisição/FormData, galeria, campos, contratos, versão, paletas, tema e shell. Typecheck, ESLint dos arquivos TypeScript alterados e diff --check aprovados. O teste de versão renderiza login, rodapé e atualizações para ADMIN/OPERATOR usando 1.27.1. Houve aviso jsdom de navegação não implementada, sem falha. Não foi executado build de produção nem teste com banco.

Preparado para revisão em PR, com versão única 1.27.1. Sem merge, Release ou implantação. Main reconferida antes da abertura: permanece no SHA base 1.27.0; conferir novamente antes da futura integração.
