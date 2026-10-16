# Segurança das dependências — appb2t

Revisão de 15/10/2026.

Complemento de validação em 16/10: build Docker com Next.js 16.3.8 aprovado na candidata visual; catálogo executado em ambiente isolado. Isso resolve o bloqueio de build descrito no histórico abaixo, sem publicação ou nova auditoria de dependências. Registro em `docs/superpowers/2026-10-16-catalogo-integrado.md`.

Publicação posterior em 16/10: a mesma candidata foi instalada localmente em http://localhost:3000, com backup e restauração de teste aprovados. A instalação local agora executa Next.js 16.3.8. Registro em `docs/superpowers/2026-10-16-nova-publicacao.md`; os parágrafos de implantação abaixo descrevem o estado histórico anterior.

## Correção aplicada

Next.js e eslint-config-next passaram de 16.3.6 para 16.3.8, com versões fixadas no package.json e no lockfile. A atualização permanece na mesma linha de manutenção. O npm audit anterior apontava seis avisos no pacote Next.js, incluindo SSRF no otimizador de imagens e problemas de cache; todos tinham correção indicada na versão 16.3.8.

## Pendência upstream

O aviso [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) afeta braces até 3.0.3 e ainda não possui versão corrigida publicada na data da revisão. O relatório contabiliza cinco pacotes por propagação na mesma cadeia:

eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces.

Essa cadeia é de desenvolvimento. No plugin Next instalado, fast-glob processa a configuração settings.next.rootDir; o projeto não configura esse campo. Não foi identificado caminho de entrada de requisições da aplicação para essa função. Essa análise reduz o alcance observado, mas não elimina o alerta nem equivale a uma auditoria completa de segurança.

Manter configurações de lint sob controle do projeto e não executar ferramentas sobre configurações não confiáveis. Acompanhar a correção upstream e repetir npm audit após atualizações. Não foi usado audit fix --force: a sugestão automática de rebaixar eslint-config-next para 14.2.35 não corresponde à linha Next.js 16 usada pelo projeto.

As regras de lint foram preservadas. Não há supressão do relatório ou substituição artesanal da biblioteca vulnerável.

## Implantação

A correção é entregue no código e no pacote para novo build. A instalação antiga continua com sua imagem anterior até uma implantação explícita. Nenhum banco ou credencial real integra o pacote.

## Validação realizada

- npm audit --omit=dev: zero vulnerabilidades conhecidas.
- npm audit completo: cinco alertas altos da cadeia de lint descrita acima.
- npm run test:unit: 298 testes passaram, em 71 arquivos.
- npm run lint: passou.
- npm run build no Windows: passou com Next.js 16.3.8, incluindo TypeScript e geração das páginas.
- Build Docker desta atualização: não executado até o fim, pois Docker Desktop retornou erro de inicialização antes do build. Repetir o build Linux/Docker no servidor de destino conforme PRODUCAO.md. O build Docker validado anteriormente era da versão 16.3.6.

Não foi reiniciado ou atualizado nenhum serviço da instalação existente. A indisponibilidade do Docker impediu reconfirmar sua saúde nesta rodada.
