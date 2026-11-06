# Calculadora unificada — implementação local

06/11/2026. Base origin/main `16a6466`, versão 1.22.0. Branch `codex/calculadora-unificada`, worktree gerenciada isolada. A pasta operacional X:/codex/appb2t e suas alterações locais foram preservadas.

## Entregue neste recorte

- Uma calculadora principal, sem escolher entre Original/V2/V3. Cabeçalho, numeração, escolha visual de tecnologia, duas colunas e destaque do preço reutilizam a composição e o CSS da original. Os controles de lote, tempo, múltiplos materiais, trabalho, complementos, taxas e três modalidades continuam sobre usePricingDraft/calculateV2.
- Original disponível em acesso secundário, com seu motor intacto. Abrir/fechar mantém a simulação; o rascunho principal também permanece. Não há conversão automática das bases antigas.
- Comparação de quantidades, canais/descontos e biblioteca existentes preservadas. Aplicar oferta não grava preço comercial. E1.1/E1.2 não foram refeitos.
- Revisão de ficha de produto: referências antigas e atuais, confirmação explícita, rascunho preenchido, custo e preço calculado antes/depois, aplicação ao mesmo editor. Nome e preço final do produto permanecem; usar sugestão e salvar cadastro continuam ações separadas. Legado mantém aviso e confirmação próprios.
- Mesma composição nos editores de item de orçamento/venda e na reutilização de comparação. Quantidade fixada e correspondência com o item preservadas; texto contextual distingue anexação de custo do preço negociado.
- Na calculadora e na revisão de produto, a proteção de saída inclui campos, simulação original e rascunho comparativo. Aplicar ficha com comparação não salva exige decisão explícita. Erros de tempo removem resultado vigente e desabilitam aplicação.
- IDs dos seletores são específicos por instância; controles podem coexistir em editores embutidos. Ajustes preenchidos têm indicação mesmo recolhidos. Preço informado recebe rótulo próprio, sem ser chamado de sugestão.

## Precisão e decisão ainda aberta

Nenhuma fórmula, schema, serviço de persistência, autorização, migração ou documento emitido foi alterado. Os motores continuam com Decimal e precisão intermediária originais. O helper de revisão reutiliza a revisão de referências existente, preservando a modalidade e o preço informado da ficha de produto; reutilização de oferta histórica continua com sua regra própria de preço informado/desconto único.

Consumo permanece **por peça**, com aviso visível de multiplicação pela quantidade; tempo principal continua **total do lote**, com horas/minutos. A preferência por entrada de consumo total foi perguntada, sem resposta específica até a entrega. O usuário pediu “Continue”; foram executadas as partes independentes dessa decisão. Entrada total não foi implementada por inferência: o contrato atual aceita seis casas e divisões como 100/3 não podem ser gravadas exatamente. A proposta conceitual inicial mostrava total; a implementação conserva a base atual até essa escolha. Isso não limita os recursos de custo existentes.

## Verificações

- Novos testes de fluxo: calculadora única, manutenção de rascunho, aviso de saída da simulação original e da comparação isolada. Os dois últimos reproduziram falha antes da correção e passaram depois.
- Revisão de material de 100 para 150 R$/kg com versão alterada: custo por peça 5,62 → 6,17; memória antiga inalterada. Referências indisponíveis exigem substituição. Três modalidades preservadas, inclusive preço informado zero.
- Teste integrado de componentes: produto existente como OPERATOR recebe ficha revisada sem mudar nome nem preço final; somente o serviço de estimativa é chamado, sem cadastrar produto adicional.
- Seis casos de paridade na composição compartilhada: FDM/resina × markup/margem/preço informado, dois materiais, seis casas decimais, tempo fixo e incremental, trabalho, complementos por lote/peça, taxas e quantidade bloqueada. Aplicação envia o mesmo request esperado pelo motor.
- Regressões de comércio, comparações, referências, cenários e catálogo executadas. Testes antigos foram ajustados às interações novas, mantendo as verificações físicas/comerciais (135 min agora conferidos como 2 h + 15 min).
- Primeira suíte unitária geral: 888 aprovados e um teste antigo de catálogo procurando o botão anterior. Corrigido o teste para confirmar referências e usar “Aplicar ficha revisada”; suas verificações de carregamento único e bloqueio durante aplicação permaneceram e passaram.
- Tipagem, lint sem avisos e build webpack finais aprovados; 78 páginas geradas. Aviso preexistente de importação nomeada de package.json em version.ts mantido, sem alteração nessa entrega. **Suíte final: 897 testes aprovados em 217 arquivos**, 283,72 s, sem falhas. Saídas conhecidas do jsdom sobre navegação e do teste de sanitização HTTP não são falhas de teste. Logs locais em test-results/calculadora-unificada/.

## Evidência visual

Prévia Vite isolada, componentes reais e fixtures, sem backend, sessão, banco ou credenciais: `B2T_PREVIEW_PORT=4176 node tests/admin-preview-server.mjs`. A porta configurável evita interferir na prévia do outro chat.

- [Desktop claro, preenchido](desktop-claro.png) e [desktop escuro](desktop-escuro.png), 1366 × 900.
- [Celular claro](celular-claro.png) e [celular escuro](celular-escuro.png), 390 × 844.
- [Tempo inválido](erro-tempo.png): resultado removido, aplicação bloqueada e erro com orientação.
- [Prévia de operador](operador-desktop.png): calculadora disponível e grupos administrativos ocultos na navegação.

Conferidos: layout sem rolagem horizontal no celular (largura do documento 375 px dentro da viewport de 390 px, com barra de rolagem), seleção da tecnologia por setas/foco e Enter, mudança de unidade g → ml, remoção de resultado incompatível e temas. Corrigida durante inspeção a invasão do seletor de tecnologia sobre quantidade; agora ocupa uma linha própria.

Limites: a prévia tem cabeçalho auxiliar e breadcrumb fixo em Produtos; não são defeitos da rota autenticada. Os perfis são fixtures visuais, não sessões fabricadas. Fluxo de revisão/aplicação do produto e preservação comercial foram exercitados por testes de componentes com API simulada; não houve gravação real no navegador. Resina preenchida foi verificada pelos testes de paridade; a fixture visual padrão tem somente cadastros FDM. Não houve auditoria completa com leitor de tela, zoom nativo ou todos os navegadores. Rascunhos não passam a ter persistência após fechar o navegador.

## Revisão e coordenação

Desenho lido por revisor independente, sem lacunas adicionais além da entrada total/peça. Revisão de implementação encontrou uma falha material: comparação editada isoladamente não participava do fingerprint de saída. Corrigida com reprodução em teste; segunda leitura não encontrou novos problemas materiais. A revisão foi somente leitura, sem banco.

Chat de espaçamentos consultado por leitura, sem envio de mensagens: entrega local `codex/admin-espacamento`, versão preparada 1.22.1, ainda separada de main/publicação conforme relato. Não foram alterados shell, admin.css, design.css ou primitivas compartilhadas; o formulário principal de produto também ficou intacto.

## Estado de entrega

Implementação local para revisão; sem commit, push, PR, merge, tag, Release, publicação ou migração operacional. Versão **1.22.0 preservada como base**, pois o pedido reserva o incremento para futura PR. Antes de entregar essa PR, comparar com main vigente e fazer um único MINOR com package.json/lock, APP_VERSION e notas portuguesas sincronizados; não copiar o PATCH reservado do outro chat.

PDV presencial, E2.4, importadores e novas integrações seguem separados. Tributos brasileiros conforme regime/operação são direção futura registrada, sem tabelas fiscais inferidas nesta entrega. Homologação com dados e sessões legítimas continua separada da validação sintética.

## Preparação de PR autorizada — 06/11/2026

Usuário solicitou “faça PR”. Main reconferida em 16a6466 / 1.22.0. Incremento MINOR único para 1.23.0 em package.json e ambas as versões raiz do lock; notas em português adicionadas ao início do histórico, sem alterar entradas anteriores. Revalidação de preparação aprovada: 897 testes em 217 arquivos (296,81 s), quatro testes específicos de versão/rodapés, tipagem, lint, build webpack e diff --check. Criação da PR em andamento; URL registrada após confirmação. Este registro substitui o estado local anterior somente quanto à autorização de commit/push/PR. Merge, Release e implantação permanecem separados e não autorizados.
