"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

/** The contract address with a copy button. Shows the full address so people can check it. */
export function CopyAddress({ address, className, full = true }: { address: string; className?: string; full?: boolean }) {
  const [done, setDone] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {}
      }}
      className={cn("inline-flex max-w-full items-center gap-1.5 font-mono text-xs break-all text-left hover:text-primary", className)}
      aria-label="Copy contract address"
    >
      <span>{full ? address : `${address.slice(0, 6)}…${address.slice(-4)}`}</span>
      {done ? <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" /> : <Copy className="size-3.5 shrink-0" aria-hidden="true" />}
    </button>
  );
}
