import { Asterisk } from "lucide-react";

import { TICKER } from "@/lib/data";
import { cn } from "@/lib/utils";

/** A sideways-scrolling banner of the vault's rules. Pauses on hover; stops for reduced motion. */
export function Ticker({ className, slow = false }: { className?: string; slow?: boolean }) {
  const items = [...TICKER, ...TICKER];
  return (
    <div className={cn("mask-fade-x relative overflow-hidden border-y bg-card/60 py-4", className)} aria-label="Wronskian at a glance">
      <ul className={cn("flex w-max items-center gap-8 pr-8 hover:[animation-play-state:paused]", slow ? "animate-marquee-slow" : "animate-marquee")}>
        {items.map((t, i) => (
          <li key={i} className="flex items-center gap-8 font-heading text-lg font-semibold tracking-tight whitespace-nowrap sm:text-xl" aria-hidden={i >= TICKER.length}>
            {t}
            <Asterisk className="size-4 text-primary" aria-hidden="true" />
          </li>
        ))}
      </ul>
    </div>
  );
}
