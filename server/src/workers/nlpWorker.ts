import { Worker, Job } from "bullmq";
import { redis } from "../lib/redis";
import { supabase } from "../lib/supabase";

const NLP_SERVICE_URL =
  process.env.NLP_SERVICE_URL ?? "http://localhost:8000";

interface NlpJobData {
  platformPostId: string;
  text: string;
  brandId: string;
  platform: string;
}

interface NlpResponse {
  mention_id: string;
  score: number;
  label: string;
  model_version: string;
}

/**
 * NLP Worker — reads from BullMQ `nlp-queue`, calls FastAPI /analyze,
 * writes result to mention_sentiment table.
 *
 * The pipeline NEVER awaits this — it runs fully async so ingestion
 * throughput is never constrained by NLP latency.
 */
export function startNlpWorker(): Worker<NlpJobData> {
  const worker = new Worker<NlpJobData>(
    "nlp-queue",
    async (job: Job<NlpJobData>) => {
      const { platformPostId, text, platform } = job.data;

      // 1. Resolve mention UUID from platform_post_id
      const { data: mention, error: mentionErr } = await supabase
        .from("mentions")
        .select("id")
        .eq("platform", platform)
        .eq("platform_post_id", platformPostId)
        .single();

      if (mentionErr || !mention) {
        // Mention not yet committed (batch not flushed) — throw to retry
        throw new Error(
          `Mention not found for ${platform}:${platformPostId} — will retry`
        );
      }

      const mentionId: string = mention.id;

      // 2. Call FastAPI NLP service
      const { default: fetch } = await import("node-fetch");
      const res = await fetch(`${NLP_SERVICE_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mention_id: mentionId, text }),
      });

      if (!res.ok) {
        throw new Error(
          `NLP service responded ${res.status}: ${await res.text()}`
        );
      }

      const nlp: NlpResponse = (await res.json()) as NlpResponse;

      // 3. Write sentiment result
      const { error: upsertErr } = await supabase
        .from("mention_sentiment")
        .upsert(
          {
            mention_id: mentionId,
            score: nlp.score,
            label: nlp.label,
            model_version: nlp.model_version,
            processed_at: new Date().toISOString(),
          },
          { onConflict: "mention_id" }
        );

      if (upsertErr) {
        throw new Error(`Sentiment upsert failed: ${upsertErr.message}`);
      }
    },
    {
      connection: redis,
      concurrency: 10,        // 10 parallel NLP calls max
      limiter: {
        max: 50,              // 50 jobs per 10 s (stay within FastAPI capacity)
        duration: 10_000,
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[nlpWorker] ✓ job ${job.id} (${job.data.platformPostId})`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[nlpWorker] ✗ job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
      err.message
    );
  });

  worker.on("error", (err) => {
    console.error("[nlpWorker] worker error:", err.message);
  });

  console.log("[nlpWorker] started — listening on nlp-queue");
  return worker;
}
