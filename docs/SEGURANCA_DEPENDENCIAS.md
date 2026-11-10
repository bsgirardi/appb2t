# Revisão de dependências — 10/11/2026

Entrega candidata 1.28.1, sobre main 1.28.0. Esta revisão cobre dependências npm, ferramentas de preparação, configuração do lint e inventário das imagens. Não altera banco, servidor instalado ou permissões de contas externas.

## Resultado npm e correções

Consulta inicial: oito alertas no grafo npm, sendo um alto e sete moderados. As cadeias afetadas eram undici usado pelo jsdom e minimatch usado pelo typescript-eslint. Consultas após atualização, incluindo ESLint 10: zero alertas no grafo completo e na consulta sem dependências de desenvolvimento. Isso é o resultado das bases consultadas nesta data, não garantia de ausência de falhas.

| Componente | Antes | Candidato |
|---|---|---|
| Next.js / eslint-config-next | 16.4.2 | 16.4.6 |
| React / React DOM | 19.3.0 | 19.3.1 |
| ESLint | 9.39.5 | 10.14.0 |
| typescript-eslint | 8.70.1 | 8.72.2 |
| undici usado pelo jsdom | 7.30.0 | 7.30.2 |
| minimatch nas cadeias modernas do lint | 10.2.6 | 11.0.2 |
| Vite | 7.3.7 | 7.3.8 |
| Inquirer prompts | 8.7.2 | 8.7.5 |
| Prettier | 3.9.9 | 3.9.10 |

O override de minimatch é limitado a typescript-estree, ESLint e config-array. Consumidores antigos, como os plugins import/react/acessibilidade, preservam minimatch 3.1.5; não se força a API 11 sobre todos os consumidores. Revisar esses overrides quando os pacotes upstream adotarem versões corrigidas.

O npm audit inicial não destacou todos os avisos oficiais do framework. Por isso, Next.js e os pacotes React foram conferidos também nas fontes dos mantenedores. Atualizar somente react no manifesto não basta para corrigir cópias de React Server Components embarcadas por frameworks.

O ESLint 9 encerrou suporte oficial em 06/08/2026. A migração para 10 foi testada com a configuração completa, sem desativar regras. Ressalva: eslint-plugin-react 7.37.5 ainda declara peer até ESLint 9.7, embora eslint-config-next 16.4.6 aceite ESLint >=9 e typescript-eslint aceite 10. O projeto já usava legacy-peer-deps; essa configuração foi preservada. A validação cobre o conjunto de regras efetivamente configurado, e a declaração de compatibilidade do plugin deve ser acompanhada.

## Node, npm e instalação

O projeto passa a declarar Node 22.23.4 e npm 12.2.2 em engines/packageManager, com .nvmrc específico e a mesma preparação no CI/Docker. Os tipos Node foram alinhados à linha 22. A imagem-base já continha Node 22.23.4; não houve migração para outro major de Node.

O npm 12 bloqueia scripts de instalação de dependências por padrão. allowScripts aprova apenas as versões revisadas de @prisma/client, @prisma/engines, prisma, esbuild e unrs-resolver. O gerador do manifesto reduzido de ferramentas preserva essa política, inclusive negações explícitas. Um teste reproduziu a perda da política antes da correção e passou após o ajuste.

Foi adicionado npm run audit:security ao job de qualidade existente, que reprova alertas moderados ou superiores. Isso verifica os avisos conhecidos no momento da execução; não é monitoramento contínuo de uma instalação publicada.

As ferramentas globais da máquina não foram alteradas. A validação local usa cópias portáteis de Node oficial e npm; o arquivo Node foi conferido com o SHA-256 publicado pelo fornecedor. O ambiente que inicia o agente tinha Node 24.19.0/npm 12.2.1 e não é tratado como o runtime de produção do projeto.

## Imagens e limites do scanner

Docker Scout exigiu login; foi usado Trivy 0.76.2 portátil do repositório oficial, com checksum verificado. A análise extrai a imagem localmente e consulta a base pública de vulnerabilidades, sem upload da imagem privada. Relatórios brutos e logs ficam em .b2t/security-review-20261110, fora do Git.

A imagem 1.28.0 apresentou 23 ocorrências de avisos em pacotes Node, todos sob o npm global embarcado. O runtime da aplicação usa node server.js; npm e corepack foram retirados de sua imagem final. A imagem de ferramentas mantém npm atualizado porque migração e criação de administrador ainda usam seus comandos.

O inventário inicial Debian 12.15 apresentou 217 ocorrências por pacote, com repetições de CVEs entre pacotes: uma crítica, 34 altas, 95 médias e 87 baixas. Nenhuma dessas entradas trazia versão corrigida para a distribuição no relatório. Uma consulta apt simulada confirmou zero pacotes atualizáveis naquele momento. Não se deve converter essa contagem diretamente em falhas remotamente exploráveis, nem tratar a ausência de correção como ausência de risco.

O alerta crítico CVE-2023-45853 foi conferido no rastreador Debian: refere-se ao contrib/minizip, não compilado nos binários zlib dessa versão bookworm. O mantenedor registra que esses binários não são afetados. O relatório bruto continua preservando a ocorrência; não foi criada uma supressão geral de alertas críticos.

As demais ocorrências Debian sem correção exigem acompanhamento do fornecedor e triagem de aplicabilidade. Uma eventual migração da base Debian precisa validar OpenSSL, Prisma e processamento de imagens/PDF antes de substituir o runtime. Não foram aplicados patches não oficiais nem atualizados pacotes em servidor.

## Atualizações não incluídas

Prisma 7/8 (incluindo candidatos de pré-lançamento), TypeScript 7, Vite 8, Vitest 5 e jsdom 31 envolvem mudanças de major e não foram instalados automaticamente. Não havia alerta npm remanescente que exigisse essas migrações. Atualizações funcionais de ícones, gráficos e estilos também podem ser avaliadas separadamente, sem alterar a apresentação nesta manutenção.

## Fontes primárias

- [Next.js: resposta encaminhada e possível exposição entre clientes](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385) — inclui 16.4.2; corrigido em 16.4.5.
- [Next.js: bypass da rejeição de SVG](https://github.com/vercel/next.js/security/advisories/GHSA-7qx7-33qx-rqx2) — inclui 16.4.2; corrigido em 16.4.5.
- [React Server Components: correção 19.3.1](https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3).
- [Undici: excesso de codificações de conteúdo](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c).
- [Minimatch: amplificação de globparts](https://github.com/advisories/GHSA-g3hv-75wg-m249).
- [Node 22.23.4: Release de segurança](https://nodejs.org/en/blog/release/v22.23.4).
- [ESLint: suporte das versões](https://eslint.org/version-support/) e [migração para 10](https://eslint.org/docs/latest/use/migrate-to-10.0.0).
- [npm 12.2.2](https://github.com/npm/cli/releases/tag/v12.2.2); política de scripts conferida também na documentação distribuída com o pacote.
- [Debian: análise CVE-2023-45853](https://security-tracker.debian.org/tracker/CVE-2023-45853).

## Validação da candidata

- Auditorias npm completa e sem dependências de desenvolvimento: zero alertas.
- Gate Docker `verify` com Node 22.23.4/npm 12.2.2: tipagem, lint e 1.079 testes em 254 arquivos passaram. Contratos Docker: 15 testes passaram, incluindo preservação da política de scripts.
- Imagem de ferramentas `linux/amd64` construída com sucesso, digest local `sha256:9a4d2b07d74f0e885148879bd1981cc51574b553ab3bf03bcb5adeeb52ee4391`.
- Build final da imagem da aplicação pendente: o compilador foi encerrado por falta de memória no Docker local de 2 GiB. Reduzir o heap não resolveu. Uma tentativa com paralelismo nativo limitado também não concluiu; esse ajuste experimental não foi mantido no código. O engine passou a retornar erro interno 500 ao criar um contêiner de inspeção.
- A análise e inspeção finais das imagens não foram concluídas. A contagem Debian e os 23 avisos npm acima são da imagem anterior; não se afirma que a candidata tenha zero alertas de imagem, nem que a remoção de arquivos elimine dados presentes em camadas anteriores.
- Revisão de código sem achados concretos; ressalva de peer do plugin React descrita acima permanece em acompanhamento.

A validação local concluída não substitui o build pendente. A candidata deve permanecer em revisão até concluir o build e a inspeção das imagens. Esta manutenção não foi integrada, não gerou Release oficial e não foi implantada em servidor.
