import { useState } from "react";
import { useBrandContext } from "../contexts/BrandContext";
import { useMentions } from "../hooks/useMentions";
import { MentionFilters } from "../components/mentions/MentionFilters";
import { TweetCard } from "../components/mentions/TweetCard";
import { Skeleton } from "../components/ui/skeleton";
import { Card, CardContent } from "../components/ui/card";
import type { SentimentLabel } from "../types";

export function MentionsFeed() {
  const { brandId, brand } = useBrandContext();
  const [activeLabel, setActiveLabel] = useState<SentimentLabel | undefined>(undefined);

  const { data: mentions = [], isLoading } = useMentions({
    brand_id: brandId,
    limit: 50,
    label: activeLabel,
  });

  if (!brandId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-400 text-sm">Select a brand to view its mentions.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">
          Mentions · {brand?.name ?? ""}
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">Latest 50 · Twitter</p>
      </div>

      {/* Filters */}
      <MentionFilters
        activeLabel={activeLabel}
        onLabelChange={setActiveLabel}
        total={mentions.length}
      />

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex gap-2">
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-28 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : mentions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-zinc-500 text-sm">No mentions found.</p>
          <p className="text-zinc-700 text-xs mt-1">
            {activeLabel
              ? `Try clearing the "${activeLabel}" filter.`
              : "Mentions will appear here once the stream ingests tweets."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {mentions.map((m) => (
            <TweetCard key={m.id} mention={m} />
          ))}
        </div>
      )}
    </div>
  );
}
