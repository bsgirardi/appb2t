# Publicação U4 — Rentabilidade

Data: 10/10/2026 (America/Sao_Paulo). Publicação explicitamente autorizada pelo usuário nesta conversa.

Código `1902c8b`, integrado por fast-forward em `feat/calculadora`. Imagens runtime/tools geradas pelo Docker Compose. Imagem operacional: `sha256:a292d062da072937b7fefd76b3bd688fbd819d52c587448240e2a9b13f26f076`.

## Verificação

- Checkout integrado: 442 testes aprovados em 135 arquivos, 262,24 segundos, no banco isolado b2t_test. Build Docker de produção aprovado.
- Backup preliminar restaurado; migração ensaiada; 63 tabelas antigas idênticas por contagem e hash de conteúdo.
- Aplicação parada brevemente para backup final consistente; restauração desse backup em `u4_final_20261010` conferida contra as 63 tabelas operacionais.
- Migração operacional `202610090001_profitability` aplicada; 63 tabelas preexistentes preservadas e quatro tabelas U4 adicionadas. Nenhuma migração pendente.
- Aplicação Docker saudável e imagem executada idêntica à candidata. Saúde/início HTTP 200; API de rentabilidade anônima 401; página de rentabilidade sem sessão 307 para login.
- Leitura administrativa pelo serviço em produção aprovada. População atual: zero pedidos confirmados no período e zero sem data; essa leitura confirma o estado vazio, não um fluxo com dados reais.

## Recuperação preservada

Backup final: `backups/profitability-u4-deploy-20261010/final.dump`.
SHA256: `66A9E4DD1BD0AADE7FE4647163D99A7F0567B80EB89B95680B4FC580D06304BC`.
Imagem anterior: `b2t-before-profitability-u4:20261010`, também salva em `previous-runtime.tar` na mesma pasta de backup. Evidências em `test-results/profitability-u4-deploy/`, fora do Git.

Retorno deve preservar quaisquer revisões/apurações U4 criadas após a publicação. Não apagar tabelas novas nem restaurar um backup anterior sobre dados recentes sem conciliação. A imagem anterior está disponível para retorno coordenado da aplicação, considerando o esquema aditivo.

## Pendência e continuidade

Inspeção visual completa em 390/1440px e teclado permanece pendente, previamente informada ao usuário. O comando local de demonstração foi rejeitado por política de execução; isso não foi declarado resolvido. A publicação Docker foi autorizada e executada pelo fluxo de implantação existente. Não se afirma aceite visual com base no build ou nos testes HTTP.

Próxima entrega: U5 — Atendimento e planejamento, em novo chat, priorizando fila de produção e capacidade das máquinas. Reutilizar responsáveis/prazos de U3; iniciar pela especificação e pelo planejamento próprios. U4 não precisa ser reimplementado ou republicado.
