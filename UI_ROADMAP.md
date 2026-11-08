# Consolidação visual — diagnóstico e próximos passos

## Estado atual — revisão transversal de 08/11/2026

Base real reconferida: main **1.27.3**, `0a73e718ef994e7bd7868def8c2ce9d1a094bcda`. Fundação #53, piloto #54 e filtros #52 integrados, com Releases oficiais anteriores. As seções seguintes preservam o registro histórico; suas versões e estados de entrega não substituem esta conferência.

Implementado na branch `codex/revisao-transversal-design`: ChartStyle alinhado à preferência explícita/automática após reprodução; nomes acessíveis padrão de ações do Combobox; fixture e inventário transversal. Versão candidata única **1.27.4**, concorrente com outras PRs e sujeita a reconciliação. Abertura de PR solicitada após o fechamento da implementação; consultar o GitHub para o estado atual de revisão. Sem merge, Release ou implantação desta etapa.

Cobertura e aceite em [REVISAO-TRANSVERSAL.md](docs/design/REVISAO-TRANSVERSAL.md), com [inventário nominal](docs/design/REVISAO-TRANSVERSAL-CONSUMIDORES.json). Amostras de teclado/portais e quatro larguras validadas; zoom, leitor de tela, movimento reduzido ativo e estados completos continuam pendentes. Nenhum CSS removido sem equivalência. Próximos recortes: alvos móveis de Checkbox/Combobox, contraste de estados e paletas, zoom/overlays extensos e remoção por família com prova antes/depois.

**Integração conjunta bloqueada pela base:** #55 PDV, #56 produção/estoque, #57 planejamento, #58 clientes/negociações/solicitações, #59 financeiro/tributação e #60 login/catálogo permanecem abertas; rentabilidade/metas/recorrência tem entrega local sem commit. Não foram incorporadas. Antes de declarar a sequência homologada, revisar/integrar cada recorte com autorização própria, reconciliar versões e executar a matriz nos SHAs finais. Publicar imagem e implantar são etapas distintas, dependentes de autorização; nenhuma é inferida deste trabalho.

## Registro histórico das etapas anteriores
## Continuidade: rentabilidade, metas e recorrência

Recorte implementado em worktree nova sobre main 1.27.3. Critérios aplicados fora dos filtros recolhidos, subtotais cobertos explícitos, comparação com sinal explicado, tabelas nomeadas e receita local para fontes extensas/valores. Metas ausentes e simulação temporária mais claras; recorrência exibe filtro e amostra junto à sugestão. Domínio, consultas, fórmulas e formulários preservados. [Inventário, plano, evidências e limites](docs/design/RENTABILIDADE-METAS-RECORRENCIA.md). As etapas de financeiro, PDV, produção/estoque e planejamento de outras branches não foram incorporadas. Versão candidata única 1.27.4, sujeita à conciliação com main antes de futura PR/integração. Sem merge, Release ou implantação.
## Estado reconciliado em 07/11/2026

Main atual: **1.27.3**, SHA `0a73e718ef994e7bd7868def8c2ce9d1a094bcda`, conferida por fetch nesta continuidade. Fundação documental (1.27.1), piloto de produto (PR #54, 1.27.2) e filtros/tabelas comerciais (PR #52, 1.27.3) estão integrados. As referências abaixo a versões preparadas, ausência de PR/merge e backlog do PDV são registros históricos das etapas, não o estado atual. Merge não comprova implantação.

Etapa 4: recorte de composição do **PDV presencial**, autorizado no handoff e implementado em `codex/pdv-composicao`, versão preparada **1.27.4**. Ver [diagnóstico, alterações, evidências e limites](docs/design/PDV-PRESENCIAL.md). Commit e PR autorizados na continuidade. Sem expansão para outras telas e sem merge, Release ou implantação nesta etapa. Decisões de marca continuam abertas.

07/11/2026. Base inspecionada: main 1.27.0, SHA `a5805f40578a50b7007b4b10b55bf58c85e393d5`. A auditoria revisada de 07/11/2026 é evidência histórica externa; seus 25 testes e capturas não constituem uma nova homologação desta etapa. Não incorporar backups privados ao repositório.

## Etapa 1: contratos vigentes

Entregáveis: [DESIGN.md](DESIGN.md), [COMPONENTS.md](COMPONENTS.md), este diagnóstico e orientação de consulta em AGENTS.md; sincronização dos dois arquivos da skill shadcn já auditados. Sem alteração de runtime, dependências declaradas, banco ou migrations. Manutenção/documentação recebe PATCH único, sem merge, Release ou implantação inferidos.

A abordagem adotada registra o contrato real antes de migrar estilos. A alternativa de centralizar todas as variantes agora tem alcance transversal e exige matriz visual por consumidor; aplicar um preset invalidaria adaptações e preferências existentes. Nenhuma das duas pertence ao escopo aprovado.

## Sobreposições a resolver incrementalmente

| Achado                                                        | Decisão nesta etapa                                                                                                          | Gate para implementação futura                                                                   |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Button: alturas/cores em CVA e regras data-slot de design.css | Registrar ui/* como dono das variantes; compatibilidade continua no CSS                                                      | Comparar estilo computado em variantes, tamanhos e breakpoints; incluir loja, login e menu móvel |
| Campos: 36 px genéricos, 40 px administrativos e 44 px móveis | Preservar densidade atual; não remover por aparente repetição                                                                | Capturas e estados de Input, NativeSelect, InputGroup e tipos especiais                          |
| Nomes próximos entre tokens legados e utilities               | Documentar ponte existente: bg-muted usa store-muted e utilities accent usam store-accent; não há colisão direta demonstrada | Preservar aliases e inventariar por propriedade antes de renomear                                |
| Card e receitas: divisão de padding/geometria                 | Documentar composição instalada                                                                                              | Comparar shell, conteúdo e footer sem preenchimento duplicado                                    |
| ChartStyle usa .dark                                          | Registrar divergência potencial; sem correção alegada                                                                        | Fixture usando config.theme em data-theme explícito e automático                                 |
| Portais fora do ancestral com preferência local               | AppShell, ContextEditor e DashboardToolbar reaplicam tema nos seus overlays; primitivas não o fazem por si                   | Comparar popup com paleta personalizada administrativa e da loja                                 |
| AdminForm repete orientação, inclusive em filtros             | Manter comportamento; separar intenção no piloto                                                                             | Verificar validação nativa, revelação/foco e nenhuma perda de instrução essencial                |

Não foi removido CSS: a inspeção mostrou responsabilidades efetivamente diferentes e dependências de cascata. Remoção sem matriz não demonstra equivalência.

## Sequência e decisões abertas

1. Consolidar controles e tokens com o formulário de produto como primeiro consumidor delimitado. Inventariar usos antes de migrar cada papel; não converter todo o administrativo de uma vez.
2. Piloto futuro do produto: reduzir repetição entre guia geral, regras para salvar e obrigatoriedade; preservar campos essenciais, FormData, fotos/configurações, rascunhos, validação nativa, pending e cálculos. Descrever os estados antes de implementar; piloto autorizado e implementado nesta continuidade; ver [evidências](docs/design/PILOTO-PRODUTO.md).
3. Expansão autorizada e executada apenas para filtros/tabelas das listagens de orçamentos e vendas; ver [evidências](docs/design/FILTROS-TABELAS-COMERCIAL.md). Comercial/PDV, operação e financeiro/tributação/metas/recorrência permanecem para recortes futuros. Revalidar permissões, transições e idempotência nos fluxos afetados.
4. Remover CSS comprovadamente substituído; registrar evidências, versão e notas por PR. Responsabilidade por variante migra junto com evidência, não por reorganização de arquivos isolada.

Decisões do usuário ainda necessárias: eventual azul como padrão administrativo (sem sobrescrever preferências); direção visual de novos estados. O piloto delimitado foi autorizado no handoff. A skill frontend-design foi localizada na worktree antiga indicada pelo usuário, lida e copiada para .agents/skills/frontend-design nesta continuidade, com licença. Não foi aplicada nova direção de marca.

Já entregues na base e fora do backlog: reorganização inicial da navegação, sidebar com rolagem própria, prioridades do dashboard antes dos gráficos e formulários progressivos.

## Continuidade: clientes, negociações e solicitações

Recorte autorizado implementado sobre main 1.27.3, sem incorporar branches paralelas. Critérios aplicados permanecem visíveis; clientes mostram ambos contatos; negociações identificam próxima ação, pendências e orçamento principal; solicitações separam estado, recebimento e vínculo. Retorno dos detalhes preserva consulta/página e aceita somente a listagem correspondente. Componentes globais e regras comerciais preservados; receita local `relationship-reading`.

Evidências, inventário e limitações em [CLIENTES-NEGOCIACOES-SOLICITACOES.md](docs/design/CLIENTES-NEGOCIACOES-SOLICITACOES.md). Versão candidata única 1.27.4; criação de PR autorizada após entrega do diff, sem merge, Release ou implantação. Consultar o GitHub para o estado atual da revisão. Etapas de outras worktrees continuam independentes e não são consideradas integradas por este registro.

## Verificação e limites

Executados nesta worktree: 23 testes aprovados em seis arquivos (`app-version`, `ui-contracts`, `admin-form-fields`, `appearance-palettes`, `theme`, `admin-shell`), com pool threads e um worker. O teste app-version renderiza login, rodapé administrativo e atualizações para ADMIN/OPERATOR com a versão 1.27.1. O runner emitiu aviso jsdom de navegação entre documentos não implementada, sem falhas de teste.

Dependências do lock foram preparadas localmente com npm ci --ignore-scripts; nenhum manifesto de dependência foi atualizado. Não houve acesso a banco ou dados reais. Sem mudança de runtime, não há novas capturas, build de produção ou homologação integral de acessibilidade. Este resultado não substitui a matriz visual exigida para a futura migração de CSS.

Conferências adicionais: 14 links locais válidos nos documentos centrais/AGENTS; Prettier dos novos documentos e releases aprovado; ESLint de releases aprovado; git diff --check sem erros. Hashes dos dois arquivos da skill idênticos à cópia local auditada. Main consultada novamente ao final: permanece em 1.27.0 no mesmo SHA. Versão preparada nesta worktree: 1.27.1, sem commit, PR, merge, Release ou implantação.

## Continuidade: piloto de produto

Etapa 2 executada na branch codex/piloto-produto, incluindo os documentos e orientações da etapa 1 sem modificar a origem. O incremento preparado permanece único em 1.27.1, agora com nota do piloto. Ver [inventário, decisões e validação](docs/design/PILOTO-PRODUTO.md). A expansão para outras telas continua fora do escopo; sem merge, Release ou implantação.

## Continuidade: filtros e tabelas comerciais

Etapa 3 na branch `codex/filtros-tabelas-comercial`, worktree nova baseada em main. Diff rastreado e documentos/skills pertinentes do piloto conciliados com bases idênticas; origem preservada sem checkout/reset/stash/commit. Orçamentos e vendas mostram critérios aplicados, contagem, tabelas nomeadas e vazio contextual. Receitas restritas aos dois painéis; nenhum componente global de tabela/filtro/paginação mudou. Proteções de rascunho e fluxos de criação/edição permanecem nos consumidores anteriores.

Validação conjunta: 71 testes em 18 arquivos, tipos e lint aprovados. Inspeção sintética em 320/390/768/1440 px; limitações de interação do navegador registradas em [FILTROS-TABELAS-COMERCIAL.md](docs/design/FILTROS-TABELAS-COMERCIAL.md). Versão única 1.27.1; sem commit, PR, merge, Release ou implantação. Próximo passo é avaliar este recorte; não há expansão automática para o restante do aplicativo.

## Continuidade: login e catálogo público

Recorte de 08/11/2026 na branch `codex/login-catalogo-publico`, baseado em main 1.27.3 (`0a73e718ef994e7bd7868def8c2ce9d1a094bcda`). Login com linguagem voltada à operação atual e feedback de entrada; catálogo com busca junto aos resultados, filtros GET preservados ao recolher, vazio factual e composição móvel/escura do mascote original. Sem alteração de paletas, variantes globais, dados ou regras comerciais. Inventário, capturas e limites em [LOGIN-CATALOGO-PUBLICO.md](docs/design/LOGIN-CATALOGO-PUBLICO.md).

A inspeção sintética não homologa autenticação/persistência real nem teclado integral. Próxima etapa: revisão transversal de acessibilidade/responsividade/temas/portais e remoção de CSS somente com equivalência demonstrada. PRs #55–#58 seguem separadas e devem ser conciliadas com main antes de futura integração; versão candidata deste recorte 1.27.4. Sem merge, Release ou implantação inferidos.
## Continuidade: financeiro e tributação

08/11/2026. Recorte autorizado executado sobre main 1.27.3 (`0a73e718ef994e7bd7868def8c2ce9d1a094bcda`), sem incorporar as PRs abertas #55/#56/#57. Critérios financeiros permanecem visíveis com o painel recolhido; títulos, movimentos realizados e projeção identificam o significado das datas, valores e estados vazios. O detalhe informa leitura pendente, bloqueia consultas concorrentes e devolve foco à origem. Previsão tributária destaca cobertura incompleta e fontes/vigência do perfil mensal, sem substituir snapshots nem misturar estimativa com pagamento.

Receita local `.finance-reading`, Roboto e tokens existentes; sem mudança global de variantes/paletas, regras de domínio, permissões, endpoints, banco ou formulários de operação. Configurações tributárias inspecionadas e preservadas. [Inventário, decisões, validação e limites](docs/design/FINANCEIRO-TRIBUTACAO.md). Versão candidata 1.27.4, sujeita à ordem real de integração. Sem merge, Release ou implantação autorizados. Metas e recorrência não foram incluídas neste recorte.
## Continuidade: planejamento

Recorte executado na worktree 67ba, branch `codex/planejamento-composicao`, sobre main 1.27.3. Fila e contexto de lote receberam hierarquia local, filtros recolhíveis com resumo persistente e distinção entre sequência proposta e previsões da fila registrada. Sugestões explicam que a revisão não confirma um lote. Calendário, simulações e consumidores comerciais foram inventariados e preservados. Sem mudança no motor, consultas, comandos, temas ou marca.

Ver [inventário, decisões, evidências e limites](docs/design/PLANEJAMENTO.md). Versão única preparada 1.27.4, sujeita à conciliação antes de futura integração: PRs #55/#56 continuam abertas na conferência desta etapa. Entrega como diff revisável; sem commit/PR próprios, merge, Release ou implantação. Não tratar os recortes dessas PRs como integrados.
## Continuidade: produção e estoque

Recorte incremental autorizado e implementado na worktree 5661, sobre main 1.27.3 (`0a73e71`), branch `codex/producao-estoque-composicao`. [Relatório do recorte](docs/design/PRODUCAO-ESTOQUE.md) registra inventário, decisões, testes e limites. Ordens distinguem metas e quantidades registradas por item; materiais/reservas mantêm unidades e saldos legíveis; contexto aplicado permanece visível com filtros recolhidos; recebimento físico e conferência, separação e entrega têm rótulos distintos.

Sem alterações em domínio, consultas, endpoints, permissões, tokens, paletas ou componentes globais. Rascunhos, recuperação, concorrência e bloqueio de reenvio mantidos. CSS novo delimitado às duas rotas. Fora deste recorte continuam planejamento, financeiro e demais áreas administrativas.

Validação: 91 testes em 21 arquivos, tipos, lint e build aprovados; revisão independente com P2 corrigido e teste de regressão. Prévia sintética em 320/390/768/1440, claro/escuro, sem acesso ao banco. Interação manual completa e persistência não homologadas; detalhes no relatório. Versão única preparada 1.27.4, sem commit/PR/merge/Release/implantação deste recorte. PDV na PR #55 ainda aberta na última conferência; conciliar versão conforme main real antes de futura integração.

Em 08/11/2026 o usuário autorizou commit e abertura da PR de produção/estoque. Main permanece 1.27.3 e PDV #55 aberta; versão proposta deste recorte segue 1.27.4, sujeita à conciliação antes da integração. Estado de PR deve ser consultado no GitHub; merge, Release e implantação continuam sem autorização.
