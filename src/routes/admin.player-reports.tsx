import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/player-reports")({
  head: () => ({
    meta: [
      { title: "Player Reports — Crew On Set! Admin" },
      { name: "description", content: "Review player-submitted reports." },
    ],
  }),
  component: PlayerReportsRouteComponent,
});

import { useMemo, useState } from "react";
import { Eye, FileText, Search, Trash2, UserRound, X, Check, Ban } from "lucide-react";
import { ReportStatusDropdown } from "@/components/admin/report-status-dropdown";
import { isMockMode } from "@/lib/playfab/config";
import { buildReportStatusMessage } from "@/lib/report-investigation-message";
import {
  canAdvanceReportStatus,
  addReportFeedback,
  deleteSharedRecords,
  deleteSharedRecord,
  logAdminActivity,
  playerReportsStore,
  playerReportTypes,
  updateSharedRecord,
  addMockPlayerAccountMessage,
  type PlayerReport,
  type PlayerReportStatus,
} from "@/lib/demo/store";
import { setMockPlayerAdminStatus } from "@/lib/playfab/mock-provider";
import { QUERY_KEYS } from "@/lib/playfab/hooks";

const statuses: PlayerReportStatus[] = ["New", "Investigating", "Resolved"];
type AppealStatus = "Pending" | "Approved" | "Denied";
const mockMode = isMockMode();
function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function PlayerReportsRouteComponent() {
  const queryClient = useQueryClient();
  const [reports, setReports] = playerReportsStore.useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState<"All Statuses" | PlayerReportStatus | AppealStatus>("All Statuses");
  const [selected, setSelected] = useState<PlayerReport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlayerReport | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<PlayerReport[] | null>(null);
  const [statusError, setStatusError] = useState("");
  const [appealBusy, setAppealBusy] = useState(false);
  const [appealNotes, setAppealNotes] = useState("");
  const [appealEmailWarning, setAppealEmailWarning] = useState("");
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return reports.filter(
      (report) =>
        (!search ||
          `${report.id} ${report.reporterName} ${report.reportedUsername} ${report.reportType} ${report.description}`
            .toLowerCase()
            .includes(search)) &&
        (category === "All Categories" || report.reportType === category) &&
        (status === "All Statuses" || (report.banAppeal ? report.appealStatus === status : report.status === status)),
    );
  }, [reports, query, category, status]);

  async function updateStatus(report: PlayerReport, next: PlayerReportStatus) {
    if (!canAdvanceReportStatus(report.status, next)) return;
    setStatusError("");
    const updated = { ...report, status: next };
    if (!(await updateSharedRecord("cos.playerReports", updated, setStatusError))) return;
    setReports((current) => current.map((item) => (item.id === report.id ? updated : item)));
    if (selected?.id === report.id) setSelected(updated);
    logAdminActivity({ kind: "player-report", label: "Player report status updated", detail: `${report.id} marked as ${next}.` });
    if (mockMode && report.status !== next) {
      const message = buildReportStatusMessage({
        kind: "player",
        reportId: report.id,
        category: report.reportType,
        status: next,
      });
      addReportFeedback({
        recipientUsername: report.reporterName,
        recipientPlayerId: report.reporterId,
        reportId: report.id,
        status: next,
        subject: message.subject,
        body: message.body,
      });
    }
  }

  async function reviewBanAppeal(report: PlayerReport, decision: AppealStatus) {
    if (!report.banAppeal || report.appealStatus !== "Pending") return;
    setStatusError("");
    setAppealEmailWarning("");
    setAppealBusy(true);
    const updated = {
      ...report,
      status: "Resolved" as const,
      appealStatus: decision,
      decidedAt: new Date().toISOString(),
      ...(appealNotes.trim() ? { adminNotes: appealNotes.trim() } : {}),
    };
    try {
      if (mockMode) {
        if (decision === "Approved") setMockPlayerAdminStatus("Active");
        const resultText = decision === "Approved"
          ? "Your appeal was approved and your account ban has been lifted. Your account is active again, and you can sign in to the website and game."
          : `Your ban appeal was reviewed and denied. Your account remains banned, and you cannot sign in while the ban is active.${report.banEndsAt ? ` You can sign in after ${new Date(report.banEndsAt).toLocaleString()}.` : " This is a permanent ban unless an administrator restores access."}${appealNotes.trim() ? ` Admin note: ${appealNotes.trim()}` : ""}`;
        addMockPlayerAccountMessage({
          subject: decision === "Approved" ? "Your Crew On Set ban appeal was approved" : "Update on your Crew On Set ban appeal",
          body: `Hello CAMERA_PRO, ${resultText}`,
          noticeTitle: decision === "Approved" ? "Appeal approved" : "Appeal denied",
          noticeBody: decision === "Approved" ? "Your account is active again. Open your Inbox for details." : "Your account remains banned. Open your Inbox for details.",
        });
      } else {
        const response = await fetch("/api/admin/player-reports", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: report.id, appealDecision: decision, adminNotes: appealNotes.trim() }),
        });
        const result = await response.json().catch(() => ({})) as { error?: string; emailWarning?: string };
        if (!response.ok) throw new Error(result.error || "The appeal decision could not be saved.");
        if (result.emailWarning) setAppealEmailWarning(result.emailWarning);
        if (decision === "Approved") {
          const refreshResponse = await fetch("/api/admin/players", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "refresh" }),
          });
          if (!refreshResponse.ok) setAppealEmailWarning("The appeal was approved, but the player list may take a short time to refresh.");
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminPlayers });
        }
      }
      setReports((current) => current.map((item) => item.id === report.id ? updated : item));
      setSelected(updated);
      setAppealNotes("");
      logAdminActivity({ kind: "player-report", label: `Ban appeal ${decision.toLowerCase()}`, detail: `${report.reporterName}'s ban appeal was ${decision.toLowerCase()}.` });
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "The appeal decision could not be saved.");
    } finally {
      setAppealBusy(false);
    }
  }

  async function deleteReport(report: PlayerReport) {
    if (!(await deleteSharedRecord("cos.playerReports", report.id))) return;
    setReports((current) => current.filter((item) => item.id !== report.id));
    setSelected((current) => (current?.id === report.id ? null : current));
    setDeleteTarget(null);
    logAdminActivity({ kind: "player-report", label: "Player report deleted", detail: `${report.id} was removed from the queue.` });
  }

  function deleteSelected() {
    const targets = filtered.filter((report) => selectedIds.includes(report.id));
    if (targets.length) setBulkDeleteTarget(targets);
  }

  async function confirmBulkDelete() {
    if (!bulkDeleteTarget) return;
    const deleted = await deleteSharedRecords("cos.playerReports", bulkDeleteTarget.map((report) => report.id));
    if (!deleted) return;
    const ids = new Set(bulkDeleteTarget.map((report) => report.id));
    setReports((current) => current.filter((report) => !ids.has(report.id)));
    setSelectedIds([]);
    logAdminActivity({ kind: "player-report", label: "Player reports bulk deleted", detail: `${bulkDeleteTarget.length} reports were removed.` });
    setBulkDeleteTarget(null);
  }

  return (
    <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
      <header className="mb-8">
        <h1 className="admin-heading !text-white">Player Reports</h1>
        <p className="admin-kicker !text-white/45">
          Review player reports and ban appeals from account holders.
        </p>
      </header>
      {statusError && (
        <div role="alert" className="mb-4 rounded-lg border border-[#ff6248]/40 bg-[#ff6248]/10 px-4 py-3 text-xs font-bold text-[#ff9a8a]">
          {statusError}
        </div>
      )}
      <section className="admin-card mb-4 flex flex-col gap-3 rounded-lg border border-white/[0.06] bg-[#182330] p-4 shadow-xl sm:flex-row">
        <label className="relative block flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 !text-white/30" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reports, players, or descriptions"
            className="admin-input h-11 w-full rounded-md border border-white/10 bg-[#101923] pl-10 pr-3 text-sm font-bold !text-white outline-none placeholder:!text-white/25 focus:border-coral"
          />
        </label>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="admin-input h-11 rounded-md border border-white/10 bg-[#101923] px-3 text-sm font-bold !text-white outline-none focus:border-coral"
        >
          <option>All Categories</option>
          {[...playerReportTypes.filter((item) => item !== "Other"), "Ban Appeal", "Other"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          className="admin-input h-11 rounded-md border border-white/10 bg-[#101923] px-3 text-sm font-bold !text-white outline-none focus:border-coral"
        >
          <option>All Statuses</option>
          {statuses.map((item) => (
            <option key={item}>{item}</option>
          ))}
          <option>Pending</option>
          <option>Approved</option>
          <option>Denied</option>
        </select>
      </section>
      <div className="mb-3 flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#182330] px-4 py-3"><label className="flex items-center gap-3 text-xs font-bold uppercase text-white/60"><input type="checkbox" checked={filtered.length > 0 && selectedIds.length === filtered.length} onChange={(event) => setSelectedIds(event.target.checked ? filtered.map((report) => report.id) : [])} /> Select all <span className="text-coral">{selectedIds.length} selected</span></label><button type="button" disabled={!selectedIds.length} onClick={deleteSelected} className="inline-flex items-center gap-2 rounded-md bg-coral px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-30"><Trash2 className="size-3.5" /> Delete selected</button></div>
      <section className="admin-filter-results-card admin-filter-results-card--reports admin-table-wrap overflow-hidden rounded-lg border border-white/[0.06] bg-[#182330] shadow-xl">
        <div className="admin-filter-results-scroll overflow-x-auto">
          <table className="admin-table min-w-[1050px] w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#141e29]">
                {[
                  "Report",
                  "Reporter",
                  "Reported Player",
                  "Type",
                  "Description",
                  "Submitted",
                  "Status",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((report) => (
                <tr key={report.id} className="border-b border-white/[0.05] hover:bg-white/[0.025]">
                  <td className="px-5 py-4 text-xs font-black !text-coral"><div className="flex items-center gap-3"><input type="checkbox" checked={selectedIds.includes(report.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, report.id] : current.filter((id) => id !== report.id))} aria-label={`Select ${report.id}`} />{report.id}</div></td>
                  <td className="px-5 py-4">
                    <p className="font-bold !text-white">{report.reporterName}</p>
                    <p className="text-[10px] !text-white/30">{report.reporterId}</p>
                  </td>
                  <td className="px-5 py-4 text-sm !text-white/70">{report.reportedUsername}</td>
                  <td className="px-5 py-4 text-sm !text-white/60">{report.reportType}</td>
                  <td className="max-w-xs px-5 py-4 text-sm !text-white/50">
                    <p className="truncate">{report.description}</p>
                  </td>
                  <td className="px-5 py-4 text-xs !text-white/40">
                    {formatDate(report.submittedAt)}
                  </td>
                  <td className="px-5 py-4">
                    {report.banAppeal ? (
                      <span className={`inline-flex rounded-full bg-white/[.06] px-3 py-1 text-[10px] font-black uppercase ${report.appealStatus === "Approved" ? "text-emerald-400" : report.appealStatus === "Denied" ? "text-red-400" : "text-yellow-300"}`}>
                        {report.appealStatus || "Pending"}
                      </span>
                    ) : (
                      <ReportStatusDropdown
                        value={report.status}
                        enforceForwardOnly
                        onChange={(next) => updateStatus(report, next as PlayerReportStatus)}
                      />
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelected(report)}
                        aria-label={`View ${report.id}`}
                        className="grid size-8 place-items-center rounded-md border border-white/10 !text-white/60 hover:border-coral hover:!text-white"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(report)}
                        aria-label={`Delete ${report.id}`}
                        className="grid size-8 place-items-center rounded-md border border-white/10 !text-white/60 hover:border-coral hover:!text-coral"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm !text-white/35">
                    <UserRound className="mx-auto mb-2 size-8 !text-white/20" />
                    No player reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {selected && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#151c28] shadow-2xl"
            style={{ maxWidth: "32rem" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-5 py-4">
              <h2 className="text-lg font-black uppercase text-white">{selected.id}</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close report details"
                className="grid size-8 shrink-0 place-items-center rounded-full text-white/55 hover:bg-white/10 hover:text-white"
              >
                <X className="size-5 text-white/40" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-black uppercase text-white/35">Reporter</dt>
                <dd className="mt-1 text-sm text-white/80">
                  {selected.reporterName} ({selected.reporterId})
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase text-white/35">{selected.banAppeal ? "Account" : "Reported player"}</dt>
                <dd className="mt-1 text-sm text-white/80">{selected.reportedUsername}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase text-white/35">Report type</dt>
                <dd className="mt-1 text-sm text-white/80">{selected.reportType}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase text-white/35">Submitted</dt>
                <dd className="mt-1 text-sm text-white/80">{formatDate(selected.submittedAt)}</dd>
              </div>
              {selected.banAppeal && <>
                <div>
                  <dt className="text-[10px] font-black uppercase text-white/35">Verified email</dt>
                  <dd className="mt-1 text-sm text-white/80">{selected.verifiedEmail || "Demo account"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-black uppercase text-white/35">Ban period</dt>
                  <dd className="mt-1 text-sm text-white/80">{formatDate(selected.banStartsAt || "")} to {selected.banEndsAt ? formatDate(selected.banEndsAt) : "Permanent"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-black uppercase text-white/35">Appeal status</dt>
                  <dd className={`mt-1 text-sm font-black ${selected.appealStatus === "Approved" ? "text-emerald-400" : selected.appealStatus === "Denied" ? "text-red-400" : "text-yellow-300"}`}>{selected.appealStatus || "Pending"}</dd>
                </div>
              </>}
            </dl>
            <p className="mt-5 text-[10px] font-black uppercase text-white/35">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
              {selected.description}
            </p>
            {selected.attachmentUrl ? (
              <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-3">
                {selected.attachmentType?.startsWith("image/") ||
                selected.attachmentUrl.startsWith("data:image/") ? (
                  <img
                    src={selected.attachmentUrl}
                    alt={selected.attachmentName || "Player report attachment"}
                    className="max-h-60 w-full rounded object-contain"
                  />
                ) : (
                  <iframe
                    src={selected.attachmentUrl}
                    title={selected.attachmentName || "Player report PDF"}
                    className="h-60 w-full rounded bg-white"
                  />
                )}
                <a
                  href={selected.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-coral/40 px-3 py-2 text-[10px] font-black uppercase text-coral hover:bg-coral hover:text-white"
                >
                  <FileText className="size-3.5" />
                  Open attached file
                </a>
              </div>
            ) : selected.attachmentName ? (
              <p className="mt-5 rounded border border-white/10 p-3 text-xs text-white/40">
                Attachment “{selected.attachmentName}” has no retained file content.
              </p>
            ) : null}
            {selected.banAppeal && selected.appealStatus === "Pending" && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <label className="block text-[10px] font-black uppercase tracking-wide text-white/40">Admin note (optional)
                  <textarea value={appealNotes} onChange={(event) => setAppealNotes(event.target.value)} maxLength={1000} rows={3} className="mt-2 w-full rounded-md border border-white/10 bg-[#0c121c] p-3 text-sm font-normal text-white outline-none focus:border-coral" placeholder="Add a short note for the player" />
                </label>
                {appealEmailWarning && <p className="mt-2 text-xs text-yellow-300">{appealEmailWarning}</p>}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button type="button" disabled={appealBusy} onClick={() => void reviewBanAppeal(selected, "Denied")} className="inline-flex items-center gap-2 rounded-md border border-red-400/40 px-3 py-2 text-xs font-black uppercase text-red-300 hover:bg-red-400/10 disabled:opacity-50"><Ban className="size-3.5" /> Deny appeal</button>
                  <button type="button" disabled={appealBusy} onClick={() => { if (window.confirm("Approve this appeal and restore the player's account access?")) void reviewBanAppeal(selected, "Approved"); }} className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-3 py-2 text-xs font-black uppercase text-[#0b111a] hover:bg-emerald-400 disabled:opacity-50"><Check className="size-3.5" /> Approve and restore access</button>
                </div>
              </div>
            )}
            {selected.banAppeal && selected.appealStatus !== "Pending" && selected.adminNotes && <p className="mt-5 rounded-lg bg-white/[.04] p-3 text-sm text-white/65"><strong className="text-white">Admin note:</strong> {selected.adminNotes}</p>}
            </div>
          </div>
        </div>
      )}
      {bulkDeleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-sm rounded-xl border border-[#ff6248]/40 bg-[#151c28] p-6 shadow-2xl"><h2 className="text-lg font-black uppercase text-white">Delete Selected Player Reports?</h2>{bulkDeleteTarget.some((report) => report.status === "New" || report.status === "Investigating") && <p className="mt-3 rounded border border-[#f3c747]/40 modal-backdrop p-3 text-sm font-bold text-[#f3c747]">Warning: You are about to delete reports that are still New or Investigating. These reports have not been fully resolved.</p>}<p className="mt-3 text-sm text-white/50">This permanently removes {bulkDeleteTarget.length} reports.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setBulkDeleteTarget(null)} className="rounded-md border border-white/10 px-4 py-2 text-xs font-bold text-white/60">Cancel</button><button onClick={confirmBulkDelete} className="rounded-md bg-[#ff6248] px-4 py-2 text-xs font-black uppercase text-white">Confirm Delete</button></div></div></div>
      )}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[#ff6248]/40 bg-[#151c28] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-black uppercase text-white">Delete Player Report?</h2>
            <p className="mt-3 text-sm text-white/50">
              This permanently removes {deleteTarget.id} from the queue. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-white/10 px-4 py-2 text-xs font-bold text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteReport(deleteTarget)}
                className="rounded-md bg-[#ff6248] px-4 py-2 text-xs font-black uppercase text-white hover:bg-[#e5533b]"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerReportsRouteComponent;
