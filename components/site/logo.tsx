import { cn } from "@/lib/utils";

/** The Continuum mark: three blocks forming a C. Top and bottom carry the "now" and "unlock" colours. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 228 235" aria-hidden="true" className={cn("h-auto w-6", className)}>
      <path d="M0 70 71 0v157L0 228Z" className="fill-primary" />
      <path d="M71 0h157v78h-79Z" className="fill-primary/70" />
      <path d="M71 157h157l-79 78H71Z" className="fill-dawn" />
    </svg>
  );
}
