// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title WronskianVault
/// @notice Time-locked vaults for the Wronskian token on Ethereum.
///         Lock tokens for 3, 7, 14 or 30 days. Longer locks earn a bigger share.
///         Leaving early forfeits 10% of the principal, and all of it goes to everyone still locked.
///         Anyone can also add tokens to the reward pool.
/// @dev    No owner, no admin, no pause, no proxy, no treasury. The token is fixed at deploy.
///         Rewards use the accumulated-reward-per-share pattern, so every action is O(1).
///         WRON launches with its own Uniswap v4 hook (launch/ in this repo); this vault is a
///         separate contract and never touches the pool or the hook.
contract WronskianVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Errors ─────────────────────────────────────────────
    error ZeroAddress();
    error ZeroAmount();
    error InvalidTier();
    error NotVaultOwner();
    error VaultClosed();
    error StillLocked();
    error AlreadyUnlocked();
    error TierTooShort();

    // ─── Events ─────────────────────────────────────────────
    event Locked(uint256 indexed id, address indexed owner, uint8 tier, uint256 amount, uint64 unlockAt);
    event ToppedUp(uint256 indexed id, uint256 amount);
    event Extended(uint256 indexed id, uint8 tier, uint64 unlockAt);
    event Claimed(uint256 indexed id, address indexed owner, uint256 amount);
    event Withdrawn(uint256 indexed id, address indexed owner, uint256 principal, uint256 rewards);
    event ExitedEarly(uint256 indexed id, address indexed owner, uint256 returned, uint256 forfeited);
    event Funded(address indexed from, uint256 amount);
    event Distributed(uint256 amount, uint256 accRewardPerShare);

    // ─── Constants ──────────────────────────────────────────
    uint256 private constant ACC = 1e18;
    uint256 public constant PENALTY_BPS = 1_000; // 10% of principal
    uint256 private constant BPS = 10_000;
    uint256 public constant TIERS = 4;

    // ─── Immutable config ───────────────────────────────────
    IERC20 public immutable token;

    // ─── Types ──────────────────────────────────────────────
    struct Vault {
        address owner;
        uint8 tier;
        bool open;
        uint64 createdAt;
        uint64 unlockAt;
        uint256 amount;
        uint256 shares;
        uint256 rewardDebt;
        uint256 owed;
    }

    // ─── State ──────────────────────────────────────────────
    uint256 public vaultCount;
    uint256 public totalLocked;
    uint256 public totalShares;
    uint256 public accRewardPerShare;
    /// @notice Rewards that arrived while nobody was locked. Paid out on the next lock.
    uint256 public queuedRewards;
    /// @notice Total ever paid to lockers (claims + rewards on withdrawal).
    uint256 public totalRewardsPaid;
    /// @notice Total ever redistributed from early exits and funding.
    uint256 public totalRewardsAdded;

    mapping(uint256 => Vault) private _vaults;
    mapping(address => uint256[]) private _vaultsOf;

    constructor(IERC20 token_) {
        if (address(token_) == address(0)) revert ZeroAddress();
        token = token_;
    }

    // ─── Tiers ──────────────────────────────────────────────

    /// @notice Lock length for a tier: 0 = 3 days, 1 = 7, 2 = 14, 3 = 30.
    function duration(uint8 tier) public pure returns (uint64) {
        if (tier == 0) return 3 days;
        if (tier == 1) return 7 days;
        if (tier == 2) return 14 days;
        if (tier == 3) return 30 days;
        revert InvalidTier();
    }

    /// @notice Share weight for a tier, scaled by 1000 (1.0x, 1.2x, 1.5x, 2.0x).
    function multiplier(uint8 tier) public pure returns (uint256) {
        if (tier == 0) return 1_000;
        if (tier == 1) return 1_200;
        if (tier == 2) return 1_500;
        if (tier == 3) return 2_000;
        revert InvalidTier();
    }

    // ─── Writes ─────────────────────────────────────────────

    /// @notice Open a new vault. Approve this contract for `amount` first.
    function lock(uint256 amount, uint8 tier) external nonReentrant returns (uint256 id) {
        uint64 len = duration(tier);
        uint256 received = _pull(amount);

        id = ++vaultCount;
        uint256 shares = (received * multiplier(tier)) / 1_000;
        uint64 unlockAt = uint64(block.timestamp) + len;

        _vaults[id] = Vault({
            owner: msg.sender,
            tier: tier,
            open: true,
            createdAt: uint64(block.timestamp),
            unlockAt: unlockAt,
            amount: received,
            shares: shares,
            rewardDebt: (shares * accRewardPerShare) / ACC,
            owed: 0
        });
        _vaultsOf[msg.sender].push(id);

        totalLocked += received;
        totalShares += shares;
        _releaseQueued();

        emit Locked(id, msg.sender, tier, received, unlockAt);
    }

    /// @notice Add more tokens to an open, still-locked vault. The unlock time stays the same.
    function topUp(uint256 id, uint256 amount) external nonReentrant {
        Vault storage v = _owned(id);
        if (block.timestamp >= v.unlockAt) revert AlreadyUnlocked();
        _settle(v);

        uint256 received = _pull(amount);
        uint256 added = (received * multiplier(v.tier)) / 1_000;
        v.amount += received;
        v.shares += added;
        v.rewardDebt = (v.shares * accRewardPerShare) / ACC;

        totalLocked += received;
        totalShares += added;
        _releaseQueued();

        emit ToppedUp(id, received);
    }

    /// @notice Restart the lock from now on the same or a longer tier. Shares are re-weighted.
    function extend(uint256 id, uint8 tier) external nonReentrant {
        Vault storage v = _owned(id);
        if (tier < v.tier) revert TierTooShort();
        uint64 unlockAt = uint64(block.timestamp) + duration(tier);
        if (unlockAt <= v.unlockAt) revert TierTooShort();
        _settle(v);

        uint256 newShares = (v.amount * multiplier(tier)) / 1_000;
        totalShares = totalShares - v.shares + newShares;
        v.shares = newShares;
        v.tier = tier;
        v.unlockAt = unlockAt;
        v.rewardDebt = (newShares * accRewardPerShare) / ACC;

        emit Extended(id, tier, unlockAt);
    }

    /// @notice Collect rewards earned so far. Works while locked.
    function claim(uint256 id) external nonReentrant {
        Vault storage v = _owned(id);
        _settle(v);
        uint256 amount = v.owed;
        if (amount == 0) revert ZeroAmount();
        v.owed = 0;
        totalRewardsPaid += amount;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(id, msg.sender, amount);
    }

    /// @notice After the unlock time: take back the full principal plus all rewards.
    function withdraw(uint256 id) external nonReentrant {
        Vault storage v = _owned(id);
        if (block.timestamp < v.unlockAt) revert StillLocked();
        _settle(v);

        uint256 principal = v.amount;
        uint256 rewards = v.owed;
        _close(v);

        totalRewardsPaid += rewards;
        token.safeTransfer(msg.sender, principal + rewards);
        emit Withdrawn(id, msg.sender, principal, rewards);
    }

    /// @notice Leave before the unlock time. 10% of the principal is forfeited and shared with
    ///         everyone still locked. Rewards already earned are paid in full.
    function exitEarly(uint256 id) external nonReentrant {
        Vault storage v = _owned(id);
        if (block.timestamp >= v.unlockAt) revert AlreadyUnlocked();
        _settle(v);

        uint256 principal = v.amount;
        uint256 rewards = v.owed;
        uint256 penalty = (principal * PENALTY_BPS) / BPS;

        // Remove this vault first so the exiting saver never earns from their own penalty.
        _close(v);
        _distribute(penalty);

        uint256 returned = principal - penalty + rewards;
        totalRewardsPaid += rewards;
        token.safeTransfer(msg.sender, returned);

        emit ExitedEarly(id, msg.sender, returned, penalty);
    }

    /// @notice Add tokens to the reward pool for everyone currently locked
    ///         (for example, part of the creator fee). Approve first.
    function fund(uint256 amount) external nonReentrant {
        uint256 received = _pull(amount);
        emit Funded(msg.sender, received);
        _distribute(received);
    }

    // ─── Views ──────────────────────────────────────────────

    function getVault(uint256 id) external view returns (Vault memory) {
        return _vaults[id];
    }

    function vaultsOf(address owner) external view returns (uint256[] memory) {
        return _vaultsOf[owner];
    }

    /// @notice Rewards a vault could claim right now.
    function pending(uint256 id) public view returns (uint256) {
        Vault storage v = _vaults[id];
        if (!v.open) return 0;
        return v.owed + (v.shares * accRewardPerShare) / ACC - v.rewardDebt;
    }

    /// @notice What exitEarly would return right now (principal after penalty + rewards).
    function previewExit(uint256 id) external view returns (uint256 returned, uint256 penalty) {
        Vault storage v = _vaults[id];
        if (!v.open) return (0, 0);
        penalty = block.timestamp >= v.unlockAt ? 0 : (v.amount * PENALTY_BPS) / BPS;
        returned = v.amount - penalty + pending(id);
    }

    function stats()
        external
        view
        returns (uint256 locked, uint256 shares, uint256 vaults, uint256 rewardsAdded, uint256 rewardsPaid, uint256 queued)
    {
        return (totalLocked, totalShares, vaultCount, totalRewardsAdded, totalRewardsPaid, queuedRewards);
    }

    // ─── Internals ──────────────────────────────────────────

    function _owned(uint256 id) private view returns (Vault storage v) {
        v = _vaults[id];
        if (!v.open) revert VaultClosed();
        if (v.owner != msg.sender) revert NotVaultOwner();
    }

    function _pull(uint256 amount) private returns (uint256 received) {
        if (amount == 0) revert ZeroAmount();
        uint256 before = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        received = token.balanceOf(address(this)) - before;
        if (received == 0) revert ZeroAmount();
    }

    function _settle(Vault storage v) private {
        uint256 accrued = (v.shares * accRewardPerShare) / ACC;
        v.owed += accrued - v.rewardDebt;
        v.rewardDebt = accrued;
    }

    function _close(Vault storage v) private {
        totalLocked -= v.amount;
        totalShares -= v.shares;
        v.open = false;
        v.amount = 0;
        v.shares = 0;
        v.owed = 0;
        v.rewardDebt = 0;
    }

    function _distribute(uint256 amount) private {
        if (amount == 0) return;
        totalRewardsAdded += amount;
        if (totalShares == 0) {
            queuedRewards += amount;
            return;
        }
        accRewardPerShare += (amount * ACC) / totalShares;
        emit Distributed(amount, accRewardPerShare);
    }

    /// @dev Called after shares are added, so the new locker shares queued rewards fairly with others.
    function _releaseQueued() private {
        uint256 q = queuedRewards;
        if (q == 0 || totalShares == 0) return;
        queuedRewards = 0;
        accRewardPerShare += (q * ACC) / totalShares;
        emit Distributed(q, accRewardPerShare);
    }
}
