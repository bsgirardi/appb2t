# Administrativo compacto e Calculadora V3

## Solicitação
Recolher filtros administrativos, investigar campos repetidos após seleção, permitir ocultar o banner inicial em Aparência e criar V3 com cálculos da V2 e facilidade da Original. Usar sempre a skill shadcn do projeto para partes visuais, registrado em AGENTS.md.

## Filtros e banner
Reutilizar Accordion shadcn em um FilterPanel compartilhado. Iniciar recolhido, sinalizar quantidade de critérios ativos, manter controles montados para preservar rascunhos e revelar erros. Aplicar às listagens comerciais, solicitações, clientes, financeiro, estoque, produção, rentabilidade e período do dashboard. Preservar formulários e rotas de consulta.
Adicionar showHero ao JSON existente da aparência com padrão true, retrocompatível. Checkbox Exibir banner inicial no editor. Quando falso, ocultar tanto o banner principal quanto a mensagem de boas-vindas padrão e promover o título do catálogo a h1.

## Duplicação
Aguardando página/campo/item para reprodução. A seleção de dashboard em prévia local não duplicou controles. Não alterar comportamento sem causa confirmada.

## V3 — aprovada em 2026-10-28
Terceira opção na calculadora, mantendo Original e lote V2. Reutilizar resolveCatalogPricing, calculateV2 e createEstimate sem fórmulas paralelas. Duas colunas responsivas como Original: dados essenciais à esquerda e preço/custos à direita. Ajustes avançados recolhidos, múltiplos materiais e complementos disponíveis, taxas e parâmetros administrativos somente leitura. Validação deve retirar resultados antigos quando houver entrada inválida. Atualização de referências exige revisão antes de substituir os valores usados.

## Abordagens
Recomendação: terceira opção para preservar fluxos atuais; alternativa: substituir a interface da V2. Terceira opção aprovada pelo usuário em 2026-10-28. Implementação autorizada.

## Validação
Cobrir abrir/fechar mantendo valores, erros revelados, parâmetros GET preservados, salvamento da preferência de banner e retrocompatibilidade. Conferir tipos, lint e testes relevantes. Testar interface em prévia sem banco de produção.

## Complemento aprovado: cadastro de produtos
Corrigir o bloqueio de tempo no cadastro: horas começam em zero, campos de produção obrigatórios ficam identificados, erros preservam o caminho completo e indicam o que corrigir. Manter consumo e tempo total positivos para calcular custos, sem valores inventados.
