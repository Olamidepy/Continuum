import subprocess
import json
import sys

# List of labels to ensure they exist on the repo
LABELS = [
    ("complex", "d93f0b", "Complex issue requirement"),
    ("complexity: high", "d93f0b", "High complexity task"),
    ("smart-contract", "0e8a16", "Smart contract development"),
    ("stellar", "1d76db", "Stellar network integration"),
    ("soroban", "5319e7", "Soroban smart contract engine"),
    ("tokens", "0052cc", "Token standards and assets"),
    ("wallet", "fbca04", "Wallet connection and transactions"),
    ("frontend", "1d76db", "Frontend application code"),
    ("dashboard", "006b75", "Dashboard UI components"),
    ("indexing", "bfd4f2", "Event indexing and history"),
    ("backend", "0052cc", "Backend and infrastructure"),
    ("testing", "d4c5f9", "Automated tests and security suite"),
    ("security", "b60205", "Security and safety requirements"),
    ("documentation", "0075ca", "Developer documentation and guides"),
    ("mobile", "d4c5f9", "Mobile optimization and UI")
]

ISSUES = [
    {
        "title": "Issue 1 — Implement Savings Vault Smart Contract",
        "labels": ["complex", "complexity: high", "smart-contract", "stellar", "soroban"],
        "body": """### Description

Implement the core Soroban smart contract for Continuum's time-locked savings vaults. The vault contract is the foundation of the implementation and should allow users to deposit supported assets, define a lock duration, track the maturity timestamp, and withdraw funds once the lock period has ended.

The initial implementation should focus on the core vault lifecycle, specifically targeting the new Soroban contract layer while maintaining a modular architecture that allows additional assets, lock periods, and savings strategies to be introduced without requiring major refactoring.

The contract must ensure that deposited funds remain under smart-contract control until the user's position reaches maturity. Only the owner of a savings position should be able to initiate a valid withdrawal, and the contract must prevent unauthorized access, duplicate withdrawals, invalid deposits, and withdrawals before maturity.

The implementation should prioritize security, deterministic state transitions, clear storage structures, and minimal unnecessary contract complexity.

### Tasks
- [ ] Create the core Continuum savings vault contract for Soroban.
- [ ] Define storage structures for user savings positions.
- [ ] Implement deposit functionality.
- [ ] Implement lock-duration configuration.
- [ ] Record deposit amount, owner, creation time, and maturity time.
- [ ] Implement maturity validation.
- [ ] Implement withdrawal functionality.
- [ ] Prevent unauthorized withdrawals.
- [ ] Prevent double withdrawals.
- [ ] Add contract-level error codes.
- [ ] Add unit tests for the complete vault lifecycle.

### Acceptance Criteria
- Users can create a savings position with a supported asset.
- Deposited assets are held by the contract until the position is eligible for withdrawal.
- The contract correctly calculates and stores the maturity timestamp.
- A position cannot be withdrawn before maturity.
- Only the position owner can withdraw funds.
- A completed position cannot be withdrawn twice.
- Invalid inputs return predictable contract errors.
- Unit tests cover successful and failed deposit/withdrawal scenarios.
- The implementation follows Soroban security and project coding standards.
- All contract tests and build validations pass successfully.

### Additional Notes

This issue establishes the foundation of Continuum's savings infrastructure. Future issues involving penalties, reward redistribution, multiple assets, analytics, and frontend integration should build on the interfaces established here without modifying the fundamental vault lifecycle."""
    },
    {
        "title": "Issue 2 — Implement Early Withdrawal Penalty and Redistribution",
        "labels": ["complex", "complexity: high", "smart-contract", "stellar", "soroban"],
        "body": """### Description

Implement Continuum's early withdrawal mechanism for savings positions. The protocol's core incentive model is designed to encourage users to remain committed to their selected savings period by applying a predefined penalty when funds are withdrawn before maturity.

The implementation should calculate the applicable penalty deterministically and redistribute the eligible portion to active savings participants rather than allowing the penalty accounting to become centralized or manually controlled.

The initial implementation should focus on the smart-contract logic required to calculate, record, and distribute early withdrawal penalties while keeping the accounting architecture modular enough to support future changes to penalty percentages and distribution models.

The implementation must handle edge cases such as very small deposits, multiple active positions, repeated withdrawals, expired positions, and insufficient amounts for distribution.

### Tasks
- [ ] Define the early withdrawal penalty configuration.
- [ ] Calculate penalties deterministically.
- [ ] Separate the user's returned principal from the penalty amount.
- [ ] Record penalty amounts on-chain.
- [ ] Define the active participant pool.
- [ ] Implement redistribution accounting.
- [ ] Prevent users from receiving distributions from invalid positions.
- [ ] Handle multiple active savings positions.
- [ ] Add tests for penalty calculations and distribution.
- [ ] Document the penalty accounting model.

### Acceptance Criteria
- Early withdrawal correctly identifies whether a position is still locked.
- The configured penalty is calculated deterministically.
- The user receives the correct post-penalty amount.
- The penalty amount is accounted for separately.
- Eligible active participants can receive their proportional distribution.
- A user cannot claim the same distribution more than once.
- Matured withdrawals do not incur an early withdrawal penalty.
- Edge cases involving small deposits are handled safely.
- All calculations are covered by automated tests.
- Contract builds and tests pass successfully.

### Additional Notes

This issue implements one of Continuum's primary behavioral incentives. The accounting should remain transparent and auditable so users can independently understand where early withdrawal penalties go and how distributions are calculated."""
    },
    {
        "title": "Issue 3 — Add Asset and Token Integration Layer",
        "labels": ["complex", "complexity: high", "smart-contract", "stellar", "tokens"],
        "body": """### Description

Implement a reusable asset integration layer for Continuum's implementation. The protocol should not be tightly coupled to a single asset, allowing supported assets and stablecoins to be introduced without rewriting the core savings vault logic.

The initial implementation should establish a clean interface between the savings vault and token contracts. The integration should validate supported assets before accepting deposits and ensure that token transfers are performed safely.

The architecture should allow future assets to be added through configuration or well-defined contract interfaces rather than requiring changes throughout the protocol.

### Tasks
- [ ] Define the supported asset interface.
- [ ] Implement token deposit integration.
- [ ] Implement token withdrawal integration.
- [ ] Validate supported assets.
- [ ] Handle invalid or unsupported asset addresses.
- [ ] Handle failed token transfers.
- [ ] Add reusable asset utilities.
- [ ] Document supported asset requirements.
- [ ] Add unit tests for successful and failed token operations.

### Acceptance Criteria
- The vault can interact with supported assets through a consistent interface.
- Unsupported assets cannot be deposited.
- Failed token transfers do not leave the vault in an inconsistent state.
- Withdrawal transfers are correctly validated.
- Asset configuration is isolated from core vault logic.
- Adding another supported asset does not require major contract refactoring.
- Tests cover successful transfers and failure scenarios.
- Contract build and validation checks pass.

### Additional Notes

This issue provides the asset abstraction required for Continuum to support stable-value savings while preserving the protocol's multi-chain architecture."""
    },
    {
        "title": "Issue 4 — Build Wallet Connection and Transaction Layer",
        "labels": ["complex", "complexity: high", "frontend", "stellar", "wallet"],
        "body": """### Description

Implement wallet connectivity for the Continuum frontend. Users should be able to connect a compatible wallet, view their connected account, initiate savings transactions, and receive clear transaction status feedback.

The initial implementation should focus on establishing a reusable wallet abstraction rather than tightly coupling individual wallet providers to application components. The architecture should allow additional wallets to be supported in future without rewriting the savings interface.

Transaction handling must account for rejected signatures, failed transactions, network errors, disconnected wallets, and pending transactions.

### Tasks
- [ ] Create a reusable wallet connection layer.
- [ ] Implement wallet connection state management.
- [ ] Display the connected account.
- [ ] Implement transaction signing flow.
- [ ] Handle transaction submission.
- [ ] Track pending transactions.
- [ ] Handle rejected signatures.
- [ ] Handle failed transactions.
- [ ] Provide transaction confirmation states.
- [ ] Implement wallet disconnect functionality.
- [ ] Document wallet integration requirements.

### Acceptance Criteria
- Users can connect a supported wallet.
- The connected account is reflected consistently throughout the application.
- Users can initiate a savings transaction from the interface.
- Transaction signing requests are correctly presented to the wallet.
- Pending, successful, rejected, and failed transactions have distinct states.
- Wallet disconnection is handled cleanly.
- No private keys or sensitive wallet credentials are stored by the application.
- The wallet layer is reusable across future features.
- All frontend linting, type checking, and build validations pass.

### Additional Notes

This issue establishes the frontend blockchain integration layer required by subsequent savings features. Wallet-specific logic should remain isolated from UI components wherever possible."""
    },
    {
        "title": "Issue 5 — Build Savings Dashboard",
        "labels": ["complex", "complexity: high", "frontend", "dashboard", "stellar"],
        "body": """### Description

Build the savings dashboard for Continuum, providing users with a clear overview of their active and completed savings positions.

The dashboard should translate the underlying smart-contract state into an accessible interface showing deposited asset, amount, lock duration, maturity date, position status, and available actions.

The initial implementation should focus on accurate representation of on-chain data while maintaining a component-based architecture that can support additional metrics and savings products in future.

The interface should handle users with no savings positions, multiple active positions, expired positions, loading states, and blockchain errors gracefully.

### Tasks
- [ ] Create savings position components.
- [ ] Display connected wallet information.
- [ ] Display deposited asset and amount.
- [ ] Display lock duration.
- [ ] Display maturity date.
- [ ] Display current position status.
- [ ] Display countdown/time remaining where appropriate.
- [ ] Display available withdrawal actions.
- [ ] Add loading states.
- [ ] Add empty states.
- [ ] Add blockchain error states.
- [ ] Support multiple savings positions.

### Acceptance Criteria
- Users can view all savings positions associated with their wallet.
- Position data matches the corresponding on-chain state.
- Active and matured positions are clearly differentiated.
- Users can identify when a position becomes withdrawable.
- Empty wallet states are handled gracefully.
- Blockchain loading and error states are informative.
- The dashboard works responsively across desktop and mobile layouts.
- Components remain modular and reusable.
- All linting, type checking, and build validations pass.

### Additional Notes

This issue provides the primary user-facing interface for savings. Future analytics, reward visualization, and additional savings products should be able to extend the dashboard without restructuring the entire application."""
    },
    {
        "title": "Issue 6 — Implement Deposit and Withdrawal Flow",
        "labels": ["complex", "complexity: high", "frontend", "smart-contract", "stellar"],
        "body": """### Description

Implement the complete end-to-end savings flow connecting the Continuum frontend to the Soroban vault contract.

Users should be able to select a supported asset, enter a deposit amount, select a lock duration, review the resulting savings position, approve the transaction through their wallet, and receive confirmation after the transaction has been successfully processed.

The withdrawal flow should allow users to retrieve eligible funds after maturity and clearly explain why an early withdrawal is subject to the protocol's penalty mechanism.

The implementation should prioritize transaction safety, clear user feedback, and predictable error handling.

### Tasks
- [ ] Build the deposit interface.
- [ ] Add supported asset selection.
- [ ] Add amount validation.
- [ ] Add lock-duration selection.
- [ ] Display transaction review information.
- [ ] Connect deposit transactions to the Soroban contract.
- [ ] Track transaction status.
- [ ] Build the withdrawal interface.
- [ ] Validate position maturity.
- [ ] Display early withdrawal consequences where applicable.
- [ ] Handle transaction failures and rejected signatures.
- [ ] Refresh position state after successful transactions.

### Acceptance Criteria
- Users can successfully initiate a savings deposit.
- Invalid amounts cannot be submitted.
- Users can select from supported assets and lock periods.
- The wallet receives the correct transaction request.
- Successful deposits create a corresponding on-chain position.
- Withdrawal availability reflects the actual maturity state.
- Successful withdrawals update the frontend state.
- Failed transactions do not incorrectly appear as successful.
- Users receive clear feedback throughout the transaction lifecycle.
- All automated tests and build validations pass.

### Additional Notes

This issue connects the smart-contract layer and frontend into a complete user flow. The implementation should be designed so that future savings products can reuse the same transaction infrastructure."""
    },
    {
        "title": "Issue 7 — Add Savings Position Indexing and Transaction History",
        "labels": ["complex", "complexity: high", "indexing", "backend", "stellar"],
        "body": """### Description

Implement an indexing and transaction-history layer for Continuum's integration. Users need a reliable way to view their historical deposits, withdrawals, penalties, and other savings activity without requiring the frontend to manually reconstruct the entire blockchain state on every page load.

The initial implementation should focus on the data required by the Continuum dashboard while maintaining a scalable architecture that can later support analytics, notifications, portfolio history, and additional protocol activity.

The implementation should gracefully handle missing records, pagination, duplicate events, temporary indexing failures, and users with large transaction histories.

### Tasks
- [ ] Define the savings activity data model.
- [ ] Index relevant events.
- [ ] Track deposits.
- [ ] Track withdrawals.
- [ ] Track early withdrawal penalties.
- [ ] Track maturity events where applicable.
- [ ] Associate events with wallet addresses.
- [ ] Implement transaction history retrieval.
- [ ] Add pagination.
- [ ] Prevent duplicate records.
- [ ] Handle indexing failures and retries.
- [ ] Document the indexing architecture.

### Acceptance Criteria
- Deposit and withdrawal events can be retrieved by wallet address.
- Historical transactions are displayed in chronological order.
- Duplicate blockchain events do not create duplicate records.
- Large histories can be paginated efficiently.
- Indexing failures can recover without corrupting existing records.
- The dashboard can consume the history through a clean interface.
- The architecture can support additional event types later.
- Tests cover indexing and duplicate-event scenarios.
- Build and validation checks pass successfully.

### Additional Notes

This issue establishes the data infrastructure required for a reliable savings experience and future protocol analytics."""
    },
    {
        "title": "Issue 8 — Implement Protocol Testing and Security Test Suite",
        "labels": ["complex", "complexity: high", "testing", "security", "stellar", "soroban"],
        "body": """### Description

Create a comprehensive automated testing suite for Continuum's Soroban implementation. Because the protocol controls user savings through smart contracts, correctness and predictable failure behavior are critical.

The test suite should cover both normal protocol operations and adversarial or unexpected conditions. Testing should verify that unauthorized users cannot access another user's savings, locked positions cannot be withdrawn prematurely, penalties are calculated correctly, and contract state remains consistent when transactions fail.

The initial implementation should establish reusable fixtures and testing utilities so that future contributors can add new protocol functionality without creating isolated or duplicated testing infrastructure.

### Tasks
- [ ] Create reusable Soroban test fixtures.
- [ ] Test vault creation.
- [ ] Test deposits.
- [ ] Test withdrawals.
- [ ] Test maturity validation.
- [ ] Test unauthorized withdrawals.
- [ ] Test early withdrawal penalties.
- [ ] Test penalty redistribution.
- [ ] Test unsupported assets.
- [ ] Test invalid amounts.
- [ ] Test repeated withdrawals.
- [ ] Test failed token transfers.
- [ ] Test multiple users and positions.
- [ ] Test edge cases around maturity timestamps.
- [ ] Document the testing strategy.

### Acceptance Criteria
- Core protocol functionality has automated test coverage.
- Unauthorized access attempts fail.
- Premature withdrawals fail according to the contract rules.
- Penalty calculations are deterministic.
- Distribution calculations are validated.
- Repeated withdrawals cannot drain a position.
- Invalid inputs return predictable errors.
- Multiple users cannot interfere with each other's positions.
- Tests cover boundary and failure conditions.
- The complete test suite passes consistently.

### Additional Notes

This issue provides the security and regression-testing foundation for future contributors working on Continuum's implementation. New protocol functionality should be accompanied by tests using the established fixtures."""
    },
    {
        "title": "Issue 9 — Create Developer Documentation and Deployment Guide",
        "labels": ["complex", "complexity: high", "documentation", "stellar", "soroban"],
        "body": """### Description

Create comprehensive developer documentation for Continuum's Soroban implementation. The documentation should allow a new contributor to understand the architecture, configure a local development environment, deploy the contracts to a test environment, interact with the contracts, and run the complete test suite without requiring undocumented project knowledge.

The initial implementation should focus on documenting the current architecture and contributor workflow while keeping the documentation structure extensible for future contracts, integrations, and deployment environments.

Documentation should include contract architecture, storage models, transaction flows, frontend integration, environment configuration, testing, deployment, and troubleshooting.

### Tasks
- [ ] Document the Soroban architecture.
- [ ] Document contract responsibilities.
- [ ] Document storage structures.
- [ ] Document deposit and withdrawal flows.
- [ ] Document penalty accounting.
- [ ] Document supported assets.
- [ ] Document local development setup.
- [ ] Document environment variables.
- [ ] Document contract deployment.
- [ ] Document test execution.
- [ ] Document frontend integration.
- [ ] Add troubleshooting guidance.
- [ ] Add contributor setup instructions.

### Acceptance Criteria
- A new contributor can successfully set up the project using the documentation.
- Contract architecture is clearly explained.
- Deployment instructions are reproducible.
- Environment configuration is documented.
- Contract interaction examples are provided.
- Testing instructions are complete.
- Common errors have documented solutions.
- Documentation matches the actual implementation.
- Documentation does not contain obsolete or contradictory instructions.
- The documentation can be extended as additional functionality is introduced.

### Additional Notes

This issue reduces the onboarding barrier for contributors and creates a reliable technical reference for future development of Continuum's implementation."""
    },
    {
        "title": "Issue 10 — Optimize Continuum for Mobile and Stablecoin Savings",
        "labels": ["complex", "complexity: high", "mobile", "frontend", "stellar"],
        "body": """### Description

Improve Continuum's frontend experience for mobile-first savings users, with a particular focus on stablecoin transactions and users operating under constrained network conditions.

Continuum has been designed around the idea of accessible, low-cost digital savings, including its previous Celo/MiniPay-oriented experience. The implementation should preserve this accessibility while providing a simple and reliable experience for users who may primarily interact with the protocol through mobile wallets.

The initial implementation should focus on responsive savings flows, transaction feedback, low-bandwidth behavior, and simplified onboarding without compromising the underlying security or transparency of the protocol.

### Tasks
- [ ] Audit the existing mobile savings flow.
- [ ] Optimize wallet connection on mobile devices.
- [ ] Improve responsive dashboard layouts.
- [ ] Optimize deposit and withdrawal interfaces for small screens.
- [ ] Add clear transaction progress states.
- [ ] Handle slow network conditions gracefully.
- [ ] Add retry states for recoverable failures.
- [ ] Reduce unnecessary frontend requests.
- [ ] Optimize loading states.
- [ ] Improve mobile navigation.
- [ ] Test supported screen sizes and wallet flows.
- [ ] Document mobile-specific implementation considerations.

### Acceptance Criteria
- Core savings flows are fully usable on mobile devices.
- Wallet connection works correctly on supported mobile environments.
- Deposit and withdrawal flows remain understandable on small screens.
- Users receive clear feedback while transactions are pending.
- Temporary network failures do not leave the interface in an incorrect state.
- Loading states are implemented for asynchronous blockchain operations.
- The interface does not require unnecessary repeated blockchain requests.
- Responsive behavior is verified across common mobile viewport sizes.
- No sensitive wallet information is stored by the frontend.
- Linting, type checking, and production builds pass successfully.

### Additional Notes

This issue strengthens Continuum's accessibility for mobile-first use."""
    }
]

def main():
    print("=== Continuum GitHub Issue Creator ===")
    print("Ensuring labels exist...")
    for name, color, desc in LABELS:
        cmd = ["gh", "label", "create", name, "--color", color, "--description", desc, "--force"]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
            print(f"  [+] Label '{name}' ensured.")
        else:
            print(f"  [*] Label '{name}' status: {res.stderr.strip() or 'OK'}")

    print("\nCreating 10 GitHub Issues...")
    for idx, issue in enumerate(ISSUES, 1):
        cmd = ["gh", "issue", "create", "--title", issue["title"], "--body", issue["body"]]
        for label in issue["labels"]:
            cmd.extend(["--label", label])
        
        print(f"Creating Issue {idx}: {issue['title']}...")
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
            print(f"  [SUCCESS] {res.stdout.strip()}")
        else:
            print(f"  [ERROR] Failed to create issue {idx}: {res.stderr.strip()}")

if __name__ == "__main__":
    main()
