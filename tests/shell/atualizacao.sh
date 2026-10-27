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
docker() {
  echo "$*" >> "$LOG"
  case "$*" in
    'compose ps -q app') echo app ;;
    'compose ps -q db') echo db ;;
    'inspect --format {{.Image}} app') echo sha256:old ;;
    'compose build app migrate') [[ "${CASE:-}" != build ]] ;;
    *pg_dump*) [[ "${CASE:-}" != dump ]] && echo binary-dump ;;
    *pg_restore*) cat >/dev/null; [[ "${CASE:-}" != invalid ]] ;;
    'compose run --rm --no-deps migrate') [[ "${CASE:-}" != migrate ]] ;;
    'compose up -d --no-deps --wait --wait-timeout 180 app') [[ "${CASE:-}" != health ]] ;;
  esac
}
export -f git docker
for CASE in success build dump invalid migrate health; do
  export CASE
  : > "$LOG"
  if bash "$work/scripts/atualizar-docker.sh" > "$work/output" 2>&1; then
    [[ "$CASE" == success ]]
    grep -q 'Nova versão em execução' "$work/output"
  else
    if [[ "$CASE" == success ]]; then cat "$work/output"; fi
    [[ "$CASE" != success ]]
    ! grep -q 'Nova versão em execução' "$work/output"
  fi
  case "$CASE" in
    build) ! grep -q 'compose stop app' "$LOG" ;;
    dump|invalid) ! grep -q 'compose run' "$LOG" ;;
    migrate) ! grep -q 'compose up' "$LOG" ;;
  esac
  echo "PASS docker: $CASE"
done
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
