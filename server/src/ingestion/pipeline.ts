import { Queue } from "bullmq";
import { redis } from "../lib/redis";
import { supabase } from "../lib/supabase";
import { BatchWriter } from "./batchWriter";
import type { XTweet } from "../adapters/twitter/types";

const NLP_QUEUE_NAME = "nlp-queue";

/**
 * IngestPipeline
 *
 * Responsibilities:
 *  1. Validate incoming tweets
 *  2. Resolve brand_id from rule tags
 *  3. Upsert authors
 *  4. Batch-write mentions (never one-by-one)
 *  5. Enqueue mention IDs to BullMQ nlp-queue
 *  6. NEVER block on NLP — queue is fire-and-forget
 */
export class IngestPipeline {
  private readonly writer: BatchWriter;
  private readonly nlpQueue: Queue;

  constructor() {
    this.writer = new BatchWriter(50, 2_000);
    this.nlpQueue = new Queue(NLP_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: { count: 1_000 },
        removeOnFail: { count: 500 },
      },
    });
  }

  /**
   * Ingest a batch of tweets (from fetchRecent / backfill).
   * brand_id is resolved by matching tweets against active tracking rules.
   */
  async ingest(tweets: XTweet[]): Promise<void> {
    // Load all active tracking rules once per batch
    const { data: rules } = await supabase
      .from("tracking_rules")
      .select("id, brand_id, rule_value")
      .eq("platform", "twitter")
      .eq("is_active", true);

    if (!rules) return;

    for (const tweet of tweets) {
      // Simple text-match heuristic for backfill (no rule-tag in recent search)
      const matchingRule = rules.find((r: { rule_value: string }) =>
        tweet.text
          .toLowerCase()
          .includes(r.rule_value.toLowerCase().replace(/"/g, ""))
      );

      if (!matchingRule) continue;
      await this._processTweet(tweet, matchingRule.brand_id);
    }
  }

  /**
   * Ingest a single tweet from the filtered stream.
   * ruleIds are the DB tracking_rule UUIDs (stored as X rule tags).
   */
  async ingestWithRules(tweet: XTweet, ruleIds: string[]): Promise<void> {
    if (ruleIds.length === 0) return;

    // Fetch brand IDs for the matched rule IDs
    const { data: rules } = await supabase
      .from("tracking_rules")
      .select("brand_id")
      .in("id", ruleIds);

    const brandIds = [...new Set((rules ?? []).map((r: { brand_id: string }) => r.brand_id))];

    // Ingest once per brand (a tweet can match multiple brands)
    for (const brandId of brandIds) {
      await this._processTweet(tweet, brandId);
    }
  }

  private async _processTweet(tweet: XTweet, brandId: string): Promise<void> {
    if (!this._validate(tweet)) return;

    // 1. Upsert author
    let authorId: string | null = null;
    if (tweet.author) {
      authorId = await this.writer.upsertAuthor({
        platform: "twitter",
        platform_id: tweet.author.id,
        username: tweet.author.username,
        display_name: tweet.author.name ?? null,
        followers_count: tweet.author.public_metrics?.followers_count ?? 0,
        verified: tweet.author.verified ?? false,
        profile_image_url: tweet.author.profile_image_url ?? null,
      });
    }

    // 2. Extract entities
    const hashtags =
      tweet.entities?.hashtags?.map((h) => h.tag.toLowerCase()) ?? [];
    const mentionedUsernames =
      tweet.entities?.mentions?.map((m) => m.username) ?? [];
    const urls =
      tweet.entities?.urls?.map((u) => u.expanded_url).filter(Boolean) ?? [];

    // 3. Enqueue for batch write
    this.writer.enqueue({
      brand_id: brandId,
      platform: "twitter",
      platform_post_id: tweet.id,
      author_id: authorId,
      content: tweet.text,
      url: `https://twitter.com/i/web/status/${tweet.id}`,
      lang: tweet.lang ?? null,
      retweet_count: tweet.public_metrics?.retweet_count ?? 0,
      like_count: tweet.public_metrics?.like_count ?? 0,
      reply_count: tweet.public_metrics?.reply_count ?? 0,
      quote_count: tweet.public_metrics?.quote_count ?? 0,
      impression_count: tweet.public_metrics?.impression_count ?? 0,
      hashtags,
      mentioned_usernames: mentionedUsernames,
      urls,
      raw_payload: tweet as unknown as Record<string, unknown>,
      posted_at: tweet.created_at ?? new Date().toISOString(),
    });

    // 4. Queue NLP — fire and forget, never awaited in hot path
    this._enqueueNlp(tweet.id, tweet.text, brandId);
  }

  private _enqueueNlp(
    platformPostId: string,
    text: string,
    brandId: string
  ): void {
    // We queue by platform_post_id; the worker resolves the DB mention ID
    this.nlpQueue
      .add(
        "analyze",
        { platformPostId, text, brandId, platform: "twitter" },
        { jobId: `twitter:${platformPostId}` } // dedup by tweet ID
      )
      .catch((err: Error) =>
        console.error("[IngestPipeline] nlp enqueue error:", err.message)
      );
  }

  private _validate(tweet: XTweet): boolean {
    return (
      typeof tweet.id === "string" &&
      tweet.id.length > 0 &&
      typeof tweet.text === "string" &&
      tweet.text.trim().length > 0
    );
  }

  async shutdown(): Promise<void> {
    this.writer.destroy();
    await this.nlpQueue.close();
  }
}
