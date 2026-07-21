# Continuum: Bitcoin-Native and Multi-Chain Decentralized Savings Protocol

Continuum is a production-grade, non-custodial time-locked savings protocol built on the Stacks blockchain and optimized for Celo/MiniPay mobile stablecoin integration. Designed to encourage long-term wealth accumulation, the protocol enables users to securely lock Stacks (STX) / Super Bitcoin (sBTC) or Celo (CELO) / Celo Dollars (cUSD) into smart-contract-governed vaults. Discipline is incentivized by transparently redistributing early withdrawal penalties directly to remaining active pool participants.

This codebase contains Clarity smart contracts, React connectors, and a Next.js client interface fully compatible with desktop wallet extensions (Leather, Xverse) and mobile stablecoin wallets (Opera MiniPay).

---

## Core Protocol Mechanics

### Non-Custodial Time-Locks
Deposits are locked directly in smart contracts. The code contains no administrator override backdoors, ensuring user assets can only be retrieved by the lock owner.

### Multi-Chain Extension (Celo & MiniPay)
In addition to the Stacks network, Continuum includes Celo native stablecoin savings options tailored for Opera's **MiniPay** mobile-first browser environment. 
- **Auto-Connection**: Automatically detects the injected `window.ethereum` EIP-1193 MiniPay provider on load, signing users in instantly without a manual click.
- **Micro-Gas Fees**: Optimized for sub-cent transaction costs in emerging markets.
- **cUSD Pegged Savings**: Supports locking Celo Dollars (cUSD) to earn yield denominated in stable assets.

### O(1) Scalable Reward Redistribution
Typical pool yield systems iterate through active balances to distribute rewards, which scales at O(N) and risks exceeding block transaction limits. Continuum resolves this with a scalable O(1) rewards-per-share algorithm:
- Shares are computed as Locked Amount multiplied by the Duration Multiplier.
- When an early exit occurs, a 10% penalty is deducted.
- 80% of the penalty is left in the contract, and the global accumulated rewards-per-share variable increases.
- 20% of the penalty is transferred to the treasury address for reserve pool stability.
- Saver vaults calculate and claim accrued rewards lazily during user interactions (claims, top-ups, extends, or standard withdrawals).

### Lock Duration Multiplier Tiers
Commitment duration governs the share weight allocation, rewarding longer locks with a larger percentage of penalty distributions:
- 30 Days: 1.0x share weight multiplier
- 90 Days: 1.2x share weight multiplier
- 180 Days: 1.5x share weight multiplier
- 365 Days: 2.0x share weight multiplier

---

## Directory Structure

```
continuum/
├── app/
│   ├── layout.tsx         # HTML shell with Google Poppins fonts and global configuration
│   ├── page.tsx           # Premium landing page detailing protocol specifications & MiniPay auto-connect
│   └── dashboard/
│       └── page.tsx       # Interactive savings client with Recharts analytics and forms
├── components/
│   ├── MockupPhone.tsx    # Responsive vector mockup of the dashboard layout
│   ├── VaultCard.tsx      # Active vault item representing lock counters and action forms
│   └── WalletModal.tsx    # Wallet overlay targeting Leather, Xverse, Celo (MiniPay), Asigna, etc.
├── contracts/
│   ├── Clarinet.toml      # Clarinet configuration manifest
│   ├── continuum-vaults.clar # Primary Stacks Clarity 2 vaults contract
│   ├── sbtc-token-mock.clar  # Mock sBTC implementation for localized compiler checks
│   └── sip-010-trait-mock.clar # SIP-010 token trait specification
├── hooks/
│   ├── useStacks.ts       # React hook for Stacks browser extension calls and blockchain queries
│   └── useCelo.ts         # React hook for Celo/MiniPay EIP-1193 calls and Forno RPC balance fetching
├── lib/
│   └── store.ts           # Client store tracking wallets and mirror contract calculations
├── styles/
│   └── globals.css        # Tailwind CSS v4 variables, blurs, and float animations
├── types/
│   └── index.ts           # Domain models for vaults, transactions, and user stats
├── utils/
│   └── format.ts          # Conversion helpers for STX, sBTC, and blocks
├── package.json           # Project manifest and package configurations
└── tsconfig.json          # TypeScript compiler configurations
```

---

## Technology Stack

### Frontend Client
- Framework: Next.js 15 (App Router, React 19)
- Styling: Tailwind CSS v4 and vanilla CSS backdrop filters
- State Management: Zustand (persisted local storage state)
- Visualizations: Recharts
- Animations: Framer Motion

### Blockchain Interface
- **Stacks Network**: Clarity 2 Smart Contracts, Stacks.js Connect (network, transactions)
- **Celo Network (MiniPay)**: Injected EIP-1193 Provider, Celo Mainnet Forno RPC integration (balance queries, cUSD stablecoin ERC20 transfers)

---

## Getting Started

### Prerequisites
- Node.js (version 18.0.0 or higher)
- npm or pnpm package manager

### Installation
Install all client dependencies:
```bash
npm install
```

### Environment Variables
Configure your environment variables by copying the example manifest:
```bash
cp .env.example .env.local
```

### Local Development
To launch the Next.js development server:
```bash
npm run dev
```
### Testing on MiniPay (Opera Mini)
To test the MiniPay stablecoin savings flow on a mobile device:
1. Expose your local environment using a tunneling service like [ngrok](https://ngrok.com/):
   ```bash
   ngrok http 3000
   ```
2. Open the Opera Mini browser on your Android or iOS device (with MiniPay activated).
3. Turn on **Developer Mode** in the MiniPay settings.
4. Input your ngrok tunnel URL into the developer settings to load Continuum inside MiniPay.
5. The app will auto-detect the wallet and connect instantly!

### Build and Compilation Check
Compile and verify the TypeScript build output for production deployment:
```bash
npm run build
```

---

## License

This project is licensed under the MIT License. Details can be found in the LICENSE file.
