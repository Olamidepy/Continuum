/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/** The Wronskian mark on its own (the W). Use where there's no room for the name. */
export function LogoMark({ className }: { className?: string }) {
  return <img src="/logo-mark.png" alt="" aria-hidden="true" width={256} height={256} className={cn("h-auto w-6", className)} />;
}

/** The full Wronskian wordmark. Sized by height. */
export function Wordmark({ className }: { className?: string }) {
  return <img src="/logo-wordmark.png" alt="Wronskian" width={565} height={120} className={cn("h-5 w-auto", className)} />;
}
