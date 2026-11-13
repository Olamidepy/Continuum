"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { AnnouncementBar } from "@/components/site/announcement-bar";
import { ConnectWallet } from "@/components/site/connect-wallet";
import { Wordmark } from "@/components/site/logo";
import { XIcon } from "@/components/site/x-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NAV, SITE } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Floating pill nav. Sits over the page and tightens once you scroll. */
export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <AnnouncementBar />
      <div className="px-3 pt-3 sm:px-4 sm:pt-4">
      <nav
        aria-label="Main"
        className={cn(
          "pointer-events-auto mx-auto flex items-center justify-between gap-3 rounded-full border py-2 pr-2 pl-4 backdrop-blur-xl transition-[max-width,background-color,border-color] duration-500",
          scrolled ? "max-w-4xl border-white/12 bg-background/85" : "max-w-6xl bg-background/45",
        )}
      >
        <Link href="/" className="flex items-center py-1" aria-label="Wronskian home">
          <Wordmark className="h-[18px] sm:h-5" />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm transition-colors",
                  pathname.startsWith(item.href) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">
          {SITE.x ? (
            <Button asChild variant="ghost" size="icon" className="hidden rounded-full sm:inline-flex">
              <a href={SITE.x} target="_blank" rel="noopener noreferrer" aria-label="Wronskian on X">
                <XIcon />
              </a>
            </Button>
          ) : null}
          <ConnectWallet className="hidden rounded-full sm:inline-flex" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full md:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </DialogTrigger>
            <DialogContent className="top-4 translate-y-0 sm:max-w-sm">
              <DialogTitle>
                <Wordmark className="h-[18px]" />
              </DialogTitle>
              <ul className="grid gap-1">
                {[{ href: "/", label: "Home" }, ...NAV].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn("block rounded-md px-3 py-2.5 text-base", pathname === item.href ? "bg-accent" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <ConnectWallet size="default" className="w-full" />
            </DialogContent>
          </Dialog>
        </div>
      </nav>
      </div>
    </div>
  );
}
