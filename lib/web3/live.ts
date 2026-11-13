"use client";

import { encodeAbiParameters, keccak256, zeroAddress, type Address } from "viem";
import { useReadContract } from "wagmi";

import { TOKEN } from "@/lib/data";
import { CHAIN } from "@/lib/web3/config";

/** The official Uniswap v4 pool: ETH / WRON with WronskianHook. */
export const POOL_KEY = TOKEN.address && TOKEN.hook
  ? ({
      currency0: zeroAddress as Address,
      currency1: TOKEN.address,
      fee: TOKEN.poolFee,
      tickSpacing: TOKEN.tickSpacing,
      hooks: TOKEN.hook,
    } as const)
  : undefined;

export const POOL_ID = POOL_KEY
  ? keccak256(
      encodeAbiParameters(
        [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }],
        [POOL_KEY.currency0, POOL_KEY.currency1, POOL_KEY.fee, POOL_KEY.tickSpacing, POOL_KEY.hooks],
      ),
    )
  : undefined;
/** Uniswap v4 StateView on Ethereum mainnet (developers.uniswap.org/docs/protocols/v4/deployments). */
const STATE_VIEW = "0x7ffe42c4a5deea5b0fec41c94c136cf115597227" as Address;
/** Chainlink ETH / USD, the same feed the launch initializer checks. */
const ETH_USD = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" as Address;

const stateViewAbi = [
  {
    type: "function",
    name: "getSlot0",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "protocolFee", type: "uint24" },
      { name: "lpFee", type: "uint24" },
    ],
  },
] as const;

const feedAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

const hookAbi = [{ type: "function", name: "launchTimestamp", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }] as const;

export type LiveToken = {
  /** Unix seconds when trading started (from the hook). */
  startedAt?: number;
  /** True once the pool exists on-chain, i.e. the launch has been signed. */
  live: boolean;
  /** ETH per 1 token, from the pool price. */
  priceEth?: number;
  priceUsd?: number;
  marketCapUsd?: number;
  loading: boolean;
};

/** Reads the live pool price straight from Ethereum. Refreshes every 15 seconds. */
export function useLiveToken(): LiveToken {
  const slot = useReadContract({
    address: STATE_VIEW,
    abi: stateViewAbi,
    functionName: "getSlot0",
    args: POOL_ID ? [POOL_ID] : undefined,
    chainId: CHAIN.id,
    query: { enabled: Boolean(POOL_ID), refetchInterval: 15_000 },
  });
  const feed = useReadContract({
    address: ETH_USD,
    abi: feedAbi,
    functionName: "latestRoundData",
    chainId: CHAIN.id,
    query: { refetchInterval: 60_000 },
  });

  const started = useReadContract({
    address: TOKEN.hook,
    abi: hookAbi,
    functionName: "launchTimestamp",
    chainId: CHAIN.id,
    query: { enabled: Boolean(TOKEN.hook), retry: false, refetchInterval: (q) => (q.state.data && q.state.data > BigInt(0) ? false : 15_000) },
  });
  const startedAt = started.data && started.data > BigInt(0) ? Number(started.data) : undefined;
  const sqrt = slot.data?.[0] ?? BigInt(0);
  const live = sqrt > BigInt(0);
  if (!live) return { live: false, loading: slot.isLoading };

  // price = (sqrtPriceX96 / 2^96)^2 = tokens per 1 ETH (both 18 decimals).
  const ratio = Number(sqrt) / 2 ** 96;
  const tokensPerEth = ratio * ratio;
  const priceEth = tokensPerEth > 0 ? 1 / tokensPerEth : undefined;
  const ethUsd = feed.data ? Number(feed.data[1]) / 1e8 : undefined;
  const priceUsd = priceEth && ethUsd ? priceEth * ethUsd : undefined;
  return { live, startedAt, priceEth, priceUsd, marketCapUsd: priceUsd ? priceUsd * TOKEN.supply : undefined, loading: false };
}
