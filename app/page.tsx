import Link from "next/link";
import { ArrowUpRight, FileCode2, Hourglass, KeyRound, Lock, Rocket, ShieldCheck } from "lucide-react";

import { AnimatedHeading } from "@/components/site/animated-heading";
import { ExitSplit } from "@/components/site/exit-split";
import { FaqList } from "@/components/site/faq-list";
import { LockPlanner } from "@/components/site/lock-planner";
import { Photo } from "@/components/site/photo";
import { Reveal } from "@/components/site/reveal";
import { Ticker } from "@/components/site/ticker";
import { VaultStats } from "@/components/site/vault-stats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PENALTY, PHOTOS, SITE, STEPS, TIERS } from "@/lib/data";

const TRUST = [
  { icon: KeyRound, title: "No owner, no admin", body: "Nobody can pause the vault, change its rules or move your tokens. Only your wallet can act on your vault." },
  { icon: Lock, title: "Fixed at deploy", body: "The token, the lock lengths and the 10% exit fee are written into the contract and can't change. There is no treasury cut." },
  { icon: FileCode2, title: "Open source", body: "The contract and its tests are public on GitHub, so anyone can read exactly what it does." },
  { icon: Rocket, title: `Launched on ${SITE.launchpad}`, body: `The token launches through ${SITE.launchpad}'s protected launch on Uniswap v4. The vault is a separate contract.` },
];

const HERO_FACTS = [
  { value: "2.0x", label: "Weight for a 30-day lock" },
  { value: "100%", label: "Of every exit fee goes to holders" },
  { value: "0", label: "Admin keys on the vault" },
];

function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`font-heading text-[clamp(1.75rem,4.2vw,3.25rem)] leading-[1.05] font-bold tracking-[-0.025em] ${className}`}>{children}</h2>;
}

export default function HomePage() {
  const maxWeight = Math.max(...TIERS.map((t) => t.weight));

  return (
    <>
      {/* Hero: full-bleed photo under the floating nav */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {/* Softly blurred; the wrapper bleeds past the edges so the blur never shows a hard border. */}
          <div className="absolute -inset-6 blur-[6px]">
            <Photo photo={PHOTOS.trails} decorative priority className="slow-zoom opacity-70" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-32 pb-20 sm:px-6 sm:pt-40 lg:min-h-[92svh] lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <AnimatedHeading
              as="h1"
              start={120}
              className="max-w-[14ch] font-heading text-[clamp(2.5rem,5vw,4.4rem)] leading-[1.02] font-bold tracking-[-0.03em]"
              lines={[{ text: "Hold longer." }, { text: "Get paid by the ones who don't." }]}
            />
            <p className="fade-up mt-6 max-w-[50ch] text-lg text-foreground/75" style={{ "--d": "700ms" } as React.CSSProperties}>
              Lock your tokens for 3 to 30 days. Every early exit forfeits {PENALTY.pct}%, and it flows straight to the holders who kept their word.
            </p>
            <div className="fade-up mt-8 flex flex-wrap gap-3" style={{ "--d": "820ms" } as React.CSSProperties}>
              <Button asChild size="lg" className="rounded-full">
                <Link href="/vaults">Open a vault</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full bg-background/50 backdrop-blur">
                <Link href="/docs">How it works</Link>
              </Button>
            </div>
            <dl className="fade-up mt-10 grid max-w-xl grid-cols-3 gap-2 sm:gap-3" style={{ "--d": "950ms" } as React.CSSProperties}>
              {HERO_FACTS.map((f) => (
                <div key={f.label} className="rounded-xl border bg-card/70 p-3 backdrop-blur sm:p-4">
                  <dt className="sr-only">{f.label}</dt>
                  <dd className="num font-heading text-2xl font-bold sm:text-3xl">{f.value}</dd>
                  <dd className="mt-1 text-xs leading-snug text-muted-foreground">{f.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="fade-up" style={{ "--d": "400ms" } as React.CSSProperties}>
            <LockPlanner />
          </div>
        </div>
      </section>

      <Ticker />

      {/* Statement */}
      <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32">
        <Reveal className="grid gap-8 lg:grid-cols-[200px_1fr]">
          <Badge variant="outline" className="h-fit gap-1.5">
            <Hourglass className="size-3" aria-hidden="true" />
            Why Continuum
          </Badge>
          <p className="font-heading text-[clamp(1.4rem,3.4vw,2.75rem)] leading-[1.18] font-semibold tracking-[-0.02em]">
            Most launches reward whoever sells first. Continuum turns that around.{" "}
            <span className="text-muted-foreground">Every early exit pays the people still holding, so the longer you stay, the more you earn.</span>
          </p>
        </Reveal>
      </section>

      {/* Bento */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pt-16 sm:px-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <Card className="relative isolate h-full min-h-[360px] justify-end sm:min-h-[440px] overflow-hidden p-0">
            <div className="absolute inset-0 -z-10">
              <Photo photo={PHOTOS.hourglassRed} sizes="(min-width: 1024px) 680px, 100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>
            <div className="p-6 sm:p-8">
              <Badge className="mb-4">Time is the strategy</Badge>
              <h3 className="max-w-[18ch] font-heading text-3xl leading-tight font-bold tracking-tight text-white sm:text-4xl">Your lock is a promise the contract keeps for you.</h3>
              <Button asChild variant="secondary" className="mt-6 rounded-full">
                <Link href="/vaults">
                  Plan your lock
                  <ArrowUpRight />
                </Link>
              </Button>
            </div>
          </Card>
        </Reveal>

        <div className="grid gap-4 lg:col-span-5">
          <Reveal delay={80}>
            <Card>
              <CardHeader>
                <CardDescription>Share weight by lock length</CardDescription>
                <CardTitle className="num font-heading text-5xl font-bold tracking-tight sm:text-6xl">2.0x</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-28 items-end gap-3" role="img" aria-label="Weights: 1.0x, 1.2x, 1.5x and 2.0x">
                  {TIERS.map((t) => (
                    <div key={t.id} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <div className={t.id === 3 ? "w-full rounded-md bg-primary" : "w-full rounded-md bg-secondary"} style={{ height: `${(t.weight / maxWeight) * 80}%` }} />
                      <span className="text-xs text-muted-foreground">{t.days}d</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Reveal>
          <Reveal delay={160}>
            <Card>
              <CardHeader>
                <CardDescription>Early-exit fee</CardDescription>
                <CardTitle className="num font-heading text-5xl font-bold tracking-tight sm:text-6xl">{PENALTY.pct}%</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="h-2.5 rounded-full bg-primary" />
                <div className="text-xs text-muted-foreground">All of it goes to the holders still locked. No treasury, no team cut.</div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
        <Reveal>
          <SectionTitle className="max-w-[22ch]">Three steps, one rule: finishing is free.</SectionTitle>
        </Reveal>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 90}>
              <Card className="h-full">
                <CardHeader>
                  <span className="num font-heading text-5xl font-bold text-primary">0{i + 1}</span>
                  <CardTitle className="pt-4 font-heading text-xl">{s.title}</CardTitle>
                  <CardDescription className="text-[15px] leading-relaxed">{s.body}</CardDescription>
                </CardHeader>
              </Card>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Early exit split, with photo */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pt-20 sm:px-6 sm:pt-28 lg:grid-cols-2">
        <Reveal className="flex flex-col justify-between gap-8">
          <div>
            <SectionTitle>Where an early exit goes</SectionTitle>
            <p className="mt-4 max-w-[46ch] text-muted-foreground">
              The {PENALTY.pct}% forfeit is shared on the spot with every open vault, weighted by shares. All of it goes to holders; there is no treasury
              cut. Nobody chooses who gets paid; the contract does it the moment someone leaves.
            </p>
          </div>
          <Card>
            <CardContent>
              <ExitSplit />
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={100}>
          <Card className="relative isolate h-full min-h-[380px] overflow-hidden p-0">
            <Photo photo={PHOTOS.stars} sizes="(min-width: 1024px) 560px, 100vw" className="absolute inset-0 -z-10 grayscale" />
            {/* Tints the blue star trails into the site's red. */}
            <div className="absolute inset-0 -z-10 bg-primary mix-blend-multiply" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />
            <div className="mt-auto p-6 sm:p-8">
              <p className="max-w-[22ch] font-heading text-2xl leading-snug font-semibold text-white">Rewards arrive in real time, one exit at a time, for as long as you stay.</p>
            </div>
          </Card>
        </Reveal>
      </section>

      {/* Live numbers */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
        <Reveal className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <SectionTitle>The vault, live</SectionTitle>
          <p className="max-w-[40ch] text-muted-foreground">Read straight from Ethereum. These fill in the moment the vault is deployed.</p>
        </Reveal>
        <Reveal>
          <VaultStats />
        </Reveal>
      </section>

      {/* Lock lengths */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
        <Reveal className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <SectionTitle>Pick your length</SectionTitle>
          <p className="max-w-[44ch] text-muted-foreground">Your shares are the amount you lock times its weight. More shares, bigger cut of every exit fee.</p>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {TIERS.map((t, i) => (
            <Reveal key={t.id} delay={i * 80}>
              <Card className={t.id === 3 ? "h-full border-primary/50" : "h-full"}>
                <CardHeader>
                  <CardDescription>{t.label}</CardDescription>
                  <CardTitle className="num font-heading text-4xl font-bold">{t.weight.toFixed(1)}x</CardTitle>
                </CardHeader>
                <CardContent className="mt-auto text-sm text-muted-foreground">
                  <span className="num text-foreground">{(1000 * t.weight).toLocaleString()}</span> shares per 1,000 locked
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pt-20 sm:px-6 sm:pt-28 lg:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <Card className="relative isolate h-full min-h-[320px] justify-end sm:min-h-[420px] overflow-hidden p-0">
            <Photo photo={PHOTOS.hourglass} sizes="(min-width: 1024px) 460px, 100vw" className="absolute inset-0 -z-10" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div className="p-6 sm:p-8">
              <SectionTitle className="text-white">Nobody holds the keys but you</SectionTitle>
            </div>
          </Card>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2">
          {TRUST.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 70}>
              <Card className="h-full">
                <CardHeader>
                  <span className="grid size-10 place-items-center rounded-lg bg-secondary">
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                  </span>
                  <CardTitle className="pt-3 font-heading text-lg">{title}</CardTitle>
                  <CardDescription className="text-[15px] leading-relaxed">{body}</CardDescription>
                </CardHeader>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="pt-20 sm:pt-28">
        <Ticker slow />
      </div>

      {/* FAQ preview */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pt-20 sm:px-6 sm:pt-28 lg:grid-cols-[1fr_1.5fr]">
        <Reveal>
          <SectionTitle>Questions, answered</SectionTitle>
          <p className="mt-4 max-w-[36ch] text-muted-foreground">The short version. The Docs page has the full detail, contract functions included.</p>
          <div className="mt-6 flex gap-3">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/faq">All questions</Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-full">
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <FaqList limit={5} />
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
        <Reveal>
          <Card className="relative isolate items-start gap-6 overflow-hidden p-8 sm:p-14">
            <Photo photo={PHOTOS.curves} decorative sizes="(min-width: 1152px) 1152px, 100vw" className="absolute inset-0 -z-10 opacity-60" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/70 to-transparent" />
            <ShieldCheck className="size-7 text-primary" aria-hidden="true" />
            <SectionTitle className="max-w-[16ch] text-white">Patience should pay. Here, it does.</SectionTitle>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link href="/vaults">Open a vault</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full bg-background/50 backdrop-blur">
                <Link href="/trade">Get the token</Link>
              </Button>
            </div>
          </Card>
        </Reveal>
      </section>
    </>
  );
}
