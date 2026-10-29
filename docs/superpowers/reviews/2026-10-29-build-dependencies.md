# Cache de dependências e tools — 1.11.1

Base main 03b86ce, versão 1.11.0, após integração autorizada da PR26. Alteração local em branch codex/build-dependencies; sem acesso ou mudança em produção nesta entrega.

## Entrega

Manifestos derivados normalizam somente as versões raiz na instalação. Fontes oficiais continuam intactas e as imagens recebem a versão verdadeira. Hooks raiz preservam a versão original de deps, inclusive o hook dependencies, que pode executar quando node_modules muda. Tools instala apenas as dependências auditadas dos comandos de migração e administração. O lock é reduzido offline e os artefatos resultantes são conferidos contra o lock original. Scripts de dependências permanecem habilitados no npm ci efetivo.

## Medição local

Mesma engine, campo Docker image inspect Size:

| Imagem tools | Bytes |
|---|---:|
| Baseline Dockerfile main 1.11.0 | 368.657.686 |
| Otimizada 1.11.1 | 200.255.912 |

Redução aproximada de 45,7%; não comparar esses números diretamente com a engine do Debian. A nova instalação de tools adicionou 65 pacotes. O runtime permaneceu aproximadamente 153,5 MB. Nenhuma previsão de duração no servidor foi estabelecida.

## Evidências

- TDD: import do gerador inicialmente falhou; sete testes de normalização, invalidação, versões, hooks e artefatos passaram após implementação. Cobertura adicional do hook dependencies reproduziu falha antes da correção e passou depois. Testes também executados com Node 22/Linux.
- Lock de tools resolvido com --offline e cache de metadados vazio. Todos os registros de versão, URL e integridade resultantes pertencem ao lock original.
- Build tools com cache npm novo e vazio: aprovado. Nenhum cache existente foi apagado.
- Contexto 0600: build tools e import administrativo aprovados como uid 1000.
- Alteração somente de versão para 99.0.2: npm ci CACHED em tools e runtime; ambas as imagens exibiram 99.0.2, incluindo as entradas de lock de tools.
- Alteração da declaração de zod, de intervalo para versão exata compatível: npm ci de tools executou novamente. Teste puro também cobre mudança em dependências e registro transitivo do lock.
- Builds tools e runtime 1.11.1 aprovados, verificações de tipos habilitadas; heap de build 1536 MiB herdado da main.
- Tipos, lint e três testes de versão/rodapés aprovados.
- Suíte Linux em PostgreSQL 17 exclusivo: **965 testes em 283 arquivos aprovados**. Banco de teste anterior exigiu recuperação de startup; o ensaio final usou instância nova, sem portas de host nem acesso à produção.
- **24 cenários shell**, fluxo Git/flock e CLI real do Compose aprovados.
- Imagem tools aplicou 30 migrações em banco isolado novo. Prisma e seus engines estão presentes. Imports administrativos e inicialização real do CLI com argumento inválido aprovados antes de qualquer prompt/escrita.
- Recuperação administrativa executada pela imagem mínima sobre usuário sintético: hash novo válido, senha antiga inválida, versão incrementada, sessões e tentativas invalidadas.
- Runtime 1.11.1: HTTP 200 em saúde/login; login sintético e HTTP 200 em dashboard e Atualizações autenticados, ambos com versão 1.11.1. Isso é validação HTTP/SSR, não navegação visual de produção.
- Revisão independente da implementação e do ajuste final de hooks: nenhum achado acionável. git diff --check limpo.

## Limites e manutenção

Não há medição nova no Debian nem deploy nesta etapa. A normalização não evita recompilar o Next quando a versão muda: a versão visível faz parte do bundle. Tools tem lista explícita de dependências; novos imports administrativos exigem revisá-la e executar os comandos reais. Mudanças de workspaces/lockfile incompatíveis falham antecipadamente. Cache de downloads continua diferente de cache da instalação. Retenção de imagens/backups e pressão de I/O do servidor permanecem sob o procedimento existente, sem limpeza ou configuração global nesta PR.

Referência dos hooks npm 10: https://docs.npmjs.com/cli/v10/using-npm/scripts/ .
