import type { Mention } from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { Heart, Repeat2, MessageCircle } from "lucide-react";
import { timeAgo, fmtCount } from "../../lib/utils";
import type { SentimentLabel } from "../../types";

interface TopMentionsFeedProps {
  mentions: Mention[];
  isLoading?: boolean;
}

export function TopMentionsFeed({ mentions, isLoading }: TopMentionsFeedProps) {
  // Sort by engagement (likes + retweets) and take top 5
  const top = [...mentions]
    .sort((a, b) => (b.like_count + b.retweet_count) - (a.like_count + a.retweet_count))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Top mentions</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-4 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : top.length === 0 ? (
          <p className="text-sm text-zinc-600 pt-2">No mentions yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {top.map((m) => {
              const sentimentLabel = m.mention_sentiment?.label as SentimentLabel | null | undefined;
              return (
                <li key={m.id} className="py-3 first:pt-2">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-xs font-medium text-zinc-400 truncate">
                      @{m.authors?.username ?? "unknown"}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {sentimentLabel && (
                        <Badge variant={sentimentLabel}>{sentimentLabel}</Badge>
                      )}
                      <span className="text-[11px] text-zinc-600">
                        {timeAgo(m.posted_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2 leading-snug">
                    {m.content}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-600">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {fmtCount(m.like_count)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat2 className="w-3 h-3" /> {fmtCount(m.retweet_count)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {fmtCount(m.reply_count)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
