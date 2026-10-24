# Publicação C5 — 23/10/2026

Migração C4 → C5, merge e publicação local autorizados explicitamente pelo usuário. [PR #5](https://github.com/bsgirardi/appb2t/pull/5) integrado em main pelo merge `3dc80c2e3b547fc30dde62bfcae4f98045a6a242`. A árvore resultante é idêntica à implementação `b52d764f93122deffada81b52b12ef0ba2b9ed6a`. Checkout original X:/codex/appb2t sincronizado por fast-forward; .agents/, skills-lock.json, stash, worktrees e evidências anteriores preservados.

## Validação antes da troca

Suíte completa executada novamente em Linux/Node 22: **715 testes aprovados em 230 arquivos**, saída 0, duração 195,94 s. Builds tools e runtime aprovados; os estágios de compilação reutilizaram o cache da árvore validada. Configuração runtime idêntica à candidata: `sha256:4a134b4b71323afe2fd7c5dd2e459d6a065b9f207a2942409aa840beabc23db1`.

Detalhes funcionais e limites da validação visual no [relatório C5](2026-10-23-catalogo-c5-validacao.md). A publicação não elimina os limites de emulação de tema/movimento/data, nem o limite compartilhado de inicialização/troca de acesso na ausência de ingresso confiável.

## Backup e migração

Aplicação C4 parada antes do backup final. PostgreSQL operacional e volume `appb2t_postgres_data` preservados. Backup custom: `X:/codex/appb2t/backups/publicacao-c5-20261023/final.dump`, **232056 bytes**, SHA-256 `BCB68C13C636F10D492E8F94C558075800F9DDE100C4E961B20CC20E9D88A903`.

Backup restaurado em banco novo `b2t_c5_release_restore`, exclusivamente no PostgreSQL descartável `appb2t-c5-browser-db`. As 95 projeções com as colunas legadas ficaram idênticas na restauração e após aplicar `20261023190000_catalog_checkout`. Só então a mesma migração foi aplicada ao banco operacional pelo tools C5. Saída 0, sem migrações pendentes. As **95 projeções legadas permaneceram idênticas** antes/depois e após as verificações HTTP.

Nenhuma fixture foi importada na operação. Zero usuários e zero checkouts comerciais após a publicação; a verificação HTTP criou somente uma sessão técnica de checkout e sua cota. Primeiro administrador continua pendente de criação interativa conforme PRODUCAO.md; nenhum login operacional foi inventado para testar autenticação.

## Imagens e configuração

- Runtime: `appb2t:c5-20261023`, manifest `sha256:f5ef933ea0140014cd8eb3edca728884f6c3facb3ba8bddd057967fb97e51fb3`.
- Tools: `appb2t:c5-20261023-tools`, manifest `sha256:a0ed5f9309059f96703ce473256f638287373840e176f46f51ac6fbdb121c34d`.
- Imagem C4 preservada também como `appb2t:before-c5-20261023`.
- Tags Compose padrão appb2t-app/appb2t-migrate/appb2t-admin atualizadas para C5; override operacional fixa as tags acima.
- CHECKOUT_ACCESS_KEY gerada com 32 bytes aleatórios e configurada privadamente; ART_ACCESS_KEY anterior preservada exatamente. Formato e independência das duas chaves verificados sem imprimir valores.

Configuração anterior, ambiente C5, override, dump, projeções e logs privados ficam em `X:/codex/appb2t/backups/publicacao-c5-20261023/`, ignorado pelo Git. Logs de suíte/build ficam também em `C:/Users/Administrador/.codex/worktrees/catalogo-c5/appb2t/backups/publicacao-c5-20261023/`.

## Resultado publicado

Aplicação local **http://localhost:3000**, contêiner `appb2t-app-1` healthy; banco healthy e serviço migrate concluído. Compose continua no projeto appb2t com porta 3000 limitada a 127.0.0.1.

HTTP: saúde, catálogo, login, checkout e continuidade retornam 200; dashboard sem autenticação redireciona 307; API administrativa retorna 401; consulta pública por protocolo retorna 403. Inicialização de sessão com origem externa retorna 403 e com origem local retorna 200, cookie HttpOnly/SameSite=Strict. Páginas/APIs privadas usam no-store/no-referrer. O log UNAUTHENTICATED do dashboard corresponde à verificação deliberada sem sessão. Navegador confirmou a página Concluir pedido no ambiente operacional, sem dados demonstrativos. Captura: `backups/publicacao-c5-20261023/checkout-publicado.png`.

Compra direta permanece desabilitada nos produtos/kits legados até configuração explícita pela equipe. Pagamento continua externo e produção/reservas continuam manuais. Não fazer downgrade cego para C4 após novas operações C5: preservar banco, chave e idempotência; preferir correção para frente ou recuperação conciliada.

Publicação externa com domínio/HTTPS e backup automático fora desta máquina continuam pendentes; esta atualização publica somente a instalação local existente.
