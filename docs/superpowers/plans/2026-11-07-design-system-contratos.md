# Consolidação de contratos visuais — plano da etapa 1

**Objetivo:** documentar a implementação vigente sem redesenhar telas ou alterar preferências.

**Arquitetura:** manter componentes, cascata e adaptadores locais; separar a fonte oficial de marca, o contrato de interface e as pendências. Base isolada: main 1.27.0, a5805f40578a50b7007b4b10b55bf58c85e393d5. Execução local, sem delegação, merge ou implantação.

**Tecnologias:** Next 16, Tailwind v4, shadcn local/Radix e Combobox Base UI. Não atualizar dependências.

- [x] Conferir main e auditoria revisada; preservar checkout original e sincronizar apenas SKILL.md/rules/chat.md da fonte local auditada.
- [x] Inspecionar fontes de tokens, ordem de camadas, preferências, portais e APIs locais; consultar MCP oficial shadcn.
- [x] Escrever DESIGN.md para papéis/cascata, COMPONENTS.md para APIs/exceções e UI_ROADMAP.md para diagnóstico, limites e piloto futuro. Adicionar referências em AGENTS.md.
- [x] Manter CSS e componentes intactos quando não houver prova de equivalência para remoção. Não aplicar presets ou nova direção estética.
- [x] Incrementar PATCH único para 1.27.1, sincronizar manifestos e adicionar nota portuguesa sem alterar entradas anteriores.
- [x] Executar testes existentes de contratos, campos, paletas, tema, shell e versão; conferir diff, links e origem da skill.

Aceite: documentos correspondem ao código, preferências e contratos nativos preservados, versão coerente e resultados efetivos registrados em UI_ROADMAP.md. Build/inspeção visual nova não são homologação alegada nesta entrega documental.
