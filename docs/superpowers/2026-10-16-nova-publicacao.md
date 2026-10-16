# Publicação local Nova — 16/10/2026

Usuário autorizou consolidar os commits, atualizar o pacote e publicar a versão validada. Código visual consolidado no commit `85fdb00`, branch `feat/calculadora`. Não há remoto Git configurado, portanto não houve push.

## Candidata publicada

Mesma imagem do aceite integrado: `appb2t-nova-candidate:20261016`, ID `sha256:b5331fb992e9a02d03b5414b1bb9d7ecad2e0540db7193c4b643bb8f3d47928a`. Aplicação saudável em http://localhost:3000, exposição mantida em 127.0.0.1:3000. Inclui Next.js 16.3.8, Roboto administrativo, favicon e adaptação Nova/catálogo.

Projeto Compose original `b2t-calculadora`, contêineres originais e volume `b2t-calculadora_postgres_data` preservados. Banco foi iniciado; somente o serviço app foi recriado após conferir migrações. Não houve criação de administrador ou importação de dados fictícios na instalação operacional.

## Backup e reversão

Backup atual em `backups/nova-deploy-20261016/b2t.dump`, formato custom PostgreSQL. SHA256: `E98E701232A03DCCB439FCE3B1C253C88A2FE90FF22942D1B094EB42F514146F`.

Restauração em banco temporário tmpfs, sem rede e sem volumes, terminou com sucesso usando transação única e parada em erro. Contagens antes da publicação, na restauração e após a publicação: 1 usuário, 1 produto, 0 vendas, 0 orçamentos e 20 migrações. Migração da candidata informou que não havia migrações pendentes.

Imagem anterior preservada como `b2t-rollback:pre-nova-20261016`, ID `sha256:af88cbb7af63d72026e148465e73a66ba71da1261f7635b9c0b8a3617eaf326e`. Não foi necessária reversão. Em caso de reversão da aplicação, manter o mesmo projeto Compose e banco, apontar o serviço app para essa imagem e recriar somente app com `--no-deps --no-build`. Não restaurar o backup sobre dados mais recentes sem análise.

O override usado está em `test-results/nova-deploy-20261016/candidate.yaml` (ignorado pelo Git). Tags padrão `b2t-calculadora-app:latest` e `b2t-calculadora-migrate:latest` também apontam para as imagens novas, para manter consistência na administração local.

## Verificação

- 300 testes unitários em 71 arquivos e lint repetidos antes da publicação: aprovados.
- Build Docker e 48 cenários integrados da mesma candidata: registros em `2026-10-16-catalogo-integrado.md`.
- Após publicação: health e favicon HTTP 200; favicon `image/x-icon`; contêiner saudável e ID da imagem conferido.
- 16 verificações reais no navegador: home, busca vazia, lista de orçamento vazia e login, em 390/1440 px e claro/escuro. Sem overflow ou erros JavaScript; Poppins na loja e Roboto no login.
- Nenhuma gravação comercial ou envio externo foi usado na conferência. Login autenticado com conta real não foi repetido; os fluxos autenticados foram validados anteriormente em ambiente fictício.

Evidências locais em `test-results/nova-deploy-20261016/`. Recursos temporários do ensaio de restauração e tentativa antiga de seed removidos; contêineres operacionais permanecem ativos. Backups anteriores e imagens de reversão foram preservados.

## Entrega e limites

Pasta `X:\code\appb2t` e ZIP `X:\code\appb2t-producao.zip` atualizados a partir dos arquivos versionados, excluindo originais de identidade usados apenas como referência, instruções de agente e arquivos operacionais. A versão anterior do pacote foi preservada em cópias com sufixo de arquivo. Nenhum .env real, banco, backup ou senha integra a entrega.

Domínio/HTTPS externo, backups automáticos e instalação em outro servidor continuam pendentes. Os cinco alertas históricos da cadeia de lint permanecem documentados; esta publicação não fez nova consulta upstream.
