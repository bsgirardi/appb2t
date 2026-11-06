## O que mudou

Descreva o problema e o resultado para quem usa o sistema.

## Versão e Atualizações

- [ ] Versão incrementada em relação à `main`, conforme SemVer.
- [ ] `package.json` e as duas entradas de versão de `package-lock.json` sincronizados.
- [ ] Rodapés do administrativo e login usam a nova versão via `APP_VERSION`.
- [ ] Nova entrada em `src/lib/releases.ts`, com versão, data e notas para os usuários.
- [ ] Histórico anterior preservado e página Atualizações disponível para a equipe.

## Validação

Informe as verificações executadas e eventuais limitações.

## Entrega após integração em main

Seguir [o roteiro de distribuição](https://github.com/bsgirardi/appb2t/blob/main/docs/DISTRIBUICAO_IMAGENS.md#rotina-obrigatória-para-cada-integração-em-main). Preencher após o merge autorizado, sem novo incremento da versão desta PR:

- SHA completo integrado:
- Release oficial no repositório privado de distribuição:
- Plataforma, digest base e SHA-256/tamanho dos assets conferidos:
- Atualizador sincronizado, se alterado:
- Estado da implantação operacional (separado da publicação da imagem):

Antes do merge, esses campos podem permanecer pendentes. A entrega só está concluída quando a Release oficial estiver publicada e validada; a implantação em servidor exige autorização própria.
