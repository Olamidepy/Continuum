"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { useConnection } from "wagmi";
import { Check, LoaderCircle, Lock } from "lucide-react";

import { ConnectWallet } from "@/components/site/connect-wallet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LIVE, PENALTY, TIERS, TOKEN, VAULT } from "@/lib/data";
import { CHAIN } from "@/lib/web3/config";
import { fmtToken } from "@/lib/web3/format";
import { useSend, useTokenAccount, vaultAbi } from "@/lib/web3/vault";

function parse(v: string) {
  try {
    return v ? parseUnits(v as `${number}`, TOKEN.decimals) : BigInt(0);
  } catch {
    return BigInt(0);
  }
}

/** Approve (once) then lock. Pre-fills from ?amount=&tier= sent by the home planner. */
export function LockForm() {
  const params = useSearchParams();
  const [amount, setAmount] = React.useState(() => params.get("amount")?.replace(/[^0-9.]/g, "") ?? "");
  const [tier, setTier] = React.useState(() => (["0", "1", "2", "3"].includes(params.get("tier") ?? "") ? params.get("tier")! : "2"));
  const { isConnected, chainId } = useConnection();
  const { balance, allowance } = useTokenAccount();
  const { send, busy } = useSend();

  const t = TIERS[Number(tier)];
  const value = parse(amount);
  const tooMuch = balance !== undefined && value > balance;
  const needsApproval = allowance !== undefined && value > BigInt(0) && allowance < value;
  const wrongChain = isConnected && chainId !== CHAIN.id;

  const approve = () =>
    send("approve", { pending: "Approving", done: "Approved. Now lock." }, { address: TOKEN.address!, abi: erc20Abi, functionName: "approve", args: [VAULT.address!, value] });

  const lock = async () => {
    const ok = await send("lock", { pending: `Locking for ${t.label}`, done: `Locked for ${t.label}` }, { address: VAULT.address!, abi: vaultAbi, functionName: "lock", args: [value, t.id] });
    if (ok) setAmount("");
  };

  let action: React.ReactNode;
  if (!LIVE) {
    action = (
      <Button size="lg" className="w-full" disabled>
        <Lock />
        Opens after launch
      </Button>
    );
  } else if (!isConnected) {
    action = <ConnectWallet size="lg" className="w-full" />;
  } else if (wrongChain) {
    action = (
      <Button size="lg" className="w-full" disabled>
        Switch your wallet to Ethereum
      </Button>
    );
  } else if (needsApproval) {
    action = (
      <Button size="lg" className="w-full" onClick={approve} disabled={busy !== null || tooMuch}>
        {busy === "approve" ? <LoaderCircle className="animate-spin" /> : <Check />}
        Approve tokens
      </Button>
    );
  } else {
    action = (
      <Button size="lg" className="w-full" onClick={lock} disabled={busy !== null || value === BigInt(0) || tooMuch}>
        {busy === "lock" ? <LoaderCircle className="animate-spin" /> : <Lock />}
        Lock for {t.label}
      </Button>
    );
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Open a vault</CardTitle>
        <CardDescription>Your tokens stay in the vault until the unlock day, or until you leave early for a {PENALTY.pct}% fee.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="lock-amount">Amount</Label>
            {balance !== undefined ? (
              <button type="button" onClick={() => setAmount(formatUnits(balance, TOKEN.decimals))} className="num text-xs text-muted-foreground hover:text-foreground">
                Balance {fmtToken(balance)} · Max
              </button>
            ) : null}
          </div>
          <div className="relative">
            <Input
              id="lock-amount"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              aria-invalid={tooMuch || undefined}
              className="num h-11 pr-24 text-base"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">{TOKEN.unit}</span>
          </div>
          {tooMuch ? <p className="text-sm text-destructive">That&apos;s more than your wallet holds.</p> : null}
        </div>
        <div className="grid gap-2">
          <Label id="lock-tier">Lock length</Label>
          <ToggleGroup type="single" variant="outline" value={tier} onValueChange={(v) => v && setTier(v)} aria-labelledby="lock-tier" className="w-full">
            {TIERS.map((x) => (
              <ToggleGroupItem key={x.id} value={String(x.id)} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {x.days}d
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            {t.label} at {t.weight.toFixed(1)}x weight. Unlocks{" "}
            {new Date(Date.now() + t.days * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-3">
        {action}
        <p className="text-center text-xs text-muted-foreground">First approve this exact amount, then lock. That&apos;s two wallet confirmations.</p>
      </CardFooter>
    </Card>
  );
}
