#!/usr/bin/env bash
set -Eeuo pipefail
repo="$(cd "$(dirname "$0")/../.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$work/scripts" "$work/.git"
cp "$repo"/scripts/atualizar-*.sh "$work/scripts/"
touch "$work/.env" "$work/compose.yaml"
echo 'PRIVATE_AUDIT_SENTINEL' > "$work/.env"
export LOG="$work/commands.log" work
if ! command -v flock >/dev/null; then
  flock() { [[ "${CASE:-}" != locked ]]; }
  export -f flock
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
  if [[ "$*" == 'compose run '* && "$*" == *'--no-build'* ]]; then
    echo 'unknown flag: --no-build' >&2
    return 1
  fi
  case "$*" in
    'compose ps -q app') echo app ;;
    'compose ps -q db') echo db ;;
    'compose run --rm --no-deps --pull never -T --interactive=false --help') [[ "${CASE:-}" != cli_incompatible ]] ;;
    'image inspect sha256:old') [[ "${CASE:-}" != missing_image ]] ;;
    'inspect --format {{.Image}} app')
      if [[ "${CASE:-}" =~ ^(noop|config_change|pending|unhealthy)$ || -f "$work/published" ]]; then echo sha256:new; else echo sha256:old; fi ;;
    'inspect --format {{.State.Health.Status}} app')
      if [[ "${CASE:-}" == unhealthy && ! -f "$work/published" ]]; then echo unhealthy; else echo healthy; fi ;;
    'inspect --format {{.State.Status}} {{.State.Health.Status}} app')
      case "${CASE:-}" in
        recovery_exited) echo 'exited unhealthy' ;;
        recovery_inspect) return 1 ;;
        *) echo 'running healthy' ;;
      esac ;;
    *'com.docker.compose.config-hash'*) echo config123 ;;
    'compose config --hash app')
      if [[ "${CASE:-}" == config_change ]]; then echo 'app config456'; else echo 'app config123'; fi ;;
    'compose config'|'inspect app') echo PRIVATE_AUDIT_SENTINEL ;;
    'image inspect --format {{.Id}} appb2t-app:abc123') echo sha256:new ;;
    'compose --progress plain build --build-arg APP_REVISION=abc123 migrate') [[ "${CASE:-}" != build_tools ]] ;;
    'compose --progress plain build --build-arg APP_REVISION=abc123 app') [[ "${CASE:-}" != build_app ]] ;;
    'compose stop app') [[ "${CASE:-}" != stop ]] ;;
    *pg_dump*) [[ "${CASE:-}" != dump && "${CASE:-}" != recovery* ]] && echo binary-dump ;;
    *pg_restore*) cat >/dev/null; [[ "${CASE:-}" != invalid ]] ;;
    *'prisma migrate status'*) [[ "${CASE:-}" == noop ]] ;;
    'compose run --rm --no-deps --pull never -T --interactive=false migrate') [[ "${CASE:-}" != migrate ]] ;;
    'compose up -d --no-deps --no-build --wait --wait-timeout 180 app')
      [[ "${CASE:-}" != health ]] || return 1
      [[ "${CASE:-}" == wrong_image ]] || touch "$work/published" ;;
    'start app') [[ "${CASE:-}" != recovery ]] ;;
    'tag appb2t-tools:abc123 appb2t-tools:latest') [[ "${CASE:-}" != tag_tools ]] ;;
    'tag sha256:new appb2t-app:latest') [[ "${CASE:-}" != tag_app ]] ;;
    'tag '*) [[ "${CASE:-}" != preserve ]] ;;
  esac
}
export -f git docker
for CASE in success cli_incompatible missing_image build_tools build_app preserve stop dump invalid recovery recovery_exited recovery_inspect migrate health wrong_image tag_tools tag_app noop config_change pending unhealthy dirty; do
  export CASE
  : > "$LOG"
  rm -f "$work/published"
  if bash "$work/scripts/atualizar-docker.sh" > "$work/output" 2>&1; then
    [[ "$CASE" =~ ^(success|noop|config_change|pending|unhealthy)$ ]] || { cat "$work/output"; exit 1; }
  else
    [[ ! "$CASE" =~ ^(success|noop|config_change|pending|unhealthy)$ ]] || { cat "$work/output"; exit 1; }
    ! grep -q 'Nova versão em execução' "$work/output"
  fi
  case "$CASE" in
    success)
      grep -q 'Nova versão em execução' "$work/output"
      grep -q 'etapa=build_tools status=sucesso duracao_s=' "$work/output"
      grep -q 'indisponibilidade_s=' "$work/output"
      tools=$(grep -n '^compose --progress plain build .* migrate$' "$LOG" | cut -d: -f1)
      app=$(grep -n '^compose --progress plain build .* app$' "$LOG" | cut -d: -f1)
      [[ "$tools" -lt "$app" ]] ;;
    cli_incompatible|missing_image|build_tools|build_app|preserve|dirty) ! grep -q 'compose stop app' "$LOG" ;;
    stop|dump|invalid|recovery|recovery_exited|recovery_inspect)
      ! grep -q 'compose run --rm --no-deps --pull never -T --interactive=false migrate' "$LOG"
      grep -q '^start app$' "$LOG"
      ! grep -q 'compose start' "$LOG" ;;
    migrate|health|wrong_image|tag_tools|tag_app) ! grep -q '^start app$' "$LOG" ;;
    noop) ! grep -q 'compose stop app' "$LOG"; grep -q 'já está em execução' "$work/output" ;;
    config_change|pending|unhealthy) grep -q 'compose stop app' "$LOG" ;;
  esac
  if [[ "$CASE" =~ ^(success|noop|config_change|pending|unhealthy)$ ]]; then
    grep -q '^tag sha256:new appb2t-app:latest$' "$LOG"
    grep -q '^tag appb2t-tools:abc123 appb2t-tools:latest$' "$LOG"
  elif [[ "$CASE" == tag_tools ]]; then
    ! grep -q ' appb2t-app:latest$' "$LOG"
  elif [[ "$CASE" != tag_app ]]; then
    ! grep -q ' appb2t-app:latest$' "$LOG"
    ! grep -q ' appb2t-tools:latest$' "$LOG"
  fi
  if [[ "$CASE" == recovery* ]]; then grep -q 'Falha ao retomar' "$work/output"; fi
  if [[ "$CASE" == cli_incompatible || "$CASE" == missing_image ]]; then ! grep -q '^compose --progress plain build' "$LOG"; fi
  ! grep -Eq 'compose down|prune|volume rm|systemctl|compose restart' "$LOG"
  ! grep -q PRIVATE_AUDIT_SENTINEL "$work/output"
  echo "PASS docker: $CASE"
done
