# E3.2 — Bloqueios acionáveis e previsão comercial

Data: 04/11/2026, America/Sao_Paulo. Entrega local em `codex/e3-2-previsao-comercial`, base `9797484`/1.17.0. Desenho e plano aprovados pelo usuário, incluindo simulação antes da venda e execução direta com revisão independente final.

## O que mudou

- Bloqueios estruturados mantêm os predicados/textos anteriores e acrescentam entidade, próxima ação, destino e critério de resolução. O detalhe explica posição, prazo da OP e dependência da equipe compartilhada. Calendários, horizonte sem janela e término não confirmado têm explicação própria, sem atribuir causalidade inventada.
- A venda recebe leitura de toda demanda por chave comercial, com entregue líquido, pronto comprometido, quantidade em participações abertas e saldo descoberto. Usa OPs, eventos/correções, estoque acabado, compromissos e entregas; não procura vínculos por semelhança de produto. Peças boas não destinadas, excesso de cobertura e lotes retirados sem conciliação impedem uma conclusão completa.
- A negociação recebe cenário temporário pelo orçamento principal vigente. Todas as linhas entram: lotes hipotéticos ou disponibilidade externa explicitamente declarada. Memória válida sugere máquina/tempo; sem memória há tecnologia/duração manuais. Divisão exige revisar cada lote e a soma exata das unidades. Hipóteses não viram confirmações operacionais.
- O cenário reutiliza o scheduler sobre a fila integral e a equipe compartilhada, incluindo máquinas ocultas. Mostra impacto nos lotes, OPs/quantidades e vendas explicitamente vinculadas. Disponibilidade futura restringe conservadoramente toda a máquina no cenário; essa limitação aparece no resultado. Interferência dessa restrição em lote ativo impede data completa.
- Retirada produtiva, liberação após acabamento/inspeção/embalagem, atendimento/chegada estimada e data combinada registrada são conceitos separados. Premissa essencial ausente mantém entrega indisponível. Nenhuma data combinada é escrita.
- Consultas autenticadas ADMIN/OPERATOR conferem usuário ativo no servidor e usam RepeatableRead. Resultados identificam instante, revisão, versão/hash das fontes e expiram em 60 segundos. Edição, mudança de contexto, retorno de foco/visibilidade e resposta fora de ordem invalidam a apresentação vigente.

Nenhum novo otimizador, margem, comissão, alerta externo, transferência de máquina, reimpressão causal, histórico de cenários ou conversão automática para OP foi incluído. Sem dependências novas nem migração.

## Verificação

| Verificação | Evidência |
| --- | --- |
| Unitários completos no pacote final | 825 testes em 203 arquivos aprovados em 189,79s, após correções materiais e complemento de identificação dos impactos |
| Integração E32 exclusiva | 10 testes em 3 arquivos aprovados, incluindo cobertura de venda realmente planejada, correção de peças boas, estoque/compromissos, venda entregue com estoque desativado e impacto com vínculo de venda |
| Somente leitura | Comparação do conteúdo de todas as tabelas antes/depois das consultas e simulações; sem venda, OP, lote, reserva, evento, revisão ou compromisso fictício criado pela funcionalidade |
| HTTP/guarda | Autenticação, ADMIN/OPERATOR, origem, tamanho de 256 KiB, banco exclusivo e marcador explícito cobertos por testes |
| Tipos/lint/build | Rodada final do pacote aprovada: `npm run typecheck`, `npm run lint`, `npm run build` |
| Interface | Componentes reais em prévia Vite com fixtures, desktop e viewport 375×812, claro/escuro, Tab alcança select nativo; largura do documento igual à área útil (360px, descontada barra), sem overflow horizontal observado |

Os avisos `Not implemented: navigation to another Document` vieram de testes antigos no jsdom; as execuções completas encerraram com resumo aprovado. Não houve reprodução da antiga recursão do Vitest. Isso não equivale a executar as integrações gerais ou suítes E3/E4 em bases de outros chats: nenhuma dessas bases foi reutilizada. O banco padrão existente em 55432 permaneceu fora dos testes mutáveis deste trabalho.

Banco de integração: PostgreSQL 17 descartável, contêiner exclusivo `codex-e32-20261104-test`, porta loopback 55439 e banco `b2t_e32_test`, sem volume persistente. Migrações existentes aplicadas somente nesse banco. Guarda executa antes de importar db/limpar tabelas; rejeita operação, bancos de outras suítes, hosts remotos, porta diferente e falta do marcador. Job E32 acrescentado ao CI, sem remover os demais jobs; CI remoto não executado porque não houve push/PR.

## Revisão independente e correções

Revisor independente somente leitura avaliou a branch inteira até `1b87308`, desenho, plano e decisões. Três achados P2 foram reproduzidos antes da correção:

1. Compromisso líquido zero mantido após entrega não depende de estoque atualmente ativo. A regressão de venda integralmente entregue seguida de estoque desativado falhou e passou após ignorar somente compromissos encerrados; saldo negativo continua inválido.
2. Instantes externos com offsets mistos precisavam ser comparáveis aos intervalos UTC do motor. A regressão selecionava incorretamente 12:00Z em vez de 13:00Z; normalização UTC na saída externa corrigiu cenário externo e misto.
3. Disponibilidade externa passada não pode autorizar promessa retroativa. A regressão aceitava atendimento no passado; o cenário agora usa o maior entre disponibilidade e instante atual, rejeitando etapas posteriores retroativas.

Correções verificadas por RED→GREEN: oito testes de cenário e dez integrações E32. Não houve segunda revisão independente; a verificação das correções é do implementador. Nenhum achado menor adiado.

O revisor não julgou visual/teclado/temas em execução, resultados efetivos dos comandos ou integração/publicação. Decisão do implementador: inspeção visual própria e resultados dos processos documentados aqui; integração/publicação continuam fora da autorização. A leitura estática não foi apresentada como nova execução de testes.

## Decisões de execução

1. Scripts POSIX de acompanhamento foram adaptados a PowerShell com ledger equivalente. Não muda o produto; o risco seria perder registro de uma etapa, mitigado por commits e logs.
2. Testes das duas etapas puras de cenário e pós-produção foram executados juntos por dependência direta. Não houve delegação da implementação nem alteração da ordem das regras; o risco de integração é coberto pelas regressões combinadas.
3. O plano omitira o campo de tecnologia no preenchimento manual sem memória. Foi acrescentada declaração explícita por lote, validada contra máquina e memória quando existente. Evita inferência silenciosa e permite orçamento legado; regressão RED→GREEN.
4. Disponibilidade passada significa já disponível e é limitada ao instante atual para cálculo futuro. Evita exigir reedição a cada minuto e impede entrega retroativa; futura disponibilidade permanece limitada ao horizonte de 90 dias. A premissa original não é gravada nem tomada por reserva.
5. A conferência final completou metadados de impactos com participantes/OPs e vendas explicitamente vinculadas, como já exigido pelo desenho. Sem vínculo comercial, o resultado o informa; não infere venda de uma OP.
6. Branch e worktree permanecem locais. O usuário limitou expressamente push/PR/merge/publicação a autorização posterior; não se abriu nova rodada de autorização para uma ação não executada.

## Limites de inspeção e operação

A revisão automática bloqueou o comando de criação da demonstração autenticada no banco sintético, sem motivo específico retornado. Não houve contorno dessa ação: a alternativa visual usa apenas fixtures sem banco/sessão, componentes reais e o motor puro. ADMIN/OPERATOR foram verificados no servidor pelos testes em banco exclusivo, não por um login de demonstração.

A automação do controle nativo datetime-local não conseguiu preencher a nova data na prévia. Conversão São Paulo e precedência estão cobertas por testes de domínio/UI, mas preenchimento humano e fluxo autenticado de ponta a ponta permanecem para homologação. Não se atribui esse limite da automação a defeito confirmado do preenchimento humano.

Captura sintética local ignorada pelo Git: `.superpowers/evidence/e3-2/preview-sintetica.png`. Ela mostra retirada/liberação e entrega indisponível enquanto o atendimento/transporte não foi informado. Não contém cliente real ou dado operacional.

Logs finais e ledger preservados em `.superpowers/evidence/e3-2/`, ignorados pelo Git. Manifestos raiz/package-lock/packages[""].version conferidos em 1.17.0; APP_VERSION permanece importado do package.json. Diff sem erros de espaço.

## Estado de entrega

Implementação: local. Testes: evidências acima. Integração: não realizada. Publicação: não realizada. Homologação humana: pendente. Versão mantida em **1.17.0**; fonte única/rodapés/releases não alterados por esta entrega local. Preparação de futura PR requer autorização específica, incremento único comparado à main atual, package/lock sincronizados, notas portuguesas e conferência dos dois rodapés e `/atualizacoes`.

A main remota foi reconferida em `9797484`/1.17.0. A pasta `X:/codex/appb2t` e seus documentos/skills locais foram preservados; esta implementação não usa sua revisão antiga como fonte de publicação. A auditoria local pós-reformulação foi lida, sem sobrescrevê-la nem reaplicar stashes.

Próxima ação possível: revisão humana desta entrega local e eventual autorização específica de PR. Homologação operacional não foi usada como barreira para iniciar E3.2 e não foi declarada concluída pelos testes sintéticos.
