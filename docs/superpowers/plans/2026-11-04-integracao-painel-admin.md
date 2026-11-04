# Integração e publicação do painel administrativo

> Execução inline com superpowers:executing-plans, autorizada pelo usuário. Destino confirmado: Docker local em localhost:3000.

**Goal:** integrar etapas 1–3 com a etapa 4 já presente, validar ADMIN/OPERATOR e publicar a aplicação local.
**Architecture:** incorporar commits originais e preservar histórico Git; conciliar apenas conflitos, versões e notas. Reutilizar componentes/motores/serviços existentes, sem mudar schema.
**Tech Stack:** Next 16, React, Prisma/PostgreSQL 17, shadcn, Docker Compose.
**Spec:** entregas originais em docs/ux-etapa1/VALIDACAO.md, docs/superpowers/2026-11-04-admin-ux-etapa2.md, docs/ux-etapa3/ENTREGA.md e docs/ux-etapa4/ENTREGA.md.

## Restrições e foco de revisão

- Preservar permissões, dados operacionais, commits originais e histórico publicado.
- Nova versão única 1.17.0 sobre main 1.16.0; consolidar notas das branches não publicadas sem duplicar versões históricas.
- Validar grupos de navegação e acesso ADMIN/OPERATOR, cliente com filtro/paginação/formulário, dashboard e negociação/rentabilidade.
- Não presumir taxa de frete nem custo completo para margem consolidada; aplicar somente regras modeladas existentes e explicitar o que faltar.
- Publicação apenas no Docker local confirmado. Backup, recuperação e identidade de imagem verificados antes da troca; sem alterar volume PostgreSQL ou credenciais.

## Passos

- [x] Incorporar etapas 1–3 em sequência e resolver conflitos, mantendo inteligência da etapa 4.
- [x] Auditar a pendência de margem consolidada; reutilizar contratos comerciais existentes ou registrar a decisão financeira ainda necessária.
- [x] Consolidar notas, versão, testes e documentação da integração.
- [x] Validar tipos/lint/build, suíte unitária e integrações pertinentes; testar sessões reais ADMIN/OPERATOR e interface responsiva clara/escura em banco descartável.
- [ ] Revisão independente da integração e correções necessárias; abrir PR, aguardar CI e fazer merge autorizado.
- [ ] Construir imagens da main integrada; backup/ensaio e publicação Docker local, validar saúde, versão, identidade e acesso.

## Registro de execução

Base: origin/main 307220d, versão 1.16.0. Commits originais: etapa 1 355e2a6, etapa 2 38dd157, etapa 3 49e7553. Destino de publicação confirmado pelo usuário nesta conversa.

Escolha financeira confirmada pelo usuário: simulação consolidada com custo de envio e encargos sobre frete declarados pela equipe, sem persistência. Reutilizar rateio proporcional em centavos e memórias válidas; taxas percentuais sobre produtos líquidos após desconto, custos fixos uma vez por linha, incidência de frete fornecida explicitamente. Todos os itens precisam de cobertura. Não presumir custo zero nem alterar fatos comerciais.
