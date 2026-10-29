#!/usr/bin/env bash
set -Eeuo pipefail
repo="$(cd "$(dirname "$0")/../.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$work/scripts" "$work/.git"
cp "$repo"/scripts/atualizar-*.sh "$work/scripts/"
touch "$work/.env" "$work/compose.yaml"
export LOG="$work/commands.log"
# Git Bash no Windows não inclui flock; simula apenas o resultado do bloqueio.
# Em Linux usa o flock real para verificar a exclusão entre processos.
if ! command -v flock >/dev/null; then
  flock() { [[ "${CASE:-}" != locked ]]; }
  export -f flock
  export MOCK_FLOCK=1
fi
git() {
  case "$*" in
    'branch --show-current') echo main ;;
    'status --porcelain --untracked-files=normal') [[ "${CASE:-}" != dirty ]] || echo ' M compose.yaml' ;;
    'rev-parse HEAD') echo abc123 ;;
    *) echo "git $*" >> "$LOG" ;;
  esac
  return 0
}
export -f git
# Os cenários Docker ficam no teste dedicado, com mocks do fluxo atual.
bash "$repo/tests/shell/deploy-flow.sh"
export CASE=dirty
: > "$LOG"
if bash "$work/scripts/atualizar-projeto.sh" > "$work/output" 2>&1; then exit 1; fi
! grep -q 'git pull' "$LOG"
export CASE=success
bash "$work/scripts/atualizar-projeto.sh" > "$work/output" 2>&1
grep -q 'git pull --ff-only origin main' "$LOG"
echo 'PASS projeto: alterações locais bloqueadas e fast-forward'
if [[ "${MOCK_FLOCK:-}" == 1 ]]; then
  export CASE=locked
  if bash "$work/scripts/atualizar-docker.sh" > "$work/output" 2>&1; then exit 1; fi
  grep -q 'Outra atualização' "$work/output"
else
(
  flock -x 8
  if bash "$work/scripts/atualizar-docker.sh" > "$work/output" 2>&1; then exit 1; fi
  grep -q 'Outra atualização' "$work/output"
) 8> "$work/.git/b2t-atualizacao.lock"
fi
echo 'PASS bloqueio simultâneo'
