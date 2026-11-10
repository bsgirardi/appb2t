# B2T: início, catálogo e presença no Google

## Direção e autorização

Implementar na worktree 69c1, branch codex/landing-seo-analytics, partindo de main 8817d5b (1.27.14). O encaminhamento já define a abordagem e pede execução sem nova rodada de aprovação de escolhas rotineiras. Merge, publicação, implantação e conexão Google não estão autorizados.

## Arquitetura escolhida

- `/`: apresentação institucional, com marca oficial, texto HTML, catálogo e orçamento como ações. O mascote é ilustração de marca, não prova de trabalho entregue. Coleções públicas cadastradas podem aparecer; cases, Instagram, bastidores e depoimentos aguardam fonte e autorização.
- `/catalogo`: busca, coleções, filtros e produtos antes de qualquer conteúdo promocional. Preservar consulta, paginação, disponibilidade e preços existentes.
- `/portfolio`: 308 para `/catalogo`, preservando consulta. Consultas antigas de catálogo em `/` seguem para `/catalogo` sem perder parâmetros repetidos ou UTMs. Produtos, kits, orçamento, compra e checkout mantêm URLs.
- `/configuracoes/seo-analytics`: somente ADMIN, com identidade existente em Aparência, SEO padrão e por página, herança de produtos/coleções, prévias, indexação e redirecionamentos seguros.
- Redirecionamentos editáveis atendem caminhos antigos não ocupados por rotas do sistema; destinos internos públicos fixos, sem cadeias ou ciclos e sem substituir rotas privadas.

Alternativas avaliadas: manter tudo na home perpetuaria a mistura institucional/comercial; trocar plataforma ou criar CMS paralelo duplicaria fontes. A composição no Next existente usa JSON storefront e campos SEO dos produtos sem migração de schema.

## Design e conteúdo

Preservar Poppins pública, Roboto administrativa e componentes locais. Referência de marca: azul #0066CC, laranja #FF7A00, verde #4CAF33; superfícies e cores de texto derivam dos tokens claros/escuros e preferências salvas. Layout de abertura em duas colunas (texto à esquerda, mascote à direita), empilhado no celular; seções seguintes alinhadas à esquerda. O elemento memorável é o mascote oficial; decoração restante é mínima. Catálogo não recebe hero. Não alegar prazos, qualidade certificada, clientes, estoque ou condições não comprovadas.

## SEO

APP_URL continua a fonte do domínio. Usar defaults de título, descrição e imagem; overrides somente para páginas públicas conhecidas. Produto mantém seoTitle/seoDescription e primeira imagem; coleção herda nome, descrição e imagem. Noindex global público só restringe, nunca libera login/admin/fluxos privados. Sitemap exclui páginas desativadas para indexação; canonical não inclui busca/preço/ordenação. JSON-LD usa fatos existentes. Rotas privadas continuam noindex e protegidas por autenticação.

## Google e privacidade

Separar configuração da coleta, autorização de leitura e relatório. OAuth servidor com PKCE/state, escopos analytics.readonly e webmasters.readonly, segredo somente em ambiente. Tokens em cookie HttpOnly criptografado com chave dedicada, vinculado ao administrador e expiração; conexão individual por navegador, sem schema novo. Não criar projeto, habilitar API ou conceder permissões automaticamente. Relatórios server-side via REST oficial, cache curto por credencial/período/propriedade, timeout, limites e estados separados por fonte. Não somar usuários entre dimensões. GA4 e Search Console mostram período/fuso, fonte, filtros, atualização e limitações. Ausência/erro não vira zero.

Coleta desligada por padrão e protegida também por gate de ambiente, consentimento explícito e DNT. Nenhum teste usa tráfego real. Pageviews manuais únicos na navegação pública, URLs sem campos livres, hash, contato ou tokens. Cliques de catálogo/contato são distintos de lead enviado e compra confirmada; esses últimos só podem nascer da confirmação autoritativa, nunca de CTA. Integração inicial não promete envio de conversões de checkout sem contrato seguro de confirmação e consentimento.

## Verificação e pendências

Testar navegação legada, consultas, segurança dos overrides/redirects, autenticação de APIs, criptografia e isolamento OAuth, privacidade, relatórios com respostas simuladas, SSR metadata/robots/sitemap e UI desconectada. Rodar tipos, lint, testes e build; prévia sintética sem banco operacional. Configuração de domínio, conta/propriedades Google, consentimento e material Instagram continuam decisões do usuário. Não apresentar mock como dados reais.
