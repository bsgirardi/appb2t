#!/usr/bin/env bash
set -Eeuo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

command -v flock >/dev/null || { echo 'Instale util-linux (flock) antes de continuar.' >&2; exit 1; }
exec 9>.git/b2t-atualizacao.lock
flock -n 9 || { echo 'Outra atualização está em andamento.' >&2; exit 1; }
trap 'echo "Falha ao atualizar o código. Confira o erro acima; os contêineres não foram alterados." >&2' ERR

[[ "$(git branch --show-current)" == main ]] || { echo 'Use a branch main para atualizar o servidor.' >&2; exit 1; }
[[ -z "$(git status --porcelain --untracked-files=normal)" ]] || {
  echo 'Existem alterações locais. Revise git status antes de atualizar; nenhum arquivo será descartado.' >&2
  exit 1
}
git pull --ff-only origin main
echo 'Código atualizado. Para publicar: bash scripts/atualizar-docker.sh'
