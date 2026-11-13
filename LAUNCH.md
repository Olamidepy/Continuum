# Launching Wronskian

WRON launches with its own Uniswap v4 hook (`launch/`). No launchpad, no review, no ETH for liquidity: the whole supply goes into one locked, one-sided position, and the dev wallet only pays gas plus the $2 first buy.

```
 1. Site live + X account               before launch
 2. forge test (unit + mainnet fork)    before launch
 3. Dry run the launch script           before launch
 4. Broadcast the launch                launch day, one command
 5. Set token / hook / fee vault in Vercel, redeploy   trading opens on the site
 6. Post the official addresses on X
 7. Deploy WronskianVault, set its address, redeploy   vaults open
```

## 1. Before launch

- [ ] Deploy this site to Vercel with `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` and `NEXT_PUBLIC_APP_URL`.
- [x] X account: https://x.com/wronskian_xyz
- [x] Dev wallet: `0x311A12DaD28A6AaE0C3c8FC1F4cBF115f4Da9eC2`. It deploys, makes the $2 first buy (skips the 80% opening fee, still under the 2% cap) and receives the 5% fee.

## 2. Test (Ubuntu, in `launch/`)

```bash
bash install-deps.sh
forge test -vv
read -rs ETH_RPC_URL && export ETH_RPC_URL     # paste your Alchemy mainnet URL, nothing shows
forge test --match-contract WronskianForkTest -vv
```

## 3. Dry run, then launch

```bash
forge script script/Launch.s.sol --rpc-url $ETH_RPC_URL --sender 0x311A12DaD28A6AaE0C3c8FC1F4cBF115f4Da9eC2
cast wallet import wron-dev --interactive       # once; paste the dev wallet key into your own terminal only
forge script script/Launch.s.sol --rpc-url $ETH_RPC_URL --account wron-dev --sender 0x311A12DaD28A6AaE0C3c8FC1F4cBF115f4Da9eC2 --broadcast
```

The script prints the token, hook and fee vault addresses.

## 4. Go live on the site

In Vercel set `NEXT_PUBLIC_WRON_TOKEN_ADDRESS`, `NEXT_PUBLIC_WRON_HOOK_ADDRESS`, `NEXT_PUBLIC_WRON_FEE_VAULT_ADDRESS`, then redeploy. The Trade page quotes and swaps straight through the Uniswap Universal Router.

## 5. Vault

```bash
cd contracts && npm install && npm test
cp .env.example .env     # fill in on your own computer only; WRON_TOKEN_ADDRESS = the launched token
npm run deploy
```

Set `NEXT_PUBLIC_WRON_VAULT_ADDRESS` in Vercel and redeploy.

## Fees

Fees collect in the fee vault. Anyone can call `claim()` on it and the ETH goes to the dev wallet:

```bash
cast send <FEE_VAULT> "claim()" --rpc-url $ETH_RPC_URL --account wron-dev
```
