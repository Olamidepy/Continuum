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

    function run() external {
        require(msg.sender == DEV, "Run with --sender 0x311A12DaD28A6AaE0C3c8FC1F4cBF115f4Da9eC2");
        require(block.chainid == 1, "Not Ethereum mainnet");
        WronskianInitializer init = WronskianInitializer(vm.envAddress("INIT"));
        WronskianToken token = WronskianToken(vm.envAddress("TOKEN"));
        require(init.launcher() == DEV && !init.initialized(), "Initializer not ready");
        require(token.balanceOf(address(init)) == token.totalSupply(), "Token supply not held by the initializer");

        uint160 sqrtP = init.initialSqrtPriceX96();
        (, int256 answer,, uint256 updatedAt,) = IChainlinkFeed(ETH_USD_FEED).latestRoundData();
        require(answer > 0 && block.timestamp - updatedAt < 2 hours, "ETH/USD feed stale");
        uint256 firstBuyWei = vm.envOr("FIRST_BUY_USD_CENTS", uint256(200)) * 1e24 / uint256(answer);
        uint256 net = firstBuyWei * 9_500 / 10_000;
        uint256 expected = FullMath.mulDiv(net, uint256(sqrtP) * uint256(sqrtP), uint256(1) << 192);
        uint256 minOut = expected * 90 / 100;

        bytes memory args = abi.encode(IPoolManager(MANAGER), address(token), sqrtP, address(init), DEV);
        (address predicted, bytes32 salt) = HookMiner.find(CREATE2_DEPLOYER, HOOK_FLAGS, type(WronskianHook).creationCode, args);
        console2.log("Hook will be  ", predicted);
        console2.log("First buy wei ", firstBuyWei);
        console2.log("Expected WRON ", expected / 1e18);
        require(DEV.balance > firstBuyWei, "Dev wallet can't cover the first buy");

        vm.startBroadcast(DEV);
        WronskianHook hook;
        if (predicted.code.length == 0) {
            hook = new WronskianHook{ salt: salt }(IPoolManager(MANAGER), address(token), sqrtP, address(init), DEV);
            require(address(hook) == predicted, "hook address mismatch");
        } else {
            hook = WronskianHook(predicted);
        }
        init.initialize{ value: firstBuyWei }(address(token), address(hook), DEV, minOut);
        vm.stopBroadcast();

        console2.log("");
        console2.log("WRON token   ", address(token));
        console2.log("Hook         ", address(hook));
        console2.log("Fee vault    ", address(hook.feeVault()));
        console2.log("Initializer  ", address(init));
        console2.log("First buy got", init.initialTokensOut() / 1e18, "WRON");
    }
}
