/**
 * Typed API client — all calls go to /api/* which Vite proxies to
 * http://localhost:3001 in development (see vite.config.ts).
 */
import type { Brand, Mention, TrendBucket } from "../types";
import type { SentimentLabel } from "../types";

async function apiFetch<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`/api${path}`, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${path} → ${res.status}${text ? `: ${text}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  brands: {
    list: ()          => apiFetch<Brand[]>("/brands"),
    get:  (id: string) => apiFetch<Brand>(`/brands/${id}`),
  },

  mentions: {
    list: (params?: {
      brand_id?: string;
      limit?:    number;
      cursor?:   string;
      label?:    SentimentLabel;
    }) =>
      apiFetch<Mention[]>("/mentions", {
        brand_id: params?.brand_id,
        limit:    params?.limit,
        cursor:   params?.cursor,
        label:    params?.label,
      }),
  },

  trends: {
    buckets: (params: { brand_id: string; hours?: number }) =>
      apiFetch<TrendBucket[]>("/trends/buckets", {
        brand_id: params.brand_id,
        hours:    params.hours ?? 168,
      }),
  },
};
