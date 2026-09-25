import { createFileRoute } from "@tanstack/react-router";

import { isMockMode } from "@/lib/playfab/config";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Crew On Set! Admin" },
      {
        name: "description",
        content: "Review studio alerts, pending applications, and ad status changes.",
      },
      { property: "og:title", content: "Notifications — Crew On Set! Admin" },
      {
        property: "og:description",
        content: "Review studio alerts, pending applications, and ad status changes.",
      },
    ],
  }),
  component: NotificationsPage,
});

import { useMemo } from "react";
import { Bell, Bug, CheckCheck, ChevronRight, CircleDollarSign, Flag } from "lucide-react";
import { useRouter } from "@/components/next-compat/navigation";
import { alertReadStore, bugReportsStore, playerReportsStore } from "@/lib/demo/store";
import { buildAlerts, type AdminAlert } from "@/components/admin/admin-alerts";
import { topUpsStore, type TopUpRecord } from "@/lib/admin-demo-data";
import { useSession } from "@/lib/playfab/hooks";

const iconByKind: Record<AdminAlert["kind"], typeof Bug> = {
  bug: Bug,
  "player-report": Flag,
  transaction: CircleDollarSign,
};

function NotificationsPage() {
  const mockMode = isMockMode();
  const sessionQuery = useSession();
  const [demoTransactions] = topUpsStore.useStore();
  const liveTransactionsQuery = useQuery({
    queryKey: ["admin", "paymongo-orders", "notifications"],
    queryFn: async (): Promise<TopUpRecord[]> => {
      const response = await fetch("/api/admin/paymongo-orders", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return [];
      const result = (await response.json().catch(() => ({}))) as { data?: unknown };
      return Array.isArray(result.data) ? (result.data as TopUpRecord[]) : [];
    },
    enabled: !mockMode && Boolean(sessionQuery.data),
    staleTime: 0,
    refetchInterval: mockMode ? false : 15 * 1000,
  });
  const transactions = useMemo(
    () => (mockMode ? demoTransactions : (liveTransactionsQuery.data ?? [])),
    [demoTransactions, liveTransactionsQuery.data, mockMode],
  );
  const [bugs] = bugReportsStore.useStore();
  const [playerReports] = playerReportsStore.useStore();
  const [readIds, setReadIds] = alertReadStore.useStore();
  const router = useRouter();

  const alerts = useMemo(
    () => buildAlerts(bugs, playerReports, transactions),
    [bugs, playerReports, transactions],
  );
  const unreadCount = alerts.filter((alert) => !readIds.includes(alert.id)).length;

  function openAlert(alert: AdminAlert) {
    if (!readIds.includes(alert.id)) {
      setReadIds([...readIds, alert.id]);
    }
    router.push(alert.href);
  }

  return (
    <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
      <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="admin-heading !text-white">Notifications</h1>
          <p className="admin-kicker !text-white/45">
            Every admin alert and recent dashboard activity in one place.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setReadIds(alerts.map((alert) => alert.id))}
          disabled={unreadCount === 0}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[11px] font-black uppercase tracking-wide !text-white/70 transition hover:border-coral hover:!text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCheck className="size-4" />
          <span className="hidden sm:inline">Mark all as read</span>
          <span className="sm:hidden">Read all</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-coral px-1.5 text-[10px] font-black leading-4 text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </header>

      <section aria-labelledby="notification-list-title">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="size-4 !text-coral" />
          <h2
            id="notification-list-title"
            className="text-sm font-black uppercase tracking-wider !text-white/60"
          >
            All Notifications
          </h2>
        </div>
        <div className="space-y-3">
          {alerts.length === 0 && (
            <p className="rounded-lg border border-white/[0.06] bg-[#182330] p-6 text-center text-sm !text-white/35">
              No alerts right now.
            </p>
          )}

          {alerts.map((alert) => {
            const Icon = iconByKind[alert.kind];
            const unread = !readIds.includes(alert.id);
            return (
              <article
                key={alert.id}
                role="button"
                tabIndex={0}
                onClick={() => openAlert(alert)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openAlert(alert);
                  }
                }}
                className={`group flex cursor-pointer items-start gap-4 rounded-lg border bg-[#182330] p-5 shadow-xl transition hover:bg-[#1c2836] focus:outline-none focus:ring-2 focus:ring-coral/50 ${
                  unread ? "border-coral/30" : "border-white/[0.06]"
                }`}
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-md bg-coral/15 text-coral">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black !text-white">{alert.title}</p>
                    {unread && (
                      <span className="rounded-full bg-coral/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide !text-coral">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed !text-white/50">{alert.body}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {unread && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReadIds([...readIds, alert.id]);
                      }}
                      className="text-[10px] font-black uppercase tracking-wide !text-white/40 transition hover:!text-coral"
                    >
                      Mark read
                    </button>
                  )}
                  <ChevronRight className="size-4 !text-white/25 transition group-hover:!text-coral" />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
