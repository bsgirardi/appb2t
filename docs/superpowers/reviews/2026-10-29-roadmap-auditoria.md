# Auditoria do roadmap E1–E6 — 29/10/2026

Conferência consolidada após a [publicação local 1.12.0](../2026-10-29-publicacao-1.12.0.md). Base: main `6e901a7`, estado real das PRs no GitHub, código dessa revisão, desenhos/relatórios e leitura dos chats E1–E5. Nenhuma mensagem enviada aos outros chats e nenhum trabalho deles reiniciado.

## Resultado por etapa

| Etapa | Já implementado e publicado localmente | O que ainda falta |
| --- | --- | --- |
| E1 | Comparação de lotes, custos, contribuição, margem, tempo, materiais e contribuição por hora; aviso de cobertura dos custos. PR #19, versão 1.7.0. | Comparação simultânea de canais/taxas; descontos e margem; preços de cobertura versus meta; salvar/comparar cenários identificados. Avaliar G-code/3MF e projeção por capacidade/demanda em incrementos próprios. |
| E2 | Memória → venda negociada → realizado; efeitos de preço, desconto, frete e taxas; custo produtivo agregado; custos incompletos/provisórios identificados. PR #21, 1.8.0. | E2.2: material, trabalho e falhas com rastreabilidade; E2.3: rankings de rentabilidade por produto/cliente/canal; E2.4: recorrência e sugestão humana de revisão da ficha. |
| E3 | Calendário por impressora, simulação e confirmação da reordenação com impactos/controle de concorrência. PR #22, 1.9.0. | Bloqueios/prioridades com ações; transferência entre máquinas compatíveis; contribuição/hora de lotes reais; simplificação dos apontamentos; reimpressão ligada à falha; previsão comercial incluindo pós-produção/entrega. |
| E4 | Funil, responsável, próximos contatos, histórico/perda, orçamentos vinculados com versão atual e principal, fechamento idempotente. PR #23, 1.10.0. | Margem durante negociação; consulta ao prazo produtivo; alertas específicos de proposta sem retorno/próxima do vencimento. Contato atrasado já tem filtro, portanto não é pendência integral. |
| E5 | Parceiros/condições, um local por parceiro, custódia, remessa/recebimento, venda/devolução/perda, ambos os modelos de comissão, acertos/títulos, reposição/resultado e vínculo a estoque/financeiro. PR #26, 1.11.0; migração publicada nesta atualização. | Decidir o escopo do balcão/feira. Portal do parceiro, múltiplos locais, fiscal, pagamentos online e mensagens externas ficaram fora do recorte e exigem decisão própria. Não há motivo para refazer o ciclo de consignação. |
| E6 | Biblioteca privada, sugestões determinísticas para Instagram/WhatsApp, edição/revisão, fotos ordenadas, cópia e ZIP manual. PR #31, 1.12.0. | Definir provedor/custos/créditos/arquivos para IA, se desejada; definir cada integração externa, autenticação e sincronização. Postagem automática não foi implementada. |

## Correções no acompanhamento

- E2 estava toda desmarcada: reconciliação comercial e tratamento de cobertura já estão no código. O custo produtivo continua agregado; a abertura por material/falha/trabalho permanece pendente.
- E4 marcava vínculo de orçamentos como pendente, apesar de `detail.tsx` mostrar número, versão atual, principal e ações de vinculação. Isso não equivale a um comparador imutável entre revisões históricas.
- E5 estava em validação sem PR/publicação: #26 já estava integrada, e sua migração agora está aplicada localmente. Seis itens do ciclo foram marcados com a evidência correspondente.
- E3 ainda mencionava concorrência não validada; a suíte exclusiva de 29 testes passou na entrega e no CI atual. Causas/bloqueios já existem, mas atalhos de resolução e a previsão final do pedido continuam como incrementos.
- E1 já explica cobertura de custos versus contribuição, mas não entrega a comparação dedicada de preços de cobertura e meta. O item amplo foi mantido pendente com essa distinção.
- Os avisos históricos de recursão do Vitest e de falta de banco nos primeiros chats não são impedimentos atuais: PR #25 corrigiu a recursão, e o CI atual concluiu todas as suítes. Registros históricos permanecem intactos.
- E6 não deve aparecer como concluída só porque o material manual está entregue. A tabela usa situação permitida “Em implementação” para as etapas amplas e descreve os incrementos entregues.

## Fontes verificadas

Chats lidos: “E1 — Calculadora e decisões de preço” (`01a17e6e-014c-71d2-824f-9145a1f5f64b`), “E2 — Rentabilidade e explicação de desvios” (`01a17e85-6d34-79b1-a643-ef1f866c960f`), “E3 — Fila visual e previsão de entrega” (`01a17f78-937a-7e43-8d34-425e33d43000`), “E4 — Negociações e próximos contatos” (`01a17ff3-1860-7463-96bb-bd58d82d4f2e`) e “E5 — Pontos de venda e consignação” (`01a18375-f0b2-7ea2-9125-e18eb71d8a11`). Seus últimos relatos precedem integrações posteriores; por isso o estado das PRs e o código prevalecem para identificar entrega atual.

PRs confirmadas integradas: [#19](https://github.com/bsgirardi/appb2t/pull/19), [#21](https://github.com/bsgirardi/appb2t/pull/21), [#22](https://github.com/bsgirardi/appb2t/pull/22), [#23](https://github.com/bsgirardi/appb2t/pull/23), [#25](https://github.com/bsgirardi/appb2t/pull/25), [#26](https://github.com/bsgirardi/appb2t/pull/26), [#30](https://github.com/bsgirardi/appb2t/pull/30) e [#31](https://github.com/bsgirardi/appb2t/pull/31).

Código principal: `src/components/pricing/pricing-scenarios.tsx`, `src/domain/profitability/reconciliation.ts`, `src/components/profitability/reconciliation.tsx`, `src/components/planning/`, `src/domain/planning/`, `src/components/opportunities/detail.tsx`, `src/server/opportunities/read.ts`, `src/server/consignment/queries.ts`, `src/components/consignment/partner-detail.tsx` e `src/components/advertising/`. Desenhos e relatórios de cada E1–E6 também foram consultados. A auditoria não criou teste para mera edição documental nem presume que o aceite humano dos fluxos reais tenha acontecido.

## Próxima tarefa recomendada

Retomar **E1.2: canais, descontos e efeito na margem**, com critérios de cobertura e meta comercial. É a primeira pendência da ordem E1–E6 já aprovada e poderá servir de base para a margem das negociações. Conferir o desenho específico antes de implementar; importação, projeção mensal, balcão/feira e integrações externas continuam decisões separadas.

Pendências operacionais transversais: homologação pela equipe com dados representativos; configuração comercial real; domínio/proxy/HTTPS para acesso externo; cópia automática e retenção de backups fora da máquina com restauração periódica; definição de ingresso confiável se crescer o volume público.

Roadmap e PENDENCIAS atualizados localmente. Esta auditoria posterior à PR #31 não foi enviada em uma nova PR nem publicada como nova versão. Originais locais preservados em backup e stash para não apagar contribuições anteriores.
