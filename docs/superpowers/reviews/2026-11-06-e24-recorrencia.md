# E2.4 — recorrência de desvios e conferência humana da ficha

Iniciada em 06/11/2026; conferência técnica em 07/11/2026. Branch local `codex/e24-recorrencia`, worktree `C:/Users/Administrador/.codex/worktrees/e24-recorrencia/appb2t`. Base inicial main `16a6466`/1.22.0; reconciliada localmente com main `bd0b4ebdd44e4642fb820781b672f3cfeccfac5c`/1.24.0. Nenhuma integração desta feature em main, PR, push, Release ou implantação operacional.

## Comportamento entregue

Seção própria de recorrência em `/rentabilidade`, exclusiva para ADMIN ativo. Janela fixa de 90 dias civis inclusivos em São Paulo pela primeira confirmação/conversão; custos atuais, inclusive revisões posteriores. Produto, assinatura canônica das premissas produtivas congeladas e quantidade idêntica delimitam os grupos. Não usa o catálogo atual para reconstruir custo passado nem agrega configurações por médias.

Critérios aprovados pelo usuário: pelo menos cinco pedidos independentes elegíveis; pelo menos três e 60% da amostra com excesso simultâneo de 10% e R$ 5 por linha. Limites inclusivos, Decimal sem arredondamento para decidir. Previsto não positivo impede o percentual. Cobertura populacional não recebe um limiar inventado: a interface mostra elegíveis/candidatos e motivos, sem afirmar representatividade estatística.

Evidência só sustenta sugestão com entrega completa, composição reconciliada, custo completo/não provisório e conferência humana vigente. Provisório, incompleto, memória ausente/inválida, revisão vencida e parcela não reconciliada permanecem visíveis, fora da amostra. Cada linha apresenta pedido/link, chave, data, memória, revisão quando disponível, previsto/realizado, valores conhecidos, diferença monetária/percentual, composição e fontes. Pequenos resíduos mostram precisão integral.

A leitura transitória rastreia entregas, perdas produtivas vinculadas e consignação até `ProductionLine.id`. Várias origens acabadas da mesma linha produtiva compartilham a chave. Componentes conexos por pedido ou produção são identificados antes dos grupos/filtros de produto: se há múltiplas linhas/pedidos dependentes, ficam visíveis fora da contagem; não se escolhe arbitrariamente a melhor evidência. Proveniência ausente e estoque de abertura não viram independência presumida. Essa escolha conservadora pode reduzir a amostra.

O filtro desta seção seleciona linhas; não usa período, canal, produto ou cobertura do relatório superior. Configurações e evidências são paginadas depois do cálculo. A sugestão é **Conferir a ficha**: a equipe deve conferir premissas e fontes, sem atribuir causalidade comprovada à ficha. Não há botão/comando para alterá-la automaticamente.

## Preservação do sistema

Preço, desconto, frete, taxas e comissão não entram no critério. Provisão de falhas não é custo causal medido. Perdas produtivas já atribuídas não são somadas novamente; perda em custódia continua separada. Depreciação, contribuição, resultado e caixa mantêm seus conceitos.

Consulta em RepeatableRead com `SET TRANSACTION READ ONLY`. Motor monetário, DTOs persistidos e leitura padrão das fontes preservados. Para E2.4, uma opção transitória no leitor permite ignorar snapshots com entrada ilegível, preservando custos conhecidos; não regrava revisão/hash antigo nem reconstrói memória com ficha atual. Fontes mostram o valor agregado; não há atribuição inventada de componente individual a cada fonte.

Revisão independente encontrou um P2: o relatório anterior falhava ao ler memória ilegível e impedia a composição da página. Reprodução RED com entrada nula e consulta real em banco sintético; correção apresenta indisponibilidade do relatório para esse TypeError e preserva a seção independente. Erros de autorização, validação e banco que não são esse erro de estrutura continuam propagando. O revisor confirmou a resolução e não apontou outro efeito material.

## Verificação

- Base inicial: 35 testes relacionados aprovados antes da implementação.
- Domínio: RED por módulo ausente; 30 casos iniciais e um caso adicional isolando a materialidade monetária. Fronteiras 5 pedidos, 3/5, 3/6, R$ 5/10%, zero, precisão, configurações/quantidades, dependência transitiva, mesmo pedido, origens incompletas, revisão vencida e perdas.
- Interface: RED por componente ausente; quatro testes de apresentação, evidência, estados pendentes/vazios, produto e paginação sem mudar amostra. Guarda de banco: um teste recusa destinos operacionais/compartilhados/remotos e parâmetros alternativos. Conjunto final focado: **36 testes em três arquivos** aprovados.
- Base inicial: **917 unitários em 216 arquivos** aprovados no Windows. Não representa a suíte geral com banco nem a base 1.24.0 inteira.
- Base reconciliada 1.24.0: **12 integrações E24** aprovadas em PostgreSQL 17 sintético exclusivo `127.0.0.1:55441/b2t_e24_test`. Cobrem leitura READ ONLY, apuração anterior preservada integralmente, ausência de revisão produtiva nova, janela civil, ADMIN/OPERATOR/inativo/ausente, compartilhamento entre produtos/origens, memória ilegível, página composta, consignação com conferência obrigatória, perda em custódia separada, perda produtiva atribuída uma vez e distinção entre memória sem vínculo, vínculo desatualizado e conferência desatualizada.
- **14 integrações E22 em dois arquivos** aprovadas na mesma base em outro PostgreSQL descartável exclusivo `127.0.0.1:55438/b2t_e22_test`; leitura padrão e histórico exercitados novamente.
- Build da base inicial e build final após reconciliação com 1.24.0 aprovados. Tipagem serial final e lint completo aprovados; formatação e diff sem erros. **Suíte padrão final Linux/Node 22: 1.245 testes em 345 arquivos aprovados**, incluindo integrações gerais em PostgreSQL 17 descartável exclusivo no mesmo namespace do executor, sem publicação de sua porta no host. Rodada anterior: 1.244 testes aprovados; a final inclui o teste adicional da materialidade monetária. Suítes exclusivas E3/E3.2/E4/E5/E6/E1.2/metas/PDV não foram reexecutadas nesta tarefa.
- Prévia sintética com componentes/CSS reais: desktop 1440 px e celular 375 px, claro/escuro, expansão, Tab e rolagem local por seta. Página mediu 1425/360 px, sem expansão horizontal; tabela móvel 294 px com conteúdo 640 px e rolagem por teclado observada. Fonte Roboto. Não é uma sessão autenticada operacional; a composição da página foi testada com identidade de guarda sintética e autorização de usuário real do banco descartável revalidada.

Guias Next locais consultados antes do código: `05-server-and-client-components.md`, `06-fetching-data.md`, `08-caching.md` e `caching-without-cache-components.md`, na instalação da mesma versão 16.4.2. Skill shadcn do projeto e regras React aplicadas; CLI de contexto/documentação e componentes instalados consultados. Nenhuma dependência nova.

## Ocorrências e decisões

- Fixtures corrigidas para respeitar o contrato existente: tempo de máquina positivo; relógio e confirmação explícita da consignação (o default PostgreSQL não segue Date simulado); asserção de proveniência por pedido, sem depender da ordem não garantida do leitor. Não houve flexibilização do produto.
- Porta inicial 55439 foi abandonada ao identificar convenção de E32/metas nessa porta. Somente o contêiner E24 próprio foi recriado em 55441; bases/contêineres existentes não foram usados nos testes.
- A primeira tipagem após incorporar main encontrou arquivos de rotas `.next` sendo regenerados simultaneamente pelo build. Após o build, tipagem serial final aprovada, sem correção artificial de rotas.
- Tentativas de executor Linux com bind mount não chegaram a iniciar o contêiner; somente seus comandos foram interrompidos. A validação geral foi movida para cópia estática da fonte e dependências próprias no executor descartável, com banco também exclusivo. Não foi contornado um bloqueio de aprovação ou usado banco compartilhado.

Logs/ledger e capturas locais: `.superpowers/sdd/2026-11-06-e24-recorrencia/` e `.superpowers/evidence/e24/`. O executor Linux recebeu cópia atualizada da fonte final, incluindo o teste adicional de materialidade e os motivos distintos de memória/conferência. Avisos de depreciação do ESLint e de navegação não implementada pelo jsdom foram emitidos nas verificações, sem falha nas rodadas aprovadas.

[Prévia desktop com dados fictícios](../../ux-e24/desktop.png) · [Prévia celular](../../ux-e24/celular.png). Reprodução: `node tests/recurrence-preview-server.mjs`, endereço `http://127.0.0.1:4341/tests/recurrence-preview.html`. A prévia foi encerrada após a conferência.

## Estado e limites

Versão da base preservada em **1.24.0** nesta entrega local; não há nova PR. Futura PR deve reconferir main, incrementar MINOR uma única vez, sincronizar manifestos/notas e conferir APP_VERSION nos rodapés e Atualizações. Sem tags automáticas. Regras de distribuição após eventual merge continuam aplicáveis, mas não autorizam uma publicação nesta tarefa.

A assinatura comprova equivalência das premissas registradas, não identidade física de atributos sem registro (cor/geometria/arte). Versões produtivas diferentes separam grupos conservadoramente. Independência considera a janela consultada e a granularidade produtiva disponível. Corrupção arbitrária do resultado congelado, vínculos ou totais comerciais continua fora da tolerância específica a entrada ilegível; não se declarou saneamento geral do legado. Latência específica da recorrência em grande volume não foi aferida; a consulta completa mantém o limite transacional de 30 segundos, sem truncar a população para fabricar uma amostra.

Homologação humana com pedidos conhecidos continua pendente. Aceite técnico sintético não é aceite operacional. Não foram acessados dados operacionais nos testes mutáveis, criadas sessões operacionais artificiais, alteradas credenciais, migrado banco operacional ou atualizados contêineres existentes. Checkout operacional antigo e arquivos paralelos preservados. Branch/worktree devem permanecer para revisão; não pedir outro chat nem enviar mensagens aos demais chats.

## Preparação autorizada da PR — 07/11/2026

Usuário solicitou abrir a PR ao concluir a implementação. A implementação local está concluída; esta autorização permite push da branch e criação da PR, sem iniciar implantação operacional ou merge. Main consultada novamente: `bd0b4ebdd44e4642fb820781b672f3cfeccfac5c`/1.24.0. Incremento MINOR único para **1.25.0**, sincronizando os dois manifestos e adicionando notas em português sem alterar as anteriores. APP_VERSION continua como fonte dos rodapés e de Atualizações.

40 testes focados em cinco arquivos aprovados, incluindo versão do manifesto/lock/histórico, rodapés reais do login/administrativo, Atualizações para ADMIN/OPERATOR e recorrência. Código funcional não mudou desde a suíte geral de 1.245 testes e as integrações E24/E22. Build e lint da 1.25.0 aprovados; resultado da PR será registrado após a criação. Acesso do conector GitHub ao repositório privado indisponível; CLI autenticada do responsável disponível. Sem alteração de permissões ou credenciais.
