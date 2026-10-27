#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

command -v flock >/dev/null || { echo 'Instale util-linux (flock) antes de continuar.' >&2; exit 1; }
exec 9>.git/b2t-atualizacao.lock
flock -n 9 || { echo 'Outra atualização está em andamento.' >&2; exit 1; }
phase='verificação inicial'
backup_dir=''
trap 'echo "Falha na etapa: $phase. Backup: ${backup_dir:-ainda não criado}. Confira docker compose logs --tail 100 app migrate db. A aplicação pode estar parada; não há restauração automática." >&2' ERR

[[ -f .env ]] || { echo 'Arquivo .env ausente. Configure a instalação antes de atualizar.' >&2; exit 1; }
docker compose version >/dev/null
docker compose config --quiet
app_id="$(docker compose ps -q app)"
db_id="$(docker compose ps -q db)"
[[ -n "$app_id" && -n "$db_id" ]] || {
  echo 'Este comando atualiza uma instalação em execução. Para instalar do zero, consulte INSTALACAO_SERVIDOR.md.' >&2
  exit 1
}
old_image="$(docker inspect --format '{{.Image}}' "$app_id")"

phase='construção das imagens (aplicação continua disponível)'
COMPOSE_PARALLEL_LIMIT=1 docker compose build app migrate

phase='preservação da versão anterior'
mkdir -p backups
backup_dir="$(mktemp -d "$PWD/backups/atualizacao-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")"
cp .env "$backup_dir/ambiente.env"
cp compose.yaml "$backup_dir/compose-novo.yaml"
git rev-parse HEAD > "$backup_dir/commit-novo.txt"
printf '%s\n' "$old_image" > "$backup_dir/imagem-anterior.txt"
docker inspect "$app_id" > "$backup_dir/container-anterior.json"
docker tag "$old_image" "appb2t-app:antes-$(basename "$backup_dir")"

phase='backup do banco com aplicação parada'
docker compose stop app
# Streaming binário no Bash; pipefail impede prosseguir com dump incompleto.
docker compose exec -T db pg_dump -U b2t -d b2t -Fc > "$backup_dir/banco.dump"
docker compose exec -T db pg_restore --list < "$backup_dir/banco.dump" > /dev/null
sha256sum "$backup_dir/banco.dump" > "$backup_dir/banco.dump.sha256"

phase='migrações do banco'
docker compose run --rm --no-deps migrate
phase='inicialização e verificação de saúde'
docker compose up -d --no-deps --wait --wait-timeout 180 app
docker compose ps
echo "Nova versão em execução. Backup preservado em: $backup_dir"
echo 'Confira o login, o rodapé e a página Atualizações antes de liberar o atendimento.'
