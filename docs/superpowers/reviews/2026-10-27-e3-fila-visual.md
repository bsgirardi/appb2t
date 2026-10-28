# E3.1 — Entrega local, verificação e limites

Data: 27/10/2026, America/Sao_Paulo.

## Resultado

Implementação local na branch `codex/e3-fila-visual`, worktree `C:/Users/Administrador/.codex/worktrees/e3-fila-visual/appb2t`, base main 1.5.1 (`d74ee75`). Desenho e plano aprovados pelo usuário neste chat. Commits de implementação: `de610be`, `81ddcf5`, `1df4e7d`, `1e38c0e` e correções finais `49652b4`.

- Calendário semanal por impressora sobre o forecast existente, com preparação, impressão, espera pela equipe e retirada; navegação limitada ao horizonte, horários de São Paulo e recorte de intervalos sem alterar fatos.
- Alternância entre lista/simulação e calendário no planejamento existente. Lotes sem previsão completa conservam causa e acesso ao detalhe; a retirada não é apresentada como entrega ao cliente.
- Subir/descer e ordenar por prazo produzem cenário temporário. Movimentos sucessivos acumulam a ordem simulada; descartar não escreve. Comparação mostra fases antes/depois e todas as OPs/linhas afetadas, inclusive por disputa da equipe entre máquinas ocultas pelos filtros.
- Prévia autenticada somente de leitura. Confirmação explícita reaproveita comando, revisão, lock, auditoria e idempotência existentes, acrescentando conferência integral dos dados atuais no servidor, validade de 60 segundos e rejeição ao cruzar início/fim previsto. A referência temporal continua sendo estimativa, sem reserva ou garantia de capacidade.
- Resposta perdida após confirmação conserva chave/payload para replay. Resposta antiga de uma prévia descartada é ignorada.

Nenhum novo agendador, alteração do scheduler, migração ou dependência. Não foram implementados transferência de máquina, contribuição/hora de lote, simplificação de apontamento, reimpressão vinculada ou previsão comercial completa; permanecem pendentes em E3 conforme dependências do desenho.

## Evidências executadas

| Verificação | Resultado |
| --- | --- |
| Domínio e regressões de calendário/scheduler/validação/sugestões/tempos, cenário e validade | 34 testes, 8 arquivos, aprovados |
| Guarda do banco exclusivo de E3 | 1 teste aprovado; rejeita destino operacional, remoto e banco compartilhado |
| Interface de simulação | 6 testes aprovados, incluindo impacto oculto, descarte/resposta atrasada, expiração/foco, previsão ausente, resposta interrompida e movimentos acumulados |
| Interface do calendário | 2 testes aprovados |
| Fila existente, filtro de testes `blocked forecasts\|physically occupied` | 2 aprovados; 1 teste de formulário fora desse filtro |
| Total focado aprovado em execuções separadas | 45 testes em 12 arquivos; não representa suíte completa |
| `npm run typecheck` | Aprovado na execução final |
| `npm run lint` | Aprovado, sem erros ou avisos na execução final |
| `npm run build` | Aprovado na execução final, incluindo `/api/planning/preview` |
| `git diff --check` | Aprovado |

Testes novos tiveram falha observada antes da implementação. Duas regressões da revisão independente também foram observadas falhando antes da correção e passaram depois.

Prévia sintética Vite, sem backend, autenticação ou banco: `node tests/e3-preview-server.mjs`, porta exclusiva 4183, página `/tests/e3-preview.html`. Usa componentes reais, duas impressoras, lote misto, atraso e pendência de material. Não é publicação nem validação autenticada operacional; botões de confirmação da apresentação sintética não executam comandos.

Verificação em navegador Edge automatizado: desktop 1366 px e celular 375 px; calendário claro/escuro e tabela de impacto com rolagem local. Nenhum transbordamento horizontal da página ou erro JavaScript. Capturas inspecionadas visualmente. Teclado abriu lote pelo botão da faixa e deslocou horizontalmente o calendário, preservando rolagem local (`scrollLeft=40`). Evidências/logs locais em `.superpowers/sdd/2026-10-27-e3-fila-visual/`, ignorados pelo Git.

## Revisão independente e decisões

Revisor independente leu `d74ee75..1e38c0e`, desenho, plano e ledger, sem alterar arquivos ou consultar banco. Dois achados P2 confirmados e corrigidos em `49652b4`:

1. Falha ao ler corpo da resposta de um comando já aplicado não deve descartar a chave de replay. Erro sem código, NETWORK ou INTERNAL agora preserva intenção/payload; erros de negócio pedem nova simulação.
2. Segundo movimento deve partir da ordem já simulada. Cartões e botões agora usam a sequência temporária até descarte ou aplicação.

Sem achados menores adiados. Não houve segunda revisão independente após as correções; regressões verificadas pelo implementador. Revisor deixou sem julgamento concorrência de banco sem instância exclusiva, validação visual/build executados separadamente, scheduler preexistente, funcionalidades posteriores de E3 e integração/publicação. Decisão: manter esses limites explícitos e não ampliar o escopo.

Outras decisões: fluxo de UI encapsulado em hook para manter interface existente de Queue; validade/fingerprint puros em arquivo separado para testes sem banco; guarda explícita E3 também no próprio teste novo, além da configuração; scripts POSIX do fluxo adaptados a ledger e comandos PowerShell nesta plataforma.

## Limites e próxima ação

- A execução completa de `planning-ui.test.tsx` voltou a reproduzir `RangeError: Maximum call stack size exceeded` no transporte de erros do Vitest. Uma combinação maior de UI também reproduziu o problema, tanto com pool padrão quanto threads. Apenas processos identificados nesta worktree foram interrompidos. Novos testes de simulação/calendário e dois testes focados da fila passaram separadamente; suíte unitária completa **não validada**. Não houve supressão do erro nem modificação do runtime de testes para escondê-lo.
- Banco exclusivo `localhost:55433/b2t_e3_test` indisponível na conferência de porta; integrações de prévia, API e concorrência **não executadas**. Testes foram escritos/adaptados e configuração E3 preparada: `npx vitest run --config vitest.e3.config.ts` somente com DATABASE_URL explícita dessa instância descartável. Não usar `localhost:55432/b2t_test` de outras etapas ou banco operacional. Nenhum contêiner iniciado/alterado e nenhuma migração aplicada.
- Não houve validação autenticada na instalação operacional nem aceite da equipe em uso real.
- Próxima ação: disponibilizar/autorizar ambiente exclusivo de integração, validar concorrência e resolver ou aceitar explicitamente o limite da suíte antes de eventual integração. Depois, detalhar próximos incrementos de E3 se autorizado.

## Versão e publicação

A entrega local inicial manteve **1.5.1**, sem PR/push. Após autorização específica do usuário em 27/10/2026 (“Faça a PR”), preparação para PR em rascunho com **1.6.0** (MINOR) sobre main remota `d74ee75` / 1.5.1, reconsultada nesta preparação. Manifestos sincronizados e notas em português adicionadas, mantendo histórico anterior e APP_VERSION como fonte dos rodapés.

Revalidação para PR: 46 testes aprovados em execuções separadas (35 domínio/guarda, 6 simulação, 2 calendário e 3 versão/rodapés/Atualizações ADMIN/OPERATOR), tipagem, lint e build. Os limites da suíte completa e do banco permanecem abertos; a criação da PR não equivale a aceitá-los para merge. E1 #19 e E2 #21 também propõem 1.6.0; reconciliar versão/notas com a main vigente conforme a ordem de integração, sem incrementar novamente apenas para finalizar a mesma PR.

Sem merge, publicação, tag, migração ou alteração de banco/contêineres. E1/E2 continuam independentes e parciais, sem mudança de seus chats/worktrees. PR vinculada no acompanhamento da pasta original após criação; esta autorização cobre somente envio da branch e abertura da PR.
