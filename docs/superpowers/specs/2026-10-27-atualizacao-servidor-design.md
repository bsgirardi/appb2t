# Atualização simplificada do servidor

Proposta aprovada: dois comandos Bash no repositório Linux. `atualizar-projeto.sh` baixa main com fast-forward, recusando alterações locais. `atualizar-docker.sh` constrói imagens, preserva imagem e configuração, para a aplicação, gera e verifica dump, aplica migrações e sobe app aguardando saúde. Ambos usam o mesmo bloqueio exclusivo.

Scripts foram escolhidos em vez de blocos manuais extensos ou publicação automática por GitHub Actions: mantêm controle no servidor sem configurar credenciais de implantação. Não atualizam o Docker Engine, não instalam o sistema, não alteram .env nem descartam volumes. Falhas interrompem o fluxo, sem restauração automática de banco. A validação de formato do dump não substitui ensaio de restauração nem cópia externa.
