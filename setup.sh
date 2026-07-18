#!/bin/sh
# setup.sh — build, test, and install jupytermeow. POSIX sh.
#
#   ./setup.sh              run the behavior suite, build the lab extension,
#                           and pip-install it into the JupyterLab on PATH
#   ./setup.sh --core-only  only the behavior suite (no JupyterLab needed)
#   ./setup.sh --build-only build everything, install nothing
#   ./setup.sh --skip-build install the already-built extension
#   ./setup.sh -h           show this help and exit
#
# SPDX-License-Identifier: GPL-3.0-or-later

set -eu
cd "$(dirname "$0")"

core_only=0 do_build=1 do_install=1
while [ $# -gt 0 ]; do
    case "$1" in
        --core-only)  core_only=1 ;;
        --build-only) do_install=0 ;;
        --skip-build) do_build=0 ;;
        -h|--help)    sed -n '2,10p' "$0"; exit 0 ;;
        *) echo "unknown option: $1 (try --help)" >&2; exit 2 ;;
    esac
    shift
done

info() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mwarn:\033[0m %s\n' "$*" >&2; }

req_node=$(sed -n 's/^node *= *"\([0-9][0-9]*\).*/\1/p' mise.toml 2>/dev/null || true)
req_node=${req_node:-24}

node_ok() {
    nv=$(node --version 2>/dev/null | sed -n 's/^v\([0-9][0-9]*\).*/\1/p')
    [ -n "$nv" ] && [ "$nv" -ge "$req_node" ]
}

if node_ok; then
    RUN=""
elif command -v mise >/dev/null 2>&1; then
    RUN="mise exec --"
else
    echo "no way to build: need node >= $req_node or mise on the PATH" >&2
    exit 1
fi

if [ ! -d node_modules ]; then
    info "installing dependencies"
    $RUN npm install --no-audit --no-fund
fi

info "running the behavior suite"
$RUN npm test

if [ "$core_only" -eq 1 ]; then
    exit 0
fi

if ! command -v jupyter >/dev/null 2>&1; then
    warn "no jupyter on PATH — activate the environment that has JupyterLab, then rerun"
    exit 1
fi

if [ "$do_build" -eq 1 ]; then
    info "building the lab extension"
    $RUN npm run build:labextension
fi

if [ "$do_install" -eq 0 ]; then
    info "done — install later with: pip install ."
    exit 0
fi

info "installing into the environment of $(command -v jupyter)"
python3 -m pip install --quiet .
info "done — restart JupyterLab and you are in NORMAL mode"
jupyter labextension list 2>&1 | grep -i jupytermeow \
    || warn "jupytermeow is not visible in 'jupyter labextension list'"
