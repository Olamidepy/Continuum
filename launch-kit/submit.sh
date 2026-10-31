#!/usr/bin/env bash
# Packs, checks and submits the Continuum launch request for Programmable review.
# It never signs or sends a transaction; you sign later on programmable.market with the dev wallet.
set -euo pipefail

PROG_DIR="${PROGRAMMABLE_DIR:-$HOME/programmable}"
LAUNCH_DIR="${LAUNCH_DIR:-$HOME/continuum-launch}"
CLI=(node "$PROG_DIR/packages/launch/bin/programmable-launch.mjs")
CONFIG="protected-launch.config.json"

cd "$LAUNCH_DIR"
[ -f "$CONFIG" ] || { echo "✖ $CONFIG not found. Run build-launch.mjs first."; exit 1; }
if grep -q '"revision": "0000000000000000000000000000000000000000"' "$CONFIG"; then
  echo "✖ The config is still a draft. Commit and push $LAUNCH_DIR, then run build-launch.mjs again."; exit 1
fi
: "${PROGRAMMABLE_API_KEY:?Set it first without showing it:  read -rs PROGRAMMABLE_API_KEY && export PROGRAMMABLE_API_KEY}"

echo "── 1/4 Pack"
"${CLI[@]}" pack --config "$CONFIG" --output launch.json --receipt pack.receipt.json >/dev/null
echo "── 2/4 Local check"
"${CLI[@]}" validate launch.json --config "$CONFIG" >/dev/null
echo "── 3/4 Programmable preflight (no launch is created)"
"${CLI[@]}" validate launch.json --config "$CONFIG" --remote | tee preflight.json | node -e '
  let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s);const f=(o,k)=>o&&typeof o==="object"?(k in o?o[k]:Object.values(o).map(v=>f(v,k)).find(v=>v!==undefined)):undefined;
  console.log("   disposition:", f(r,"disposition")??f(r,"status")??"see preflight.json");
  const e=f(r,"launchEligibility"); if(e) console.log("   deployable:", e.deployable);})'

echo
read -r -p "Submit Continuum (CNTM) for Programmable review now? Type yes: " answer
[ "$answer" = "yes" ] || { echo "Not submitted. preflight.json has the details."; exit 0; }

echo "── 4/4 Submit"
"${CLI[@]}" submit launch.json --config "$CONFIG" | tee submit-result.json >/dev/null
LAUNCH_ID="$(node -e 'const r=require("./submit-result.json");const f=(o)=>o&&typeof o==="object"?(o.launchId??Object.values(o).map(f).find(Boolean)):undefined;process.stdout.write(f(r)||"")')"
echo
echo "✔ Submitted. Launch ID: ${LAUNCH_ID:-see submit-result.json}"
echo "  Programmable reviews within about 24 hours. Then sign within the permit window (it can't be extended)."
echo "  Watch it:  ${CLI[*]} status ${LAUNCH_ID:-<launch-id>} --watch --until authorized"
