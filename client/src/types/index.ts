export interface Brand {
  id:         string;
  name:       string;
  slug:       string;
  logo_url:   string | null;
  color:      string;
  is_active:  boolean;
  created_at: string;
  updated_at: string;
}

export interface Author {
  id:                string;
  platform:          string;
  platform_id:       string;
  username:          string;
  display_name:      string | null;
  followers_count:   number;
  verified:          boolean;
  profile_image_url: string | null;
  tier:              AuthorTier;
  created_at:        string;
  updated_at:        string;
}

export interface MentionSentiment {
  score:         number | null;
  label:         SentimentLabel | null;
  model_version: string | null;
}

export interface Mention {
  id:                   string;
  brand_id:             string;
  platform:             string;
  platform_post_id:     string;
  author_id:            string | null;
  content:              string;
  url:                  string | null;
  lang:                 string | null;
  retweet_count:        number;
  like_count:           number;
  reply_count:          number;
  quote_count:          number;
  impression_count:     number;
  hashtags:             string[];
  mentioned_usernames:  string[];
  urls:                 string[];
  posted_at:            string;
  ingested_at:          string;
  // Joined relations (from server SELECT with *)
  authors:              Author | null;
  mention_sentiment:    MentionSentiment | null;
}

export interface TrendBucket {
  id:             string;
  brand_id:       string;
  platform:       string;
  bucket_hour:    string;  // ISO timestamp
  mention_count:  number;
  positive_count: number;
  negative_count: number;
  neutral_count:  number;
  avg_sentiment:  number | null;
}

export type SentimentLabel = "positive" | "neutral" | "negative";
export type AuthorTier     = "nano" | "micro" | "macro" | "mega";
