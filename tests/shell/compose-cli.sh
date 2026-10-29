#!/usr/bin/env bash
# Real CLI regression: supported flags, closed stdin and no implicit build.
set -Eeuo pipefail
: "${B2T_TEST_IMAGE:?Informe uma imagem local já construída para o ensaio}"
docker image inspect "$B2T_TEST_IMAGE" >/dev/null
work="$(mktemp -d)"
trap 'rm -f -- "$work/compose.yaml" "$work/output"; rmdir -- "$work"' EXIT
cat > "$work/compose.yaml" <<YAML
services:
  migrate:
    image: $B2T_TEST_IMAGE
    build:
      context: ./contexto-inexistente-nao-deve-ser-construido
    network_mode: none
    command: [node, '-e', "console.log('compose-run-compatible')"]
YAML
docker compose -p "appb2t-cli-$RANDOM" -f "$work/compose.yaml" run --rm --no-deps --pull never -T --interactive=false migrate < /dev/null > "$work/output"
grep -q compose-run-compatible "$work/output"
echo 'PASS CLI real: run sem TTY/stdin/pull ou build implícito'
