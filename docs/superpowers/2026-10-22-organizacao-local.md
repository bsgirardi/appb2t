# Sincronização e organização local — 22/10/2026

A pasta original foi atualizada por avanço direto para a main da versão 1.1.0, sem reaplicar o código antigo sobre a release. As alterações locais e o ZIP anterior foram preservados em stash local antes da troca; o documento de abertura já era idêntico ao versionado.

Backups, registros de validação e estado de planejamento das duas pastas auxiliares do catálogo foram copiados para backups/cleanup-20261022 e conferidos por SHA-256 (600 cópias de arquivos verificadas). Os backups de implantação também foram reunidos em backups/ da pasta original; as evidências da release estão em test-results/release-1.1.0. Esses arquivos continuam fora do Git.

As pastas auxiliares catalogo-c1 e catalogo-c2 foram arquivadas pelo gerenciador do Codex e removidas de seus caminhos anteriores, com recuperação disponível. Pastas de outras tarefas e projetos não foram removidas. O banco, as credenciais locais e o volume operacional foram preservados; a aplicação 1.1.0 permaneceu saudável.

A revisão automática bloqueou a remoção solicitada do cache .next e do arquivo incremental de TypeScript; eles foram preservados. Isso não altera o código sincronizado nem o sistema publicado.
