# Etapa 3 — consulta comercial na negociação

Objetivo: aproximar custos e contribuição da decisão comercial, sem novos lançamentos.
Arquitetura: consulta explícita ao GET autenticado de orçamento existente; cálculo por linha com compareLineCost e snapshots preservados; interface shadcn. Next 16, React, Decimal.

## Diagnóstico e desenho

Base d1d7ac0, 1.15.0. E1.2 já entrega canais simultâneos, desconto percentual, cobertura/meta e biblioteca imutável. Não recriar. E1 e E2 de UX estão entregues localmente nas branches codex/admin-ux-etapa1 (1.15.1) e codex/admin-ux-etapa2 (1.16.0), sem integração confirmada. Não incorporar branches nem editar shell, dashboard, Clientes ou CSS global.

Recorte autorizado: consulta do orçamento principal na negociação, por ação humana. Mostrar versão consultada e divergência em relação ao acompanhamento, contribuição e margem por item, canal preservado, tempo de máquina estimado e cobertura válida de custos. Sem agregação financeira, rateio de desconto global, recalcular catálogo ou nova simulação de capacidade. Desconto/frete globais têm aviso explícito: indicadores dos itens são anteriores a esses valores. Tempo de máquina não é duração de calendário; encaminhar ao planejamento existente para consulta. Comparador e biblioteca já disponíveis recebem atalhos.

Alternativas: enriquecer todas as listagens exigiria carregar memórias em massa; duplicar simulador criaria divergência. Escolha de implementação: painel sob demanda usando o documento existente. Nenhuma mutação, nova rota, migração ou regra fiscal. Sem margem consolidada quando há cobertura incompleta. Mesmo cobertura completa por linha não permite chamar resultado de lucro líquido.

## Plano de execução

- [x] Testes de domínio: preço atual sobre memória, identidade/quantidade alteradas, custo ausente e tempo exato, imutabilidade.
- [x] Derivação pura por linha reutilizando compareLineCost e fingerprint.
- [x] Painel na negociação com carregamento explícito, erro sem dados anteriores, divergência de versão, acesso ao orçamento/comparador/planejamento.
- [x] Testes de interface: GET sem mutações, erro, troca do principal sem vazamento de resultado anterior; regressões de autorização existentes.
- [x] Tipos, lint, build e validação responsiva/teclado quando disponível. Registrar limitações verificadas.
- [x] Versão MINOR única comparada a main, notas em português e consistência de rodapés/histórico. Sem merge/publicação.
