import { supabase } from "../lib/supabase";

interface MentionRow {
  brand_id: string;
  platform: string;
  platform_post_id: string;
  author_id: string | null;
  content: string;
  url: string | null;
  lang: string | null;
  retweet_count: number;
  like_count: number;
  reply_count: number;
  quote_count: number;
  impression_count: number;
  hashtags: string[];
  mentioned_usernames: string[];
  urls: string[];
  raw_payload: Record<string, unknown>;
  posted_at: string;
}

interface AuthorRow {
  platform: string;
  platform_id: string;
  username: string;
  display_name: string | null;
  followers_count: number;
  verified: boolean;
  profile_image_url: string | null;
}

/**
 * BatchWriter buffers rows and flushes in configurable batches.
 * Using upsert throughout so re-ingested tweets are idempotent.
 */
export class BatchWriter {
  private readonly flushSize: number;
  private readonly flushIntervalMs: number;
  private mentionBuffer: MentionRow[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(flushSize = 50, flushIntervalMs = 2_000) {
    this.flushSize = flushSize;
    this.flushIntervalMs = flushIntervalMs;
    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  /**
   * Upsert a single author row.
   * Returns the internal author UUID (needed by mentions).
   */
  async upsertAuthor(row: AuthorRow): Promise<string | null> {
    const { data, error } = await supabase
      .from("authors")
      .upsert(
        { ...row, updated_at: new Date().toISOString() },
        { onConflict: "platform,platform_id" }
      )
      .select("id")
      .single();

    if (error) {
      console.error("[BatchWriter] author upsert error:", error.message);
      return null;
    }
    return data.id as string;
  }

  /** Buffer a mention row; flush if buffer is full */
  enqueue(row: MentionRow): void {
    this.mentionBuffer.push(row);
    if (this.mentionBuffer.length >= this.flushSize) {
      this.flush().catch((err) =>
        console.error("[BatchWriter] flush error:", err)
      );
    }
  }

  /** Flush buffered mentions to Supabase and update trend buckets */
  async flush(): Promise<void> {
    if (this.mentionBuffer.length === 0) return;

    const batch = this.mentionBuffer.splice(0, this.mentionBuffer.length);

    const { data, error } = await supabase
      .from("mentions")
      .upsert(batch, { onConflict: "platform,platform_post_id" })
      .select("id, brand_id, platform, posted_at");

    if (error) {
      console.error("[BatchWriter] mention batch upsert error:", error.message);
      return;
    }

    // Update trend_buckets for each brand/platform/hour
    const bucketUpdates = new Map<string, { brand_id: string; platform: string; bucket_hour: string; count: number }>();

    for (const row of data ?? []) {
      const hour = new Date(row.posted_at as string);
      hour.setMinutes(0, 0, 0);
      const key = `${row.brand_id}:${row.platform}:${hour.toISOString()}`;

      if (!bucketUpdates.has(key)) {
        bucketUpdates.set(key, {
          brand_id: row.brand_id as string,
          platform: row.platform as string,
          bucket_hour: hour.toISOString(),
          count: 0,
        });
      }
      bucketUpdates.get(key)!.count++;
    }

    for (const bucket of bucketUpdates.values()) {
      await supabase.rpc("increment_trend_bucket", {
        p_brand_id: bucket.brand_id,
        p_platform: bucket.platform,
        p_bucket_hour: bucket.bucket_hour,
        p_count: bucket.count,
      }).then(({ error: rpcError }) => {
        if (rpcError) {
          // Fall back to raw upsert if RPC not available yet
          supabase
            .from("trend_buckets")
            .upsert(
              {
                brand_id: bucket.brand_id,
                platform: bucket.platform,
                bucket_hour: bucket.bucket_hour,
                mention_count: bucket.count,
              },
              {
                onConflict: "brand_id,platform,bucket_hour",
                ignoreDuplicates: false,
              }
            )
            .then(({ error: upsertErr }) => {
              if (upsertErr) {
                console.error(
                  "[BatchWriter] trend_bucket upsert error:",
                  upsertErr.message
                );
              }
            });
        }
      });
    }
  }

  /** Return the IDs of the last-flushed mentions for NLP queuing */
  async flushAndGetIds(): Promise<string[]> {
    if (this.mentionBuffer.length === 0) return [];

    const batch = this.mentionBuffer.splice(0);

    const { data, error } = await supabase
      .from("mentions")
      .upsert(batch, { onConflict: "platform,platform_post_id" })
      .select("id");

    if (error) {
      console.error("[BatchWriter] flushAndGetIds error:", error.message);
      return [];
    }

    return (data ?? []).map((r) => r.id as string);
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
