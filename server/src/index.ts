import "dotenv/config";
import express from "express";
import cors from "cors";
import { brandsRouter } from "./routes/brands";
import { mentionsRouter } from "./routes/mentions";
import { trackingRulesRouter } from "./routes/trackingRules";
import { trendsRouter } from "./routes/trends";
import { startNlpWorker } from "./workers/nlpWorker";
import { XAdapter } from "./adapters/twitter/XAdapter";
import { IngestPipeline } from "./ingestion/pipeline";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/brands", brandsRouter);
app.use("/mentions", mentionsRouter);
app.use("/tracking-rules", trackingRulesRouter);
app.use("/trends", trendsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ── Bootstrap ───────────────────────────────────────────────────────────────
async function bootstrap() {
  // Start BullMQ NLP consumer
  startNlpWorker();

  // Start X filtered stream (skipped if bearer token not configured)
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (bearerToken) {
    const pipeline = new IngestPipeline();
    const adapter = new XAdapter({ bearerToken, pipeline });
    await adapter.connect();

    // Graceful shutdown
    const shutdown = async () => {
      console.log("[server] shutting down…");
      await adapter.disconnect();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } else {
    console.warn(
      "[server] X_BEARER_TOKEN not set — stream adapter disabled. " +
        "Server routes are still available."
    );
  }

  app.listen(PORT, () => {
    console.log(`[server] PulseBoard API listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("[server] fatal bootstrap error:", err);
  process.exit(1);
});
