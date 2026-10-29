"use client";

import * as React from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FAQ, FAQ_GROUPS } from "@/lib/data";

const GROUPS = FAQ_GROUPS;

export function FaqList({ limit, grouped = false }: { limit?: number; grouped?: boolean }) {
  const [group, setGroup] = React.useState<(typeof GROUPS)[number]>("All");
  const items = FAQ.filter((f) => group === "All" || f.group === group).slice(0, limit);
  return (
    <div>
      {grouped ? (
        <Tabs value={group} onValueChange={(v) => setGroup(v as (typeof GROUPS)[number])} className="mb-6">
          <TabsList className="h-auto max-w-full flex-wrap justify-start">
            {GROUPS.map((g) => (
              <TabsTrigger key={g} value={g} className="h-8">
                {g}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}
      <Accordion type="single" collapsible defaultValue="item-0">
        {items.map((f, i) => (
          <AccordionItem key={f.q} value={`item-${i}`}>
            <AccordionTrigger className="text-base">{f.q}</AccordionTrigger>
            <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
