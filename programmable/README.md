# Submitting Wronskian (WRON) to Programmable

WRON launches on **Ethereum mainnet** as a Programmable **Custom Launch**, using Programmable's own protected
launch contracts from their verified `@programmable/launch` 4.1.7 release (the same kit Volume launched with).
`protected-eth.mjs` prepares the request. It never signs or sends a transaction. After approval, the dev wallet
signs on programmable.market.

| Setting | Value (`wronskian.launch.json`) |
| --- | --- |
| Token | Wronskian (WRON), 1,000,000,000 supply, no mint, owner or upgrade |
| Fees | 5% on every buy and sell: 4.7% creator fee to the dev wallet, 0.3% to Programmable |
| Starting value | $16,000 FDV target, so an ETH price drop before signing cannot push it under Programmable's $15,000 floor |
| Liquidity | Whole supply locked in the pool for good |
| First buy | $2 of ETH to the dev wallet, in the launch transaction |
| Protection (fixed by Programmable) | 2% wallet cap for 300 s; buy fee starts at 99% and falls to normal over 30 s |
| Dev wallet | `controller` in `wronskian.launch.json` |

## Run it (Ubuntu / WSL, Node 24)

```bash
cd ~/wronskian/programmable
bash setup.sh                               # must print OK
node protected-eth.mjs prepare              # writes the sources to programmable/project
cd .. && git add -A && git commit -m "Update launch sources" && git push && cd programmable   # only if prepare changed files
node protected-eth.mjs build                # prints the token and hook addresses
read -rsp "Programmable API key: " PROGRAMMABLE_API_KEY; export PROGRAMMABLE_API_KEY; echo
node protected-eth.mjs preflight            # Programmable checks the request; nothing is created
node protected-eth.mjs submit               # creates the launch for review; prints the launch ID
```

The GitHub repo must be **public**: Programmable reads the sources from it. Never paste the API key into chat.

## After approval

Sign in "Your launches" on programmable.market with the dev wallet, then set the token and hook from
`out/summary.json` in Vercel (`NEXT_PUBLIC_WRON_TOKEN_ADDRESS`, `NEXT_PUBLIC_WRON_HOOK_ADDRESS`) and redeploy.
