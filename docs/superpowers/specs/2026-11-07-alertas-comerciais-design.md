# Alertas comerciais — desenho

Data: 07/11/2026. Base: main bd0b4eb, 1.24.0.

## Escopo autorizado
Ampliar a prioridade existente no dashboard comercial e visão geral. Projeção de leitura, sem tabela, migração, mensagens ou alteração automática. ADMIN/OPERATOR mantêm o mesmo escopo de consultas e detalhes. Sem dados financeiros novos.

## Abordagem
Reutilizar PriorityTable e a transação comercial. Um item por negociação reúne contato atrasado e vencimento do orçamento principal, sem duplicar ações; orçamento avulso tem item próprio. Módulo separado e notificações persistidas foram descartados por duplicarem a operação existente. Implementação direta autorizada pelo encaminhamento; somente novos critérios comerciais dependem de decisão.

## Regras comprovadas
- Contato atrasado: negociação aberta e nextContactDate anterior ao dia civil atual em America/Sao_Paulo. Hoje não é atrasado. Exibir responsável e nextAction, com link à negociação.
- Vencimento: ENVIADO/APROVADO, validade de hoje até 7 dias inclusive (janela existente, confirmação solicitada); nunca rascunho, expirado, recusado, cancelado ou convertido. Negociação encerrada e orçamento secundário ficam fora. Conversão continua encerrada mesmo com venda cancelada; sem reabertura inferida.
- Sem validade/próximo contato/principal: explicitar cobertura insuficiente com acesso para corrigir; ausência de registros não significa tudo em dia.
- Emissão interna não comprova envio real. INTERACTION é texto livre, não prova resposta ou sua ausência. Não implementar sem retorno com base em tempo. Alternativa de inatividade e prazo aguardam decisão, sem classificar como ausência de resposta.
- Ordenar atrasos primeiro e por prazo; atualizações da fonte retiram/alteram pendências na próxima leitura. Sem marcar como lida ou resolvida artificialmente.

## Validação
Testes de domínio (fronteiras civis, estados, principal, duplicidade, lacunas), consulta sintética ADMIN/OPERATOR, interface e links; tipos/lint/build. Prévia sintética, sem operação ou sessão artificial. Não contornar bloqueios anteriores de servidor Next.

## 07/11 — complemento aprovado: sem retorno do cliente

Usuário escolheu envio/resposta explícitos e prazo ADMIN configurável, padrão 14 dias. Reutilizar OpportunityEvent com novos tipos PROPOSAL_SENT/CUSTOMER_REPLY, autor, orçamento e versão atuais. Sem backfill/inferência de notas antigas. Data do registro em São Paulo, sem retrodatação. Resposta encerra a espera; troca de principal/reabertura invalida ciclo anterior; orçamento editado exige novo registro de envio. Novos eventos apenas em oportunidade aberta e principal vigente ENVIADO/APROVADO, sob os locks/idempotência/versão já existentes. Respostas podem registrar encerramento da espera mesmo sem envio anterior, sem gerar espera por si.

Preferência persistida separada de precificação: CommercialSettings singleton, prazo inteiro de 1 a 365 dias (limite técnico), versão otimista; ausência de configuração equivale a 14. Somente ADMIN altera, OPERATOR pode ver critério no painel. Mudança aplica à próxima leitura das esperas atuais, não altera histórico. Migração somente aditiva, sem tabela de notificações. Prazo é civil: envio dia 1 + 14 dias gera alerta dia 15 inclusive.

Contagem pelo primeiro envio ainda sem resposta proposta ao usuário; resposta assíncrona pendente. Lembrete da mesma proposta não deve silenciar uma espera vencida (proposta técnica explícita, alterar se usuário preferir reinício). Alertas sem retorno agrupados com contato/vencimento por negociação, sem dados financeiros novos. Propostas expiradas e terminais não geram sem retorno. Configuração em Configurações; operação manual na interação da negociação. Versão permanece 1.25.0 por ser a mesma PR #50.

Confirmação expressa recebida: “Sim, primeiro envio sem resposta”. Regra aprovada, sem prazo reiniciado por lembretes.
