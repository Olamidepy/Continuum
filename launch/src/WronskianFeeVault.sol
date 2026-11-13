// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { IUnlockCallback } from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import { Currency } from "@uniswap/v4-core/src/types/Currency.sol";

/// @title Wronskian fee vault
/// @notice Holds every Wronskian trading fee as native-ETH PoolManager claims and pays them only to the fixed
///         creator wallet.
/// @dev Follows Programmable's reviewed native-fee vault pattern, cut down to a single creator ledger. The hook mints ERC-6909 native claims to this vault before it records any fee,
///      so the ledger is always fully backed. No allowances, no operator, no arbitrary calls: the only way out is a
///      payment to `creatorRecipient`, which anyone may trigger and pay the gas for.
contract WronskianFeeVault is IUnlockCallback {
    IPoolManager public immutable poolManager;
    address public immutable kernel;
    address public immutable creatorRecipient;

    uint256 public creatorAccrued;
    uint256 public totalClaimed;

    bool private claiming;
    bytes32 private activeAction;

    error UnauthorizedKernel();
    error InvalidClaim();
    error InsufficientFeeBacking();
    error Reentrant();
    error NothingToClaim();

    event FeesRecorded(uint256 amount);
    event FeesClaimed(address indexed recipient, uint256 amount);
    event ClaimsTransferred(address indexed recipient, uint256 amount);

    constructor(IPoolManager manager, address creator) {
        if (address(manager) == address(0) || creator == address(0)) revert InvalidClaim();
        poolManager = manager;
        kernel = msg.sender;
        creatorRecipient = creator;
    }

    /// @notice Called by the Wronskian hook after it has minted the matching native claims to this vault.
    function recordFees(uint256 amount) external {
        if (msg.sender != kernel) revert UnauthorizedKernel();
        if (claiming) revert Reentrant();
        creatorAccrued += amount;
        if (poolManager.balanceOf(address(this), 0) < creatorAccrued) revert InsufficientFeeBacking();
        emit FeesRecorded(amount);
    }

    /// @notice Pays every accrued fee to the creator wallet in ETH. Anyone may call it and pay the gas.
    function claim() external returns (uint256 amount) {
        if (claiming) revert Reentrant();
        amount = creatorAccrued;
        if (amount == 0) revert NothingToClaim();
        claiming = true;
        creatorAccrued = 0;
        totalClaimed += amount;
        bytes memory data = abi.encode(creatorRecipient, amount);
        activeAction = keccak256(data);
        bytes memory result = poolManager.unlock(data);
        if (result.length != 0 || activeAction != bytes32(0)) revert InvalidClaim();
        claiming = false;
        emit FeesClaimed(creatorRecipient, amount);
    }

    /// @notice Fallback if the creator wallet can't receive plain ETH: moves the whole ledger to it as PoolManager
    ///         ETH claims (ERC-6909 id 0), redeemable for ETH at the PoolManager.
    function claimAsClaims() external returns (uint256 amount) {
        if (claiming) revert Reentrant();
        amount = creatorAccrued;
        if (amount == 0) revert NothingToClaim();
        creatorAccrued = 0;
        totalClaimed += amount;
        if (!poolManager.transfer(creatorRecipient, 0, amount)) revert InvalidClaim();
        emit ClaimsTransferred(creatorRecipient, amount);
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(poolManager) || !claiming || keccak256(data) != activeAction) revert InvalidClaim();
        activeAction = bytes32(0);
        (address recipient, uint256 amount) = abi.decode(data, (address, uint256));
        poolManager.burn(address(this), 0, amount);
        poolManager.take(Currency.wrap(address(0)), recipient, amount);
        return "";
    }
}
