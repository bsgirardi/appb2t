#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

command -v flock >/dev/null || { echo 'Instale util-linux (flock) antes de continuar.' >&2; exit 1; }
exec 9>.git/b2t-atualizacao.lock
flock -n 9 || { echo 'Outra atualização está em andamento.' >&2; exit 1; }
phase=preflight
phase_started=$SECONDS
total_started=$SECONDS
backup_dir=''
stopped=0
migration_started=0
downtime_started=0
begin() {
  phase="$1"
  phase_started=$SECONDS
  echo "etapa=$phase status=inicio"
}
end() { echo "etapa=$phase status=sucesso duracao_s=$((SECONDS-phase_started))"; }
publish_aliases() {
  # Comandos manuais posteriores usam latest quando APP_IMAGE_TAG não está no shell.
  # Só apontar esses aliases para a candidata depois de verificar saúde e imagem.
  docker tag "appb2t-tools:$revision" appb2t-tools:latest
  docker tag "$candidate" appb2t-app:latest
}
already_current() {
  candidate="$(docker image inspect --format '{{.Id}}' "appb2t-app:$revision" 2>/dev/null)" || return 1
  [[ "$candidate" == "$old_image" ]] || return 1
  [[ "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$candidate")" == "$revision" ]] || return 1
  [[ "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "appb2t-tools:$revision" 2>/dev/null)" == "$revision" ]] || return 1
  config_hash="$(docker compose config --hash app)" || return 1
  old_hash="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.config-hash"}}' "$app_id")" || return 1
  [[ "$config_hash" == "app $old_hash" ]] || return 1
  [[ "$(docker inspect --format '{{.State.Health.Status}}' "$app_id")" == healthy ]] || return 1
  docker compose run --rm --no-deps --pull never -T --interactive=false migrate ./node_modules/.bin/prisma migrate status > "$backup_dir/migration-status.log" 2>&1
}
finish_current() {
  publish_aliases
  echo "A versão candidata já está em execução e sem migrações pendentes. total_s=$((SECONDS-total_started)) indisponibilidade_s=0"
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
fail() {
  local code=$?
  trap - ERR
  echo "etapa=$phase status=falha duracao_s=$((SECONDS-phase_started)) backup=${backup_dir:-ausente}" >&2
  if [[ "$stopped" == 1 && "$migration_started" == 0 ]]; then
    if docker start "$app_id" >/dev/null && wait_healthy "$app_id"; then
      echo 'Aplicação anterior retomada; nenhuma migração foi iniciada.' >&2
    else
      echo 'Falha ao retomar a aplicação anterior. Intervenção manual necessária.' >&2
    fi
  elif [[ "$migration_started" == 1 ]]; then
    echo 'Migração foi iniciada: não há rollback automático. Confira o banco e a compatibilidade antes de recuperar.' >&2
  fi
  exit "$code"
}
trap fail ERR

[[ -f .env ]] || { echo 'Arquivo .env ausente.' >&2; exit 1; }
[[ "$(git branch --show-current)" == main ]] || { echo 'Use a branch main para atualizar o servidor.' >&2; exit 1; }
[[ -z "$(git status --porcelain --untracked-files=normal)" ]] || {
  echo 'Existem alterações locais. Revise git status antes de atualizar.' >&2; exit 1;
}
revision="$(git rev-parse HEAD)"
export APP_IMAGE_TAG="$revision"
docker compose version >/dev/null
docker compose config --quiet
# Parse the actual installed CLI before any build or interruption.
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
echo "commit_candidato=$revision imagem_anterior=$old_image"
end

# Check immutable commit images before rebuilding: attestations may change image IDs.
if already_current; then
  finish_current
  exit 0
fi

begin build_tools
docker compose --progress plain build --build-arg "APP_REVISION=$revision" migrate
docker image inspect "appb2t-tools:$revision" >/dev/null
end
begin build_app
docker compose --progress plain build --build-arg "APP_REVISION=$revision" app
end
candidate="$(docker image inspect --format '{{.Id}}' "appb2t-app:$revision")"
[[ -n "$candidate" ]]
config_hash="$(docker compose config --hash app)"
old_hash="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.config-hash"}}' "$app_id")"
if already_current; then
  finish_current
  exit 0
fi

begin preservacao
cp .env "$backup_dir/ambiente.env"
cp compose.yaml "$backup_dir/compose-fonte-candidato.yaml"
docker compose config > "$backup_dir/compose-candidato.yaml"
printf '%s\n' "$revision" > "$backup_dir/commit-candidato.txt"
printf '%s\n' "$old_image" > "$backup_dir/imagem-anterior.txt"
printf '%s\n' "$candidate" > "$backup_dir/imagem-candidata.txt"
docker inspect "$app_id" > "$backup_dir/container-anterior.json"
if [[ -f .git/b2t-compose-instalado.yaml ]]; then
  if [[ -f .git/b2t-imagem-instalada.txt && -f .git/b2t-config-hash-instalado.txt ]] \
    && [[ "$(cat .git/b2t-imagem-instalada.txt)" == "$old_image" ]] \
    && [[ "$(cat .git/b2t-config-hash-instalado.txt)" == "$old_hash" ]]; then
    cp .git/b2t-compose-instalado.yaml "$backup_dir/compose-anterior.yaml"
  else
    cp .git/b2t-compose-instalado.yaml "$backup_dir/compose-ultima-publicacao-script.yaml"
    echo 'Configuração arquivada não confirmada para o container atual; revisar o inspect privado antes de recuperar.'
  fi
fi
docker tag "$old_image" "appb2t-app:antes-$(basename "$backup_dir")"
end

begin backup
downtime_started=$SECONDS
stopped=1
docker compose stop app
# Streaming binário e pipefail: falha impede qualquer migração.
docker compose exec -T --interactive=false db pg_dump -U b2t -d b2t -Fc > "$backup_dir/banco.dump"
docker compose exec -T db pg_restore --list < "$backup_dir/banco.dump" > /dev/null
sha256sum "$backup_dir/banco.dump" > "$backup_dir/banco.dump.sha256"
end

begin migracao
migration_started=1
docker compose run --rm --no-deps --pull never -T --interactive=false migrate
end
begin publicacao
docker compose up -d --no-deps --no-build --wait --wait-timeout 180 app
new_id="$(docker compose ps -q app)"
[[ -n "$new_id" && "$(docker inspect --format '{{.Image}}' "$new_id")" == "$candidate" ]]
[[ "$(docker inspect --format '{{.State.Health.Status}}' "$new_id")" == healthy ]]
publish_aliases
end
# Registro privado da configuração efetivamente publicada, para a próxima entrega.
cp "$backup_dir/compose-candidato.yaml" .git/b2t-compose-instalado.yaml.tmp
mv .git/b2t-compose-instalado.yaml.tmp .git/b2t-compose-instalado.yaml
printf '%s\n' "$candidate" > .git/b2t-imagem-instalada.txt
docker inspect --format '{{index .Config.Labels "com.docker.compose.config-hash"}}' "$new_id" > .git/b2t-config-hash-instalado.txt
printf '%s\n' "$revision" > "$backup_dir/commit-publicado.txt"
echo "Nova versão em execução. commit=$revision imagem=$candidate"
echo "total_s=$((SECONDS-total_started)) indisponibilidade_s=$((SECONDS-downtime_started)) backup=$backup_dir"
echo 'Confira login, rodapés, Atualizações e os fluxos usados pela equipe.'
