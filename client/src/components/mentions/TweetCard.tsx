import type { Mention, SentimentLabel, AuthorTier } from "../../types";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Heart, Repeat2, MessageCircle, ExternalLink } from "lucide-react";
import { timeAgo, fmtCount } from "../../lib/utils";

interface TweetCardProps {
  mention: Mention;
}

const TIER_LABELS: Record<AuthorTier, string> = {
  nano:  "Nano",
  micro: "Micro",
  macro: "Macro",
  mega:  "Mega",
};

export function TweetCard({ mention: m }: TweetCardProps) {
  const sentimentLabel = m.mention_sentiment?.label as SentimentLabel | null | undefined;
  const tier = m.authors?.tier as AuthorTier | undefined;

  return (
    <Card className="hover:border-zinc-700 transition-colors">
      <CardContent className="pt-4 pb-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Avatar placeholder */}
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center text-zinc-500 text-xs font-bold uppercase overflow-hidden">
              {m.authors?.profile_image_url ? (
                <img
                  src={m.authors.profile_image_url}
                  alt={m.authors.username}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                (m.authors?.username?.[0] ?? "?")
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium text-zinc-200 truncate">
                  {m.authors?.display_name ?? m.authors?.username ?? "Unknown"}
                </span>
                {m.authors?.verified && (
                  <svg className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <span className="text-xs text-zinc-500">
                @{m.authors?.username ?? "—"}
              </span>
            </div>
          </div>

          {/* Right badges */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {tier && (
              <Badge variant={tier}>{TIER_LABELS[tier]}</Badge>
            )}
            {sentimentLabel && (
              <Badge variant={sentimentLabel}>{sentimentLabel}</Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
          {m.content}
        </p>

        {/* Hashtags */}
        {m.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {m.hashtags.slice(0, 6).map((tag) => (
              <span key={tag} className="text-[11px] text-indigo-400">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-3 text-xs text-zinc-600">
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" /> {fmtCount(m.like_count)}
            </span>
            <span className="flex items-center gap-1">
              <Repeat2 className="w-3.5 h-3.5" /> {fmtCount(m.retweet_count)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" /> {fmtCount(m.reply_count)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600">{timeAgo(m.posted_at)}</span>
            {m.url && (
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
