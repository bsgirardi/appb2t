# Preparação do novo computador — 22/10/2026

Pasta: `X:\codex\appb2t`. A main local e a main remota foram conferidas no commit `5e5ec24`. A publicação 1.1.0 descrita nos registros anteriores pertence ao computador anterior, não comprova uma instalação neste computador.

O usuário escolheu iniciar com banco vazio. Nenhum backup foi importado, banco criado ou migração aplicada nesta preparação. Os serviços PostgreSQL de outros aplicativos encontrados no Windows foram preservados.

## Preparação realizada

- Lidos AGENTS.md, README.md, PENDENCIAS.md, SEGURANCA.md, PRODUCAO.md e o registro de organização local. Consultadas as skills locais shadcn e vercel-react-best-practices e os guias de instalação/atualização do Next instalado.
- Dependências instaladas pelo lockfile e Prisma Client gerado explicitamente. O npm 12 bloqueou scripts automáticos de algumas dependências; não foi desabilitada globalmente essa proteção.
- Criado `.env` local ignorado pelo Git, com senha aleatória e acesso HTTP restrito ao computador na configuração Compose. A conexão nativa do exemplo é apenas preparação; não foi validada nem usada para migrações.
- `docker compose config --quiet`, tipagem, lint e build Windows aprovados, sem alterar package.json ou lockfile.
- Node global: 24.19.0; npm: 12.2.1. A suíte unitária no Node 24 executou 399 testes, mas terminou com erro não tratado de ReadableStream/undici em product-request.test.ts. Não considerar essa execução aprovada.
- Node 22.23.4 extraído em `test-results/preparacao-local/package/bin/node.exe`, sem substituir o Node global. Com esse executável: 99 arquivos e 399 testes unitários aprovados, saída zero. A tentativa anterior via npx ainda selecionava Node 24; a versão do executável direto foi conferida.
- Auditoria atual: um alerta crítico e cinco altos; relatório ignorado em `test-results/preparacao-local/audit.json`. Next.js e eslint-config-next 16.4.2 estão disponíveis no registro consultado, mas ainda não foram instalados ou validados neste computador.

## Bloqueio de execução

Docker Desktop estava incapaz de iniciar. O comando WSL informava instalação ausente, embora os recursos opcionais Windows Subsystem for Linux e VirtualMachinePlatform estivessem habilitados. A instalação por `wsl --install --no-distribution` falhou. O pacote oficial Microsoft.WSL 2.7.13 foi então instalado com sucesso pelo winget; WSL passou a informar versão padrão 2.

O Docker continuou indisponível na conferência posterior. Reinício do Docker solicitado; nenhum reinício do Windows foi executado. Ainda não foi possível inventariar volumes, iniciar PostgreSQL 17 dedicado, executar integração ou validar HTTP com banco. Não presumir ausência de volumes só porque o daemon não responde.

## Continuidade

1. Concluir a inicialização do Docker/WSL; reiniciar o Windows se necessário e reconferir o daemon e os volumes.
2. Preparar PostgreSQL 17 próprio para a instalação vazia e banco de testes separado conforme compose.test.yaml. Não usar os PostgreSQL de outros aplicativos.
3. Priorizar a atualização compatível de Next.js e lint, repetir auditoria, suíte completa, tipagem, lint e builds antes de publicar. Não usar audit fix --force.
4. Iniciar a instalação local e criar o primeiro administrador interativamente, sem inventar credenciais de acesso.
5. Depois da segurança e validação local, permanecem C4 (arte/aprovação) e C5 (checkout).

As skills locais em `.agents/` e skills-lock.json já estavam não versionadas na chegada e foram preservadas. Nenhum commit, push ou publicação foi realizado.
