# Integração e homologação da sequência visual

08/11/2026. Escopo autorizado: etapas 1–4. A distribuição oficial, Release, tags e implantação (etapa 5) foram expressamente excluídas. Essa delimitação prevalece nesta tarefa sobre a rotina usual de distribuição após merge em AGENTS.md. Imagem disponível e aplicação instalada não foram consultadas nem alteradas.

**Estado de entrega:** as oito PRs da tabela estão integradas, main em **1.27.11**. O complemento **1.27.12** está na [PR #63](https://github.com/bsgirardi/appb2t/pull/63), ainda **sem merge**. Os onze jobs da [execução 42534052373](https://github.com/bsgirardi/appb2t/actions/runs/42534052373) falharam antes de iniciar, sem etapas ou logs: a anotação do GitHub informa pagamentos recentes da conta com falha ou necessidade de aumentar o limite de gastos em Billing & plans. Não é falha de teste do produto. Nenhuma cobrança, limite, proteção ou workflow foi alterado; os checks não foram contornados. A regularização depende do titular da conta; após a liberação, repetir os checks do novo head exato, conferir main/versão e só então integrar a mesma PR, sem novo incremento por commit documental.

## Revisão e integrações

Base inicial: main **1.27.3**, `0a73e718ef994e7bd7868def8c2ce9d1a094bcda`. Trabalho na worktree isolada 13af. Origens preservadas, sem reset/stash/checkout amplo nem cópia de ambientes, dados operacionais ou backups.

| PR | Recorte | Versão | SHA integrado |
| --- | --- | --- | --- |
| [55](https://github.com/bsgirardi/appb2t/pull/55) | PDV | 1.27.4 | `0d54d9f569d295daeea183b1487ad91b564db28f` |
| [56](https://github.com/bsgirardi/appb2t/pull/56) | Produção/estoque | 1.27.5 | `7e0222cf13fa836c6767d0e2a8164f4d189ed2b1` |
| [57](https://github.com/bsgirardi/appb2t/pull/57) | Planejamento | 1.27.6 | `b361e532e52c3b023d6dd732fcb13878235ea473` |
| [58](https://github.com/bsgirardi/appb2t/pull/58) | Clientes/negociações/solicitações | 1.27.7 | `c4dba34b1c3ce43c4111a41153cced574f7b3f90` |
| [59](https://github.com/bsgirardi/appb2t/pull/59) | Financeiro/tributação | 1.27.8 | `875ed45d8f77c2e94a6b2f324efcc673e82d6040` |
| [62](https://github.com/bsgirardi/appb2t/pull/62) | Rentabilidade/metas/recorrência | 1.27.9 | `7b41515f54d6c92daef42c8925b73fcac4d63d47` |
| [60](https://github.com/bsgirardi/appb2t/pull/60) | Login/catálogo público | 1.27.10 | `7954d462f46c48e147dfb108cafe0c758206db19` |
| [61](https://github.com/bsgirardi/appb2t/pull/61) | Revisão transversal | 1.27.11 | `9648e649771b109bdec9ed565f9b359345af1fda` |

Rentabilidade estava apenas local na origem 2b9b. Somente seus 19 arquivos pertinentes foram copiados para branch nova, revisados, validados e entregues na #62. A origem continua sem alterações desta tarefa. As outras branches receberam commits de conciliação sem reescrita de histórico ou force-push.

Cada merge teve revisão independente, conferência de main/versão/head, **11 checks aprovados no SHA exato** e guarda de head no comando de merge. A árvore realmente integrada foi comparada com a candidata verificada. Conflitos ocorreram em manifestos, histórico, roadmap e acréscimos ao CSS. Um segundo revisor conferiu 106 arquivos originais sem divergências, blocos CSS completos na ordem dos predecessores e histórico preservado como sufixo em cada versão. Não houve resolução por descarte de um recorte.

Uma versão PATCH por PR; package.json e ambas as versões raiz do lock sincronizados. APP_VERSION continua derivado do manifesto. Os testes de versão renderizam login, rodapé administrativo e Atualizações para ADMIN/OPERATOR; ambos os papéis continuam com acesso à página. Nenhuma tag criada.

## Validação da base conjunta

A base de todos os recortes é **9648e649771b109bdec9ed565f9b359345af1fda / 1.27.11**. O ambiente Linux recebeu arquivo produzido por git archive desse SHA; nenhum .env ou diretório operacional foi montado. Bancos PostgreSQL exclusivos foram criados para testes, em namespace de rede de contêineres sem publicação das portas das suítes no host. O serviço preexistente na porta 55432 do Windows não foi usado.

| Verificação | Resultado nesta continuidade |
| --- | --- |
| Candidata conjunta antes dos merges finais, árvore idêntica à 1.27.11 integrada | 1.342 testes em 364 arquivos, aprovados |
| Nova rodada iniciada a partir do SHA 9648e64, ambiente estabilizado | **1.342 testes em 364 arquivos aprovados**, 594,82 s, saída 0 |
| E3.2 / E3 | 10 / 29 testes aprovados |
| E4 / E5 / E6 | 27 / 32 / 9 testes aprovados; validações de upgrade em bancos vazios aprovadas |
| E2.2 / E2.4 / E1.2 / tributação | 14 / 12 / 8 / 7 testes aprovados; upgrade E1.2 aprovado |
| Complemento de acessibilidade, 1.27.12 | 1.038 testes unitários em 241 arquivos; tipos, lint integral e build de produção aprovados |

As nove suítes específicas representam **148 execuções de testes em 46 arquivos**, sem somá-las como testes únicos aos da suíte padrão. Cobrem planejamento, execução/reservas, finanças, relações comerciais, recorrência e tributação. A suíte padrão inclui fluxos de venda/estoque/recebimento/pagamento, snapshots, permissões, concorrência e retry; toda operação dessas suítes usou dados fictícios e bancos descartáveis. Nenhuma operação foi feita no banco real.

A primeira tentativa de upgrade E4 encontrou Git ausente no contêiner mínimo (ENOENT ao ler o esquema histórico). Git/OpenSSL foram preparados somente no ambiente descartável, com histórico de código sem configuração de credenciais. A instalação alterou a detecção do mecanismo Prisma durante uma rodada simultânea: essa rodada foi invalidada/interrompida, o cliente regenerado e a suíte padrão reiniciada com o ambiente estável. Não foi atribuída aprovação à rodada inválida nem alterado teste/produto para acomodá-la. Avisos jsdom de navegação não implementada não foram tratados como homologação nativa.

## Correções adicionais de acessibilidade — 1.27.12

Mudanças delimitadas: receita móvel para labels com checkbox filho direto, opções do Combobox e ações de InputGroup; contorno de foco por teclado baseado no foreground sem substituir a paleta; limite de altura e rolagem interna em DialogContent. Nenhuma regra CSS removida. FormData, inputs nativos, foco do Radix, comandos, consultas, cálculos, permissões e rascunhos preservados.

| Reprodução antes | Resultado observado depois |
| --- | --- |
| Combobox com opções de 32 px e ação de 24 px de largura | Opções com 44 px de altura, ação 44 × 44 em 320/390 px |
| Revisor identificou o slot próprio da ação de limpar após seleção; medição confirmou largura de 24 px | Slots de limpar e trigger direto incluídos nos mínimos móveis e no contorno de foco; estado selecionado verificado separadamente |
| Checkbox de 16 px com label de 17 px de altura | Label acionável com 44 px de altura; glifo compacto, sem trocar input nativo |
| Checkbox nativo de estoque herdava largura expansível de input no label flex | Glifo nativo 18 × 18 e label 309 × 44 em 390; Checkbox do componente preserva 16 × 16 pelas utilities locais, label 225 × 44 no formulário de cliente |
| Cor principal branca sobre superfície branca: foco 1:1, outline none | Outline sólido de 2 px, offset 2 px; claro #182637 e escuro #eff5fa |
| Dialog com 2.164 px de altura, topo -660 px em viewport de 844 px | Altura 812 px, topo 16 px, rolagem interna; foco contido, Escape e retorno confirmados |

A seleção do Combobox segue funcionando por teclado; a ação de mostrar opções é substituída por limpar após a seleção nessa composição. Ao não encontrar o trigger antigo, a inspeção do estado identificou a seleção realizada e a reabertura foi feita por ArrowDown, sem repetir cliques ineficazes. Uma navegação após edição da compra sintética foi abortada; o rascunho foi preservado e a inspeção continuou em aba nova, sem desativar a proteção de saída.

## Matriz por componente e consumidor

Todas as amostras são fixtures que montam componentes reais, sem login artificial, dados operacionais ou backend real. “Validado” se refere apenas à célula descrita; não é certificação do aplicativo inteiro.

| Componente/consumidor/estado | Cobertura | Estado e limites |
| --- | --- | --- |
| Compartilhados: Field/Input/Textarea/NativeSelect/Checkbox/Card/Badge/Tabs/Table | 320/390/768/1440 × claro/escuro; campos extensos/erro, vazio, disabled/pending estáticos; fonte Roboto | **Parcial**: sem overflow de página; alvos medidos em 320/390; demais consumidores não têm inspeção individual de todos os estados |
| Combobox / fixture com portal adaptado | Clique, ArrowDown/Enter, seleção e reabertura; opção selecionada, clear nomeado; fonte/paleta; 320/390 | **Validado na amostra**; multisseleção, listas extensas e todos os consumidores permanecem parciais |
| Tabs / fixture | ArrowRight selecionou Histórico e mostrou painel vazio | **Validado na amostra** |
| Table / fixture | Região focável; ArrowRight levou scrollLeft a 40 px em 390; tabela 640 px em contêiner 309 px | **Validado na amostra**; rolagem interna permitida, sem vazamento da página |
| FilterPanel / fixture | Editar, recolher, reabrir preservou “Rascunho preservado na base conjunta” | **Validado na amostra**; filtros dos recortes também cobertos por testes de rota/componente |
| Dialog / fixture extensa | 25 campos; limite de tela, Shift+Tab/Tab contidos, foco inicial, Escape e retorno | **Validado na amostra** em 390 claro/escuro; zoom real continua pendente |
| Sheet / fixture | Enter abriu, foco inicial em Fechar, Escape retornou ao trigger, primary personalizado preservado | **Validado na amostra** em 390 escuro |
| ContextEditor real / fixture | Escape em rascunho pediu descarte; continuar manteve valor; descartar fechou e devolveu foco | **Validado na amostra**, sem salvar em rede |
| CustomerForm real / fixture | Novo cliente por Enter; foco inicial no nome, seção opcional expandida; label do Checkbox 44 px/glifo 16 px; campo obrigatório vazio reteve o formulário e o foco; Escape retornou a Novo cliente | **Validado na amostra** em 390 escuro; restauração observada após o ciclo do Radix, não na leitura transitória do body; nenhum cadastro salvo |
| ChartStyle integrado | data-theme claro/escuro e automático real escuro (#ff7a00) | **Validado para seleção de tema**; gráfico completo, leitura de dados/legenda e todos os consumidores não certificados |
| Login completo e catálogo / fixture #60 | 320/390/768/1440 × claro/escuro, nomes longos, filtros; Roboto/Poppins preservadas | **Parcial**: sem overflow; autenticação e submissão real não executadas |
| PDV / fixture #55 | Quatro larguras × dois temas, nome extenso; clique adicionou item e mudou 2 para 3 peças/R$ 59 somente na memória sintética | **Parcial**; sem concluir venda ou alegar persistência; erro/pending/retry e preços cobertos por testes |
| Produção/estoque / fixtures #56 | Ordens e reservas nas quatro larguras × dois temas; abrir ação por Enter, checkbox nativo/label, Voltar sem salvar | **Parcial**; desconhecido, zero/negativos, concorrência e transições cobertos por suítes; sem movimento real |
| Planejamento / fixture #57 | Quatro larguras × dois temas, quatro lotes, previsão/desconhecido/bloqueios e nomes extensos | **Parcial**; sem overflow, oito medidas novas; transições e cruzamentos cobertos por testes isolados |
| Clientes, financeiro e rentabilidade / fixtures #58/#59/#62 | Quatro larguras × dois temas, tabelas extensas e dados sintéticos | **Parcial**; sem overflow na amostra; vazio/fora da página/cobertura/zero/negativo/pending/retry cobertos por testes, não homologados integralmente no navegador |
| Contraste: controles, Tabs, erro/status e Combobox | Claro/escuro × paleta roxa e extremos branco/preto; normal, hover observado, opção destacada e transparência composta com ancestrais | **Parcial**: textos habilitados amostrados mínimos 5,50:1 claro e 7,15:1 escuro; opção destacada 13,31:1 / 11,59:1. Disabled identificado separadamente; nem toda paleta/estado/consumidor foi certificado |
| Movimento reduzido real ativo | matchMedia reduce=true; Dialog/overlay/fechar e Sheet computados animation none, duração/transição 0s | **Validado nesses overlays**; não extrapolar a todos os gráficos/animações |
| Zoom real 200%/400% e leitor de tela real | Tentativa de entrada nativa Windows falhou duas vezes com “failed to activate captured window”, após recuperação da seleção | **Não exercitado**; navegador conectado oferece somente viewport/visibilidade, sem zoom/mídia/AT. Resize, árvore acessível e DOM não foram chamados de zoom ou leitor de tela |

Há 64 medidas de oito consumidores (PDV, ordens, reservas, login completo, catálogo, clientes, financeiro e relatório de rentabilidade), mais oito de planejamento, oito dos compartilhados e 16 de AuthForm/catálogo isolados. Não houve overflow de documento nessas amostras; tabelas mantêm rolagem interna. A checagem inicial do elemento de montagem foi descartada porque fixtures usam IDs diferentes; a validação considerou h1 renderizado, ausência de overlay de erro e largura efetiva.

Evidências locais sintéticas em `C:/Users/Administrador/.codex/visualizations/2026/11/08/01a1bd48-3afc-7511-9f89-45b582045b69`: shared-matrix.json, consumer-matrix.json, module-matrix.json, planning-matrix.json, contrast-states.json e capturas de foco/diálogo/PDV/planejamento. Não incluem dados de clientes, credenciais ou logs operacionais.

## Pendências objetivas e entrega

- **Etapas 1–2:** oito recortes revisados e integrados; entrega local de rentabilidade concluída em PR própria.
- **Etapa 3:** validação conjunta do SHA integrado e correções complementares registradas acima; gate da PR complementar exige seus próprios checks do head exato.
- **Etapa 4:** correções reproduzidas e verificadas, porém aceite **parcial**. Pendem zoom real 200%/400%, leitor de tela real e expansão das células marcadas parciais (incluindo overlays extensos com zoom, multisseleção e todos os contrastes/consumidores). Labels com htmlFor separado ou wrappers intermediários não estão cobertos pelo seletor móvel de filho direto.
- **Etapa 5:** **NÃO EXECUTADA** por limite expresso do usuário. Sem Release, distribuição, tag ou implantação. Aplicação operacional não foi atualizada; a entrega de distribuição permanece pendente, separada do merge.
