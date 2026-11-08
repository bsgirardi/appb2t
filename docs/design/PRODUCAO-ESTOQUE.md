# Produção e estoque — composição incremental

07/11/2026 · base origin/main `0a73e71`, versão 1.27.3. PDV na PR #55 aberta na inspeção inicial; nenhum diff da origem foi copiado.

## Direção e limites

Recorte autorizado no handoff: listagens e contexto de ordens, materiais, reservas, recebimentos e peças prontas. Preservar consultas, comandos, unidades, arredondamentos, permissões, rascunhos, resposta incerta e concorrência. Sem banco, migrations, novas bibliotecas, merge ou implantação.

Composição local sobre shadcn instalado: identificação antes das quantidades, planejamento separado da execução registrada, disponibilidade distinta de reserva e entrega. Alternativa de tabela única demandaria muitas colunas e duplicação móvel; redesenhar componentes globais ampliaria o alcance. Manter superfícies neutras e informação alinhada à esquerda, quantidades legíveis, ações explícitas e filtros aplicados fora do painel recolhível.

Roboto e tokens vigentes, sem novos valores de cor. Referências oficiais preservadas: azul #0066CC, laranja #FF7A00, verde #4CAF33, apoio #0D2B52, cinza #E9EDF2 e fundo #F8FAFC. Esses valores não substituem Aparência na gestão. Nenhuma nova direção de marca.

Arranjo: `visão / filtros → contexto aplicado → ações → identificação + saldos + ação contextual → paginação`. Em celular, saldos empilham e nomes/ações quebram; sem métricas ou cartões coloridos novos.

## Plano de implementação

- [x] Contexto aplicado nas duas rotas: critérios do servidor, visão e total; GET explícito, sem alterar parâmetros/consultas/paginação. Testar critérios versus rascunho e contexto de URL.
- [x] Ordens e peças prontas: separar quantidades por item e plano/execução; conservar cálculo de pendência existente e transições. Testar valores, inventário desconhecido e retorno/foco.
- [x] Estoque: saldos com rótulos consistentes, unidades em reservas, estado e ação seguinte em recebimentos, contexto de consumo/liberação. Testar permissões, rede, pending e reenvio com testes existentes.
- [x] Prévia sintética com componentes reais; 320/390/768/1440, claro/escuro, nomes longos, foco e overflow. Registrar evidências e limites.
- [x] Conferir main, incremento PATCH único, releases/manifestos e APP_VERSION; testes pertinentes, tipos/lint/build; revisão final. Entregar diff revisável sem integrar/publicar.

Foco de revisão: filtro recolhido não perde edição; inventário desconhecido não vira zero; peça boa não significa entrega; reserva não significa consumo; OP concluída não significa ausência de ressalvas de custo. Mudanças em shared.tsx de estoque devem validar MovementForm, OpeningForm e SaleStock além do painel.

## Validação e entrega

Dependências preparadas pelo lock com scripts desabilitados, sem alteração de dependências. O instalador reportou 9 vulnerabilidades (8 moderadas e 1 alta); nenhum update automático aplicado.

### Inventário e contratos

| Consumidor                    | Mudança                                                                        | Preservado                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Rotas produção/estoque        | Contexto aplicado fora dos filtros recolhidos, visão e total; GET explícito    | Esquemas, consultas, argumentos, parâmetros de paginação e contexto saleId/receiptId                   |
| OperationListContext          | Novo componente consumido somente por essas duas rotas                         | Recebe critérios aplicados do servidor, não o rascunho dos controles                                   |
| ProductionPanel / OrderDetail | Quantidades por item; meta, boas, pendentes, falhas e canceladas com unidade   | Mesma fórmula de pendência já usada no OrderSummary; sem mudar demanda, produção parcial ou transições |
| OrderSummary                  | Totais registrados opcionais para evitar duplicação com as linhas              | Consumidores são somente ProductionPanel e OrderDetail; padrão anterior mantido na API                 |
| FinishedPanel                 | Saldos legíveis e unidade por origem; inventário desconhecido explícito        | Quantidades e permissões de abertura/ajuste intactas                                                   |
| DeliveryForm                  | Vendidas, entregues e separadas para entrega em rótulos distintos, com un      | Soma anterior de commitments.remaining; mesma serialização por origem e confirmação                    |
| StockSummary                  | Físico/reservado/disponível em dl; desconhecido distinto de zero               | Consumido apenas no StockPanel, em lista/detalhe; valores do servidor sem conversão                    |
| StockPanel                    | Reservas com unidades em todos os saldos; orientação para recebimento pendente | Mesmos botões, permissões, carregamento, erro, refresh e retorno/foco                                  |
| ReservationAction             | Resumo contextual explica diferença entre consumir e liberar                   | Comando, chave de operação, versão, FormData, conversão e validação inalterados                        |

CSS adicionado somente sob `.admin-ui .operation-composition`, classe das duas rotas (e prévia sintética). Não houve alteração em ui/*, tokens, variantes, paletas, shell, sidebar, domínios, endpoints, consultas, banco ou migrations. Nenhum CSS existente removido. As funções utilitárias de shared.tsx de estoque não foram modificadas.

### Testes e revisão

- Sete testes novos: quantidades por item, unidades das reservas e resumo de ação, recebimento físico versus conferência por ADMIN, filtros aplicados versus edição, URLs e contexto, critérios de ordens não aplicáveis a peças prontas, fallback inválido de reposição. Asserções de mudança observadas falhando antes da implementação/correção e passando depois.
- Rodada final: **88 testes em 20 arquivos**, mais 3 testes de appearance-palettes em rodada complementar: **91 testes aprovados em 21 arquivos distintos**, com threads e um worker. Inclui production-stock-composition, operation-route-context, production-ui, stock-ui, operations-panels, operations-order-summary, operation-workspace, operation-results, admin-operations-ux, admin-form-fields, admin-filter-panel, ui-contracts, appearance-palettes, theme, theme-preference, admin-shell, app-version, production-states, production-quantities, stock-quantities e stock-valuation. A seleção inicial usou extensão incorreta para appearance-palettes; conferida com vitest list e executada em rodada complementar. Os quatro testes de theme-preference também foram repetidos, sem somar novamente à contagem. Aviso jsdom de navegação entre documentos não implementada, sem falhas.
- Cobertura existente preserva rascunhos, chave de retry após falha e resposta incerta, refresh de versão, bloqueio de duplo envio, revelação de campos inválidos, carregamento/erros dos detalhes, ausência de custos e ações administrativas para operador. Sem testar persistência real.
- Typecheck, lint integral e build de produção aprovados; 83 páginas geradas e rotas dinâmicas mantidas. Build inicial aprovado; uma repetição falhou porque o arquivo de log foi colocado dentro de .next e o próprio build tentou removê-lo (EBUSY). Log movido para diretório temporário, nova execução aprovada sem mudar configuração/produto.
- Revisão independente estática encontrou um P2: badge de disponível negativo mesmo após fallback de filtros inválidos. Corrigido para derivar de filter.negative, sem mudar consulta; teste RED → GREEN e rodada de 88 testes após correção. Sem achados restantes P0/P1 ou menores pendentes reportados pelo revisor.
- app-version confirma versão dos dois manifestos, APP_VERSION, login, rodapé administrativo e histórico para ADMIN/OPERATOR. git diff --check aprovado.

### Prévia e limites

`tests/operations-composition-preview.html` usa componentes reais, fixtures de operações existentes, dados adicionais sintéticos e adapters de navegação/API. Comandos bloqueados no adapter; sem sessão artificial ou conexão ao backend. Critérios e navegação da prévia são ilustrativos; URLs e filtros das rotas reais são cobertos pelos testes de rota.

Inspeção: ordens 1440 claro e 390 claro; reservas 320 escuro; materiais 390 claro; peças prontas 390 escuro; reposição 768 escuro; recebimentos 1440 escuro; vazio filtrado 390 claro. Roboto confirmada no estilo computado. Largura documental sem exceder viewport: 305/320, 375 ou 390/390, 768/768 e 1440/1440 (varia com barra vertical). Saldos mantêm unidades e quebram nomes longos; estoque negativo tem mensagem além de cor. Botões visíveis amostrados em 390 têm 44 px ou mais. Sem erros/warnings de console no desktop final inspecionado.

Foco de Receber compra mostrou anel semântico de 3 px ao direcionar teclado. A ferramenta não expandiu o painel ao clicar nem avançou o foco com Tab; portanto abertura visual, navegação sequencial integral, retorno manual e ações dos formulários não foram homologados no navegador. Testes de componentes cobrem expansão/recolhimento, preservação, envio e retorno. Não há homologação com leitor de tela, zoom, tema automático ou paleta personalizada nesta etapa; tokens e preferências não mudaram. Não foram executadas integrações com banco, operações reais, vendas, lançamentos, criação de usuários/sessões ou movimentações.

Capturas sintéticas fora do repositório, em `C:/Users/Administrador/.codex/visualizations/2026/11/08/01a1b897-707f-7c31-969b-d9d082ba914c`: reservas-320-escuro.jpg, materiais-390-claro.jpg, pecas-390-escuro.jpg, recebimentos-1440-escuro.jpg e vazio-390-claro.jpg. Capturas iniciais reutilizavam breadcrumb de catálogo do adapter anterior; adapter próprio corrigido para operação/estoque/produção, sem mudar shell real.

### Estado da entrega

Branch `codex/producao-estoque-composicao`, worktree 5661; branch antiga de nome semelhante preservada. Versão PATCH única preparada **1.27.4**, notas em português e manifestos sincronizados. Última conferência por fetch: main `0a73e718ef994e7bd7868def8c2ce9d1a094bcda`, versão 1.27.3. PR #55 do PDV continua OPEN, mergedAt=null; não copiar diff, presumir integração ou reservar 1.27.5. Se integrar primeiro, conciliar a mesma entrega antes do merge, sem segundo incremento por commit.

Diff revisável **sem commit ou PR deste recorte**, sem merge, Release ou implantação. Versão operacional não foi consultada nem alterada. Nenhuma mensagem enviada a terceiros. Publicação/distribuição não autorizada nesta tarefa.

### Preparação da PR — 08/11/2026

Após solicitação expressa do usuário para abrir PR, main reconferida: permanece em 1.27.3 no SHA 0a73e718ef994e7bd7868def8c2ce9d1a094bcda; PDV #55 permanece aberta. Manter o incremento único 1.27.4 desta entrega e conciliar conforme a ordem real de integração. O estado sem commit/PR acima é o registro histórico do fechamento inicial; o estado atual deve ser consultado no GitHub. Abertura da PR não autoriza merge, Release ou implantação.
