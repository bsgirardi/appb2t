<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Versão e histórico obrigatórios em cada PR

Antes de finalizar e integrar qualquer PR, atualizar a versão do sistema e registrar as mudanças visíveis para os usuários. Esta regra também se aplica a PRs de manutenção e documentação.

- Usar `package.json` como fonte única da versão; sincronizar a versão raiz e `packages[""].version` de `package-lock.json`. Não criar tags automaticamente.
- Incrementar PATCH para correções, manutenção e documentação; MINOR para funcionalidades compatíveis; MAJOR somente para mudanças incompatíveis. Comparar com a versão atual de `main` antes do merge, inclusive se outra PR tiver sido integrada durante o trabalho.
- Os rodapés do painel administrativo e do login devem continuar usando `APP_VERSION` de `src/lib/version.ts`, sem números duplicados nos componentes. Confirmar que ambos exibem a nova versão.
- Adicionar uma entrada no início de `src/lib/releases.ts` com a mesma versão, data e resumo em português para quem usa o sistema. Manter as versões anteriores e suas notas intactas; separar Novidades, Melhorias e Correções quando aplicável.
- A página `/atualizacoes` deve mostrar a versão atual e o histórico e continuar disponível para administradores e operadores autenticados. Não incluir credenciais, dados de clientes ou logs internos nas notas.
- Atualizar a versão uma vez por PR entregue, e não uma vez por commit ou pela criação do commit de merge. Se a PR já contém o incremento e suas notas, não incrementar novamente só para finalizar a mesma PR.
- Antes do merge, conferir consistência entre manifestos, rodapés e histórico e executar as verificações apropriadas à alteração. Ao entregar, informar a versão e o estado da publicação/merge.

## Interface visual com shadcn/ui

Usar sempre a skill `shadcn` deste projeto (`.agents/skills/shadcn/SKILL.md`) em alterações visuais. Reutilizar os componentes instalados e seguir seus padrões de composição e acessibilidade.

## Entrega obrigatória após integração em main

Quando a tarefa autorizar merge e entrega, seguir integralmente [docs/DISTRIBUICAO_IMAGENS.md](docs/DISTRIBUICAO_IMAGENS.md), seção "Rotina obrigatória para cada integração em main". Uma integração não encerra a entrega: gerar localmente e publicar a Release oficial no repositório privado `bsgirardi/appb2t-distribuicao`, a partir do SHA completo realmente integrado, e conferir os assets publicados.

- Não depender de Actions, GHCR ou registry para construir/distribuir. A CI preexistente é uma verificação independente; não adicionar serviço de build remoto ao fluxo.
- Não compilar na produção e não publicar um pacote ensaiado de branch como se fosse o commit final. Usar `scripts/distribution/build.ps1` e `publish.ps1`, sem pular o gate local.
- Conferir novamente versão de main e checks antes do merge; se outra PR mudar a versão, ajustar esta mesma PR antes de integrar. Não incrementar outra vez só para gerar a entrega da PR já versionada.
- Não criar tags no repositório de código automaticamente. A tag da Release no repositório de distribuição faz parte da publicação autorizada.
- Se scripts/guia de distribuição mudarem, sincronizar o atualizador revisado com `publish-updater.ps1`. Não atualizar scripts instalados nem implantar em servidor sem autorização para essa operação.
- Registrar SHA integrado, versão, base/digest, plataforma, identificador/URL da Release, tamanho/checksums e verificações. Informar separadamente merge, Release e implantação operacional; nunca tratar imagem disponível como site atualizado.
- Se a publicação falhar após merge, declarar a entrega pendente e continuar a recuperação do draft/pacote; não recompilar em produção, substituir silenciosamente uma Release publicada ou afirmar conclusão.
