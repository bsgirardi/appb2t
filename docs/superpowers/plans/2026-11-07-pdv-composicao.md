# Composição do PDV presencial

**Objetivo:** tornar catálogo, itens, cliente opcional, pagamento e confirmação mais legíveis, sem alterar domínio ou transições.

**Base:** main 1.27.3, `0a73e718ef994e7bd7868def8c2ce9d1a094bcda`. Execução já autorizada pelo handoff, nesta worktree isolada. Composição local com React/Next, componentes instalados e receita restrita ao PDV; sem dependências novas.

**Direção:** preservar Roboto e tokens configurados de Aparência nos dois temas. Catálogo à esquerda e compra à direita em desktop; sequência natural no celular. Separar visualmente itens, cliente e pagamento, com resumo junto às ações. Evitar abas/recolhimento que escondam dados durante a conferência e evitar migração de componentes globais, cujo alcance excede o recorte.

- [x] Acrescentar testes de orientação, agrupamento, pending/duplo envio e cliente identificado; executar antes da implementação. Preservar testes existentes de quantidades, recuperação e resposta perdida.
- [x] Ajustar somente PosPanel e receita local: títulos e grupos, mensagens de vazio/indisponibilidade/processamento, resumo e quebra de textos longos. Manter handlers, payloads, cálculo, schema, flight e disabled.
- [x] Inspecionar prévia sintética existente em desktop/celular e claro/escuro; verificar foco, overflow e estados. Registrar separadamente limites da ferramenta e persistência real não exercida.
- [x] Versionar uma vez em PATCH conforme main, documentar recorte e corrigir estado histórico do roadmap. Testar versão/rodapés e consumidores compartilhados, tipos, lint e build quando possível sem banco.
- [x] Revisar diff e evidências. Entregar sem inferir merge, Release ou implantação.

**Foco da revisão:** nomes/SKUs longos; mínimos e faixas de quantidade; cliente opcional e cadastro existente; erro/resultado incerto com recuperação; processamento com repetição bloqueada. Nenhuma venda ou operação financeira real para validar a interface.

Execução: 39 testes/11 arquivos aprovados; tipos, lint e build aprovados. Revisão independente sem bloqueantes. A fixture passou a sincronizar initialOrder com sua API em memória após apontamento da revisão. Ruling: manter esta entrega como diff local, sem commit/PR, conforme escopo do handoff. Limites de teclado/interação do navegador registrados no documento do recorte.

Continuidade: usuário solicitou criar a PR; commit e publicação da branch agora autorizados, mantendo a versão única 1.27.4. Sem autorização de merge, Release ou implantação.
