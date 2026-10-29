"use client";

import * as React from "react";
import { erc20Abi, type Abi } from "viem";
import { useConfig, useConnection, useReadContract, useReadContracts } from "wagmi";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { TOKEN, VAULT } from "@/lib/data";
import { CHAIN } from "@/lib/web3/config";
import { friendlyError } from "@/lib/web3/format";
import { vaultAbi } from "@/lib/web3/vault-abi";

export { vaultAbi };

export type VaultRow = {
  id: bigint;
  owner: `0x${string}`;
  tier: number;
  open: boolean;
  createdAt: bigint;
  unlockAt: bigint;
  amount: bigint;
  shares: bigint;
  pending: bigint;
};

const base = { address: VAULT.address, abi: vaultAbi, chainId: CHAIN.id } as const;

/** Pool-wide numbers for the stats strip. */
export function useVaultStats() {
  const q = useReadContract({ ...base, functionName: "stats", query: { enabled: Boolean(VAULT.address), refetchInterval: 20_000 } });
  const d = q.data;
  return {
    ready: Boolean(d),
    locked: d?.[0],
    shares: d?.[1],
    vaults: d?.[2],
    rewardsAdded: d?.[3],
    rewardsPaid: d?.[4],
    queued: d?.[5],
  };
}

/** Wallet token balance and how much the vault is allowed to pull. */
export function useTokenAccount() {
  const { address } = useConnection();
  const enabled = Boolean(address && TOKEN.address && VAULT.address);
  const q = useReadContracts({
    contracts: [
      { address: TOKEN.address, abi: erc20Abi, functionName: "balanceOf", args: address ? [address] : undefined, chainId: CHAIN.id },
      {
        address: TOKEN.address,
        abi: erc20Abi,
        functionName: "allowance",
        args: address && VAULT.address ? [address, VAULT.address] : undefined,
        chainId: CHAIN.id,
      },
    ],
    query: { enabled, refetchInterval: 20_000 },
  });
  return { balance: q.data?.[0]?.result as bigint | undefined, allowance: q.data?.[1]?.result as bigint | undefined, refetch: q.refetch };
}

/** Every vault this wallet has opened, newest first, with live pending rewards. */
export function useMyVaults() {
  const { address } = useConnection();
  const ids = useReadContract({
    ...base,
    functionName: "vaultsOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && VAULT.address), refetchInterval: 20_000 },
  });
  const list = (ids.data ?? []) as readonly bigint[];
  const details = useReadContracts({
    contracts: list.flatMap((id) => [
      { ...base, functionName: "getVault", args: [id] },
      { ...base, functionName: "pending", args: [id] },
    ]),
    query: { enabled: list.length > 0, refetchInterval: 20_000 },
  });

  const rows: VaultRow[] = [];
  list.forEach((id, i) => {
    const v = details.data?.[i * 2]?.result as Omit<VaultRow, "id" | "pending"> | undefined;
    const p = details.data?.[i * 2 + 1]?.result as bigint | undefined;
    if (v) rows.push({ id, ...v, tier: Number(v.tier), pending: p ?? BigInt(0) });
  });
  rows.sort((a, b) => Number(b.id - a.id));

  return { rows, loading: ids.isLoading || details.isLoading, empty: ids.isSuccess && list.length === 0 };
}

/**
 * Sends one transaction, shows progress as a toast, waits for it to be mined,
 * then refreshes every on-chain read on the page.
 */
export function useSend() {
  const config = useConfig();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState<string | null>(null);

  const send = React.useCallback(
    async (key: string, label: { pending: string; done: string }, call: { address: `0x${string}`; abi: Abi; functionName: string; args?: readonly unknown[] }) => {
      setBusy(key);
      const id = toast.loading(`${label.pending}… confirm in your wallet`);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hash = await writeContract(config, { ...(call as any), chainId: CHAIN.id });
        toast.loading(`${label.pending}… waiting for Ethereum`, { id });
        const receipt = await waitForTransactionReceipt(config, { hash, chainId: CHAIN.id });
        if (receipt.status !== "success") throw new Error("The transaction failed on-chain.");
        toast.success(label.done, {
          id,
          action: { label: "View", onClick: () => window.open(`https://etherscan.io/tx/${hash}`, "_blank", "noopener") },
        });
        await qc.invalidateQueries();
        return true;
      } catch (e) {
        toast.error(friendlyError(e), { id });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [config, qc],
  );

  return { send, busy };
}
