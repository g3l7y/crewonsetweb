import type {
  ActiveAd,
  AdminActivity,
  BugReport,
  PartnershipApplication,
  PlayerReport,
} from "@/lib/demo/store";
import { sortNewestFirst } from "@/lib/validation";

export type AdminAlert = {
  id: string;
  title: string;
  body: string;
  kind: "application" | "ad" | "system" | "activity";
  /** In-app destination this alert links to when clicked. */
  href: string;
  /** Used to keep the bell and the full Notifications page in newest-first order. */
  createdAt?: string;
};

function activityHref(kind: AdminActivity["kind"]) {
  switch (kind) {
    case "player":
      return "/admin/players";
    case "bug":
      return "/admin/bugs";
    case "almanac":
      return "/admin";
    case "game":
    case "announcement":
    case "news":
    case "gallery":
    default:
      return "/admin/game";
  }
}

export function buildAlerts(
  applications: PartnershipApplication[],
  ads: ActiveAd[],
  bugs: BugReport[] = [],
  playerReports: PlayerReport[] = [],
  activity: AdminActivity[] = [],
  includeServerStatus = true,
): AdminAlert[] {
  const alerts: AdminAlert[] = [];

  applications
    .filter((application) => application.status === "Pending")
    .slice(0, 5)
    .forEach((application) => {
      alerts.push({
        id: `app-${application.id}`,
        title: "New partnership application",
        body: `${application.brand} submitted a proposal awaiting review.`,
        kind: "application",
        href: "/admin/partnerships",
        createdAt: application.submittedAt,
      });
    });

  bugs.forEach((bug) => {
    alerts.push({
      id: `bug-${bug.id}`,
      title: "New bug report submitted",
      body: `${bug.id} from ${bug.playerName}: ${bug.description}`,
      kind: "system",
      href: "/admin/bugs",
      createdAt: bug.submittedAt,
    });
  });

  playerReports.forEach((report) => {
    alerts.push({
      id: `player-report-${report.id}`,
      title: "New player report submitted",
      body: `${report.id}: ${report.reporterName} reported ${report.reportedUsername}.`,
      kind: "system",
      href: "/admin/player-reports",
      createdAt: report.submittedAt,
    });
  });

  ads
    .filter((ad) => ad.status === "Expiring" || ad.status === "Expired")
    .forEach((ad) => {
      alerts.push({
        id: `ad-${ad.id}`,
        title: ad.status === "Expired" ? "Advertisement expired" : "Advertisement expiring soon",
        body: `${ad.brand} — ${ad.exactModel} (${ad.status}).`,
        kind: "ad",
        href: `/admin/ads/${ad.id}`,
        createdAt: ad.endedAt ?? ad.expiresAt,
      });
    });

  activity.forEach((entry) => {
    alerts.push({
      id: `activity-${entry.id}`,
      title: entry.label,
      body: entry.detail,
      kind: "activity",
      href: activityHref(entry.kind),
      createdAt: entry.createdAt,
    });
  });

  if (includeServerStatus) {
    alerts.push({
      id: "sys-1",
      title: "Server status: Operational",
      body: "All studio servers reporting healthy uptime — 99.98% (30d).",
      kind: "system",
      href: "/admin",
      createdAt: "2026-08-30T15:00:00.000Z",
    });
  }

  return activity.length > 0 ? sortNewestFirst(alerts, (alert) => alert.createdAt) : alerts;
}
