# Testes, CI e publicação — plano de execução

> Usar superpowers:executing-plans para executar diretamente nesta sessão autorizada.

**Objetivo:** executar testes completos reproduzíveis, verificar PRs automaticamente e publicar a atualização com dados preservados.
**Arquitetura:** descoberta explícita Vitest, configuração comum e suítes/bancos independentes; GitHub Actions Linux/Node 22 com PostgreSQL 17; Docker existente para publicação.
**Spec:** docs/superpowers/specs/2026-10-28-testes-ci-publicacao-design.md

- [x] Reproduzir descoberta incorreta: 247 arquivos de cópias .superpowers e preview exclusivo incluídos na suíte padrão.
- [x] Corrigir configs, adicionar comandos E3/E4 e workflow com lint/tipos/build e três bancos exclusivos. Conferir descoberta completa.
- [x] Executar suíte padrão completa e E3/E4 em Linux/Node 22, migração E4 real e revisão independente. Verificar CI real antes do merge.
- [x] Sincronizar 1.10.1 e notas; atualizar pendências históricas com evidências atuais; criar PR e preparar integração main local/GitHub após verificação final.
- [x] Construir runtime/tools, preservar imagem/configuração, parar app e fazer backup atual; restaurar em PostgreSQL descartável, migrar e comparar projeções legadas.
- [x] Migrar instalação existente e subir imagem; verificar saúde/versão/rotas/limites de acesso e preservação dos dados. Disponibilizar recuperação administrativa sem alterar senhas.

Configuração de domínio/HTTPS, backup externo e validação humana com a equipe dependem do responsável e continuam explicitamente pendentes.

## Resultado

CI completo e publicação 1.10.1 aprovados; evidências em docs/superpowers/2026-10-28-publicacao-1.10.1.md. Candidata validada foi publicada antes da consolidação documental e do merge final, permitindo registrar nesta mesma PR os resultados operacionais sem novo incremento de versão. Alterações finais de acompanhamento não mudam o código servido.
