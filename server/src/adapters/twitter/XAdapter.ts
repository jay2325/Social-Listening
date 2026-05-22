import https from "https";
import http from "http";
import { URL } from "url";
import { supabase } from "../../lib/supabase";
import type { PlatformAdapter, PlatformAdapterOptions } from "../PlatformAdapter";
import type {
  XStreamEvent,
  XStreamRule,
  XStreamRuleRequest,
  XTweet,
  XUser,
} from "./types";

const X_API_BASE = "https://api.twitter.com/2";

/** Loose shape of every X API v2 JSON response we care about */
interface XApiBody {
  data?: unknown;
  includes?: { users?: XUser[] };
  meta?: unknown;
  errors?: unknown;
}

/** Exponential back-off config for stream reconnects */
const RECONNECT = {
  initialDelayMs: 1_000,
  maxDelayMs: 300_000, // 5 min cap (X API guidance)
  maxAttempts: Infinity,
} as const;

/**
 * XAdapter — implements PlatformAdapter for the X (Twitter) API v2.
 *
 * Phase 1 scope:
 *  - Filtered Stream (persistent) with auto-reconnect + exponential back-off
 *  - Rule sync: push DB tracking_rules → X API, store returned x_rule_id
 *  - Recent Search for backfill / gap recovery
 *  - Bearer Token (App-only auth) — clean interface for OAuth 1.0a later
 */
export class XAdapter implements PlatformAdapter {
  readonly platform = "twitter";

  private readonly bearerToken: string;
  private readonly pipeline: PlatformAdapterOptions["pipeline"];

  private activeRequest: http.ClientRequest | null = null;
  private reconnectAttempts = 0;
  private disconnectRequested = false;

  constructor(opts: PlatformAdapterOptions) {
    this.bearerToken = opts.bearerToken;
    this.pipeline = opts.pipeline;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    this.disconnectRequested = false;
    await this.syncRules();
    this._startStream();
  }

  async syncRules(): Promise<number> {
    // 1. Load active tracking rules from DB
    const { data: dbRules, error } = await supabase
      .from("tracking_rules")
      .select("id, brand_id, rule_value")
      .eq("platform", "twitter")
      .eq("is_active", true);

    if (error) {
      console.error("[XAdapter] Failed to load tracking rules:", error.message);
      return 0;
    }
    if (!dbRules || dbRules.length === 0) {
      console.log("[XAdapter] No active tracking rules — skipping rule sync");
      return 0;
    }

    // 2. Fetch existing rules from X API
    const existingRules = await this._getStreamRules();
    const existingIds = existingRules.map((r) => r.id);

    // 3. Delete all existing rules (full replace strategy keeps it simple)
    if (existingIds.length > 0) {
      await this._deleteStreamRules(existingIds);
    }

    // 4. Push new rules
    const newRules: XStreamRuleRequest[] = dbRules.map((r) => ({
      value: r.rule_value,
      tag: r.id, // use DB rule UUID as tag so we can map back
    }));

    const created = await this._addStreamRules(newRules);

    // 5. Store returned x_rule_id back to DB
    for (const xRule of created) {
      if (!xRule.tag) continue;
      await supabase
        .from("tracking_rules")
        .update({ x_rule_id: xRule.id, updated_at: new Date().toISOString() })
        .eq("id", xRule.tag);
    }

    console.log(`[XAdapter] Synced ${created.length} rules to X API`);
    return created.length;
  }

  async fetchRecent(sinceId?: string, maxResults = 100): Promise<void> {
    const { data: dbRules } = await supabase
      .from("tracking_rules")
      .select("rule_value")
      .eq("platform", "twitter")
      .eq("is_active", true);

    if (!dbRules || dbRules.length === 0) return;

    // Combine rules with OR for recent search
    const query = dbRules
      .map((r: { rule_value: string }) => `(${r.rule_value})`)
      .join(" OR ");

    const params = new URLSearchParams({
      query,
      max_results: String(Math.min(maxResults, 100)),
      "tweet.fields": "created_at,public_metrics,entities,lang,author_id",
      expansions: "author_id",
      "user.fields": "name,username,public_metrics,profile_image_url,verified",
    });

    if (sinceId) params.set("since_id", sinceId);

    const url = `${X_API_BASE}/tweets/search/recent?${params}`;

    try {
      const body = await this._apiFetch(url);
      const tweets = (body.data as XTweet[] | undefined) ?? [];
      const users = body.includes?.users ?? [];

      // Attach author objects
      const userMap = new Map(users.map((u) => [u.id, u]));
      const enriched = tweets.map((t) => ({
        ...t,
        author: t.author_id ? userMap.get(t.author_id) : undefined,
      }));

      if (enriched.length > 0) {
        await this.pipeline.ingest(enriched);
        console.log(`[XAdapter] fetchRecent ingested ${enriched.length} tweets`);
      }
    } catch (err) {
      console.error("[XAdapter] fetchRecent error:", (err as Error).message);
    }
  }

  async disconnect(): Promise<void> {
    this.disconnectRequested = true;
    if (this.activeRequest) {
      this.activeRequest.destroy();
      this.activeRequest = null;
    }
    console.log("[XAdapter] disconnected");
  }

  // ── Stream internals ───────────────────────────────────────────────────────

  private _startStream(): void {
    if (this.disconnectRequested) return;

    const url = new URL(`${X_API_BASE}/tweets/search/stream`);
    url.searchParams.set(
      "tweet.fields",
      "created_at,public_metrics,entities,lang,author_id"
    );
    url.searchParams.set("expansions", "author_id");
    url.searchParams.set(
      "user.fields",
      "name,username,public_metrics,profile_image_url,verified"
    );

    console.log("[XAdapter] connecting to filtered stream…");

    const req = https.request(
      url.toString(),
      {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
          "User-Agent": "PulseBoard/1.0",
        },
      },
      (res) => {
        if (res.statusCode === 409) {
          // Stale connection still held open on X's side from a previous session.
          // Clear all rules (forces X to fully reset stream state), wait 2 s,
          // re-sync fresh rules, then reconnect.
          console.warn(
            "[XAdapter] 409 conflict — stale stream open; clearing rules and retrying in 2 s"
          );
          this._handleConflict().catch((err: Error) =>
            console.error("[XAdapter] conflict resolution error:", err.message)
          );
          return;
        }
        if (res.statusCode === 429) {
          console.warn("[XAdapter] rate limited (429) — backing off");
          this._scheduleReconnect();
          return;
        }
        if (res.statusCode !== 200) {
          console.error(
            `[XAdapter] stream responded with HTTP ${res.statusCode}`
          );
          this._scheduleReconnect();
          return;
        }

        this.reconnectAttempts = 0;
        console.log("[XAdapter] stream connected ✓");

        let buffer = "";

        res.on("data", (chunk: Buffer) => {
          buffer += chunk.toString("utf8");
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // last element may be incomplete

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue; // heartbeat (empty line)
            try {
              const event: XStreamEvent = JSON.parse(trimmed);
              this._handleEvent(event).catch((err: Error) =>
                console.error("[XAdapter] handleEvent error:", err.message)
              );
            } catch {
              // non-JSON lines (connection notices etc.) — ignore
            }
          }
        });

        res.on("end", () => {
          if (!this.disconnectRequested) {
            console.warn("[XAdapter] stream ended unexpectedly — reconnecting");
            this._scheduleReconnect();
          }
        });

        res.on("error", (err) => {
          console.error("[XAdapter] stream response error:", err.message);
          if (!this.disconnectRequested) this._scheduleReconnect();
        });
      }
    );

    req.on("error", (err) => {
      console.error("[XAdapter] request error:", err.message);
      if (!this.disconnectRequested) this._scheduleReconnect();
    });

    req.end();
    this.activeRequest = req;
  }

  /**
   * Called on HTTP 409: a previous session left a stream connection open on
   * X's side. Strategy:
   *   1. Fetch all rules currently registered on X and delete them — this
   *      clears the stale state that's holding the connection slot.
   *   2. Wait 2 s for X to fully close the old connection.
   *   3. Re-sync fresh rules from the DB.
   *   4. Start the stream again.
   *
   * If anything in step 1 fails we still proceed to the retry — worst case
   * we hit another 409 and loop through here again.
   */
  private async _handleConflict(): Promise<void> {
    if (this.disconnectRequested) return;

    try {
      const existing = await this._getStreamRules();
      if (existing.length > 0) {
        await this._deleteStreamRules(existing.map((r) => r.id));
        console.log(
          `[XAdapter] cleared ${existing.length} stale rule(s) from X`
        );
      } else {
        console.log("[XAdapter] no stale rules found on X");
      }
    } catch (err) {
      console.error(
        "[XAdapter] failed to clear stale rules (continuing anyway):",
        (err as Error).message
      );
    }

    // Give X 2 s to release the connection slot
    await new Promise<void>((resolve) => setTimeout(resolve, 2_000));
    if (this.disconnectRequested) return;

    // Push fresh rules, then reconnect
    await this.syncRules();
    this._startStream();
  }

  private _scheduleReconnect(): void {
    if (this.disconnectRequested) return;
    this.reconnectAttempts++;

    const delay = Math.min(
      RECONNECT.initialDelayMs * 2 ** (this.reconnectAttempts - 1),
      RECONNECT.maxDelayMs
    );

    console.log(
      `[XAdapter] reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})…`
    );

    setTimeout(() => {
      if (!this.disconnectRequested) this._startStream();
    }, delay);
  }

  private async _handleEvent(event: XStreamEvent): Promise<void> {
    const tweet = event.data;
    const users = event.includes?.users ?? [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched: XTweet = {
      ...tweet,
      author: tweet.author_id ? userMap.get(tweet.author_id) : undefined,
    };

    // Map matching rule tags back to brand IDs
    const ruleIds = event.matching_rules
      .map((r) => r.tag)
      .filter((t): t is string => !!t);

    await this.pipeline.ingestWithRules(enriched, ruleIds);
  }

  // ── X API helpers ──────────────────────────────────────────────────────────

  private async _getStreamRules(): Promise<XStreamRule[]> {
    const body = await this._apiFetch(`${X_API_BASE}/tweets/search/stream/rules`);
    return (body.data as XStreamRule[] | undefined) ?? [];
  }

  private async _deleteStreamRules(ids: string[]): Promise<void> {
    await this._apiFetch(`${X_API_BASE}/tweets/search/stream/rules`, {
      method: "POST",
      body: JSON.stringify({ delete: { ids } }),
    });
  }

  private async _addStreamRules(
    rules: XStreamRuleRequest[]
  ): Promise<XStreamRule[]> {
    const body = await this._apiFetch(
      `${X_API_BASE}/tweets/search/stream/rules`,
      {
        method: "POST",
        body: JSON.stringify({ add: rules }),
      }
    );
    return (body.data as XStreamRule[] | undefined) ?? [];
  }

  /** Thin fetch wrapper — all calls use Bearer Token auth */
  private async _apiFetch(
    url: string,
    options: { method?: string; body?: string } = {}
  ): Promise<XApiBody> {
    const { method = "GET", body } = options;

    const { default: fetch } = await import("node-fetch");

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        "Content-Type": "application/json",
        "User-Agent": "PulseBoard/1.0",
      },
      ...(body ? { body } : {}),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`X API ${method} ${url} → ${res.status}: ${text}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<XApiBody>;
    }
    return {};
  }
}
