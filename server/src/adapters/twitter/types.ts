/**
 * Minimal X API v2 type definitions used by XAdapter.
 * Only the fields we actually consume — keeps the adapter lean.
 */

export interface XTweetPublicMetrics {
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  impression_count?: number;
}

export interface XTweetEntities {
  hashtags?: Array<{ tag: string }>;
  mentions?: Array<{ username: string; id: string }>;
  urls?: Array<{ expanded_url: string; display_url: string }>;
}

export interface XUser {
  id: string;
  name: string;
  username: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
  profile_image_url?: string;
  verified?: boolean;
}

export interface XTweet {
  id: string;
  text: string;
  author_id?: string;
  lang?: string;
  created_at?: string;
  public_metrics?: XTweetPublicMetrics;
  entities?: XTweetEntities;
  /** Populated when expansions=author_id is requested */
  author?: XUser;
}

export interface XStreamRule {
  id: string;
  value: string;
  tag?: string;
}

export interface XStreamRuleRequest {
  value: string;
  tag?: string;
}

/** Shape of a single event on the filtered stream */
export interface XStreamEvent {
  data: XTweet;
  matching_rules: Array<{ id: string; tag?: string }>;
  includes?: {
    users?: XUser[];
  };
}

/** X API v2 error response */
export interface XApiError {
  title: string;
  type: string;
  status?: number;
  detail?: string;
}
