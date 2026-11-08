# Login e catálogo público — plano incremental

Data: 08/11/2026. Base: main 1.27.3, 0a73e71. Escopo autorizado no handoff, com execução direta sem nova aprovação genérica.

## Direção

Reutilizar componentes e paletas locais. Azul #0066CC, laranja #FF7A00, verde #4CAF33 e apoios #0D2B52, #E9EDF2, #F8FAFC são referências documentadas da marca, não substitutos de Aparência. Roboto no login, Poppins na loja. Composição alinhada à esquerda; produto e busca como informação principal. Não adotar preset nem redesenhar marca.

Login: marca / visão da operação | acesso / campos / feedback / ajuda / versão. Loja: marca e busca / coleções / resultados com critérios / produtos. No celular, manter ações antes da ilustração, reduzir altura do mascote e tratar seu fundo claro como prancha intencional, sem editar pixels.

Alternativas avaliadas: refazer shell e componentes globais ampliaria regressões; limitar a textos não resolveria descoberta e composição móvel. Escolha de implementação: receitas locais e composição dos controles instalados.

## Execução e verificações

- [x] Login: atualizar linguagem à operação atual, agrupar campos locais, identificar pending e impedir reenvio enquanto aguarda; preservar endpoints, payload, redirects e mensagens seguras. Testar sucesso, erro, pending e troca de senha.
- [x] Catálogo: busca visível junto aos resultados, único GET preservando critérios recolhidos e em edição. Testar FormData com painel fechado/reaberto e erros. Sem mudar domínio, SEO ou paginação.
- [x] Cards/vazio/home: reaproveitar Empty, descrição factual do vazio, manter fotos inteiras e disponibilidade/preço reais, compor mascote sem sobreposição. Preservar lista e checkout.
- [x] Prévia isolada: componentes reais com fixtures, 320/390/768/1440, claro/escuro, automático e teclado conforme suporte. Registrar limites sem simular homologação operacional.
- [x] Reconciliar versão com main; atualizar manifestos, notas, roadmap e relatório. Tipos, lint, testes e build; revisão final. Sem merge, Release ou implantação.

## Atenção na revisão

Nomes longos, preços sob consulta/zero, filtros inválidos/valor zero, falha e pendência de autenticação, tema automático/paletas próprias. Nenhuma credencial ou sessão real na prévia.
