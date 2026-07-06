# Continuum: Bitcoin-Native Decentralized Savings Protocol

Continuum is a production-grade, non-custodial time-locked savings protocol built on the Stacks blockchain. Designed to encourage long-term wealth accumulation, the protocol enables users to securely lock Stacks (STX) or Super Bitcoin (sBTC) into smart-contract-governed vaults. Discipline is incentivized by transparently redistributing early withdrawal penalties directly to remaining active pool participants.

This codebase contains both the Clarity smart contracts and the Next.js client interface.

---

## Core Protocol Mechanics

### Non-Custodial Time-Locks
Deposits are locked directly in Stacks Clarity smart contracts. The code contains no administrator override backdoors, ensuring user assets can only be retrieved by the lock owner.

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
│   ├── page.tsx           # Premium landing page detailing protocol specifications
│   └── dashboard/
│       └── page.tsx       # Interactive savings client with Recharts analytics and forms
├── components/
│   ├── MockupPhone.tsx    # Responsive vector mockup of the dashboard layout
│   ├── VaultCard.tsx      # Active vault item representing lock counters and action forms
│   └── WalletModal.tsx    # Wallet overlay targeting Leather, Xverse, Asigna, and WalletConnect
├── contracts/
│   ├── Clarinet.toml      # Clarinet configuration manifest
│   ├── continuum-vaults.clar # Primary Stacks Clarity 2 vaults contract
│   ├── sbtc-token-mock.clar  # Mock sBTC implementation for localized compiler checks
│   └── sip-010-trait-mock.clar # SIP-010 token trait specification
├── hooks/
│   └── useStacks.ts       # React hook for browser extension calls and blockchain queries
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
- Language: Stacks Clarity 2 smart contracts
- Connection: Stacks.js Connect and WalletConnect (via Reown AppKit)
- Network: Stacks Testnet API (with client-side fallback simulation)

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
Set your WalletConnect Project ID:
```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_reown_project_id_here
```

### Run Local Development Server
Execute the Next.js development server:
```bash
npm run dev
```
Open `http://localhost:3000` to interact with the application.

### Build and Compilation Check
Compile and verify the TypeScript build output for production deployment:
```bash
npm run build
```

---

## License

This project is licensed under the MIT License. Details can be found in the LICENSE file.
