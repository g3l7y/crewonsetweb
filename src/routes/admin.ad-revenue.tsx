import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/ad-revenue")({
  head: () => ({
    meta: [
      { title: "Advertisement Revenue — Crew On Set! Admin" },
      { name: "description", content: "All approved advertisement applications with live performance and revenue." },
      { property: "og:title", content: "Advertisement Revenue — Crew On Set! Admin" },
      { property: "og:description", content: "All approved advertisement applications with live performance and revenue." },
    ],
  }),
  component: AdRevenuePage,
});

import { useMemo, useState } from "react";
import Link from "@/components/next-compat/link";
import { useRouter } from "@/components/next-compat/navigation";
import {
  BarChart3,
  ChevronRight,
  MegaphoneOff,
  MonitorPlay,
  MousePointerClick,
  Users,
  Wallet2,
  Trash2,
  X,
} from "lucide-react";
import {
  applicationsStore,
  revenueStore,
  formatMoney,
  type ActiveAd,
  type PartnershipApplication,
} from "@/lib/demo/store";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Resolve ads by their stable source application ID, with legacy fallback. */
function findAdForApplication(app: PartnershipApplication, ads: ActiveAd[]) {
  return ads.find((ad) => ad.applicationId === app.id) ??
    ads.find((ad) => ad.brand === app.brand && ad.exactModel === app.exactModel) ??
    null;
}

function AdRevenuePage() {
  const [applications] = applicationsStore.useStore();
  const [revenue, setRevenue] = revenueStore.useStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const router = useRouter();

  // "Approved" advertisement applications also includes those already running
  // (On-going) or wrapped (Done) — every application that made it past review.
  const approved = useMemo(
    () =>
      applications.filter(
        (a) => a.status === "Approved" || a.status === "On-going" || a.status === "Done",
      ),
    [applications],
  );

  const rows = useMemo(
    () => revenue.filter((record) => !record.archived).map((record) => ({
      app: applications.find((item) => item.id === record.applicationId) ?? ({ id: record.applicationId, brand: record.brand, exactModel: record.exactModel, status: "Done" } as PartnershipApplication),
      ad: record,
    })),
    [revenue, applications],
  );

  function confirmDelete(ids: string[]) { setDeleteIds(ids); }
  function deleteRevenue() {
    if (!deleteIds) return;
    const ids = new Set(deleteIds);
    setRevenue(revenue.filter((record) => !ids.has(record.id)));
    setSelectedIds([]);
    setDeleteIds(null);
  }

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, { ad }) => ({
          revenue: acc.revenue + (ad?.revenue ?? 0),
          clicks: acc.clicks + (ad?.clicks ?? 0),
          visits: acc.visits + (ad?.visits ?? 0),
          impressions: acc.impressions + (ad?.impressions ?? 0),
        }),
        { revenue: 0, clicks: 0, visits: 0, impressions: 0 },
      ),
    [rows],
  );

  const summaries = [
    { label: "Total Ad Revenue", value: formatMoney(totals.revenue), icon: Wallet2, color: "bg-[#d9a514] text-[#101923]" },
    { label: "Total Ad Clicks", value: totals.clicks.toLocaleString(), icon: MousePointerClick, color: "bg-coral text-white" },
    { label: "Total Visits", value: totals.visits.toLocaleString(), icon: Users, color: "bg-[#243241] text-white" },
    { label: "Total Impressions", value: totals.impressions.toLocaleString(), icon: MonitorPlay, color: "bg-[#2d9d8f] text-white" },
  ];

  function openApplication(row: (typeof rows)[number]) {
    if (row.ad) {
      router.push(`/admin/ads/${row.ad.id}`);
    }
  }

  return (
    <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
      <header className="mb-8">
        <p className="text-xs font-black tracking-[.18em] !text-coral">REVENUE</p>
        <h1 className="admin-heading mt-2 !text-white">Advertisement Revenue</h1>
        <p className="admin-kicker !text-white/45">
          Every approved brand advertisement, its live performance, and the revenue it drives.
        </p>
      </header>

      {/* SUMMARY CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaries.map((summary) => (
          <article key={summary.label} className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
            <div className={`grid size-10 place-items-center rounded-md ${summary.color}`}>
              <summary.icon className="size-5" />
            </div>
            <p className="mt-5 text-3xl font-black tracking-tight !text-white">{summary.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">{summary.label}</p>
          </article>
        ))}
      </section>

      {/* APPROVED APPLICATIONS */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="size-4 !text-coral" />
          <h2 className="text-sm font-black uppercase tracking-wider !text-white/60">
            Approved Advertisement Applications
          </h2>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-black !text-white/50">
            {rows.length}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-white/[0.06] bg-[#182330] p-10 text-center shadow-xl">
            <MegaphoneOff className="mx-auto mb-3 size-8 !text-white/15" />
            <p className="text-sm !text-white/40">
              No approved advertisement applications yet. Approve a proposal in Partnerships &amp; Ads to see it here.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#182330] px-4 py-3">
              <label className="flex items-center gap-3 text-xs font-bold uppercase !text-white/60">
                <input type="checkbox" checked={rows.length > 0 && selectedIds.length === rows.length} onChange={(event) => setSelectedIds(event.target.checked ? rows.map(({ ad }) => ad.id) : [])} />
                Select all <span className="!text-coral">{selectedIds.length} selected</span>
              </label>
              <button disabled={!selectedIds.length} onClick={() => confirmDelete(selectedIds)} className="inline-flex items-center gap-2 rounded-md bg-coral px-3 py-2 text-[10px] font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="size-3.5" /> Delete selected</button>
            </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => {
              const { app, ad } = row;
              const clickable = Boolean(ad);
              return (
                <article
                  key={app.id}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => openApplication(row) : undefined}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openApplication(row);
                          }
                        }
                      : undefined
                  }
                  className={`group rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl transition ${
                    clickable
                      ? "cursor-pointer hover:border-coral/50 hover:bg-[#1c2836] focus:border-coral focus:outline-none"
                      : "opacity-80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <input type="checkbox" checked={selectedIds.includes(ad.id)} onClick={(event) => event.stopPropagation()} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, ad.id] : current.filter((id) => id !== ad.id))} aria-label={`Select ${app.brand} revenue record`} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[.16em] !text-coral">{app.id}</p>
                      <h3 className="mt-1 truncate text-lg font-black uppercase !text-white">{app.brand}</h3>
                      <p className="mt-0.5 truncate text-xs !text-white/50">{app.exactModel}</p>
                    </div>
                    {clickable && (
                      <ChevronRight className="mt-1 size-5 shrink-0 !text-white/30 transition group-hover:!text-coral" />
                    )}
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4">
                    <div>
                      <dt className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide !text-white/30">
                        <MousePointerClick className="size-3" /> Clicks
                      </dt>
                      <dd className="mt-1 text-sm font-bold !text-white/85">
                        {ad ? ad.clicks.toLocaleString() : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide !text-white/30">
                        <Users className="size-3" /> Visits
                      </dt>
                      <dd className="mt-1 text-sm font-bold !text-white/85">
                        {ad ? ad.visits.toLocaleString() : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide !text-white/30">
                        <MonitorPlay className="size-3" /> Impressions
                      </dt>
                      <dd className="mt-1 text-sm font-bold !text-white/85">
                        {ad ? ad.impressions.toLocaleString() : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide !text-white/30">
                        <Wallet2 className="size-3" /> Revenue
                      </dt>
                      <dd className="mt-1 text-sm font-bold !text-white/85">
                        {ad ? formatMoney(ad.revenue) : formatMoney(app.budget)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wide !text-white/35">
                      Contract {formatDate(app.submittedAt)}
                    </span>
                    {ad ? (
                      <div className="text-right text-[10px] font-bold uppercase tracking-wide !text-white/45">
                        <p>Live Date: {formatDate(ad.startDate)}</p>
                        <p>Scheduled End: {formatDate(ad.expiresAt)}</p>
                        {ad.status === "Done" && ad.endedAt && new Date(ad.endedAt).getTime() < new Date(ad.expiresAt).getTime() && <p className="text-[#f39a5a]">Actual End: {formatDate(ad.endedAt)} · Ended early</p>}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wide !text-[#e1b42b]">
                        Awaiting placement
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          </>
        )}

        {deleteIds && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setDeleteIds(null)}>
            <div className="w-full max-w-lg rounded-xl border border-coral/40 bg-[#151c28] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4"><h3 className="text-lg font-black uppercase !text-white">Confirm Revenue Deletion</h3><button onClick={() => setDeleteIds(null)} aria-label="Close"><X className="size-5 !text-white/50" /></button></div>
              <p className="mt-3 text-sm leading-relaxed !text-white/60">This permanently removes {deleteIds.length} revenue record{deleteIds.length === 1 ? "" : "s"}. If any selected advertisement is currently active, it will be ended before its revenue history is removed. This cannot be undone.</p>
              <div className="mt-6 flex justify-end gap-2"><button onClick={() => setDeleteIds(null)} className="rounded-md border border-white/10 px-4 py-2 text-xs font-bold uppercase !text-white/60">Cancel</button><button onClick={deleteRevenue} className="rounded-md bg-coral px-4 py-2 text-xs font-black uppercase text-white">Confirm Delete</button></div>
            </div>
          </div>
        )}

        <p className="mt-6 text-xs !text-white/35">
          Looking for a full contract, live countdown, and impression breakdown? Click any advertisement above,
          or open it from{" "}
          <Link href="/admin/partnerships" className="font-bold !text-coral hover:underline">
            Partnerships &amp; Ads
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
