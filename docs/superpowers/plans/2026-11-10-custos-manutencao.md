# Custos de produção e manutenção fixa

**Objetivo:** desbloquear a configuração inicial e oferecer manutenção fixa por lote, conforme confirmação do usuário. Sem implantação.

**Decisões:** preservar o formulário e API compartilhados. Na primeira configuração, preços iniciam explicitamente em 0%, sem inventar tarifas de produção; ajuda informa isso. Erros de validação aparecem nos campos e resumo identifica inclusive a outra aba. Manutenção oferece HOURLY (compatível com dados anteriores) ou FIXED_PER_LOT, cobrada uma vez no lote, sem multiplicar por peças ou horas. Novos campos opcionais no JSON evitam migração destrutiva. Snapshots preservam a escolha; dados antigos continuam por hora. Custo real de uma linha cobra o fixo uma vez entre seus apontamentos de máquina.

**Base:** branch separada sobre a revisão de segurança da PR 67; não integrar ou publicar neste trabalho. Usar skills de diagnóstico, shadcn, TDD e execução de plano.

- [x] Reproduzir primeiro salvamento com a API real de validação em teste de interface e testar erros nos campos.
- [x] Testar manutenção fixa, valor zero, legado e cobrança única por lote/linha.
- [x] Ajustar tipos, schemas, resolução e motores; propagar premissas nas telas de revisão e comparações.
- [x] Ajustar formulário com componentes existentes, ajuda e seleção da cobrança.
- [x] Verificar testes, tipos e lint; revisar diff. Versionar como funcionalidade 1.29.0, com histórico em português e manifestos consistentes; preparar PR revisável.

## Verificação

Reprodução inicial: cinco falhas, incluindo os campos ocultos e ausência do modo fixo. Revisão identificou dependência indevida de horas e estorno integral; dois testes adicionais falharam antes da correção. Resultado final focado: 44 testes em oito arquivos passaram; tipagem e lint passaram. Revisão sem novos achados após reconciliação dos estornos. Sem banco operacional, migração, merge, Release ou implantação. Build Docker local continua limitado pelo ambiente, conforme PR 67; a CI existente fará a verificação independente da candidata.
