/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/** The Continuum mark on its own (the striped C). Use where there's no room for the name. */
export function LogoMark({ className }: { className?: string }) {
  return <img src="/logo-mark.png" alt="" aria-hidden="true" width={298} height={256} className={cn("h-auto w-6", className)} />;
}

/** The full Continuum wordmark: the striped C followed by "ontinuum". Sized by height. */
export function Wordmark({ className }: { className?: string }) {
  return <img src="/logo-wordmark.png" alt="Continuum" width={828} height={120} className={cn("h-5 w-auto", className)} />;
}
