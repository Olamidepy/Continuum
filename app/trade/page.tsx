import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { PageHeader } from "@/components/site/page-header";
import { Swap } from "@/components/site/swap";
import { TokenCard } from "@/components/site/token-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE, TOKEN } from "@/lib/data";

export const metadata: Metadata = { title: "Trade" };

export default function TradePage() {
  return (
    <>
      <PageHeader title="Trade" body="Get the token from the official pool, then lock it in a vault to start earning from early exits." />
      <section className="mx-auto grid max-w-6xl items-start gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_420px]">
        <div className="lg:order-2">
          <Swap />
        </div>
        <div className="grid gap-6 lg:order-1">
          <Alert>
            <CircleAlert />
            <AlertTitle>Only trade through the official pool</AlertTitle>
            <AlertDescription>
              The official addresses are on this page and posted by {SITE.xHandle ?? "our X account"}. {TOKEN.protectionSeconds > 0
                ? `For the first ${Math.round(TOKEN.protectionSeconds / 60)} minutes after launch, only ${SITE.launchpad} can route buys. `
                : null}
              An anti-sniper fee starts at {TOKEN.openingFeePct}% at launch and falls to normal over {TOKEN.openingFeeSeconds / 60} minutes. Wait it out. Trades are final and tokens can lose all value.
            </AlertDescription>
          </Alert>
          <TokenCard />
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">After you buy</CardTitle>
              <CardDescription>Tokens in your wallet don&apos;t earn anything. Lock them to get a share of every early-exit fee.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary">
                <Link href="/vaults">Open a vault</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
