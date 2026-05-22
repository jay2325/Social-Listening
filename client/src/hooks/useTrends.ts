import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { TrendBucket } from "../types";

export function useTrendBuckets(brandId: string | undefined, hours = 168) {
  return useQuery<TrendBucket[]>({
    queryKey: ["trends", "buckets", brandId, hours],
    queryFn:  () => api.trends.buckets({ brand_id: brandId!, hours }),
    enabled:  !!brandId,
  });
}
