# Aceite integrado do catálogo — 16/10/2026

Continuação da adaptação Nova registrada em `2026-10-15-nova-catalogo.md`. Nesta rodada não houve mudança de código de aplicação: a pendência era validar a candidata integrada, além da fixture estática.

## Ambiente

Docker Desktop respondeu novamente. A instalação antiga (`b2t-calculadora-app-1` e `b2t-calculadora-db-1`) foi encontrada parada e permaneceu parada, sem comandos de inicialização ou atualização.

Build Linux aprovado com Next.js 16.3.8, tipos e geração das páginas. Imagem candidata: `appb2t-nova-candidate:20261016`, ID `sha256:b5331fb992e9a02d03b5414b1bb9d7ecad2e0540db7193c4b643bb8f3d47928a`. Imagem auxiliar: `appb2t-nova-tools:20261016`.

Aplicação temporária em `127.0.0.1:3102`, rede `appb2t-nova-review`, PostgreSQL com banco `b2t_test` em tmpfs. Nenhum volume nomeado ou diretório operacional montado. As 20 migrações passaram no banco vazio. Preparados 14 produtos, duas coleções, conteúdo de ajuda e conta fictícios; o logo B2T foi usado como imagem de demonstração, sem representar oferta real.

A tentativa de compartilhar a pasta de testes do Windows ficou aguardando a criação do contêiner e foi cancelada. O script foi copiado para o contêiner auxiliar, com escrita limitada ao diretório de evidências. Não foi tentada recuperação de socket ou encerramento de processos do Docker.

## Resultado

- 48 cenários: home, busca com resultado, busca vazia, coleção, coleção vazia, produto, orçamento vazio e ajuda; cada um em 320/390/1440 px, claro/escuro. HTTP 200, sem transbordamento horizontal da página, imagens visíveis carregadas e ações públicas de pelo menos 44 px.
- Fluxo interativo: busca mantém coleção; ordenação mantém busca; paginação chega à página 2; abertura do produto preserva página e filtros.
- Produto adicionado à lista após hidratação; conferência pela API retornou 200; lista persistiu após recarga e item pôde ser removido. Nenhuma mensagem externa foi enviada.
- FAQ operada por teclado, com expansão confirmada por `aria-expanded`.
- Nenhum erro JavaScript capturado. Favicon retornou 200 e `image/x-icon`.
- Capturas representativas de busca, estados vazios, produto e lista preenchida inspecionadas. Dados comerciais e contatos são fictícios ou vazios.

O primeiro ensaio dos fluxos terminou por sincronização do teste: `networkidle` não aguardou a troca de URL na navegação do cliente. A espera passou a observar explicitamente o destino; a matriz e os fluxos foram repetidos e aprovados, sem alteração da aplicação.

Evidências locais: `test-results/nova-catalog/integrated-browser.cjs`, `seed-integrated.ts`, `integrated-fixture.json`, `integrated-result.json` e capturas `integrated-*.png`. O resultado registra 48 cenários, `flows: passed` e lista de erros vazia. As evidências são ignoradas pelo Git. Os 300 testes unitários e lint aprovados na etapa anterior continuam sendo a referência; não foram repetidos sem mudança de código.

## Fechamento e limites

Contêineres e rede temporários removidos após a revisão; imagens candidatas e evidências preservadas. Nenhum volume, backup ou dado operacional alterado. Sem publicação, push, merge ou atualização do pacote/ZIP de entrega.

A adaptação visual aprovada e a revisão integrada do catálogo estão validadas. Não se declara aplicação integral do preset: configuração new-york/slate, APIs locais, Sheet/menu e confirmações inline permanecem intencionalmente preservados. U4/U5 não foram reimplementados nem tiveram seu aceite repetido. A matriz representa Chrome com dados fictícios, não certificação geral de acessibilidade ou validação de todas as combinações comerciais.
