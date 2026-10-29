import * as React from "react";

import { cn } from "@/lib/utils";

type Line = { text: string; className?: string; highlight?: string; highlightClassName?: string };

/**
 * A heading whose words rise out of a blur one after another.
 * Pure CSS, so it runs on first paint without waiting for JavaScript.
 */
export function AnimatedHeading({
  lines,
  as: Tag = "h1",
  className,
  start = 0,
  step = 70,
}: {
  lines: Line[];
  as?: "h1" | "h2" | "h3";
  className?: string;
  start?: number;
  step?: number;
}) {
  let i = 0;
  return (
    <Tag className={className}>
      {lines.map((line, li) => (
        <span key={li} className={cn("block", line.className)}>
          {line.text.split(" ").map((word, wi, arr) => {
            const d = start + i++ * step;
            return (
              <React.Fragment key={wi}>
                <span className={cn("word", line.highlight === word && line.highlightClassName)} style={{ "--d": `${d}ms` } as React.CSSProperties}>
                  {word}
                </span>
                {wi < arr.length - 1 ? " " : null}
              </React.Fragment>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}
