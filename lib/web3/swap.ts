import {
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  parseAbi,
  parseAbiParameters,
  toFunctionSelector,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

import { TOKEN } from "@/lib/data";
import { POOL_KEY } from "@/lib/web3/live";

/*
 * Direct swaps on the official WRON pool (ETH / WRON, Uniswap v4, WronskianHook) on Ethereum mainnet.
 * Uses the same Universal Router, Quoter and Permit2 as every other v4 pool. launch/test/Fork.t.sol
 * runs this exact encoding against a mainnet fork, so a buy built here is the one the tests prove works.
 */
export const CONTRACTS = {
  universalRouter: "0xd92A36B0000531EF3063dEd4De20A0783308446C",
  v4Quoter: "0x52F0E24D1c21C8A0cB1e5a5dD6198556BD9E1203",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
} as const satisfies Record<string, Address>;

/** Hook errors come back wrapped by the PoolManager, so match on the selector too. */
const WALLET_LIMIT = toFunctionSelector("WalletLimitExceeded(uint256,uint256)").slice(2);

const MSG_SENDER: Address = "0x0000000000000000000000000000000000000001";

const SWAP = parseAbiParameters(
  "((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,uint256 minHopPriceX36,bytes hookData)",
);
const ACTIONS = parseAbiParameters("bytes actions,bytes[] params");
const PAYMENT = parseAbiParameters("address currency,uint256 amount");
const SWEEP = parseAbiParameters("address token,address recipient,uint256 amountMin");

const ROUTER_ABI = parseAbi(["function execute(bytes commands, bytes[] inputs, uint256 deadline) payable"]);
const QUOTER_ABI = parseAbi([
  "function quoteExactInputSingle(((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData) params) returns (uint256 amountOut, uint256 gasEstimate)",
]);
const ERC20_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
const PERMIT2_ABI = parseAbi([
  "function allowance(address owner, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
  "function approve(address token, address spender, uint160 amount, uint48 expiration)",
]);

export type Tx = { to: Address; data: Hex; value: bigint };
export type Side = "buy" | "sell";

export const minOut = (amountOut: bigint, slippageBps: number) => (amountOut * BigInt(10_000 - slippageBps)) / BigInt(10_000);

function key() {
  if (!POOL_KEY) throw new Error("Trading opens at launch.");
  return POOL_KEY;
}

/** Quote an exact-input swap, after the hook's fee. Buy = ETH → WRON, sell = WRON → ETH. */
export async function quote(client: PublicClient, side: Side, amountIn: bigint): Promise<bigint> {
  const data = encodeFunctionData({
    abi: QUOTER_ABI,
    functionName: "quoteExactInputSingle",
    args: [{ poolKey: key(), zeroForOne: side === "buy", exactAmount: amountIn, hookData: "0x" }],
  });
  const res = await client.call({ to: CONTRACTS.v4Quoter, data });
  if (!res.data) throw new Error("No quote");
  const [amountOut] = decodeFunctionResult({ abi: QUOTER_ABI, functionName: "quoteExactInputSingle", data: res.data });
  return amountOut;
}

/** The Universal Router transaction for a swap with a hard minimum output. */
export function buildSwap(side: Side, amountIn: bigint, amountOutMinimum: bigint, deadline: bigint): Tx {
  const buy = side === "buy";
  const token = TOKEN.address!;
  const input = buy ? zeroAddress : token;
  const output = buy ? token : zeroAddress;
  const params = [
    encodeAbiParameters(SWAP, [{ poolKey: key(), zeroForOne: buy, amountIn, amountOutMinimum, minHopPriceX36: BigInt(0), hookData: "0x" }]),
    encodeAbiParameters(PAYMENT, [input, amountIn]), // SETTLE_ALL
    encodeAbiParameters(PAYMENT, [output, amountOutMinimum]), // TAKE_ALL
  ];
  const inputs: Hex[] = [encodeAbiParameters(ACTIONS, ["0x060c0f", params])];
  if (buy) inputs.push(encodeAbiParameters(SWEEP, [zeroAddress, MSG_SENDER, BigInt(0)])); // return unused ETH
  return {
    to: CONTRACTS.universalRouter,
    data: encodeFunctionData({ abi: ROUTER_ABI, functionName: "execute", args: [buy ? "0x1004" : "0x10", inputs, deadline] }),
    value: buy ? amountIn : BigInt(0),
  };
}

/** Approvals a seller still needs before the swap: [] when none. */
export async function sellApprovals(client: PublicClient, owner: Address, amountIn: bigint, deadline: bigint) {
  const token = TOKEN.address!;
  const steps: { label: string; tx: Tx }[] = [];
  const erc20 = await client.readContract({ address: token, abi: ERC20_ABI, functionName: "allowance", args: [owner, CONTRACTS.permit2] });
  if (erc20 < amountIn) {
    steps.push({
      label: `Approve ${TOKEN.unit}`,
      tx: { to: token, value: BigInt(0), data: encodeFunctionData({ abi: ERC20_ABI, functionName: "approve", args: [CONTRACTS.permit2, amountIn] }) },
    });
  }
  const [amount, expiration] = await client.readContract({
    address: CONTRACTS.permit2,
    abi: PERMIT2_ABI,
    functionName: "allowance",
    args: [owner, token, CONTRACTS.universalRouter],
  });
  if (amount < amountIn || BigInt(expiration) < deadline) {
    steps.push({
      label: "Allow the swap",
      tx: {
        to: CONTRACTS.permit2,
        value: BigInt(0),
        data: encodeFunctionData({ abi: PERMIT2_ABI, functionName: "approve", args: [token, CONTRACTS.universalRouter, amountIn, Number(deadline)] }),
      },
    });
  }
  return steps;
}

/** Run the exact transaction from the trader's address without sending it. Throws a readable reason. */
export async function simulate(client: PublicClient, from: Address, tx: Tx) {
  try {
    await client.call({ account: from, to: tx.to, data: tx.data, value: tx.value });
  } catch (err) {
    const msg = (err as { shortMessage?: string; message?: string }).message ?? String(err);
    if (/insufficient funds/i.test(msg)) throw new Error("Not enough ETH for this trade plus gas.");
    if (/WalletLimitExceeded/i.test(msg) || msg.toLowerCase().includes(WALLET_LIMIT)) throw new Error(`Launch protection: max ${TOKEN.walletCapPct}% of supply per wallet for the first ${TOKEN.protectionSeconds / 60} minutes.`);
    if (/TooLittleReceived|0x8b063d73|0x39d35496/i.test(msg)) throw new Error("Price moved. Refresh the quote or raise slippage.");
    throw new Error("This trade would fail right now. Try a smaller amount.");
  }
}

export async function balances(client: PublicClient, owner: Address) {
  const [eth, token] = await Promise.all([
    client.getBalance({ address: owner }),
    client.readContract({ address: TOKEN.address!, abi: ERC20_ABI, functionName: "balanceOf", args: [owner] }),
  ]);
  return { eth, token };
}
