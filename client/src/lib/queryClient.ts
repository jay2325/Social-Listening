import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30 s — matches spec refetch interval
      refetchInterval: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
