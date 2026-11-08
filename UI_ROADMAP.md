# Consolidação visual — diagnóstico e próximos passos

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

## Verificação e limites

Executados nesta worktree: 23 testes aprovados em seis arquivos (`app-version`, `ui-contracts`, `admin-form-fields`, `appearance-palettes`, `theme`, `admin-shell`), com pool threads e um worker. O teste app-version renderiza login, rodapé administrativo e atualizações para ADMIN/OPERATOR com a versão 1.27.1. O runner emitiu aviso jsdom de navegação entre documentos não implementada, sem falhas de teste.

Dependências do lock foram preparadas localmente com npm ci --ignore-scripts; nenhum manifesto de dependência foi atualizado. Não houve acesso a banco ou dados reais. Sem mudança de runtime, não há novas capturas, build de produção ou homologação integral de acessibilidade. Este resultado não substitui a matriz visual exigida para a futura migração de CSS.

Conferências adicionais: 14 links locais válidos nos documentos centrais/AGENTS; Prettier dos novos documentos e releases aprovado; ESLint de releases aprovado; git diff --check sem erros. Hashes dos dois arquivos da skill idênticos à cópia local auditada. Main consultada novamente ao final: permanece em 1.27.0 no mesmo SHA. Versão preparada nesta worktree: 1.27.1, sem commit, PR, merge, Release ou implantação.

## Continuidade: piloto de produto

Etapa 2 executada na branch codex/piloto-produto, incluindo os documentos e orientações da etapa 1 sem modificar a origem. O incremento preparado permanece único em 1.27.1, agora com nota do piloto. Ver [inventário, decisões e validação](docs/design/PILOTO-PRODUTO.md). A expansão para outras telas continua fora do escopo; sem merge, Release ou implantação.

## Continuidade: filtros e tabelas comerciais

Etapa 3 na branch `codex/filtros-tabelas-comercial`, worktree nova baseada em main. Diff rastreado e documentos/skills pertinentes do piloto conciliados com bases idênticas; origem preservada sem checkout/reset/stash/commit. Orçamentos e vendas mostram critérios aplicados, contagem, tabelas nomeadas e vazio contextual. Receitas restritas aos dois painéis; nenhum componente global de tabela/filtro/paginação mudou. Proteções de rascunho e fluxos de criação/edição permanecem nos consumidores anteriores.

Validação conjunta: 71 testes em 18 arquivos, tipos e lint aprovados. Inspeção sintética em 320/390/768/1440 px; limitações de interação do navegador registradas em [FILTROS-TABELAS-COMERCIAL.md](docs/design/FILTROS-TABELAS-COMERCIAL.md). Versão única 1.27.1; sem commit, PR, merge, Release ou implantação. Próximo passo é avaliar este recorte; não há expansão automática para o restante do aplicativo.

## Continuidade: produção e estoque

Recorte incremental autorizado e implementado na worktree 5661, sobre main 1.27.3 (`0a73e71`), branch `codex/producao-estoque-composicao`. [Relatório do recorte](docs/design/PRODUCAO-ESTOQUE.md) registra inventário, decisões, testes e limites. Ordens distinguem metas e quantidades registradas por item; materiais/reservas mantêm unidades e saldos legíveis; contexto aplicado permanece visível com filtros recolhidos; recebimento físico e conferência, separação e entrega têm rótulos distintos.

Sem alterações em domínio, consultas, endpoints, permissões, tokens, paletas ou componentes globais. Rascunhos, recuperação, concorrência e bloqueio de reenvio mantidos. CSS novo delimitado às duas rotas. Fora deste recorte continuam planejamento, financeiro e demais áreas administrativas.

Validação: 91 testes em 21 arquivos, tipos, lint e build aprovados; revisão independente com P2 corrigido e teste de regressão. Prévia sintética em 320/390/768/1440, claro/escuro, sem acesso ao banco. Interação manual completa e persistência não homologadas; detalhes no relatório. Versão única preparada 1.27.4, sem commit/PR/merge/Release/implantação deste recorte. PDV na PR #55 ainda aberta na última conferência; conciliar versão conforme main real antes de futura integração.

Em 08/11/2026 o usuário autorizou commit e abertura da PR de produção/estoque. Main permanece 1.27.3 e PDV #55 aberta; versão proposta deste recorte segue 1.27.4, sujeita à conciliação antes da integração. Estado de PR deve ser consultado no GitHub; merge, Release e implantação continuam sem autorização.
