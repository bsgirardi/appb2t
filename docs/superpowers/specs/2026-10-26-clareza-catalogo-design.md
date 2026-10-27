# Clareza comercial do catálogo

Desenho aprovado na conversa em 26/10/2026.

## Objetivo

Ajudar visitantes a entender preço, quantidade e prazo antes de configurar uma peça ou enviar um orçamento, aproveitando os dados existentes.

## Abordagens

1. Melhorar a apresentação atual: cards, resumo comercial, faixas de quantidade e descrições de coleções. Recomendada e aprovada por ser uma entrega concentrada, com as regras comerciais existentes.
2. Ampliar regras comerciais: quantidade mínima por arte, volumes acima de 99 e novos filtros. Fica para uma entrega posterior.

## Comportamento aprovado

- Cards apresentam preço de referência por unidade, esclarecem que adicionais dependem das escolhas e exibem prazo cadastrado.
- Produto reúne disponibilidade, prazo de produção, condição cadastrada de início e separação entre produção e transporte perto da personalização.
- Todas as faixas cadastradas permanecem visíveis em tabela, com preço-base por unidade e indicação da faixa aplicada; valor unitário configurado e subtotal continuam atualizados.
- Coleções exibem sua descrição existente.
- Preços, descontos e prazos vêm do cadastro. Não inventar condições comerciais, benefícios ou início de prazo.

## Limites e decisões de implementação

- Preservar cálculo, quantidade máxima, fluxo de orçamento, composição e desconto dos conjuntos.
- Nos conjuntos, não apresentar faixas individuais como aplicáveis aos componentes.
- Produtos sob consulta não apresentam preço numérico nem tabela como oferta calculável.
- Omitir prazo e descrição ausentes; usar singular para um dia útil.
- Não alterar cadastros em produção ou adicionar dependências.
- Manter identidade visual e componentes existentes. Adaptar tabela e textos para telas estreitas e navegação assistiva.

## Verificação e entrega

Verificar preços com e sem adicionais, faixas antes e depois da seleção, consulta, conjuntos e dados opcionais ausentes. Conferir celular e computador. Atualizar PATCH de 1.2.1 para 1.2.2, sujeito à conferência da main antes da entrega, sincronizando manifestos e histórico; conferir APP_VERSION no login e painel. Publicação e merge devem ser informados separadamente da implementação.
