/**
 * PlatformAdapter — the interface all social-platform connectors must implement.
 *
 * Design goals:
 *  - Phase 1: XAdapter (Bearer Token, read-only)
 *  - Future:  InstagramAdapter, TikTokAdapter — plug in without restructuring
 *  - OAuth 1.0a (user-context write actions) can be added to XAdapter later
 *    by extending this interface with optional write methods.
 */

import type { IngestPipeline } from "../ingestion/pipeline";

export interface PlatformAdapterOptions {
  /** OAuth Bearer Token (App-only) */
  bearerToken: string;
  /** Injected ingestion pipeline — adapter calls pipeline.ingest(tweets) */
  pipeline: IngestPipeline;
}

export interface PlatformAdapter {
  readonly platform: string;

  /**
   * Establish a persistent streaming connection to the platform.
   * Must handle reconnects internally.
   */
  connect(): Promise<void>;

  /**
   * Push the current set of active tracking rules from DB to the platform API.
   * Returns the number of rules successfully synced.
   */
  syncRules(): Promise<number>;

  /**
   * Backfill / gap-recovery: fetch recent posts matching current rules.
   * @param sinceId - platform post ID to paginate from (optional)
   * @param maxResults - cap on results (default 100)
   */
  fetchRecent(sinceId?: string, maxResults?: number): Promise<void>;

  /**
   * Gracefully close the streaming connection and release resources.
   */
  disconnect(): Promise<void>;
}
