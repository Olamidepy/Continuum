"use client";

import * as React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PENALTY, TIERS, TOKEN } from "@/lib/data";
import { cn } from "@/lib/utils";

const MAX_DAYS = 365;

/**
 * The home page's planner: pick an amount and a length, see the unlock day on a one-year line
 * and what your weight means. Nothing is sent; it only explains the vault.
 */
export function LockPlanner() {
  const [amount, setAmount] = React.useState("10000");
  const [tier, setTier] = React.useState("2");
  const t = TIERS[Number(tier)];
  const n = Number(amount) || 0;
  const shares = n * t.weight;
  const unlock = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + t.days);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }, [t.days]);
  const pos = (t.days / MAX_DAYS) * 100;

  return (
    <Card className="gap-5">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Plan a lock</CardTitle>
        <CardDescription>See your unlock day and weight before you commit.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="plan-amount">Amount</Label>
          <div className="relative">
            <Input
              id="plan-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="num h-11 pr-24 text-base"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">{TOKEN.unit}</span>
          </div>
        </div>

        <div className="grid gap-2">
          <Label id="plan-tier">Lock length</Label>
          <ToggleGroup type="single" variant="outline" value={tier} onValueChange={(v) => v && setTier(v)} aria-labelledby="plan-tier" className="w-full">
            {TIERS.map((x) => (
              <ToggleGroupItem key={x.id} value={String(x.id)} className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {x.days}d
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* One year as a line: today on the left, a year out on the right. */}
        <div aria-hidden="true" className="pt-7">
          <div className="relative h-2 rounded-full bg-muted">
            <div className="timeline-ramp absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pos}%` }} />
            {TIERS.map((x) => (
              <span
                key={x.id}
                className={cn("absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card", x.days <= t.days ? "bg-foreground" : "bg-muted-foreground/40")}
                style={{ left: `${(x.days / MAX_DAYS) * 100}%` }}
              />
            ))}
            <span
              suppressHydrationWarning
              className="absolute -top-8 -translate-x-1/2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-primary-foreground transition-[left] duration-500 ease-out"
              style={{ left: `clamp(2.5rem, ${pos}%, calc(100% - 2.5rem))` }}
            >
              {unlock}
            </span>
          </div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>Today</span>
            <span>1 year</span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border text-sm">
          <div className="bg-card p-3">
            <dt className="text-muted-foreground">Weight</dt>
            <dd className="num mt-1 font-heading text-xl font-semibold">{t.weight.toFixed(1)}x</dd>
          </div>
          <div className="bg-card p-3">
            <dt className="text-muted-foreground">Your shares</dt>
            <dd className="num mt-1 font-heading text-xl font-semibold">{shares.toLocaleString("en-US", { maximumFractionDigits: 0 })}</dd>
          </div>
          <div className="col-span-2 bg-card p-3 text-muted-foreground" suppressHydrationWarning>
            Leave before {unlock} and you get back {(n * (1 - PENALTY.pct / 100)).toLocaleString("en-US", { maximumFractionDigits: 2 })} {TOKEN.unit} plus rewards earned. Stay
            to the end and you get it all back.
          </div>
        </dl>
      </CardContent>
      <CardFooter>
        <Button asChild size="lg" className="w-full">
          <Link href={`/vaults?tier=${t.id}&amount=${encodeURIComponent(amount)}`}>
            <Lock />
            Lock for {t.label}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
