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
2. Piloto futuro do produto: reduzir repetição entre guia geral, regras para salvar e obrigatoriedade; preservar campos essenciais, FormData, fotos/configurações, rascunhos, validação nativa, pending e cálculos. Descrever os estados antes de implementar; aprovação do piloto continua pendente.
3. Expandir somente após aceite para tabelas/filtros, comercial/PDV, operação e financeiro/tributação/metas/recorrência. Revalidar permissões, transições e idempotência nos fluxos afetados.
4. Remover CSS comprovadamente substituído; registrar evidências, versão e notas por PR. Responsabilidade por variante migra junto com evidência, não por reorganização de arquivos isolada.

Decisões do usuário ainda necessárias: eventual azul como padrão administrativo (sem sobrescrever preferências); direção visual de novos estados; autorização do piloto. A skill frontend-design não está disponível no catálogo desta sessão e não foi localizada nas pastas locais de skills consultadas; nenhuma nova decisão estética foi implementada. Disponibilizá-la antes do piloto visual, conforme solicitado.

Já entregues na base e fora do backlog: reorganização inicial da navegação, sidebar com rolagem própria, prioridades do dashboard antes dos gráficos e formulários progressivos.

## Verificação e limites

Executados nesta worktree: 23 testes aprovados em seis arquivos (`app-version`, `ui-contracts`, `admin-form-fields`, `appearance-palettes`, `theme`, `admin-shell`), com pool threads e um worker. O teste app-version renderiza login, rodapé administrativo e atualizações para ADMIN/OPERATOR com a versão 1.27.1. O runner emitiu aviso jsdom de navegação entre documentos não implementada, sem falhas de teste.

Dependências do lock foram preparadas localmente com npm ci --ignore-scripts; nenhum manifesto de dependência foi atualizado. Não houve acesso a banco ou dados reais. Sem mudança de runtime, não há novas capturas, build de produção ou homologação integral de acessibilidade. Este resultado não substitui a matriz visual exigida para a futura migração de CSS.

Conferências adicionais: 14 links locais válidos nos documentos centrais/AGENTS; Prettier dos novos documentos e releases aprovado; ESLint de releases aprovado; git diff --check sem erros. Hashes dos dois arquivos da skill idênticos à cópia local auditada. Main consultada novamente antes da PR: permanece em 1.27.0 no mesmo SHA. Versão preparada nesta worktree: 1.27.1. Abertura de PR autorizada; merge, Release e implantação permanecem fora do escopo autorizado.
