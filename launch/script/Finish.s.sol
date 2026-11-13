// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Script, console2 } from "forge-std/Script.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { FullMath } from "@uniswap/v4-core/src/libraries/FullMath.sol";
import { HookMiner } from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import { WronskianHook } from "../src/WronskianHook.sol";
import { WronskianInitializer } from "../src/WronskianInitializer.sol";
import { WronskianToken } from "../src/WronskianToken.sol";

interface IChainlinkFeed {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
}

/// @notice Finishes a launch whose initializer and token are already deployed: deploys the hook at its mined
///         address, then creates the pool, locks the liquidity and makes the first buy.
///   INIT=0x... TOKEN=0x... forge script script/Finish.s.sol --rpc-url $ETH_RPC_URL --sender <DEV> [--account wron-dev --broadcast]
contract Finish is Script {
    address internal constant DEV = 0x311A12DaD28A6AaE0C3c8FC1F4cBF115f4Da9eC2;
    address internal constant MANAGER = 0x000000000004444c5dc75cB358380D2e3dE08A90;
    address internal constant ETH_USD_FEED = 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419;
    address internal constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    uint160 internal constant HOOK_FLAGS = 0x28cc;

    struct Step {
        WronskianInitializer init;
        WronskianToken token;
        uint160 sqrtP;
        uint256 firstBuyWei;
        uint256 minOut;
        address predicted;
        bytes32 salt;
    }

    function run() external {
        require(msg.sender == DEV, "Run with --sender 0x311A12DaD28A6AaE0C3c8FC1F4cBF115f4Da9eC2");
        require(block.chainid == 1, "Not Ethereum mainnet");
        Step memory s = _prepare();
        require(DEV.balance > s.firstBuyWei, "Dev wallet can't cover the first buy");

        vm.startBroadcast(DEV);
        WronskianHook hook = _hook(s);
        s.init.initialize{ value: s.firstBuyWei }(address(s.token), address(hook), DEV, s.minOut);
        vm.stopBroadcast();

        console2.log("");
        console2.log("WRON token   ", address(s.token));
        console2.log("Hook         ", address(hook));
        console2.log("Fee vault    ", address(hook.feeVault()));
        console2.log("Initializer  ", address(s.init));
        console2.log("First buy got", s.init.initialTokensOut() / 1e18, "WRON");
    }

    function _prepare() internal view returns (Step memory s) {
        s.init = WronskianInitializer(vm.envAddress("INIT"));
        s.token = WronskianToken(vm.envAddress("TOKEN"));
        require(s.init.launcher() == DEV && !s.init.initialized(), "Initializer not ready");
        require(s.token.balanceOf(address(s.init)) == s.token.totalSupply(), "Token supply not held by the initializer");
        s.sqrtP = s.init.initialSqrtPriceX96();

        (, int256 answer,, uint256 updatedAt,) = IChainlinkFeed(ETH_USD_FEED).latestRoundData();
        require(answer > 0 && block.timestamp - updatedAt < 2 hours, "ETH/USD feed stale");
        s.firstBuyWei = vm.envOr("FIRST_BUY_USD_CENTS", uint256(200)) * 1e24 / uint256(answer);
        uint256 expected = FullMath.mulDiv(s.firstBuyWei * 9_500 / 10_000, uint256(s.sqrtP) * uint256(s.sqrtP), uint256(1) << 192);
        s.minOut = expected * 90 / 100;

        (s.predicted, s.salt) = HookMiner.find(CREATE2_DEPLOYER, HOOK_FLAGS, type(WronskianHook).creationCode, _hookArgs(s));
        console2.log("Hook will be  ", s.predicted);
        console2.log("First buy wei ", s.firstBuyWei);
        console2.log("Expected WRON ", expected / 1e18);
    }

    function _hookArgs(Step memory s) internal pure returns (bytes memory) {
        return abi.encode(IPoolManager(MANAGER), address(s.token), s.sqrtP, address(s.init), DEV);
    }

    function _hook(Step memory s) internal returns (WronskianHook hook) {
        if (s.predicted.code.length > 0) return WronskianHook(s.predicted);
        hook = new WronskianHook{ salt: s.salt }(IPoolManager(MANAGER), address(s.token), s.sqrtP, address(s.init), DEV);
        require(address(hook) == s.predicted, "hook address mismatch");
    }
}
