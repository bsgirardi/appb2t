# E1.2 — Canais, descontos e memórias de preço

Data: 29/10/2026. Branch local `codex/e1-2-canais-descontos`, base atualizada para main remota `c3b3dae` (1.13.0), versão preparada **1.14.0**. Desenho e plano aprovados pelo usuário; execução direta com revisão independente final. Sem PR, push, merge, publicação ou migração operacional.

## Entrega

Comparador compartilhado pelas calculadoras V2/V3, com até dez alternativas de canais cadastrados e descontos percentuais. Bases explícitas: preço calculado por canal ou preço comum informado. Desconto é aplicado uma vez ao preço unitário antes das taxas; receita, contribuição, margem, resultado após depreciação e variações usam o motor V2 existente. Preço para cobertura dos custos completos e preço para meta de contribuição são separados, com pisos arredondados para cima. Meta inviável afeta somente a alternativa correspondente; preço comum e demais canais continuam disponíveis.

Biblioteca privada para ADMIN/OPERATOR, nomes, busca, paginação e comparação de até dez alternativas históricas. Gravação transacional/idempotente cria snapshots imutáveis reutilizando PricingSnapshot; catálogo alterado pede revisão e não reescreve memórias. Leitura histórica independe do catálogo. Reutilização mostra premissas antigas/atuais e abre rascunho com preço final INFORMED; referências indisponíveis precisam de substituição. Aplicação continua humana, sem publicar preço ou modificar documento automaticamente.

Migração aditiva `20261029160000_pricing_comparisons`; sem backfill, sem reescrever memórias ou cálculos antigos. CI adiciona banco E12 próprio e valida upgrade antes da suíte. Manifestos sincronizados em 1.14.0, histórico português atualizado; rodapés continuam via APP_VERSION.

## Verificação

- Tipagem, lint e build aprovados após as correções finais.
- Oito integrações E12/API aprovadas em PostgreSQL 17 descartável exclusivo: idempotência concorrente, chave divergente, referências alteradas/inativas, leitura histórica, paginação, autorização, rollback real ao falhar o segundo item e espera por bloqueio de catálogo observada no PostgreSQL. Erro de serialização retorna conflito de revisão.
- Upgrade real da base anterior e reaplicação aprovados: sete projeções sintéticas preservadas integralmente, incluindo memória de preço, produto, revisão de cálculo, orçamento e vínculos de custo. Novas tabelas começam vazias.
- 26 regressões focadas de interface/formulários/versão passaram após a revisão; teste de APP_VERSION cobre login, painel e Atualizações para ADMIN/OPERATOR.
- E3: 29; E4: 21; E5: 32; E6: 9 testes aprovados novamente em instâncias descartáveis próprias, sem portas/bancos compartilhados.
- Suíte padrão completa Linux/Node 22: **1.023 testes em 304 arquivos aprovados**, após as correções finais e com PostgreSQL exclusivo. Uma rodada Windows anterior à correção final passou 714 unitários; não é apresentada como verificação final da branch.

## Revisão independente e correções

Revisor independente apontou dois P2: edição temporariamente inválida desmontava o comparador e apagava o rascunho; canal principal com meta inviável escondia toda a comparação. Ambos reproduzidos antes da correção e cobertos por testes dos formulários V2/V3. O editor agora permanece montado enquanto os resultados inválidos ficam indisponíveis, e a entrada produtiva da comparação é resolvida independentemente da viabilidade da margem principal.

Verificação adicional encontrou reaplicação visual do desconto após Usar oferta: mudar o formulário para INFORMED alterava a base da comparação. Teste reproduziu R$ 10,12 onde deveria permanecer R$ 11,24; corrigido preservando a política de preço da comparação associada à aplicação explícita. Sete testes de interface do comparador passaram, incluindo os cinco casos novos que falharam antes. Nenhum achado menor adiado.

## Apresentação e limites

Componentes reais renderizados com CSS de produção e dados sintéticos, inspecionados em desktop 1440 px e celular 375 px: largura rolável igual à janela, sem overflow horizontal; Tab alcança a ação Usar oferta 1. Capturas locais ficam no diretório ignorado `.superpowers/evidence/2026-10-29-e1-2-canais-descontos/`.

O início da prévia local autenticada foi rejeitado pela revisão automática de aprovação; a ferramenta retornou apenas “blocked by policy”. Usou-se renderização offline como alternativa; não se afirma validação de fluxo autenticado completo no navegador. Autorização ADMIN/OPERATOR é coberta por testes de serviço/API e dos componentes existentes de versão.

A primeira execução ampla Linux coincidiu com as edições da revisão e esgotou o tmpfs do PostgreSQL (erro 53100). Resultado não aprovado. Nova rodada passou integralmente com árvore estável e volume descartável exclusivo com espaço suficiente; nenhum timeout de produto ou regra foi flexibilizado. O runtime Linux mínimo emitiu aviso de detecção de OpenSSL, sem falha de conexão atribuída a isso.

## Preservação e pendências

Pasta operacional e documentos de outros chats preservados. Documentos locais pós-publicação/auditoria foram copiados para esta worktree no início; stash antigo não foi aplicado. Nenhum contêiner existente foi atualizado e nenhum banco operacional ou de outro chat recebeu testes. Instâncias e volumes temporários desta tarefa removidos após validação; worktree e branch preservadas.

E1 ampla permanece parcial: importação G-code/3MF e projeção mensal por capacidade/demanda são incrementos separados. Aceite humano com dados de uso real e publicação desta versão continuam pendentes. A permissão para PR/push/merge/publicação não foi solicitada nem inferida da aprovação de implementação.

## Preparação da PR autorizada

Em 29/10/2026 o usuário autorizou push e criação da PR. Main remota reconferida em c3b3dae (1.13.0), preservando incremento único para 1.14.0. A ausência de autorização descrita na entrega local acima é histórica; merge, publicação e migração operacional continuam separados e não foram autorizados.

[PR #34](https://github.com/bsgirardi/appb2t/pull/34) aberta para revisão após autorização. Versão 1.14.0 preservada, sem novo incremento. Três testes de manifestos/rodapés/Atualizações passaram novamente na preparação. CI da PR ainda pendente; sem merge/publicação/migração operacional.

## Reconciliação para integração autorizada — 30/10/2026

A única PR aberta é #34. Usuário autorizou o merge das pendentes. Main passou a ae006a2 (1.13.1, resumo de atualização da PR #33); resolvidos conflitos apenas em manifestos e releases, conservando integralmente as notas de 1.13.1 e a versão 1.14.0 da E1.2. Nenhum novo incremento. 25 testes focados de domínio/UI/versão/histórico e 29 cenários Linux do fluxo de atualização simulado passaram. CI será reexecutado antes da integração; publicação/migração operacional não incluídas.
