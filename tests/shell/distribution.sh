#!/usr/bin/env bash
set -Eeuo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
export work repo
mkdir -p "$work/bin" "$work/assets" "$work/install"
export PATH="$work/bin:$PATH" LOG="$work/commands.log"
export commit=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
export image=sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
export release=app-v1.21.0-bbbbbbbbbbbb-test
printf 'github_test_sentinel' > "$work/token"; chmod 600 "$work/token"
touch "$work/install/.env" "$work/install/compose.yaml"
cat > "$work/bin/curl" <<'MOCK'
#!/usr/bin/env bash
set -eu
if [[ "$1" == --version ]]; then echo 'curl 7.88.1'; exit; fi
[[ "$CASE" != network && "$CASE" != unauthorized ]] || exit 22
url='' out=''
while (($#)); do
  case "$1" in https:*) url=$1 ;; -o) shift; out=$1 ;; esac
  shift
done
case "$url" in
 */assets/1) cp "$work/assets/manifest.json" "$out" ;;
 */assets/2) cp "$work/assets/images.tar.gz" "$out"; [[ "$CASE" != corrupt ]] || echo corruption >> "$out" ;;
 */assets/3) cp "$work/assets/compose.production.yaml" "$out" ;;
 */releases/tags/*) cp "$work/assets/release.json" "$out" ;;
 *) printf '{"private":true,"full_name":"owner/delivery"}' > "$out" ;;
esac
MOCK
cat > "$work/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -eu
echo "$*" >> "$LOG"
case "$1" in
 info) [[ "$*" != *DockerRootDir* ]] || { echo "$work"; exit; }; [[ "$CASE" != platform ]] && echo linux/x86_64 || echo linux/aarch64 ;;
 load) [[ "$CASE" != load ]] ;;
 run) echo 1.21.0 ;;
 image)
  if [[ "$*" == *--format* ]]; then
    [[ "$*" != *org.opencontainers* ]] && echo "$image" || echo "$commit"
  elif [[ "$*" == *appb2t-* ]]; then
    jq -n --arg id "$image" --arg commit "$commit" '[{Id:$id,Os:"linux",Architecture:"amd64",Config:{User:"node",Labels:{"org.opencontainers.image.revision":$commit}}}]'
  fi ;;
 inspect)
  if [[ "$*" == *--format* ]]; then
    case "$*" in
      *'{{.Image}}'*) [[ -f "$work/published" || "$CASE" == noop ]] && echo "$image" || echo sha256:old ;;
      *'{{.State.Status}} {{.State.Health.Status}}'*) echo 'running healthy' ;;
      *'{{.State.Health.Status}}'*) [[ "$CASE" != wronghealth ]] && echo healthy || echo unhealthy ;;
      *config-hash*) echo config123 ;;
    esac
  else
    name=appb2t_postgres_data; [[ "$CASE" != volume ]] || name=another_volume
    env='[]'; [[ "$CASE" != dollar ]] || env='["ART_ACCESS_KEY=review$synthetic"]'
    jq -n --arg name "$name" --argjson env "$env" '[{Image:"sha256:old",State:{Running:true},Config:{Env:$env,Labels:{"com.docker.compose.project":"appb2t"}},Mounts:[],HostConfig:{PortBindings:{}},NetworkSettings:{Networks:{}}},{State:{Running:true},Config:{Labels:{"com.docker.compose.project":"appb2t"}},Mounts:[{Type:"volume",Name:$name,Destination:"/var/lib/postgresql/data"}]}]'
  fi ;;
 compose)
  all_profiles=0; [[ " $* " != *" --profile * "* ]] || all_profiles=1
  shift
  while [[ "${1:-}" == --* || "${1:-}" == -f ]]; do shift 2; done
  case "$*" in
    'config --format json')
      jq -n --arg case "$CASE" --argjson profiles "$all_profiles" '{name:"appb2t",services:{app:{image:"appb2t-app:latest"},migrate:{image:"appb2t-tools:latest"},admin:{image:"appb2t-tools:latest"},db:{image:"postgres:17-alpine",volumes:[{type:"volume",source:"postgres_data",target:"/var/lib/postgresql/data"}]}},volumes:{postgres_data:{name:"appb2t_postgres_data"}}} | if $case=="profile" and $profiles==0 then del(.services.admin) else . end | if $case=="dollar" then .services.app.environment={ART_ACCESS_KEY:"review$$synthetic"} else . end' ;;
    'config --hash app') echo 'app config123' ;;
    'ps -q app') echo app ;;
    'ps -q db') echo db ;;
    *'prisma migrate status'*) [[ "$CASE" == noop ]] ;;
    'stop app') [[ "$CASE" != stop ]] ;;
    *pg_dump*) [[ "$CASE" != backup ]] && echo dump ;;
    *pg_restore*) cat >/dev/null ;;
    'run --rm --no-deps --pull never -T --interactive=false migrate') [[ "$CASE" != migration ]] ;;
    'up -d --no-deps --no-build --pull never --wait --wait-timeout 180 app') [[ "$CASE" != health ]] && touch "$work/published" ;;
  esac ;;
esac
MOCK
chmod +x "$work/bin/"*
cat > "$work/bin/df" <<'MOCK'
#!/usr/bin/env bash
if [[ "$CASE" == disk ]]; then printf 'Filesystem 1B-blocks Used Available Use%% Mounted\nmock 100 99 1 99%% /\n'; else /bin/df "$@"; fi
MOCK
chmod +x "$work/bin/df"
for release in 1.21.0 app-v1.21.0-bbbbbbbbbbbb-test; do
for CASE in success profile dollar noop network unauthorized corrupt platform manifest version imagepair missing disk volume load stop backup migration health wronghealth; do
  export CASE
  : > "$LOG"; rm -f "$work/published"
  printf images > "$work/assets/images.tar.gz"
  cp "$repo/compose.production.yaml" "$work/assets/compose.production.yaml"
  jq -n --arg release "$release" --arg commit "$commit" --arg id "$image" '{schemaVersion:1,release:$release,appVersion:"1.21.0",sourceRepository:"bsgirardi/appb2t",sourceCommit:$commit,platform:"linux/amd64",baseReference:("node:22-bookworm-slim@"+$id),images:{app:{tag:"appb2t-app:app-v1.21.0-bbbbbbbbbbbb-test",imageId:$id,sizeBytes:1024},tools:{tag:"appb2t-tools:app-v1.21.0-bbbbbbbbbbbb-test",imageId:$id,sizeBytes:2048}},files:[]}' > "$work/meta"
  files='[]'
  for name in images.tar.gz compose.production.yaml; do
    files=$(jq --arg name "$name" --arg sha "$(sha256sum "$work/assets/$name" | cut -d' ' -f1)" --argjson size "$(stat -c %s "$work/assets/$name")" '. + [{name:$name,sha256:$sha,sizeBytes:$size}]' <<< "$files")
  done
  jq --argjson files "$files" '.files=$files' "$work/meta" > "$work/assets/manifest.json"
  if [[ "$CASE" == manifest ]]; then jq '.files[0].name="../oops"' "$work/assets/manifest.json" > "$work/m"; mv "$work/m" "$work/assets/manifest.json"; fi
  if [[ "$CASE" == version ]]; then jq '.release="1.21.1"' "$work/assets/manifest.json" > "$work/m"; mv "$work/m" "$work/assets/manifest.json"; fi
  if [[ "$CASE" == imagepair ]]; then jq '.images.tools.tag="appb2t-tools:app-v1.21.0-bbbbbbbbbbbb-other"' "$work/assets/manifest.json" > "$work/m"; mv "$work/m" "$work/assets/manifest.json"; fi
  assets='[]'; n=0
  for name in manifest.json images.tar.gz compose.production.yaml; do
    n=$((n+1)); assets=$(jq --arg name "$name" --arg sha "$(sha256sum "$work/assets/$name" | cut -d' ' -f1)" --argjson id "$n" --argjson size "$(stat -c %s "$work/assets/$name")" '. + [{id:$id,name:$name,size:$size,digest:("sha256:"+$sha),state:"uploaded"}]' <<< "$assets")
  done
  jq -n --arg tag "$release" --argjson assets "$assets" '{tag_name:$tag,draft:false,prerelease:false,assets:$assets}' > "$work/assets/release.json"
  if [[ "$CASE" == missing ]]; then jq '.assets |= .[0:2]' "$work/assets/release.json" > "$work/r"; mv "$work/r" "$work/assets/release.json"; fi
  if bash "$repo/scripts/distribution/update.sh" --repository owner/delivery --release "$release" --installation "$work/install" --token-file "$work/token" > "$work/output" 2>&1; then
    [[ "$CASE" =~ ^(success|profile|dollar|noop)$ ]] || { cat "$work/output"; exit 1; }
  else
    [[ ! "$CASE" =~ ^(success|profile|dollar|noop)$ ]] || { cat "$work/output"; exit 1; }
  fi
  if grep -Eq '(^| )(build|pull)( |$)' "$LOG"; then cat "$LOG"; exit 1; fi
  if grep -q github_test_sentinel "$work/output" "$LOG"; then echo 'Token exposto'; exit 1; fi
  case "$CASE" in
    network|unauthorized|corrupt|platform|manifest|version|imagepair|missing|disk|volume|load|noop) if grep -q 'stop app' "$LOG"; then cat "$LOG"; exit 1; fi ;;
    backup|stop) grep -q '^start app' "$LOG" ;;
    migration|health) if grep -q '^start app' "$LOG"; then exit 1; fi ;;
    success) grep -q 'Nova versão em execução' "$work/output"; test -f "$work/install/.b2t/manifest-instalado.json" ;;
  esac
  if [[ "$CASE" =~ ^(success|profile|dollar|noop)$ ]]; then
    grep -q 'tag appb2t-tools:app-v1.21.0-bbbbbbbbbbbb-test appb2t-tools:latest' "$LOG"
    if grep -Eq 'appb2t-(app|tools):1\.21\.0( |$)' "$LOG"; then cat "$LOG"; exit 1; fi
  fi
  echo "PASS $release $CASE"
done
done
