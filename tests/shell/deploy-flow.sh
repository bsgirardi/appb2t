#!/usr/bin/env bash
set -Eeuo pipefail
repo="$(cd "$(dirname "$0")/../.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$work/scripts" "$work/.git"
cp "$repo"/scripts/atualizar-*.sh "$work/scripts/"
touch "$work/.env" "$work/compose.yaml"
echo 'PRIVATE_AUDIT_SENTINEL' > "$work/.env"
printf '{\n  "version": "9.9.9"\n}\n' > "$work/package.json"
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
assert_absent() {
  if grep "$@"; then echo 'Unexpected command or content' >&2; exit 1; fi
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
      if [[ "${CASE:-}" =~ ^(noop|config_change|pending|unhealthy|tools_missing|revision_mismatch)$ || -f "$work/published" ]]; then echo sha256:new; else echo sha256:old; fi ;;
    'inspect --format {{.State.Health.Status}} app')
      if [[ "${CASE:-}" == unhealthy && ! -f "$work/published" ]]; then echo unhealthy; else echo healthy; fi ;;
    'inspect --format {{.State.Status}} {{.State.Health.Status}} app')
      case "${CASE:-}" in
        recovery_exited) echo 'exited unhealthy' ;;
        recovery_inspect) return 1 ;;
        *) echo 'running healthy' ;;
      esac ;;
    *'org.opencontainers.image.revision'*)
      [[ "${CASE:-}" != revision_mismatch ]] || { echo other; return 0; }
      if [[ "${CASE:-}" == tools_missing && "$*" == *appb2t-tools:* ]]; then return 1; fi
      echo abc123 ;;
    *'com.docker.compose.config-hash'*) echo config123 ;;
    'compose config --hash app')
      if [[ "${CASE:-}" == config_change ]]; then echo 'app config456'; else echo 'app config123'; fi ;;
    'compose config'|'inspect app') echo PRIVATE_AUDIT_SENTINEL ;;
    'image inspect --format {{.Id}} appb2t-app:abc123') [[ "${CASE:-}" != candidate_inspect ]] && echo sha256:new ;;
    'compose --progress plain build --build-arg APP_REVISION=abc123 migrate')
      [[ "${CASE:-}" != build_exit42 ]] || return 42
      [[ "${CASE:-}" != success ]] || sleep 1
      [[ "${CASE:-}" != build_tools ]] ;;
    'compose --progress plain build --build-arg APP_REVISION=abc123 app') [[ "${CASE:-}" != build_app ]] ;;
    'compose stop app') [[ "${CASE:-}" != stop ]] ;;
    *pg_dump*)
      [[ "${CASE:-}" != interrupt ]] || kill -INT "$BASHPID"
      [[ "${CASE:-}" != terminate ]] || kill -TERM "$BASHPID"
      [[ "${CASE:-}" != dump && "${CASE:-}" != recovery* ]] && echo binary-dump ;;
    *pg_restore*) cat >/dev/null; [[ "${CASE:-}" != invalid ]] ;;
    *'prisma migrate status'*) [[ "${CASE:-}" =~ ^(noop|tools_missing|revision_mismatch)$ ]] ;;
    'compose run --rm --no-deps --pull never -T --interactive=false migrate') [[ "${CASE:-}" != migrate ]] ;;
    'compose up -d --no-deps --no-build --wait --wait-timeout 180 app')
      [[ "${CASE:-}" != health ]] || return 1
      [[ "${CASE:-}" == wrong_image ]] || touch "$work/published"
      [[ "${CASE:-}" != report_write ]] || mkdir "$backup_dir/resumo.txt" ;;
    'start app') [[ "${CASE:-}" != recovery ]] ;;
    'tag appb2t-tools:abc123 appb2t-tools:latest') [[ "${CASE:-}" != tag_tools ]] ;;
    'tag sha256:new appb2t-app:latest') [[ "${CASE:-}" != tag_app ]] ;;
    'tag '*) [[ "${CASE:-}" != preserve ]] ;;
  esac
}
export -f git docker
for CASE in success cli_incompatible missing_image build_tools build_app preserve stop dump invalid recovery recovery_exited recovery_inspect migrate health wrong_image tag_tools tag_app noop config_change pending unhealthy tools_missing revision_mismatch dirty candidate_inspect interrupt terminate build_exit42 report_write; do
  export CASE
  : > "$LOG"
  rm -f "$work/published"
  if bash "$work/scripts/atualizar-docker.sh" > "$work/output" 2>&1; then
    actual_code=0
    [[ "$CASE" =~ ^(success|noop|config_change|pending|unhealthy|tools_missing|revision_mismatch|report_write)$ ]] || { cat "$work/output"; exit 1; }
  else
    actual_code=$?
    [[ ! "$CASE" =~ ^(success|noop|config_change|pending|unhealthy|tools_missing|revision_mismatch|report_write)$ ]] || { cat "$work/output"; exit 1; }
    assert_absent -q 'Nova versão em execução' "$work/output"
  fi
  [[ "$(grep -c '^=== Resumo da atualização ===$' "$work/output")" == 1 ]] || { cat "$work/output"; exit 1; }
  grep -q '^total_script_s=[0-9]' "$work/output"
  grep -q "^codigo_saida=$actual_code$" "$work/output"
  if [[ "$CASE" == noop ]]; then
    grep -q '^resultado=sem_alteracoes$' "$work/output"
    grep -q '^manutencao_status=nao_iniciada$' "$work/output"
  elif [[ "$CASE" =~ ^(success|report_write)$ ]]; then
    grep -q '^resultado=sucesso$' "$work/output"
    grep -q '^manutencao_status=encerrada$' "$work/output"
    grep -q '^backup_status=catalogo_validado_checksum_gerado$' "$work/output"
    grep -q '^backup_bytes=12$' "$work/output"
  elif [[ "$CASE" == interrupt || "$CASE" == terminate ]]; then
    grep -q '^resultado=interrompida$' "$work/output"
    [[ "$actual_code" == "$([[ "$CASE" == interrupt ]] && echo 130 || echo 143)" ]]
    grep -q '^manutencao_status=recuperada$' "$work/output"
  elif [[ "$CASE" == build_exit42 ]]; then
    [[ "$actual_code" == 42 ]]
    grep -q '^etapa_falha=build_tools$' "$work/output"
  fi
  if [[ "$CASE" == tag_app || "$CASE" == tag_tools ]]; then
    grep -q '^resultado=falha$' "$work/output"
    grep -q '^manutencao_status=encerrada$' "$work/output"
    grep -q '^healthcheck_candidato=1$' "$work/output"
    grep -q '^etapa_falha=aliases$' "$work/output"
  fi
  if [[ "$CASE" == migrate || "$CASE" == health || "$CASE" == recovery_exited ]]; then
    grep -q '^manutencao_status=nao_confirmada$' "$work/output"
  fi
  report="$(sed -n 's/^resumo_arquivo=//p' "$work/output")"
  if [[ -f "$report" ]]; then
    grep -q '^versao_alvo=9.9.9$' "$report"
    [[ "$(stat -c %a "$report")" == 600 ]]
    [[ -f "$(dirname "$report")/etapas.tsv" ]]
    [[ "$(stat -c %a "$(dirname "$report")/etapas.tsv")" == 600 ]]
    assert_absent -q PRIVATE_AUDIT_SENTINEL "$report"
    if [[ "$CASE" == success ]]; then
      awk -F '\t' '$1=="build_tools" && $2=="sucesso" && $3>=1 {ok=1} END {exit !ok}' "$(dirname "$report")/etapas.tsv"
      grep -q $'^aliases\tsucesso\t' "$(dirname "$report")/etapas.tsv"
    fi
    if [[ "$CASE" == noop ]]; then
      grep -q $'^build_tools\tnao_executada\t-$' "$(dirname "$report")/etapas.tsv"
    fi
  elif [[ "$CASE" == report_write ]]; then
    grep -q 'AVISO: não foi possível salvar o resumo' "$work/output"
  elif [[ ! "$CASE" =~ ^(dirty|cli_incompatible|missing_image)$ ]]; then
    cat "$work/output"; exit 1
  fi
  case "$CASE" in
    success)
      grep -q 'Nova versão em execução' "$work/output"
      grep -q 'etapa=build_tools status=sucesso duracao_s=' "$work/output"
      grep -q 'indisponibilidade_s=' "$work/output"
      tools=$(grep -n '^compose --progress plain build .* migrate$' "$LOG" | cut -d: -f1)
      app=$(grep -n '^compose --progress plain build .* app$' "$LOG" | cut -d: -f1)
      [[ "$tools" -lt "$app" ]] ;;
    cli_incompatible|missing_image|build_tools|build_app|preserve|dirty|candidate_inspect|build_exit42) assert_absent -q 'compose stop app' "$LOG" ;;
    stop|dump|invalid|recovery|recovery_exited|recovery_inspect|interrupt|terminate)
      assert_absent -q 'compose run --rm --no-deps --pull never -T --interactive=false migrate' "$LOG"
      grep -q '^start app$' "$LOG"
      assert_absent -q 'compose start' "$LOG" ;;
    migrate|health|wrong_image|tag_tools|tag_app) assert_absent -q '^start app$' "$LOG" ;;
    noop) assert_absent -q '^compose --progress plain build' "$LOG"; assert_absent -q 'compose stop app' "$LOG"; grep -q 'já está em execução' "$work/output" ;;
    config_change|pending|unhealthy|tools_missing|revision_mismatch) grep -q 'compose stop app' "$LOG" ;;
  esac
  if [[ "$CASE" =~ ^(success|noop|config_change|pending|unhealthy|tools_missing|revision_mismatch|report_write)$ ]]; then
    grep -q '^tag sha256:new appb2t-app:latest$' "$LOG"
    grep -q '^tag appb2t-tools:abc123 appb2t-tools:latest$' "$LOG"
  elif [[ "$CASE" == tag_tools ]]; then
    assert_absent -q ' appb2t-app:latest$' "$LOG"
  elif [[ "$CASE" != tag_app ]]; then
    assert_absent -q ' appb2t-app:latest$' "$LOG"
    assert_absent -q ' appb2t-tools:latest$' "$LOG"
  fi
  if [[ "$CASE" == recovery* ]]; then grep -q 'Falha ao retomar' "$work/output"; fi
  if [[ "$CASE" == cli_incompatible || "$CASE" == missing_image ]]; then assert_absent -q '^compose --progress plain build' "$LOG"; fi
  assert_absent -Eq 'compose down|prune|volume rm|systemctl|compose restart' "$LOG"
  assert_absent -q PRIVATE_AUDIT_SENTINEL "$work/output"
  echo "PASS docker: $CASE"
done
