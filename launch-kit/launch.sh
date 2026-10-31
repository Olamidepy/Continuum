#!/usr/bin/env bash
# One command: setup → build → publish sources → final build → preflight → submit (asks first).
# Needs ETH_RPC_URL and PROGRAMMABLE_API_KEY exported. Never signs or sends a transaction.
set -euo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAUNCH_DIR="${LAUNCH_DIR:-$HOME/continuum-launch}"
REPO="Olamidepy/continuum-launch"

: "${ETH_RPC_URL:?Run first:  read -rs ETH_RPC_URL && export ETH_RPC_URL}"
: "${PROGRAMMABLE_API_KEY:?Run first:  read -rs PROGRAMMABLE_API_KEY && export PROGRAMMABLE_API_KEY}"

bash "$KIT/setup.sh"

echo; echo "── Build (draft)"
node "$KIT/build-launch.mjs" >/dev/null   # stops here on any error (bad RPC key, changed rules, ...)
[ -d "$LAUNCH_DIR/src" ] || { echo "✖ The draft build didn't write the contract sources."; exit 1; }

echo; echo "── Publish the contract sources to github.com/$REPO"
cd "$LAUNCH_DIR"
git add -A
git diff --cached --quiet || git commit -q -m "Continuum protected launch sources"
if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  gh auth setup-git >/dev/null 2>&1 || true
  gh repo view "$REPO" >/dev/null 2>&1 || gh repo create "$REPO" --public --description "Continuum (CNTM) protected launch sources" >/dev/null
fi
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$REPO.git"
git rev-parse -q --verify HEAD >/dev/null || { echo "✖ Nothing committed to publish."; exit 1; }
git push -q -u origin main

echo; echo "── Build (final)"
node "$KIT/build-launch.mjs"

bash "$KIT/submit.sh"
