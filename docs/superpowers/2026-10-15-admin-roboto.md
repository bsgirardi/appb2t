# Roboto administrativo — 15/10/2026

Continuidade solicitada pelo usuário após apresentação da proposta e do diff. Primeira etapa do preset: fonte Roboto nos pesos 400/600/700, servida localmente, no administrativo, login e menu móvel. Catálogo mantém Poppins. Não foram alteradas paletas, fontes do site, bibliotecas de componentes, preflight ou regras de negócio. Nova completo continua pendente de adaptação por componente; components.json permanece new-york/slate.

O lockfile acrescenta @fontsource/roboto 5.3.0 e metadados de pacotes já incluídos no bundle opcional do Tailwind. Nenhuma versão de dependência preexistente foi alterada. Roboto não tem dependências próprias.

## Revisão e regressão

Revisão independente identificou Poppins fixada no TabsTrigger usado em Configurações. O navegador reproduziu a falha: fonte efetiva Poppins em vez de Roboto. Removida a fonte explícita para herdar a fonte da área; o Accordion do site continua Poppins. Essa adaptação é necessária para completar o escopo administrativo da proposta original.

18 testes de interface em cinco arquivos aprovados. Lint completo aprovado antes da alteração nas abas; lint do arquivo repetido após a correção. Aviso conhecido do jsdom sobre navegação não causou falha. Evidências em test-results/admin-font/ e logs font-* em test-results/admin-acceptance/.

## Dependências: pendência separada

O npm audit reportou seis entradas de severidade alta: next e a cadeia de ferramentas eslint-config-next, @next/eslint-plugin-next, fast-glob, micromatch e braces. As versões são preexistentes e não foram trocadas nesta etapa. O relatório bruto foi preservado em test-results/admin-acceptance/font-audit.json. A aplicabilidade dos avisos ao uso concreto da aplicação ainda precisa de avaliação; não foi executado audit fix nem atualização de framework.

Sem publicação ou push nesta etapa.

## Fechamento da candidata

Build Docker completo aprovado, incluindo tipos. Imagem `b2t-admin-font-candidate:20261015`, identificador `sha256:2ea3d55b3b5f4394448c336745b3cb7ebfff4cc6162a0d18c8de6413d0a6b5e9`. Executada exclusivamente em localhost:3102, rede do Compose de testes e banco b2t_test, com conta e dados fictícios.

Os cinco resultados de navegador passaram: font-result.json, result.json, flows-result.json, extra-result.json e appearance/result.json, em test-results/admin-font/. Conferida a fonte efetiva e seu carregamento: Roboto no shell, títulos, menu móvel, abas e login; Poppins no site. A regressão das abas passou após falhar na imagem anterior. Claro/escuro, 390/1440px, navegação por teclado e ausência de transbordamento da página aprovados. Capturas representativas inspecionadas, incluindo Configurações, Aparência, fila e login.

Repetidos os cenários representativos de U4/U5 descritos no aceite anterior: rascunhos, falhas de rede, conferências, apurações, contribuição negativa, horários, lotes, ordenação e marcos reais. Edição, prévia, salvamento e recarga das oito cores passaram, preservando independência das áreas. Somente as cores fictícias do banco de testes foram alteradas.

Favicon confirmado por HTTP 200 e Content-Type image/x-icon na candidata Docker. Isso conclui a verificação HTTP que estava pendente no registro inicial; a rejeição anterior do servidor local continua documentada, sem nova tentativa daquele comando.

Produção conferida saudável na imagem anterior `sha256:af88cbb7af63d72026e148465e73a66ba71da1261f7635b9c0b8a3617eaf326e`. Favicon e Roboto ainda aguardam publicação. O preset Nova completo continua pendente, assim como avaliação dos alertas de dependências e confirmação externa de backup automático/domínio/HTTPS.
