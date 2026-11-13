import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-start gap-6 px-4 pt-48 pb-28 sm:px-6">
      <h1 className="font-heading text-5xl font-bold tracking-tight">This page doesn&apos;t exist.</h1>
      <p className="text-muted-foreground">The link may be old or mistyped.</p>
      <Button asChild>
        <Link href="/">Back to Wronskian</Link>
      </Button>
    </section>
  );
}
