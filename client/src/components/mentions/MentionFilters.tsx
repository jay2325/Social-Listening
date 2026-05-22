import type { SentimentLabel } from "../../types";
import { cn } from "../../lib/utils";

interface MentionFiltersProps {
  activeLabel: SentimentLabel | undefined;
  onLabelChange: (label: SentimentLabel | undefined) => void;
  total: number;
}

const LABELS: Array<{ value: SentimentLabel | undefined; display: string }> = [
  { value: undefined,    display: "All" },
  { value: "positive",  display: "Positive" },
  { value: "neutral",   display: "Neutral" },
  { value: "negative",  display: "Negative" },
];

const LABEL_COLORS: Partial<Record<SentimentLabel, string>> = {
  positive: "text-emerald-400",
  neutral:  "text-amber-400",
  negative: "text-red-400",
};

export function MentionFilters({ activeLabel, onLabelChange, total }: MentionFiltersProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-1">
        {LABELS.map(({ value, display }) => {
          const isActive = activeLabel === value;
          return (
            <button
              key={display}
              onClick={() => onLabelChange(value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                isActive
                  ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50",
                !isActive && value && LABEL_COLORS[value]
              )}
            >
              {display}
            </button>
          );
        })}
      </div>
      <span className="text-xs text-zinc-600">
        {total.toLocaleString()} mention{total !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
