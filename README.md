# Continuum

**Where leaving early has a price, and holding has a payout.**

Continuum is a time-locked vault on Ethereum. Lock the Continuum token for 3, 7, 14 or 30 days. Anyone who breaks a lock early forfeits 10% of it, and all of it is shared with every vault still locked. Finishing is free.

The token launches through [Programmable](https://programmable.market)'s Custom Launch (protected launch token + Uniswap v4 hook). The vault is a separate, ownerless contract. See [LAUNCH.md](LAUNCH.md) for the launch checklist.

## What's in here

```
app/                 Next.js pages: home, vaults, trade, docs, faq
components/ui/       stock shadcn/ui (new-york)
components/site/     Continuum components (lock planner, vault list, swap, …)
lib/data.ts          all copy, numbers and addresses (driven by env vars)
lib/web3/            wagmi config, pool price reader, vault hooks, generated ABI
contracts/           ContinuumVault.sol, tests, deploy script (Hardhat)
```

## The vault

`contracts/src/ContinuumVault.sol`

| | |
|---|---|
| Lock lengths | 3 / 7 / 14 / 30 days |
| Weights | 1.0x / 1.2x / 1.5x / 2.0x |
| Shares | amount × weight |
| Early exit | 10% of principal, all of it to open vaults by share (no treasury) |
| Rewards | early-exit fees + anyone can `fund()`; O(1) reward-per-share accounting |
| Admin | none: no owner, treasury, pause, proxy or setters. The token is immutable |

Functions: `lock`, `topUp`, `extend`, `claim`, `withdraw`, `exitEarly`, `fund`, plus views `getVault`, `vaultsOf`, `pending`, `previewExit`, `stats`.

```bash
cd contracts
npm install
npm test          # 14 tests
npm run abi       # copy the compiled ABI into the website after any contract change
```

The Hardhat config uses the compiler bundled in `node_modules/solc`, so it works without downloading a compiler.

## The website

Next.js 16, React 19, Tailwind v4, stock shadcn/ui, Lucide icons, wagmi + viem on Ethereum mainnet. Headings in Syne, body in Nunito (self-hosted).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Before launch the site works with no addresses set: prices, vault actions and contract addresses show "At launch". Set the env vars in [.env.example](.env.example) as each piece goes live.

### Deploy on Vercel

1. Import the repo in Vercel (framework: Next.js, root: repo root).
2. Add the env vars from `.env.example` that you have so far.
3. Deploy. Redeploy whenever you add addresses.

## License

MIT
