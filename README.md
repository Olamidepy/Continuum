# Wronskian (WRON)

**W ≠ 0. Stay independent.**

WRON is a token on Ethereum with its own Uniswap v4 hook: a fixed 5% fee on every buy and sell (paid to the dev wallet), liquidity locked forever, and launch protection (99% → 5% buy fee over 30 s, 2% wallet cap for 5 minutes). It opens at a $2,000 FDV.

WronskianVault is a time-locked vault for WRON. Lock for 3, 7, 14 or 30 days. Anyone who breaks a lock early forfeits 10% of it, and all of it is shared with every vault still locked. Finishing is free.

See [LAUNCH.md](LAUNCH.md) for the launch checklist and [launch/README.md](launch/README.md) for the token contracts.

## What's in here

```
app/                 Next.js pages: home, vaults, trade, docs, faq
components/ui/       stock shadcn/ui (new-york)
components/site/     Wronskian components (lock planner, vault list, on-site swap, …)
lib/data.ts          all copy, numbers and addresses (driven by env vars)
lib/web3/            wagmi config, pool price reader, Universal Router swap, vault hooks, generated ABI
contracts/           WronskianVault.sol, tests, deploy script (Hardhat)
launch/              WRON token, hook, fee vault, initializer, launch script (Foundry)
```

## The vault

`contracts/src/WronskianVault.sol`

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
