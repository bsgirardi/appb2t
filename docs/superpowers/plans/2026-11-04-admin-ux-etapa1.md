# Etapa 1 UX/UI administrativa — plano de execução

**Objetivo:** aplicar a organização aprovada no encaminhamento de 04/11, preservando módulos, rotas, autorização no servidor e identidade configurável.
**Arquitetura:** compor Accordion, Button, Breadcrumb e Sheet existentes. Alterar apenas navegação e fundamentos administrativos compartilhados; não substituir formulários, tabelas ou regras de negócio.
**Base:** main 1.15.0, commit d1d7ac0. Execução local, sem merge/publicação.

## Decisões deste recorte

- Visão geral em /dashboard; Comercial, Catálogo, Operação, Parcerias, Financeiro e Configurações como grupos.
- Calculadora como atalho permanente junto à Visão geral: ferramenta transversal de precificação, acessível a ADMIN e OPERATOR sem abrir um grupo.
- Pontos de venda em Parcerias; consignação continua dentro dos fluxos existentes.
- Financeiro e Configurações continuam exclusivos de ADMIN. Atualizações, Minha conta e loja permanecem acessíveis.
- Caminho contextual no topo; seleção com texto/peso/borda além da cor; Roboto local, contraste por tokens e menu móvel com alvos de 44 px.
- Preferir evolução da estrutura atual a uma substituição do shell ou redesenho módulo a módulo: menor risco e resultado incremental.

## Passos e verificações

- [x] 1. Atualizar testes de navegação: grupos e destinos, permissões, rota aninhada, calculadora direta e fechamento móvel. Executar antes da implementação e observar falha.
- [x] 2. Reorganizar menu e contexto; ajustar fundamentos visuais compartilhados e testar novamente.
- [x] 3. Validar desktop/celular, claro/escuro, teclado, Escape e rolagem do menu; registrar evidências e limites.
- [x] 4. Comparar main, atualizar uma vez para 1.15.1 e notas em português; verificar manifestos, login e atualizações.
- [x] 5. Executar testes pertinentes, tipos, lint e build. Revisar diff e entregar resultado revisável.

## Foco da revisão

Rotas financeiras aninhadas selecionam um único item; OPERATOR não ganha acessos administrativos; todos os destinos anteriores continuam presentes; grupos não escondem o destino ativo; menu longo cabe em telas baixas sem prender acesso à conta.
