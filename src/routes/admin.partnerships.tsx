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

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/next-compat/link";
import { normalizeExternalHttpUrl } from "@/lib/external-url";
import { PartnershipStatusDropdown } from "@/components/admin/partnership-status-dropdown";
import { isMockMode } from "@/lib/playfab/config";
import { topUpsStore } from "@/lib/admin-demo-data";
import {
  Banknote,
  CalendarClock,
  Eye,
  FileText,
  HandCoins,
  Link2,
  Mail,
  MailCheck,
  Megaphone,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  adsStore,
  applicationsStore,
  canAdvancePartnershipStatus,
  deleteSharedRecord,
  deleteSharedRecords,
  updatePartnershipStatus,
  revenueStore,
  formatMoney,
  partnershipProductTypes,
  uid,
  type ActiveAd,
  type PartnershipApplication,
  type RevenueRecord,
  type PartnershipStatus,
} from "@/lib/demo/store";

const statuses: PartnershipStatus[] = ["New", "Pending", "Approved", "On-going", "Done", "Declined"];

const mockStatusStyles: Record<PartnershipStatus, string> = {
  New: "bg-white/10 text-[#fefaef]",
  Pending: "bg-[#c96a2d]/15 text-[#f39a5a]",
  Approved: "bg-[#d9a514]/15 text-[#f3c747]",
  "On-going": "bg-[#3a7bd5]/15 text-[#7cb0ee]",
  Done: "bg-[#2d9d8f]/15 text-[#4bc4b4]",
  Declined: "bg-coral/15 text-[#ff7663]",
};

const statusStyles = mockStatusStyles;

const showLegacyAds = false;

const adStatusStyles: Record<ActiveAd["status"], string> = {
  "On-going": "bg-[#3a7bd5]/15 text-[#7cb0ee]",
  Expiring: "bg-[#d9a514]/15 text-[#e1b42b]",
  Expired: "bg-coral/15 text-coral",
  Done: "bg-white/[.08] text-white/50",
};
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}



function buildMockPromotionEnd(startDate: string, duration?: number, durationUnit?: string) {
  const end = new Date(startDate);
  const amount = Math.max(1, Math.round(Number(duration || 1)));
  if (String(durationUnit || '').toLowerCase().startsWith('month')) end.setUTCMonth(end.getUTCMonth() + amount);
  else end.setUTCDate(end.getUTCDate() + amount);
  return end.toISOString();
}

function buildMockAd(application: PartnershipApplication, status: ActiveAd['status'] = 'On-going'): RevenueRecord {
  const startDate = application.promotionStartedAt || application.paymentPaidAt || application.submittedAt;
  return {
    id: 'AD-' + application.id,
    applicationId: application.id,
    brand: application.brand,
    exactModel: application.exactModel,
    productType: application.productType,
    contract: application.description || 'Crew On Set brand promotion placement.',
    startDate,
    expiresAt: application.promotionEndsAt || buildMockPromotionEnd(startDate, application.duration, application.durationUnit),
    submittedLink: application.link,
    status,
    revenue: application.budget,
    clicks: 0,
    visits: 0,
    impressions: 0,
    placement: 'Crew On Set production placement',
  };
}

function PartnershipsPage() {
  const [applications, setApplications] = applicationsStore.useStore();
  const [selected, setSelected] = useState<PartnershipApplication | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | PartnershipStatus>("All");
  const [applicationQuery, setApplicationQuery] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState<"All" | (typeof partnershipProductTypes)[number]>("All");
  const [emailConfirmation, setEmailConfirmation] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PartnershipApplication | null>(null);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<PartnershipApplication[] | null>(null);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);

  const [ads, setAds] = adsStore.useStore();
  const [revenue, setRevenue] = revenueStore.useStore();

  useEffect(() => {
    if (!isMockMode()) {
      let active = true;
      const refresh = async () => {
        try {
          const response = await fetch("/api/admin/partnerships", { cache: "no-store" });
          if (!response.ok) return;
          const body = await response.json() as { data?: PartnershipApplication[] };
          if (!active || !Array.isArray(body.data)) return;
          setApplications(body.data);
          setSelected((current) => current
            ? body.data?.find((application) => application.id === current.id) ?? current
            : current);
        } catch {
          // Keep the current admin view usable when a background refresh fails.
        }
      };
      void refresh();
      const interval = window.setInterval(() => void refresh(), 30_000);
      return () => {
        active = false;
        window.clearInterval(interval);
      };
    }

    const expireMockPromotions = () => {
      const now = Date.now();
      setApplications((current) => {
        let changed = false;
        const next = current.map((application) => {
          const endDate = application.promotionEndsAt || buildMockPromotionEnd(
            application.promotionStartedAt || application.paymentPaidAt || application.submittedAt,
            application.duration,
            application.durationUnit,
          );
          if (application.status !== "On-going" || new Date(endDate).getTime() > now) return application;
          changed = true;
          return {
            ...application,
            status: "Done" as const,
            promotionEndedAt: endDate,
            promotionEndType: "expired" as const,
          };
        });
        return changed ? next : current;
      });
      const expireAd = <T extends ActiveAd>(item: T): T =>
        item.status !== "Done" && new Date(item.expiresAt).getTime() <= now
          ? { ...item, status: "Done" as const, endedAt: item.endedAt || item.expiresAt } as T
          : item;
      setAds((current) => {
        const next = current.map((item) => expireAd(item));
        return next.some((item, index) => item !== current[index]) ? next : current;
      });
      setRevenue((current) => {
        const next = current.map((item) => expireAd(item));
        return next.some((item, index) => item !== current[index]) ? next : current;
      });
    };
    expireMockPromotions();
    const interval = window.setInterval(expireMockPromotions, 1_000);
    return () => window.clearInterval(interval);
  }, [setApplications, setAds, setRevenue]);

  const [adStatusFilter, setAdStatusFilter] = useState<ActiveAd["status"]>("On-going");
  const adStatusOptions: ActiveAd["status"][] = ["On-going", "Expiring", "Expired", "Done"];
  const filteredAds = ads.filter((ad) => ad.status === adStatusFilter);
  const adSummaries = [
    { label: "Live placements", value: String(ads.filter((ad) => ad.status === "On-going").length), color: "bg-[#3a7bd5]", icon: Megaphone },
    { label: "Tracked revenue", value: formatMoney(revenue.reduce((sum, ad) => sum + ad.revenue, 0)), color: "bg-[#2d9d8f]", icon: Banknote },
    { label: "Impressions", value: ads.reduce((sum, ad) => sum + ad.impressions, 0).toLocaleString(), color: "bg-[#d9a514]", icon: Eye },
  ];

  async function archiveSelected() {
    if (!selectedAdIds.length) return;
    if (!(await deleteSharedRecords("cos.ads", selectedAdIds))) return;
    const ids = new Set(selectedAdIds);
    setAds((current) => current.filter((ad) => !ids.has(ad.id)));
    setSelectedAdIds([]);
  }

  const filtered = useMemo(() => {
    const search = applicationQuery.trim().toLowerCase();
    return applications.filter((app) => {
      const searchableText = [app.id, app.brand, app.productType, app.exactModel, app.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        !app.archived &&
        (!search || searchableText.includes(search)) &&
        (productTypeFilter === "All" || app.productType === productTypeFilter) &&
        (statusFilter === "All" || app.status === statusFilter)
      );
    });
  }, [applications, applicationQuery, productTypeFilter, statusFilter]);

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

  function showStatusMessage(message: string) {
    setEmailConfirmation(message);
    window.setTimeout(() => setEmailConfirmation(null), 5500);
  }

  async function updateStatus(id: string, status: PartnershipStatus) {
    const app = applications.find((application) => application.id === id);
    if (!app || !canAdvancePartnershipStatus(app.status, status)) return;
    let completionReason: string | undefined;
    let completionAt: string | undefined;
    let endedEarly = false;
    if (status === 'Done' && app.status === 'On-going') {
      const promotionEnd = new Date(app.promotionEndsAt || buildMockPromotionEnd(
        app.promotionStartedAt || app.submittedAt,
        app.duration,
        app.durationUnit,
      ));
      endedEarly = Date.now() < promotionEnd.getTime();
      completionAt = endedEarly ? new Date().toISOString() : promotionEnd.toISOString();
      if (endedEarly) {
        const reason = window.prompt(
          'This promotion is ending before its contract date. Enter the brand-side reason that will be included in the email.',
          'The campaign materials and approvals required from your team were not provided by the agreed deadline.',
        );
        if (reason === null) return;
        completionReason = reason.trim();
        if (!completionReason) {
          showStatusMessage('Enter a reason before ending the promotion early.');
          return;
        }
      }
    }
    if (isMockMode() && status === 'Approved' && app.paymentStatus !== 'Paid') {
      showStatusMessage('Complete the brand payment before approving this application.');
      return;
    }

    let savedApplication: PartnershipApplication;
    let emailWarning: string | undefined;
    if (isMockMode()) {
      const mockPaymentRequested = app.status === 'New' && status === 'Pending';
      const promotionStartedAt = status === 'On-going'
        ? app.promotionStartedAt || new Date().toISOString()
        : app.promotionStartedAt;
      savedApplication = {
        ...app,
        status,
        ...(completionAt ? {
          promotionEndedAt: completionAt,
          promotionEndType: endedEarly ? 'ended-early' as const : 'expired' as const,
          ...(completionReason ? { promotionEndReason: completionReason } : {}),
        } : {}),
        ...(mockPaymentRequested
          ? {
              paymentStatus: 'Pending' as const,
              paymentId: app.paymentId || uid('BRAND-PAYMENT'),
              paymentCheckoutUrl: window.location.origin + '/admin/partnerships?mock-payment=' + encodeURIComponent(app.id),
              paymentAmount: app.budget,
            }
          : {}),
        ...(status === 'On-going'
          ? {
              promotionStartedAt,
              promotionEndsAt: app.promotionEndsAt || buildMockPromotionEnd(promotionStartedAt || new Date().toISOString(), app.duration, app.durationUnit),
              brandPromotionToken: app.brandPromotionToken || uid('PROMO'),
            }
          : {}),
      };
    } else {
      const result = await updatePartnershipStatus(app, status, completionReason);
      if (!result.success || !result.data) {
        showStatusMessage(result.error || 'The status change could not be saved.');
        return;
      }
      savedApplication = result.data;
      emailWarning = result.emailWarning;
    }

    setApplications((current) => current.map((item) => item.id === id ? savedApplication : item));
    if (isMockMode() && status === 'On-going') {
      const nextAd = buildMockAd(savedApplication, 'On-going');
      setAds((current) => [nextAd, ...current.filter((item) => item.id !== nextAd.id)]);
      setRevenue((current) => [nextAd, ...current.filter((item) => item.id !== nextAd.id)]);
    } else if (isMockMode() && status === 'Done') {
      setAds((current) => current.map((item) => item.applicationId === id ? { ...item, status: 'Done', endedAt: completionAt, endReason: completionReason } : item));
      setRevenue((current) => current.map((item) => item.applicationId === id ? { ...item, status: 'Done', endedAt: completionAt, endReason: completionReason } : item));
    }
    if (selected?.id === id) setSelected(savedApplication);
    if (emailWarning) {
      showStatusMessage(emailWarning);
      return;
    }
    if (savedApplication.status === 'Pending' && app.status === 'New') {
      showStatusMessage(
        isMockMode()
          ? 'Mock payment email prepared for ' + app.email + '. Complete payment from the application details.'
          : 'Payment email sent to ' + app.email + ' with the PayMongo Hosted Checkout link.',
      );
    } else {
      showStatusMessage(
        isMockMode()
          ? 'Mock status saved for ' + app.brand + ': ' + status + '.'
          : 'Status saved and email sent to ' + app.email + '.',
      );
    }
  }

  function completeMockPayment(id: string) {
    if (!isMockMode()) return;
    const app = applications.find((application) => application.id === id);
    if (!app || app.status !== 'Pending' || app.paymentStatus !== 'Pending') return;
    const paidAt = new Date().toISOString();
    const paymentId = app.paymentId || uid('BRAND-PAYMENT');
    const updatedApplication: PartnershipApplication = {
      ...app,
      paymentStatus: 'Paid',
      paymentId,
      paymentPaidAt: paidAt,
      paymentAmount: app.budget,
    };
    setApplications((current) => current.map((item) => item.id === id ? updatedApplication : item));
    setSelected(updatedApplication);
    topUpsStore.set((current) => [
      {
        id: paymentId,
        playerName: app.brand,
        playerId: app.id,
        date: paidAt.slice(0, 10),
        time: new Date(paidAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        bank: 'PayMongo Hosted Checkout · Brand Partnership',
        amount: app.budget,
        status: 'Completed',
      },
      ...current.filter((row) => row.id !== paymentId),
    ]);
    showStatusMessage('Mock payment received for ' + app.brand + '. An admin notification and transaction entry were created.');
  }
  return (
    <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
      <header className="mb-8">
        <h1 className="admin-heading !text-white">Partnerships &amp; Ads</h1>
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
        <div className="mb-6">
          <div>
            <h2 className="text-lg font-black uppercase !text-white">Partnership Applications</h2>
            <p className="mt-1 text-xs !text-white/45">
              Review brand proposals and manage their approval status.
            </p>
          </div>
        </div>

        {emailConfirmation && (
          <div className="mb-5 flex items-center gap-3 rounded-md border border-[#4bc4b4]/25 bg-[#2d9d8f]/10 px-4 py-3 text-xs font-bold text-[#4bc4b4]">
            <MailCheck className="size-4 shrink-0" />
            {emailConfirmation}
          </div>
        )}

        <section className="admin-card mb-4 flex flex-col gap-3 rounded-lg border border-white/[0.06] bg-[#182330] p-4 shadow-xl sm:flex-row sm:items-center">
          <label className="relative block flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 !text-white/30" />
            <input
              value={applicationQuery}
              onChange={(event) => setApplicationQuery(event.target.value)}
              placeholder="Search brands, products, or applications"
              className="admin-input h-11 w-full rounded-md border border-white/10 bg-[#101923] pl-10 pr-3 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
            />
          </label>
          <select
            value={productTypeFilter}
            onChange={(event) => setProductTypeFilter(event.target.value as typeof productTypeFilter)}
            className="admin-input h-11 rounded-md border border-white/10 bg-[#101923] px-3 text-sm font-bold !text-white outline-none focus:border-coral"
          >
            <option value="All">All Product Types</option>
            {partnershipProductTypes.map((productType) => (
              <option key={productType}>{productType}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="admin-input h-11 rounded-md border border-white/10 bg-[#101923] px-3 text-sm font-bold !text-white outline-none focus:border-coral"
          >
            <option value="All">All Statuses</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </section>

        <div className="mb-3 flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#182330] px-4 py-3">
          <label className="flex items-center gap-3 text-xs font-bold uppercase !text-white/60"><input type="checkbox" checked={filtered.length > 0 && selectedApplicationIds.length === filtered.length} onChange={(event) => setSelectedApplicationIds(event.target.checked ? filtered.map((item) => item.id) : [])} /> Select all <span className="!text-coral">{selectedApplicationIds.length} selected</span></label>
          <button disabled={!selectedApplicationIds.length} onClick={requestDeleteSelected} className="inline-flex items-center gap-2 rounded-md bg-coral px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-30"><Trash2 className="size-3.5" /> Delete selected</button>
        </div>
        <div className="admin-filter-results-card admin-filter-results-card--partnerships admin-table-wrap overflow-hidden rounded-lg border border-white/[0.06] bg-[#182330] shadow-xl">
          <div className="admin-filter-results-scroll admin-table-wrap overflow-x-auto">
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
                      <PartnershipStatusDropdown
                        value={app.status}
                        onChange={(next) => updateStatus(app.id, next)}
                        enforceForwardOnly
                        ariaLabel={`Status for ${app.brand}`}
                      />
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

      {showLegacyAds && (
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
            className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-xl border border-white/[.08] bg-[#151c28] shadow-2xl"
            style={{ maxWidth: "32rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full border border-white/10 bg-black/20 text-white/40 transition hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>

            <div className="border-b border-white/[.06] bg-[#0d121b] py-6 pl-6 pr-14">
              <p className="text-[10px] font-black uppercase tracking-[.2em] !text-coral">
                {selected.id}
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase !text-white">{selected.brand}</h2>
              <span
                data-status={selected.status}
                className={`admin-partnership-status-label mt-2 inline-block rounded px-2.5 py-1 text-[10px] font-black uppercase ${statusStyles[selected.status]}`}
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
                    {selected.link ? (
                      <a
                        href={normalizeExternalHttpUrl(selected.link)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selected.link}
                      </a>
                    ) : (
                      "Not provided"
                    )}
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
                            className="max-h-56 w-full rounded-md object-contain"
                          />
                        ) : (
                          <iframe
                            src={selected.attachmentUrl}
                            title={selected.fileName || "Application PDF"}
                            className="h-56 w-full rounded-md bg-white"
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
              {selected.paymentStatus && (
                <div className="mt-5 rounded-md border border-white/[.08] bg-white/[.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wide !text-white/30">Payment</p>
                      <p className="mt-1 text-sm font-black uppercase !text-white/80">{selected.paymentStatus}</p>
                      <p className="mt-1 text-xs !text-white/45">{formatMoney(selected.paymentAmount ?? selected.budget)}</p>
                    </div>
                    {isMockMode() && selected.status === "Pending" && selected.paymentStatus === "Pending" && (
                      <button
                        type="button"
                        onClick={() => completeMockPayment(selected.id)}
                        className="rounded-md bg-[#d9a514] px-3 py-2 text-[10px] font-black uppercase text-[#101923]"
                      >
                        Complete payment
                      </button>
                    )}
                  </div>
                  {selected.paymentCheckoutUrl && (
                    <p className="mt-3 break-all text-[10px] !text-white/35">Checkout link: {selected.paymentCheckoutUrl}</p>
                  )}
                </div>
              )}

              <div className="mt-6 border-t border-white/[.06] pt-5">
                <p className="text-[9px] font-black uppercase tracking-wide !text-white/30">
                  Update Status
                </p>
                                <PartnershipStatusDropdown
                  value={selected.status}
                  onChange={(next) => updateStatus(selected.id, next)}
                  enforceForwardOnly
                  className="mt-2 w-full"
                  ariaLabel="Update partnership status"
                />
<p className="mt-3 text-[11px] leading-relaxed !text-white/40">
                  Status changes are validated and persisted. Pending requests send payment instructions, and approval requires a confirmed payment.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
