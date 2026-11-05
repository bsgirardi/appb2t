# Etapa 1 — navegação e fundamentos administrativos

04/11/2026 · versão 1.15.1 · base origin/main 1.15.0 (d1d7ac0).

## Resultado

Menu organizado por áreas, com todos os destinos anteriores preservados. Calculadora como atalho direto para ambos os perfis; Financeiro e Configurações exclusivos de ADMIN. O topo mostra área e destino. Roboto local nos grupos, estado ativo com borda/peso, descrições de cabeçalho mais legíveis, lateral de 232 px e menu móvel de até 360 px com rolagem e controles de 44 px.

## Verificação

- 23 testes em seis arquivos: navegação, estrutura administrativa, versão, contratos UI, anúncios e dashboard. Cobrem destinos compartilhados, ADMIN/OPERATOR, rota aninhada, grupo ativo, fechamento móvel, Escape/retorno de foco e paleta no portal.
- Tipos, lint e build de produção passaram.
- Revisão independente do diff: nenhum achado acionável.
- Navegador: estrutura real e CSS real em prévia isolada com conteúdo demonstrativo; desktop 1280 × 720 e viewport móvel em iframe 390 × 700. Temas claro/escuro, grupo ativo, rolagem até Minha conta/Abrir loja e Escape retornando ao botão Menu conferidos.
- Versão dos manifestos, login, rodapé e histórico verificada pelos testes de versão. Nenhum guard, API, migração ou regra de negócio alterado.

## Evidências e limites

[Desktop claro](desktop-claro.png) · [Menu móvel escuro](mobile-menu-escuro.png).

A prévia substitui somente os adaptadores de navegação/imagem do Next por equivalentes locais; não contém dados reais nem autenticação. Não valida fluxos completos com banco de dados. A mudança se limita à estrutura compartilhada; formulários e estados específicos dos módulos permanecem para recortes posteriores. Preserva a identidade e a paleta configuradas em Aparência.

Resultado local na branch codex/admin-ux-etapa1, sem merge ou publicação.
