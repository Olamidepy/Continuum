# Continuum launch kit (Ubuntu)

Builds and submits the Continuum (CNTM) Custom Launch request using Programmable's own
launch package (release `programmable-launch-v4.3.0`) and its **required launch protection**.
Nothing here signs or sends a transaction: you sign on programmable.market with the dev wallet after approval.

| Setting | Value |
|---|---|
| Token | Continuum (CNTM), 1,000,000,000 supply |
| Launch / dev wallet | `0x64b646C9B4ec3C03f16A47e3F4e838615EeBddD7` |
| Fees | 0.3% Programmable + 2.7% creator, on buys and sells |
| First buy | about $4 of ETH, from the dev wallet (skips the 99% opening fee) |
| Protection | 99% opening fee falling to normal over 30 s; 2% per-wallet cap for 5 min; starting FDV ≥ $15,000; liquidity locked |
| Links | continuumxyz.live, x.com/continuum_xyz, github.com/Olamidepy/Continuum |

All settings live at the top of `build-launch.mjs`.

## Run it

One-time: Node 24 and git (`nvm install 24`), and `gh auth login` so the script can publish the sources.

```bash
git clone https://github.com/Olamidepy/Continuum ~/Continuum
read -rs ETH_RPC_URL && export ETH_RPC_URL                      # Alchemy URL with no domain restriction
read -rs PROGRAMMABLE_API_KEY && export PROGRAMMABLE_API_KEY    # hidden
bash ~/Continuum/launch-kit/launch.sh
```

`launch.sh` sets up Programmable's package, builds the request, publishes the exact contract sources to the public
repo `github.com/Olamidepy/continuum-launch` (created if missing), builds again bound to that commit, runs
Programmable's preflight (creates nothing), and submits only after you type `yes`.

## After submitting

- Programmable reviews within about 24 hours.
- Watch: `node ~/programmable/packages/launch/bin/programmable-launch.mjs status <launch-id> --watch --until authorized`
- At **authorized**, open the handoff on programmable.market with the dev wallet, check chain, router and ETH value, then sign.
- **The permit can't be extended.** If 24 hours pass before you sign, run `launch.sh` again.

## Rules

- Never paste the API key, RPC URL or any private key into chat, screenshots or files in a repo.
- If the build says the live profile isn't 3.6.0 or the fee policy changed, stop and ask before continuing.
