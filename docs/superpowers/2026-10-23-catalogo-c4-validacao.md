# C4 — Registro de implementação e validação

Estado: validada e publicada localmente em 23/10/2026. Este documento conserva o ensaio isolado; publicação posterior no [registro operacional](2026-10-23-publicacao-c4.md).

Worktree gerenciado: `C:\Users\Administrador\.codex\worktrees\catalogo-c4\appb2t`, branch `codex/catalogo-c4`. Origem `5e5ec24`; checkout original `X:\codex\appb2t` preservado. As cópias de package.json/lock e da correção de relógio planning-flow foram verificadas por SHA-256 e registradas separadamente no commit `19e206c`, mantendo explícita a manutenção anterior. O commit `dde14b5` registra a base de revisões de C4 e seus documentos aprovados.

## Evidências já obtidas

- Base Linux/Node 22: 651 testes em 199 arquivos, saída zero; primeira base de revisão C4: 658 testes em 201 arquivos. Uma execução posterior encontrou quatro falhas e não é aceite final.
- Testes novos escritos antes das implementações correspondentes: manifesto, revisões, arquivos, upload, acesso/decisão, integração comercial, bloqueio produtivo e formulários. Regressão de legado sem solicitação materializada reproduzida e corrigida sem alterar as expectativas históricas. Execução focada Linux posterior: 32 testes aprovados.
- Prisma schema validado e clientes regenerados. Duas migrações aplicadas somente a `b2t_test`, no PostgreSQL dedicado da porta 55432; nenhuma migração operacional C4.
- Tipagem, lint e build Windows aprovados em verificações intermediárias. Auditoria de produção após adicionar o parser: zero vulnerabilidades; a auditoria completa inicial indicava cinco alertas altos de desenvolvimento. A consulta final explícita com --include=dev retornou zero vulnerabilidades, sem atualização forçada de dependências. Não executado audit fix --force, rebaixamento de lint ou atualização Prisma sugerida automaticamente.
- Parser escolhido: `@cantoo/pdf-lib` 2.11.1, MIT, [repositório primário e política de manutenção](https://github.com/cantoo-scribe/pdf-lib). Inspeção estrutural roda em worker limitado; não se anuncia antivírus ou segurança absoluta de PDF.

## Decisões técnicas de execução

- Ledger e comandos adaptados para PowerShell; preservado o formato do acompanhamento por tarefa.
- Segunda migração aditiva para os vínculos comerciais, sem reescrever a primeira já aplicada no teste nem alterar documentos legados.
- Identidades próprias para linhas duplicadas conservam origem C2/C3, mas não herdam aceite da linha copiada.
- Sessão já autorizada pode recuperar apenas o recibo de uma decisão anterior após substituição. Downloads e novas decisões da revisão substituída permanecem negados; revogação explícita e expiração negam inclusive recuperação.
- Chave HMAC dedicada permite recuperar idempotentemente uma emissão sem salvar token em texto aberto; configuração e rotação documentadas em PRODUCAO.md.
- Comando composto de preparação do contêiner auxiliar foi rejeitado pela revisão automática sem motivo detalhado. Comandos individuais suportados prepararam o contêiner; nenhuma aprovação foi contornada por mudança de privilégio na operação. Prisma foi gerado como root somente no contêiner descartável de ferramentas, porque a imagem original tinha o cliente gerado com propriedade root.

## Verificações restantes

Suíte completa Linux/Node 22 final: 683/683 testes em 211 arquivos, nenhuma falha. Tipagem e lint finais: saída zero. Build Docker final: saída zero. Revisão independente concluída: quatro achados corrigidos com regressões RED/GREEN. Backup operacional restaurado somente no banco isolado b2t_c4_restore, seguido das migrações C4: contagens e hashes das 85 tabelas legadas preservados (instalação operacional vazia). Runtime Docker standalone final na porta 3107: PDF passivo aceito (200), PDF com JavaScript rejeitado (422), download autenticado (200), sem sessão (403), cookie HttpOnly e cache private/no-store. O ensaio encontrou e corrigiu a resolução do parser no worker e a ausência da entrada CJS no rastreamento de dependências. Teste HTTP repetido com sucesso na imagem reconstruída. Suíte completa repetida após essa correção: 683/683 testes em 211 arquivos, saída zero. Primeiro administrador operacional ainda depende de criação interativa; não foi criada conta nem inventada credencial para a operação.

C5: usuário definiu os dois fluxos (compra direta e fechamento de orçamento revisado), pagamento externo registrado pela equipe e habilitação por produto/kit de retirada, frete pela equipe e cálculo automático. Provedor, políticas de carrinho misto, reserva e cancelamento ainda em desenho.


## Aceite no navegador e limites

No navegador integrado, com conta e solicitação demonstrativas apenas em b2t_test: imagem carregada, fragmento trocado por sessão e removido da URL, aprovação impedida sem nome/confirmação, decisão registrada e recibo recuperado após recarga. Painel interno mostrou a versão aprovada, os rascunhos e a ação de revogação após decisão. Aprovação não foi realizada em pedido real.

Conferidos 320/390/1440 px sem transbordamento horizontal. Ações públicas com altura de 44 px ou mais; o checkbox usa rótulo clicável de 44 px. Navegação por Tab e anel de foco visível confirmados. Captura local ignorada: `.superpowers/sdd/2026-10-23-catalogo-c4/c4-approval-receipt.png`. O navegador disponível usa o tema escuro e não expõe emulação de esquema de cores ou movimento reduzido; tema claro e preferência de movimento reduzido não foram certificados visualmente nesta rodada. Não foi adicionada animação ao fluxo C4.

A memória Docker disponível (aproximadamente 1,9 GiB) provocou recuperação do PostgreSQL de testes durante build. O banco foi recuperado sem apagar volume; builds posteriores ocorreram com esse banco parado ordenadamente. A instalação operacional não recebeu migrações C4. Um comando composto de reinício foi bloqueado pela revisão automática sem motivo específico; uma sequência mais conservadora iniciou o banco e criou outra candidata, preservando o contêiner anterior.
