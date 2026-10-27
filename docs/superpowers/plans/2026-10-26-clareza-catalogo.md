# Clareza comercial do catálogo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Tornar preço, quantidade, prazo e finalidade das coleções compreensíveis usando os dados existentes.

**Architecture:** Alterações de apresentação nos componentes de produtos. Preservar configuração, cálculo e APIs; compartilhar a apresentação do prazo apenas se isso evitar divergências entre card e detalhe.

**Tech Stack:** Next.js 16.4.2, React 19, TypeScript, Tailwind, componentes existentes, Vitest e Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-26-clareza-catalogo-design.md`

## Global Constraints

- Preços, descontos e prazos vêm do cadastro. Não inventar condições comerciais, benefícios ou início de prazo.
- Preservar cálculo, quantidade máxima, fluxo de orçamento, composição e desconto dos conjuntos.
- Não alterar cadastros em produção ou adicionar dependências.
- Consultar os guias locais em `node_modules/next/dist/docs/` antes de escrever código.
- Usar os componentes e a identidade existentes; conferir `shadcn`, práticas React e orientações de design aplicáveis.
- Atualizar PATCH uma vez na entrega e sincronizar versão e histórico conforme AGENTS.md.

## Review Focus

- Produto sob consulta não deve ganhar oferta numérica ao ter faixas cadastradas.
- Quantidade abaixo da primeira faixa não deve destacar um desconto inexistente.
- Adicionais devem continuar somados ao preço-base da faixa.
- Componentes de conjuntos não devem anunciar faixas individuais como aplicáveis.
- Dados opcionais ausentes e textos longos não devem criar prazo fictício ou transbordamento.

### Task 1: Cards, resumo comercial e coleções

**Files:** `src/components/products/product-catalog.tsx`, `product-experience.tsx`, `store-collections.tsx` e estilos locais se necessário.

**Interfaces:** Consumir `PublicProductDTO` e `PublicCollectionDTO`, sem mudança de contrato. Preservar links e contexto de navegação.

- [x] Ler guias locais de Next e skills aplicáveis à execução.
- [x] Nos cards, esclarecer referência por unidade e adicionais; exibir prazo disponível com singular/plural e transporte separado.
- [x] No detalhe, organizar notas existentes em resumo comercial junto da personalização, preservando `leadTimeCondition` literalmente.
- [x] Nas coleções, exibir descrição não vazia com quebra de texto adequada.
- [x] Verificar com testes existentes e inspeção visual; não criar testes que apenas reproduzam textos estáticos.

### Task 2: Faixas sempre visíveis

**Files:** `src/components/products/product-price-summary.tsx`; testes pertinentes em `tests/unit/product-configuration-ui.test.tsx` ou arquivo focal equivalente.

**Interfaces:** Preservar props `price`, `quantity`, `quantityTiers`, `inKit` e o cálculo `configuredPrice` existente.

- [x] Acrescentar teste comportamental: depois de aplicar uma faixa, todas as faixas continuam visíveis, com apenas a efetiva identificada; subtotal configurado continua correto com adicionais.
- [x] Confirmar falha pela ausência da tabela persistente, antes da implementação.
- [x] Apresentar tabela ordenada por quantidade mínima com cabeçalhos acessíveis e preço-base unitário; distinguir preço-base de preço configurado e manter avisos de adicionais e frete.
- [x] Conferir abaixo da primeira faixa, ausência de faixas, consulta e conjunto; faixas individuais não são oferecidas em conjuntos.
- [x] Rodar testes focais e verificar sucesso.

### Task 3: Validação e versão

**Files:** `package.json`, `package-lock.json`, `src/lib/releases.ts`; conferir `src/lib/version.ts` e seus consumidores.

**Interfaces:** Versão permanece derivada de package.json por APP_VERSION; histórico mantém entradas anteriores intactas.

- [x] Conferir versão de main e aplicar PATCH único (1.2.2 se a base seguir em 1.2.1), incluindo raiz e packages[""].version do lockfile.
- [x] Registrar melhorias em português no início de releases, com data da entrega.
- [x] Executar typecheck, lint e testes apropriados; relatar dependências de ambiente e falhas existentes sem omitir resultados.
- [x] Inspecionar celular e computador com dados de teste: prazo ausente, textos longos, consulta, personalização e faixas. Usar ambiente isolado sem modificar dados de produção.
- [x] Conferir login, painel e atualizações usando a mesma versão; revisar diff e concluir com estado real de commit, PR, merge e publicação.

## Método recomendado

Execução direta nesta conversa: as mudanças são pequenas e compartilham os mesmos componentes. Revisão final independente pode ser feita após a implementação. A skill de planejamento solicita confirmação do plano e do método antes de iniciar o código.


## Resultado da execução — 27/10/2026

Implementação concluída na branch codex/clareza-catalogo. Build padrão e lint aprovados; 25 testes focados aprovados. A suíte geral não está aprovada: o executor apresentou recursão RPC e os testes de integração dependem do banco local indisponível. Detalhes em docs/superpowers/2026-10-26-clareza-catalogo-validacao.md. Sem merge ou publicação.
