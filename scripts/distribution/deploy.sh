#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
installation="$1"
stage="$2"
cd -- "$installation"
# Descriptor 9 is held by update.sh throughout download and deployment.
flock -n 9 || exit 1
function docker() {
  if [[ "$1" == compose ]]; then
    shift
    command docker compose --project-directory "$installation" --env-file "$installation/.env" -f "$stage/compose.json" "$@"
  else command docker "$@"; fi
}
phase=preflight
phase_started=$SECONDS
total_started=$SECONDS
main_pid=$BASHPID
started_at="$(date -Is)"
result=em_andamento
failed_phase=''
phase_open=1
declare -A phase_times=() phase_results=()
phase_order=(preflight verificacao_inicial verificacao_final preservacao backup migracao publicacao aliases registro recuperacao)
declare -A phase_titles=(
  [preflight]='Verificações iniciais'
  [verificacao_inicial]='Conferência da versão instalada'
  [verificacao_final]='Conferência das imagens'
  [preservacao]='Preservação para recuperação'
  [backup]='Backup e validação'
  [migracao]='Migrações'
  [publicacao]='Publicação e saúde'
  [registro]='Registro da publicação'
  [aliases]='Atualização dos aliases'
  [recuperacao]='Recuperação da versão anterior'
)
backup_dir=''
stopped=0
migration_started=0
downtime_started=0
downtime_finished=0
maintenance_state=nao_iniciada
backup_state=nao_realizado
backup_bytes='-'
candidate_healthy=0
# Keep report output out of a redirected pg_dump, including signal handlers.
exec 3>&1
close_phase() {
  if [[ "$phase_open" == 1 ]]; then
    phase_times["$phase"]=$((SECONDS-phase_started))
    phase_results["$phase"]="$1"
    phase_open=0
  fi
}
begin() {
  phase="$1"
  phase_started=$SECONDS
  phase_open=1
  echo "etapa=$phase status=inicio"
}
end() {
  close_phase sucesso
  echo "etapa=$phase status=sucesso duracao_s=${phase_times[$phase]}"
}
format_duration() { printf '%02d:%02d:%02d' "$(($1/3600))" "$(($1/60%60))" "$(($1%60))"; }
print_stages() {
  local name
  printf 'etapa\tresultado\tduracao_s\n'
  for name in "${phase_order[@]}"; do
    printf '%s\t%s\t%s\n' "$name" "${phase_results[$name]:-nao_executada}" "${phase_times[$name]:--}"
  done
}
print_summary() {
  local name duration
  printf '\n=== Resumo da atualização ===\n'
  printf 'resultado=%s\ncodigo_saida=%s\ninicio=%s\nfim=%s\n' "$result" "$exit_code" "$started_at" "$finished_at"
  printf 'versao_alvo=%s\ncommit=%s\nimagem_candidata=%s\n' "${app_version:-nao_identificada}" "${revision:-nao_identificado}" "${candidate:-nao_identificada}"
  printf 'total_script_s=%s\n' "$total_elapsed"
  printf 'Tempo da implantação: %s (download/importação medidos separadamente).\n' "$(format_duration "$total_elapsed")"
  printf 'manutencao_status=%s\nmanutencao_s=%s\n' "$maintenance_state" "$maintenance_elapsed"
  case "$maintenance_state" in
    nao_iniciada) echo 'Janela de manutenção: não iniciada.' ;;
    encerrada|recuperada) printf 'Janela de manutenção até saúde confirmada: %s.\n' "$(format_duration "$maintenance_elapsed")" ;;
    *) printf 'Conclusão da manutenção não confirmada; %s decorridos até encerrar o script.\n' "$(format_duration "$maintenance_elapsed")" ;;
  esac
  printf 'healthcheck_candidato=%s\n' "$candidate_healthy"
  if [[ "$candidate_healthy" == 1 ]]; then
    echo 'Healthcheck Docker da candidata: confirmado.'
  else
    echo 'Healthcheck Docker da candidata: não confirmado.'
  fi
  printf 'backup_status=%s\nbackup_bytes=%s\n' "$backup_state" "$backup_bytes"
  if [[ "$backup_state" == catalogo_validado_checksum_gerado ]]; then
    printf 'backup_arquivo=%s/banco.dump\n' "$backup_dir"
    echo 'Backup: catálogo validado e checksum gerado; restauração não testada pelo script.'
  fi
  printf 'etapa_falha=%s\n' "${failed_phase:-nenhuma}"
  echo 'Etapas (tempo decorrido; não executada significa que não houve medição):'
  for name in "${phase_order[@]}"; do
    duration=${phase_times[$name]:-}
    if [[ -n "$duration" ]]; then
      printf '  %s: %s | %s (%s s)\n' "${phase_titles[$name]}" "${phase_results[$name]}" "$(format_duration "$duration")" "$duration"
    else
      printf '  %s: não executada\n' "${phase_titles[$name]}"
    fi
  done
  printf 'registros=%s\n' "${backup_dir:-indisponivel}"
}
summarize_exit() {
  local exit_code=$? finished_at total_elapsed maintenance_elapsed=0 report_file=indisponivel
  [[ "$BASHPID" == "$main_pid" ]] || return "$exit_code"
  trap - EXIT ERR INT TERM
  set +e
  if [[ "$result" == em_andamento ]]; then
    result=falha
    [[ -n "$failed_phase" ]] || failed_phase=$phase
  fi
  close_phase "$([[ "$exit_code" == 0 ]] && echo sucesso || echo falha)"
  finished_at="$(date -Is)"
  total_elapsed=$((SECONDS-total_started))
  if [[ "$maintenance_state" != nao_iniciada ]]; then
    if [[ "$maintenance_state" == encerrada || "$maintenance_state" == recuperada ]]; then
      maintenance_elapsed=$((downtime_finished-downtime_started))
    else
      maintenance_elapsed=$((SECONDS-downtime_started))
    fi
  fi
  print_summary >&3
  if [[ -n "$backup_dir" && -d "$backup_dir" ]]; then
    if print_summary > "$backup_dir/resumo.txt"; then
      report_file="$backup_dir/resumo.txt"
    else
      echo 'AVISO: não foi possível salvar o resumo; o resultado original da atualização foi preservado.' >&3
    fi
    if ! print_stages > "$backup_dir/etapas.tsv"; then
      echo 'AVISO: não foi possível salvar etapas.tsv.' >&3
    fi
  fi
  printf 'resumo_arquivo=%s\n' "$report_file" >&3
  exit "$exit_code"
}
publish_aliases() {
  # Comandos manuais posteriores usam latest quando APP_IMAGE_TAG não está no shell.
  # Só apontar esses aliases para a candidata depois de verificar saúde e imagem.
  docker tag "$tools_tag" appb2t-tools:latest
  docker tag "$candidate" appb2t-app:latest
}
already_current() {
  candidate="$(docker image inspect --format '{{.Id}}' "$app_tag" 2>/dev/null)" || return 1
  [[ "$candidate" == "$old_image" ]] || return 1
  [[ "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$candidate")" == "$revision" ]] || return 1
  [[ "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$tools_tag" 2>/dev/null)" == "$revision" ]] || return 1
  config_hash="$(docker compose config --hash app)" || return 1
  old_hash="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.config-hash"}}' "$app_id")" || return 1
  [[ "$config_hash" == "app $old_hash" ]] || return 1
  [[ "$(docker inspect --format '{{.State.Health.Status}}' "$app_id")" == healthy ]] || return 1
  docker compose run --rm --no-deps --pull never -T --interactive=false migrate ./node_modules/.bin/prisma migrate status > "$backup_dir/migration-status.log" 2>&1
}
finish_current() {
  candidate_healthy=1
  begin aliases
  publish_aliases
  end
  begin registro
  record_installation
  end
  result=sem_alteracoes
  echo "A versão candidata já está em execução e sem migrações pendentes. total_s=$((SECONDS-total_started)) indisponibilidade_s=0"
}
record_installation() {
  cp "$stage/compose.json" .b2t/b2t-compose-instalado.yaml.tmp
  mv .b2t/b2t-compose-instalado.yaml.tmp .b2t/b2t-compose-instalado.yaml
  printf '%s\n' "$candidate" > .b2t/b2t-imagem-instalada.txt
  docker inspect --format '{{index .Config.Labels "com.docker.compose.config-hash"}}' "${new_id:-$app_id}" > .b2t/b2t-config-hash-instalado.txt
  cp "$stage/manifest.json" .b2t/manifest-instalado.json.tmp
  mv .b2t/manifest-instalado.json.tmp .b2t/manifest-instalado.json
}
wait_healthy() {
  local deadline=$((SECONDS+180)) state
  while (( SECONDS < deadline )); do
    state="$(docker inspect --format '{{.State.Status}} {{.State.Health.Status}}' "$1")" || return 1
    case "$state" in
      'running healthy') return 0 ;;
      running\ *) sleep 2 ;;
      *) return 1 ;;
    esac
  done
  return 1
}
abort_update() {
  local code=$1
  [[ "$BASHPID" == "$main_pid" ]] || exit "$code"
  trap - ERR INT TERM
  result=${2:-falha}
  failed_phase=$phase
  close_phase "$result"
  echo "etapa=$phase status=falha duracao_s=$((SECONDS-phase_started)) backup=${backup_dir:-ausente}" >&2
  if [[ "$stopped" == 1 && "$migration_started" == 0 ]]; then
    begin recuperacao
    if docker start "$app_id" >/dev/null && wait_healthy "$app_id"; then
      downtime_finished=$SECONDS
      maintenance_state=recuperada
      end
      echo 'Aplicação anterior retomada; nenhuma migração foi iniciada.' >&2
    else
      close_phase falha
      echo 'Falha ao retomar a aplicação anterior. Intervenção manual necessária.' >&2
    fi
  elif [[ "$migration_started" == 1 ]]; then
    echo 'Migração foi iniciada: não há rollback automático. Confira o banco e a compatibilidade antes de recuperar.' >&2
  fi
  exit "$code"
}
fail() { local code=$?; abort_update "$code"; }
trap fail ERR
trap 'abort_update 130 interrompida' INT
trap 'abort_update 143 interrompida' TERM
trap summarize_exit EXIT

[[ -f .env ]] || { echo 'Arquivo .env ausente.' >&2; exit 1; }
revision="$(jq -r .sourceCommit "$stage/manifest.json")"
app_version="$(jq -r .appVersion "$stage/manifest.json")"
app_tag="$(jq -r .images.app.tag "$stage/manifest.json")"
tools_tag="$(jq -r .images.tools.tag "$stage/manifest.json")"
docker compose version >/dev/null
docker compose config --quiet
# Parse the installed CLI before any interruption.
docker compose run --rm --no-deps --pull never -T --interactive=false --help >/dev/null
docker compose exec -T --interactive=false --help >/dev/null
app_id="$(docker compose ps -q app)"
db_id="$(docker compose ps -q db)"
[[ -n "$app_id" && -n "$db_id" ]] || {
  echo 'Este comando exige aplicação e banco em execução. Consulte INSTALACAO_SERVIDOR.md.' >&2; exit 1;
}
old_image="$(docker inspect --format '{{.Image}}' "$app_id")"
docker image inspect "$old_image" >/dev/null || {
  echo 'Imagem da aplicação atual ausente no Docker. Preserve e valide uma imagem de recuperação antes de atualizar; a aplicação não foi parada.' >&2
  exit 1
}
mkdir -p backups
backup_dir="$(mktemp -d "$PWD/backups/atualizacao-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")"
# O log público não recebe configuração, inspect ou conteúdo do dump.
exec > >(tee -a "$backup_dir/atualizacao.log") 2>&1
exec 3>&1
echo "commit_candidato=$revision imagem_anterior=$old_image"
end

# Check the exact loaded delivery before interrupting the application.
begin verificacao_inicial
if already_current; then
  end
  finish_current
  exit 0
fi
end

begin verificacao_final
candidate="$(docker image inspect --format '{{.Id}}' "$app_tag")"
[[ -n "$candidate" ]]
config_hash="$(docker compose config --hash app)"
old_hash="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.config-hash"}}' "$app_id")"
if already_current; then
  end
  finish_current
  exit 0
fi
end

begin preservacao
cp .env "$backup_dir/ambiente.env"
cp "$stage/compose.json" "$backup_dir/compose-fonte-candidato.yaml"
docker compose config > "$backup_dir/compose-candidato.yaml"
printf '%s\n' "$revision" > "$backup_dir/commit-candidato.txt"
printf '%s\n' "$old_image" > "$backup_dir/imagem-anterior.txt"
printf '%s\n' "$candidate" > "$backup_dir/imagem-candidata.txt"
docker inspect "$app_id" > "$backup_dir/container-anterior.json"
if [[ -f .b2t/b2t-compose-instalado.yaml ]]; then
  if [[ -f .b2t/b2t-imagem-instalada.txt && -f .b2t/b2t-config-hash-instalado.txt ]] \
    && [[ "$(cat .b2t/b2t-imagem-instalada.txt)" == "$old_image" ]] \
    && [[ "$(cat .b2t/b2t-config-hash-instalado.txt)" == "$old_hash" ]]; then
    cp .b2t/b2t-compose-instalado.yaml "$backup_dir/compose-anterior.yaml"
  else
    cp .b2t/b2t-compose-instalado.yaml "$backup_dir/compose-ultima-publicacao-script.yaml"
    echo 'Configuração arquivada não confirmada para o container atual; revisar o inspect privado antes de recuperar.'
  fi
fi
docker tag "$old_image" "appb2t-app:antes-$(basename "$backup_dir")"
end

begin backup
downtime_started=$SECONDS
maintenance_state=nao_confirmada
backup_state=incompleto
stopped=1
docker compose stop app
# Streaming binário e pipefail: falha impede qualquer migração.
docker compose exec -T --interactive=false db pg_dump -U b2t -d b2t -Fc > "$backup_dir/banco.dump"
docker compose exec -T db pg_restore --list < "$backup_dir/banco.dump" > /dev/null
sha256sum "$backup_dir/banco.dump" > "$backup_dir/banco.dump.sha256"
backup_state=catalogo_validado_checksum_gerado
if backup_bytes="$(wc -c < "$backup_dir/banco.dump")"; then
  backup_bytes=${backup_bytes//[[:space:]]/}
else
  backup_bytes=nao_medido
fi
end

begin migracao
migration_started=1
docker compose run --rm --no-deps --pull never -T --interactive=false migrate
end
begin publicacao
docker compose up -d --no-deps --no-build --pull never --wait --wait-timeout 180 app
new_id="$(docker compose ps -q app)"
[[ -n "$new_id" && "$(docker inspect --format '{{.Image}}' "$new_id")" == "$candidate" ]]
[[ "$(docker inspect --format '{{.State.Health.Status}}' "$new_id")" == healthy ]]
candidate_healthy=1
downtime_finished=$SECONDS
maintenance_state=encerrada
end
begin aliases
publish_aliases
end
# Registro privado da configuração efetivamente publicada, para a próxima entrega.
begin registro
record_installation
printf '%s\n' "$revision" > "$backup_dir/commit-publicado.txt"
end
result=sucesso
echo "Nova versão em execução. commit=$revision imagem=$candidate"
echo "total_s=$((SECONDS-total_started)) indisponibilidade_s=$((downtime_finished-downtime_started)) backup=$backup_dir"
echo 'Confira login, rodapés, Atualizações e os fluxos usados pela equipe.'
