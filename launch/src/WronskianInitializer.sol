// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { IHooks } from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import { IUnlockCallback } from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import { FullMath } from "@uniswap/v4-core/src/libraries/FullMath.sol";
import { Hooks } from "@uniswap/v4-core/src/libraries/Hooks.sol";
import { TickMath } from "@uniswap/v4-core/src/libraries/TickMath.sol";
import { BalanceDelta } from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import { Currency } from "@uniswap/v4-core/src/types/Currency.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { ModifyLiquidityParams, SwapParams } from "@uniswap/v4-core/src/types/PoolOperation.sol";
import { WronskianToken } from "./WronskianToken.sol";
import { WronskianHook } from "./WronskianHook.sol";

/// @title Wronskian launch initializer
/// @notice One-shot launch: creates the ETH/WRON pool, puts the whole token supply into one concentrated-liquidity
///         position that this contract owns forever, and executes the funded first buy, all in one transaction.
/// @dev Follows Programmable's Native20 reference initializer pattern. The position starts at its upper tick, so it
///      holds only WRON at launch (no ETH seed); ETH reserves come from real buys. There is deliberately no
///      remove-liquidity, fee-collect, approve, operator, sweep or arbitrary-call entry point, so the liquidity can
///      never be pulled. Initialization can only be run once, by the fixed `launcher`.
contract WronskianInitializer is IUnlockCallback {
    address public constant CANONICAL_POOL_MANAGER = 0x000000000004444c5dc75cB358380D2e3dE08A90;
    int24 public constant TICK_SPACING = 60;
    bytes32 public constant POSITION_SALT = bytes32(0);
    /// @dev beforeInitialize, beforeAddLiquidity, beforeSwap, afterSwap and both swap return deltas.
    uint160 public constant HOOK_FLAGS = 0x28cc;

    IPoolManager public immutable poolManager;
    address public immutable launcher;
    int24 public immutable tickLower;
    int24 public immutable tickUpper;

    bool public initialized;
    address public token;
    address public hook;
    uint128 public lockedLiquidity;
    uint256 public seededTokenAmount;
    address public initialBuyer;
    uint256 public initialBuyWei;
    uint256 public initialTokensOut;
    uint256 public minimumInitialTokensOut;
    bytes32 private pendingUnlock;

    error InvalidEnvironment();
    error UnauthorizedLauncher();
    error AlreadyInitialized();
    error InvalidInventory();
    error InvalidHookBinding();
    error InvalidUnlock();
    error UnexpectedLiquidityDelta();
    error TokenSettlementMismatch();
    error InvalidInitialBuy();

    event TokenInventorySeeded(address indexed token, address indexed hook, uint128 lockedLiquidity, uint256 tokenAmount);
    event InitialBuyExecuted(address indexed buyer, address indexed token, uint256 grossNativeWei, uint256 tokensOut);

    /// @param launcher_ The only address allowed to call `initialize` (the launch executor or controller).
    /// @param tickLower_ Lower tick of the position (highest WRON price it covers).
    /// @param tickUpper_ Upper tick of the position; also the starting price. Both must be multiples of 60.
    constructor(IPoolManager manager, address launcher_, int24 tickLower_, int24 tickUpper_) {
        if (
            block.chainid != 1 || address(manager) != CANONICAL_POOL_MANAGER || address(manager).code.length == 0
                || launcher_ == address(0) || tickLower_ >= tickUpper_ || tickLower_ % TICK_SPACING != 0
                || tickUpper_ % TICK_SPACING != 0 || tickLower_ < TickMath.minUsableTick(TICK_SPACING)
                || tickUpper_ > TickMath.maxUsableTick(TICK_SPACING)
        ) revert InvalidEnvironment();
        poolManager = manager;
        launcher = launcher_;
        tickLower = tickLower_;
        tickUpper = tickUpper_;
    }

    function initialSqrtPriceX96() public view returns (uint160) {
        return TickMath.getSqrtPriceAtTick(tickUpper);
    }

    /// @notice Runs the launch. Called once, after the token and hook exist, with the first-buy ETH as msg.value.
    function initialize(address token_, address hook_, address buyer_, uint256 minimumTokensOut_) external payable {
        if (msg.sender != launcher) revert UnauthorizedLauncher();
        if (initialized) revert AlreadyInitialized();
        if (
            buyer_ == address(0) || buyer_ == address(this) || msg.value == 0
                || msg.value > uint256(uint128(type(int128).max)) || minimumTokensOut_ == 0
        ) revert InvalidInitialBuy();
        if (token_.codehash != keccak256(type(WronskianToken).runtimeCode)) revert InvalidInventory();
        uint256 inventory = WronskianToken(token_).balanceOf(address(this));
        if (inventory != WronskianToken(token_).totalSupply()) revert InvalidInventory();
        WronskianHook wronHook = WronskianHook(hook_);
        if (
            hook_.code.length == 0 || address(wronHook.poolManager()) != address(poolManager)
                || wronHook.token() != token_ || wronHook.initializer() != address(this)
                || wronHook.initialSqrtPriceX96() != initialSqrtPriceX96() || wronHook.FEE_BPS() != 500
                || uint160(hook_) & Hooks.ALL_HOOK_MASK != HOOK_FLAGS
        ) revert InvalidHookBinding();

        uint256 liquidity =
            FullMath.mulDiv(inventory, 1 << 96, uint256(initialSqrtPriceX96()) - TickMath.getSqrtPriceAtTick(tickLower));
        if (liquidity == 0 || liquidity > uint128(type(int128).max)) revert InvalidInventory();
        initialized = true;
        token = token_;
        hook = hook_;
        lockedLiquidity = uint128(liquidity);
        initialBuyer = buyer_;
        initialBuyWei = msg.value;
        minimumInitialTokensOut = minimumTokensOut_;
        poolManager.initialize(_poolKey(), initialSqrtPriceX96());
        bytes memory data = abi.encode(token_, hook_, lockedLiquidity, buyer_, msg.value, minimumTokensOut_);
        pendingUnlock = keccak256(data);
        bytes memory result = poolManager.unlock(data);
        if (
            pendingUnlock != bytes32(0) || result.length != 0 || seededTokenAmount == 0
                || initialTokensOut < minimumTokensOut_
        ) revert InvalidUnlock();
        emit TokenInventorySeeded(token_, hook_, lockedLiquidity, seededTokenAmount);
        emit InitialBuyExecuted(buyer_, token_, msg.value, initialTokensOut);
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert InvalidUnlock();
        if (pendingUnlock == bytes32(0) || keccak256(data) != pendingUnlock) revert InvalidUnlock();
        pendingUnlock = bytes32(0);
        (BalanceDelta delta, BalanceDelta feesAccrued) = poolManager.modifyLiquidity(
            _poolKey(),
            ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: int256(uint256(lockedLiquidity)),
                salt: POSITION_SALT
            }),
            ""
        );
        if (delta.amount0() != 0 || delta.amount1() >= 0 || BalanceDelta.unwrap(feesAccrued) != 0) {
            revert UnexpectedLiquidityDelta();
        }
        uint256 owed = uint256(-int256(delta.amount1()));
        seededTokenAmount = owed;
        poolManager.sync(Currency.wrap(token));
        if (!WronskianToken(token).transfer(address(poolManager), owed)) revert TokenSettlementMismatch();
        if (poolManager.settle() != owed) revert TokenSettlementMismatch();
        BalanceDelta buy = poolManager.swap(
            _poolKey(),
            SwapParams({
                zeroForOne: true, amountSpecified: -int256(initialBuyWei), sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            ""
        );
        if (int256(buy.amount0()) != -int256(initialBuyWei) || buy.amount1() <= 0) revert InvalidInitialBuy();
        uint256 tokensOut = uint256(int256(buy.amount1()));
        if (tokensOut < minimumInitialTokensOut) revert InvalidInitialBuy();
        initialTokensOut = tokensOut;
        poolManager.sync(Currency.wrap(address(0)));
        if (poolManager.settle{ value: initialBuyWei }() != initialBuyWei) revert InvalidInitialBuy();
        poolManager.take(Currency.wrap(token), initialBuyer, tokensOut);
        return "";
    }

    function _poolKey() private view returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token),
            fee: 0,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(hook)
        });
    }
}
