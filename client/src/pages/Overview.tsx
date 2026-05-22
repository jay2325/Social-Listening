import { useBrandContext } from "../contexts/BrandContext";
import { useTrendBuckets } from "../hooks/useTrends";
import { useMentions } from "../hooks/useMentions";
import { KpiCard } from "../components/dashboard/KpiCard";
import { VolumeChart } from "../components/dashboard/VolumeChart";
import { SentimentDonut } from "../components/dashboard/SentimentDonut";
import { TopMentionsFeed } from "../components/dashboard/TopMentionsFeed";

export function Overview() {
  const { brandId, brand } = useBrandContext();
  const { data: buckets = [], isLoading: bucketsLoading } = useTrendBuckets(brandId, 168);
  const { data: mentions = [], isLoading: mentionsLoading } = useMentions({
    brand_id: brandId,
    limit: 100,
  });

  // ── KPI derivations ──────────────────────────────────────────────────────
  const totalMentions = buckets.reduce((s, b) => s + b.mention_count, 0);
  const totalPositive = buckets.reduce((s, b) => s + b.positive_count, 0);
  const totalNegative = buckets.reduce((s, b) => s + b.negative_count, 0);

  const positiveRate =
    totalMentions > 0 ? Math.round((totalPositive / totalMentions) * 100) : 0;
  const negativeRate =
    totalMentions > 0 ? Math.round((totalNegative / totalMentions) * 100) : 0;

  // Today's mentions — buckets where bucket_hour is today
  const today = new Date().toDateString();
  const todayCount = buckets
    .filter((b) => new Date(b.bucket_hour).toDateString() === today)
    .reduce((s, b) => s + b.mention_count, 0);

  if (!brandId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <p className="text-zinc-400 text-sm">Select a brand from the header to get started.</p>
          <p className="text-zinc-600 text-xs">No brands yet? Create one via POST /brands.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">
          {brand?.name ?? "Overview"}
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">Last 7 days · Twitter</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total mentions"
          value={totalMentions}
          subtext="last 7 days"
          accent="indigo"
          isLoading={bucketsLoading}
        />
        <KpiCard
          label="Positive rate"
          value={`${positiveRate}%`}
          subtext={`${totalPositive.toLocaleString()} positive`}
          accent="emerald"
          isLoading={bucketsLoading}
        />
        <KpiCard
          label="Negative rate"
          value={`${negativeRate}%`}
          subtext={`${totalNegative.toLocaleString()} negative`}
          accent="red"
          isLoading={bucketsLoading}
        />
        <KpiCard
          label="Today"
          value={todayCount}
          subtext="mentions today"
          accent="amber"
          isLoading={bucketsLoading}
        />
      </div>

      {/* Volume chart — full width */}
      <VolumeChart data={buckets} isLoading={bucketsLoading} />

      {/* Bottom row: donut + top mentions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SentimentDonut data={buckets} isLoading={bucketsLoading} />
        <TopMentionsFeed mentions={mentions} isLoading={mentionsLoading} />
      </div>
    </div>
  );
}
