import type { BugReport, PlayerReport } from "@/lib/demo/store";
import type { TopUpRecord } from "@/lib/admin-demo-data";

export type AdminAlert = {
  id: string;
  title: string;
  body: string;
  kind: "bug" | "player-report" | "transaction";
  /** In-app destination this alert links to when clicked. */
  href: string;
  /** Used to keep the bell and the full Notifications page in newest-first order. */
  createdAt: string;
};

const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

function transactionTimestamp(transaction: TopUpRecord) {
  if (transaction.timestamp) return transaction.timestamp;
  if (transaction.date && transaction.time) {
    return transaction.date + "T" + transaction.time + ":00.000Z";
  }
  return transaction.date ? transaction.date + "T00:00:00.000Z" : "";
}

export function buildAlerts(
  bugs: BugReport[] = [],
  playerReports: PlayerReport[] = [],
  transactions: TopUpRecord[] = [],
): AdminAlert[] {
  const alerts: AdminAlert[] = [];

  bugs.forEach((bug) => {
    alerts.push({
      id: "bug-" + bug.id,
      title: "New bug report submitted",
      body: bug.id + " from " + bug.playerName + ": " + bug.description,
      kind: "bug",
      href: "/admin/bugs",
      createdAt: bug.submittedAt,
    });
  });

  playerReports.forEach((report) => {
    alerts.push({
      id: "player-report-" + report.id,
      title: "New player report submitted",
      body: report.id + ": " + report.reporterName + " reported " + report.reportedUsername + ".",
      kind: "player-report",
      href: "/admin/player-reports",
      createdAt: report.submittedAt,
    });
  });

  transactions
    .filter((transaction) => transaction.status === "Completed")
    .forEach((transaction) => {
      const brandPayment = transaction.bank.toLowerCase().includes("brand partnership");
      alerts.push({
        id: "transaction-" + transaction.id,
        title: brandPayment ? "Brand payment received" : "Player C-Coin top-up received",
        body:
          transaction.playerName +
          " completed a " +
          phpFormatter.format(transaction.amount) +
          " payment.",
        kind: "transaction",
        href: brandPayment ? "/admin/partnerships" : "/admin/transactions",
        createdAt: transactionTimestamp(transaction),
      });
    });

  return alerts.sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}
