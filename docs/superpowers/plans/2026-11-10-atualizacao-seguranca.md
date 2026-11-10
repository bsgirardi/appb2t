# Revisão de dependências e segurança — 10/11/2026

## Objetivo e limites

Corrigir alertas conhecidos nas dependências e ferramentas, mantendo comportamento e dados. O usuário pediu revisão e atualização do projeto; esta entrega não autoriza implantação em servidor nem reutiliza a autorização de merge da PR 66. Usar branch codex/security-dependencies sobre main 1.28.0, preparar manutenção 1.28.1 e apresentar resultado revisável.

## Diagnóstico inicial

- npm audit: oito alertas (um alto e sete moderados), via undici/jsdom e minimatch/typescript-eslint. Dependências de ferramentas também precisam ser corrigidas, embora não provem exposição do servidor.
- Avisos oficiais Next.js publicados em 03/11/2026 incluem a versão 16.4.2; npm audit sozinho não cobriu esses casos. Atualizar Next e eslint-config-next juntos para 16.4.6 e React/React DOM para 19.3.1.
- Docker já usa Node 22.23.4; o ambiente de ferramentas da máquina usa Node 24.19.0/npm 12.2.1. Validar com Node oficial 22.23.4 e npm 12.2.2 portáteis, sem alterar instalação global.
- ESLint terminou sem erros; .b2t contém fontes de ensaio geradas e deve ficar fora do lint.
- A política oficial do ESLint informa fim de suporte da linha 9 em 06/08/2026. Isso justifica testar a migração para ESLint 10, preservando as regras do Next e documentando peers antigos de plugins caso ainda não declarem a nova versão.
- Docker Scout exige login. Usar scanner Trivy portátil oficial, com checksum conferido, sem enviar imagens privadas. Auditoria npm não cobre pacotes Debian nem todos os componentes embutidos.

## Implementação e verificação

1. Atualizar patches de Next/React, dependências transitivas vulneráveis e ferramentas compatíveis. Não migrar Prisma, TypeScript, ESLint ou jsdom para outro major sem necessidade comprovada.
2. Corrigir minimatch apenas na cadeia typescript-eslint, preservando consumidores antigos da API v3. Documentar override enquanto o upstream não adota versão corrigida.
3. Fixar e alinhar ferramentas do projeto, CI e Docker; conferir npm embarcado e reduzir componentes desnecessários da imagem de runtime quando justificado pelo inventário.
4. Sincronizar versão 1.28.1 no package.json/lock e registrar notas de manutenção em português. Não alterar rodapés além da fonte APP_VERSION.
5. Reexecutar auditoria completa e produção; verificar lint, tipos, testes, contrato Docker e build das imagens em Node 22. Inspecionar imagens finais com scanner, separando componentes de aplicação, ferramentas e sistema operacional.
6. Registrar versões, fontes primárias, evidências, limites e alertas remanescentes. Solicitar revisão antes da entrega. Não prometer ausência de vulnerabilidades nem publicar Release sem autorização de integração desta tarefa.
