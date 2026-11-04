# E2.2 — detalhamento dos desvios produtivos

Data: 04/11/2026. Branch `codex/e2-2-desvios-produtivos`, worktree `C:/Users/Administrador/.codex/worktrees/e2-2-desvios-produtivos/appb2t`, base main `ce38daa` (1.14.0). Desenho de 30/10 e plano aprovados pelo usuário; execução direta com revisão independente final. Sem PR, push, merge, publicação ou migração operacional.

## Entrega

Detalhe de cada linha da rentabilidade agora abre material, trabalho, energia, manutenção, extras/complementos e provisão prevista para falhas. Valores previstos vêm do resultado congelado da mesma memória já validada para a linha; nenhuma ficha ou parâmetro atual reconstrói o passado. Campos opcionais preservam compatibilidade com JSON antigo.

Abertura deriva dos custos já atribuídos, com valores previstos, realizados, efeitos na contribuição, cobertura e origem. Mantém a ponte agregada E2.1 e compara cada composição ao seu total autoritativo. Parcela não reconciliada permanece explícita; até diferenças inferiores a um centavo mostram precisão decimal. Divergências de composição que se anulam no efeito líquido não recebem fechamento completo.

Provisão de falhas é parcela prevista. A parcela realizada adicional nessa linha é zero porque custos efetivos já estão nos componentes; isso não comprova ausência de falhas nem economia. Não há medição causal nova ou distribuição inventada entre falhas e peças boas. LOSS é informativa e já incluída, com aviso de depreciação. Perda em custódia permanece distinta de falha fabril.

Complementos entram uma vez pelos valores da conferência; U3_SOURCE/NOT_OCCURRED/COMPLEMENT não criam novos débitos na explicação. Reservas, entregas e movimentações não são somadas outra vez. Comissão, frete, contribuição, resultado após depreciação e caixa mantêm os indicadores existentes.

## Compatibilidade e limite de uso

Apurações, revisões, documentos e snapshots anteriores não são regravados. Enriquecer a leitura atual com composição prevista muda o fingerprint de fontes quando o dado passa a existir: conferências antigas podem pedir nova revisão humana. Não se atualizam seus hashes automaticamente. Nova apuração guarda os novos campos opcionais; engineVersion u4-v1 continua, pois as regras monetárias não mudaram.

Origem de abertura sem composição, memória antiga sem campos legíveis, dados provisórios, entregas incompletas ou conferência vencida mantêm valores conhecidos/motivos sem prometer fechamento. A ponte agregada pode fechar enquanto a abertura continua indisponível. Não existe valor individual de cada componente por fonte no DTO atual: a interface lista as fontes do agregado, sem inventar tal atribuição.

## Validação

- Leitor previsto: RED por módulo ausente; GREEN com dados congelados, zero explícito, ausência/malformação e exclusão de depreciação/encargos. Primeiro conjunto: 35 testes em três arquivos.
- Projeção: RED por módulo ausente; GREEN com exemplo aprovado 96 → 106, efeito −10, provisão +6 sem causalidade, perdas/reservas, extras, cobertura, resíduo de seis casas e compensação de divergências. Conjunto com regressões: 41 testes em seis arquivos.
- Interface: RED por módulo ausente; 11 testes em três arquivos aprovados após corrigir uma consulta ambígua do próprio teste (a perda aparece nas fontes e no aviso, sem custo duplicado).
- **752 testes unitários em 185 arquivos aprovados no Windows**, após geração explícita do Prisma Client na instalação própria.
- **14 integrações E22 em dois arquivos aprovadas no Windows e novamente no Linux/Node 22**, em PostgreSQL 17 sintético descartável: leitura READ ONLY sem ProductionCostRevision nova, memória congelada independente de catálogo, dados ausentes/inválidos, vínculo incompatível, três confirmações de extra, falhas em evento misto, LOSS vinculada, abertura, histórico imutável/hash antigo recusado, provisório, entrega parcial/duas origens e consignação produtiva/de abertura com perda em custódia separada.
- A integração da extração foi demonstrada RED ao desativar temporariamente apenas o enriquecimento; restaurada a implementação, GREEN. A guarda de banco também foi observada RED → GREEN e recusa URL/host/porta/banco/parâmetros divergentes.
- Migrações existentes aplicadas em banco E22 vazio exclusivo; não há migração nova de produto. CI recebe suíte E22 e variável própria, sem execução remota nesta entrega.
- Tipagem, lint e build aprovados, incluindo `/rentabilidade/[id]`. `git diff --check` sem erros.
- Revisão independente somente leitura por revisor de contexto novo: nenhum achado acionável; nenhum comportamento deixado fora de julgamento. Não substitui os testes acima.
- Prévia com componentes/CSS reais e dados fictícios em navegador: 1440 px e 375 px; largura rolável da página 1425/360 px, sem overflow horizontal. Detalhe expandido, Tab e rolagem de tabela por seta conferidos; estados completo, incompleto, provisório e resíduo visíveis. Não é validação de fluxo autenticado operacional. Capturas e logs locais preservados na pasta ignorada `.superpowers/evidence/2026-11-04-e2-2-desvios-produtivos/`.
- **1.056 testes padrão em 308 arquivos aprovados no Linux/Node 22**, incluindo integrações gerais em PostgreSQL 17 exclusivo, após corrigir o dimensionamento do ambiente. Snapshot funcional `7d70395`, equivalente ao código final após formatação `0ddcb76`; nenhuma regra foi alterada entre as rodadas. O runtime mínimo emitiu aviso de detecção OpenSSL, sem impedir as conexões ou os testes aprovados. Suítes exclusivas E3–E6/E1.2 não foram reexecutadas nesta entrega.

## Ocorrências resolvidas e decisões

A primeira rodada ampla iniciou antes da geração explícita do cliente Prisma: 727 testes passaram e um arquivo falhou por módulo gerado ausente. Após o preparo, a rodada de base passou 719 testes/181 arquivos, e a final passou 752/185. Não foi a antiga recursão do Vitest. O aviso jsdom de navegação não implementada apareceu nas rodadas aprovadas existentes, sem falha de teste.

As primeiras integrações ajustaram fixtures aos contratos reais: mudança de descrição para invalidar vínculo sem corromper totais comerciais; relógio Date fixo no teste de consignação para manter as datas sintéticas originais; comissão em duas casas; evento próprio por origem, conforme unicidade do banco. Nenhuma regra do produto foi flexibilizada.

A ampliação Linux exigiu ajustes somente no ambiente descartável: o primeiro diretório em memória era noexec; a segunda instalação em memória foi interrompida por lentidão; o executor passou a usar disco com limite de memória. A primeira suíte completa chegou ao fim com 968 casos aprovados e 88 falhos em 55 arquivos quando o PostgreSQL esgotou o tmpfs de 1 GiB (`No space left on device` durante TRUNCATE). Essa rodada não é aprovada. O banco foi substituído por outro descartável em disco e sua prontidão conferida antes da nova rodada. Logs separados preservam essas ocorrências; não houve correção do produto ou flexibilização de teste para contorná-las.

Decisões do executor: preparar baseline antes da tarefa 1 (pré-condição do plano); adaptar scripts auxiliares de ledger para PowerShell; conferir somas previstas/realizadas separadamente (evitar erros compensados); fixar somente Date nas fixtures de consignação. Sem efeito esperado sobre produto; o custo de uma decisão errada de cobertura seria um fechamento incorreto, coberto por regressões explícitas.

## Estado de entrega

Versão permanece **1.14.0**, pois não há PR entregue/autorizada. Uma futura PR precisa comparar a main vigente, incrementar uma única vez, sincronizar package.json/package-lock e notas portuguesas e conferir APP_VERSION nos rodapés e Atualizações. Não criar tags.

E2.2 implementada em isolamento; integração/publicação pendentes de autorização própria. E2 ampla continua parcial: rankings E2.3 e recorrência/revisão humana da ficha E2.4 permanecem separados. A versão efetivamente publicada não foi reconferida; 1.12.0 continua apenas a última publicação confirmada no encaminhamento. Homologação humana dos fluxos reais permanece pendente.

Pasta operacional, bancos/volumes existentes e arquivos de outros chats preservados. Nenhum .env operacional copiado, nenhum stash histórico aplicado. Testes mutáveis usaram instâncias sintéticas exclusivas.

Após a validação, encerrados a prévia e os executores e removidos os oito contêineres descartáveis desta tarefa, seus volumes anônimos e a imagem temporária do executor. Conferência final mantém apenas os três serviços já existentes, todos saudáveis. Branch/worktree e evidências locais preservadas para revisão; nenhum achado menor adiado.

## Preparação autorizada da PR — 04/11/2026

Usuário autorizou PR, merge em main e publicação local. Main remota reconferida em ce38daa/1.14.0; incremento MINOR único para 1.15.0, manifestos sincronizados e notas portuguesas no início de releases.ts. Os registros anteriores de ausência de autorização são históricos. 22 testes focados de versão/rodapés/Atualizações ADMIN/OPERATOR e reconciliação passaram; build da versão 1.15.0 aprovado. A validação funcional anterior permanece registrada acima; CI da PR e publicação serão conferidos antes de declarar integração/disponibilidade.
