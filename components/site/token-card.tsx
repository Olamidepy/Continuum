import { ArrowUpRight } from "lucide-react";

import { CopyAddress } from "@/components/site/copy-address";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TOKEN, VAULT } from "@/lib/data";

/** Official addresses. Each one stays "At launch" until it is set, so nothing fake can be copied early. */
export function TokenCard() {
  const rows = [
    { label: "Token", value: TOKEN.address },
    { label: "Pool hook", value: TOKEN.hook },
    { label: "Fee vault", value: TOKEN.feeVault },
    { label: "Vault", value: VAULT.address },
  ];
  const links = [
    { label: "Etherscan", href: TOKEN.etherscan },
    { label: "DEX Screener", href: TOKEN.dexscreener },
  ].filter((l): l is { label: string; href: string } => Boolean(l.href));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Official contracts</CardTitle>
        <CardDescription>Check every address here before you trade or lock. Any other address is not Wronskian.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid gap-3">
          {rows.map((r) => (
            <div key={r.label} className="grid gap-1">
              <dt className="text-sm text-muted-foreground">{r.label}</dt>
              <dd>{r.value ? <CopyAddress address={r.value} /> : <Badge variant="outline">At launch</Badge>}</dd>
            </div>
          ))}
        </dl>
        {links.length ? (
          <div className="flex flex-wrap gap-2">
            {links.map((l) => (
              <Button key={l.label} asChild variant="outline" size="sm">
                <a href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.label}
                  <ArrowUpRight />
                </a>
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
