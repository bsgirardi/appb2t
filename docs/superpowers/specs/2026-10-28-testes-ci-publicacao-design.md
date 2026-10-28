# Testes reproduzíveis, CI e publicação — 28/10/2026

Escopo autorizado: publicação e pendências técnicas Vitest/CI. Decisões rotineiras do implementador: limitar descoberta a tests/unit e tests/integration; separar bancos E3/E4 já protegidos pelos validadores; CI somente de verificação, sem publicação automática. Node 22/Linux reproduz o Docker existente. Alternativa de suprimir erros ou aprovar apenas lotes não resolve o objetivo; trocar bibliotecas de testes não é necessário antes de corrigir descoberta/isolamento.

Critério: suíte padrão completa e suítes exclusivas aprovadas, sem testes de cópias antigas, lint/tipos/build e CI real verdes. Preservar todos os testes atuais, contas, chaves, volume e dados. Entrega PATCH 1.10.1. Publicar após merge autorizado, backup verificado, restauração descartável/migração e comparação dos registros legados. Não configurar domínio/proxy, credenciais, dados comerciais ou novas funcionalidades de roadmap.
