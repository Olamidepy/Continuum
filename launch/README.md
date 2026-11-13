# Wronskian (WRON) launch contracts

Wronskian launches on **Ethereum mainnet** with its own Uniswap v4 hook. No launchpad: the dev wallet deploys
everything and makes the first buy. The contracts follow the same patterns as Programmable's reviewed launch
contracts, and trade through the same Uniswap v4 PoolManager and Universal Router.

| | |
|---|---|
| Token | Wronskian (WRON), 1,000,000,000 supply. No owner, no mint, no tax on transfers, no pause, no upgrade. |
| Fee | **5% of every buy and sell**, taken in ETH, all to the dev wallet `0x311A…9eC2`. Fixed forever. |
| Anti-sniper | Buy fee starts at **99%** at launch and falls in a straight line to 5% over **30 seconds**. The dev wallet skips this extra fee. |
| Wallet cap | For the first **5 minutes**, no wallet can buy more than **2% of supply** in total. Sells are never capped. |
| Start | **$2,000 FDV**, priced from Chainlink's ETH/USD at launch. |
| Liquidity | The whole supply goes into one position owned by the initializer, which has no way to remove it. **Locked forever.** No ETH needed: buyers' ETH flows in as they buy. |
| First buy | **$2 of ETH** to the dev wallet, in the same transaction that creates the pool. |

```
src/WronskianToken.sol        fixed-supply ERC-20
src/WronskianHook.sol         5% fee, opening fee, wallet cap, only the launch position may add liquidity
src/WronskianFeeVault.sol     holds fees as PoolManager ETH claims; pays only the dev wallet
src/WronskianInitializer.sol  creates the pool, locks the liquidity, makes the first buy (one transaction)
script/Launch.s.sol           the launch, from the dev wallet
test/Wronskian.t.sol          unit tests against the real PoolManager
test/Fork.t.sol               the whole launch on a copy of mainnet, then real buys and sells through the
                              website's exact Uniswap route
```

## Run it (Ubuntu / WSL)

One-time setup:

```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup   # skip if forge is already installed
cd launch
bash install-deps.sh                                       # Uniswap v4, OpenZeppelin, forge-std
```

### 1. Test

```bash
forge test                                                 # unit tests
read -rs ETH_RPC_URL && export ETH_RPC_URL                 # your mainnet RPC URL (Alchemy etc.), hidden
forge test --match-contract WronskianForkTest -vv          # full launch + real Uniswap trades on a mainnet copy
```

All tests must pass. Send the output to Claude if anything fails.

### 2. Dry run (sends nothing)

```bash
forge script script/Launch.s.sol --rpc-url $ETH_RPC_URL --sender 0x311A12DaD28A6AaE0C3c8FC1F4cBF115f4Da9eC2
```

It prints the ETH price, the starting FDV, the first buy and the addresses it would deploy. It needs the dev wallet
to hold enough ETH for the first buy.

### 3. Launch

Store the dev wallet's key in Foundry's encrypted keystore once (it asks for the key and a password; never paste the
key anywhere else):

```bash
cast wallet import wron-dev --interactive
```

Then launch:

```bash
forge script script/Launch.s.sol --rpc-url $ETH_RPC_URL --sender 0x311A12DaD28A6AaE0C3c8FC1F4cBF115f4Da9eC2 \
  --account wron-dev --broadcast
```

Four transactions: initializer, token, hook, launch. Trading opens with the fourth. The script prints the WRON token,
hook and fee vault addresses: put them in the website's environment variables.

**Gas:** roughly 6–7 million gas in total. Check the dry run's estimate; at current prices this is about $15–30.

### Claiming fees

Fees build up in the fee vault as ETH. Anyone can send them to the dev wallet:

```bash
cast send <FEE_VAULT> "claim()" --rpc-url $ETH_RPC_URL --account wron-dev
```

## Not done

- No independent audit. The design follows Programmable's reviewed patterns and the tests cover the fee maths, the
  anti-sniper rules, the lock and real trades on a mainnet copy, but that is not an audit.
- The wallet cap counts per transaction origin. Someone using many wallets can still buy more in total; the cap
  raises the cost of sniping rather than making it impossible.
