"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { ConnectWallet } from "@/components/site/connect-wallet";
import { LogoMark } from "@/components/site/logo";
import { XIcon } from "@/components/site/x-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NAV, SITE } from "@/lib/data";
import { cn } from "@/lib/utils";

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-heading text-lg font-bold tracking-tight">
          <LogoMark className="w-[22px]" />
          Continuum
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <li key={item.href}>
              <Button asChild variant="ghost" size="sm" className={cn(pathname.startsWith(item.href) ? "bg-accent text-foreground" : "text-muted-foreground")}>
                <Link href={item.href}>{item.label}</Link>
              </Button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {SITE.x ? (
            <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
              <a href={SITE.x} target="_blank" rel="noopener noreferrer" aria-label="Continuum on X">
                <XIcon />
              </a>
            </Button>
          ) : null}
          <ConnectWallet className="hidden sm:inline-flex" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </DialogTrigger>
            <DialogContent className="top-4 translate-y-0 sm:max-w-sm">
              <DialogTitle className="flex items-center gap-2 font-heading">
                <LogoMark className="w-5" /> Continuum
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
    </header>
  );
}
