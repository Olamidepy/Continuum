"use client";

import * as React from "react";
import { ArrowDown, ArrowUpRight, Clock3, Info } from "lucide-react";

import { LogoMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SITE, TOKEN } from "@/lib/data";
import { fmtEth, fmtUsd } from "@/lib/web3/format";
import { useLiveToken } from "@/lib/web3/live";

function EthDot() {
  return (
    <span className="grid size-6 place-items-center rounded-full bg-[#627eea]" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-3.5 text-white">
        <path fill="currentColor" d="M12 2 5.5 12.3 12 16l6.5-3.7L12 2Zm0 15.3L5.5 13.6 12 22l6.5-8.4-6.5 3.7Z" />
      </svg>
    </span>
  );
}

function TokenPill({ eth }: { eth: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-2 rounded-full border bg-secondary py-1 pr-3 pl-1 text-sm font-semibold">
      {eth ? (
        <EthDot />
      ) : (
        <span className="grid size-6 place-items-center rounded-full bg-background">
          <LogoMark className="w-4" />
        </span>
      )}
      {eth ? "ETH" : TOKEN.symbol}
    </span>
  );
}

/**
 * Trade card. Reads the live price from the official Uniswap v4 pool.
 * Orders are placed on Programmable (the only router allowed during launch protection) or Uniswap.
 */
export function Swap() {
  const [side, setSide] = React.useState<"buy" | "sell">("buy");
  const [amount, setAmount] = React.useState("0.1");
  const n = Number(amount) || 0;
  const payEth = side === "buy";
  const { live, startedAt, priceEth, priceUsd, marketCapUsd } = useLiveToken();

  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const protectedLeft = !live ? 0 : startedAt ? Math.max(0, Math.ceil(startedAt + TOKEN.protectionSeconds - now / 1000)) : TOKEN.protectionSeconds;
  const coinPage = TOKEN.coinPage ?? SITE.launchpadUrl;
  const href = protectedLeft > 0 ? coinPage : TOKEN.uniswap ?? coinPage;
  const protectedLeftLabel = protectedLeft > 0 ? `${SITE.launchpad} only` : `${SITE.launchpad}, Uniswap`;

  // Anti-sniper fee: starts high at launch and falls in a straight line to the normal fee.
  const normalFee = TOKEN.platformFee + TOKEN.creatorFee;
  const sinceStart = live && startedAt ? Math.max(0, now / 1000 - startedAt) : undefined;
  const openingLeft = sinceStart === undefined ? 0 : Math.max(0, Math.ceil(TOKEN.openingFeeSeconds - sinceStart));
  const feeNow = openingLeft > 0 && sinceStart !== undefined ? TOKEN.openingFeePct - (TOKEN.openingFeePct - normalFee) * (sinceStart / TOKEN.openingFeeSeconds) : normalFee;
  const keep = 1 - feeNow / 100;
  const out = live && priceEth ? (payEth ? (n * keep) / priceEth : n * priceEth * keep) : undefined;

  return (
    <Card className="gap-4">
      <CardHeader className="items-center">
        <Tabs value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
          <TabsList>
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>
        </Tabs>
        <CardAction className="self-center text-xs text-muted-foreground">Uniswap v4 on {SITE.chain}</CardAction>
      </CardHeader>

      <CardContent className="grid gap-1">
        <div className="rounded-lg border bg-background/60 p-4">
          <Label htmlFor="swap-amount" className="text-muted-foreground">
            You pay
          </Label>
          <div className="mt-2 flex items-center gap-3">
            <Input
              id="swap-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="num h-auto min-w-0 border-0 bg-transparent p-0 font-heading text-3xl font-semibold shadow-none focus-visible:ring-0 md:text-3xl dark:bg-transparent"
            />
            <TokenPill eth={payEth} />
          </div>
        </div>

        <div className="relative z-10 -my-3 flex justify-center">
          <Button variant="outline" size="icon" className="bg-card" onClick={() => setSide((s) => (s === "buy" ? "sell" : "buy"))} aria-label="Switch buy and sell">
            <ArrowDown />
          </Button>
        </div>

        <div className="rounded-lg border bg-background/60 p-4">
          <span className="text-sm text-muted-foreground">You receive about</span>
          <div className="mt-2 flex items-center gap-3">
            <span className="num min-w-0 flex-1 truncate font-heading text-3xl font-semibold">{out ? out.toLocaleString("en-US", { maximumSignificantDigits: 6 }) : "—"}</span>
            <TokenPill eth={!payEth} />
          </div>
          <p className="num mt-3 text-xs text-muted-foreground">
            {live ? `1 ${TOKEN.unit === "tokens" ? "token" : TOKEN.unit} = ${fmtEth(priceEth)} · ${fmtUsd(priceUsd)} · Market cap ${fmtUsd(marketCapUsd)}` : "The price shows here once the pool opens."}
          </p>
        </div>

        <dl className="mt-3 grid gap-2.5 px-1 text-sm">
          {openingLeft > 0 ? (
            <div className="flex justify-between rounded-md bg-primary/10 px-2 py-1.5 text-primary">
              <dt>Anti-sniper fee now</dt>
              <dd className="num">
                {feeNow.toFixed(1)}% · normal in {Math.floor(openingLeft / 60)}:{String(openingLeft % 60).padStart(2, "0")}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Platform fee</dt>
            <dd className="num">{TOKEN.platformFee}%</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Creator fee</dt>
            <dd className="num">{TOKEN.creatorFee}%</dd>
          </div>
          <Separator className="my-1" />
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Where it trades</dt>
            <dd>{protectedLeftLabel}</dd>
          </div>
        </dl>
      </CardContent>

      <CardFooter className="flex-col gap-3">
        {live ? (
          <>
            <Button asChild size="lg" className="w-full">
              <a href={href} target="_blank" rel="noopener noreferrer">
                {protectedLeft > 0 ? `Buy on ${SITE.launchpad}` : payEth ? `Buy ${TOKEN.symbol}` : `Sell ${TOKEN.symbol}`}
                <ArrowUpRight />
              </a>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {protectedLeft > 0
                ? `Launch protection: ${Math.floor(protectedLeft / 60)}:${String(protectedLeft % 60).padStart(2, "0")} left. Only ${SITE.launchpad} can route buys until then.`
                : `Opens the official pool on Uniswap. Set your slippage there. Also tradable on ${SITE.launchpad}.`}
            </p>
          </>
        ) : (
          <Button size="lg" className="w-full" disabled>
            <Clock3 />
            Trading opens at launch
          </Button>
        )}
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Estimates use the pool price after fees. The final amount depends on the pool when your trade lands.
        </p>
      </CardFooter>
    </Card>
  );
}
