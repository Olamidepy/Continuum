"use client";

import * as React from "react";
import { Megaphone, X } from "lucide-react";

import { CopyAddress } from "@/components/site/copy-address";
import { SITE, TOKEN } from "@/lib/data";

/**
 * Thin banner above the nav. Before launch it never shows a ticker or an address:
 * it only says where the official contract will be posted. After launch (token address set)
 * it shows the official contract with a copy button.
 */
export function AnnouncementBar() {
  const [open, setOpen] = React.useState(true);
  if (!open) return null;
  const live = Boolean(TOKEN.address);

  return (
    <div className="pointer-events-auto relative border-b border-primary/20 bg-black/95 text-[13px] backdrop-blur">
      <div className="mx-auto flex min-h-10 max-w-6xl flex-wrap items-center justify-center gap-x-2.5 gap-y-1 py-2 pr-10 pl-4 text-center sm:pl-10">
        <Megaphone className="hidden size-3.5 shrink-0 text-primary sm:block" aria-hidden="true" />
        {live ? (
          <>
            <p className="leading-snug text-foreground/90">
              <span className="font-semibold text-primary">{SITE.name} ({SITE.ticker})</span> is live on {SITE.venue}. Official contract:
            </p>
            <CopyAddress address={TOKEN.address!} full={false} className="text-foreground" />
          </>
        ) : (
          <p className="leading-snug text-foreground/90">
            <span className="font-semibold text-primary">{SITE.name}</span>
            <span className="hidden sm:inline"> launches soon on {SITE.venue}. The official contract will only be posted on </span>
            <span className="sm:hidden"> contract will only be posted on </span>
            <a href={SITE.x} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline decoration-white/30 underline-offset-4 hover:decoration-primary">
              {SITE.xHandle}
            </a>
            <span className="hidden sm:inline">. Ignore any other address.</span>
          </p>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-1/2 right-3 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-white/8 hover:text-foreground"
          aria-label="Dismiss announcement"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
