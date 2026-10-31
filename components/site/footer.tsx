import Link from "next/link";

import { Wordmark } from "@/components/site/logo";
import { XIcon } from "@/components/site/x-icon";
import { Separator } from "@/components/ui/separator";
import { NAV, PHOTOS, SITE } from "@/lib/data";

export function Footer() {
  return (
    <footer className="mt-24 border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex" aria-label="Continuum home">
            <Wordmark className="h-6" />
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">{SITE.tagline}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-foreground">
              {n.label}
            </Link>
          ))}
          <a href={SITE.launchpadUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            {SITE.launchpad}
          </a>
        </div>
      </div>
      <Separator />
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="grid max-w-2xl gap-2">
        <p>
          Tokens can lose all value. Locked tokens can only leave early with the 10% exit fee. The vault code is public but has not been audited. Nothing here is financial advice.
        </p>
        <p>
          Photos from Unsplash by{" "}
          {Object.values(PHOTOS).map((p, i, arr) => (
            <span key={p.by}>
              <a href={p.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                {p.by}
              </a>
              {i < arr.length - 2 ? ", " : i === arr.length - 2 ? " and " : "."}
            </span>
          ))}
        </p>
        </div>
        <div className="flex items-center gap-3">
          {SITE.x ? (
            <a href={SITE.x} target="_blank" rel="noopener noreferrer" aria-label="Continuum on X" className="hover:text-foreground">
              <XIcon className="size-4" />
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
