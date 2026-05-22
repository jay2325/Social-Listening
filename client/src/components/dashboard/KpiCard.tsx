import { Card, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { cn } from "../../lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: "indigo" | "emerald" | "red" | "amber";
  isLoading?: boolean;
}

const ACCENT_CLASSES: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  indigo: "border-l-indigo-500",
  emerald: "border-l-emerald-500",
  red:    "border-l-red-500",
  amber:  "border-l-amber-500",
};

export function KpiCard({ label, value, subtext, accent = "indigo", isLoading }: KpiCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("border-l-2", ACCENT_CLASSES[accent])}>
        <CardContent className="pt-5">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-l-2", ACCENT_CLASSES[accent])}>
      <CardContent className="pt-5">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">
          {label}
        </p>
        <p className="text-3xl font-bold text-zinc-100 tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {subtext && (
          <p className="text-xs text-zinc-500 mt-1">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}
