# Revisão transversal do Design System B2T

08/11/2026 · branch `codex/revisao-transversal-design` · base efetivamente auditada: main 1.27.3, `0a73e718ef994e7bd7868def8c2ce9d1a094bcda`.

## Base e integrações

Fetch e consulta autenticada das PRs confirmaram o quadro abaixo. O conector GitHub retornou 404 para este repositório privado; a consulta pelo CLI local autenticado funcionou. Não foi inferido merge a partir de relatos de conclusão ou de notas antigas dos relatórios.

| Recorte | Estado confirmado | Evidência / origem preservada |
| --- | --- | --- |
| Fundação/documentação | PR #53 integrada | Versão 1.27.1; Release oficial publicada |
| Piloto de produto | PR #54 integrada | Versão 1.27.2; Release oficial publicada |
| Filtros comerciais | PR #52 integrada | Versão 1.27.3; SHA base desta revisão |
| PDV | PR #55 aberta | `9b33`, commit `d825fb2`, `PDV-PRESENCIAL.md` |
| Produção/estoque | PR #56 aberta | `5661`, commit `96347c2`, `PRODUCAO-ESTOQUE.md` |
| Planejamento | PR #57 aberta | `67ba`, commit `4e825f1`, `PLANEJAMENTO.md` |
| Clientes/negociações/solicitações | PR #58 aberta | `2d3c`, commit `9c0504e`, `CLIENTES-NEGOCIACOES-SOLICITACOES.md` |
| Financeiro/tributação | PR #59 aberta | `ed7d`, commit `dbdfed3`, `FINANCEIRO-TRIBUTACAO.md` |
| Login/catálogo | PR #60 aberta | `b72f`, commit `3d7d788`; relatório e plano lidos |
| Rentabilidade/metas/recorrência | Entrega local não integrada | `2b9b`, HEAD ainda na base; arquivos modificados e novos, sem commit desta entrega |

As origens foram somente consultadas; nenhuma foi alterada, copiada ou integrada. As versões candidatas concorrentes 1.27.4 não são reservas de versão. As notas históricas dos recortes descrevem momentos anteriores à abertura das PRs; não substituem esta consulta atual.

Release de main: [app-v1.27.3-0a73e718ef99-20261107-pr52](https://github.com/bsgirardi/appb2t-distribuicao/releases/tag/app-v1.27.3-0a73e718ef99-20261107-pr52), publicada em 07/11/2026 às 20:42 de São Paulo. API lista `compose.production.yaml` (2.297 bytes), `images.tar.gz` (285.426.768 bytes) e `manifest.json` (1.127 bytes). Digest informado pelo GitHub para images: `sha256:fb61879a7f366ce6658abe30a7c3ad2ce49150e866d1aa8210af31d2b73e9b3d`. Esta auditoria não baixou/revalidou o pacote, base/plataforma ou implantação operacional. Publicação anterior não prova atualização do servidor.

## Método e inventário

Skills locais shadcn/frontend-design, investigação de causa e testes de regressão aplicados. CLI shadcn 4.23.0 e MCP oficial disponíveis; registry @shadcn consultado. Configuração confirmada: Radix/new-york, Tailwind v4, Lucide; Combobox permanece Base UI. Guias Next 16.4.2 instalados de use-client, CSS e acessibilidade lidos. Referências upstream consultadas: [Chart](https://ui.shadcn.com/docs/components/radix/chart), [Combobox](https://ui.shadcn.com/docs/components/radix/combobox), [Dialog](https://ui.shadcn.com/docs/components/radix/dialog). A API local prevalece.

[Plano](REVISAO-TRANSVERSAL-PLANO.md) e [inventário nominal dos consumidores](REVISAO-TRANSVERSAL-CONSUMIDORES.json). O inventário busca imports diretos nos TSX de src, excluindo ui/*: Button 131, Input 17, Textarea 17, NativeSelect 56, Combobox 1, Checkbox 12, Card 74, Badge 29, Table 22, Tabs 1, Dialog 1, Sheet 1, Chart 1 e Field 121. São contagens de arquivos, não de instâncias; usos indiretos não estão somados. Cada consumidor não exercitado individualmente mantém esse estado no inventário; dimensões planejadas não significam execução de todas as combinações.

Prévia nova `tests/transversal-preview.html`, com componentes reais, dados sintéticos e servidor Vite existente na porta 4340 (`B2T_PREVIEW_PORT=4340 node tests/admin-preview-server.mjs`). Modos padrão, `view=login` e `view=catalog`; parâmetros `theme=light|dark`, `palette`, `error`, `portalTheme`, `empty` e `dialog`. Login exercita AuthForm, sem reconstruir a página assíncrona inteira; captura de submit na fixture impede envio. Catálogo compõe StorefrontShell/CatalogFilterForm/ProductCatalog da main, sem importar a PR #60. Nenhuma consulta, credencial, sessão artificial, pagamento ou operação persistente foi utilizada.

## Correções delimitadas

1. **ChartStyle — P2 corrigido.** Fixture com config.theme light azul/dark laranja: antes, `data-theme=dark` computava `rgb(0,102,204)` porque só `.dark` selecionava o mapa escuro. Depois, computa `rgb(255,122,0)`. Seletor segue a preferência explícita na raiz e usa media query escura somente sem data-theme. Claro explícito permanece azul mesmo com sistema escuro; automático sem atributo foi observado laranja com sistema escuro. Cores constantes e API de config preservadas. Dashboard atual usa variáveis CSS, portanto não se alega defeito visual prévio nesse consumidor.
2. **Combobox — P2 corrigido.** Trigger e Clear de ícone não tinham nome acessível na árvore. Defaults agora são “Mostrar opções” e “Limpar seleção”, antes das props do consumidor, permitindo sobrescrita. Trigger com children preserva a responsabilidade de nomeação do consumidor, sem mascarar texto visível no botão auxiliar. Fixture após seleção mostra a ação de limpar nomeada. Não se alteraram valor, serialização, eventos, primitiva ou popup.
3. **Servidor da prévia.** Build concorrente reproduziu EBUSY do watcher Windows ao observar `.next/server/pages/500.html`, encerrando Vite. Exclusão de `.next` da observação evita tratar saída de build como fonte da prévia; reinício e carregamento da prévia funcionaram. Sem mudança no servidor de produção.

Os dois primeiros testes de regressão falharam antes das correções pelos motivos esperados. A revisão independente não encontrou regressão nos componentes; encontrou uma query incorreta no teste adicional de sobrescrita: Trigger sem Input tem role combobox, não button. Query ajustada ao comportamento real do Base UI.

## Matriz de cobertura

“Validado” abaixo se limita ao cenário indicado. “Parcial” não promete cobertura de todos os consumidores/estados. C = claro explícito; E = escuro explícito; A = automático observado; P = paleta sintética personalizada.

| Componente / consumidor | Tema / viewport | Estado / evidência | Cobertura |
| --- | --- | --- | --- |
| Button, Input, Textarea, NativeSelect / fixture compartilhada | C+P 320/768; E+P 390/1440 | Preenchido, erro, disabled, pending representativo, nome longo; Input/Select/Button 44 px medidos em 390 | Validado na amostra; hover e todas as variantes não exercitados |
| Field/TextareaField / fixture | Mesma matriz | Label associado; erro alert e aria-invalid; hint+erro em describedby; texto longo e rolagem da textarea | Validado na amostra e contratos unitários; leitores de tela não exercitados |
| Card/Badge / fixture | Mesma matriz | Conteúdo preenchido, texto longo e quebra visual | Parcial: todas as composições/variantes não exercitadas |
| Checkbox / fixture | Mesma matriz visual | Label nativo associado; input 18 px | Parcial; composição móvel desta fixture não satisfaz alvo 44 px |
| Tabs / fixture | E+P 390 | ArrowRight selecionou Histórico e trocou painel; estado vazio textual | Validado nessa navegação; settings real não exercitado individualmente |
| Table / fixture | Quatro larguras | Região focável; ArrowRight deslocou scrollLeft de 0 para 40 em 390; cabeçalhos scope | Validado; múltiplas tabelas e conteúdo monetário real não exercitados |
| FilterPanel/AdminForm / fixture | E+P 390 | Clique/Enter abre, fecha e reabre; valor “Rascunho preservado” mantido; submit sintético sem backend | Parcial; revelação/foco inválido cobertos por testes existentes, sem nova homologação nativa completa |
| Dialog / fixture | E+P 390 | Enter abre; campo recebe foco; Shift+Tab chega a Fechar e Tab volta ao campo; Escape fecha e retorna ao trigger | Validado; diálogo longo/zoom e demais consumidores não exercitados |
| Sheet / fixture | E+P 390 | Enter abre, foco em Fechar, altura 844; Escape fecha e retorna ao trigger; paleta preservada | Validado na composição sintética; AppShell completo não homologado aqui |
| ContextEditor real / fixture | E+P 390 | Editar, Escape mostra descarte; continuar mantém texto; novo Escape+descartar fecha e retorna ao trigger | Validado nesse cenário; beforeunload e salvar em rede não exercitados |
| Combobox / fixture | E+P 390 | Clique abre, ArrowDown/Enter seleciona Peça azul e fecha; trigger/clear nomeados; popup tematizado Roboto e primary #e5b8ff | Validado no cenário; listas extensas, chips/multisseleção e todos os consumidores não exercitados |
| Combobox / portal sem adaptação | E+P 390 | Perde primary personalizado e Roboto (fallback #6cdbc0 / Arial) | Risco reproduzido de composição; DashboardToolbar real já reaplica classe e style, sem falha alegada nele |
| ChartStyle / config.theme sintético | C/E quatro larguras; A observado no sistema escuro | Antes/depois computado; teste claro explícito e cor constante | Validado para seleção do tema; gráfico completo/legenda/alternativa textual não homologados nesta rodada |
| AuthForm real / login | C 320/768; E 390/1440 | Quatro larguras sem overflow, Roboto; E-mail→Tab→Senha em C 390; required e autocomplete inspecionados | Parcial: página completa, erro/pending reais e autenticação não exercitados; alterações da #60 bloqueadas por base não integrada |
| Loja / Shell+filtros+catálogo real | C 320/768; E 390/1440 | Nome extenso, sem foto, preço zero; Enter abre filtro em E 390; fonte Poppins | Parcial: variantes e estados completos pendentes; #60 bloqueada por base não integrada |
| Todos os recortes #55–#60 e rentabilidade local | Todas as dimensões futuras | Diffs ausentes na base | Bloqueado por base não integrada para conclusão conjunta |
| Reduced-motion, zoom 200/400%, leitor de tela | Não exercitado integralmente | Regra CSS reduce existente foi inspecionada; não houve alteração do sistema/emulação nem medição com reduce ativo | Não exercitado; inspeção de fonte não equivale a validação funcional |

Matriz compartilhada medida: viewport/documento 320/305, 390/375, 768/753, 1440/1425. Sem overflow horizontal da página nessa fixture. Table client/scroll: 239/640, 309/640, 687/687, 834/834. Barra vertical explica os 15 px de diferença. Não confundir rolagem interna permitida com vazamento de página.

Contraste dos pares computados da paleta sintética: botão principal C 8,41:1 / E 11,12:1; input C 15,31:1 / E 14,17:1; mensagem de erro sobre Card C 7,50:1 / E 9,29:1. Valores normais opacos; disabled, foco, hover, todos os tokens e todas as paletas cadastráveis não foram certificados. O bloco azul/laranja é uma amostra técnica da cor do gráfico, não uma receita de texto branco para gráficos.

## Entrada do navegador e evidências

Prévia mínima contém botão HTML nativo e Button React com contador. Clique por locador incrementou de 0 para 1; Tab passou do botão nativo para React. Pela mesma interface de locadores, diálogo, Sheet, filtros, Tabs, seleção e rolagem funcionaram com mudanças verificadas no DOM. Isso fornece um caminho funcional para esta sessão; não prova por que as chamadas de outras prévias não surtiram efeito. Não foram simulados eventos via evaluate para alegar teclado real. Evaluate somente leu DOM, foco e estilos.

Capturas e medidas locais ficam fora do repositório em `C:/Users/Administrador/.codex/visualizations/2026/11/08/01a1bcbe-3d20-7772-a35e-0d59a381eade`: `transversal-{320-light,390-dark,768-light,1440-dark}.png`, `sheet-390-dark.png`, `combobox-390-dark.png`, `context-editor-dirty-390-dark.png`, `auth-fields-390-light.png`, `catalog-390-dark.png`, `measurements.json` e `contrast.json`. Capturas da matriz precedem a adição dos últimos controles da fixture; não representam teste de todas as versões posteriores dela.

Durante a tentativa posterior de ampliar a matriz de loja/login, ocorreu a queda documentada do watcher. A aba de erro passou a bloquear chamadas pelo filtro de URL da ferramenta; nova aba pela API de criação recuperou o acesso. Não se atribuiu essa falha à aplicação ou à segurança/autenticação. Resultados posteriores são registrados separadamente ao fechar a verificação.

Após recuperação, consumidores medidos em 320/390/768/1440: AuthForm com larguras de documento 320/390/768/1440 e fonte Roboto; catálogo com 305/375/753/1425 e fonte Poppins, sem overflow horizontal. Capturas adicionais `login-{320-light,390-dark,768-light,1440-dark}.png`, `catalog-{320-light,390-dark,768-light,1440-dark}.png` e `consumer-measurements.json`. A fixture de login contém somente o formulário e sua superfície, portanto não equivale à página completa de `/login`.

## CVA, CSS e remoções

| Fonte | Responsabilidade observada | Decisão |
| --- | --- | --- |
| Button CVA | Variantes, tamanhos, foco e estados | Mantido; CSS ainda altera min-height, font, whitespace e outline/ghost |
| Sheet CVA | Lado e posicionamento; animação | Mantido; design.css ainda define overflow e adaptação móvel |
| ui Input/Textarea/NativeSelect | Estrutura/classes/props e estados | Mantidos; CSS central define font, cores, border-width e limites nativos sem Preflight |
| design.css data-slot | Compatibilidade nativa, 44 px e movimento reduzido | Não há equivalência comprovada para apagar |
| admin.css / globals.css | Densidade, geometria e legado | Não foi presumida substituição por CVA |
| theme.css / Aparência | Valores e pares por preferência | Sem alteração |
| storefront.css e escopo storefront | Composição e identidade pública | Sem alteração |

**Nenhuma regra CSS removida.** A medição móvel de 44 px depende da regra central; apagar por aparente duplicidade de classes alteraria alvos. Não há prova transversal antes/depois cobrindo variantes/portais que autorize limpeza. Nenhum token, marca, fonte, preset, dependência, Preflight ou regra de negócio foi alterado.

## Pendências prioritárias e aceite incremental

| Prioridade | Próximo recorte concreto | Critério de aceite |
| --- | --- | --- |
| P1 para fechar sequência | Integrar somente após revisão/autorização própria cada PR pendente, reconciliando uma versão por PR | Auditar SHA realmente integrado; repetir matriz nos consumidores finais, sem importar diffs por conveniência |
| P2 | Alvos móveis de Combobox/InputGroup/Checkbox em composição | Opções medidas em 32 px e checkbox 18 px nesta fixture; mapear alvos/labels reais, ajustar receita delimitada a um consumidor, comparar 320/390 e teclado/paleta antes de ampliar |
| P2 | Paletas nos portais de novos consumidores | Reaplicar tema como DashboardToolbar/ContextEditor/AppShell; conferir fg/bg/font/primary em C/E/A/P; evitar acoplamento administrativo no componente genérico da loja |
| P2 | Contraste de todos os estados e variantes | Medir hover/foco/selecionado e pares transparentes com composição; cobrir paletas extrema/clara/escura e loja, sem mudar preferências salvas |
| P2 | Zoom/reflow e overlays extensos | Conferir 200/400%, foco e mensagens longas sem corte, rolagem interna e retorno; registrar viewport efetivo, não chamar simples resize de zoom |
| P2 | Movimento reduzido e tecnologia assistiva | Exercitar media reduce ativa e leitor de tela real; validar nome/erro/status/ordem e alternativa de gráficos, sem prometer certificação |
| P3 | Remoção incremental de CSS | Uma família/consumidor por vez, snapshots de estilos computados antes/depois em estados/temas/portais, sem diferença material e com testes de contrato |

## Verificação e entrega

Suíte unitária completa: **996 testes em 232 arquivos**, aprovada em 284,62 s antes do último refinamento de preservação de children do Trigger. O teste adicional dessa preservação foi executado após falhar com o default incondicional e passou no cenário real de botão auxiliar com Input. Rodada final direcionada em 1.27.4: **38 testes em nove arquivos aprovados**, incluindo os cinco testes transversais, versão/rodapés/histórico, contratos, formulários, filtros, paletas e shell. Não se alega nova execução integral após esse último refinamento. Avisos jsdom de navegação entre documentos não implementada, sem falha na rodada final.

Tipos aprovados; build final Next 16.4.2 aprovado com verificação TypeScript e 83 páginas estáticas geradas. Lint global e diff --check aprovados. Revisão independente final sem novos achados materiais após corrigir a query do teste. A prévia permaneceu disponível durante o build posterior com `.next` ignorado, sem repetir EBUSY. Dependências preparadas pelo lock com scripts desabilitados; Prisma Client gerado localmente, sem consulta a banco. Nenhuma dependência declarada foi alterada.

Versão candidata única **1.27.4**: package.json, as duas versões raiz do lock e primeira nota portuguesa do histórico alinhadas. APP_VERSION continua lendo package.json; teste app-version renderiza rodapé do login, rodapé administrativo e `/atualizacoes` para ADMIN e OPERATOR. As notas anteriores foram preservadas. Main reconferida no encerramento permanece em **1.27.3** no SHA base; #55–#60 continuam abertas. Esta candidata não reserva número contra integrações concorrentes: reconciliar a mesma futura PR antes de integrar, sem segundo incremento por commit.

Registro do fechamento da implementação: alterações locais revisáveis na branch `codex/revisao-transversal-design`, então sem commit, push ou PR. Posteriormente, o usuário solicitou abrir a PR; consultar o GitHub para o estado atual de revisão. **Sem merge, Release ou implantação desta etapa.** Integrações de banco não executadas, por ausência de URL explícita de banco descartável exclusivo; a suíte completa com integrações não é declarada verde. Para fechar a sequência: revisar/integrar os recortes pendentes com autorização própria, reconciliar versões, revalidar a base integrada e completar as células pendentes da matriz. Distribuição oficial e implantação permanecem operações distintas, sem autorização nesta tarefa.
