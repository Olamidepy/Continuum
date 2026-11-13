// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { BaseHook } from "@openzeppelin/uniswap-hooks/src/base/BaseHook.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { IHooks } from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import { Hooks } from "@uniswap/v4-core/src/libraries/Hooks.sol";
import { BalanceDelta } from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {
    BeforeSwapDelta,
    BeforeSwapDeltaLibrary,
    toBeforeSwapDelta
} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import { Currency } from "@uniswap/v4-core/src/types/Currency.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { ModifyLiquidityParams, SwapParams } from "@uniswap/v4-core/src/types/PoolOperation.sol";
import { WronskianFeeVault } from "./WronskianFeeVault.sol";

/// @title Wronskian hook
/// @notice Uniswap v4 hook for the single native ETH / WRON pool on Ethereum mainnet.
///         - Every buy and sell pays 5% of its gross ETH value, all to the fixed creator wallet.
///         - Anti-sniper: for the first 30 seconds the buy fee starts at 80% and falls in a straight line to 5%.
///         - Wallet cap: for the first 5 minutes no transaction origin can buy more than 2% of the supply in total.
///         - Only the launch position may ever add liquidity, and it can never be removed.
///         The rates are constants: nobody can change them after deployment. There is no owner.
/// @dev Fee accounting follows Programmable's reviewed native-fee kernel pattern:
///      fees are taken from the ETH leg, round up once per trade, ETH-specified partial fills revert, and fees are
///      funded as native ERC-6909 claims in the vault (deployed by this hook at CREATE nonce 1) before they are
///      recorded. Only the exact bound PoolKey is accepted. No swap, unlock, delegatecall or arbitrary-call path.
contract WronskianHook is BaseHook {
    using SafeCast for uint256;
    using SafeCast for int256;

    uint256 public constant CHAIN_ID = 1;
    address public constant CANONICAL_POOL_MANAGER = 0x000000000004444c5dc75cB358380D2e3dE08A90;
    uint256 public constant FEE_BPS = 500; // 5%
    uint256 public constant OPENING_FEE_BPS = 8_000; // 80% at the launch block
    uint256 public constant OPENING_FEE_SECONDS = 30;
    uint256 public constant PROTECTION_SECONDS = 300;
    uint256 public constant WALLET_TOKEN_LIMIT = 20_000_000 ether; // 2% of the 1,000,000,000 supply
    uint256 public constant FEE_DENOMINATOR = 10_000;
    uint24 public constant LP_FEE = 0;
    int24 public constant TICK_SPACING = 60;

    address public immutable token;
    uint160 public immutable initialSqrtPriceX96;
    address public immutable initializer;
    address public immutable creatorRecipient;
    WronskianFeeVault public immutable feeVault;

    bool public initialized;
    uint256 public launchTimestamp;
    /// @notice WRON bought by each transaction origin during the first 5 minutes.
    mapping(address origin => uint256 tokens) public protectedBought;
    bool private swapActive;
    bytes32 private activeSwap;
    uint256 private activeFeeBps;
    uint256 private expectedNativePoolAmount;

    error InvalidConfiguration();
    error UnexpectedPool();
    error UnauthorizedInitializer();
    error UninitializedPool();
    error ReentrantSwap();
    error InvalidSwapContext();
    error PartialFillUnsupported(uint256 expected, uint256 actual);
    error NoTrade();
    error WalletLimitExceeded(uint256 maximum, uint256 actual);
    error LiquidityLocked();

    event NativeFeeAccrued(
        bytes32 indexed poolId, address indexed sender, bool isBuy, uint256 grossNative, uint256 fee, uint256 feeBps
    );

    constructor(IPoolManager manager, address token_, uint160 initialSqrtPriceX96_, address initializer_, address creator_)
        BaseHook(manager)
    {
        if (
            block.chainid != CHAIN_ID || address(manager) != CANONICAL_POOL_MANAGER || address(manager).code.length == 0
                || token_ == address(0) || token_.code.length == 0 || initializer_ == address(0)
                || creator_ == address(0) || initialSqrtPriceX96_ == 0
        ) revert InvalidConfiguration();
        token = token_;
        initialSqrtPriceX96 = initialSqrtPriceX96_;
        initializer = initializer_;
        creatorRecipient = creator_;
        feeVault = new WronskianFeeVault(manager, creator_);
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory permissions) {
        permissions.beforeInitialize = true;
        permissions.beforeAddLiquidity = true;
        permissions.beforeSwap = true;
        permissions.afterSwap = true;
        permissions.beforeSwapReturnDelta = true;
        permissions.afterSwapReturnDelta = true;
    }

    /// @notice The fee rate a trade pays right now, in basis points.
    /// @dev Sells always pay 5%. Buys pay the falling opening fee for the first 30 seconds, except the launch buy
    ///      itself and the creator wallet (as in Programmable's launch protection, the developer skips the extra fee
    ///      but is still under the wallet cap).
    function feeBps(bool isBuy, address sender, address origin) public view returns (uint256) {
        if (!isBuy || !initialized || sender == initializer || origin == creatorRecipient) return FEE_BPS;
        uint256 elapsed = block.timestamp - launchTimestamp;
        if (elapsed >= OPENING_FEE_SECONDS) return FEE_BPS;
        return FEE_BPS + (OPENING_FEE_BPS - FEE_BPS) * (OPENING_FEE_SECONDS - elapsed) / OPENING_FEE_SECONDS;
    }

    /// @notice Gross native trade value and the fee, in wei.
    /// @param amount Native amount. Gross (fee-inclusive) unless `amountIsNet`.
    /// @param amountIsNet True when `amount` excludes the fee and the gross must be derived.
    function quoteFee(uint256 amount, bool amountIsNet, uint256 bps) public pure returns (uint256 gross, uint256 fee) {
        if (bps == 0 || bps >= FEE_DENOMINATOR) revert InvalidConfiguration();
        if (amountIsNet) {
            gross = Math.mulDiv(amount, FEE_DENOMINATOR, FEE_DENOMINATOR - bps, Math.Rounding.Ceil);
            fee = gross - amount;
        } else {
            gross = amount;
            fee = Math.mulDiv(amount, bps, FEE_DENOMINATOR, Math.Rounding.Ceil);
        }
    }

    /// @notice True while the 2% wallet cap applies.
    function protectionActive() public view returns (bool) {
        return initialized && block.timestamp < launchTimestamp + PROTECTION_SECONDS;
    }

    function _beforeInitialize(address sender, PoolKey calldata key, uint160 price) internal override returns (bytes4) {
        _requirePool(key);
        if (initialized || sender != initializer || price != initialSqrtPriceX96) revert UnauthorizedInitializer();
        initialized = true;
        launchTimestamp = block.timestamp;
        return IHooks.beforeInitialize.selector;
    }

    /// @dev Only the initializer's locked launch position may exist. Without this, a third party could add its own
    ///      range and trade against other traders without paying the Wronskian fee.
    function _beforeAddLiquidity(address sender, PoolKey calldata key, ModifyLiquidityParams calldata, bytes calldata)
        internal
        view
        override
        returns (bytes4)
    {
        _requirePool(key);
        if (sender != initializer) revert LiquidityLocked();
        return IHooks.beforeAddLiquidity.selector;
    }

    function _beforeSwap(address sender, PoolKey calldata key, SwapParams calldata params, bytes calldata data)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        _requirePool(key);
        if (!initialized) revert UninitializedPool();
        if (swapActive) revert ReentrantSwap();
        if (params.amountSpecified == 0) revert NoTrade();
        swapActive = true;
        activeSwap = keccak256(abi.encode(sender, key, params, data));
        uint256 bps = feeBps(params.zeroForOne, sender, tx.origin);
        activeFeeBps = bps;
        bool nativeIsSpecified = params.zeroForOne == (params.amountSpecified < 0);
        if (!nativeIsSpecified) return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        uint256 nativeAmount = _absolute(params.amountSpecified);
        (uint256 gross, uint256 fee) = quoteFee(nativeAmount, params.amountSpecified > 0, bps);
        expectedNativePoolAmount = params.amountSpecified > 0 ? gross : nativeAmount - fee;
        if (expectedNativePoolAmount == 0) revert NoTrade();
        _accrue(sender, key, params.zeroForOne, gross, fee, bps);
        return (IHooks.beforeSwap.selector, toBeforeSwapDelta(fee.toInt256().toInt128(), 0), 0);
    }

    function _afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata data
    ) internal override returns (bytes4, int128) {
        _requirePool(key);
        if (!swapActive || activeSwap != keccak256(abi.encode(sender, key, params, data))) revert InvalidSwapContext();
        uint256 nativeAmount = _absolute(int256(delta.amount0()));
        if (nativeAmount == 0 || delta.amount1() == 0) revert NoTrade();
        bool nativeIsSpecified = params.zeroForOne == (params.amountSpecified < 0);
        uint256 fee;
        if (nativeIsSpecified) {
            if (nativeAmount != expectedNativePoolAmount) {
                revert PartialFillUnsupported(expectedNativePoolAmount, nativeAmount);
            }
        } else {
            uint256 gross;
            (gross, fee) = quoteFee(nativeAmount, params.amountSpecified > 0, activeFeeBps);
            if (params.amountSpecified < 0 && fee >= nativeAmount) revert NoTrade();
            _accrue(sender, key, params.zeroForOne, gross, fee, activeFeeBps);
        }
        if (params.zeroForOne) _checkWalletLimit(sender, uint256(int256(delta.amount1())));
        expectedNativePoolAmount = 0;
        activeFeeBps = 0;
        activeSwap = bytes32(0);
        swapActive = false;
        return (IHooks.afterSwap.selector, fee.toInt256().toInt128());
    }

    /// @dev The cap is cumulative per transaction origin for the whole protection window, so splitting one buy into
    ///      many swaps doesn't get around it. Someone using many separate wallets still can; the cap raises the cost
    ///      of sniping rather than making it impossible.
    function _checkWalletLimit(address sender, uint256 tokensOut) private {
        if (sender == initializer || !protectionActive()) return;
        uint256 bought = protectedBought[tx.origin] + tokensOut;
        if (bought > WALLET_TOKEN_LIMIT) revert WalletLimitExceeded(WALLET_TOKEN_LIMIT, bought);
        protectedBought[tx.origin] = bought;
    }

    function _requirePool(PoolKey calldata key) private view {
        if (
            Currency.unwrap(key.currency0) != address(0) || Currency.unwrap(key.currency1) != token
                || key.fee != LP_FEE || key.tickSpacing != TICK_SPACING || address(key.hooks) != address(this)
        ) revert UnexpectedPool();
    }

    function _accrue(address sender, PoolKey calldata key, bool isBuy, uint256 gross, uint256 fee, uint256 bps)
        private
    {
        if (fee == 0) revert NoTrade();
        fee.toInt256().toInt128();
        poolManager.mint(address(feeVault), 0, fee);
        feeVault.recordFees(fee);
        emit NativeFeeAccrued(keccak256(abi.encode(key)), sender, isBuy, gross, fee, bps);
    }

    function _absolute(int256 amount) private pure returns (uint256) {
        if (amount == type(int256).min) revert InvalidConfiguration();
        return uint256(amount < 0 ? -amount : amount);
    }
}
