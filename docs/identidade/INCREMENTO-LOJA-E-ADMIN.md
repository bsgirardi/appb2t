# SDD Lean — descoberta da loja e administração compacta

Data: 02/10/2026. Incremento autorizado após a migração da vitrine para `/`.

## Resultado esperado

O visitante explora coleções com imagens, encontra produtos e retorna à seleção anterior sem reconstruir os filtros. A equipe utiliza a mesma base Tailwind/shadcn em uma interface compacta, mantendo todas as funções e permissões existentes.

## Escopo e decisões

- Home: cartões de coleções ativas; capa cadastrada ou imagem de produto fornecida pelo serviço existente. Nenhum conteúdo comercial fictício.
- Catálogo: chips removíveis de busca e coleção. Alterar filtros reinicia a página e mantém os outros critérios.
- Produto: contexto limitado a coleção, busca, ordem e página. Retorno para resultados; coleções inativas são descartadas do contexto. Canonical e links comerciais não carregam filtros. Slug antigo preserva o contexto validado no redirecionamento.
- Galeria: miniaturas acessíveis por botão, seleção anunciada e controles anteriores preservados. Rolagem das miniaturas não deve avançar a foto principal por gesto.
- Administração: Button shadcn nos comandos de calculadora, produtos, coleções, clientes, orçamentos, vendas, financeiro e configurações. Menu também usa Button com composição de Link. Tema compacto compartilhado e isolado em `.admin-ui`.
- Densidade desktop: lateral 216 px, campos 36 px, ações a partir de 34 px, cartões 16 px, células 9 px verticais. Celular: alvos de toque de 44 px, menu recolhível, perfil e saída disponíveis.
- Cores administrativas configuradas, temas claro/escuro, controles nativos e estilos de impressão preservados. Não se adiciona Preflight global.

## Etapas e esforço

| Etapa | Esforço | Critério de aceite |
| --- | --- | --- |
| Coleções e filtros visíveis | Baixo | Exibir somente coleções ativas; retirar um filtro sem apagar os demais |
| Contexto entre catálogo e produto | Médio | Preservar os quatro critérios, canonical limpa, slug corrigido com contexto |
| Miniaturas | Baixo | Seleção direta, teclado e gestos funcionais, uma foto sem controles extras |
| Tema administrativo compacto | Baixo | Espaçamento consistente, legibilidade, controles móveis maiores |
| Componentes administrativos e menu | Médio | Sem mudança em submit, handlers, estados disabled, logout e regras por papel |
| Validação e documentação | Baixo | Testes afetados, tipos, lint, build e inspeção desktop/celular |

## Limites e dependências

Não há migração de banco nem mudança de API, autenticação, cálculo, preço ou fluxo financeiro. CSS existente continua compondo tabelas e formulários; a adoção de shadcn é incremental, com Button compartilhado, não uma substituição de todo controle por Radix. A qualidade das capas depende das fotos cadastradas. Paginação depende da quantidade atual de produtos: uma página antes válida pode deixar de existir quando produtos são retirados. O ambiente visual contém dados de validação, não um catálogo comercial completo.

## Arquivos centrais

- `src/domain/products/catalog-navigation.ts`: normalização e URLs de navegação.
- `src/components/products/store-collections.tsx`: descoberta e filtros.
- `src/app/page.tsx` e `src/app/portfolio/produto/[id]/[slug]/page.tsx`: composição das telas.
- `src/components/products/product-carousel.tsx`: galeria.
- `src/components/shell/app-shell.tsx`: menu administrativo e perfil.
- `src/app/admin.css` e `src/app/design.css`: densidade e tokens.
- `src/components/ui/button.tsx`: base shadcn compartilhada.

Evidências de verificação ficam em `docs/VALIDACAO.md`.


## Incremento seguinte — lista de orçamento

Resultado: aplicar a linguagem Tailwind/shadcn à lista de orçamento e tornar a revisão dos produtos mais clara.

- Esforço baixo: cartões com miniatura, nome, opções, quantidade e subtotal; resumo destacado e fixo durante rolagem no desktop; fluxo visual de revisão, preparação e envio; estado vazio com CTA; botões shadcn de remoção, preparação, contato e cópia.
- Esforço médio: estender somente a resposta pública da revisão com a URL da capa atual. Produtos inativos continuam sem nome, preço, caminho ou imagem na resposta. Não armazenar fotos/preços na lista local.
- Aceite: conferir preços antes do contato; invalidar mensagem preparada ao alterar quantidade; conservar lista em falha de rede; bloquear itens retirados/indisponíveis; acesso móvel sem overflow. Sem envio automático, criação de pedido ou reserva.
- Arquivos: inquiry-panel.tsx, product-contact.tsx, domínio e serviço inquiry. Sem alteração de banco ou dependências.
