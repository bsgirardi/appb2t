# Landing, catálogo e SEO/Analytics — plano de implementação

> Execução nesta sessão com superpowers:executing-plans, conforme pedido para implementar por etapas revisáveis.

**Goal:** separar apresentação e descoberta de produtos e oferecer gestão segura da presença no Google.
**Architecture:** Next/React existentes, JSON storefront com concorrência otimista, campos SEO atuais, OAuth servidor e relatórios REST.
**Tech Stack:** Next 16.4.2, React 19, Prisma 6, Zod 4, shadcn local, fetch e crypto nativos.
**Spec:** docs/superpowers/specs/2026-11-09-landing-seo-analytics-design.md

## Restrições globais

Sem banco operacional, migração de schema, envio Google real, merge, publicação ou implantação. Preservar paletas e fluxos comerciais. Uma versão MINOR por PR quando preparada para entrega.

## Foco da revisão

Consultas repetidas e URLs de produto devem sobreviver à mudança de raiz. Overrides nunca liberam privado. Redirecionamentos não aceitam externo/ciclos. OAuth deve rejeitar state/ator/expiração incorretos. Erro de uma fonte não pode virar zero ou ocultar a outra.

## Etapas

- [x] 1. Revisar e instalar somente skills selecionadas com SHA fixo, licença e procedência; preservar customizações locais.
- [x] 2. Testar catálogo em `/catalogo`, produto mantendo filtros e raiz legada preservando query; implementar separação, navegação e landing com ativos oficiais.
- [x] 3. Testar schema SEO, destinos e isolamento de páginas privadas; implementar configuração no storefront, gravação parcial com lock/version, metadata/sitemap e tela ADMIN com prévias.
- [x] 4. Testar cookie criptografado, OAuth, relatórios e falhas simuladas; implementar conexão de leitura e painéis GA4/Search Console com cache limitado e identificação de fonte/período.
- [x] 5. Testar sanitização e deduplicação de coleta; implementar consentimento opt-in, gate de ambiente e eventos de navegação/contato sem PII.
- [x] 6. Verificar testes, tipos, lint, build e prévias sintéticas; registrar limites, configuração, versão e estado de entrega.

Cada etapa segue teste falhando, implementação mínima e teste aprovado quando altera comportamento. Não executar testes destrutivos de integração contra ambiente herdado. O relatório final registra evidências e pendências reais.

## Registro de execução

Etapas implementadas nesta sessão. Autorização de execução já constava no encaminhamento; sem rodada de permissão para escolhas reversíveis. Revisão independente apontou e levou à correção de prioridade da imagem específica, isolamento do período atual dos detalhamentos GA4 e transição recusar→permitir da medição, com testes. Verificações e pendências externas constam em docs/marketing/ENTREGA.md. Contas Google, ativos Instagram e emissão de conversões autoritativas não são apresentados como validados.
