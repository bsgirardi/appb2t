# Aceite administrativo — 15/10/2026

## Estado atual

U4 e U5 já publicados, respectivamente em 10 e 14/10. Paletas independentes publicadas em 14/10 e registradas no commit `bcd171e` em 15/10. A inspeção de navegador descrita aqui sucede as limitações históricas de demonstração registradas nas entregas anteriores. Não houve nova publicação nem push nesta rodada.

## Ambiente e evidências

Chrome headless com Playwright; mesma imagem operacional `sha256:af88cbb7af63d72026e148465e73a66ba71da1261f7635b9c0b8a3617eaf326e`, servida pelo contêiner temporário `b2t-admin-acceptance` em localhost:3102. Banco `b2t_test` no Compose de testes, rede separada da produção, dados e conta fictícios. Fixtures existentes prepararam duas vendas entregues (produção e estoque inicial), uma ordem e três lotes (dois programados e um rascunho com pendências). Nenhuma cópia de dados ou credenciais operacionais.

Evidências locais ignoradas pelo Git: `test-results/admin-acceptance/`. `seed.test.ts` usa a proteção existente contra execução fora do banco local b2t_test. `browser.cjs`, `flows.cjs` e `extra.cjs` exigem localhost:3102 e credenciais por ambiente. Resultados finais: `result.json`, `flows-result.json`, `extra-result.json`, todos aprovados. 41 capturas dos cenários, além de folhas de contato e prévia do favicon.

## Resultado do navegador

- Matriz claro/escuro × 390/1440px: relatório, estado vazio, detalhe e estoque inicial U4; fila, novo lote, horários e detalhe U5. Sem transbordamento horizontal da página. Tabelas largas mantêm rolagem própria acessível por foco e setas do teclado.
- U4: rascunho recuperado após recarga; conferência gravada por teclado; apuração registrada e histórico visível; falha de rede induzida mantém a intenção original e a recuperação grava os valores. Caso negativo verificado pela API: receita 200, custo produtivo 80, depreciação 5, encargos 300, frete zero; contribuição -180 e resultado após depreciação -185, cobertura completa. Zero declarado permanece diferente de campo desconhecido.
- U5: criação de lote, horários gravados e recarregados, atualização sem apagar campos e recuperação após falha de rede aprovadas. Ordenação da fila por teclado aprovada. Preparação → impressão → fim da impressão → início da retirada → fim da retirada aceitos. Lote encerrado mantém material e peças pendentes de conciliação, sem presumir apontamento ou liberação automática. Estados vazio, carregamento e sugestões também capturados.
- Nenhum erro JavaScript capturado. Falhas de rede foram induzidas apenas nas requisições isoladas para verificar recuperação. Favicon 404 da imagem publicada é tratado separadamente abaixo.
- Inspeção visual das telas e folhas de contato: textos e controles legíveis nos dois temas. No celular, as tabelas exigem rolagem interna; confirmações de lote têm espaçamento amplo entre caixa e texto, sem impedir a operação.

Aceite de navegador dos cenários representativos U4/U5 concluído. Isso não representa certificação geral de acessibilidade, teste de carga ou repetição visual de todas as combinações de negócio. Cenários de múltiplas máquinas, impressão noturna e conciliação detalhada continuam cobertos pelas suítes registradas nas entregas; não foram todos repetidos no navegador nesta rodada.

## Favicon

404 reproduzido na instância isolada da imagem publicada. Causa: ausência do arquivo na convenção de metadados do Next. Adicionado `src/app/favicon.ico`, 64×64, reutilizando o cubo Lucide já usado no administrativo, branco sobre verde #176b59. Nenhuma mudança de logo ou dados de aparência.

Build completo local aprovado. Manifesto contém `/favicon.ico/route`; saída estática tem status 200, Content-Type image/x-icon e bytes idênticos ao arquivo fonte (SHA256 `1307C6221A1DD07B4BAF75FCB1DF5852DADB0AE9562309BEEC6EAB195BFC45C7`). Prévia visual inspecionada. A revisão automática rejeitou iniciar `next start` em localhost:3103, apenas com `blocked by policy`; não se declara teste HTTP dessa nova versão. Correção ainda não publicada.

## Verificações e operação

Antes do commit de aparência: lint aprovado, 14 testes unitários e 6 integrações de aparência aprovados, diff sem erros; revisão independente sem achados materiais. Não houve repetição da suíte histórica de 495 testes. Build repetido depois da inclusão do favicon.

Consulta somente leitura: produção continua ligada a localhost:3000 e APP_URL=http://localhost:3000. Compose não define serviço de proxy ou rotina de backup. As tarefas do Windows com nomes relacionados a backup pertencem ao próprio Windows; nenhuma tarefa específica B2T foi encontrada nessa inspeção. Backups manuais documentados existem, mas não há evidência suficiente de backup automático, domínio ou HTTPS externo. Serviços em outra máquina ou infraestrutura do usuário não foram inspecionados. Não houve alteração de exposição.

Preset Nova/Roboto permanece em proposta, conforme `2026-10-15-preset-proposta.md`.

Ao encerrar, o contêiner temporário da aplicação foi removido e o banco de testes foi parado, preservando seu volume preexistente. Imagem operacional conferida novamente, idêntica à inicial e saudável. Capturas e scripts locais preservados para auditoria.
