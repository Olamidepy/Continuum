// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test, console2 } from "forge-std/Test.sol";
import { IHooks } from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import { Currency } from "@uniswap/v4-core/src/types/Currency.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { WronskianFeeVault } from "../src/WronskianFeeVault.sol";
import { WronskianHook } from "../src/WronskianHook.sol";
import { WronskianInitializer } from "../src/WronskianInitializer.sol";
import { WronskianToken } from "../src/WronskianToken.sol";
import { WronskianLaunchPlan } from "../script/WronskianLaunchPlan.sol";

interface IUniversalRouter {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

interface IV4Quoter {
    struct QuoteExactSingleParams {
        PoolKey poolKey;
        bool zeroForOne;
        uint128 exactAmount;
        bytes hookData;
    }

    function quoteExactInputSingle(QuoteExactSingleParams memory params)
        external
        returns (uint256 amountOut, uint256 gasEstimate);
}

interface IPermit2 {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

/// @notice The whole launch on a copy of Ethereum mainnet, then real trades through the same Uniswap Universal Router,
///         V4 quoter and Permit2 the website uses, with the website's exact transaction encoding.
/// @dev Needs ETH_RPC_URL (any mainnet RPC, e.g. Alchemy). Skipped without it.
///      ETH_RPC_URL=... forge test --match-contract WronskianForkTest -vv
contract WronskianForkTest is Test, WronskianLaunchPlan {
    address internal constant DEV = 0x311A12DaD28A6AaE0C3c8FC1F4cBF115f4Da9eC2;
    address internal constant ROUTER = 0xd92A36B0000531EF3063dEd4De20A0783308446C;
    address internal constant QUOTER = 0x52F0E24D1c21C8A0cB1e5a5dD6198556BD9E1203;
    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address internal constant MSG_SENDER = address(1);

    /// @dev ExactInputSingleParams of the deployed router (v4-periphery with minHopPriceX36).
    struct ExactInputSingleParams {
        PoolKey poolKey;
        bool zeroForOne;
        uint128 amountIn;
        uint128 amountOutMinimum;
        uint256 minHopPriceX36;
        bytes hookData;
    }

    WronskianInitializer internal init;
    WronskianToken internal token;
    WronskianHook internal hook;
    WronskianFeeVault internal vault;
    PoolKey internal key;
    Plan internal plan;
    address internal trader = makeAddr("trader");

    function setUp() public {
        string memory rpc = vm.envOr("ETH_RPC_URL", string(""));
        if (bytes(rpc).length == 0) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork(rpc);
        plan = _plan(4000, 200);
        (init, token, hook) = _deploy(plan, DEV, address(this));
        vault = hook.feeVault();
        key = PoolKey(Currency.wrap(address(0)), Currency.wrap(address(token)), 0, 60, IHooks(address(hook)));
        vm.deal(DEV, 1 ether);
        vm.prank(DEV, DEV);
        init.initialize{ value: plan.firstBuyWei }(address(token), address(hook), DEV, plan.minTokensOut);
    }

    function test_launchOnMainnetFork() public view {
        console2.log("ETH/USD (8 dec)", plan.ethUsd8);
        console2.log("Start FDV USD  ", plan.startFdvUsd);
        console2.log("First buy wei  ", plan.firstBuyWei);
        console2.log("Dev got WRON   ", token.balanceOf(DEV) / 1e18);
        assertGe(plan.startFdvUsd, 3999);
        assertLe(plan.startFdvUsd, 4040);
        assertGe(token.balanceOf(DEV), plan.minTokensOut);
        assertEq(init.initialTokensOut(), token.balanceOf(DEV));
        assertTrue(hook.initialized());
    }

    function test_buyAndSellThroughTheWebsiteRoute() public {
        vm.warp(block.timestamp + 301); // past the opening fee and the wallet cap
        vm.deal(trader, 1 ether);

        // Buy 0.01 ETH of WRON exactly as the website does: quote, then Universal Router V4_SWAP + SWEEP.
        uint128 ethIn = 0.01 ether;
        uint256 quoted = _quote(true, ethIn);
        assertGt(quoted, 0);
        uint256 feesBefore = vault.creatorAccrued();
        vm.prank(trader, trader);
        IUniversalRouter(ROUTER).execute{ value: ethIn }(hex"1004", _buyInputs(ethIn, quoted * 99 / 100), block.timestamp + 600);
        uint256 bought = token.balanceOf(trader);
        console2.log("Bought WRON    ", bought / 1e18);
        assertGe(bought, quoted * 99 / 100);
        assertEq(vault.creatorAccrued() - feesBefore, (uint256(ethIn) * 500 + 9_999) / 10_000, "5% buy fee");

        // Sell half back: approve Permit2, allow the router, then V4_SWAP.
        uint128 sellAmount = uint128(bought / 2);
        uint256 quotedEth = _quote(false, sellAmount);
        uint256 ethBefore = trader.balance;
        vm.startPrank(trader, trader);
        token.approve(PERMIT2, sellAmount);
        IPermit2(PERMIT2).approve(address(token), ROUTER, sellAmount, uint48(block.timestamp + 600));
        IUniversalRouter(ROUTER).execute(hex"10", _sellInputs(sellAmount, quotedEth * 99 / 100), block.timestamp + 600);
        vm.stopPrank();
        uint256 ethOut = trader.balance - ethBefore;
        console2.log("Sold for wei   ", ethOut);
        assertGe(ethOut, quotedEth * 99 / 100);
        assertEq(manager().balanceOf(address(vault), 0), vault.creatorAccrued(), "fees fully backed");

        // Anyone can trigger the payout; it always goes to the dev wallet.
        uint256 devBefore = DEV.balance;
        uint256 fees = vault.creatorAccrued();
        vm.prank(trader);
        vault.claim();
        assertEq(DEV.balance - devBefore, fees);
    }

    function test_openingFeeAndWalletCapThroughTheRouter() public {
        vm.deal(trader, 10 ether);
        // At the launch second a buy pays 99%.
        uint256 feesBefore = vault.creatorAccrued();
        vm.prank(trader, trader);
        IUniversalRouter(ROUTER).execute{ value: 0.001 ether }(hex"1004", _buyInputs(0.001 ether, 1), block.timestamp + 600);
        assertEq(vault.creatorAccrued() - feesBefore, (uint256(0.001 ether) * 9_900 + 9_999) / 10_000, "99% opening fee");
        // After 30 s the fee is 5%, but one wallet still can't buy more than 2% of supply in the first 5 minutes.
        vm.warp(block.timestamp + 31);
        vm.prank(trader, trader);
        vm.expectRevert();
        IUniversalRouter(ROUTER).execute{ value: 5 ether }(hex"1004", _buyInputs(5 ether, 1), block.timestamp + 600);
    }

    // ───────────────────────── helpers ─────────────────────────

    function manager() internal pure returns (IPoolManagerLike) {
        return IPoolManagerLike(MANAGER);
    }

    function _quote(bool buy, uint128 amountIn) internal returns (uint256 out) {
        (out,) = IV4Quoter(QUOTER).quoteExactInputSingle(IV4Quoter.QuoteExactSingleParams(key, buy, amountIn, ""));
    }

    function _swapAction(bool buy, uint128 amountIn, uint128 minOut) internal view returns (bytes memory) {
        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(ExactInputSingleParams(key, buy, amountIn, minOut, 0, ""));
        params[1] = abi.encode(buy ? address(0) : address(token), uint256(amountIn)); // SETTLE_ALL
        params[2] = abi.encode(buy ? address(token) : address(0), uint256(minOut)); // TAKE_ALL
        return abi.encode(bytes(hex"060c0f"), params);
    }

    function _buyInputs(uint128 ethIn, uint256 minOut) internal view returns (bytes[] memory inputs) {
        inputs = new bytes[](2);
        inputs[0] = _swapAction(true, ethIn, uint128(minOut));
        inputs[1] = abi.encode(address(0), MSG_SENDER, uint256(0)); // SWEEP leftover ETH back
    }

    function _sellInputs(uint128 tokensIn, uint256 minOut) internal view returns (bytes[] memory inputs) {
        inputs = new bytes[](1);
        inputs[0] = _swapAction(false, tokensIn, uint128(minOut));
    }
}

interface IPoolManagerLike {
    function balanceOf(address owner, uint256 id) external view returns (uint256);
}
