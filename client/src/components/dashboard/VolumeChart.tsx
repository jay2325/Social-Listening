import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TrendBucket } from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

interface VolumeChartProps {
  data: TrendBucket[];
  isLoading?: boolean;
}

function formatTick(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTooltipLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Sample ticks to show ~1 per day from hourly buckets
function buildTicks(data: TrendBucket[]): string[] {
  const seen = new Set<string>();
  return data
    .filter((b) => {
      const day = new Date(b.bucket_hour).toDateString();
      if (seen.has(day)) return false;
      seen.add(day);
      return true;
    })
    .map((b) => b.bucket_hour);
}

export function VolumeChart({ data, isLoading }: VolumeChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Mention Volume — 7 days</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[220px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const ticks = buildTicks(data);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Mention Volume — 7 days</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {data.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-zinc-600 text-sm">
            No data yet — mentions will appear here as they stream in.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="bucket_hour"
                ticks={ticks}
                tickFormatter={formatTick}
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#e4e4e7",
                }}
                labelFormatter={formatTooltipLabel}
                formatter={(val: number) => [val.toLocaleString(), "mentions"]}
              />
              <Line
                type="monotone"
                dataKey="mention_count"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#6366f1" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
