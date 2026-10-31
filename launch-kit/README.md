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

## 0. Before you start

- Create an **empty public GitHub repo** named `continuum-launch` (github.com/new, no README).
  Programmable reviews the exact contract sources from a public commit.
- Have an **Ethereum Mainnet RPC URL with no domain restriction** (a second Alchemy app).
- Have your **Programmable API key** (Ethereum Mainnet, `custom-launch:create` + `custom-launch:read`).
- Have the dev wallet funded with about **$4 of ETH + gas** for signing later.

## 1. Install Node 24, git and the GitHub CLI

```bash
sudo apt update && sudo apt install -y git curl gh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 24 && nvm use 24
gh auth login            # GitHub.com → HTTPS → log in with browser
git config --global user.name  "Olamidepy"
git config --global user.email "you@example.com"
```

## 2. Get the kit and set up

```bash
git clone https://github.com/Olamidepy/Continuum ~/Continuum
bash ~/Continuum/launch-kit/setup.sh
```

## 3. Build the draft (writes the contract sources)

```bash
read -rs ETH_RPC_URL && export ETH_RPC_URL      # paste the unrestricted Alchemy URL, press Enter
node ~/Continuum/launch-kit/build-launch.mjs
```

It prints the token name, fees, first buy in ETH and the **predicted token address**.

## 4. Publish the sources to your public repo

```bash
cd ~/continuum-launch
git add -A && git commit -m "Continuum protected launch sources"
git remote add origin https://github.com/Olamidepy/continuum-launch.git
git push -u origin main
```

## 5. Build the final request (binds the pushed commit)

```bash
node ~/Continuum/launch-kit/build-launch.mjs
```

It should end with **READY: bound to commit …**.

## 6. Preflight and submit

```bash
read -rs PROGRAMMABLE_API_KEY && export PROGRAMMABLE_API_KEY   # paste the key, press Enter (hidden)
bash ~/Continuum/launch-kit/submit.sh
```

It packs, checks locally, runs Programmable's preflight (creates nothing), shows the result, and only
submits after you type `yes`.

## 7. After submitting

- Programmable reviews within about 24 hours.
- Watch the status: `node ~/programmable/packages/launch/bin/programmable-launch.mjs status <launch-id> --watch --until authorized`
- When it says **authorized**, open the wallet handoff link on programmable.market with the **dev wallet**,
  check chain = Ethereum, the router address and the ETH value, then sign.
- **The permit can't be extended.** If the 24-hour window runs out before you sign, run steps 5 and 6 again.
- After it's finalized, deploy the vault (`contracts/`) and set the token, hook and vault addresses in Vercel.

## Rules

- Never paste the API key, RPC URL or any private key into chat, screenshots or files in a repo.
- If `build-launch.mjs` says the live profile isn't 3.6.0 or the fee policy changed, stop and ask before continuing.
