import { useQuery } from "@tanstack/react-query";
import { isMockMode } from "@/lib/playfab/config";
import { useSession } from "@/lib/playfab/hooks";
import type { TopUpRecord } from "@/lib/admin-demo-data";

/** Shared real-mode source for the admin ledger, dashboard revenue, and analytics. */
export function useAdminPayMongoOrders() {
  const mockMode = isMockMode();
  const sessionQuery = useSession();

  return useQuery({
    queryKey: ["admin", "paymongo-orders", "shared"],
    queryFn: async (): Promise<TopUpRecord[]> => {
      const response = await fetch("/api/admin/paymongo-orders", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Could not load the payment ledger.");
      const result = (await response.json().catch(() => ({}))) as { data?: unknown };
      return Array.isArray(result.data) ? (result.data as TopUpRecord[]) : [];
    },
    enabled: !mockMode && Boolean(sessionQuery.data),
    staleTime: 0,
    refetchInterval: mockMode ? false : 15_000,
  });
}
