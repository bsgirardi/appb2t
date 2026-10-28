# Integração das PRs E1–E4 — 28/10/2026

Autorização: revisar todas as PRs pendentes e integrar na main local e no GitHub.

## Escopo e versões

- PR #19: comparação de lotes, versão 1.7.0 sobre main 1.6.0.
- PR #21: explicação dos desvios de rentabilidade, versão 1.8.0.
- PR #22: calendário e simulação da fila, versão 1.9.0.
- PR #23: negociações e próximos contatos, versão 1.10.0.

Branches reconciliadas nessa ordem, preservando funcionalidades da 1.6.0, versões publicadas e notas próprias de cada PR. Conflitos restritos a manifestos, histórico e documentos de acompanhamento; as versões mais recentes dos documentos contêm os registros anteriores. Cada PR mantém um único incremento MINOR. Rodapés e Atualizações continuam usando APP_VERSION.

## Evidências

- Revisão independente das quatro funcionalidades: nenhum bloqueador concreto de correção ou segurança.
- 619 testes unitários em 152 arquivos aprovados no conjunto final. 151 arquivos passaram em 19 lotes na worktree E4; os três casos de planning-ui passaram no checkout principal com o mesmo código. A worktree reproduziu recursão interna do transporte Vitest nesse arquivo, inclusive isolado; não foram omitidos testes ou suprimidos erros. Execução monolítica continua como pendência do runner.
- Regressão PostgreSQL: 304 testes em 123 arquivos aprovados no banco dedicado localhost:55432/b2t_test.
- E3: 29 testes em 11 arquivos aprovados em PostgreSQL descartável exclusivo localhost:55433/b2t_e3_test, incluindo cinco novos casos de preview. Há sobreposição com a regressão geral.
- E4: 21 testes em seis arquivos aprovados no PostgreSQL descartável exclusivo localhost:55434/b2t_e4_test, incluindo concorrência e aceite privado versus conversão administrativa.
- Migração E4 real: base anterior, fixtures legadas, migração aditiva, reaplicação, preservação de sete tabelas, FK e venda vencedora única aprovadas.
- E1: 26 testes focados em três arquivos reexecutados na sua própria branch; E2: 17 testes em dois arquivos reexecutados na própria branch.
- TypeScript, ESLint completo e build de produção Next.js aprovados sobre o conjunto final; diff e consistência dos quatro manifestos/históricos verificados.

## Limites operacionais

Merge de código não publica a aplicação. Contêineres e banco de produção preservados; nenhuma migração operacional executada. A publicação futura da 1.10.0 precisa aplicar a migração aditiva de negociações pelo procedimento normal. E1–E4 amplas continuam parciais conforme seus roadmaps; a integração entrega os recortes E1.1–E4.1.

Documentos locais coincidentes com as PRs foram comparados byte a byte, normalizando apenas CRLF, e preservados em stash de backup antes da troca de checkout. Outras skills e arquivos locais não relacionados permanecem intactos.
