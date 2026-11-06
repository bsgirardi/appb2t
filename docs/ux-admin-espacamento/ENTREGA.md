# Ajustes visuais administrativos — 06/11/2026

## Base e recorte

Main remota conferida em `16a6466`, versão 1.22.0, após #42 e #43. Trabalho local em `codex/admin-espacamento`, worktree gerenciada isolada; pasta operacional e suas alterações preservadas. Consultados os chats Redesign do painel administrativo e Analisar site Lorace, PENDENCIAS, roadmap, identidade e relatórios locais de UX. Navegação por áreas, prioridades do dashboard, execução progressiva e filtros/proteção de rascunhos já entregues foram preservados.

## Problemas reproduzidos e corrigidos

1. A sidebar inteira rolava; perfil e saída desapareciam com o conteúdo do menu. O contêiner da navegação agora ocupa apenas o espaço disponível e rola de forma independente. Marca e perfil permanecem disponíveis. Há margem para o contorno de foco dentro da área rolável.
2. Links acumulavam margem vertical além do gap do menu. Retirada a margem duplicada, preservando alturas de controle e 44 px no celular. Nenhum destino ou grupo removido.
3. O cartão principal de produto perdeu a composição em grade porque a regra legada dependia de `.card`, ausente no Card atual. Aplicada composição explícita ao cartão, com 16 px entre título, orientação, campos, ação e seção de fotos; botão mantém largura natural.
4. Campos legados com Label e Textarea ficavam encostados, enquanto Field já tinha 6 px. Aplicado o mesmo gap aos contêineres `.field` que não são labels; checkboxes compostos em label mantêm seu layout.

## Evidências visuais

Prévia Vite com componentes reais e dados sintéticos, sem backend, credenciais, sessão artificial ou gravação em banco: `node tests/admin-preview-server.mjs`, porta 4174.

- [Antes desktop](antes-desktop.png) / [depois desktop](depois-desktop.png), 1265 × 712.
- [Antes celular](antes-celular.png) / [depois celular](depois-celular.png), 390 × 844.
- [Antes menu móvel](antes-menu-celular.png), [tema claro após correção](depois-desktop-claro.png).
- [Filtros de vendas no celular](vendas-filtros-celular.png), [editor de material no celular](configuracoes-celular.png).

Inspeção adicional em 1366 × 768: formulário financeiro, configurações/editor, produção e estoque. Conferidos títulos, cartões, botões, campos e filtros; sem motivo concreto para refazer esses layouts neste recorte. Vendas com estado vazio: tabela preserva rolagem interna; não valida linhas comerciais reais. No estoque móvel, medição final confirmou largura de documento igual à viewport (390 px).

Menu: grupos abertos/recolhidos; vários grupos abertos no desktop, perfil dentro da viewport (termina em y=700 numa altura de 712), menu com rolagem própria e sem overflow horizontal da página. Celular: abertura, foco no fechamento, Escape e retorno ao botão Menu. Perfil de operador conferido na prévia: sem Financeiro e Configurações; destinos de catálogo e operação preservados. Temas claro e escuro inspecionados.

Limites: prévia adapta navegação Next e fixa breadcrumb em Produtos; cabeçalho auxiliar da prévia duplica o título em alguns painéis. Esses elementos não são evidência de defeito na rota autenticada. Não houve validação de persistência, sessão operacional, banco ou fluxos reais. Consignação, Coleções e Anúncios não receberam auditoria completa de conteúdo nesta entrega; compartilham a correção da sidebar. Zoom nativo e leitor de tela não foram ensaiados.

## Verificações e entrega

Dependências instaladas somente nesta worktree; Prisma gerado localmente, sem acesso ao banco. A primeira tipagem com dependências compartilhadas antigas falhou por modelos Prisma ausentes; após isolamento, tipagem e lint completos passaram.

- 47 testes em 8 arquivos: shell, produto, catálogo, financeiro, configurações, estoque, produção e clientes.
- 4 testes de versão/histórico em 2 arquivos; APP_VERSION continua único, usado por login, painel e Atualizações.
- Build de produção webpack aprovado, 78 páginas geradas. Aviso preexistente de importação nomeada do package.json em version.ts; não impede o build e não foi ampliado neste recorte.
- `git diff --check` aprovado. Main remota reconferida ao concluir: permanece 16a6466 / 1.22.0.

Versão 1.22.1 preparada uma única vez com manifestos e notas em português sincronizados. Usuário autorizou abrir a PR após esta validação; commit e push restritos a esta branch fazem parte da preparação. Sem merge, tag, Release ou publicação operacional. Revisão visual sintética concluída neste recorte; homologação legítima da equipe continua separada. Recomparar a versão com main antes de futura integração.
