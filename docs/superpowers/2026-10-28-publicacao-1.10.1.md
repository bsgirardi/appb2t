# Publicação local 1.10.1 — 28/10/2026

Usuário autorizou publicação, migração e resolução das pendências técnicas Vitest/CI. Entrega de manutenção na [PR #25](https://github.com/bsgirardi/appb2t/pull/25); mantém a mesma versão por toda a PR.

## Código e validação

Candidata funcional `8abc078d4cefda733971140c7ab455052399b51f`, sobre main 1.10.0 já com E1–E4 integradas. [CI real aprovado](https://github.com/bsgirardi/appb2t/actions/runs/40724120597): tipagem/lint/build; 925 testes padrão em 275 arquivos em uma única execução (621 unitários e 304 integrações); 29 testes E3 em 11 arquivos e 21 testes E4 em seis arquivos. Há 24 testes E3 já incluídos no padrão, portanto esses números não devem ser somados como casos únicos.

Regressão RED→GREEN: localizar campos inválidos pelo seletor :invalid disparava eventos invalid recursivos no jsdom. Agora consulta somente controles e lê aria-invalid ou willValidate/validity, sem disparar nova validação. Seis testes de formulário cobrem abertura/foco, preservação dos dados, um único evento e controles desabilitados/somente leitura. Observação de disputas E4/produção reutiliza a conexão do bloqueio, limpa o snapshot de atividade antes de cada leitura e aguarda comandos pendentes antes da limpeza do próximo teste. Nenhum timeout produtivo ou regra comercial foi relaxado. Revisão independente sem bloqueadores após os ajustes.

A tentativa de atualizar somente o Vitest não resolveu o problema e foi revertida; permanece 4.1.12. A execução Windows/Node 24 sob carga terminou sem recursão, mas teve timeout de PDF e inicialização de worker; não é uma validação completa aprovada desse ambiente. Os dois arquivos afetados passaram novamente em execução isolada (oito testes), sem alterar limites de segurança ou tempo. A referência reproduzível e automatizada é Linux/Node 22. Não há supressão de erros.

## Backup, restauração e migração

Instalação anterior: 1.4.0. Imagem anterior, ambiente e configuração preservados privadamente em `backups/publicacao-1.10.1-20261028/`, fora do Git. Aplicação parada antes do backup final; banco e volume `appb2t_postgres_data` mantidos.

Backup custom `final.dump`, 253177 bytes, SHA-256 `e7a7e8328db32b2f64e33ff1cdfae9a5f165f6dad2a3eac236b6eda90ea1c414`. Formato verificado e restauração real em PostgreSQL 17 descartável, sem portas publicadas e sem reutilizar o volume operacional. Comparação por tabela, contagem e hash das colunas anteriores: **103 projeções idênticas** na restauração, após migração do ensaio, após migração operacional e após iniciar a aplicação. A comparação usa a identificação da tabela, sem depender da ordem de resultados SQL.

Migrações aplicadas: `20261027130000_catalog_search` e `20261028011000_opportunities`. Nenhuma migração incompleta restante. Não foram importadas fixtures no banco operacional, redefinidas senhas ou recriadas contas. O PostgreSQL descartável e sua cópia temporária foram removidos; backup final preservado.

## Resultado disponível

- Instalação local: http://localhost:3000, limitada a 127.0.0.1 como antes.
- Runtime e tools/admin 1.10.1 construídos; aliases Compose atualizados. App e banco saudáveis, mesmo volume de dados.
- Saúde, catálogo e login retornam 200; rodapé do login exibe 1.10.1. Atualizações e Negociações sem sessão redirecionam 307; API de oportunidades sem sessão retorna 401.
- Rodapés administrativos e Atualizações ADMIN/OPERATOR cobertos pelos testes que importam APP_VERSION. Não havia sessão de navegador autenticada disponível; não foi criada uma conta/sessão artificial para testar em produção.
- Recuperação administrativa disponível na imagem tools, com arquivos acessíveis pelo usuário node. Nenhuma recuperação foi executada sobre uma conta real.

Domínio/HTTPS remoto, cópia externa automática de backups e validação humana com a equipe continuam sob responsabilidade do operador. Novos incrementos do roadmap permanecem separados deste escopo técnico.
