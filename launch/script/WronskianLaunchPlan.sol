// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { FullMath } from "@uniswap/v4-core/src/libraries/FullMath.sol";
import { TickMath } from "@uniswap/v4-core/src/libraries/TickMath.sol";
import { HookMiner } from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import { WronskianHook } from "../src/WronskianHook.sol";
import { WronskianInitializer } from "../src/WronskianInitializer.sol";
import { WronskianToken } from "../src/WronskianToken.sol";

interface IChainlinkFeed {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
}

/// @notice Shared launch maths and deployment, used by the launch script and the mainnet fork test.
abstract contract WronskianLaunchPlan {
    address internal constant MANAGER = 0x000000000004444c5dc75cB358380D2e3dE08A90;
    /// @dev Chainlink ETH/USD on Ethereum mainnet (8 decimals).
    address internal constant ETH_USD_FEED = 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419;
    /// @dev Forge deploys `new X{salt: ...}` through this deterministic CREATE2 deployer when broadcasting.
    address internal constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    uint160 internal constant HOOK_FLAGS = 0x28cc;
    int24 internal constant SPACING = 60;
    /// @dev The position covers a 10,000x price range: from the starting FDV up to about 10,000 times it.
    int24 internal constant WIDTH = 92_100;

    struct Plan {
        uint256 ethUsd8; // ETH price, 8 decimals
        int24 tickLower;
        int24 tickUpper;
        uint160 sqrtPriceX96;
        uint256 startFdvUsd; // whole dollars, after rounding the tick
        uint256 firstBuyWei;
        uint256 expectedTokens;
        uint256 minTokensOut;
    }

    /// @param fdvUsd Target starting fully diluted value in whole dollars (e.g. 4000).
    /// @param firstBuyUsdCents First buy in US cents (e.g. 200 for $2).
    function _plan(uint256 fdvUsd, uint256 firstBuyUsdCents) internal view returns (Plan memory p) {
        (, int256 answer,, uint256 updatedAt,) = IChainlinkFeed(ETH_USD_FEED).latestRoundData();
        require(answer > 0 && block.timestamp - updatedAt < 2 hours, "ETH/USD feed stale");
        p.ethUsd8 = uint256(answer);
        // Pool price is WRON per ETH (currency0 = ETH, currency1 = WRON, both 18 decimals):
        // WRON per ETH = 1e9 * ethUsd / fdvUsd.  priceX192 = that * 2^192.
        uint256 priceX192 = FullMath.mulDiv(1e9 * p.ethUsd8, uint256(1) << 192, fdvUsd * 1e8);
        int24 tick = TickMath.getTickAtSqrtPrice(uint160(Math.sqrt(priceX192)));
        // Round down to the tick spacing: fewer WRON per ETH, so the start is at or slightly above the target FDV.
        int24 upper = (tick / SPACING) * SPACING;
        if (tick < 0 && tick % SPACING != 0) upper -= SPACING;
        p.tickUpper = upper;
        p.tickLower = upper - WIDTH;
        p.sqrtPriceX96 = TickMath.getSqrtPriceAtTick(upper);
        uint256 wronPerEthX192 = uint256(p.sqrtPriceX96) * uint256(p.sqrtPriceX96);
        p.startFdvUsd = FullMath.mulDiv(1e9 * p.ethUsd8, uint256(1) << 192, wronPerEthX192) / 1e8;
        p.firstBuyWei = firstBuyUsdCents * 1e24 / p.ethUsd8; // cents * 1e18 * 1e8 / 100 / price
        uint256 net = p.firstBuyWei * 9_500 / 10_000; // the first buy pays the normal 5%
        p.expectedTokens = FullMath.mulDiv(net, wronPerEthX192, uint256(1) << 192);
        p.minTokensOut = p.expectedTokens * 90 / 100;
    }

    /// @param dev The dev wallet: launcher, first buyer and fee recipient.
    /// @param deployer The address that deploys the hook with CREATE2 (CREATE2_DEPLOYER when broadcasting).
    function _deploy(Plan memory p, address dev, address deployer)
        internal
        returns (WronskianInitializer init, WronskianToken token, WronskianHook hook)
    {
        init = new WronskianInitializer(IPoolManager(MANAGER), dev, p.tickLower, p.tickUpper);
        token = new WronskianToken(address(init), "Wronskian", "WRON");
        bytes memory args = abi.encode(IPoolManager(MANAGER), address(token), p.sqrtPriceX96, address(init), dev);
        (address predicted, bytes32 salt) = HookMiner.find(deployer, HOOK_FLAGS, type(WronskianHook).creationCode, args);
        hook = new WronskianHook{ salt: salt }(IPoolManager(MANAGER), address(token), p.sqrtPriceX96, address(init), dev);
        require(address(hook) == predicted, "hook address mismatch");
    }
}
