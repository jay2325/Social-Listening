import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Mention, SentimentLabel } from "../types";

interface UseMentionsParams {
  brand_id?: string;
  limit?:    number;
  cursor?:   string;
  label?:    SentimentLabel;
}

export function useMentions(params: UseMentionsParams = {}) {
  const { brand_id, limit = 50, cursor, label } = params;
  return useQuery<Mention[]>({
    queryKey: ["mentions", brand_id, limit, cursor, label],
    queryFn:  () => api.mentions.list({ brand_id, limit, cursor, label }),
    enabled:  !!brand_id,
  });
}
