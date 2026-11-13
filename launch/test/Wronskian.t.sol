// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { IHooks } from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import { IUnlockCallback } from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import { BalanceDelta } from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import { Currency } from "@uniswap/v4-core/src/types/Currency.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { ModifyLiquidityParams, SwapParams } from "@uniswap/v4-core/src/types/PoolOperation.sol";
import { TickMath } from "@uniswap/v4-core/src/libraries/TickMath.sol";
import { StateLibrary } from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import { HookMiner } from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import { WronskianFeeVault } from "../src/WronskianFeeVault.sol";
import { WronskianHook } from "../src/WronskianHook.sol";
import { WronskianInitializer } from "../src/WronskianInitializer.sol";
import { WronskianToken } from "../src/WronskianToken.sol";

/// @notice Runs Wronskian against the real pinned v4-core PoolManager, deployed at Ethereum's canonical address.
contract WronskianTest is Test, IUnlockCallback {
    using StateLibrary for IPoolManager;

    address internal constant MANAGER = 0x000000000004444c5dc75cB358380D2e3dE08A90;
    uint160 internal constant HOOK_FLAGS = 0x28cc;
    // $2,000 FDV at ETH = $2,000: 1e9 WRON per ETH, tick 207,233 rounded down to a multiple of 60.
    int24 internal constant TICK_UPPER = 207_180;
    int24 internal constant TICK_LOWER = TICK_UPPER - 92_100;
    uint256 internal constant FIRST_BUY = 0.001 ether; // ~$2
    uint256 internal constant SUPPLY = 1_000_000_000 ether;
    uint256 internal constant CAP = 20_000_000 ether;

    address internal creator = makeAddr("creator"); // the dev wallet: launcher, first buyer, fee recipient
    address internal trader = makeAddr("trader");

    IPoolManager internal manager;
    WronskianInitializer internal initializer;
    WronskianToken internal token;
    WronskianHook internal hook;
    WronskianFeeVault internal vault;
    PoolKey internal key;

    function setUp() public {
        vm.chainId(1);
        vm.deal(address(this), 1000 ether);
        deployCodeTo("PoolManager.sol:PoolManager", abi.encode(address(this)), MANAGER);
        manager = IPoolManager(MANAGER);
        initializer = new WronskianInitializer(manager, creator, TICK_LOWER, TICK_UPPER);
        token = new WronskianToken(address(initializer), "Wronskian", "WRON");
        uint160 price = TickMath.getSqrtPriceAtTick(TICK_UPPER);
        bytes memory args = abi.encode(manager, address(token), price, address(initializer), creator);
        (, bytes32 salt) = HookMiner.find(address(this), HOOK_FLAGS, type(WronskianHook).creationCode, args);
        hook = new WronskianHook{ salt: salt }(manager, address(token), price, address(initializer), creator);
        vault = hook.feeVault();
        key = PoolKey(Currency.wrap(address(0)), Currency.wrap(address(token)), 0, 60, IHooks(address(hook)));
    }

    function _launch() internal {
        vm.deal(creator, FIRST_BUY);
        vm.prank(creator);
        initializer.initialize{ value: FIRST_BUY }(address(token), address(hook), creator, 1);
    }

    /// Launch, then wait out the 30 s opening fee (the 2% cap still applies).
    function _launchPastOpening() internal {
        _launch();
        vm.warp(block.timestamp + 30);
    }

    /// Launch, then wait out all protection.
    function _launchAndWait() internal {
        _launch();
        vm.warp(block.timestamp + 300);
    }

    // ───────────────────────── launch ─────────────────────────

    function test_launchSeedsLockedPositionAndExecutesFirstBuy() public {
        _launch();
        (uint128 liquidity,,) = manager.getPositionInfo(key.toId(), address(initializer), TICK_LOWER, TICK_UPPER, 0);
        assertGt(liquidity, 0);
        assertEq(liquidity, initializer.lockedLiquidity());
        assertEq(MANAGER.balance, FIRST_BUY);
        assertGt(token.balanceOf(creator), 0);
        assertEq(initializer.initialTokensOut(), token.balanceOf(creator));
        assertEq(token.balanceOf(MANAGER) + token.balanceOf(address(initializer)) + token.balanceOf(creator), SUPPLY);
        // The first buy pays the normal 5%, not the opening fee.
        assertEq(vault.creatorAccrued(), _ceil(FIRST_BUY * 500, 10_000));
        assertEq(manager.balanceOf(address(vault), 0), vault.creatorAccrued());
        // At ~$2,000 FDV, ~$2 buys roughly 0.1% of supply.
        assertApproxEqRel(token.balanceOf(creator), 950_000 ether, 0.05e18);
    }

    function test_onlyLauncherCanInitializeAndOnlyOnce() public {
        vm.expectRevert(WronskianInitializer.UnauthorizedLauncher.selector);
        initializer.initialize{ value: FIRST_BUY }(address(token), address(hook), creator, 1);
        _launch();
        vm.deal(creator, FIRST_BUY);
        vm.prank(creator);
        vm.expectRevert(WronskianInitializer.AlreadyInitialized.selector);
        initializer.initialize{ value: FIRST_BUY }(address(token), address(hook), creator, 1);
    }

    function test_unfillableMinimumRollsBackWholeLaunch() public {
        vm.deal(creator, FIRST_BUY);
        vm.prank(creator);
        vm.expectRevert(WronskianInitializer.InvalidInitialBuy.selector);
        initializer.initialize{ value: FIRST_BUY }(address(token), address(hook), creator, SUPPLY);
        assertFalse(initializer.initialized());
        assertEq(token.balanceOf(address(initializer)), SUPPLY);
        assertEq(MANAGER.balance, 0);
        assertEq(vault.creatorAccrued(), 0);
    }

    function test_nobodyElseCanInitializeThePool() public {
        vm.expectRevert();
        manager.initialize(key, TickMath.getSqrtPriceAtTick(TICK_UPPER));
    }

    function test_hookRejectsAnyOtherPool() public {
        _launch();
        PoolKey memory other = key;
        other.fee = 3000;
        vm.expectRevert();
        manager.initialize(other, TickMath.getSqrtPriceAtTick(TICK_UPPER));
    }

    function test_forgedUnlockCallbacksRevert() public {
        vm.expectRevert();
        initializer.unlockCallback("");
        vm.prank(MANAGER);
        vm.expectRevert();
        initializer.unlockCallback("");
        vm.prank(MANAGER);
        vm.expectRevert();
        vault.unlockCallback(abi.encode(address(this), uint256(1)));
    }

    function test_liquidityCanNeverBeWithdrawn() public {
        _launchAndWait();
        _swap(true, -int256(1 ether));
        bytes[4] memory attempts = [
            abi.encodeWithSignature("withdraw(address,uint256)", address(this), 1),
            abi.encodeWithSignature("removeLiquidity(uint256)", 1),
            abi.encodeWithSignature("approve(address,uint256)", address(this), type(uint256).max),
            abi.encodeWithSignature("execute(address,bytes)", MANAGER, bytes(""))
        ];
        for (uint256 i; i < attempts.length; i++) {
            vm.prank(creator);
            (bool ok,) = address(initializer).call(attempts[i]);
            assertFalse(ok);
        }
        (uint128 liquidity,,) = manager.getPositionInfo(key.toId(), address(initializer), TICK_LOWER, TICK_UPPER, 0);
        assertEq(liquidity, initializer.lockedLiquidity());
    }

    function test_nobodyElseCanAddLiquidity() public {
        _launchAndWait();
        LiquidityAdder adder = new LiquidityAdder(manager);
        vm.expectRevert();
        adder.add(key, TICK_LOWER, TICK_UPPER, 1e18);
    }

    // ───────────────────────── fees ─────────────────────────

    function test_exactInputBuyAndSellChargeFivePercent() public {
        _launchAndWait();
        uint256 c0 = vault.creatorAccrued();

        uint256 grossBuy = 1 ether;
        BalanceDelta buy = _swap(true, -int256(grossBuy));
        assertEq(-int256(buy.amount0()), int256(grossBuy));
        uint256 c1 = vault.creatorAccrued();
        assertEq(c1 - c0, _ceil(grossBuy * 500, 10_000), "buy fee");

        uint256 tokensSold = uint256(int256(buy.amount1())) / 2;
        BalanceDelta sell = _swap(false, -int256(tokensSold));
        uint256 feeSell = vault.creatorAccrued() - c1;
        uint256 grossSell = uint256(int256(sell.amount0())) + feeSell;
        assertEq(feeSell, _ceil(grossSell * 500, 10_000), "sell fee");
        assertEq(manager.balanceOf(address(vault), 0), vault.creatorAccrued(), "fully backed");
    }

    function test_exactOutputBuyAndSellChargeFivePercent() public {
        _launchAndWait();
        uint256 c0 = vault.creatorAccrued();
        BalanceDelta buy = _swap(true, int256(1_000_000 ether));
        assertEq(buy.amount1(), int128(int256(1_000_000 ether)));
        uint256 grossBuy = uint256(-int256(buy.amount0()));
        uint256 c1 = vault.creatorAccrued();
        assertLe(c1 - c0, _ceil(grossBuy * 500, 10_000));
        assertGe(c1 - c0, grossBuy * 500 / 10_000 - 1);

        uint256 netEth = 0.0001 ether;
        BalanceDelta sell = _swap(false, int256(netEth));
        assertEq(uint256(int256(sell.amount0())), netEth);
        uint256 feeSell = vault.creatorAccrued() - c1;
        assertEq(feeSell, _ceil(netEth * 10_000, 9_500) - netEth);
        assertEq(manager.balanceOf(address(vault), 0), vault.creatorAccrued());
    }

    function test_claimPaysOnlyTheCreator() public {
        _launchAndWait();
        _swap(true, -int256(2 ether));
        uint256 fees = vault.creatorAccrued();
        uint256 before = creator.balance;
        vm.prank(makeAddr("anyone"));
        assertEq(vault.claim(), fees);
        assertEq(creator.balance - before, fees);
        assertEq(vault.creatorAccrued(), 0);
        assertEq(vault.totalClaimed(), fees);
        assertEq(manager.balanceOf(address(vault), 0), 0);
        vm.expectRevert(WronskianFeeVault.NothingToClaim.selector);
        vault.claim();
    }

    function test_claimCanBePaidAsPoolManagerClaims() public {
        _launchAndWait();
        _swap(true, -int256(1 ether));
        uint256 fees = vault.creatorAccrued();
        assertEq(vault.claimAsClaims(), fees);
        assertEq(manager.balanceOf(creator, 0), fees);
        assertEq(manager.balanceOf(address(vault), 0), 0);
    }

    function test_onlyHookCanRecordFees() public {
        vm.expectRevert(WronskianFeeVault.UnauthorizedKernel.selector);
        vault.recordFees(1);
    }

    // ───────────────────────── anti-sniper ─────────────────────────

    function test_openingFeeStartsAt99AndFallsTo5() public {
        _launch();
        assertEq(hook.feeBps(true, address(this), trader), 9_900, "launch second");
        vm.warp(block.timestamp + 15);
        assertEq(hook.feeBps(true, address(this), trader), 5_200, "halfway");
        vm.warp(block.timestamp + 15);
        assertEq(hook.feeBps(true, address(this), trader), 500, "after 30 s");
        assertEq(hook.feeBps(false, address(this), trader), 500, "sells");
    }

    function test_openingFeeIsChargedOnEarlyBuys() public {
        _launch();
        uint256 c0 = vault.creatorAccrued();
        vm.startPrank(address(this), trader);
        BalanceDelta buy = _swap(true, -int256(0.001 ether));
        vm.stopPrank();
        assertEq(vault.creatorAccrued() - c0, _ceil(0.001 ether * 9_900, 10_000), "99% at launch");
        assertGt(buy.amount1(), 0);
    }

    function test_creatorSkipsOpeningFeeButSellsPayNormal() public {
        _launch();
        assertEq(hook.feeBps(true, address(this), creator), 500);
        uint256 c0 = vault.creatorAccrued();
        vm.startPrank(address(this), creator);
        _swap(true, -int256(0.001 ether));
        vm.stopPrank();
        assertEq(vault.creatorAccrued() - c0, _ceil(0.001 ether * 500, 10_000));
    }

    function test_walletCapIsCumulativePerOriginThenLifts() public {
        _launchPastOpening();
        assertTrue(hook.protectionActive());
        vm.startPrank(address(this), trader);
        _swap(true, int256(CAP / 2)); // exact output: exactly 1% of supply
        _swap(true, int256(CAP / 2)); // now exactly 2%
        assertFalse(_trySwap(true, int256(1 ether)), "split buys over the cap");
        vm.stopPrank();
        vm.startPrank(address(this), makeAddr("someoneElse"));
        assertFalse(_trySwap(true, int256(CAP + 1 ether)), "one buy over the cap");
        _swap(true, int256(CAP / 2));
        vm.stopPrank();
        vm.roll(block.number + 1_000); // blocks alone don't lift it
        assertTrue(hook.protectionActive());
        vm.warp(block.timestamp + 270);
        assertFalse(hook.protectionActive());
        vm.startPrank(address(this), trader);
        _swap(true, int256(CAP));
        vm.stopPrank();
    }

    function test_sellsAreNeverCapped() public {
        _launchPastOpening();
        vm.startPrank(address(this), trader);
        _swap(true, int256(CAP));
        vm.stopPrank();
        _swap(false, -int256(token.balanceOf(address(this))));
    }

    // ───────────────────────── trading ─────────────────────────

    function test_largeBuysMovePriceAndCanSellBack() public {
        _launchAndWait();
        uint256 startPrice = _sqrtPrice();
        BalanceDelta buy = _swap(true, -int256(10 ether));
        assertGt(buy.amount1(), 0);
        assertLt(_sqrtPrice(), startPrice, "buying WRON raises its ETH price");
        BalanceDelta sell = _swap(false, -int256(buy.amount1()));
        uint256 back = uint256(int256(sell.amount0()));
        // Selling everything back returns less ETH than spent: 5% on each side, nothing else.
        assertLt(back, 10 ether);
        assertGt(back, 10 ether * 9_000 / 10_000);
        assertEq(manager.balanceOf(address(vault), 0), vault.creatorAccrued());
    }

    function test_dustTradesThatCannotPayFeesRevert() public {
        _launchAndWait();
        assertFalse(_trySwap(true, -int256(1)), "1 wei buy");
        assertFalse(_trySwap(true, int256(0)), "zero trade");
    }

    function test_constructorsRejectWrongChainAndBadConfig() public {
        vm.chainId(4663);
        vm.expectRevert(WronskianInitializer.InvalidEnvironment.selector);
        new WronskianInitializer(manager, creator, TICK_LOWER, TICK_UPPER);
        vm.chainId(1);
        vm.expectRevert(WronskianInitializer.InvalidEnvironment.selector);
        new WronskianInitializer(manager, creator, TICK_LOWER, TICK_UPPER + 1);
        vm.expectRevert(WronskianInitializer.InvalidEnvironment.selector);
        new WronskianInitializer(manager, address(0), TICK_LOWER, TICK_UPPER);
    }

    // ───────────────────────── token ─────────────────────────

    function test_tokenHasNoAdminAndBurnLowersSupply() public {
        _launchAndWait();
        _swap(true, -int256(1 ether));
        uint256 balance = token.balanceOf(address(this));
        token.burn(balance / 2);
        assertEq(token.totalSupply(), SUPPLY - balance / 2);
        assertEq(token.name(), "Wronskian");
        assertEq(token.symbol(), "WRON");
        string[3] memory admin = ["mint(address,uint256)", "setName(string)", "transferOwnership(address)"];
        for (uint256 i; i < admin.length; i++) {
            (bool ok,) = address(token).call(abi.encodeWithSignature(admin[i], address(this), 1));
            assertFalse(ok);
        }
    }

    // ───────────────────────── invariants ─────────────────────────

    function testFuzz_feeQuoteIsExact(uint256 amount, bool isNet, uint256 bps) public view {
        amount = bound(amount, 1, 1e30);
        bps = bound(bps, 1, 9_999);
        (uint256 gross, uint256 fee) = hook.quoteFee(amount, isNet, bps);
        if (isNet) {
            assertEq(gross - fee, amount);
            assertGe(fee * 10_000, gross * bps - (gross * bps) % 10_000);
        } else {
            assertEq(gross, amount);
            assertEq(fee, _ceil(amount * bps, 10_000));
        }
    }

    function testFuzz_randomTradesStayFullyBacked(uint256 seed) public {
        _launchAndWait();
        for (uint256 i; i < 8; i++) {
            seed = uint256(keccak256(abi.encode(seed, i)));
            if (seed % 3 == 0 && token.balanceOf(address(this)) > 1e18) {
                _swap(false, -int256(token.balanceOf(address(this)) / (2 + seed % 5)));
            } else {
                _swap(true, -int256(0.0001 ether + seed % 1 ether));
            }
            if (seed % 7 == 0 && vault.creatorAccrued() > 0) vault.claim();
            assertEq(manager.balanceOf(address(vault), 0), vault.creatorAccrued());
        }
    }

    // ───────────────────────── helpers ─────────────────────────

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == MANAGER);
        SwapParams memory params = abi.decode(data, (SwapParams));
        BalanceDelta delta = manager.swap(key, params, "");
        _settle(key.currency0, delta.amount0());
        _settle(key.currency1, delta.amount1());
        return abi.encode(delta);
    }

    function externalSwap(bool buy, int256 amount) external returns (BalanceDelta) {
        require(msg.sender == address(this));
        return _swap(buy, amount);
    }

    function _trySwap(bool buy, int256 amount) internal returns (bool) {
        try this.externalSwap(buy, amount) returns (BalanceDelta) {
            return true;
        } catch {
            return false;
        }
    }

    function _swap(bool buy, int256 amount) internal returns (BalanceDelta) {
        SwapParams memory params = SwapParams({
            zeroForOne: buy,
            amountSpecified: amount,
            sqrtPriceLimitX96: buy ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
        });
        return abi.decode(manager.unlock(abi.encode(params)), (BalanceDelta));
    }

    function _settle(Currency currency, int128 amount) internal {
        if (amount < 0) {
            uint256 owed = uint256(-int256(amount));
            manager.sync(currency);
            if (Currency.unwrap(currency) == address(0)) {
                manager.settle{ value: owed }();
            } else {
                token.transfer(MANAGER, owed);
                manager.settle();
            }
        } else if (amount > 0) {
            manager.take(currency, address(this), uint256(int256(amount)));
        }
    }

    function _sqrtPrice() internal view returns (uint160 price) {
        (price,,,) = manager.getSlot0(key.toId());
    }

    function _ceil(uint256 numerator, uint256 denominator) internal pure returns (uint256) {
        return numerator == 0 ? 0 : (numerator - 1) / denominator + 1;
    }

    receive() external payable { }
}

/// @notice Minimal third-party liquidity adder used to prove the pool only accepts the launch position.
contract LiquidityAdder is IUnlockCallback {
    IPoolManager internal immutable manager;

    constructor(IPoolManager manager_) {
        manager = manager_;
    }

    function add(PoolKey memory key, int24 lower, int24 upper, int256 liquidity) external {
        manager.unlock(abi.encode(key, lower, upper, liquidity));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        (PoolKey memory key, int24 lower, int24 upper, int256 liquidity) =
            abi.decode(data, (PoolKey, int24, int24, int256));
        manager.modifyLiquidity(key, ModifyLiquidityParams(lower, upper, liquidity, bytes32(0)), "");
        return "";
    }
}
