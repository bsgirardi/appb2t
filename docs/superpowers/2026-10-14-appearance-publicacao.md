# Publicação — Cores independentes do site e administrativo

> Estado em 15/10/2026: U4, U5 e paletas independentes publicados. Aceite de navegador U4/U5 concluído para cenários representativos em claro/escuro, 390/1440px e teclado. Favicon corrigido no checkout, ainda não publicado. Consulte [o registro atual](2026-10-15-admin-aceite.md) para evidências e limites. As seções datadas abaixo preservam o histórico; menções antigas a candidata ou inspeção pendente descrevem aquela data.


Publicação autorizada e concluída em 14/10/2026, aproximadamente 17:55 (America/Sao_Paulo), na instalação Docker existente, http://localhost:3000.

## Versão e validação

- Código do checkout feat/calculadora, base 3cd9b9d, com alterações aprovadas de aparência ainda não commitadas.
- Imagem operacional: sha256:af88cbb7af63d72026e148465e73a66ba71da1261f7635b9c0b8a3617eaf326e. Identidade conferida contra a imagem construída.
- Build Docker aprovado. Validação anterior do mesmo código: 495 testes aprovados; lint e build local aprovados.
- Migração 202610140001_separate_appearance_palettes aplicada; 20 migrações presentes, nenhuma pendente.
- Backup preliminar restaurado e migração ensaiada; contagem e hash do conteúdo preexistente das 77 tabelas idênticos. Os quatro campos novos foram excluídos da comparação.
- Aplicação parada para backup final; backup restaurado e comparado antes de migrar produção. Após migração, os mesmos 77 conjuntos de dados preexistentes permaneceram idênticos.
- Contêiner saudável; saúde, catálogo, login e leitura pública da aparência retornaram HTTP 200. HTML contém as variáveis próprias do site e o escopo administrativo no login.
- Configurações anônimas redirecionam para login; API de planejamento e tentativa anônima de alterar aparência retornam 401.
- Não foram alteradas cores ou criados dados fictícios em produção durante a verificação.

## Recuperação

Backup: backups/appearance-deploy-20261014/final.dump
SHA256: 35394C4AEA40E6BBAA22931FBDBBAE7D47E664B4B9549DB37218813B02D94157
Imagem anterior: b2t-before-appearance:20261014, também preservada em backups/appearance-deploy-20261014/previous-runtime.tar.
Evidências: test-results/appearance-deploy/ (ignoradas pelo Git).
Bancos de restauração isolados: appearance_restore_20261014 e appearance_final_20261014, no serviço PostgreSQL existente.

A migração é aditiva. Em eventual retorno da aplicação, preservar os campos novos e quaisquer gravações posteriores; não restaurar backup sobre dados recentes sem conciliação.

## Limite

Verificações HTTP e automatizadas concluídas; inspeção visual completa em navegador continua pendente. Esta entrega separa as paletas personalizáveis; não instala integralmente o preset shadcn Nova/Roboto.

## Acompanhamento visual — 14/10/2026

- Navegador integrado acessível diretamente na produção existente; não foi necessário iniciar outro servidor.
- Catálogo inspecionado visualmente em 390 × 844 e 1440 × 900, no modo escuro do dispositivo: cabeçalho, apresentação, produto e rodapé legíveis, sem rolagem horizontal (larguras de conteúdo 375 e 1425, respectivamente).
- Primeiro Tab evidencia o atalho “Pular para o conteúdo”; console do catálogo sem avisos ou erros capturados.
- Tela administrativa direciona corretamente ao login. Solicitado ao usuário autenticar na aba aberta, sem compartilhar senha no chat.
- Ainda pendentes: inspeção autenticada do editor/prévias/menu móvel, navegação administrativa por teclado e conferência no modo claro. Não se declara aceite visual completo.

## Acesso e inspeção administrativa — 14/10/2026, 18h

- Senha do único administrador ativo redefinida a pedido do usuário pelo serviço resetPassword; sessões anteriores revogadas. O segredo não foi gravado neste documento nem em scripts locais.
- Login real confirmado no navegador; formulário de aparência acessível.
- Formulário e prévias inspecionados em 1440 × 900 e 390 × 844 no modo escuro, sem transbordamento horizontal. As duas paletas existentes estão separadas e legíveis.
- Menu móvel abre com foco em Fechar; Shift+Tab alcança Minha conta; Tab retorna a Fechar; Escape fecha e devolve foco ao botão Menu. Sem avisos/erros no console administrativo capturado.
- Cores de produção não foram alteradas: interações temporárias descartadas ao recarregar, sem salvar.
- Limites restantes: o navegador integrado não oferece emulação de preferência claro/escuro; modo claro integral não inspecionado. A automação preenche o valor DOM do seletor nativo de cor, mas não confirmou atualização React da prévia; tentativa pelo popup nativo não é controlável pela API disponível. Não se confunde essa limitação com defeito confirmado da aplicação. Independência das alterações/prévias segue coberta pelos testes automatizados anteriores.

## Encerramento das pendências de aparência — Playwright, 14/10/2026

A validação antes limitada pelo navegador integrado foi concluída com Playwright e Chrome headless, conforme autorização do usuário. Utilizada a mesma imagem publicada, em http://localhost:3102, com rede, banco e conta fictícia exclusivos. Não foram copiadas credenciais ou dados operacionais para esse banco.

Resultado: aprovado.

- Oito campos de cor alterados com input real do Playwright; as prévias React acompanharam os valores.
- Salvar a paleta do site preservou a administrativa; salvar a administrativa preservou a do site. Duas gravações HTTP 200, seguidas de recarga e leitura dos campos persistidos.
- Quatro combinações verificadas: claro/escuro × 390/1440 pixels. Tokens efetivos correspondem à paleta e ao modo corretos em cada área; sem transbordamento horizontal.
- Menu móvel mantém a paleta administrativa; foco inicial, ciclo de Tab/Shift+Tab e Escape aprovados nos dois temas.
- Dez capturas geradas e inspecionadas. Resultados e imagens em test-results/appearance-browser/. Script reutilizável: scripts/check-appearance-browser.cjs; exige URL isolada localhost:3102 e credenciais por variáveis de ambiente.
- O caso inicial com #bb6600 foi recusado pela regra de contraste, como esperado. Repetição final com cores válidas passou.
- Nenhum erro JavaScript ou de funcionalidade capturado. Aviso separado e não bloqueante: favicon.ico retorna 404 na imagem existente. O script registra esse aviso explicitamente, sem ocultar outros erros.
- Lint do script e git diff --check aprovados. Não houve mudança no código da aplicação nem necessidade de nova implantação.
- Valores de produção conferidos após o teste: site #0066cc/#ff7a00/#79b8ff/#ff7a00; administrativo #176b59/#b68b39/#6cdbc0/#eac473, iguais aos valores anteriores.

A validação cobre a reação da aplicação ao controle de cor; não automatiza os detalhes visuais do popup nativo de cada sistema operacional. Esse limite não impede a confirmação de edição, prévia e persistência das paletas.

Referências utilizadas: https://playwright.dev/docs/emulation e https://playwright.dev/docs/input.
