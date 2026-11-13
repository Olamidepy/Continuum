import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Coins, DoorOpen, FileCode2, Lock, Percent, Rocket, ShieldCheck, TriangleAlert } from "lucide-react";

import { CopyAddress } from "@/components/site/copy-address";
import { PageHeader } from "@/components/site/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEV_WALLET, PENALTY, SITE, TIERS, TOKEN, VAULT } from "@/lib/data";

export const metadata: Metadata = { title: "Docs" };

const TOC = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "locking", label: "Locking", icon: Lock },
  { id: "rewards", label: "Rewards", icon: Coins },
  { id: "early-exit", label: "Leaving early", icon: DoorOpen },
  { id: "fees", label: "Trading fees", icon: Percent },
  { id: "launch", label: "The launch", icon: Rocket },
  { id: "contracts", label: "Contracts", icon: FileCode2 },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "risks", label: "Risks", icon: TriangleAlert },
];

const FUNCTIONS = [
  { fn: "lock(amount, tier)", does: "Opens a vault. Tier 0–3 is 3, 7, 14 or 30 days. Approve the vault for the amount first." },
  { fn: "topUp(id, amount)", does: "Adds tokens to a vault that's still locked. The unlock day doesn't change." },
  { fn: "extend(id, tier)", does: "Restarts the lock from now on the same or a longer tier and re-weights its shares." },
  { fn: "claim(id)", does: "Pays out the rewards a vault has earned. The vault stays locked." },
  { fn: "withdraw(id)", does: "After the unlock day: pays back the full amount plus all rewards and closes the vault." },
  { fn: "exitEarly(id)", does: `Before the unlock day: pays back ${100 - PENALTY.pct}% plus all rewards, shares the fee and closes the vault.` },
  { fn: "fund(amount)", does: "Anyone can add tokens to the reward pool for everyone currently locked." },
  { fn: "pending(id) · previewExit(id) · stats()", does: "Read-only views the website uses for rewards, exit quotes and pool totals." },
];

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-36 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
      {children}
    </h2>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground">{children}</code>;
}

export default function DocsPage() {
  const contracts = [
    { name: "WRON token", address: TOKEN.address },
    { name: "Pool hook (trading fee, anti-sniper)", address: TOKEN.hook },
    { name: "Fee vault", address: TOKEN.feeVault },
    { name: "WronskianVault", address: VAULT.address },
    { name: "Dev wallet", address: DEV_WALLET },
  ];

  return (
    <>
      <PageHeader title="How Wronskian works" body="Everything a saver needs: how locks and shares work, where exit fees go, how the token launches and what the contract can and can't do." />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Docs" className="min-w-0 lg:sticky lg:top-36 lg:self-start">
          <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {TOC.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <a href={`#${id}`} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="flex min-w-0 max-w-[72ch] flex-col gap-16 text-[16px] leading-relaxed text-muted-foreground [&_strong]:text-foreground">
          <section className="flex flex-col gap-4">
            <H2 id="overview">Overview</H2>
            <p>
              Wronskian (WRON) is a token on {SITE.chain} with a savings vault built for it. {SITE.definition} You lock tokens for a fixed time. If you stay to the end you get everything back, plus a share of the fees paid by people
              who left early. If you leave early, you pay a <strong>{PENALTY.pct}% exit fee</strong> on what you locked.
            </p>
            <p>
              Most token launches reward selling fast. Wronskian flips that: every early exit pays the people who are still holding, so patience is the thing that earns.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="locking">Locking</H2>
            <p>
              Each lock is its own vault with its own unlock day. You can open as many as you like. Pick one of four lengths. The longer the lock, the higher its <strong>weight</strong>.
            </p>
            <Card className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Tier</TableHead>
                    <TableHead>Length</TableHead>
                    <TableHead className="pr-4 text-right">Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TIERS.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="num pl-4">{t.id}</TableCell>
                      <TableCell className="text-foreground">{t.label}</TableCell>
                      <TableCell className="num pr-4 text-right">{t.weight.toFixed(1)}x</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <p>
              You can <strong>add</strong> to a vault while it's locked (the unlock day stays the same) or <strong>extend</strong> it, which restarts the lock from today on the same or a longer
              tier. Locking first needs a token approval for the exact amount.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="rewards">Rewards</H2>
            <p>
              A vault's <strong>shares</strong> are its amount times its weight. 1,000 tokens locked for 30 days is 2,000 shares; the same amount for 3 days is 1,000 shares.
            </p>
            <p>
              Every time rewards come in, they're split across all open vaults by shares, from that moment on. A vault opened later never earns from rewards that arrived before it. The contract
              tracks this with a running reward-per-share number, so it costs the same gas whether there are ten vaults or ten thousand.
            </p>
            <p>
              Rewards come from two places: <strong>early-exit fees</strong> and <strong>funding</strong>, where anyone sends tokens to the pool with <Code>fund</Code>. If rewards arrive while no
              vault is open, they wait and go to the next vaults that open. Claim rewards any time with <Code>claim</Code>; they're also paid automatically when a vault closes.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="early-exit">Leaving early</H2>
            <p>Before its unlock day, a vault can be closed with <Code>exitEarly</Code>. On a 1,000-token vault:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>900</strong> come back to you, plus every reward the vault already earned.
              </li>
              <li>
                <strong>100</strong> (the whole forfeit) are shared with every vault still open, weighted by shares.
              </li>
            </ul>
            <p>Your vault is removed before the fee is shared, so you never earn from your own exit fee. After the unlock day there's no fee at all: <Code>withdraw</Code> returns everything.</p>
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="fees">Trading fees</H2>
            <p>
              WRON trades in one official Uniswap v4 pool. Every buy and sell in that pool pays a small trading fee, taken in ETH. The rate is fixed in the hook and can never change. Normal
              transfers between wallets are free, and locking, claiming and withdrawing only cost Ethereum gas.
            </p>
            <p>Anyone can send WRON into the vault with <Code>fund</Code> to boost rewards for savers. Every top-up shows on-chain as a Funded event.</p>
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="launch">The launch</H2>
            <p>
              WRON launches on Ethereum mainnet through Programmable&apos;s Custom Launch, using Programmable&apos;s reviewed protected launch token and Uniswap v4 hook. Programmable
              reviews the launch before it goes live, and one transaction creates the pool, locks the liquidity and makes the first buy.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Trading is open to everyone from the first block, on this site&apos;s Trade page or straight through the pool.</li>
              <li>
                Anti-sniper fee: the buy fee starts at {TOKEN.openingFeePct}% and falls smoothly to the normal fee over the first {TOKEN.openingFeeSeconds} seconds, so bots
                that buy in the first block lose most of what they put in. The extra fee goes to Programmable. The dev wallet skips it but is still under the wallet cap.
              </li>
              <li>
                Wallet cap: for the first {TOKEN.protectionSeconds / 60} minutes, no wallet can buy more than {TOKEN.walletCapPct}% of supply in total. Sells are never capped.
              </li>
              <li>Starting value: the pool opens at a fully diluted value of about ${TOKEN.startFdvUsd.toLocaleString("en-US")}, priced from Chainlink&apos;s ETH/USD at launch.</li>
              <li>Liquidity: the whole supply goes into one position owned by the launch contract, which has no way to remove it. It is locked forever.</li>
              <li>Supply is {TOKEN.supply.toLocaleString("en-US")} tokens, fixed. The creator&apos;s first buy at launch is about ${TOKEN.initialBuyUsd}.</li>
              <li>The vault is deployed after the launch is final, pointing at the launched token. It never touches the pool or the hook.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="contracts">Contracts</H2>
            <p>Addresses are published here when they go live. Until then, treat any address claiming to be Wronskian as fake.</p>
            <Card className="py-0">
              <Table>
                <TableBody>
                  {contracts.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="pl-4 whitespace-normal text-foreground">{c.name}</TableCell>
                      <TableCell className="pr-4 text-right">{c.address ? <CopyAddress address={c.address} full={false} /> : <Badge variant="outline">At launch</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <p>WronskianVault functions:</p>
            <Card className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Function</TableHead>
                    <TableHead className="pr-4">What it does</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FUNCTIONS.map((f) => (
                    <TableRow key={f.fn}>
                      <TableCell className="pl-4 align-top font-mono text-[13px] whitespace-normal break-words text-foreground sm:whitespace-nowrap">{f.fn}</TableCell>
                      <TableCell className="pr-4 whitespace-normal">{f.does}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <p>Each contract&apos;s source is verified on Etherscan once it&apos;s deployed.</p>
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="security">Security</H2>
            <ul className="list-disc space-y-2 pl-5">
              <li>The vault has no owner, no admin keys, no pause and no proxy. Nobody can change its rules after deploy.</li>
              <li>The token address, lock lengths, weights and the {PENALTY.pct}% forfeit are fixed in the contract. There is no treasury.</li>
              <li>Only the wallet that opened a vault can claim, add, extend, withdraw or exit it.</li>
              <li>Every write is protected against reentrancy and uses balance checks on transfers.</li>
              <li>Wronskian will never ask for your seed phrase or private key.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <H2 id="risks">Risks</H2>
            <ul className="list-disc space-y-2 pl-5">
              <li>The vault hasn&apos;t had an independent audit yet. Bugs are possible.</li>
              <li>Locked tokens still move with the market. A lock protects your position from impatience, not from price.</li>
              <li>Rewards depend on other people leaving early or on funding. They aren&apos;t guaranteed.</li>
              <li>Trades are final and tokens can lose all value.</li>
            </ul>
            <p>
              More in the{" "}
              <Link href="/faq" className="text-foreground underline underline-offset-4">
                FAQ
              </Link>
              {SITE.x ? (
                <>
                  , or ask{" "}
                  <a href={SITE.x} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4">
                    {SITE.xHandle ?? "us on X"}
                  </a>
                </>
              ) : null}
              .
            </p>
          </section>
        </article>
      </div>
    </>
  );
}
