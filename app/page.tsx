import Link from "next/link";
import { BookOpen, FileCode2, KeyRound, Lock, Rocket, ShieldCheck } from "lucide-react";

import { ExitSplit } from "@/components/site/exit-split";
import { LockPlanner } from "@/components/site/lock-planner";
import { VaultStats } from "@/components/site/vault-stats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LIVE, PENALTY, SITE, STEPS, TIERS } from "@/lib/data";

const TRUST = [
  { icon: KeyRound, title: "No owner, no admin", body: "Nobody can pause the vault, change its rules or move your tokens. Only your wallet can act on your vault." },
  { icon: Lock, title: "Fixed at deploy", body: "The token, the treasury, the lock lengths and the 10% exit fee are written into the contract and can't change." },
  { icon: FileCode2, title: "Open source", body: "The contract and its tests are public on GitHub, so anyone can read exactly what it does." },
  { icon: Rocket, title: `Launched on ${SITE.launchpad}`, body: `The token launches through ${SITE.launchpad}'s protected launch on Uniswap v4. The vault is a separate contract.` },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <Badge variant="outline" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            {LIVE ? "Live on Ethereum" : `Launching on ${SITE.launchpad}`}
          </Badge>
          <h1 className="mt-6 max-w-[14ch] font-heading text-[clamp(2.4rem,4.6vw,4.1rem)] leading-[1.02] font-bold tracking-[-0.03em]">
            Hold longer. Get paid by the ones who don&apos;t.
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg text-muted-foreground">
            Lock your tokens for 30 to 365 days. If someone breaks their lock early, they pay {PENALTY.pct}%, and most of it is shared with everyone who stayed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/vaults">
                <Lock />
                Open a vault
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/docs">
                <BookOpen />
                How it works
              </Link>
            </Button>
          </div>
        </div>
        <LockPlanner />
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <VaultStats />
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <h2 className="max-w-[24ch] font-heading text-[clamp(1.75rem,4vw,2.75rem)] leading-tight font-bold tracking-tight">Three steps, one rule: finishing is free.</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full">
                <CardHeader>
                  <span className="num grid size-8 place-items-center rounded-md bg-secondary font-heading text-sm font-bold text-primary">{i + 1}</span>
                  <CardTitle className="pt-3 font-heading text-lg">{s.title}</CardTitle>
                  <CardDescription className="text-[15px] leading-relaxed">{s.body}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pt-24 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="font-heading text-[clamp(1.75rem,4vw,2.75rem)] leading-tight font-bold tracking-tight">Where an early exit goes</h2>
          <p className="mt-4 max-w-[46ch] text-muted-foreground">
            The {PENALTY.pct}% fee is split on the spot. {PENALTY.toLockers}% joins the reward pool for every open vault, weighted by shares. {PENALTY.toTreasury}% goes to the treasury.
          </p>
        </div>
        <Card>
          <CardContent>
            <ExitSplit />
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <h2 className="font-heading text-[clamp(1.75rem,4vw,2.75rem)] leading-tight font-bold tracking-tight">Lock lengths</h2>
          <p className="max-w-[44ch] text-muted-foreground">Your shares are the amount you lock times its weight. More shares, bigger cut of every exit fee.</p>
        </div>
        <Card className="mt-8 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Length</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead className="pr-6 text-right">Shares per 1,000 locked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TIERS.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="pl-6 font-medium">{t.label}</TableCell>
                  <TableCell className="num">{t.weight.toFixed(1)}x</TableCell>
                  <TableCell className="num pr-6 text-right">{(1000 * t.weight).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <h2 className="font-heading text-[clamp(1.75rem,4vw,2.75rem)] leading-tight font-bold tracking-tight">Nobody holds the keys but you</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {TRUST.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <CardTitle className="pt-2 font-heading">{title}</CardTitle>
                <CardDescription className="text-[15px] leading-relaxed">{body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <Card className="items-start gap-6 p-8 sm:p-12">
          <ShieldCheck className="size-6 text-primary" aria-hidden="true" />
          <h2 className="max-w-[20ch] font-heading text-[clamp(1.75rem,4vw,2.75rem)] leading-tight font-bold tracking-tight">Patience should pay. Here, it does.</h2>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/vaults">Open a vault</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/trade">Get the token</Link>
            </Button>
          </div>
        </Card>
      </section>
    </>
  );
}
