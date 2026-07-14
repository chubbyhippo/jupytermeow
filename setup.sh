#!/bin/sh
# setup.sh — build and test the jupytermeow core. POSIX sh.
#
#   ./setup.sh              run the engine behavior suite (tsc + node:test)
#   ./setup.sh -h           show this help and exit
#
# The core is headless — no JupyterLab download needed. The JupyterLab
# adapter (a prebuilt lab extension wrapping every CodeMirror 6 editor) is
# staged; its build and install steps will land here with it.
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -eu
cd "$(dirname "$0")"

case "${1:-}" in
  -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
  "") ;;
  *) echo "unknown option: $1 (try --help)" >&2; exit 2 ;;
esac

req_node=$(sed -n 's/^node *= *"\([0-9][0-9]*\).*/\1/p' mise.toml 2>/dev/null || true)
req_node=${req_node:-24}

node_ok() {
    nv=$(node --version 2>/dev/null | sed -n 's/^v\([0-9][0-9]*\).*/\1/p')
    [ -n "$nv" ] && [ "$nv" -ge "$req_node" ]
}

run() {
    if [ ! -d node_modules ]; then "$@" npm install --no-audit --no-fund; fi
    "$@" npm test
}

if node_ok; then
    run env
elif command -v mise >/dev/null 2>&1; then
    run mise exec --
else
    echo "no way to run: need node >= $req_node or mise on the PATH" >&2
    exit 1
fi
