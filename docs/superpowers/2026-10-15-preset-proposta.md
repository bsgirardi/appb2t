# Preset b37ZhrOVs — proposta incremental

Estado: proposta para revisão, não aplicada. Pedido preservado: apresentar plano e diff concreto antes de alterar o preset; administrativo primeiro, catálogo depois.

Atualização de continuidade: após aprovação da direção visual, Button/Input/NativeSelect/Card/Badge e catálogo receberam adaptação local. Consulte `2026-10-15-nova-catalogo.md` para o estado vigente, evidências e limites. A configuração do preset completo continua sem aplicação; as etapas abaixo registram a proposta original.

Atualização posterior em 15/10: o usuário pediu continuidade após a apresentação. A primeira etapa Roboto foi implementada e validada, incluindo correção de herança nas abas. Consulte `2026-10-15-admin-roboto.md`. O patch abaixo fica como registro da proposta original; as demais etapas continuam propostas e não foram aplicadas. Não houve publicação.

## Diagnóstico confirmado

CLI oficial consultada em 15/10/2026: `shadcn preset decode b37ZhrOVs` retorna Nova, baseColor neutral, tema/chart indigo, Lucide, Roboto, título herdado, radius default, menuAccent subtle e menuColor default. Referência: https://ui.shadcn.com/create?preset=b37ZhrOVs.

Projeto atual: components.json new-york/slate, componentes Radix individuais, utilitário cn local, fonte Poppins e CSS sem preflight. As cores personalizáveis por área têm precedência sobre a proposta estética. Nenhuma dependência, token ou componente foi substituído nesta investigação.

Comparação do Button Nova obtida pela CLI `view https://ui.shadcn.com/r/styles/radix-nova/button.json`: o original usa altura padrão h-8 e whitespace-nowrap, enquanto o local preserva altura móvel mínima de 44px, quebra de texto e max-w-full. O original também usa imports cn e radix-ui agregados, diferentes do projeto. Substituição automática retiraria proteções de responsividade já validadas. O dry-run do Button do projeto igualmente indicou sobrescrita e dependências novas. Evidências brutas em test-results/admin-acceptance/nova-button.diff e nova-button.json.

## Primeira etapa proposta: Roboto administrativo

Diff concreto em `2026-10-15-preset-font-proposta.patch`, conferido com `git apply --check`, sem aplicá-lo. Quatro arquivos:

- package.json: acrescentar @fontsource/roboto 5.3.0 (versão consultada no registro npm), mantendo Poppins.
- design.css: importar pesos 400/600/700 e declarar --font-admin.
- app-shell.tsx: aplicar font-admin no painel e no menu móvel.
- login/page.tsx: aplicar font-admin no login.

O lockfile será gerado pela instalação normal após aprovação e revisado junto da implementação; não está representado no patch. O diff é de proposta, não uma entrega instalada/testada. Site continua Poppins. Dados e oito cores existentes permanecem intactos. Sem preflight ou troca de biblioteca.

## Etapas seguintes

1. Após aceite da primeira etapa, validar fontes efetivas, edição de cores, login, menu móvel e U4/U5 em 390/1440px nos dois temas; conferir catálogo para detectar herança indevida.
2. Adaptar Nova por componente: Button, Input/NativeSelect, Card, Badge e diálogos, nessa ordem. Apresentar cada diff antes de aplicar. Preservar alturas móveis, quebra de texto, rolagem de tabela por teclado, foco, formulários nativos, asChild e nomes de variantes usados pelas telas. Revisar também o espaçamento das confirmações de lote observado no aceite.
3. Adaptar superfícies neutras, bordas e menus do administrativo, mantendo os tokens semânticos ligados às paletas editáveis. Não substituir cores salvas por indigo. Só atualizar a configuração de estilo depois de conferir compatibilidade dos componentes instalados.
4. Executar testes dos componentes afetados, tipos, lint, build e matriz de navegador. Publicação será uma decisão separada, com backup e conferência da candidata.

Não se promete equivalência integral ao preset enquanto houver adaptações pendentes. Aprovar a primeira etapa não autoriza substituir o catálogo nem sobrescrever todos os componentes.
