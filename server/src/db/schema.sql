-- ============================================================
--  PulseBoard — Supabase Schema  (Phase 1)
--  8 tables: brands, tracking_rules, authors, mentions,
--            mention_sentiment, trend_buckets, trend_spikes,
--            alert_configs
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- 1. brands
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  slug         TEXT        UNIQUE NOT NULL,
  logo_url     TEXT,
  color        TEXT        NOT NULL DEFAULT '#6366f1',
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brands_slug_idx ON brands (slug);
CREATE INDEX IF NOT EXISTS brands_is_active_idx ON brands (is_active);

-- ────────────────────────────────────────────────────────────
-- 2. tracking_rules
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracking_rules (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     UUID        NOT NULL REFERENCES brands (id) ON DELETE CASCADE,
  platform     TEXT        NOT NULL DEFAULT 'twitter',
  rule_value   TEXT        NOT NULL,   -- X API filter query string
  x_rule_id    TEXT,                   -- ID returned by X API after sync
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tracking_rules_brand_id_idx   ON tracking_rules (brand_id);
CREATE INDEX IF NOT EXISTS tracking_rules_platform_idx   ON tracking_rules (platform);
CREATE INDEX IF NOT EXISTS tracking_rules_is_active_idx  ON tracking_rules (is_active);
CREATE INDEX IF NOT EXISTS tracking_rules_x_rule_id_idx  ON tracking_rules (x_rule_id) WHERE x_rule_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 3. authors
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS authors (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform          TEXT        NOT NULL DEFAULT 'twitter',
  platform_id       TEXT        NOT NULL,   -- native user ID string
  username          TEXT        NOT NULL,
  display_name      TEXT,
  followers_count   INTEGER     NOT NULL DEFAULT 0,
  verified          BOOLEAN     NOT NULL DEFAULT false,
  profile_image_url TEXT,
  -- computed influencer tier
  tier              TEXT        GENERATED ALWAYS AS (
    CASE
      WHEN followers_count >= 1000000 THEN 'mega'
      WHEN followers_count >= 100000  THEN 'macro'
      WHEN followers_count >= 10000   THEN 'micro'
      ELSE                                 'nano'
    END
  ) STORED,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, platform_id)
);

CREATE INDEX IF NOT EXISTS authors_platform_id_idx  ON authors (platform, platform_id);
CREATE INDEX IF NOT EXISTS authors_username_idx     ON authors (username);
CREATE INDEX IF NOT EXISTS authors_tier_idx         ON authors (tier);

-- ────────────────────────────────────────────────────────────
-- 4. mentions
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id           UUID        NOT NULL REFERENCES brands (id) ON DELETE CASCADE,
  platform           TEXT        NOT NULL DEFAULT 'twitter',
  platform_post_id   TEXT        NOT NULL,
  author_id          UUID        REFERENCES authors (id),
  content            TEXT        NOT NULL,
  url                TEXT,
  lang               TEXT,
  retweet_count      INTEGER     NOT NULL DEFAULT 0,
  like_count         INTEGER     NOT NULL DEFAULT 0,
  reply_count        INTEGER     NOT NULL DEFAULT 0,
  quote_count        INTEGER     NOT NULL DEFAULT 0,
  impression_count   INTEGER     NOT NULL DEFAULT 0,
  hashtags           TEXT[]      NOT NULL DEFAULT '{}',
  mentioned_usernames TEXT[]     NOT NULL DEFAULT '{}',
  urls               TEXT[]      NOT NULL DEFAULT '{}',
  raw_payload        JSONB,
  posted_at          TIMESTAMPTZ NOT NULL,
  ingested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, platform_post_id)
);

CREATE INDEX IF NOT EXISTS mentions_brand_id_idx       ON mentions (brand_id);
CREATE INDEX IF NOT EXISTS mentions_posted_at_idx      ON mentions (posted_at DESC);
CREATE INDEX IF NOT EXISTS mentions_ingested_at_idx    ON mentions (ingested_at DESC);
CREATE INDEX IF NOT EXISTS mentions_author_id_idx      ON mentions (author_id);
CREATE INDEX IF NOT EXISTS mentions_platform_idx       ON mentions (platform);
CREATE INDEX IF NOT EXISTS mentions_brand_posted_idx   ON mentions (brand_id, posted_at DESC);

-- ────────────────────────────────────────────────────────────
-- 5. mention_sentiment
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mention_sentiment (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mention_id     UUID        NOT NULL REFERENCES mentions (id) ON DELETE CASCADE,
  score          NUMERIC(5,3),            -- -1.000 to +1.000
  label          TEXT,                    -- positive | neutral | negative
  model_version  TEXT,
  processed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mention_id)
);

CREATE INDEX IF NOT EXISTS mention_sentiment_mention_id_idx ON mention_sentiment (mention_id);
CREATE INDEX IF NOT EXISTS mention_sentiment_label_idx      ON mention_sentiment (label);
CREATE INDEX IF NOT EXISTS mention_sentiment_score_idx      ON mention_sentiment (score);

-- ────────────────────────────────────────────────────────────
-- 6. trend_buckets  (upserted hourly by ingestion pipeline)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trend_buckets (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         UUID        NOT NULL REFERENCES brands (id) ON DELETE CASCADE,
  platform         TEXT        NOT NULL DEFAULT 'twitter',
  bucket_hour      TIMESTAMPTZ NOT NULL,   -- date_trunc('hour', posted_at)
  mention_count    INTEGER     NOT NULL DEFAULT 0,
  positive_count   INTEGER     NOT NULL DEFAULT 0,
  negative_count   INTEGER     NOT NULL DEFAULT 0,
  neutral_count    INTEGER     NOT NULL DEFAULT 0,
  avg_sentiment    NUMERIC(5,3),
  UNIQUE (brand_id, platform, bucket_hour)
);

CREATE INDEX IF NOT EXISTS trend_buckets_brand_id_idx    ON trend_buckets (brand_id);
CREATE INDEX IF NOT EXISTS trend_buckets_bucket_hour_idx ON trend_buckets (bucket_hour DESC);
CREATE INDEX IF NOT EXISTS trend_buckets_brand_hour_idx  ON trend_buckets (brand_id, bucket_hour DESC);

-- ────────────────────────────────────────────────────────────
-- 7. trend_spikes
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trend_spikes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID        NOT NULL REFERENCES brands (id) ON DELETE CASCADE,
  platform        TEXT        NOT NULL DEFAULT 'twitter',
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  spike_type      TEXT        NOT NULL,   -- volume_spike | sentiment_shift
  magnitude       NUMERIC(8,2),
  baseline_count  INTEGER,
  spike_count     INTEGER,
  window_start    TIMESTAMPTZ,
  window_end      TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  metadata        JSONB
);

CREATE INDEX IF NOT EXISTS trend_spikes_brand_id_idx    ON trend_spikes (brand_id);
CREATE INDEX IF NOT EXISTS trend_spikes_detected_at_idx ON trend_spikes (detected_at DESC);
CREATE INDEX IF NOT EXISTS trend_spikes_spike_type_idx  ON trend_spikes (spike_type);

-- ────────────────────────────────────────────────────────────
-- 8. alert_configs
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_configs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              UUID        NOT NULL REFERENCES brands (id) ON DELETE CASCADE,
  alert_type            TEXT        NOT NULL,   -- volume_spike | sentiment_drop | keyword_match
  threshold_value       NUMERIC,
  comparison            TEXT        NOT NULL DEFAULT 'gt',  -- gt | lt | eq
  window_minutes        INTEGER     NOT NULL DEFAULT 60,
  is_active             BOOLEAN     NOT NULL DEFAULT true,
  notification_channels TEXT[]      NOT NULL DEFAULT ARRAY['email'],
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alert_configs_brand_id_idx  ON alert_configs (brand_id);
CREATE INDEX IF NOT EXISTS alert_configs_is_active_idx ON alert_configs (is_active);
