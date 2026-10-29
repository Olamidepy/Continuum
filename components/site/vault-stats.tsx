"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LIVE, TOKEN } from "@/lib/data";
import { fmtToken } from "@/lib/web3/format";
import { useVaultStats } from "@/lib/web3/vault";

/** Live pool numbers from the vault contract. Before launch it says when they'll appear. */
export function VaultStats() {
  const s = useVaultStats();
  const items = [
    { label: "Locked now", value: s.locked !== undefined ? `${fmtToken(s.locked, 0)} ${TOKEN.unit}` : undefined },
    { label: "Vaults opened", value: s.vaults !== undefined ? s.vaults.toLocaleString() : undefined },
    { label: "Shared with lockers", value: s.rewardsAdded !== undefined ? `${fmtToken(s.rewardsAdded, 0)} ${TOKEN.unit}` : undefined },
  ];
  return (
    <Card className="py-0">
      <CardContent className="grid divide-y px-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {items.map((i) => (
          <div key={i.label} className="px-6 py-5">
            <div className="text-sm text-muted-foreground">{i.label}</div>
            <div className="num mt-1 font-heading text-2xl font-semibold">
              {LIVE ? i.value ?? <Skeleton className="mt-1 h-7 w-32" /> : <span className="text-muted-foreground">At launch</span>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
