#!/usr/bin/env bash
# Fetches the exact library commits Wronskian is built and tested against (the same pins Programmable uses).
set -euo pipefail
mkdir -p lib
fetch() {
  local dir=$1 url=$2 commit=$3
  if [ -d "lib/$dir/.git" ]; then echo "lib/$dir already present"; return; fi
  git init -q "lib/$dir"
  git -C "lib/$dir" remote add origin "$url"
  git -C "lib/$dir" fetch -q --depth 1 origin "$commit"
  git -C "lib/$dir" checkout -q FETCH_HEAD
  echo "lib/$dir @ $commit"
}
fetch v4-core https://github.com/Uniswap/v4-core.git 59d3ecf53afa9264a16bba0e38f4c5d2231f80bc
fetch v4-periphery https://github.com/Uniswap/v4-periphery.git ad04c9f24a170accf5ea1b2836bbafd514537ca6
fetch openzeppelin-contracts https://github.com/OpenZeppelin/openzeppelin-contracts.git 21c8312b022f495ebe3621d5daeed20552b43ff9
fetch openzeppelin-uniswap-hooks https://github.com/OpenZeppelin/uniswap-hooks.git 26dc8e53f812a1ca390d470342adb6cd8c3286ad
fetch forge-std https://github.com/foundry-rs/forge-std.git 3b20d60d14b343ee4f908cb8079495c07f5e8981
fetch solmate https://github.com/transmissions11/solmate.git 4b47a19038b798b4a33d9749d25e570443520647
