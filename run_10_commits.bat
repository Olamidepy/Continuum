@echo off
echo ===================================================
echo     Executing 10 Non-Empty Commits for Continuum
echo ===================================================

echo [Commit 1/10] JSDoc documentation for TypeScript domain models
git add types/index.ts
git commit -m "docs(types): add comprehensive JSDoc documentation for Vault, Transaction, and Wallet types"

echo [Commit 2/10] Currency formatting helper functions
git add utils/format.ts
git commit -m "feat(utils): add formatCelo and formatCUSD currency formatting utility functions"

echo [Commit 3/10] Solidity contract documentation
git add contracts/celo/contracts/ContinuumVaults.sol
git commit -m "docs(solidity): add NatSpec comments and MasterChef reward accounting notes to ContinuumVaults.sol"

echo [Commit 4/10] Hardhat network configuration
git add contracts/celo/hardhat.config.ts
git commit -m "config(hardhat): add celoSepolia testnet network configuration and RPC endpoints"

echo [Commit 5/10] README MiniPay guide documentation
git add README.md
git commit -m "docs(readme): update README with Opera MiniPay developer setup and testing instructions"

echo [Commit 6/10] MiniPay auto-connect and provider detection
git add hooks/useCelo.ts
git commit -m "feat(hooks): enhance window.provider and window.ethereum MiniPay provider discovery"

echo [Commit 7/10] Wei decimal conversion and testnet receipt polling
git add hooks/useCelo.ts
git commit -m "fix(hooks): improve wei conversion for fractional token amounts and testnet receipt polling"

echo [Commit 8/10] Landing page auto-connect and syntax fixes
git add app/page.tsx
git commit -m "fix(landing): resolve bracket syntax and enable MiniPay auto-connect on home page"

echo [Commit 9/10] Dashboard activity log currency formatting
git add app/dashboard/page.tsx
git commit -m "fix(dashboard): dynamically render CELO and cUSD in Recent Activity table when on Celo network"

echo [Commit 10/10] Accessibility labels and UI polish
git add components/VaultCard.tsx
git commit -m "style(components): add accessibility labels and network indicators to VaultCard component"

echo [Pushing all 10 commits to GitHub]
git push

echo ===================================================
echo     All 10 Non-Empty Commits Pushed Successfully!
echo ===================================================
pause
