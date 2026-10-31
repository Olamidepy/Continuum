import { PENALTY, TOKEN } from "@/lib/data";

/** Where 1,000 tokens go when a vault is broken early. Widths are to scale. */
export function ExitSplit() {
  const total = 1000;
  const fee = (total * PENALTY.pct) / 100;
  const lockers = fee;
  const back = total - fee;
  const rows = [
    { label: "Back to the saver who left", value: back, className: "bg-muted-foreground/40" },
    { label: "Shared with everyone still locked", value: lockers, className: "bg-primary" },
  ];
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full" role="img" aria-label={`Of ${total} tokens: ${back} returned, ${lockers} to holders still locked`}>
        {rows.map((r) => (
          <div key={r.label} className={r.className} style={{ width: `${(r.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-3">
            <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${r.className}`} aria-hidden="true" />
            <span>
              <span className="num block font-heading text-2xl font-semibold">{r.value.toLocaleString()}</span>
              <span className="text-muted-foreground">{r.label}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">Example: someone breaks a 1,000 {TOKEN.unit} lock early. Any rewards they already earned are still paid to them.</p>
    </div>
  );
}
