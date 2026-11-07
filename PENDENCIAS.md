# appb2t — estado e pendências

## 07/11/2026 — PR de alertas comerciais autorizada

Usuário solicitou “faca pr”. Preparação da branch `codex/alertas-comerciais` em 1.25.0 MINOR sobre main reconferida `bd0b4eb` / 1.24.0, sem novo incremento. Revalidação de 23 testes direcionados aprovada; suíte completa anterior com 915 testes em 220 arquivos, tipos/lint/build finais aprovados. PR em rascunho para o recorte de contatos atrasados e vencimentos; critérios de inatividade/sem retorno continuam pendentes e não foram presumidos aprovados. Commit/push/criação de PR autorizados; merge, Release de distribuição e implantação operacional permanecem separados e não realizados. URL será registrada após criação. Histórico abaixo preservado.

## 07/11/2026 — alertas comerciais implementados parcialmente em isolamento

Base main `bd0b4eb` / 1.24.0, worktree `alertas-comerciais`, branch `codex/alertas-comerciais`. Contatos agendados atrasados e vencimento de propostas vigentes avulsas/principais integrados à prioridade atual; motivos da mesma negociação agrupados, responsável/próxima ação e links diretos. Encerradas, convertidas, rascunhos, propostas secundárias e expiradas não geram alerta de vencimento. Cobertura incompleta explícita, sem notificações persistidas ou mensagens externas; acesso ADMIN/OPERATOR preservado. E2.4 segue frente separada.

Janela existente de 7 dias preservada, com confirmação solicitada. **Sem retorno continua pendente**: histórico INTERACTION é texto livre, não identifica envio/resposta. Alternativa de inatividade e prazo perguntados ao usuário, sem implementação ou aprovação presumida. Não encerrar a caixa ampla de alertas.

Validação: 915 testes unitários em 220 arquivos, tipos/lint/build finais aprovados; 29 testes direcionados, revisão independente e prévia sintética desktop/390 px, teclado e temas. Sem HTTP autenticado ou consulta a banco real. Versão 1.25.0 preparada uma única vez para revisão local, manifestos/notas sincronizados. Sem commit/push/PR/merge/Release/deploy, migração ou acesso operacional. [Entrega e evidências](docs/alertas-comerciais/ENTREGA.md). Reconciliar main/versão antes de futura PR autorizada. Registros históricos e alterações locais de outros chats preservados.

## 06/11/2026 — integração autorizada e versão conciliada

PRs #46 (1.22.1) e #47 (1.23.0) integradas. PDV passa a 1.24.0 MINOR nesta mesma PR #48, preservando notas anteriores. Validação adicional HTTP e migração serão registradas após execução. Publicação operacional não realizada. Registros anteriores mantêm o estado histórico.

## 06/11/2026 — preparação da PR do PDV autorizada

Usuário solicitou “faça pr”. Main reconferida em `16a6466` / 1.22.0; incremento MINOR único para 1.23.0, com manifestos e notas portuguesas sincronizados. PR #47 da calculadora também propõe 1.23.0 e permanece aberta; reconciliar versão e histórico antes do merge conforme a ordem de integração, incluindo a PR #46 visual. [PR #48 do PDV](https://github.com/bsgirardi/appb2t/pull/48) criada em rascunho; revalidação aprovada com 890 testes gerais em 215 arquivos, quatro testes de versão/rodapés/Atualizações, tipagem, lint e build. Ensaio HTTP autenticado integral continua pendente por bloqueio automático anterior, sem contorno. Commit/push/PR estão autorizados por este pedido; merge, Release e implantação operacional permanecem separados e não autorizados. PR #48 confirmada aberta e em rascunho, branch codex/pdv-presencial, implementação dd45e0e. CI iniciado e ainda pendente; sem merge, Release ou publicação.


## 06/11/2026 — PDV presencial implementado localmente

Decisões expressas do usuário: operação conectada; venda sem identificação permitida, com seleção opcional de cliente ativo ou cadastro real durante o atendimento; pagamento combinado dispensável. Implementação em worktree isolada, branch `codex/pdv-presencial`, base `16a6466` / 1.22.0. Tela `/pdv` com skill shadcn do projeto, compra, faixas de quantidade, desconto, Pix/dinheiro/cartão, troco, revisão e conclusão. Sale aceita identificação anônima explícita exclusivamente no contrato do PDV, sem criar cliente fictício. Venda, recebível, compromisso por origem e entrega são atômicos e reutilizam serviços existentes. Sem baixa automática nem ampliação do financeiro para operador. Rascunho versionado e recuperação da mesma compra protegem contra duplicação; outra edição salva exige escolha explícita.

Validação: suíte geral com 889 testes em 215 arquivos; nove integrações PDV e 15 regressões de vendas/entregas/cancelamento/financeiro, banco descartável exclusivo; 11 testes focados finais incluindo recuperação de conflito; migração real com venda/cliente/item legados preservados. Tipagem, lint e build aprovados; nova rodada final de build após ajuste da recuperação registrada no relatório. Conferência visual sintética desktop/375 px, teclado, foco e temas. Revisão independente encontrou dois P2, corrigidos com regressões e rechecados. [Entrega, telas e limites](docs/pdv/ENTREGA.md).

Recorte: produtos simples disponíveis e peças prontas livres; kits, personalizações, encomendas, abertura/fechamento de caixa, evento/local, pagamentos mistos, fiscal e benefícios futuros não implementados nesta entrega. Informação de pagamento não confirma provedor; recebimento continua no financeiro atual. Ensaio HTTP autenticado integral preparado, mas não executado: revisão automática bloqueou iniciar o servidor Next isolado sem informar motivo além de “blocked by policy”. Não houve contorno.

Estado: implementação e validação local, versão base preservada em 1.22.0. Sem commit/push/PR/merge/Release/deploy ou migração operacional. Próxima ação: revisão humana da entrega e decisão externa sobre futura PR. Antes de PR, reconciliar com main e PRs #46/#47, preparar incremento MINOR único e notas conforme AGENTS.md. Não copiar arquivos desta worktree sobre a pasta operacional antiga com alterações de outros chats.


## 06/11/2026 — PDV presencial iniciado em isolamento

Necessidade de balcão/feira/rua confirmada pelo pedido; deixou de ser uma decisão sobre existir ou não PDV. Investigação da main 16a6466 / 1.22.0 e [proposta concreta](docs/superpowers/specs/2026-11-06-pdv-presencial-proposta.md) preparadas em área isolada. Recomenda-se entrega imediata de peças disponíveis, reaproveitando confirmação comercial, reservas por origem, entregas e financeiro. Cliente é obrigatório no contrato atual; não há suporte anônimo presumido. Operador não ganhou permissão de baixa financeira. Aguardam resposta: conexão/offline, comprador não identificado e pagamento único/combinado. Caixa completo, encomendas dentro do PDV, eventos/locais e estorno rápido são limites propostos, não requisitos aprovados.

Estado: investigação e proposta; sem implementação, testes funcionais, PR, merge, Release, deploy ou migração operacional. Versão preservada. Calculadora PR #47 e revisão visual PR #46 consultadas por leitura, sem presumir integração/publicação. Alterações da pasta operacional preservadas. Próxima ação: fechar decisões, desenho e plano e implementar o recorte autorizado.


## 06/11/2026 — PR da calculadora autorizada

Usuário autorizou preparar e criar PR. Versão 1.23.0 MINOR única sobre main 1.22.0 (`16a6466`), com manifestos e notas portuguesas sincronizados. Revalidação de preparação aprovada: 897 testes, tipagem, lint, build e quatro testes de versão/rodapés; [PR #47](https://github.com/bsgirardi/appb2t/pull/47) criada para revisão; CI será acompanhado pelo GitHub. Sem autorização de merge, Release ou publicação operacional. O registro de implementação abaixo preserva o estado anterior à preparação da PR.


## 06/11/2026 — calculadora unificada em revisão local

Base main reconferida em 1.22.0 / `16a6466`, com #42/#43 integradas; referências anteriores abaixo são históricas. Experiência principal com composição original, recursos por lote existentes e revisão de produto com referências atuais e antes/depois; preço final e memórias preservados. Comparadores E1.1/E1.2 reutilizados. Implementação na worktree `codex/calculadora-unificada`, com 897 testes unitários, tipagem, lint e build aprovados; conferência visual sintética desktop/celular e temas. Sem PR, merge, publicação ou banco operacional. Versão base 1.22.0 mantida; incremento único reservado à futura PR. [Entrega, evidências e limites](docs/calculadora-unificada/ENTREGA.md). Consumo segue por peça até decisão específica sobre entrada total; tempo principal do lote em horas/minutos. PDV presencial é frente separada; tributação brasileira por regime/operação segue direção futura, sem regras fiscais inferidas. A revisão de espaçamentos local de outro chat permanece separada.


## 06/11/2026 — ajustes de espaçamento em revisão local

Main 1.22.0 (`16a6466`) reconferida com #42/#43 integradas. Menu com rolagem independente, perfil acessível e espaçamentos corrigidos em campos e cartão de produto. Versão 1.22.1 preparada em isolamento, com inspeção visual sintética desktop/celular e temas, 47 testes de interface/regressão e 4 de versão aprovados; tipagem e lint aprovados. [Evidências e limites](docs/ux-admin-espacamento/ENTREGA.md). Sem PR, merge ou publicação. Registros abaixo mantêm o estado histórico de suas respectivas entregas.

Atualizado em 06/11/2026. Main de referência: 1.21.1 / 4786a8b.

## Estado atual — main 1.21.1; publicação separada

PRs confirmadas integradas: [#38](https://github.com/bsgirardi/appb2t/pull/38), previsão comercial e bloqueios (1.18.0); [#39](https://github.com/bsgirardi/appb2t/pull/39), metas mensais persistidas e UX de Orçamentos/Vendas (1.19.0); [#40](https://github.com/bsgirardi/appb2t/pull/40), proteção de Voltar/Avançar comercial (1.19.1); [#41](https://github.com/bsgirardi/appb2t/pull/41), clareza e proteção de rascunhos em Produção/Estoque (1.20.0). Main remota consultada: `4786a8b` (PRs #44/#45: distribuição de imagens e conferência de assets, 1.21.0/1.21.1). Não reiniciar essas entregas com base nas pendências históricas abaixo.

Metas agora são salvas por competência, com revisões; o histórico preserva as metas, sem congelar o realizado. Estimativas continuam distinguindo dados incompletos e não garantem demanda/capacidade. Previsão comercial e bloqueios acionáveis já existem; preservar suas premissas e limites. Produção/Estoque já distinguem saldos e apresentam resumos de efeitos, filtros e proteção de campos.

Última publicação local comprovada nos registros consultados: **1.18.0**, conforme o registro operacional local consultado (fora desta PR). A tentativa remota foi cancelada; último estado registrado: aplicação **1.13.1**, código preparado em 1.18.0, sem migração operacional aplicada, conforme o registro operacional remoto consultado (fora desta PR). Essas evidências não são uma nova consulta aos ambientes em execução. Publicar as entregas posteriores e aplicar a migração de metas continua pendente de procedimento autorizado, com conferência das migrações de cada destino.

Pendências atuais: publicação; aceite da equipe durante operações legítimas; backup externo automático com restauração; recorrência de desvios E2.4 e alertas internos de propostas. Próximo recorte visual aprovado pelo usuário em 05/11/2026: **Catálogo e Kits**, reaproveitando os padrões administrativos, sem alterar vitrine pública, precificação ou regras comerciais. Desenho aprovado; implementação na PR #43, em validação, ainda sem integração. A homologação humana pode acompanhar o uso normal, sem bloquear a evolução autorizada.

PR documental reconciliada em worktree isolada sobre main 1.21.1, versão 1.21.2. A pasta operacional antiga e suas alterações locais foram preservadas. Sem merge, migração ou deploy.


[Desenho proposto de Catálogo e Kits](docs/superpowers/specs/2026-11-05-catalogo-kits-ux-design.md), com abordagem, restrições e critérios de aceite; aprovado e implementado na PR #43, ainda em validação e sem merge.

## Registros históricos anteriores à consolidação

## 04/11/2026 — PR e integração E3.2 autorizadas

Usuário autorizou criar a PR e integrar E3.2. Preparação em **1.18.0**, incremento MINOR único sobre main 9797484/1.17.0, com manifestos sincronizados e notas em português. Abertura/CI/merge serão registrados após confirmação; publicação operacional não faz parte desta autorização. Os estados locais abaixo preservam a entrega anterior à autorização.

## 04/11/2026 — E3.2 implementada localmente

Desenho e plano aprovados, incluindo simulação antes da venda. Implementação em `codex/e3-2-previsao-comercial`, sobre main 9797484/1.17.0: bloqueios acionáveis, cobertura por pedido, cenário temporário pelo orçamento principal e etapas posteriores declaradas, sem promessa automática. [Entrega, testes, decisões e limites](docs/superpowers/reviews/2026-11-04-e3-2-previsao-comercial.md). Revisão independente com três casos materiais corrigidos por regressão RED→GREEN. Versão local mantida 1.17.0; sem PR/push/merge/publicação, migração operacional ou alteração dos serviços existentes. Homologação humana pendente e separada dos testes sintéticos; execução completa de fechamento registrada no relatório. A pasta operacional e seus documentos/skills locais foram preservados.

Os registros de detalhamento abaixo são históricos anteriores à aprovação e implementação.

## 04/11/2026 — E3.2 em detalhamento

Desenho aprovado pelo usuário em 04/11/2026. [Plano de implementação](docs/superpowers/plans/2026-11-04-e3-2-previsao-comercial.md) preparado e autorrevisado em sete tarefas; aguarda revisão do plano/escolha de execução. Verificação documental sem erros de espaço; sem instalação de dependências, implementação ou testes funcionais nesta fase. Estado abaixo registra a preparação anterior à aprovação.

Usuário escolheu incluir simulação antes da venda no incremento de bloqueios acionáveis e previsão por pedido conectado às negociações. [Desenho proposto](docs/superpowers/specs/2026-11-04-e3-2-previsao-comercial-design.md) preparado sobre main 9797484/1.17.0, em worktree isolada, com revisão independente sem perguntas materiais pendentes. Aguarda aprovação do desenho para elaborar plano; nenhum produto implementado ou teste funcional executado. Sem PR, push, merge, publicação, migração ou mudança operacional. Homologação humana permanece separada e não impede o detalhamento autorizado. Documentos locais da pasta operacional preservados.

## Roadmap de evolução aprovado em 27/10/2026

O acompanhamento das melhorias de calculadora, rentabilidade, produção, negociações, pontos de venda e anúncios está em [docs/ROADMAP-SELLER.md](docs/ROADMAP-SELLER.md). Consultar e atualizar esse arquivo ao trabalhar nessas etapas em qualquer chat. A ordem foi aprovada; os primeiros incrementos E1.1–E6.1 estão entregues, e as etapas amplas continuam parciais. As pendências históricas abaixo devem ser verificadas no código e nas entregas mais recentes antes de retomá-las.

Atualizado em 04/11/2026. Main reconferida em 1.14.0 com E1.2 integrada. E2.2 implementada em isolamento, com validação/limites no registro de 04/11 ao final e no [relatório](docs/superpowers/reviews/2026-11-04-e2-2-desvios-produtivos.md); sem PR, integração ou publicação desta etapa. A versão efetivamente publicada não foi reconferida; registros de publicação abaixo são históricos confirmados.

## Estado atual — 1.12.0 publicada em 29/10/2026

[PR #31](https://github.com/bsgirardi/appb2t/pull/31) integrada na main local e GitHub, commit `6e901a7`; versão 1.12.0 publicada em http://localhost:3000 após backup final, restauração e migração ensaiadas. E5/consignação e E6/anúncios agora disponíveis localmente; 106 projeções legadas e o mesmo banco/volume preservados. CI da PR aprovado: 989 testes padrão, suites E3/E4/E5/E6 e tipos/lint/build. [Publicação e limites](docs/superpowers/2026-10-29-publicacao-1.12.0.md).

[Auditoria dos outros chats, PRs e código](docs/superpowers/reviews/2026-10-29-roadmap-auditoria.md) reconciliou as marcações de E2, E4 e E5 e os antigos impedimentos de testes. Próxima recomendação: E1.2 (canais/descontos/margem). Permanecem detalhamento de custos/rankings, evolução produtiva/prazo comercial, margem e alertas das negociações, decisão de balcão/feira e integrações externas. IA e postagem automática não foram implementadas. Aceite da equipe, domínio/HTTPS e backups externos automáticos seguem pendentes. A documentação desta auditoria é local, posterior à PR integrada.

## Estado da integração E1–E4 em 28/10/2026

PRs #19, #21, #22 e #23 integradas na main local e no GitHub, versões 1.7.0 a 1.10.0. A manutenção 1.10.1 na PR #25 corrigiu a recursão da validação de formulários, a descoberta de testes e a observação de concorrência em pools pequenos. CI completo aprovado, incluindo 925 testes padrão, 29 E3 e 21 E4. Versão 1.10.1 publicada na instalação local, com backup, restauração, migrações e 103 projeções legadas preservadas. [Publicação e limites atuais](docs/superpowers/2026-10-28-publicacao-1.10.1.md). [Relatório atual](docs/superpowers/reviews/2026-10-28-integracao-prs.md). As notas abaixo preservam a preparação histórica; próximos incrementos E1–E4 continuam pendentes.

## E5 — registro anterior à integração e publicação

E5.1 implementada e validada localmente em worktree isolada, branch `codex/e5-consignacao`: ambos os modelos de comissão, custódia, vendas, títulos, acertos, correções, custos, reposição e resultado. 661 testes unitários e 32 integrações/regressões aprovados; migração real/reaplicação em PostgreSQL exclusivo, tipos, lint e build aprovados. Revisão independente com dois P2 corrigidos e testados. [Relatório e limites](docs/superpowers/reviews/2026-10-28-e5-consignacao.md). [PR #26](https://github.com/bsgirardi/appb2t/pull/26) aberta na versão 1.11.0, MINOR sobre main 1.10.1, com manifestos e notas sincronizados. CI pendente. Sem merge/publicação ou migração operacional. E5 em validação; balcão/feira fora do recorte.

## E4 — registro anterior à integração

E4.1 teve migração real e concorrência aprovadas em PostgreSQL 17 descartável exclusivo: dados sintéticos de sete tabelas legadas preservados, 21 integrações e cinco rodadas finais de 10 casos aprovadas. Mais 31 testes unitários/UI/regressões, tipagem, lint e build aprovados, incluindo versão/rodapés/Atualizações. Branch `codex/e4-negociacoes` preparada na 1.6.0 sobre main 1.5.1; [PR #23 em rascunho](https://github.com/bsgirardi/appb2t/pull/23) criada após autorização. Limite da suíte completa por recursão do Vitest continua explícito. [Relatório atual](docs/superpowers/reviews/2026-10-28-e4-validacao-pr.md). Sem merge, publicação, migração operacional ou atualização dos contêineres existentes. E4 ampla continua parcial; próxima ação: revisar a PR e resolver/aceitar limite da suíte antes de eventual integração; banco descartável removido após validação.

## Desenvolvimento concluído — registros históricos anteriores às integrações

E3.1 entregue na [PR #22 em rascunho](https://github.com/bsgirardi/appb2t/pull/22), versão 1.6.0 (MINOR), após autorização específica. Revalidação: 46 testes focados, tipagem, lint e build aprovados, incluindo manifestos, rodapés e Atualizações ADMIN/OPERATOR. Limites de suíte completa/banco mantidos; E3 segue parcial. E1 #19 e E2 #21 também propõem 1.6.0: reconciliar versão/notas conforme a main e a ordem de integração antes de merge. Sem merge, publicação, migração ou alteração de contêineres. A nota abaixo registra a entrega local anterior à PR.

E3.1 implementado localmente na branch `codex/e3-fila-visual`, base main 1.5.1 (`d74ee75`): calendário semanal por impressora e reordenação simulada antes de confirmar, com OPs/linhas e impacto entre máquinas, validade temporal, conferência dos dados atuais e idempotência. Validação: 45 testes focados, tipagem, lint, build e prévia sintética desktop/375 px aprovados; revisão independente com dois achados corrigidos. Integrações de banco não executadas (instância E3 exclusiva indisponível) e suíte completa não validada por recursão do Vitest. [Relatório e limites](docs/superpowers/reviews/2026-10-27-e3-fila-visual.md). E3 permanece parcial; versão 1.5.1, sem PR/push/merge/publicação, migrações ou alteração de contêineres. Próxima ação: validar banco exclusivo e resolver/aceitar limite da suíte antes de eventual integração; demais incrementos E3 continuam pendentes.

E2.1 entregue na [PR #21 em rascunho](https://github.com/bsgirardi/appb2t/pull/21), versão 1.6.0, sem merge/publicação. Preparação validada com 37 testes relacionados, tipagem, lint e build; limite da suíte completa e pendências E2 mantidos no relatório. A nota de entrega local abaixo registra o estado anterior à autorização da PR.

E2.1 foi implementado localmente em isolamento na branch `codex/e2-reconciliacao`, sobre a main 1.5.1, sem PR, push, merge ou publicação. O detalhe de rentabilidade explica memória de preço → venda negociada → realizado com fontes e cobertura, sem duplicar perdas ou mudar apurações históricas. Validação: 34 testes relacionados, tipagem, lint, build e prévia sintética responsiva aprovados; suíte unitária completa continua limitada pela recursão do Vitest. E2 permanece parcial. [Verificação e limites](docs/superpowers/reviews/2026-10-27-e2-reconciliacao.md).

E1.1 foi implementado em isolamento na versão 1.6.0 e entregue na [PR #19 em rascunho](https://github.com/bsgirardi/appb2t/pull/19), sem merge ou publicação. Comparação ampliada de lotes validada com 78 testes relacionados, tipagem, lint, build e prévia responsiva; suíte unitária completa continua limitada pela recursão do Vitest. E1 permanece parcial, com canais/descontos e comparação de memórias pendentes. [Verificação e limites](docs/superpowers/reviews/2026-10-27-e1-comparacao-lotes.md).

- Gestão integrada U1–U5, dashboard, catálogo, solicitações, personalização e kits entregues.
- C4: anexos e aprovação privada de arte, histórico imutável e bloqueios produtivos aplicáveis entregues.
- C5: compra direta explícita, conferência de frete/consulta, aceite privado de orçamento, venda/parcelas idempotentes e cancelamento entregues. PR #5 integrado e C5 publicado em http://localhost:3000; 95 projeções legadas e volume preservados. [Registro](docs/superpowers/2026-10-23-publicacao-c5.md).
- Primeiro administrador criado pelo procedimento oficial, com ADMIN ativo; nenhuma senha registrada na documentação.
- Seletor Automático → Claro → Escuro publicado na loja, login, administrativo e acompanhamento privado pelo PR #6. Preferência individual salva no navegador; paletas da empresa preservadas. Validação final com 719 testes em 231 arquivos, tipagem, lint, build e login administrativo na instalação publicada. [Verificação e publicação](docs/superpowers/2026-10-23-tema-e-encerramento.md).
- Revisão da experiência administrativa entregue pelo [PR #9](https://github.com/bsgirardi/appb2t/pull/9) e aplicada no Docker local: campos obrigatórios e condicionais destacados, dados principais agrupados, seções adicionais expansíveis, resumos contextuais, ações de formulário acessíveis durante a rolagem e edições de clientes/configurações em painel lateral. Regras, permissões e dados preservados. [Relatório](docs/superpowers/reviews/2026-10-25-administrativo-ux.md).

Não há módulo de negócio obrigatório por desenvolver no escopo aprovado até C5. A revisão administrativa foi implementada; as pendências de validação e operação abaixo continuam abertas. A configuração comercial será feita manualmente pelo usuário e não representa módulo por desenvolver.

## Pendências técnicas e de validação

1. **Resolvido no ambiente de referência: execução completa do Vitest.** A consulta CSS `:invalid` durante o tratamento de `invalid` provocava validação recursiva no jsdom. A leitura de `willValidate`/`validity` evita novos eventos e preserva os campos elegíveis e o foco. Descoberta limitada aos testes atuais; observadores de concorrência reutilizam a conexão reservada e atualizam o snapshot PostgreSQL. A suíte padrão inteira passou em uma execução Linux/Node 22 no [CI](https://github.com/bsgirardi/appb2t/actions/runs/40724120597): 925 testes em 275 arquivos. E3 e E4 completam a cobertura em bancos exclusivos; não há erros suprimidos nem upgrade do Vitest. Uma rodada Windows/Node 24 sob carga teve timeout de PDF e inicialização de worker, sem a antiga recursão; esse resultado não é apresentado como suíte Windows aprovada. Os dois arquivos afetados passaram novamente em execução isolada (oito testes), sem alterar limites de segurança ou tempo.
2. **Resolvido: integrações de banco da revisão administrativa.** A suíte padrão inclui as 304 integrações gerais no banco dedicado; E3 usa outra instância e passou 29 testes, E4 passou 21 com migração real e concorrência. Não foram usados dados ou banco operacional nos testes.
3. **Pendente com a equipe: conferir os fluxos reais.** Cadastro, orçamento/venda, apontamento de produção, estoque e financeiro precisam ser acompanhados com dados representativos do uso humano. Publicação validada por saúde/versão/rotas/permissões e preservação dos dados; não foram criadas operações fictícias no banco publicado para substituir essa conferência.
4. **Resolvido: disponibilizar recuperação de senha administrativa.** Implementação integrada e presente na imagem tools/admin 1.10.1, com acesso pelo usuário sem privilégios. Procedimento em INSTALACAO_SERVIDOR.md. Nenhuma senha operacional foi alterada ou usuário recriado.
5. **Resolvido: verificações automáticas no GitHub.** Workflow `.github/workflows/ci.yml` verifica tipagem, lint, build e todas as suítes com PostgreSQL 17 exclusivo em PRs e pushes da main. Linux/Node 22 coincide com o Docker; não configura publicação automática.

## Configuração e operação pelo responsável

- Preencher contatos, endereço de retirada, produtos/kits, preços, instruções de pagamento e modalidades. Compra direta dos itens legados permanece desabilitada até ativação explícita.
- Configurar domínio/proxy HTTPS e APP_URL para acesso externo; a instalação atual continua local, limitada a 127.0.0.1:3000.
- Para instalar do zero pelo GitHub no outro servidor e atualizar versões, seguir [INSTALACAO_SERVIDOR.md](INSTALACAO_SERVIDOR.md). Compose e exemplo de ambiente suportam pasta persistente, rede própria e porta 1992, mantendo o fallback da instalação local existente. A configuração remota deve ser executada no servidor pelo responsável.
- Configurar retenção e cópia automática de backups fora desta máquina, com restauração periódica. Backups manuais e ensaios desta entrega já foram feitos.
- Antes de maior volume público, estabelecer ingresso confiável para refinar a cota compartilhada de inicialização/troca de links. Não confiar em cabeçalhos fornecidos pelo visitante.

## Expansões opcionais

Frete automático depende de escolher e contratar provedor real. Gateway, integrações bancárias/fiscais, marketplaces e outras expansões exigem escopo próprio. Pagamento e frete pela equipe continuam manuais. Não existe C6 aprovado.

## Evidências e limites

A revisão administrativa passou por build local e Docker, tipagem, lint, revisão independente e verificações visuais com fixtures. Seus 446 testes unitários passaram em grupos separados de interface e domínio. A execução conjunta do Vitest apresenta recursão no transporte de erros neste runtime; na preparação da PR, a repetição do grupo completo de interface também encontrou esse erro, enquanto domínio, tipagem e lint passaram novamente. Integrações de banco dessa revisão não foram executadas, pois exigem o banco exclusivo de testes. Os resultados históricos anteriores continuam válidos para suas respectivas entregas; não representam uma nova execução completa após esta revisão.

[Validação C5](docs/superpowers/2026-10-23-catalogo-c5-validacao.md) e [encerramento](docs/superpowers/2026-10-23-tema-e-encerramento.md) distinguem testes, inspeção visual e limites da automação. Relatos antigos de C5 apenas em desenho, administrador inexistente e inspeção restrita ao tema do sistema foram superados. A limitação da automação do campo nativo de data não representa defeito reproduzido no preenchimento humano.

Dados de outras instalações não foram importados. .env, chaves, senhas, capturas, dumps e evidências operacionais permanecem fora do Git.

## E1.2 — desenho em revisão em 29/10/2026

Abordagem aprovada pelo usuário: canais/descontos com cenários nomeados e salvos, reutilizando memórias. Desenho em `docs/superpowers/specs/2026-10-29-e1-2-canais-descontos-design.md`, ainda aguardando aprovação dos detalhes. Trabalho isolado sobre main 6e901a7, versão 1.12.0; sem implementação, PR, push, merge, publicação ou migração operacional. Importação e projeção mensal permanecem incrementos separados. Documentos pós-publicação copiados para a worktree sem alterar os originais da pasta operacional.

Desenho E1.2 completo aprovado em 29/10/2026; plano autorrevisado em `docs/superpowers/plans/2026-10-29-e1-2-canais-descontos.md`, aguardando confirmação antes de implementar. Versão permanece 1.12.0; nenhuma ação operacional.


## E1.2 — implementação local em 29/10/2026

Canais, descontos, cobertura/meta e comparações nomeadas imutáveis implementados na branch isolada `codex/e1-2-canais-descontos`, sobre main c3b3dae (1.13.0), versão 1.14.0 preparada. Tipos/lint/build, oito integrações E12, migração/reaplicação com sete projeções legadas e regressões E3–E6 passaram. Revisão independente com achados reproduzidos e corrigidos. Suíte padrão completa aprovada: 1.023 testes em 304 arquivos; [relatório e limites](docs/superpowers/reviews/2026-10-29-e1-2-canais-descontos.md). Sem PR/push/merge/publicação ou ação operacional. Importação, projeção mensal e aceite humano permanecem separados.

PR E1.2 autorizada pelo usuário em 29/10/2026 e em preparação, versão 1.14.0 sobre main 1.13.0. Sem autorização de merge/publicação ou migração operacional.

E1.2 entregue na [PR #34](https://github.com/bsgirardi/appb2t/pull/34), versão 1.14.0, aberta para revisão após autorização. CI pendente; sem merge/publicação/migração operacional.

Em 30/10/2026 foi autorizada a integração das PRs pendentes. #34 é a única aberta; base reconciliada com main 1.13.1 (ae006a2), preservando a versão 1.14.0 e as notas anteriores. CI da base reconciliada será conferido antes do merge. Publicação/migração operacional permanecem separadas.

### 30/10/2026 — E2.2 iniciada: fontes e desenho

Main remota conferida em ce38daa, versão 1.14.0, com E1.2 integrada pela PR #34. Continuação pela E2.2 conforme encaminhamento; E2.3/rankings e E2.4/recorrência permanecem separados. Lidos os documentos locais de acompanhamento e auditoria antes do isolamento, sem sobrescrever alterações da pasta operacional.

[Proposta E2.2](docs/superpowers/specs/2026-10-30-e2-2-desvios-produtivos-design.md): abrir componentes da memória congelada versus componentes realizados atribuídos, explicar provisão de falhas sem inventar custo causal, perdas já incluídas e parcela não reconciliada. Desenho para aprovação; plano e implementação ainda não iniciados. Worktree própria, branch codex/e2-2-desvios-produtivos, a partir da main vigente.

Validação desta fase: inspeção estática das fontes, comparação dos módulos relevantes com a main e revisão documental. Sem teste funcional/build, PR/push/merge, publicação, migração ou alteração de contêiner. Versão preservada em 1.14.0; versão efetivamente publicada não reconferida nesta fase. Próximo passo: aprovação do desenho e plano executável. E2 permanece parcial.

### 30/10/2026 — desenho E2.2 aprovado e plano preparado

Usuário aprovou o desenho E2.2. Plano executável em docs/superpowers/plans/2026-10-30-e2-2-desvios-produtivos.md preparado e autorrevisado: componentes congelados opcionais, projeção pura, interface por linha, integração/histórico em banco E22 exclusivo e verificação final. Banco previsto localhost:55438/b2t_e22_test, variável E22_TEST_DATABASE_URL e setup com guarda própria; ainda não provisionado.

Método recomendado: execução direta neste chat com revisão independente final, aguardando revisão do plano e confirmação do método. Somente documentação nesta fase; sem código de produto, dependências instaladas, testes funcionais/build, banco, PR/push/merge ou publicação. Versão 1.14.0 preservada; E2.3/E2.4 continuam separados. A pasta operacional permanece intacta.

### 04/11/2026 — E2.2 implementada e validada em isolamento

Desenho/plano aprovados e execução direta na branch codex/e2-2-desvios-produtivos, base main ce38daa/1.14.0. Detalhamento por material, trabalho, energia, manutenção, extras/complementos e provisão prevista para falhas; fontes e cobertura explícitas, perdas já incluídas e parcela não reconciliada sem atribuição causal inventada. Motores, rateios, memória/documentos e apurações históricas preservados; leitura ampliada pode exigir nova conferência humana pelo fingerprint atual.

Validação final: 752 unitários Windows; 1.056 testes padrão Linux/Node 22 com banco sintético exclusivo; 14 integrações E22 em Windows e Linux; tipos, lint, build e revisão independente sem achados. Prévia sintética desktop/375 px e teclado conferidos, sem overflow da página. Tentativas Linux anteriores e ajustes exclusivos de ambiente registrados no relatório; nenhuma regra de produto flexibilizada. Recursos descartáveis e prévia removidos após validação, serviços existentes preservados.

[Relatório e limites](docs/superpowers/reviews/2026-11-04-e2-2-desvios-produtivos.md). Versão mantida em 1.14.0; sem PR/push/merge, publicação ou migração operacional. Integração/publicação requerem autorização específica; futura PR exige SemVer/notas únicos sobre main vigente. E2 ampla continua parcial: E2.3/rankings e E2.4/recorrência permanecem separados; homologação humana pendente.
