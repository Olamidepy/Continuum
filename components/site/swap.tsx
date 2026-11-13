"use client";

import * as React from "react";
import { ArrowDown, Clock3, Info, Loader2 } from "lucide-react";
import { formatUnits, parseUnits, type PublicClient } from "viem";
import { useConfig, useConnection, usePublicClient } from "wagmi";
import { sendTransaction, switchChain, waitForTransactionReceipt } from "wagmi/actions";

import { ConnectWallet } from "@/components/site/connect-wallet";

import { LogoMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEV_WALLET, SITE, TOKEN } from "@/lib/data";
import { CHAIN } from "@/lib/web3/config";
import { fmtEth, fmtUsd } from "@/lib/web3/format";
import { useLiveToken } from "@/lib/web3/live";
import { balances, buildSwap, minOut, quote, sellApprovals, simulate } from "@/lib/web3/swap";

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

const SLIPPAGES = [100, 300, 1000] as const;

const short = (v: bigint) => {
  const n = Number(formatUnits(v, 18));
  return n === 0 ? "0" : n.toLocaleString("en-US", { maximumSignificantDigits: 6 });
};

/**
 * Trade card. Quotes and trades directly against the official Uniswap v4 pool through the Universal Router,
 * the same route the Uniswap app uses. The hook's 5% fee is already inside every quote.
 */
export function Swap() {
  const [side, setSide] = React.useState<"buy" | "sell">("buy");
  const [amount, setAmount] = React.useState("0.01");
  const [slippage, setSlippage] = React.useState<number>(300);
  const [quoted, setQuoted] = React.useState<{ key: string; out: bigint } | undefined>();
  const [quoteError, setQuoteError] = React.useState<string>();
  const [bal, setBal] = React.useState<{ eth: bigint; token: bigint }>();
  const [busy, setBusy] = React.useState<string>();
  const [result, setResult] = React.useState<{ ok: boolean; text: string; hash?: string }>();

  const config = useConfig();
  const client = usePublicClient({ chainId: CHAIN.id }) as unknown as PublicClient | undefined;
  const { address, isConnected, chainId } = useConnection();
  const payEth = side === "buy";
  const { live, startedAt, priceEth, priceUsd, marketCapUsd } = useLiveToken();

  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const protectedLeft = !live ? 0 : startedAt ? Math.max(0, Math.ceil(startedAt + TOKEN.protectionSeconds - now / 1000)) : TOKEN.protectionSeconds;

  // Anti-sniper fee: starts at 80% and falls in a straight line to the normal fee. Only buys pay it.
  const normalFee = TOKEN.fee;
  const sinceStart = live && startedAt ? Math.max(0, now / 1000 - startedAt) : undefined;
  const openingLeft = sinceStart === undefined ? 0 : Math.max(0, Math.ceil(TOKEN.openingFeeSeconds - sinceStart));
  const feeNow =
    payEth && openingLeft > 0 && sinceStart !== undefined
      ? TOKEN.openingFeePct - (TOKEN.openingFeePct - normalFee) * (sinceStart / TOKEN.openingFeeSeconds)
      : normalFee;

  const amountIn = React.useMemo(() => {
    try {
      const v = parseUnits(amount || "0", 18);
      return v > BigInt(0) ? v : undefined;
    } catch {
      return undefined;
    }
  }, [amount]);
  const quoteKey = `${side}:${amountIn ?? ""}`;

  // Live quote from the Uniswap v4 Quoter, debounced, refreshed every 12 s.
  React.useEffect(() => {
    if (!live || !client || !amountIn) {
      setQuoted(undefined);
      setQuoteError(undefined);
      return;
    }
    let stop = false;
    const run = async () => {
      try {
        const out = await quote(client, side, amountIn);
        if (!stop) {
          setQuoted({ key: quoteKey, out });
          setQuoteError(undefined);
        }
      } catch {
        if (!stop) {
          setQuoted(undefined);
          setQuoteError("No quote for this amount.");
        }
      }
    };
    const t = setTimeout(run, 350);
    const id = setInterval(run, 12_000);
    return () => {
      stop = true;
      clearTimeout(t);
      clearInterval(id);
    };
  }, [live, client, side, amountIn, quoteKey]);

  const refreshBalances = React.useCallback(async () => {
    if (!client || !address || !TOKEN.address) return setBal(undefined);
    try {
      setBal(await balances(client, address));
    } catch {
      /* balances are a convenience */
    }
  }, [client, address]);
  React.useEffect(() => {
    refreshBalances();
  }, [refreshBalances, live]);

  const out = quoted && quoted.key === quoteKey ? quoted.out : undefined;
  const fallbackOut = live && priceEth ? (payEth ? ((Number(amount) || 0) * (1 - feeNow / 100)) / priceEth : (Number(amount) || 0) * priceEth * (1 - feeNow / 100)) : undefined;
  const have = bal ? (payEth ? bal.eth : bal.token) : undefined;
  const tooMuch = have !== undefined && amountIn !== undefined && amountIn > have;

  async function trade() {
    if (!client || !address || !amountIn || out === undefined) return;
    setResult(undefined);
    try {
      if (chainId !== CHAIN.id) {
        setBusy("Switching to Ethereum");
        await switchChain(config, { chainId: CHAIN.id });
      }
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
      if (!payEth) {
        const steps = await sellApprovals(client, address, amountIn, deadline);
        for (const step of steps) {
          setBusy(`${step.label} in your wallet`);
          const hash = await sendTransaction(config, { ...step.tx, chainId: CHAIN.id });
          setBusy(`${step.label}: confirming`);
          await waitForTransactionReceipt(config, { hash, chainId: CHAIN.id });
        }
      }
      setBusy("Checking the trade");
      const fresh = await quote(client, side, amountIn);
      const tx = buildSwap(side, amountIn, minOut(fresh, slippage), deadline);
      await simulate(client, address, tx);
      setBusy("Confirm in your wallet");
      const hash = await sendTransaction(config, { ...tx, chainId: CHAIN.id });
      setBusy("Confirming on Ethereum");
      const receipt = await waitForTransactionReceipt(config, { hash, chainId: CHAIN.id });
      if (receipt.status !== "success") throw new Error("The trade reverted. Nothing was swapped.");
      setResult({ ok: true, text: payEth ? `Bought ${TOKEN.symbol}.` : `Sold ${TOKEN.symbol}.`, hash });
      refreshBalances();
    } catch (err) {
      const e = err as { shortMessage?: string; message?: string; name?: string };
      const msg = e.shortMessage ?? e.message ?? "Something went wrong.";
      setResult({ ok: false, text: /reject|denied|cancel/i.test(msg) ? "You cancelled in your wallet." : msg });
    } finally {
      setBusy(undefined);
    }
  }

  const label = !amountIn ? "Enter an amount" : tooMuch ? `Not enough ${payEth ? "ETH" : TOKEN.unit}` : out === undefined ? (quoteError ?? "Getting a quote") : payEth ? `Buy ${TOKEN.symbol}` : `Sell ${TOKEN.symbol}`;

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
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="swap-amount" className="text-muted-foreground">
              You pay
            </Label>
            {have !== undefined ? (
              <button
                type="button"
                className="num text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  // Leave a little ETH for gas.
                  const reserve = payEth ? parseUnits("0.003", 18) : BigInt(0);
                  const max = have > reserve ? have - reserve : BigInt(0);
                  setAmount(formatUnits(max, 18));
                }}
              >
                Balance {short(have)} · Max
              </button>
            ) : null}
          </div>
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
            <span className="num min-w-0 flex-1 truncate font-heading text-3xl font-semibold">
              {out !== undefined ? short(out) : fallbackOut ? fallbackOut.toLocaleString("en-US", { maximumSignificantDigits: 6 }) : "—"}
            </span>
            <TokenPill eth={!payEth} />
          </div>
          <p className="num mt-3 text-xs text-muted-foreground">
            {live ? `1 ${TOKEN.unit} = ${fmtEth(priceEth)} · ${fmtUsd(priceUsd)} · Market cap ${fmtUsd(marketCapUsd)}` : "The price shows here once the pool opens."}
          </p>
        </div>

        <dl className="mt-3 grid gap-2.5 px-1 text-sm">
          {openingLeft > 0 && payEth ? (
            <div className="flex justify-between rounded-md bg-primary/10 px-2 py-1.5 text-primary">
              <dt>Anti-sniper fee now</dt>
              <dd className="num">
                {feeNow.toFixed(1)}% · normal in 0:{String(openingLeft).padStart(2, "0")}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Trading fee</dt>
            <dd className="num">{normalFee}%</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Max slippage</dt>
            <dd className="flex gap-1">
              {SLIPPAGES.map((bps) => (
                <button
                  key={bps}
                  type="button"
                  onClick={() => setSlippage(bps)}
                  className={`num rounded-md border px-2 py-0.5 text-xs ${slippage === bps ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {bps / 100}%
                </button>
              ))}
            </dd>
          </div>
          {out !== undefined ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Minimum received</dt>
              <dd className="num">
                {short(minOut(out, slippage))} {payEth ? TOKEN.unit : "ETH"}
              </dd>
            </div>
          ) : null}
          <Separator className="my-1" />
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Max per wallet</dt>
            <dd className="num">{protectedLeft > 0 ? `${TOKEN.walletCapPct}% of supply for ${Math.floor(protectedLeft / 60)}:${String(protectedLeft % 60).padStart(2, "0")}` : "No limit"}</dd>
          </div>
        </dl>
      </CardContent>

      <CardFooter className="flex-col gap-3">
        {!live ? (
          <Button size="lg" className="w-full" disabled>
            <Clock3 />
            Trading opens at launch
          </Button>
        ) : !isConnected ? (
          <ConnectWallet size="lg" className="w-full" />
        ) : (
          <Button size="lg" className="w-full" disabled={Boolean(busy) || !amountIn || tooMuch || out === undefined} onClick={trade}>
            {busy ? (
              <>
                <Loader2 className="animate-spin" />
                {busy}
              </>
            ) : (
              label
            )}
          </Button>
        )}
        {result ? (
          <p className={`text-center text-sm ${result.ok ? "text-primary" : "text-destructive"}`}>
            {result.text}{" "}
            {result.hash ? (
              <a href={`https://etherscan.io/tx/${result.hash}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                View on Etherscan
              </a>
            ) : null}
          </p>
        ) : null}
        {live && openingLeft > 0 && payEth ? (
          <p className="text-center text-xs text-primary">The anti-sniper fee is still high. Waiting {openingLeft}s brings it to {normalFee}%.</p>
        ) : null}
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Quotes come from the Uniswap v4 Quoter and already include the {normalFee}% fee, which goes to the dev wallet {DEV_WALLET.slice(0, 6)}…{DEV_WALLET.slice(-4)}. Every
          trade is checked before your wallet opens.
        </p>
      </CardFooter>
    </Card>
  );
}
