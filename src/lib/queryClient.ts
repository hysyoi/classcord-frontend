import { QueryClient } from "@tanstack/vue-query";

// 全站共用的單一 QueryClient 實例，讓 Pinia store 內部（非 Vue 元件內）
// 也能直接用 ensureQueryData 等指令式 API 存取同一份快取，不受限於
// useQueryClient() 需要在元件 setup context 內呼叫的限制。
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});
