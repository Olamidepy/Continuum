#!/usr/bin/env bash
# Installs Programmable's verified @programmable/launch 4.1.7 release (and its pinned viem) into launch/node_modules.
set -euo pipefail
cd "$(dirname "$0")"
V=4.1.7
BASE=https://github.com/programmablehq/PROGRAMMABLE/releases/download/programmable-launch-v$V
curl -fsSLO "$BASE/programmable-launch-$V.tgz"
curl -fsSLO "$BASE/programmable-launch-$V.tgz.sha256"
sha256sum -c "programmable-launch-$V.tgz.sha256"          # must print: OK
[ -f package.json ] || echo '{ "private": true, "type": "module" }' > package.json
npm install --no-audit --no-fund "./programmable-launch-$V.tgz"
node -e "console.log('installed @programmable/launch', require('./node_modules/@programmable/launch/package.json').version)"
node -v
