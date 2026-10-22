# C3 — Validação e passagem operacional

Data: 22/10/2026. Base: `d9497ad` (C2); candidata na branch `codex/catalogo-c3-design`. Especificação e plano aprovados pelo usuário, com execução nativa nesta conversa. C3 ainda não foi integrada nem publicada na instalação operacional.

## Escopo entregue

Faixas individuais por personalização; cadastro de kits com produtos permitidos; desconto percentual ou fixo por todas as unidades, sem acumular faixas individuais; montador 2D por fotos com teclado e arraste; rascunho recuperável e tentativa imutável; atendimento com composição e tabela recebidas preservadas; preparação, edição revisada, impressão e conversão existentes.

Dentro do kit, o valor fixo é abatido uma vez por instância. Componente sob consulta deixa o total completo pendente. Mudanças posteriores no catálogo não recalculam o histórico recebido nem o orçamento negociado.

## Evidências automatizadas

- Fluxo completo e maior snapshot/editor autenticado: 5 testes aprovados junto ao montador. Exercita consulta resolvida, desconto adicional, edição negociada, emissão e conversão, além de 20 grupos/1.980 unidades e editor com 100 linhas sem truncar personalizações recebidas.
- Tipagem: exit0 em `npm run typecheck`.
- Lint: exit0 em `npm run lint`.
- Imagem Linux com `npm run build`: exit0, revisão `d2679b2`; tag `appb2t-catalog-c3:final`, manifesto `sha256:ada04d17c39f1eae46b485ac4a90369391e4044c4911ad89acda4c4b3a01f9da`.
- Suíte geral anterior à revisão:640/640 testes,196 arquivos, exit0. Revisão independente concluída: dois achados importantes corrigidos com regressões que falharam antes e passaram depois (13/13 verificações relacionadas). Suíte final com as correções: **642/642 testes em197 arquivos, exit0**,357,13s, Node22.23.4/Linux. O teste de migração anterior passou em1,8s. A execução usa os arquivos atuais de código/testes, com hashes dos dois arquivos da última correção conferidos contra o checkout.

## Ensaio da migração

Backup novo da instalação C2: `backups/catalog-c3-20261022/b2t.dump`, 530.176 bytes, SHA256 `6A9B8DD9FADD51AD3EB363A0D1929FAF7610681F50A9741AC199003DBF8AC187` (ignorado pelo Git).

Restaurado em PostgreSQL17 separado (`b2t-c3-candidate-db`, porta local55434, volume próprio). A migração `202610220001_catalog_kits` foi aplicada com sucesso. As projeções das 82 tabelas anteriores, usando as colunas anteriores à migração, conservaram contagens e hashes. O banco operacional e seu volume não foram migrados.

Somente depois da comparação foram adicionados usuário, produtos, kit e contato fictícios à candidata para os testes visuais. As imagens válidas foram copiadas da fotografia existente no backup; nenhuma fixture foi importada na instalação operacional.

## Navegador integrado

Candidata: http://localhost:3104/. Operacional preservada: http://localhost:3000/.

Montador inspecionado em320/390/1440 px, claro e escuro. Nas larguras medidas, a página não apresentou overflow horizontal; controles do montador medidos com pelo menos44px. Teclado alterou posição, sem mudar quantidade/preço. Arraste preservou posições após recarregar. Fotos sobrepostas são permitidas e podem ser reorganizadas com teclado/botões.

Fluxo fictício: duas unidades personalizadas Ana a R$30 e três complementos a R$20, somaR$120, desconto fixoR$15, totalR$105. A faixa individual do complemento não foi acumulada. Recibo `SOL-000001`; preparação `ORC-000001`, emissão e conversão realizadas apenas na candidata. Impressão exibiu identificação do kit por componente e um único desconto global.

Capturas locais ignoradas em `test-results/catalog-c3/`: desktop e celular nos dois temas, recibo e impressão. A versão para impressão foi inspecionada na tela; não foi enviada a uma impressora física.

Movimento reduzido: por escolha explícita do usuário, verificação automatizada de fonte, sem trocar a preferência do Windows. PostCSS confirmou a regra `prefers-reduced-motion: reduce` cobrindo o montador com animação/transição desativadas e rolagem automática; o canvas não possui laço independente de animação. Isso não representa emulação da preferência do sistema no navegador. A imagem corrigida foi iniciada na candidata com health OK. No navegador integrado, uma mudança do preço fictício de R$20 para R$30, com a página aberta, passou por revisão/confirmação e terminou mostrando R$150 − R$15 = R$135 no resumo principal, com continuidade habilitada. Captura: `reviewed-price-authoritative.png`. Nenhum erro de console na conferência final. Na imagem final, uma segunda mudança fictícia de R$30 para R$40 produziu R$180 − R$15 = R$165; mover a peça após confirmar manteve R$165. O orçamento anterior continuou impresso com R$105, sem acompanhar o catálogo. Evidências: `final-reviewed-composition.png` e `frozen-quote-after-catalog-change.png`.

## Operação

Validação da candidata concluída, com os dois menores adiados e a substituição da conferência de movimento reduzido pela análise automatizada autorizada. Antes de publicar C3, obter a decisão sobre o resultado revisável. Na publicação, fazer outro backup recente e ensaio, aplicar a migração aditiva e trocar a aplicação com health e teste HTTP. Preservar o banco e os dados em rollback da aplicação; não apagar tabelas, imagens nem volumes. O ensaio acima não substitui o backup imediatamente anterior à publicação.

## Revisão independente

Revisão única do ramo completo `d9497ad..ff52a5d`, por agente com contexto novo, sem alterações no checkout ou banco. Nenhum achado crítico ou comportamento excluído de julgamento.

Corrigidos: rascunho inválido agora apresenta recuperação antes de inicializar o controlador e conserva o texto original; resumo principal usa a revisão correspondente do servidor inclusive quando pronta, distinguindo estimativa local de valores revisados. A identidade de preço ignora posições, então mover após uma atualização de preço conserva o valor revisado; a confirmação de envio continua vinculada à composição completa.

Menores adiados: (1) conflito de edição no cadastro de kits exige recarregar a página; cancelar/reabrir pode conservar a versão antiga. Não há sobrescrita silenciosa. (2) desconto percentual perto do limite de R$10 quadrilhões pode divergir um centavo por precisão intermediária de Decimal. Não são bloqueios materiais para o uso habitual, mas permanecem limitações conhecidas.

## Decisões de execução e custo

1. A evidência antiga de577 testes não foi tratada como validação atual; suíte nova em banco descartável. Custo: tempo adicional e risco de confundir falha ambiental, controlado por logs/resultados atuais.
2. Uma sobreposição inicial de suítes no banco descartável foi interrompida e descartada; execuções mutáveis passaram a ser sequenciais. Fsync foi desligado somente nesse banco de testes. Custo: repetir verificações; nenhuma mudança no banco operacional.
3. O teste do editor de faixas ficou na tarefa de interface; persistência recebeu teste real de integração. Custo: nenhum contrato sem cobertura, apenas organização diferente.
4. A revisão de linhas e o coordenador de solicitações foram separados para evitar importação circular; parser de snapshot compartilhado. Roundtrip completo de orçamento ficou nas tarefas8/9/10, onde o contrato existe. Custo: módulos adicionais; compatibilidade coberta por regressões.
5. O cálculo do configurador permanece em ProductContact, com contexto explícito de kit, reutilizando os campos existentes. Custo: chamadores de edição de kit precisam informar o contexto; a navegação do montador faz isso.
6. Formato local v3 é autoritativo; v1/v2 continuam como entradas de migração com texto original preservado. Custo: abas antigas precisam atualizar; há aviso de versão/conflito.
7. Kits foram expostos na loja existente; o montador não é indexado nem entra no sitemap. Custo: ainda não há página editorial de kit indexável. Zoom/rolagem são visão local; somente soltar arraste grava posição. Custo: zoom não se recupera como dado comercial.
8. O cálculo de preparação é função pura de domínio, com tradução de erros na fronteira do servidor. Custo: um módulo de encaminhamento adicional. Preparação conserva1–99 unidades por componente e1.980 no conjunto; negociação posterior mantém os limites existentes. Custo: quantidades superiores exigem revisão do documento após preparar.
9. O histórico de kits congela também as linhas recebidas, em uma cópia central, para sobreviver à exclusão comercial. Custo: armazenamento adicional limitado por16MiB. Duplicação retira origem somente de componentes de kit, preservando o comportamento anterior de C2; conversão carrega totais congelados sem recalcular.
10. O usuário escolheu verificação automatizada de movimento reduzido: regra CSS analisada e ausência de laço de animação verificadas. Custo: não se comprovou a troca real da preferência do Windows no navegador integrado.

A revisão independente não excluiu comportamentos do julgamento. Os dois achados importantes entraram em uma única rodada de correção. Os dois menores estão explicitamente adiados acima.

11. A repetição no Windows passou 641/642 testes, com único timeout de 20 s em um teste anterior de migração, durante compilação simultânea. A suíte final usa imagem Linux de QA com Node 22 e o banco descartável já existente, sem outra suíte concorrente; limite de 60 s informado apenas ao comando de testes. Custo: tolera testes mais lentos; não altera a aplicação nem a configuração versionada, e transações continuam limitadas.

A validação manual também alternou um componente fictício para sob consulta: o resumo mostrou somente R$60 conhecidos, total pendente e nenhum desconto parcial. Foi restaurado para referência antes da entrega. Recuperação de rascunho inválido, conflito entre abas e retry idempotente contam com testes automatizados; não foram induzidos manualmente no armazenamento do navegador.

A revisão independente não excluiu comportamentos do julgamento. Os dois achados importantes entraram em uma única rodada de correção. Os dois menores estão explicitamente adiados acima.
