# Configurações por assunto e calculadora única

Desenho aprovado pelo usuário em 09/11/2026.

## Objetivo
Manter apenas a calculadora atual na página de simulação e organizar Configurações em Produção, Precificação, Canais e complementos, Tributação, Alertas comerciais e Equipe. Os blocos devem aparecer apenas em sua aba.

## Abordagens
Abas na mesma página foram aprovadas por manter o contexto e permitir navegação por teclado. Páginas independentes exigiriam mais navegação; manter blocos abaixo das abas preservaria a repetição relatada.

## Comportamento
- Produção reúne materiais, impressoras e energia, manutenção, falhas e mão de obra usados pela calculadora atual.
- Precificação reúne markup e margem alvo. Um único estado de parâmetros e versão evita conflitos entre essas abas.
- Canais e complementos reúne os cadastros e suas taxas/custos.
- Tributação mantém regimes, competências, conferências e histórico fiscal existentes.
- Alertas comerciais mantém prazo de retorno e seu salvamento.
- Equipe mantém usuários, perfis e redefinição de senha.
- Trocar abas preserva rascunhos. Não há cópia ou conversão automática de custos antigos: manutenção percentual, acabamento e fixação antigos não são equivalentes aos custos atuais por hora.
- Retirar o formulário original da página da calculadora; preservar dados, APIs e consultas das memórias históricas em produtos/documentos.
- Manter criação de canal na calculadora para administradores, incluindo a correção iniciada neste chat.

## Restrições
Reutilizar componentes shadcn locais e preservar temas, permissões, endpoints e validações. Sem migração de banco. Atualizar PATCH, notas em português e manifestos. Não publicar nem integrar sem autorização de entrega.
