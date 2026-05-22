import Redis from "ioredis";

/**
 * Single shared Redis connection.
 *
 * REDIS_URL controls the target:
 *   Dev  → redis://localhost:6379   (Docker Compose)
 *   Prod → rediss://default:<token>@<host>.upstash.io:6380  (Upstash)
 *
 * The `tls` option is automatically negotiated by ioredis when the
 * scheme is `rediss://`, so no code-level branching is needed.
 */
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on("error", (err: Error) => {
  console.error("[redis] connection error:", err.message);
});

redis.on("connect", () => {
  console.log("[redis] connected to", REDIS_URL.replace(/\/\/.*@/, "//***@"));
});
