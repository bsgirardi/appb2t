# Publicação U5 — Planejamento das máquinas

Data: 14/10/2026 (America/Sao_Paulo). Publicação explicitamente autorizada pelo usuário, com a pendência visual previamente informada.

Código candidato `38ca7ed`, documentação `31d0b5e`, integrado por fast-forward em `feat/calculadora`. Imagens runtime/tools construídas com Docker Compose. Imagem operacional: `sha256:b15b35d4a8e2ffb80c60b0d93aec544a2a8c1820d05c53ada1baa08b4b43002a`.

## Verificação

- Imagem candidata: **485 testes aprovados em 150 arquivos**, 267,05 segundos, usando apenas o banco isolado `b2t_test`. Build Docker aprovado.
- Backup preliminar restaurado, migrações ensaiadas com a própria imagem candidata: 67 tabelas anteriores idênticas em contagem e hash; dez tabelas adicionadas.
- Aplicação parada brevemente para backup final. Esse backup foi restaurado no banco isolado `u5_final_20261014` e conferido contra as 67 tabelas operacionais antes da migração.
- Migrações operacionais `202610100001_planning` e `202610130001_planning_reconciliation` aplicadas; as mesmas 67 tabelas anteriores permaneceram idênticas em contagem/hash.
- Aplicação saudável e imagem executada igual à candidata. Saúde e início HTTP 200; API de Planejamento anônima 401; página de Planejamento sem sessão 307 para login. Proteções equivalentes de Produção/Rentabilidade também conferidas.
- Leitura administrativa do serviço aprovada: uma máquina, zero lotes, zero calendários e revisão zero. Ausência de horários aparece como aviso; não foi preenchida agenda fictícia. Nenhuma migração pendente.

## Recuperação preservada

Backup final: `backups/planning-u5-deploy-20261014/final.dump`.
SHA256: `6AC1CCEF4A794D957179AB4AB4BF3FD32B582397003D20D6C5C502F5A24EFE9A`.

Imagem anterior: `b2t-before-planning-u5:20261013`, salva também em `backups/planning-u5-deploy-20261013/previous-runtime.tar`. Backup preliminar e construção foram preparados em 13/10; publicação e backup final ocorreram em 14/10.

Evidências locais em `test-results/planning-u5-deploy/`, fora do Git. Recuperação deve preservar quaisquer dados U5 criados após a publicação. Não remover tabelas nem restaurar o backup anterior sobre registros novos sem conciliação; o esquema é aditivo e a imagem anterior permanece disponível para retorno coordenado.

## Pendência visual

Inspeção completa em 390/1440 px e teclado continua pendente. O bloqueio anterior para iniciar a demonstração (`blocked by policy`) não foi contornado. A publicação seguiu o fluxo Docker autorizado; testes automatizados e saúde HTTP não equivalem a aceite visual. Não foram criados lotes, calendários ou apontamentos fictícios no ambiente operacional.
