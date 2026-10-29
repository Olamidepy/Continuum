"use client";

import * as React from "react";
import { erc20Abi, parseUnits } from "viem";
import { useConnection, useReadContract } from "wagmi";
import { ArrowDownToLine, CalendarPlus, Coins, DoorOpen, LoaderCircle, Plus, Vault as VaultIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LIVE, PENALTY, TIERS, TOKEN, VAULT } from "@/lib/data";
import { CHAIN } from "@/lib/web3/config";
import { fmtDate, fmtToken, timeLeft } from "@/lib/web3/format";
import { useMyVaults, useSend, useTokenAccount, vaultAbi, type VaultRow } from "@/lib/web3/vault";

type Mode = "add" | "extend" | "exit" | null;

function useNow() {
  const [now, setNow] = React.useState(() => Date.now() / 1000);
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function VaultCard({ v, now }: { v: VaultRow; now: number }) {
  const { send, busy } = useSend();
  const [mode, setMode] = React.useState<Mode>(null);
  const tier = TIERS[v.tier];
  const unlocked = now >= Number(v.unlockAt);
  const total = Number(v.unlockAt - v.createdAt);
  const elapsed = Math.min(total, Math.max(0, now - Number(v.createdAt)));
  const pct = total > 0 ? (elapsed / total) * 100 : 100;
  const key = (k: string) => `${k}-${v.id}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="num font-heading text-xl">
          {fmtToken(v.amount)} {TOKEN.unit}
        </CardTitle>
        <CardDescription>
          Vault #{v.id.toString()} · {tier.label} at {tier.weight.toFixed(1)}x
        </CardDescription>
        <CardAction>{unlocked ? <Badge>Unlocked</Badge> : <Badge variant="secondary">{timeLeft(v.unlockAt, now)}</Badge>}</CardAction>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Progress value={pct} aria-label="Time locked so far" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Locked {fmtDate(v.createdAt)}</span>
            <span>Unlocks {fmtDate(v.unlockAt)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
          <span className="text-sm text-muted-foreground">Rewards ready</span>
          <span className="num font-heading text-lg font-semibold text-primary">
            {fmtToken(v.pending)} {TOKEN.unit}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {unlocked ? (
          <Button
            className="flex-1"
            disabled={busy !== null}
            onClick={() => send(key("withdraw"), { pending: "Withdrawing", done: "Withdrawn with rewards" }, { address: VAULT.address!, abi: vaultAbi, functionName: "withdraw", args: [v.id] })}
          >
            {busy === key("withdraw") ? <LoaderCircle className="animate-spin" /> : <ArrowDownToLine />}
            Withdraw all
          </Button>
        ) : (
          <>
            <Button
              className="flex-1"
              disabled={busy !== null || v.pending === BigInt(0)}
              onClick={() => send(key("claim"), { pending: "Claiming rewards", done: "Rewards claimed" }, { address: VAULT.address!, abi: vaultAbi, functionName: "claim", args: [v.id] })}
            >
              {busy === key("claim") ? <LoaderCircle className="animate-spin" /> : <Coins />}
              Claim
            </Button>
            <Button variant="outline" onClick={() => setMode("add")} disabled={busy !== null}>
              <Plus />
              Add
            </Button>
            <Button variant="outline" onClick={() => setMode("extend")} disabled={busy !== null}>
              <CalendarPlus />
              Extend
            </Button>
            <Button variant="ghost" className="text-muted-foreground" onClick={() => setMode("exit")} disabled={busy !== null}>
              <DoorOpen />
              Leave early
            </Button>
          </>
        )}
      </CardFooter>
      <AddDialog v={v} open={mode === "add"} onClose={() => setMode(null)} />
      <ExtendDialog v={v} open={mode === "extend"} onClose={() => setMode(null)} />
      <ExitDialog v={v} open={mode === "exit"} onClose={() => setMode(null)} />
    </Card>
  );
}

function AddDialog({ v, open, onClose }: { v: VaultRow; open: boolean; onClose: () => void }) {
  const [amount, setAmount] = React.useState("");
  const { balance, allowance } = useTokenAccount();
  const { send, busy } = useSend();
  let value = BigInt(0);
  try {
    value = amount ? parseUnits(amount as `${number}`, TOKEN.decimals) : BigInt(0);
  } catch {}
  const needsApproval = allowance !== undefined && value > BigInt(0) && allowance < value;
  const tooMuch = balance !== undefined && value > balance;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to vault #{v.id.toString()}</DialogTitle>
          <DialogDescription>The unlock day stays {fmtDate(v.unlockAt)}. New tokens get the same {TIERS[v.tier].weight.toFixed(1)}x weight.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor={`add-${v.id}`}>Amount</Label>
          <Input id={`add-${v.id}`} inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} className="num" />
          <p className="num text-xs text-muted-foreground">Balance {fmtToken(balance)}</p>
          {tooMuch ? <p className="text-sm text-destructive">That&apos;s more than your wallet holds.</p> : null}
        </div>
        <DialogFooter>
          {needsApproval ? (
            <Button
              disabled={busy !== null || tooMuch}
              onClick={() => send("approve", { pending: "Approving", done: "Approved. Now add." }, { address: TOKEN.address!, abi: erc20Abi, functionName: "approve", args: [VAULT.address!, value] })}
            >
              {busy ? <LoaderCircle className="animate-spin" /> : null}
              Approve tokens
            </Button>
          ) : (
            <Button
              disabled={busy !== null || value === BigInt(0) || tooMuch}
              onClick={async () => {
                const ok = await send("add", { pending: "Adding", done: "Added to vault" }, { address: VAULT.address!, abi: vaultAbi, functionName: "topUp", args: [v.id, value] });
                if (ok) onClose();
              }}
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <Plus />}
              Add tokens
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExtendDialog({ v, open, onClose }: { v: VaultRow; open: boolean; onClose: () => void }) {
  const options = TIERS.filter((t) => t.id >= v.tier);
  const [tier, setTier] = React.useState(String(options[options.length - 1].id));
  const { send, busy } = useSend();
  const t = TIERS[Number(tier)];
  const newUnlock = Date.now() / 1000 + t.days * 86400;
  const later = newUnlock > Number(v.unlockAt);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extend vault #{v.id.toString()}</DialogTitle>
          <DialogDescription>The lock restarts from today. Your shares are re-weighted for the new length. Rewards you&apos;ve earned are kept.</DialogDescription>
        </DialogHeader>
        <ToggleGroup type="single" variant="outline" value={tier} onValueChange={(x) => x && setTier(x)} aria-label="New lock length" className="w-full">
          {options.map((x) => (
            <ToggleGroupItem key={x.id} value={String(x.id)} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              {x.days}d
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-sm text-muted-foreground">
          {later ? `New unlock day: ${fmtDate(newUnlock)} at ${t.weight.toFixed(1)}x.` : "That length would end before your current unlock day. Pick a longer one."}
        </p>
        <DialogFooter>
          <Button
            disabled={busy !== null || !later}
            onClick={async () => {
              const ok = await send("extend", { pending: "Extending", done: `Extended to ${t.label}` }, { address: VAULT.address!, abi: vaultAbi, functionName: "extend", args: [v.id, t.id] });
              if (ok) onClose();
            }}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <CalendarPlus />}
            Extend to {t.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExitDialog({ v, open, onClose }: { v: VaultRow; open: boolean; onClose: () => void }) {
  const { send, busy } = useSend();
  const preview = useReadContract({ address: VAULT.address, abi: vaultAbi, functionName: "previewExit", args: [v.id], chainId: CHAIN.id, query: { enabled: open } });
  const [returned, penalty] = preview.data ?? [undefined, undefined];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave vault #{v.id.toString()} early?</DialogTitle>
          <DialogDescription>
            {timeLeft(v.unlockAt)}. Leaving now costs {PENALTY.pct}% of what you locked. {PENALTY.toLockers}% of that goes to the savers still locked.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-px overflow-hidden rounded-lg border bg-border text-sm">
          <div className="flex justify-between bg-card px-4 py-3">
            <dt className="text-muted-foreground">Exit fee</dt>
            <dd className="num">{penalty !== undefined ? `−${fmtToken(penalty)} ${TOKEN.unit}` : <Skeleton className="h-4 w-20" />}</dd>
          </div>
          <div className="flex justify-between bg-card px-4 py-3">
            <dt className="text-muted-foreground">You receive (incl. rewards)</dt>
            <dd className="num font-semibold">{returned !== undefined ? `${fmtToken(returned)} ${TOKEN.unit}` : <Skeleton className="h-4 w-20" />}</dd>
          </div>
        </dl>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Keep it locked
          </Button>
          <Button
            variant="destructive"
            disabled={busy !== null}
            onClick={async () => {
              const ok = await send("exit", { pending: "Leaving early", done: "Vault closed early" }, { address: VAULT.address!, abi: vaultAbi, functionName: "exitEarly", args: [v.id] });
              if (ok) onClose();
            }}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <DoorOpen />}
            Leave and pay {PENALTY.pct}%
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Every vault in the connected wallet. */
export function MyVaults() {
  const { isConnected } = useConnection();
  const { rows, loading, empty } = useMyVaults();
  const now = useNow();
  const open = rows.filter((r) => r.open);

  if (!LIVE || !isConnected) {
    return (
      <Card className="items-center py-14 text-center">
        <VaultIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        <CardHeader className="w-full items-center">
          <CardTitle className="font-heading">Your vaults show up here</CardTitle>
          <CardDescription>{LIVE ? "Connect the wallet you lock with to see them." : "Vaults open once the token launches and the vault contract is live."}</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  if (loading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (empty || open.length === 0) {
    return (
      <Card className="items-center py-14 text-center">
        <VaultIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        <CardHeader className="w-full items-center">
          <CardTitle className="font-heading">No open vaults yet</CardTitle>
          <CardDescription>Lock some tokens with the form to open your first one.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <div className="grid gap-4">
      {open.map((v) => (
        <VaultCard key={v.id.toString()} v={v} now={now} />
      ))}
    </div>
  );
}
