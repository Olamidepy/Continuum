# Launching Continuum on Programmable

Continuum launches the same way Goblin did: through Programmable's **Custom Launch** on Ethereum mainnet, using Programmable's protected launch token and Uniswap v4 hook. Programmable reviews the request and the founder approves it before it can go live. The vault is our own contract, deployed after the launch, and it never touches the pool or the hook.

```
 1. Site live + X account        ─┐
 2. Submit Custom Launch request   │  before approval
 3. Founder reviews and approves  ─┘
 4. Sign the launch in your wallet     launch day
 5. Deploy ContinuumVault              right after the launch is final
 6. Set addresses in Vercel, redeploy  site switches to live
 7. Post the official addresses on X
```

## 1. Before you submit

- [ ] Deploy this site to Vercel (see README) with `NEXT_PUBLIC_RPC_URL` and `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
- [x] X account: https://x.com/continuum_xyz (already set as the site default)
- [x] Dev wallet: `0x64b646C9B4ec3C03f16A47e3F4e838615EeBddD7`. It submits and signs the launch, makes the $4 first buy (exempt from the 99% anti-sniper fee, still under the 2% cap) and receives creator fees.
- [ ] Pick the ticker, but keep `NEXT_PUBLIC_TOKEN_TICKER` empty until launch so it isn't copied.
- [ ] Optional but strongly recommended: deploy the vault on Sepolia against a test token and run through lock, claim, exit and withdraw on the site.

## 2. The Custom Launch request

Submit the Custom Launch request on programmable.market. Use these fields:

| Field | Value |
|---|---|
| Name | Continuum |
| Dev / controller wallet | `0x64b646C9B4ec3C03f16A47e3F4e838615EeBddD7` |
| Ticker | CNTM (keep it off the site and X until launch) |
| Chain | Ethereum Mainnet |
| Pair | ETH |
| Website | https://www.continuumxyz.live |
| X | https://x.com/continuum_xyz |
| Source | https://github.com/Olamidepy/Continuum |
| Image | `public/logo.svg` (export a 1000×1000 PNG) |
| Mechanics | Programmable's protected launch token + hook. No custom hook. |
| Supply | 1,000,000,000 (fixed) |
| Initial buy | about $4 of ETH (Programmable's minimum is $1) |
| Launch protection | Programmable's standard package (required, not adjustable): buy fee starts at 99% and falls to normal over 30 s; max 2% of supply per wallet for the first 5 minutes; starting FDV at least $15,000 |
| Fees | 0.3% platform (fixed) + 2.7% creator = 3% per trade |
| Creator fee | your choice (site defaults to 2.7%; update `NEXT_PUBLIC_CREATOR_FEE` to match what's approved) |

**Description** (paste as is or edit):

> Continuum is where leaving early has a price, and holding has a payout. Lock your tokens for up to 30 days. Every early exit forfeits 10%, and it flows straight to the holders who kept their word.

**Note to the founder** (if the form has a message field, or send it on X/Discord):

> Continuum uses your protected launch token and hook as is. Our only contract is a separate time-lock vault for the launched token (source and 14 passing tests in /contracts). It has no owner and no admin functions, never touches the pool or hook, and is deployed after the launch is final. Happy to make any changes you need for approval.

## 3. Launch day

1. Sign the launch in your wallet from Programmable's handoff. Check the chain (Ethereum, 1), the router address and the ETH value in the wallet before you sign.
2. Wait for the launch to show as finalized on Programmable.
3. Copy from the launch record: token address, hook address, pool fee, tick spacing, and your coin page URL.

## 4. Deploy the vault

```bash
cd contracts
npm install
cp .env.example .env   # fill DEPLOYER_PRIVATE_KEY, MAINNET_RPC_URL, CONTINUUM_TOKEN_ADDRESS, ETHERSCAN_API_KEY
npm test               # 14 tests should pass
npm run deploy         # prints the vault address and verifies it on Etherscan
```

Use a fresh deployer wallet with only enough ETH for gas. The token address is permanent once deployed.

## 5. Switch the site to live

In Vercel set, then redeploy:

```
NEXT_PUBLIC_TOKEN_TICKER=...
NEXT_PUBLIC_CONTINUUM_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_CONTINUUM_HOOK_ADDRESS=0x...
NEXT_PUBLIC_PROGRAMMABLE_COIN_URL=https://programmable.market/...
NEXT_PUBLIC_CONTINUUM_VAULT_ADDRESS=0x...
```

The Trade page then shows the live price from the pool, the Vaults page turns on, and the Docs page lists the real addresses.

## 6. After launch

- Post all addresses from the Trade page on X and pin it.
- To boost savers, send part of the creator fee into the vault: approve the vault, then call `fund(amount)`. It shows on-chain as a `Funded` event, which is easy to share.
- Get an independent review of `ContinuumVault.sol` before promoting large locks.
