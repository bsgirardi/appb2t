# Revisão transversal — plano de execução

08/11/2026. Escopo autorizado pelo handoff; execução nesta worktree isolada, sem integrar recortes paralelos.

- [x] Conferir main, PRs, Releases e origens sem alterá-las.
- [x] Inventariar componentes, consumidores e responsabilidades de CVA/CSS.
- [x] Construir prévia sintética dos componentes reais; reproduzir ChartStyle e investigar entrada do navegador com controle simples independente.
- [x] Corrigir apenas falhas reproduzidas, com teste de regressão antes da mudança.
- [x] Conferir 320/390/768/1440, temas, paleta personalizada, foco, portais, textos longos e estados; registrar lacunas por célula.
- [x] Executar testes pertinentes, tipos, lint e build; reconciliar uma versão candidata com main e documentar cobertura/aceite.

Execução concluída no escopo delimitado; pendências de homologação e base integrada permanecem abertas na matriz de REVISAO-TRANSVERSAL.md.

Direção visual: preservar tokens de Aparência e marca B2T (#0066CC, #FF7A00, #4CAF33, #0D2B52, #E9EDF2, #F8FAFC), Roboto na gestão e Poppins na loja. Nenhuma nova direção estética. Composição da prévia em coluna, alinhada à esquerda, controles e respectivos estados juntos. Não aplicar preset, Preflight ou trocar primitivas. Sem banco, autenticação artificial ou operações reais.

Comparação de alternativas: migrar todo CSS sem equivalência amplia regressões; manter documentação sem reproduzir a divergência não valida o contrato. A abordagem escolhida é fixture pequena com componentes reais e correções de alcance demonstrável, mantendo o restante como pendência explícita.
