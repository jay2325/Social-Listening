import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabaseRealtime } from "../lib/supabaseClient";

/**
 * Subscribes to Supabase Realtime INSERT events on the `mentions` table
 * filtered to a specific brand.
 *
 * Returns a live count of new mentions received since the component mounted.
 * Also invalidates the ['mentions', brandId] query key so the feed refreshes.
 *
 * Silently no-ops when supabaseRealtime is null (env vars not configured).
 */
export function useRealtimeMentionCount(brandId: string | undefined): number {
  const [liveCount, setLiveCount] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Reset counter when brand changes
    setLiveCount(0);

    // Capture in a local const so TypeScript narrows away null in the cleanup fn
    const client = supabaseRealtime;
    if (!brandId || !client) return;

    const channel = client
      .channel(`mentions:brand:${brandId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "mentions",
          filter: `brand_id=eq.${brandId}`,
        },
        () => {
          setLiveCount((c) => c + 1);
          // Invalidate mentions and trends queries so they refetch
          void queryClient.invalidateQueries({ queryKey: ["mentions", brandId] });
          void queryClient.invalidateQueries({ queryKey: ["trends", "buckets", brandId] });
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [brandId, queryClient]);

  return liveCount;
}
