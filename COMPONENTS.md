# Contratos de componentes APP B2T

Contrato vigente · 07/11/2026. Ler com [DESIGN.md](DESIGN.md) e a [skill local shadcn](.agents/skills/shadcn/SKILL.md). O código instalado é a fonte da API; exemplos upstream orientam composição, mas não autorizam sobrescrever adaptadores locais.

## Base e inventário

Configuração new-york/slate, Tailwind v4, RSC e Lucide; aliases `@/components/ui` e `@/lib/utils`. A base principal é Radix; Combobox usa Base UI. Preservar `asChild` em componentes Radix e `render` quando requerido pela API Base UI. Não trocar primitivas nem instalar todo o catálogo.

Módulos instalados em `src/components/ui`: accordion, alert, badge, breadcrumb, button, card, chart, checkbox, collapsible, combobox, dialog, empty, field, input-group, input, label, native-select, pagination, separator, sheet, sidebar, skeleton, table, tabs, textarea, toggle-group e toggle. Licença preservada em LICENSE.md. Switch, Drawer, AlertDialog, DropdownMenu, Tooltip e Toast não são contratos instalados: avaliar necessidade antes de adicionar/importar.

## APIs e exceções locais

| Família                        | Contrato atual                                                                                                                      | Preservar / verificar ao alterar                                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                         | variant: default, destructive, outline, secondary, ghost, link; size: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg; asChild | Props nativas e data-slot/variant/size. Definir type="button" para ações internas sem submit; loading composto pelo consumidor, sem isPending/isLoading                               |
| Input / Textarea               | Props HTML, estilos semânticos e aria-invalid                                                                                       | name, value/defaultValue, required, limites, tipos especiais, ref e disabled conforme API local; não converter números/datas por estética                                             |
| Field / TextareaField          | Adaptadores locais: label obrigatório; hint, error e props nativas; Field também suffix                                             | Id explícito ou gerado, Label associado, descrições externas acumuladas com ajuda/erro, data-invalid/data-disabled; não substituir pela API composicional upstream                    |
| FieldGroup                     | Div com role=group, data-slot e props HTML                                                                                          | Agrupamento não substitui label de cada campo ou fieldset de opções relacionadas                                                                                                      |
| NativeSelect                   | select nativo; NativeSelectOption e NativeSelectOptGroup                                                                            | options nativas, vazio required, name/FormData e fieldset disabled; não migrar automaticamente para Select customizado                                                                |
| Checkbox                       | input type=checkbox nativo                                                                                                          | checked/defaultChecked, name/value, evento nativo; desmarcado/disabled ausentes de FormData; não trocar onChange por onCheckedChange                                                  |
| Combobox                       | Primitivas Base UI, popup em portal e InputGroup                                                                                    | Valor, busca, ausência de resultados, teclado, name/serialização de cada uso e paleta do portal; não assumir equivalência com select nativo                                           |
| Card                           | Card com asChild; Header/Title/Description/Content/Footer                                                                           | Preservar form/section/article do consumidor. Conteúdo não tem padding próprio; shell e CSS local também participam da geometria                                                      |
| Badge                          | default, secondary, destructive, outline                                                                                            | Renderiza div; não há variantes success/warning/info hoje. Não inventar props nem usar secondary como sinônimo de sucesso                                                             |
| Notice / Alert                 | Notice kind error/success/info; Alert default/destructive                                                                           | Notice error usa role=alert; demais role=status. Success/info usam Alert default: nome do kind não promete uma paleta própria                                                         |
| Dialog / Sheet                 | Composição Radix e portal                                                                                                           | Title acessível, descrição quando necessária, abertura por teclado, foco e retorno; consumidores como AppShell e ContextEditor reaplicam tema; primitivas não o fazem automaticamente |
| Sidebar                        | Estrutura local fixa + Sheet móvel                                                                                                  | Navegação por papel, rolagem própria, fechamento/Escape e retorno ao disparador; sem introduzir cookies/recolhimento por atualização upstream                                         |
| Tabs / Accordion / Collapsible | Composição instalada                                                                                                                | Trigger dentro de List/estrutura da primitiva; teclado e aria-expanded. Verificar montagem/preservação de conteúdo antes de mover rascunhos                                           |
| Table / Pagination             | Primitivas locais, contexto no consumidor                                                                                           | Região rolável nomeada e acessível, cabeçalhos, valores monetários, filtros e retorno; não trocar motor de tabela por estética                                                        |
| Empty / Skeleton               | Componentes instalados para vazio/carregamento                                                                                      | Distinguir vazio, erro, carregando e indisponível; manter dimensões previsíveis                                                                                                       |
| Chart                          | Wrapper de Recharts e configuração local                                                                                            | Unidade, período, zero vs indisponível e alternativa legível; nesta branch config.theme segue data-theme na raiz e preferência automática sem atributo; validação em REVISAO-TRANSVERSAL.md |

## Formulários administrativos

`src/components/admin/admin-form.tsx` mantém form nativo, encadeia onInvalidCapture/onSubmitCapture e revela/foca campos inválidos por `form-errors.ts`. A orientação de obrigatoriedade continua habilitada por padrão; `requiredGuide={false}` permite ao consumidor fornecer uma orientação contextual única. O piloto de produto e os filtros opcionais de QuotePanel/SalePanel usam essa opção. A opção não chega ao DOM e não altera validação ou eventos.

Nas duas listagens comerciais, `AppliedListFilters` descreve apenas os filtros recebidos da consulta, sem observar o rascunho dos controles. `commercial-list` delimita a receita de nomes longos, links de documentos e valores tabulares; Table/FilterPanel/Pagination permanecem inalterados. ListFeedback tem somente QuotePanel/SalePanel como consumidores e compõe Empty com as ações anteriores. Inventário e limites em [FILTROS-TABELAS-COMERCIAL.md](docs/design/FILTROS-TABELAS-COMERCIAL.md).

`FormSection` usa section ou details/summary, mantém filhos e abre se hasErrors. Não substituir por montagem condicional que descarte estado. `FormActions` organiza ações; não implementa submissão, permissões ou bloqueio de repetição. FormData, action, validação de domínio, rascunhos, pending/disabled e chaves de idempotência permanecem sob responsabilidade dos fluxos existentes.

InputGroup deve usar seus controles e addons próprios. Em novos formulários, reutilizar Field/FieldGroup locais; não copiar exemplos de FieldLabel/FieldSet ausentes para o aplicativo sem conciliar APIs. Inputs hidden, impressão e details/summary existentes são exceções deliberadas documentadas na revisão shadcn.

## Matriz de revisão por mudança

| Mudança             | Evidência necessária                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Campo / seleção     | FormData, required vazio, erro associado, disabled em fieldset, foco e rascunho                              |
| Ação                | Nome acessível, pending com rótulo preservado, prevenção de reenvio, permissões, teclado                     |
| Variante / token    | Estado normal/hover/foco/selecionado/disabled/erro; temas explícitos e automático; paleta personalizada      |
| Overlay             | Tema no DOM portado, Title, Escape, foco inicial e retorno; não criar z-index no consumidor                  |
| Receita / densidade | 320/390/768/1440 px, texto longo, zoom e ausência de overflow da página; rolagem interna da tabela permitida |

Testes existentes úteis: `ui-contracts`, `admin-form-fields`, `appearance-palettes`, `theme`, `theme-preference`, `admin-shell`, `dashboard-ui` e `app-version` em tests/unit. Escolher os afetados, sem declarar homologação transversal a partir de fixtures.

## Atualização upstream

Consultar MCP oficial e CLI/docs da versão utilizada antes de modificar componentes. Comparar dry-run/diff e preservar os contratos acima; não aplicar preset, overwrite ou biblioteca diferente por inferência. Skill sincronizada da fonte `shadcn-ui/ui`, revisão `42f3bb63b46a69e52a24bd005cdc9ec15ba7a7b9`: alterações importadas nesta etapa apenas em SKILL.md e rules/chat.md, a partir da cópia local auditada. Nenhum componente de chat foi adicionado.
