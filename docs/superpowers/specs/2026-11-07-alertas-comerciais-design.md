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
