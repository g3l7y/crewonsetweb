import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Crew On Set! Admin" },
      { name: "description", content: "Review studio alerts, pending applications, and ad status changes." },
      { property: "og:title", content: "Notifications — Crew On Set! Admin" },
      { property: "og:description", content: "Review studio alerts, pending applications, and ad status changes." },
    ],
  }),
  component: NotificationsPage,
});

import { useMemo } from "react";
import { CheckCheck, ChevronRight, FileText, Megaphone, ServerCog } from "lucide-react";
import { useRouter } from "@/components/next-compat/navigation";
import {
  adsStore,
  alertReadStore,
  applicationsStore,
  bugReportsStore,
  playerReportsStore,
} from "@/lib/demo/store";
import { buildAlerts, type AdminAlert } from "@/components/admin/admin-alerts";

const iconByKind: Record<AdminAlert["kind"], typeof FileText> = {
  application: FileText,
  ad: Megaphone,
  system: ServerCog,
};

function NotificationsPage() {
  const [applications] = applicationsStore.useStore();
  const [ads] = adsStore.useStore();
  const [bugs] = bugReportsStore.useStore();
  const [playerReports] = playerReportsStore.useStore();
  const [readIds, setReadIds] = alertReadStore.useStore();
  const router = useRouter();

  const alerts = useMemo(
    () => buildAlerts(applications, ads, bugs, playerReports),
    [applications, ads, bugs, playerReports],
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
          <p className="text-xs font-black tracking-[.18em] !text-coral">STUDIO</p>
          <h1 className="admin-heading mt-2 !text-white">Notifications</h1>
          <p className="admin-kicker !text-white/45">
            Pending applications, advertisement status changes, and system alerts.
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
    </div>
  );
}
