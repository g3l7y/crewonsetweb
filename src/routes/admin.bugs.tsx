import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/bugs")({
  head: () => ({
    meta: [
      { title: "Bug Reports — Crew On Set! Admin" },
      { name: "description", content: "Triage and resolve player-submitted bug reports." },
      { property: "og:title", content: "Bug Reports — Crew On Set! Admin" },
      { property: "og:description", content: "Triage and resolve player-submitted bug reports." },
    ],
  }),
  component: BugReportsPage,
});

import { useMemo, useState } from "react";
import { Bug, Eye, Search, Trash2, X } from "lucide-react";
import {
  bugCategories,
  bugReportsStore,
  deleteSharedRecords,
  deleteSharedRecord,
  reportStatusColors,
  updateSharedRecord,
  logAdminActivity,
  type BugReport,
  type BugStatus,
} from "@/lib/demo/store";

const statusOptions: BugStatus[] = ["New", "Investigating", "Resolved"];

const statusStyles: Record<BugStatus, string> = {
  New: "bg-[#d9a514]/15 text-[#f3c747]",
  Investigating: "bg-[#c96a2d]/15 text-[#f39a5a]",
  Resolved: "bg-[#2d9d8f]/15 text-[#4bc4b4]",
};

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function BugReportsPage() {
  const [bugs, setBugs] = bugReportsStore.useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("All Statuses");
  const [viewBug, setViewBug] = useState<BugReport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BugReport | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<BugReport[] | null>(null);
  const [databaseError, setDatabaseError] = useState(false);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return bugs.filter((bug) => {
      const matchesSearch =
        !search ||
        `${bug.playerName} ${bug.playerId} ${bug.description} ${bug.id}`
          .toLowerCase()
          .includes(search);
      const matchesCategory = category === "All Categories" || bug.category === category;
      const matchesStatus = status === "All Statuses" || bug.status === status;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [bugs, query, category, status]);

  async function updateStatus(bug: BugReport, next: BugStatus) {
    const updated = { ...bug, status: next };
    if (!(await updateSharedRecord("cos.bugReports", updated))) return;
    setBugs((current) => current.map((b) => (b.id === bug.id ? updated : b)));
    logAdminActivity({
      kind: "bug",
      label: "Bug report status updated",
      detail: `${bug.id} (${bug.playerName}) marked as ${next}.`,
    });
  }

  async function deleteBug(bug: BugReport) {
    setDatabaseError(false);
    if (!(await deleteSharedRecord("cos.bugReports", bug.id))) {
      setDatabaseError(true);
      return;
    }
    setBugs((current) => current.filter((b) => b.id !== bug.id));
    logAdminActivity({ kind: "bug", label: "Bug report deleted", detail: `${bug.id} (${bug.playerName}) was removed.` });
    setDeleteTarget(null);
  }

  function deleteSelected() {
    const targets = filtered.filter((bug) => selectedIds.includes(bug.id));
    if (targets.length) setBulkDeleteTarget(targets);
  }

  async function confirmBulkDelete() {
    if (!bulkDeleteTarget) return;
    setDatabaseError(false);
    const deleted = await deleteSharedRecords("cos.bugReports", bulkDeleteTarget.map((bug) => bug.id));
    if (!deleted) {
      setDatabaseError(true);
      return;
    }
    const ids = new Set(bulkDeleteTarget.map((bug) => bug.id));
    setBugs((current) => current.filter((bug) => !ids.has(bug.id)));
    setSelectedIds([]);
    logAdminActivity({ kind: "bug", label: "Bug reports bulk deleted", detail: `${bulkDeleteTarget.length} reports were removed.` });
    setBulkDeleteTarget(null);
  }

  return (
    <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
      <header className="mb-8">
        <p className="text-xs font-black tracking-[.18em] !text-coral">SUPPORT</p>
        <h1 className="admin-heading mt-2 !text-white">Bug Reports</h1>
        <p className="admin-kicker !text-white/45">
          Review player-submitted issues and track triage status.
        </p>
      </header>

      {databaseError && (
        <div role="alert" className="mb-4 rounded-lg border border-[#ff6248]/40 bg-[#ff6248]/10 px-4 py-3 text-xs font-bold text-[#ff9a8a]">
          <span className="font-black uppercase tracking-wide">Database error</span>
          <span className="ml-2">Could not delete this report. Please check the database permissions or connection. See the browser console for details.</span>
        </div>
      )}

      {/* FILTERS */}
      <section className="admin-card mb-4 flex flex-col gap-3 rounded-lg border border-white/[0.06] bg-[#182330] p-4 shadow-xl sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 !text-white/30" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by player, ID, or description"
            className="admin-input h-11 w-full rounded-md border border-white/10 bg-[#101923] pl-10 pr-3 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
          />
        </label>

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="admin-input h-11 rounded-md border border-white/10 bg-[#101923] px-3 text-sm font-bold !text-white outline-none focus:border-coral"
        >
          <option>All Categories</option>
          {bugCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="admin-input h-11 rounded-md border border-white/10 bg-[#101923] px-3 text-sm font-bold !text-white outline-none focus:border-coral"
        >
          <option>All Statuses</option>
          {statusOptions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </section>

      <div className="mb-3 flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#182330] px-4 py-3"><label className="flex items-center gap-3 text-xs font-bold uppercase text-white/60"><input type="checkbox" checked={filtered.length > 0 && selectedIds.length === filtered.length} onChange={(event) => setSelectedIds(event.target.checked ? filtered.map((bug) => bug.id) : [])} /> Select all <span className="text-coral">{selectedIds.length} selected</span></label><button type="button" disabled={!selectedIds.length} onClick={deleteSelected} className="inline-flex items-center gap-2 rounded-md bg-coral px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-30"><Trash2 className="size-3.5" /> Delete selected</button></div>

      {/* TABLE */}
      <section className="admin-table-wrap overflow-hidden rounded-lg border border-white/[0.06] bg-[#182330] shadow-xl">
        <div className="overflow-x-auto">
          <table className="admin-table min-w-[880px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#141e29]">
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                  Player
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                  Category
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                  Description
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                  Submitted
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                  Status
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bug) => (
                <tr
                  key={bug.id}
                  className="border-b border-white/[0.05] transition hover:bg-white/[0.025] last:border-0"
                >
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><input type="checkbox" checked={selectedIds.includes(bug.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, bug.id] : current.filter((id) => id !== bug.id))} aria-label={`Select ${bug.id}`} />
                    <div><p className="font-bold !text-white">{bug.playerName}</p>
                    <p className="mt-0.5 text-[10px] !text-white/30">{bug.playerId}</p></div></div>
                  </td>
                  <td className="px-5 py-4 text-sm !text-white/60">{bug.category}</td>
                  <td className="px-5 py-4 text-sm !text-white/50">
                    <p className="max-w-xs truncate">{bug.description}</p>
                  </td>
                  <td className="px-5 py-4 text-xs !text-white/40">
                    {formatDate(bug.submittedAt)}
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={bug.status}
                      onChange={(event) => updateStatus(bug, event.target.value as BugStatus)}
                      className={`rounded px-2.5 py-1.5 text-[10px] font-black uppercase outline-none ${statusStyles[bug.status]}`} style={{ color: reportStatusColors[bug.status] }}
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s} className="bg-[#101923] text-white">
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewBug(bug)}
                        title="View details"
                        aria-label="View details"
                        className="grid size-8 place-items-center rounded-md border border-white/10 !text-white/60 transition hover:border-coral hover:!text-white"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(bug)}
                        title="Delete report"
                        aria-label="Delete report"
                        className="grid size-8 place-items-center rounded-md border border-white/10 !text-white/60 transition hover:border-coral hover:!text-coral"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Bug className="mx-auto size-8 !text-white/20" />
                    <p className="mt-2 text-sm font-bold !text-white/40">No bug reports found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* VIEW DETAILS MODAL */}
      {viewBug && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setViewBug(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#151c28] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-black uppercase text-white">{viewBug.id}</h3>
              <button onClick={() => setViewBug(null)} className="!text-white/40 hover:!text-white">
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-3 text-xs font-black uppercase tracking-wide !text-white/35">Player</p>
            <p className="text-sm !text-white/80">
              {viewBug.playerName} ({viewBug.playerId})
            </p>
            <p className="mt-3 text-xs font-black uppercase tracking-wide !text-white/35">
              Category
            </p>
            <p className="text-sm !text-white/80">{viewBug.category}</p>
            <p className="mt-3 text-xs font-black uppercase tracking-wide !text-white/35">
              Submitted
            </p>
            <p className="text-sm !text-white/80">{formatDate(viewBug.submittedAt)}</p>
            <p className="mt-3 text-xs font-black uppercase tracking-wide !text-white/35">
              Description
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm !text-white/70">{viewBug.description}</p>
            {viewBug.attachmentUrl ? (
              <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-3">
                {viewBug.attachmentType?.startsWith("image/") ||
                viewBug.attachmentUrl.startsWith("data:image/") ? (
                  <img
                    src={viewBug.attachmentUrl}
                    alt={viewBug.attachmentName || "Bug report attachment"}
                    className="max-h-72 w-full rounded object-contain"
                  />
                ) : (
                  <iframe
                    src={viewBug.attachmentUrl}
                    title={viewBug.attachmentName || "Bug report PDF attachment"}
                    className="h-72 w-full rounded bg-white"
                  />
                )}
                <a
                  href={viewBug.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-coral/40 px-3 py-2 text-[10px] font-black uppercase text-coral hover:bg-coral hover:text-white"
                >
                  Open attached file
                </a>
              </div>
            ) : viewBug.attachmentName ? (
              <p className="mt-4 rounded-md border border-white/10 bg-white/[.03] px-3 py-2 text-xs !text-white/40">
                Attachment “{viewBug.attachmentName}” was submitted before file content was
                retained.
              </p>
            ) : null}
          </div>
        </div>
      )}

      {bulkDeleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-sm rounded-xl border border-[#ff6248]/40 bg-[#151c28] p-6 shadow-2xl"><h3 className="text-lg font-black uppercase text-white">Delete Selected Bug Reports?</h3>{bulkDeleteTarget.some((bug) => bug.status === "New" || bug.status === "Investigating") && <p className="mt-3 rounded border border-[#f3c747]/40 bg-[#d9a514]/10 p-3 text-sm font-bold text-[#f3c747]">Warning: You are about to delete reports that are still New or Investigating. These reports have not been fully resolved.</p>}<p className="mt-3 text-sm text-white/50">This permanently removes {bulkDeleteTarget.length} reports.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setBulkDeleteTarget(null)} className="rounded-md border border-white/10 px-4 py-2 text-xs font-bold text-white/60">Cancel</button><button onClick={confirmBulkDelete} className="rounded-md bg-[#ff6248] px-4 py-2 text-xs font-black uppercase text-white">Confirm Delete</button></div></div></div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[#ff6248]/40 bg-[#151c28] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-black uppercase text-white">Delete Bug Report?</h3>
            <p className="mt-3 text-sm text-white/50">
              This permanently removes {deleteTarget.id} from the queue. This action cannot be
              undone in this demo session.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-white/10 px-4 py-2 text-xs font-bold text-white/60 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteBug(deleteTarget)}
                className="rounded-md bg-[#ff6248] px-4 py-2 text-xs font-black uppercase text-white transition hover:bg-[#e5533b]"
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
