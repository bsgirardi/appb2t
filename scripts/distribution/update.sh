#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
fail() { echo "$1" >&2; exit 1; }
repository='' release='' installation='' token_file=''
while (($#)); do
  (($# >= 2)) || fail 'Opção sem valor.'
  case "$1" in
    --repository) repository=$2 ;; --release) release=$2 ;;
    --installation) installation=$2 ;; --token-file) token_file=$2 ;;
    *) fail 'Opção desconhecida.' ;;
  esac
  shift 2
done
[[ "$repository" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ && "$release" =~ ^app-v[0-9]+\.[0-9]+\.[0-9]+-[a-f0-9]{12}-[A-Za-z0-9][A-Za-z0-9._-]{0,39}$ ]] || fail 'Informe repositório e entrega explícitos.'
for tool in docker flock curl jq gzip sha256sum stat df; do command -v "$tool" >/dev/null || fail "Dependência ausente: $tool"; done
curl_version=$(curl --version | head -n 1)
[[ "$curl_version" =~ ^curl\ ([0-9]+)\.([0-9]+)\. ]] || fail 'Versão do curl não identificada.'
(( BASH_REMATCH[1] > 7 || (BASH_REMATCH[1] == 7 && BASH_REMATCH[2] >= 76) )) || fail 'Requer curl 7.76 ou superior.'
[[ -d "$installation" && -f "$installation/.env" && -f "$installation/compose.yaml" ]] || fail 'Instalação deve conter .env e compose.yaml revisados.'
installation="$(cd -- "$installation" && pwd -P)"
[[ -f "$token_file" && ! -L "$token_file" && "$(stat -c %a "$token_file")" == 600 && "$(stat -c %u "$token_file")" == "$(id -u)" ]] || fail 'Credencial deve ser arquivo próprio com permissão 600.'
token=$(<"$token_file")
[[ "$token" =~ ^[A-Za-z0-9_]+$ ]] || fail 'Formato da credencial inválido.'
mkdir -p "$installation/.b2t"
exec 9>"$installation/.b2t/update.lock"
flock -n 9 || fail 'Outra atualização está em andamento.'
stage="$(mktemp -d "$installation/.b2t/download-XXXXXX")"
cleanup() { rm -f -- "$stage/auth.curl"; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
printf 'header = "Authorization: Bearer %s"\n' "$token" > "$stage/auth.curl"
unset token
fetch() {
  local url=$1 output=$2 limit=$3 accept=${4:-application/vnd.github+json}
  # curl strips Authorization on cross-host redirects. Never use --location-trusted.
  curl --config "$stage/auth.curl" --silent --show-error --fail --location \
    --proto '=https' --proto-redir '=https' --connect-timeout 20 --max-time 1800 \
    --retry 2 --retry-all-errors --max-filesize "$limit" -H "Accept: $accept" \
    "$url" -o "$output.part"
  [[ "$(stat -c %s "$output.part")" -le "$limit" ]]
  mv -- "$output.part" "$output"
}
download_started=$SECONDS
echo 'etapa=download status=inicio'
fetch "https://api.github.com/repos/$repository" "$stage/repository.json" 65536
jq -e --arg repo "$repository" '.private == true and (.full_name | ascii_downcase) == ($repo | ascii_downcase)' "$stage/repository.json" >/dev/null || fail 'Repositório privado não confirmado.'
fetch "https://api.github.com/repos/$repository/releases/tags/$release" "$stage/release.json" 1048576
jq -e --arg tag "$release" '.tag_name == $tag and .draft == false and .prerelease == false and (.assets | length == 3) and ([.assets[].name] | sort == ["compose.production.yaml","images.tar.gz","manifest.json"]) and all(.assets[]; (.id | type == "number" and . > 0 and . == floor) and .state == "uploaded" and (.size | type == "number" and . > 0 and . < 2147483648) and (.digest | type == "string" and test("^sha256:[a-f0-9]{64}$")))' "$stage/release.json" >/dev/null || fail 'Release inválida ou incompleta.'
asset() {
  local name=$1 limit=$2 asset_id expected_size expected_sha
  asset_id=$(jq -r --arg name "$name" '.assets[] | select(.name == $name) | .id' "$stage/release.json")
  expected_size=$(jq -r --arg name "$name" '.assets[] | select(.name == $name) | .size' "$stage/release.json")
  expected_sha=$(jq -r --arg name "$name" '.assets[] | select(.name == $name) | .digest | ltrimstr("sha256:")' "$stage/release.json")
  (( expected_size <= limit )) || fail 'Asset excede o limite permitido.'
  fetch "https://api.github.com/repos/$repository/releases/assets/$asset_id" "$stage/$name" "$limit" application/octet-stream
  [[ "$(stat -c %s "$stage/$name")" == "$expected_size" && "$(sha256sum "$stage/$name" | cut -d' ' -f1)" == "$expected_sha" ]] || fail 'Asset com tamanho/checksum incorreto.'
}
asset manifest.json 65536
jq -e -f "$script_dir/validate-manifest.jq" "$stage/manifest.json" >/dev/null || fail 'Manifesto inválido.'
[[ "$(jq -r .release "$stage/manifest.json")" == "$release" ]] || fail 'Entrega não corresponde ao manifesto.'
platform=$(docker info --format '{{.OSType}}/{{.Architecture}}')
platform=${platform/x86_64/amd64}; platform=${platform/aarch64/arm64}
[[ "$platform" == "$(jq -r .platform "$stage/manifest.json")" ]] || fail 'Plataforma incompatível.'
docker_root=$(docker info --format '{{.DockerRootDir}}')
[[ -d "$docker_root" ]] || fail 'DockerRootDir inacessível para medir espaço.'
required=$(jq '[.images[].sizeBytes] | add * 3 + 1073741824' "$stage/manifest.json")
archive_bytes=$(jq '.files[] | select(.name=="images.tar.gz") | .sizeBytes' "$stage/manifest.json")
free_bytes() { df -PB1 -- "$1" | awk 'NR==2 {print $4}'; }
(( $(free_bytes "$stage") >= required + archive_bytes && $(free_bytes "$docker_root") >= required + archive_bytes )) || fail 'Espaço livre insuficiente para importar com segurança.'
for name in images.tar.gz compose.production.yaml; do
  size=$(jq -r --arg name "$name" '.files[] | select(.name == $name) | .sizeBytes' "$stage/manifest.json")
  sha=$(jq -r --arg name "$name" '.files[] | select(.name == $name) | .sha256' "$stage/manifest.json")
  asset "$name" "$size"
  [[ "$(sha256sum "$stage/$name" | cut -d' ' -f1)" == "$sha" ]] || fail 'Checksum não corresponde ao manifesto.'
done
cleanup
echo "etapa=download status=sucesso duracao_s=$((SECONDS-download_started))"
compose=(docker compose --project-directory "$installation" --env-file "$installation/.env" -f "$installation/compose.yaml")
"${compose[@]}" --profile '*' config --format json > "$stage/installed.json"
# Serialized Compose escapes literal dollars for re-parsing. Only the comparison
# copy is unescaped; compose.json keeps Docker's original escaped representation.
jq 'walk(if type == "string" then gsub("\\$\\$"; "$" ) else . end)' "$stage/installed.json" > "$stage/comparison.json"
# Keep the installed environment, mounts, database, ports and project identity.
# The delivered Compose is a reviewed bootstrap reference, never an override of data paths.
jq -e '.name and .services.app and .services.db and .services.migrate and .services.admin' "$stage/installed.json" >/dev/null || fail 'Compose instalado incompatível.'
app_id=$("${compose[@]}" ps -q app); db_id=$("${compose[@]}" ps -q db)
[[ -n "$app_id" && -n "$db_id" ]] || fail 'Aplicação e banco devem estar em execução.'
docker inspect "$app_id" "$db_id" > "$stage/containers.json"
project=$(jq -r .name "$stage/installed.json")
jq -e --arg project "$project" 'length==2 and all(.[]; .State.Running == true and .Config.Labels["com.docker.compose.project"] == $project)' "$stage/containers.json" >/dev/null || fail 'Identidade da instalação incompatível.'
# Fail on runtime drift instead of silently changing live settings from a stale Compose.
jq -e --slurpfile config "$stage/comparison.json" '
  .[0] as $live | $config[0] as $c |
  all(($c.services.app.environment // {} | to_entries)[]; . as $e | ($live.Config.Env | index($e.key + "=" + ($e.value|tostring))) != null) and
  (($live.Mounts // [] | length) == ($c.services.app.volumes // [] | length)) and
  all(($c.services.app.volumes // [])[]; . as $v |
    if .type=="bind" then any($live.Mounts[]; .Type=="bind" and .Source==$v.source and .Destination==$v.target and .RW==($v.read_only!=true))
    elif .type=="volume" then any($live.Mounts[]; .Type=="volume" and .Name==$c.volumes[$v.source].name and .Destination==$v.target and .RW==($v.read_only!=true)) else false end) and
  all(($c.services.app.ports // [])[]; . as $p | any($live.HostConfig.PortBindings[(($p.target|tostring)+"/"+($p.protocol//"tcp"))][]; .HostPort==($p.published|tostring) and .HostIp==($p.host_ip//"0.0.0.0"))) and
  (($live.NetworkSettings.Networks // {} | keys | sort) == ([($c.services.app.networks // {} | keys)[] as $n | $c.networks[$n].name] | sort))
' "$stage/containers.json" >/dev/null || fail 'Ambiente, mounts, portas ou redes divergem do Compose instalado; revisar antes de atualizar.'
old_image=$(jq -r '.[0].Image' "$stage/containers.json")
docker image inspect "$old_image" >/dev/null || fail 'Imagem anterior indisponível para recuperação.'
# Resolve Docker's named-volume source before comparing it with the live database mount.
db_target=$(jq -r '.services.db.volumes | if length==1 then .[0].target else error("Mounts do banco exigem revisão") end' "$stage/installed.json")
db_type=$(jq -r '.services.db.volumes[0].type' "$stage/installed.json")
db_source=$(jq -r '.services.db.volumes[0].source' "$stage/comparison.json")
if [[ "$db_type" == volume ]]; then
  db_source=$(jq -er --arg source "$db_source" '.volumes[$source].name' "$stage/comparison.json")
  jq -e --arg target "$db_target" --arg source "$db_source" '.[1].Mounts | any(.Destination==$target and .Type=="volume" and .Name==$source)' "$stage/containers.json" >/dev/null || fail 'Volume do banco diverge da instalação.'
elif [[ "$db_type" == bind ]]; then
  jq -e --arg target "$db_target" --arg source "$db_source" '.[1].Mounts | any(.Destination==$target and .Type=="bind" and .Source==$source)' "$stage/containers.json" >/dev/null || fail 'Bind do banco diverge da instalação.'
else fail 'Tipo de armazenamento do banco não suportado.'; fi
app_tag=$(jq -r .images.app.tag "$stage/manifest.json"); tools_tag=$(jq -r .images.tools.tag "$stage/manifest.json")
jq --arg app "$app_tag" --arg tools "$tools_tag" '.services |= with_entries(.value |= (del(.build) | .pull_policy="never")) | .services.app.image=$app | .services.migrate.image=$tools | .services.admin.image=$tools' "$stage/installed.json" > "$stage/compose.json"
docker compose --project-directory "$installation" --env-file "$installation/.env" -f "$stage/compose.json" config --quiet
import_started=$SECONDS
echo 'etapa=importacao status=inicio'
docker load --input "$stage/images.tar.gz"
for name in app tools; do
  tag=$(jq -r --arg name "$name" '.images[$name].tag' "$stage/manifest.json")
  expected=$(jq -r --arg name "$name" '.images[$name].imageId' "$stage/manifest.json")
  docker image inspect "$tag" > "$stage/image-$name.json"
  jq -e --arg expected "$expected" --arg commit "$(jq -r .sourceCommit "$stage/manifest.json")" --arg platform "$(jq -r .platform "$stage/manifest.json")" 'length==1 and .[0].Id==$expected and .[0].Config.Labels["org.opencontainers.image.revision"]==$commit and (.[0].Os + "/" + .[0].Architecture)==$platform and .[0].Config.User!="" and .[0].Config.User!="root" and .[0].Config.User!="0"' "$stage/image-$name.json" >/dev/null || fail 'Identidade da imagem incorreta.'
done
actual_version=$(docker run --rm --network none --pull never --entrypoint node "$app_tag" -p 'require("./package.json").version')
[[ "$actual_version" == "$(jq -r .appVersion "$stage/manifest.json")" ]] || fail 'Versão interna da imagem incorreta.'
echo "etapa=importacao status=sucesso duracao_s=$((SECONDS-import_started))"
bash "$script_dir/deploy.sh" "$installation" "$stage"
