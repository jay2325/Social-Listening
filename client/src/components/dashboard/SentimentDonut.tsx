import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { TrendBucket } from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

interface SentimentDonutProps {
  data: TrendBucket[];
  isLoading?: boolean;
}

const SENTIMENT_COLORS = {
  Positive: "#22c55e",
  Neutral:  "#f59e0b",
  Negative: "#ef4444",
};

export function SentimentDonut({ data, isLoading }: SentimentDonutProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sentiment breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full rounded-full mx-auto" style={{ maxWidth: 200 }} />
        </CardContent>
      </Card>
    );
  }

  const totals = data.reduce(
    (acc, b) => {
      acc.positive += b.positive_count;
      acc.neutral  += b.neutral_count;
      acc.negative += b.negative_count;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 }
  );

  const total = totals.positive + totals.neutral + totals.negative;

  const chartData = [
    { name: "Positive", value: totals.positive },
    { name: "Neutral",  value: totals.neutral  },
    { name: "Negative", value: totals.negative },
  ].filter((d) => d.value > 0);

  const pct = (n: number) =>
    total > 0 ? `${Math.round((n / total) * 100)}%` : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Sentiment breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-zinc-600 text-sm">
            No sentiment data yet.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={SENTIMENT_COLORS[entry.name as keyof typeof SENTIMENT_COLORS]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#e4e4e7",
                  }}
                  formatter={(val: number, name: string) => [
                    `${val.toLocaleString()} (${pct(val)})`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex justify-center gap-5 mt-1">
              {[
                { label: "Pos",  value: pct(totals.positive), color: SENTIMENT_COLORS.Positive },
                { label: "Neu",  value: pct(totals.neutral),  color: SENTIMENT_COLORS.Neutral  },
                { label: "Neg",  value: pct(totals.negative), color: SENTIMENT_COLORS.Negative },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-zinc-400">{label}</span>
                  <span className="text-zinc-200 font-medium tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
