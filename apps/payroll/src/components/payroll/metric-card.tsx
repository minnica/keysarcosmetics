import { Card, CardContent } from "@cosmetics/ui";

interface MetricCardProps {
  label: string;
  value: string;
  tone?: "gold" | "sage" | "rose" | "blue";
}

export function MetricCard({ label, value, tone = "gold" }: MetricCardProps) {
  return (
    <Card data-tone={tone}>
      <CardContent className="p-5">
        <p className="text-sm font-bold uppercase tracking-widest text-[color:var(--text-muted)]">
          {label}
        </p>
        <p className="number-display mt-2 text-2xl text-[color:var(--text-primary)]">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
