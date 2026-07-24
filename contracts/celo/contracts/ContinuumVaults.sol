// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ContinuumVaults
 * @author Continuum Protocol Team
 * @notice Decentralized time-locked savings protocol on Celo.
 *         Supports native CELO and cUSD (ERC-20) deposits.
 *         Early withdrawal incurs a 10% penalty redistributed to remaining stakers.
 * @dev Employs MasterChef-style accumulated reward per share accounting for penalty redistribution.
 */
contract ContinuumVaults is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    // Errors
    // ──────────────────────────────────────────────
    error NotAuthorized();
    error VaultNotFound();
    error VaultLocked();
    error VaultInactive();
    error InvalidDuration();
    error InsufficientFunds();
    error InvalidAssetType();

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────
    event VaultCreated(uint256 indexed vaultId, address indexed owner, uint8 assetType, uint256 amount, uint256 unlockAt);
    event DepositIncreased(uint256 indexed vaultId, uint256 additionalAmount);
    event LockExtended(uint256 indexed vaultId, uint256 newUnlockAt);
    event RewardsClaimed(uint256 indexed vaultId, uint256 amount);
    event Withdrawn(uint256 indexed vaultId, uint256 payout);
    event EmergencyWithdrawn(uint256 indexed vaultId, uint256 payout, uint256 penalty);

    // ──────────────────────────────────────────────
    // Constants
    // ──────────────────────────────────────────────
    uint256 private constant REWARD_SCALE = 1e12;

    // Duration constants in seconds (Celo ~5s blocks)
    uint256 public constant DURATION_30_DAYS  = 30 days;
    uint256 public constant DURATION_90_DAYS  = 90 days;
    uint256 public constant DURATION_180_DAYS = 180 days;
    uint256 public constant DURATION_365_DAYS = 365 days;

    // Multipliers (scaled by 1000: 1.0x = 1000)
    uint256 private constant MULTIPLIER_30  = 1000;
    uint256 private constant MULTIPLIER_90  = 1200;
    uint256 private constant MULTIPLIER_180 = 1500;
    uint256 private constant MULTIPLIER_365 = 2000;

    // Penalty config (basis points, /10000)
    uint256 public constant PENALTY_BPS        = 1000; // 10%
    uint256 public constant TREASURY_SHARE_BPS = 2000; // 20% of penalty

    // Asset type enum values
    uint8 public constant ASSET_CELO = 0;
    uint8 public constant ASSET_CUSD = 1;

    // ──────────────────────────────────────────────
    // Structs
    // ──────────────────────────────────────────────
    struct Vault {
        address owner;
        uint256 amount;
        uint256 shares;
        uint8   assetType;      // 0 = CELO, 1 = cUSD
        uint256 unlockAt;       // timestamp
        uint256 createdAt;      // timestamp
        uint256 lastRewardPerShare;
        uint256 claimableRewards;
        bool    active;
    }

    // ──────────────────────────────────────────────
    // State
    // ──────────────────────────────────────────────
    address public owner;
    address public treasuryAddress;
    IERC20  public cusdToken;

    uint256 public vaultCounter;

    // Per-asset global tracking
    uint256 public totalLockedCelo;
    uint256 public totalLockedCusd;
    uint256 public totalSharesCelo;
    uint256 public totalSharesCusd;
    uint256 public accRewardPerShareCelo;
    uint256 public accRewardPerShareCusd;

    // Vault storage
    mapping(uint256 => Vault) public vaults;
    mapping(address => uint256[]) public userVaults;

    // ──────────────────────────────────────────────
    // Modifiers
    // ──────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    // ──────────────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────────────
    constructor(address _cusdToken) {
        owner = msg.sender;
        treasuryAddress = msg.sender;
        cusdToken = IERC20(_cusdToken);
    }

    // ──────────────────────────────────────────────
    // Admin
    // ──────────────────────────────────────────────
    function setTreasuryAddress(address _treasury) external onlyOwner {
        treasuryAddress = _treasury;
    }

    function setCusdToken(address _cusd) external onlyOwner {
        cusdToken = IERC20(_cusd);
    }

    // ──────────────────────────────────────────────
    // Public Write Functions
    // ──────────────────────────────────────────────

    /**
     * @notice Create a new time-locked vault.
     * @param lockDuration Lock duration in seconds (must be 30/90/180/365 days).
     * @param assetType    0 = native CELO (send via msg.value), 1 = cUSD (approve first).
     * @param amount       Amount of cUSD to deposit (ignored for CELO — uses msg.value).
     */
    function createVault(
        uint256 lockDuration,
        uint8   assetType,
        uint256 amount
    ) external payable nonReentrant returns (uint256) {
        if (!_isValidDuration(lockDuration)) revert InvalidDuration();

        uint256 depositAmount;

        if (assetType == ASSET_CELO) {
            if (msg.value == 0) revert InsufficientFunds();
            depositAmount = msg.value;
        } else if (assetType == ASSET_CUSD) {
            if (amount == 0) revert InsufficientFunds();
            depositAmount = amount;
            cusdToken.safeTransferFrom(msg.sender, address(this), depositAmount);
        } else {
            revert InvalidAssetType();
        }

        uint256 multiplier = _getMultiplier(lockDuration);
        uint256 shares = (depositAmount * multiplier) / 1000;

        vaultCounter++;
        uint256 vaultId = vaultCounter;

        uint256 currentAcc = assetType == ASSET_CELO
            ? accRewardPerShareCelo
            : accRewardPerShareCusd;

        vaults[vaultId] = Vault({
            owner: msg.sender,
            amount: depositAmount,
            shares: shares,
            assetType: assetType,
            unlockAt: block.timestamp + lockDuration,
            createdAt: block.timestamp,
            lastRewardPerShare: currentAcc,
            claimableRewards: 0,
            active: true
        });

        userVaults[msg.sender].push(vaultId);

        if (assetType == ASSET_CELO) {
            totalLockedCelo += depositAmount;
            totalSharesCelo += shares;
        } else {
            totalLockedCusd += depositAmount;
            totalSharesCusd += shares;
        }

        emit VaultCreated(vaultId, msg.sender, assetType, depositAmount, block.timestamp + lockDuration);
        return vaultId;
    }

    /**
     * @notice Increase the deposit of an active vault.
     */
    function increaseDeposit(
        uint256 vaultId,
        uint256 amount
    ) external payable nonReentrant {
        Vault storage v = vaults[vaultId];
        if (!v.active) revert VaultInactive();
        if (v.owner != msg.sender) revert NotAuthorized();

        // Settle pending rewards first
        _updateVaultRewards(vaultId);

        uint256 depositAmount;
        if (v.assetType == ASSET_CELO) {
            if (msg.value == 0) revert InsufficientFunds();
            depositAmount = msg.value;
        } else {
            if (amount == 0) revert InsufficientFunds();
            depositAmount = amount;
            cusdToken.safeTransferFrom(msg.sender, address(this), depositAmount);
        }

        uint256 duration = v.unlockAt - v.createdAt;
        uint256 multiplier = _getMultiplier(duration);
        uint256 additionalShares = (depositAmount * multiplier) / 1000;

        v.amount += depositAmount;
        v.shares += additionalShares;

        if (v.assetType == ASSET_CELO) {
            totalLockedCelo += depositAmount;
            totalSharesCelo += additionalShares;
        } else {
            totalLockedCusd += depositAmount;
            totalSharesCusd += additionalShares;
        }

        emit DepositIncreased(vaultId, depositAmount);
    }

    /**
     * @notice Extend the lock period of an active vault (must be longer than current).
     */
    function extendLock(uint256 vaultId, uint256 newLockDuration) external nonReentrant {
        Vault storage v = vaults[vaultId];
        if (!v.active) revert VaultInactive();
        if (v.owner != msg.sender) revert NotAuthorized();
        if (!_isValidDuration(newLockDuration)) revert InvalidDuration();

        uint256 newUnlock = block.timestamp + newLockDuration;
        if (newUnlock <= v.unlockAt) revert InvalidDuration();

        // Settle pending rewards first
        _updateVaultRewards(vaultId);

        uint256 oldShares = v.shares;
        uint256 newMultiplier = _getMultiplier(newLockDuration);
        uint256 newShares = (v.amount * newMultiplier) / 1000;

        v.shares = newShares;
        v.unlockAt = newUnlock;
        v.createdAt = block.timestamp;

        if (v.assetType == ASSET_CELO) {
            totalSharesCelo = totalSharesCelo - oldShares + newShares;
        } else {
            totalSharesCusd = totalSharesCusd - oldShares + newShares;
        }

        emit LockExtended(vaultId, newUnlock);
    }

    /**
     * @notice Claim accrued rewards for a vault (does not touch principal).
     */
    function claimRewards(uint256 vaultId) external nonReentrant {
        Vault storage v = vaults[vaultId];
        if (!v.active) revert VaultInactive();
        if (v.owner != msg.sender) revert NotAuthorized();

        _updateVaultRewards(vaultId);

        uint256 claimable = v.claimableRewards;
        if (claimable == 0) return;

        v.claimableRewards = 0;

        _transferOut(v.assetType, v.owner, claimable);

        emit RewardsClaimed(vaultId, claimable);
    }

    /**
     * @notice Standard withdrawal after maturity (no penalty). Returns principal + rewards.
     */
    function withdraw(uint256 vaultId) external nonReentrant {
        Vault storage v = vaults[vaultId];
        if (!v.active) revert VaultInactive();
        if (v.owner != msg.sender) revert NotAuthorized();
        if (block.timestamp < v.unlockAt) revert VaultLocked();

        _updateVaultRewards(vaultId);

        uint256 principal = v.amount;
        uint256 rewards = v.claimableRewards;
        uint256 shares = v.shares;
        uint256 payout = principal + rewards;

        // Deactivate
        v.active = false;
        v.amount = 0;
        v.shares = 0;
        v.claimableRewards = 0;

        if (v.assetType == ASSET_CELO) {
            totalLockedCelo -= principal;
            totalSharesCelo -= shares;
        } else {
            totalLockedCusd -= principal;
            totalSharesCusd -= shares;
        }

        _transferOut(v.assetType, v.owner, payout);

        emit Withdrawn(vaultId, payout);
    }

    /**
     * @notice Emergency early withdrawal with 10% penalty.
     *         80% of penalty redistributed to remaining stakers, 20% to treasury.
     */
    function emergencyWithdraw(uint256 vaultId) external nonReentrant {
        Vault storage v = vaults[vaultId];
        if (!v.active) revert VaultInactive();
        if (v.owner != msg.sender) revert NotAuthorized();
        if (block.timestamp >= v.unlockAt) revert VaultLocked(); // Use withdraw() if matured

        _updateVaultRewards(vaultId);

        uint256 principal = v.amount;
        uint256 rewards = v.claimableRewards;
        uint256 shares = v.shares;

        uint256 penalty = (principal * PENALTY_BPS) / 10000;
        uint256 userRefund = principal - penalty;
        uint256 payout = userRefund + rewards;

        uint256 treasuryPart = (penalty * TREASURY_SHARE_BPS) / 10000;
        uint256 redistributePart = penalty - treasuryPart;

        // Deactivate
        v.active = false;
        v.amount = 0;
        v.shares = 0;
        v.claimableRewards = 0;

        if (v.assetType == ASSET_CELO) {
            totalLockedCelo -= principal;
            totalSharesCelo -= shares;
            uint256 remaining = totalSharesCelo;
            if (remaining > 0) {
                accRewardPerShareCelo += (redistributePart * REWARD_SCALE) / remaining;
            }
        } else {
            totalLockedCusd -= principal;
            totalSharesCusd -= shares;
            uint256 remaining = totalSharesCusd;
            if (remaining > 0) {
                accRewardPerShareCusd += (redistributePart * REWARD_SCALE) / remaining;
            }
        }

        // Pay user
        _transferOut(v.assetType, v.owner, payout);
        // Pay treasury
        if (treasuryPart > 0) {
            _transferOut(v.assetType, treasuryAddress, treasuryPart);
        }
        // If no remaining stakers, send redistribute part to treasury too
        if ((v.assetType == ASSET_CELO ? totalSharesCelo : totalSharesCusd) == 0 && redistributePart > 0) {
            _transferOut(v.assetType, treasuryAddress, redistributePart);
        }

        emit EmergencyWithdrawn(vaultId, payout, penalty);
    }

    // ──────────────────────────────────────────────
    // Read-Only Functions
    // ──────────────────────────────────────────────

    function getVault(uint256 vaultId) external view returns (Vault memory) {
        return vaults[vaultId];
    }

    function getUserVaults(address user) external view returns (uint256[] memory) {
        return userVaults[user];
    }

    function getPendingRewards(uint256 vaultId) external view returns (uint256) {
        Vault storage v = vaults[vaultId];
        if (!v.active) return 0;

        uint256 currentAcc = v.assetType == ASSET_CELO
            ? accRewardPerShareCelo
            : accRewardPerShareCusd;

        uint256 diff = currentAcc > v.lastRewardPerShare
            ? currentAcc - v.lastRewardPerShare
            : 0;

        uint256 newRewards = (v.shares * diff) / REWARD_SCALE;
        return v.claimableRewards + newRewards;
    }

    function getContractStats() external view returns (
        uint256 _totalLockedCelo,
        uint256 _totalLockedCusd,
        uint256 _totalSharesCelo,
        uint256 _totalSharesCusd,
        uint256 _vaultCounter
    ) {
        return (
            totalLockedCelo,
            totalLockedCusd,
            totalSharesCelo,
            totalSharesCusd,
            vaultCounter
        );
    }

    // ──────────────────────────────────────────────
    // Internal Helpers
    // ──────────────────────────────────────────────

    function _updateVaultRewards(uint256 vaultId) internal {
        Vault storage v = vaults[vaultId];

        uint256 currentAcc = v.assetType == ASSET_CELO
            ? accRewardPerShareCelo
            : accRewardPerShareCusd;

        uint256 diff = currentAcc > v.lastRewardPerShare
            ? currentAcc - v.lastRewardPerShare
            : 0;

        uint256 newRewards = (v.shares * diff) / REWARD_SCALE;
        v.claimableRewards += newRewards;
        v.lastRewardPerShare = currentAcc;
    }

    function _getMultiplier(uint256 duration) internal pure returns (uint256) {
        if (duration >= DURATION_365_DAYS) return MULTIPLIER_365;
        if (duration >= DURATION_180_DAYS) return MULTIPLIER_180;
        if (duration >= DURATION_90_DAYS)  return MULTIPLIER_90;
        return MULTIPLIER_30;
    }

    function _isValidDuration(uint256 duration) internal pure returns (bool) {
        return duration == DURATION_30_DAYS
            || duration == DURATION_90_DAYS
            || duration == DURATION_180_DAYS
            || duration == DURATION_365_DAYS;
    }

    function _transferOut(uint8 assetType, address to, uint256 amount) internal {
        if (assetType == ASSET_CELO) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "CELO transfer failed");
        } else {
            cusdToken.safeTransfer(to, amount);
        }
    }

    // Allow contract to receive CELO
    receive() external payable {}
}
