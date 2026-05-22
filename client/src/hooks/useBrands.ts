import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Brand } from "../types";

export function useBrands() {
  return useQuery<Brand[]>({
    queryKey: ["brands"],
    queryFn:  api.brands.list,
    // Brands change rarely — longer stale time is fine
    staleTime: 60_000,
  });
}
