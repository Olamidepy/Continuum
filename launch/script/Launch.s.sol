// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Script, console2 } from "forge-std/Script.sol";
import { WronskianHook } from "../src/WronskianHook.sol";
import { WronskianInitializer } from "../src/WronskianInitializer.sol";
import { WronskianToken } from "../src/WronskianToken.sol";
import { WronskianLaunchPlan } from "./WronskianLaunchPlan.sol";

/// @notice Launches Wronskian (WRON) on Ethereum mainnet from the dev wallet, in four transactions:
///         1. deploy the initializer   2. deploy the token (whole supply to the initializer)
///         3. deploy the hook at its mined address   4. create the pool, lock the liquidity and make the first buy
///
/// Dry run (simulates everything on a copy of mainnet, sends nothing):
///   forge script script/Launch.s.sol --rpc-url $ETH_RPC_URL --sender 0x311A12DaD28A6AaE0C3c8FC1F4cBF115f4Da9eC2
/// Real launch (asks for the dev wallet's key in the terminal):
///   forge script script/Launch.s.sol --rpc-url $ETH_RPC_URL --sender 0x311A12DaD28A6AaE0C3c8FC1F4cBF115f4Da9eC2 \
///     --account wron-dev --broadcast
///
/// Optional environment: FDV_USD (default 4000), FIRST_BUY_USD_CENTS (default 200).
/// Dry run with an empty dev wallet: PRETEND_FUNDED=true forge script ... (without --broadcast).
contract Launch is Script, WronskianLaunchPlan {
    address internal constant DEV = 0x311A12DaD28A6AaE0C3c8FC1F4cBF115f4Da9eC2;

    function run() external {
        require(msg.sender == DEV, "Run with --sender 0x311A12DaD28A6AaE0C3c8FC1F4cBF115f4Da9eC2");
        require(block.chainid == 1, "Not Ethereum mainnet");
        Plan memory p = _plan(vm.envOr("FDV_USD", uint256(4000)), vm.envOr("FIRST_BUY_USD_CENTS", uint256(200)));
        if (vm.envOr("PRETEND_FUNDED", false)) {
            // Dry run only: give the dev wallet pretend ETH so the simulation can show the full gas cost.
            // Never set this together with --broadcast.
            vm.deal(DEV, 1 ether);
        }
        require(DEV.balance > p.firstBuyWei, "Dev wallet can't cover the first buy");

        console2.log("ETH/USD (8 decimals)  ", p.ethUsd8);
        console2.log("Starting FDV (USD)    ", p.startFdvUsd);
        console2.log("tickLower / tickUpper ");
        console2.logInt(p.tickLower);
        console2.logInt(p.tickUpper);
        console2.log("First buy (wei)       ", p.firstBuyWei);
        console2.log("Expected WRON         ", p.expectedTokens / 1e18);
        console2.log("Minimum WRON          ", p.minTokensOut / 1e18);

        vm.startBroadcast(DEV);
        (WronskianInitializer init, WronskianToken token, WronskianHook hook) = _deploy(p, DEV, CREATE2_DEPLOYER);
        init.initialize{ value: p.firstBuyWei }(address(token), address(hook), DEV, p.minTokensOut);
        vm.stopBroadcast();

        console2.log("");
        console2.log("WRON token   ", address(token));
        console2.log("Hook         ", address(hook));
        console2.log("Fee vault    ", address(hook.feeVault()));
        console2.log("Initializer  ", address(init));
        console2.log("First buy got", init.initialTokensOut() / 1e18, "WRON");
    }
}
