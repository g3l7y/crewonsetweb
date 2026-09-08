import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/partnerships")({
  head: () => ({
    meta: [
      { title: "Partnerships & Ads — Crew On Set! Admin" },
      {
        name: "description",
        content: "Review brand partnership applications and monitor active advertisements.",
      },
    ],
  }),
  component: PartnershipsPage,
});

import { useMemo, useState } from "react";
import {
  Banknote,
  CalendarClock,
  Eye,
  FileText,
  HandCoins,
  Link2,
  Mail,
  MailCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  adsStore,
  applicationsStore,
  deleteSharedRecord,
  deleteSharedRecords,
  updateSharedRecord,
  partnershipStatusColors,
  revenueStore,
  formatMoney,
  uid,
  type ActiveAd,
  type PartnershipApplication,
  type PartnershipStatus,
} from "@/lib/demo/store";

const statuses: PartnershipStatus[] = ["Pending", "Approved", "On-going", "Done", "Declined"];

const statusStyles: Record<PartnershipStatus, string> = {
  Pending: "bg-[#d9a514]/15 text-[#e1b42b]",
  Approved: "bg-[#2d9d8f]/15 text-[#4bc4b4]",
  "On-going": "bg-[#3a7bd5]/15 text-[#7cb0ee]",
  Done: "bg-white/[.08] text-white/50",
  Declined: "bg-coral/15 text-[#ff7663]",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PartnershipsPage() {
  const [applications, setApplications] = applicationsStore.useStore();
  const [selected, setSelected] = useState<PartnershipApplication | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | PartnershipStatus>("All");
  const [emailConfirmation, setEmailConfirmation] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PartnershipApplication | null>(null);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<PartnershipApplication[] | null>(null);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);

  const [ads, setAds] = adsStore.useStore();
  const [revenue, setRevenue] = revenueStore.useStore();
  const filteredAds: ActiveAd[] = [];
  const adSummaries: never[] = [];
  const adStatusOptions: ActiveAd["status"][] = [];
  const [adStatusFilter, setAdStatusFilter] = useState<ActiveAd["status"]>("On-going");

  const filtered = useMemo(
    () =>
      (statusFilter === "All" ? applications : applications.filter((a) => a.status === statusFilter)).filter((a) => !a.archived),
    [applications, statusFilter],
  );

  async function deleteApplication(app: PartnershipApplication) {
    if (!(await deleteSharedRecord("cos.applications", app.id))) return;
    setApplications((current) => current.filter((item) => item.id !== app.id));
    setSelected((current) => current?.id === app.id ? null : current);
    setSelectedApplicationIds((current) => current.filter((id) => id !== app.id));
    setDeleteTarget(null);
  }

  function requestDeleteSelected() {
    const targets = filtered.filter((item) => selectedApplicationIds.includes(item.id));
    if (targets.length) setBulkDeleteTarget(targets);
  }

  async function confirmBulkDelete() {
    if (!bulkDeleteTarget) return;
    const ids = bulkDeleteTarget.map((item) => item.id);
    if (!(await deleteSharedRecords("cos.applications", ids))) return;
    const idSet = new Set(ids);
    setApplications((current) => current.filter((item) => !idSet.has(item.id)));
    setSelected((current) => current && idSet.has(current.id) ? null : current);
    setSelectedApplicationIds((current) => current.filter((id) => !idSet.has(id)));
    setBulkDeleteTarget(null);
  }

  async function updateStatus(id: string, status: PartnershipStatus) {
    const app = applications.find((a) => a.id === id);
    const previousStatus = app?.status;
    const statusChangedToOngoing = status === "On-going" && previousStatus !== "On-going";
    const transitionStartedAt = new Date().toISOString();
    const transitionExpiresAt = app
      ? new Date(
          Date.now() + app.duration * (app.durationUnit === "Months" ? 30 : 1) * 86400000,
        ).toISOString()
      : "";
    const next = applications.map((a) => (a.id === id ? { ...a, status } : a));
    const updatedApplication = next.find((application) => application.id === id);
    if (updatedApplication && !(await updateSharedRecord("cos.applications", updatedApplication))) return;
    setApplications(next);
    const matchedAd =
      app &&
      (ads.find((ad) => ad.applicationId === app.id) ??
        ads.find((ad) => ad.brand === app.brand && ad.exactModel === app.exactModel));
    if (app && status === "On-going" && !matchedAd) {
      const newAd: ActiveAd = {
          id: uid("AD"),
          applicationId: app.id,
          brand: app.brand,
          exactModel: app.exactModel,
          productType: app.productType,
          contract:
            app.description ||
            `${app.duration} ${app.durationUnit.toLowerCase()} partnership placement.`,
          startDate: transitionStartedAt,
          expiresAt: transitionExpiresAt,
          status: "On-going",
          revenue: app.budget,
          clicks: 0,
          visits: 0,
          impressions: 0,
          placement: "Pending placement",
        };
      setAds([newAd, ...ads]);
      setRevenue((current) => current.some((record) => record.applicationId === app.id) ? current : [{ ...newAd, applicationId: app.id }, ...current]);
    } else if (matchedAd && (status === "On-going" || status === "Done")) {
      const expiresAt = statusChangedToOngoing ? transitionExpiresAt : matchedAd.expiresAt;
      const updatedAds: ActiveAd[] = ads.map((ad) => {
        if (ad.id !== matchedAd.id) return ad;
        const updated: ActiveAd = {
          ...ad,
          applicationId: app.id,
          status: status === "On-going" ? "On-going" : "Done",
          startDate: statusChangedToOngoing ? transitionStartedAt : ad.startDate,
          expiresAt,
        };
        if (status === "Done") updated.endedAt = new Date().toISOString();
        else delete updated.endedAt;
        return updated;
      });
      setAds(updatedAds);
      setRevenue((current) => {
        const existing = current.find((record) => record.applicationId === app.id);
        const updated: ActiveAd = {
          ...matchedAd,
          applicationId: app.id,
          status: status === "On-going" ? "On-going" : "Done",
          startDate: statusChangedToOngoing ? transitionStartedAt : matchedAd.startDate,
          expiresAt,
        };
        if (status === "Done") updated.endedAt = new Date().toISOString();
        else delete updated.endedAt;
        const revenueRecord = { ...updated, applicationId: app.id };
        return existing ? current.map((record) => record.applicationId === app.id ? { ...record, ...revenueRecord } : record) : [revenueRecord, ...current];
      });
    }
    if (selected?.id === id) setSelected({ ...selected, status });

    if (app) {
      setEmailConfirmation(
        `Automated status email sent to ${app.email} — status set to "${status}".`,
      );
      window.setTimeout(() => setEmailConfirmation(null), 4500);
    }
  }

  return (
    <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
      <header className="mb-8">
        <p className="text-xs font-black tracking-[.18em] !text-coral">PARTNERSHIPS &amp; ADS</p>
        <h1 className="admin-heading mt-2 !text-white">Partnerships &amp; Ads</h1>
        <p className="admin-kicker !text-white/45">
          Review brand proposals and manage application approval status.
        </p>
        <nav className="mt-4 flex flex-wrap gap-3 text-[11px] font-black uppercase tracking-wide">
          <a
            href="#partnership-applications"
            className="rounded-md border border-white/10 px-3 py-1.5 !text-white/50 transition hover:border-coral hover:!text-white"
          >
            Partnership Applications
          </a>
        </nav>
      </header>

      <section id="partnership-applications" className="scroll-mt-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-black uppercase !text-white">Partnership Applications</h2>
            <p className="mt-1 text-xs !text-white/45">
              Review brand proposals and manage their approval status.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter("All")}
              className={`rounded-md border px-3 py-2 text-[10px] font-black uppercase transition ${
                statusFilter === "All"
                  ? "border-coral bg-coral text-white"
                  : "border-white/10 text-white/50 hover:border-white/25"
              }`}
            >
              All
            </button>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md border px-3 py-2 text-[10px] font-black uppercase transition ${
                  statusFilter === s
                    ? "border-coral bg-coral text-white"
                    : "border-white/10 text-white/50 hover:border-white/25"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {emailConfirmation && (
          <div className="mb-5 flex items-center gap-3 rounded-md border border-[#4bc4b4]/25 bg-[#2d9d8f]/10 px-4 py-3 text-xs font-bold text-[#4bc4b4]">
            <MailCheck className="size-4 shrink-0" />
            {emailConfirmation}
          </div>
        )}

        <div className="mb-3 flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#182330] px-4 py-3">
          <label className="flex items-center gap-3 text-xs font-bold uppercase !text-white/60"><input type="checkbox" checked={filtered.length > 0 && selectedApplicationIds.length === filtered.length} onChange={(event) => setSelectedApplicationIds(event.target.checked ? filtered.map((item) => item.id) : [])} /> Select all <span className="!text-coral">{selectedApplicationIds.length} selected</span></label>
          <button disabled={!selectedApplicationIds.length} onClick={requestDeleteSelected} className="inline-flex items-center gap-2 rounded-md bg-coral px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-30"><Trash2 className="size-3.5" /> Delete selected</button>
        </div>
        <div className="admin-table-wrap overflow-hidden rounded-lg border border-white/[0.06] bg-[#182330] shadow-xl">
          <div className="admin-table-wrap overflow-x-auto">
            <table className="admin-table w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#141e29]">
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Brand
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Product Type
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Budget
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Submitted
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Status
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider !text-white/40">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-white/[0.05] transition hover:bg-white/[0.025] last:border-0"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3"><input type="checkbox" checked={selectedApplicationIds.includes(app.id)} onChange={(event) => setSelectedApplicationIds((current) => event.target.checked ? [...current, app.id] : current.filter((id) => id !== app.id))} aria-label={`Select ${app.brand} application`} /><div><p className="font-black !text-white">{app.brand}</p>
                      <p className="text-[10px] !text-white/35">{app.id}</p></div></div>
                    </td>
                    <td className="px-5 py-4 text-sm !text-white/55">{app.productType}</td>
                    <td className="px-5 py-4 text-sm font-bold !text-white/70">
                      {formatMoney(app.budget)}
                    </td>
                    <td className="px-5 py-4 text-sm !text-white/50">
                      {formatDate(app.submittedAt)}
                    </td>
                    <td className="px-5 py-4">
                      <select value={app.status} onChange={(event) => updateStatus(app.id, event.target.value as PartnershipStatus)} className={`rounded px-2.5 py-1.5 text-[10px] font-black uppercase outline-none ${statusStyles[app.status]}`} style={{ color: partnershipStatusColors[app.status] }} aria-label={`Status for ${app.brand}`}>
                        {statuses.map((item) => <option key={item} value={item} className="bg-[#101923] text-white">{item}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelected(app)}
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase text-white/60 transition hover:border-coral hover:text-white"
                      >
                        <Eye className="size-3.5" />
                        See Info
                      </button>
                      <button
                        onClick={() => setDeleteTarget(app)}
                        title="Delete application"
                        aria-label={`Delete ${app.brand} application`}
                        className="ml-2 inline-flex items-center gap-2 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-[10px] font-black uppercase text-coral transition hover:bg-coral hover:text-white"
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-sm !text-white/35">
                      No applications match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {false && (
        <section id="active-advertisements" className="hidden">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-black uppercase !text-white">Active Advertisements</h2>
            <p className="mt-1 text-xs !text-white/45">
              Track live in-game advertisements and their performance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {adStatusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setAdStatusFilter(s)}
                className={`rounded-md border px-3 py-2 text-[10px] font-black uppercase transition ${
                  adStatusFilter === s
                    ? "border-coral bg-coral text-white"
                    : "border-white/10 text-white/50 hover:border-white/25"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {adSummaries.map((summary) => (
            <article
              key={summary.label}
              className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl"
            >
              <div className={`grid size-10 place-items-center rounded-md ${summary.color}`}>
                <summary.icon className="size-5" />
              </div>
              <p className="mt-5 text-3xl font-black tracking-tight !text-white">{summary.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">
                {summary.label}
              </p>
            </article>
          ))}
        </div>

        <div className="mb-3 mt-6 flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#182330] px-4 py-3"><label className="flex items-center gap-3 text-xs font-bold uppercase !text-white/60"><input type="checkbox" checked={filteredAds.length > 0 && selectedAdIds.length === filteredAds.length} onChange={(event) => setSelectedAdIds(event.target.checked ? filteredAds.map((item) => item.id) : [])} /> Select all <span className="!text-coral">{selectedAdIds.length} selected</span></label><button disabled={!selectedAdIds.length} onClick={archiveSelected} className="inline-flex items-center gap-2 rounded-md bg-coral px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-30"><Trash2 className="size-3.5" /> Delete selected</button></div>
        <div className="admin-table-wrap mt-6 overflow-hidden rounded-lg border border-white/[0.06] bg-[#182330] shadow-xl">
          <div className="admin-table-wrap overflow-x-auto">
            <table className="admin-table w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#141e29]">
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Brand
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Exact Model
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Start Date
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Expiration Date
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Status
                  </th>
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Revenue
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider !text-white/40">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAds.map((ad) => (
                  <tr
                    key={ad.id}
                    className="border-b border-white/[0.05] transition hover:bg-white/[0.025] last:border-0"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3"><input type="checkbox" checked={selectedAdIds.includes(ad.id)} onChange={(event) => setSelectedAdIds((current) => event.target.checked ? [...current, ad.id] : current.filter((id) => id !== ad.id))} aria-label={`Select ${ad.brand} advertisement`} /><div><p className="font-black !text-white">{ad.brand}</p>
                      <p className="text-[10px] !text-white/35">{ad.id}</p></div></div>
                    </td>
                    <td className="px-5 py-4 text-sm !text-white/55">{ad.exactModel}</td>
                    <td className="px-5 py-4 text-sm !text-white/50">{formatDate(ad.startDate)}</td>
                    <td className="px-5 py-4 text-sm !text-white/50">{formatDate(ad.expiresAt)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded px-2.5 py-1 text-[10px] font-black uppercase ${adStatusStyles[ad.status]}`}
                      >
                        {ad.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold !text-white/70">
                      {formatMoney(ad.revenue)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/ads/${ad.id}`}
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase text-white/60 transition hover:border-coral hover:text-white"
                      >
                        <Eye className="size-3.5" />
                        See Info
                      </Link>
                    </td>
                  </tr>
                ))}

                {filteredAds.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm !text-white/35">
                      <Megaphone className="mx-auto mb-3 size-7 !text-white/15" />
                      No ads match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </section>
      )}

      {bulkDeleteTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setBulkDeleteTarget(null)}>
          <div className="w-full max-w-md rounded-xl border border-coral/40 bg-[#151c28] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-black uppercase !text-white">Delete selected applications?</h3>
            <p className="mt-3 text-sm leading-relaxed !text-white/55">This will archive {bulkDeleteTarget.length} application{bulkDeleteTarget.length === 1 ? "" : "s"} from Partnerships & Ads. Historical records will be preserved.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setBulkDeleteTarget(null)} className="rounded-md border border-white/10 px-4 py-2 text-xs font-bold uppercase !text-white/60 hover:!text-white">Cancel</button>
              <button onClick={confirmBulkDelete} className="rounded-md bg-coral px-4 py-2 text-xs font-black uppercase text-white hover:bg-coral/90">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-lg rounded-xl border border-coral/40 bg-[#151c28] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-black uppercase !text-white">
              {deleteTarget.status === "Approved" ? "Delete Approved Application?" : "Delete Partnership Application?"}
            </h3>
            <p className="mt-3 text-sm leading-relaxed !text-white/55">
              {deleteTarget.status === "Approved"
                  ? "Warning: This application is currently Approved. Deleting it will remove it from the active Partnerships & Ads management list. Its historical advertisement record will remain in Advertisement Revenue."
                  : deleteTarget.status === "Pending"
                    ? "Are you sure you want to remove this pending partnership application?"
                    : "This will remove the application from the Partnership Applications management list. Historical records will be preserved."}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-md border border-white/10 px-4 py-2 text-xs font-bold uppercase !text-white/60 hover:!text-white">Cancel</button>
              <button onClick={() => deleteApplication(deleteTarget)} className="rounded-md bg-coral px-4 py-2 text-xs font-black uppercase text-white hover:bg-coral/90">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-white/[.08] bg-[#151c28] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full border border-white/10 bg-black/20 text-white/40 transition hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>

            <div className="border-b border-white/[.06] bg-[#0d121b] px-6 py-6">
              <p className="text-[10px] font-black uppercase tracking-[.2em] !text-coral">
                {selected.id}
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase !text-white">{selected.brand}</h2>
              <span
                className={`mt-2 inline-block rounded px-2.5 py-1 text-[10px] font-black uppercase ${statusStyles[selected.status]}`}
              >
                {selected.status}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wide !text-white/30">
                    <HandCoins className="size-3.5" /> Product Type
                  </dt>
                  <dd className="mt-1.5 text-sm font-bold !text-white/80">
                    {selected.productType}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] font-black uppercase tracking-wide !text-white/30">
                    Exact Model
                  </dt>
                  <dd className="mt-1.5 text-sm font-bold !text-white/80">{selected.exactModel}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wide !text-white/30">
                    <Link2 className="size-3.5" /> Link
                  </dt>
                  <dd className="mt-1.5 break-all text-sm font-bold !text-[#7cb0ee]">
                    <a href={selected.link} target="_blank" rel="noreferrer">
                    {selected.link || "Not provided"}
                  </a>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[9px] font-black uppercase tracking-wide !text-white/30">Partnership Details</dt>
                  <dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed !text-white/75">
                    {selected.description || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wide !text-white/30">
                    <FileText className="size-3.5" /> File
                  </dt>
                  <dd className="mt-1.5 text-sm font-bold !text-white/80">
                    {selected.fileName || "Not provided"}
                    {selected.attachmentUrl ? (
                      <div className="mt-3 space-y-3">
                        {selected.attachmentType?.startsWith("image/") ||
                        selected.attachmentUrl.startsWith("data:image/") ? (
                          <img
                            src={selected.attachmentUrl}
                            alt={selected.fileName || "Application attachment"}
                            className="max-h-64 w-full rounded-md object-contain"
                          />
                        ) : (
                          <iframe
                            src={selected.attachmentUrl}
                            title={selected.fileName || "Application PDF"}
                            className="h-64 w-full rounded-md bg-white"
                          />
                        )}
                        <a
                          href={selected.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-coral/40 px-2.5 py-1 text-[10px] uppercase text-coral hover:bg-coral hover:text-white"
                        >
                          <Eye className="size-3.5" /> Open attached file
                        </a>
                      </div>
                    ) : selected.fileName ? (
                      <span className="ml-2 text-xs font-normal !text-white/35">
                        Legacy filename only
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wide !text-white/30">
                    <Mail className="size-3.5" /> Email
                  </dt>
                  <dd className="mt-1.5 break-all text-sm font-bold !text-white/80">
                    {selected.email}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wide !text-white/30">
                    <Banknote className="size-3.5" /> Proposed Budget
                  </dt>
                  <dd className="mt-1.5 text-sm font-bold !text-white/80">
                    {formatMoney(selected.budget)}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wide !text-white/30">
                    <CalendarClock className="size-3.5" /> Advertisement Duration
                  </dt>
                  <dd className="mt-1.5 text-sm font-bold !text-white/80">
                    {selected.duration} {selected.durationUnit}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] font-black uppercase tracking-wide !text-white/30">
                    Submission Date
                  </dt>
                  <dd className="mt-1.5 text-sm font-bold !text-white/80">
                    {formatDate(selected.submittedAt)}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 border-t border-white/[.06] pt-5">
                <p className="text-[9px] font-black uppercase tracking-wide !text-white/30">
                  Update Status
                </p>
                <select
                  value={selected.status}
                  onChange={(e) => updateStatus(selected.id, e.target.value as PartnershipStatus)}
                  className="admin-input mt-2 w-full rounded-md border px-3 py-2.5 text-sm font-bold outline-none focus:border-coral"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <p className="mt-3 text-[11px] leading-relaxed !text-white/40">
                  Changing this status automatically triggers a status-update email to the brand
                  contact (simulated in this demo environment) so they stay informed without manual
                  follow-up.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
