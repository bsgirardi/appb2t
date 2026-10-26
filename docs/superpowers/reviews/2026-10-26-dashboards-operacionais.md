# Entrega dos dashboards operacionais

## Implementação

Seis visões em `/dashboard`, com seletor pesquisável, filtros em URL e carregamento específico da operação: Visão geral, Comercial, Produção, Estoque, Financeiro e Rentabilidade. A composição usa a referência oficial `@shadcn/dashboard-01`, adaptada ao shell existente, e componentes oficiais Charts, Combobox, Empty e ToggleGroup. Não foi importada a página de demonstração com seus dados fictícios.

Quatro indicadores destacados, gráficos com consulta tabular dos valores, prioridades ordenadas por urgência, demais indicadores expansíveis e tabelas paginadas. Tema e paleta existentes preservados. Combobox oficial atual utiliza Base UI internamente; os componentes Radix existentes continuam preservados. Componentes já existentes não foram sobrescritos.

## Cobertura dos indicadores

| Visão         | Implementado                                                                                                                                                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Geral         | Vendas, carteira em aberto, produção ativa/atrasada, orçamentos, pedidos pendentes e prontos, resumos financeiros autorizados, evolução das vendas e prioridades de produção/comercial/artes/vencimentos                                                                     |
| Comercial     | Vendas e ticket, conversão por coorte, tempo até aprovação e cobertura, recorrência, orçamentos ativos, valor em negociação, propostas a vencer, solicitações e situações, carteira e entregas, artes e aprovações pendentes/espera, produtos por valor com quantidade       |
| Produção      | Ordens por etapa, atrasos/fila de prazos, entregas completas no prazo, duração entre primeiro apontamento e conclusão, peças boas/falhas/aproveitamento/reimpressões, demanda sem programação, carga e capacidade por impressora, vendas próximas da entrega mesmo sem ordem |
| Estoque       | Físico/reservado/disponível por item e unidade, necessidade declarada restante dos lotes, cobertura, reposição, linhas total ou parcialmente sem programação, movimentos por unidade e tempo sem movimentação                                                                |
| Financeiro    | Saldo conhecido por conta e total, pagar/receber pendente e vencido, entradas/saídas líquidas de estornos, janelas de 7/30 dias, inadimplência, projeção/menor saldo e necessidade de caixa                                                                                  |
| Rentabilidade | Receita, custos previstos/realizados cobertos, parcelas conhecidas, contribuição e margem por pedido/produto, desvios de custo/contribuição, resultado por hora elegível, cobertura e pedidos com margem negativa ou abaixo da referência temporária                         |

Sem meta cadastrada, a aplicação não inventa margem mínima ou estoque de segurança. Necessidades de ordens sem material declarado não viram consumo estimado fictício. Custos parciais, capacidade desconhecida e saldos desconhecidos não são convertidos em zero.

## Revisão independente e regressões

Revisão somente leitura por outro agente identificou quatro ajustes importantes e um defeito funcional inicialmente classificado como menor. Todos foram reproduzidos em testes antes da correção:

- Estoque agora detecta saldo ainda sem programação após lote parcialmente concluído, inclusive encerrado.
- Etapa manual completa com tempo de máquina nulo contribui com zero hora de máquina, sem invalidar uma impressão medida da mesma venda.
- Produção inclui vendas próximas da entrega, mesmo quando ainda não há ordem.
- Visão geral mantém o indicador de vendas prontas para entrega.
- Limpar a referência temporária de margem remove o parâmetro da URL.

As regressões afetadas passaram: 14/14 testes em três arquivos. Sem achados menores adiados nesta rodada.

## Verificação

- Compilação final `npm run build`: aprovada, incluindo geração Prisma, TypeScript, coleta de páginas e saída standalone.
- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado, sem avisos na execução final.
- Suíte unitária completa: 127 arquivos e 472 testes aprovados em quatro lotes independentes (32/112, 32/95, 32/143, 31/122 arquivos/testes). A execução monolítica foi interrompida após recursão/estouro de pilha na comunicação RPC do Vitest; a tentativa em threads também apresentou o erro. A execução em lotes cobriu todos os arquivos sem alterar a configuração ou omitir testes. Não afirmar que `npm run test:unit` concluiu em uma única execução.
- Formatação dos arquivos da implementação: aprovada pelo Prettier; `git diff --check` sem problemas.
- Navegador com prévia isolada: seletor por teclado, período predefinido/personalizado, URL, voltar/recarregar, paginação, opções do operador, temas e contraste dos gráficos. Larguras 390, 683, 1366 e 1920 px; sem overflow horizontal da página. 683 px foi aproximação de viewport para zoom de 200%, não validação de zoom nativo.
- O servidor de prévia passou a ignorar `.next` e `.superpowers`, evitando conflito de arquivos durante builds no Windows.
- Após reiniciar a prévia atualizada, confirmado no navegador que esvaziar a referência de margem remove `margin` da URL.

## Decisões e limites

- Desenvolvimento realizado na pasta existente, na branch `codex/dashboards-operacionais`, preservando mudanças locais. O usuário autorizou a publicação e o merge local e no GitHub em 26/10/2026; arquivos de outros trabalhos não fazem parte da entrega dos dashboards.
- Datas usam São Paulo. Comercial contabiliza criação; Rentabilidade usa confirmação/conversão registrada. Posições de carteira/estoque/capacidade são atuais e identificadas.
- Capacidade é estimativa dos calendários das máquinas em 30 dias menos fila atual; não garante encaixe contínuo ou disponibilidade da equipe. O planejamento detalhado continua sendo a referência operacional.
- Resultado/h é contribuição por hora de impressão, sem equivalência com lucro líquido. Exige venda entregue, custo completo e tempo atribuível; lotes compartilhados entre vendas não recebem rateio arbitrário.
- Cobertura de materiais reutiliza a rotina auditada existente nas alocações dos lotes ativos. Essa escolha mantém chamadas específicas por alocação em vez de duplicar a reconciliação.
- Integração PostgreSQL real não validada: tentativa somente de leitura falhou porque `localhost:5432` estava indisponível. Nenhum registro real foi alterado. Os testes de consulta usam adaptadores de banco e a prévia usa fixtures; ambos não substituem smoke autenticado com o banco operacional.
- O ledger usa registro equivalente aos auxiliares POSIX da skill no Windows. Arquivos locais e evidências não relacionados à publicação são preservados separadamente, sem inclusão no commit dos dashboards.

Para abrir a prévia isolada: iniciar `node tests/dashboard-preview-server.mjs` e acessar `/tests/dashboard-preview.html` na porta 4175. Ela exibe claramente dados de teste e não acessa APIs ou banco. A tela real continua em `/dashboard` no servidor Next, com autenticação normal.

## Validação no banco da instalação local — 26/10/2026

Após localizar o PostgreSQL operacional no contêiner `appb2t-db-1`, o código atual de `src/` foi executado em contêiner temporário de ferramentas na rede da aplicação. A conexão usou `default_transaction_read_only=on`, confirmado por consulta ao PostgreSQL; nenhum registro foi criado ou alterado. Não foram executadas migrações nem a suíte de integração que limpa dados.

As consultas dos seis painéis concluíram com código de saída zero, usando um administrador ativo existente: Visão geral (11 indicadores), Comercial (16), Produção (12), Estoque (6), Financeiro (14) e Rentabilidade (12). Os retornos também foram serializados com sucesso.

Limite observado: esse banco local contém um usuário, mas nenhuma venda, orçamento, ordem de produção ou produto. O resultado valida conexão, compatibilidade das consultas e retorno sem dados. Não comprova cálculos sobre movimentação operacional populada, navegação autenticada no navegador ou acesso ao banco do servidor remoto. A tentativa anterior em `localhost:5432` falhava porque o PostgreSQL Docker não publica essa porta no host.

A implementação já estava integrada pela PR #11 (`f31e700`). Esta atualização registra a validação posterior solicitada pelo usuário.
