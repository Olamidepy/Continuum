/** Left-aligned page opener used by inner pages. */
export function PageHeader({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <header className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20">
      <h1 className="font-heading text-[clamp(2.25rem,6vw,4rem)] leading-[1.02] font-bold tracking-[-0.03em]">{title}</h1>
      {body ? <p className="mt-4 max-w-[60ch] text-lg text-muted-foreground">{body}</p> : null}
      {children}
    </header>
  );
}
