# Rentabilidade, metas e recorrência

08/11/2026, America/Sao_Paulo. Base: main 1.27.3, `0a73e718ef994e7bd7868def8c2ce9d1a094bcda`. Worktree nova, branch `codex/rentabilidade-metas-recorrencia`. Etapas financeiras e operacionais de outras branches não incorporadas.

## Intenção e decisões

Melhorar leitura de critérios, cobertura, diferenças e próximas ações existentes. Preservar integralmente domínio, consultas, cálculos, fontes, permissões, formulários, concorrência e histórico. Nenhuma operação real para validar a interface.

Inventário: relatório e detalhe nas rotas `/rentabilidade` e `/rentabilidade/[id]`; inteligência e recorrência no relatório; metas na rota `/rentabilidade/metas`; workspace reúne revisão e histórico; conciliação reúne etapas comerciais e abertura produtiva. Revisão e histórico mantêm os fluxos existentes. Relatório financeiro anterior lido apenas para consistência, sem copiar diff.

Abordagens consideradas: centralizar variantes afetaria consumidores fora do recorte; redesenhar o módulo aumentaria o risco de alterar semântica. Adotada composição local com componentes instalados e receita `.profitability-reading`, sem nova marca. Cores são as variáveis vigentes de Aparência, sem novos HEX; fonte Roboto; texto à esquerda, valores tabulares e tabelas com rolagem interna. A hierarquia vem de contexto e cobertura próximos aos valores.

```text
critérios aplicados → população / cobertura → totais e pedidos
pedido → previsto / realizado / diferença → pendências e fontes → revisão
competência → meta salva / realizado / progresso → revisão e histórico
janela própria → produto → amostra / sugestão → evidências
```

## Plano de implementação

Execução direta nesta worktree, conforme recorte já autorizado. Skills de brainstorming, escrita de planos, shadcn e frontend-design consultadas; dispensada nova aprovação genérica conforme pedido.

- [x] Relatório/detalhe: testes de cobertura parcial, zero/indisponível e página vazia com população positiva; nomear tabelas, contextualizar sinais e subtotais; não mudar agregação.
- [x] Metas/inteligência/recorrência: separar meta ausente de realizado indisponível e simulação de gravação, exibir filtro/amostra junto ao resultado, aplicar receita local às tabelas e fontes. Manter handlers e payloads.
- [x] Validar regressões relevantes, tipos, lint e build; inspecionar prévias sintéticas nos temas e larguras; registrar somente evidência obtida.
- [x] Reconferir main, preparar PATCH único e notas, verificar versão/rodapés e diff. Sem merge, Release ou implantação.

Foco de revisão: população diferente da página; cobertura parcial; valores negativos/grandes e referências longas; meta ausente/zero; recomendação sem ação aplicada. Testes e prévias não homologam persistência real.

## Implementação e evidências

- Receita local em `design.css`, aplicada nas rotas e componentes deste recorte; nenhum token ou variante global alterado. Tabelas usam largura fixa com mínimo local já existente de 640 px, células quebráveis, algarismos tabulares e rolagem interna. Moedas do relatório e comparação alinhadas à direita. Títulos, fontes e identificadores longos quebram sem ampliar a página. Detalhes nativos ganham área de acionamento móvel e foco visível pela receita.
- `ProfitabilityAppliedFilters` recebe apenas a consulta aplicada, fora do painel recolhível. Explicita coorte sem data, situação, produto, canal, cobertura e separação dos períodos de perdas/recorrência. Não altera parâmetros enviados, consulta ou paginação.
- Links de pedidos do relatório/rankings carregam o retorno à consulta corrente, inclusive paginação e filtros de perdas. O detalhe aceita retorno somente para `/rentabilidade` ou sua query; outras rotas/destinos externos são descartados. Links das evidências de recorrência mantêm seu comportamento anterior; a seleção local de recorrência não é persistida na URL.
- Subtotais cobertos são identificados por indicador; nulos continuam indisponíveis. Página sem itens com população positiva não é descrita como consulta sem pedidos. Comparação mantém fórmulas e esclarece realizado menos previsto; margem mantém percentual com vírgula decimal.
- Metas mantêm edição, revisão, conflitos, recuperação e proteção de saída anteriores. Ausência de meta tem explicação específica; zero não é convertido em ausência. Simulação histórica declara que não grava uma meta mensal. Recorrência mostra produto aplicado, contagem e amostra junto à sugestão; nenhum parâmetro é alterado pela sugestão.
- Revisões, conferências, conciliações comercial/produtiva e fontes foram inventariadas; seus handlers, cálculos, snapshots e memória permanecem intactos. Não há dependência funcional das PRs abertas ou da etapa financeira não integrada.
- CLI oficial shadcn 4.23.0 e MCP disponíveis; consultados configuração Radix, componentes instalados, docs Card/Table/Empty e checklist. Guias Next 16.4.2 instalados consultados para fronteira cliente, formulários e Link. Dependências preparadas pelo lock sem atualização de versões; sem ambiente, credencial, sessão ou banco operacional copiado.
- Testes novos cobrem subtotais, zero/indisponível, página vazia, sinal da comparação, critérios sem data e round trip/rejeição de retorno. Regressões de metas/inteligência/revisão/recorrência/conciliação passaram na execução dirigida (26 testes em sete arquivos antes da adição de retorno; adição conferida em oito testes dirigidos adicionais). Revisor independente não encontrou achados acionáveis e repetiu nove testes dos fluxos finais de leitura/metas.
- Testes de versão/rodapés/Atualizações para ADMIN e OPERATOR e contratos compartilhados: 22 testes em seis arquivos aprovados na versão candidata 1.27.4. A primeira execução da suíte completa foi interrompida porque os manifestos foram versionados enquanto o runner ainda usava import anterior; o teste de consistência detectou a mistura. Nenhum teste foi flexibilizado; nova execução iniciada com versão estável.
- Prévia `tests/profitability-reading-preview.html`, servida pelo servidor já existente `node tests/goals-preview-server.mjs`, em `http://127.0.0.1:4319/tests/profitability-reading-preview.html`. Parâmetros `view=report|detail|goals|intelligence|recurrence|productive`, `theme=light|dark`, `state=empty|outside|large|negative`. Fixtures sintéticas; fetch bloqueado, sem sessão ou gravação. O estado negative altera somente DTO demonstrativo de apresentação e não valida fórmulas.
- Matriz DOM: cinco prévias principais × 320/390/768/1440 × claro/escuro (40 consultas), sem largura de documento acima da viewport. Tabelas visíveis de relatório/detalhe mantiveram 640 px em contêineres móveis de 239–343 px. Rankings e evidências da recorrência estavam recolhidos nesta matriz. Inspeções por captura: relatório 390 claro e 1440 claro, detalhe 390 escuro, inteligência 1440 escuro, metas 768 claro e recorrência 320 escuro. Estados vazio, página fora do resultado e negativo inspecionados em 390 escuro; nenhuma extrapolação para persistência real.
- Limitação reproduzida do navegador: clique e Enter no acordeão de recorrência não mudaram `aria-expanded=false`. Não homologados expansão, navegação Tab completa, rolagem por teclado, retorno de foco ou evidências expandidas no navegador. Testes jsdom exercitam os fluxos existentes; não substituem essa homologação. Captura de relatório sintético salva fora do repositório na pasta de visualizações do chat.
- Main reconferida: 1.27.3, mesmo SHA; PRs #55/#56/#57 seguem abertas. PATCH candidato único 1.27.4 sincronizado nos manifestos e notas portuguesas; `APP_VERSION` segue derivado do package, usado nos rodapés e Atualizações. Não representa versão instalada. Antes de futura integração, reconciliar novamente com main.

Verificação final com versão estável **1.27.4**: **997 testes unitários aprovados em 232 arquivos**. `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` aprovados. Avisos jsdom de navegação entre documentos não implementada, sem falhas. Nenhuma suíte dependente de banco executada. Abertura produtiva também inspecionada isoladamente em 390 escuro, sem transbordamento de página. Revisão independente final sem pendências; retorno validado e preservação dos critérios cobertos por teste. Main reconferida após verificações: mesmo SHA e versão 1.27.3.

Entrega: diff local não commitado na branch `codex/rentabilidade-metas-recorrencia`, worktree `C:/Users/Administrador/.codex/worktrees/2b9b/appb2t`. Sem commit, push, PR, merge, Release ou implantação. Servidor e aba temporários encerrados; origens preservadas.
