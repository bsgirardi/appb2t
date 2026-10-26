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
