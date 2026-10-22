import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/ads/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    source: search.source === "ad-revenue" ? "ad-revenue" as const : "partnerships" as const,
  }),
  head: () => ({
    meta: [
      { title: "Advertisement Revenue — Crew On Set! Admin" },
      { name: "description", content: "Advertisement contract detail, revenue, and live countdown." },
    ],
  }),
  component: AdDetailPage,
});

import { useEffect, useRef, useState, type FormEvent } from "react";
import { isMockMode } from "@/lib/playfab/config";
import { useAdminAds } from "@/lib/playfab/hooks";
import type { AdEntry } from "@/lib/playfab/types";
import Link from "@/components/next-compat/link";
import {
  ArrowLeft,
  Banknote,
  BellRing,
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  FileSignature,
  MapPin,
  MegaphoneOff,
  MonitorPlay,
  MousePointerClick,
  Users,
} from "lucide-react";
import { adsStore, adminNotificationsStore, applicationsStore, formatMoney, notificationsStore, recordPartnershipMakeGood, uid, type ActiveAd } from "@/lib/demo/store";

const statusStyles: Record<ActiveAd["status"], string> = {
  Approved: "bg-[#d9a514]/15 text-[#f3c747]",
  "On-going": "bg-[#2d9d8f]/15 text-[#4bc4b4]",
  Expiring: "bg-[#d9a514]/15 text-[#e1b42b]",
  Expired: "bg-coral/15 text-[#ff7663]",
  Done: "bg-white/[.08] text-white/50",
};

function formatDate(iso?: string) {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function splitCountdown(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function fromServiceAd(ad: AdEntry): ActiveAd {
  const status = ad.status === 'Approved' ? 'Approved' : ad.status === 'Done' ? 'Done' : ad.status === 'Expiring' ? 'Expiring' : ad.status === 'Expired' ? 'Expired' : 'On-going';
  return {
    id: ad.id,
    applicationId: ad.applicationId,
    brand: ad.brand || 'Brand promotion',
    exactModel: ad.exactModel || ad.product || '',
    productType: ad.productType || 'Other',
    contract: ad.contract || 'Crew On Set brand promotion placement.',
    packageId: ad.packageId,
    packageName: ad.packageName,
    packagePlacement: ad.packagePlacement,
    packageReporting: ad.packageReporting,
    packageDurationDays: ad.packageDurationDays,
    brandPromotionUrl: ad.brandPromotionUrl,
    deliveryAdjustments: ad.deliveryAdjustments,
    deliveryMakeGoodDays: ad.deliveryMakeGoodDays,
    ...(ad.startDate ? { startDate: ad.startDate } : {}),
    ...(ad.expiresAt || ad.endDate ? { expiresAt: ad.expiresAt || ad.endDate } : {}),
    status,
    endedAt: ad.endedAt,
    endReason: ad.endReason,
    revenue: ad.revenue || 0,
    clicks: ad.clicks || 0,
    visits: ad.visits || 0,
    automatedRequests: ad.automatedRequests || 0,
    testClicks: ad.testClicks || 0,
    impressions: ad.impressions || 0,
    placement: ad.placement || 'Crew On Set production placement',
    submittedLink: ad.submittedLink,
    trackedLink: ad.trackedLink,
    trackingEnabled: ad.trackingEnabled,
  };
}

function AdDetailPage() {
  const { id } = Route.useParams();
  const { source } = Route.useSearch();
  const backHref = source === "ad-revenue" ? "/admin/ad-revenue" : "/admin/partnerships";
  const backLabel = source === "ad-revenue" ? "Back to Ad Revenue" : "Back to Partnerships & Ads";
  const [localAds, setAds] = adsStore.useStore();
  const [applications, setApplications] = applicationsStore.useStore();
  const realAdsQuery = useAdminAds();
  const ads = isMockMode() ? localAds : (realAdsQuery.data ?? []).map(fromServiceAd);
  const [notifications, setNotifications] = notificationsStore.useStore();
  const [, setAdminNotifications] = adminNotificationsStore.useStore();
  const [now, setNow] = useState<number | null>(null);
  const [adminNotified, setAdminNotified] = useState(false);
  const [trackingLinkCopied, setTrackingLinkCopied] = useState(false);
  const [makeGoodDays, setMakeGoodDays] = useState('1');
  const [makeGoodReason, setMakeGoodReason] = useState('');
  const [makeGoodMessage, setMakeGoodMessage] = useState<string | null>(null);
  const [savingMakeGood, setSavingMakeGood] = useState(false);
  const hasFiredExpiry = useRef(false);

  const ad = ads.find((a) => a.id === id);
  const linkedApplication = ad ? applications.find((item) => item.id === ad.applicationId) : undefined;

  async function recordMakeGood(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ad || ad.status !== 'On-going') return;
    const application = applications.find((item) => item.id === ad.applicationId);
    const days = Number(makeGoodDays);
    const reason = makeGoodReason.trim();
    if (!ad.applicationId || (isMockMode() && !application) || !Number.isInteger(days) || days < 1 || days > 365 || !reason) {
      setMakeGoodMessage('Choose 1 to 365 days and enter a reason.');
      return;
    }
    setSavingMakeGood(true);
    setMakeGoodMessage(null);
    if (isMockMode()) {
      if (!application) {
        setSavingMakeGood(false);
        setMakeGoodMessage('The mock application record could not be found. Refresh and try again.');
        return;
      }
      const previousEnd = application.promotionEndsAt || ad.expiresAt;
      if (!previousEnd) {
        setSavingMakeGood(false);
        setMakeGoodMessage('This campaign has no scheduled end date.');
        return;
      }
      const revisedEnd = new Date(previousEnd);
      revisedEnd.setUTCDate(revisedEnd.getUTCDate() + days);
      const adjustment = { days, reason, recordedAt: new Date().toISOString(), revisedEndAt: revisedEnd.toISOString() };
      const updatedApplication = {
        ...application,
        promotionEndsAt: revisedEnd.toISOString(),
        deliveryMakeGoodDays: (application.deliveryMakeGoodDays || 0) + days,
        deliveryAdjustments: [...(application.deliveryAdjustments || []), adjustment],
      };
      setApplications((current) => current.map((item) => item.id === application.id ? updatedApplication : item));
      setAds((current) => current.map((item) => item.id === ad.id ? {
        ...item,
        expiresAt: revisedEnd.toISOString(),
        deliveryMakeGoodDays: updatedApplication.deliveryMakeGoodDays,
        deliveryAdjustments: updatedApplication.deliveryAdjustments,
      } : item));
      setMakeGoodMessage(`Added ${days} make-good day${days === 1 ? '' : 's'}. New end date: ${formatDate(revisedEnd.toISOString())}.`);
      setMakeGoodReason('');
      setSavingMakeGood(false);
      return;
    }
    const result = await recordPartnershipMakeGood({ id: ad.applicationId }, days, reason);
    setSavingMakeGood(false);
    if (!result.success || !result.data) {
      setMakeGoodMessage(result.error || 'The campaign extension could not be saved.');
      return;
    }
    setApplications((current) => current.map((item) => item.id === ad.applicationId ? result.data! : item));
    await realAdsQuery.refetch();
    setMakeGoodReason('');
    setMakeGoodMessage(result.emailWarning || `Added ${days} make-good day${days === 1 ? '' : 's'}. The brand was emailed with the revised dates.`);
  }

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!ad || now === null || hasFiredExpiry.current) return;
    if (ad.status === "Approved" || !ad.expiresAt) return;
    const remaining = new Date(ad.expiresAt).getTime() - now;
    if (remaining <= 0 && ad.status !== "Done") {
      hasFiredExpiry.current = true;
      if (!isMockMode()) {
        void realAdsQuery.refetch();
        return;
      }
      const completionAt = new Date(ad.expiresAt).toISOString();
      setAds(ads.map((a) => (a.id === ad.id ? { ...a, status: "Done", endedAt: a.endedAt ?? completionAt } : a)));
      setApplications((current) => current.map((application) => application.id === ad.applicationId
        ? { ...application, status: "Done", promotionEndedAt: completionAt, promotionEndType: "expired" }
        : application));
      setNotifications([
        {
          id: uid("ntf"),
          title: "Advertisement expired",
          body: `${ad.brand} — ${ad.exactModel} has reached its contract expiration and was automatically marked Done.`,
          createdAt: new Date().toISOString(),
          kind: "system",
          read: false,
          target: { kind: "all" },
        },
        ...notifications,
      ]);
      setAdminNotifications((current) => [{
        id: "partnership-expired-" + ad.applicationId,
        title: "Brand promotion completed",
        body: `${ad.brand} promotion reached its contract end date and was marked Done. Mock completion email simulated for the brand contact.`,
        kind: "partnership",
        href: "/admin/ads/" + ad.id,
        entityId: ad.applicationId,
        entityType: "partnership",
        read: false,
        createdAt: new Date().toISOString(),
      }, ...current.filter((notification) => notification.id !== "partnership-expired-" + ad.applicationId)]);
      setAdminNotified(true);
    }
  }, [ad, now, ads, notifications, setAds, setApplications, setNotifications, setAdminNotifications, realAdsQuery.refetch]);

  if (!ad) {
    return (
      <div className="admin-page flex h-full flex-col items-center justify-center gap-4 bg-[#101923] p-6 text-center text-white">
        <MegaphoneOff className="size-10 !text-white/20" />
        <h1 className="text-xl font-black uppercase !text-white">Advertisement Not Found</h1>
        <p className="max-w-sm text-sm !text-white/40">
          No advertisement matches ID "{id}". It may have been removed or the link is incorrect.
        </p>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-black uppercase text-white/60 transition hover:border-coral hover:text-white"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
      </div>
    );
  }

  const isDone = ad.status === "Done";
  const countdownStartsLater = ad.status === "Approved";
  const remainingMs = countdownStartsLater ? null : isDone ? 0 : now === null || !ad.expiresAt ? null : new Date(ad.expiresAt).getTime() - now;
  const countdown = remainingMs === null ? null : splitCountdown(remainingMs);
  const isExpired = !isDone && (ad.status === "Expired" || (remainingMs !== null && remainingMs <= 0));

  return (
    <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-2 text-xs font-bold !text-white/45 transition hover:!text-white"
      >
        <ArrowLeft className="size-4" />
        {backLabel}
      </Link>

      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-black tracking-[.18em] !text-coral">{ad.id}</p>
          <h1 className="admin-heading mt-2 !text-white">{ad.brand}</h1>
          <p className="admin-kicker !text-white/45">{ad.exactModel}</p>
        </div>
        <span className={`h-fit rounded px-3 py-1.5 text-xs font-black uppercase ${statusStyles[ad.status]}`}>
          {ad.status}
        </span>
      </header>

      {adminNotified && (
        <div className="mb-5 flex items-center gap-3 rounded-md border border-coral/25 bg-coral/10 px-4 py-3 text-xs font-bold !text-[#ff7663]">
          <BellRing className="size-4 shrink-0" />
          Admin Notified: Ad marked Done — status automatically updated and an alert was pushed to notifications.
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-white/[0.06] bg-[#182330] p-6 shadow-xl">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase !text-white">
            <FileSignature className="size-4 !text-coral" />
            Contract Details
          </h2>
          <p className="mt-3 text-sm leading-relaxed !text-white/55">{ad.contract}</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wide !text-white/30">Start Date</p>
              <p className="mt-1.5 text-sm font-bold !text-white/80">{countdownStartsLater ? "Not set — begins when the promotion goes On-going" : formatDate(ad.startDate)}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wide !text-white/30">{isDone ? "Ended Date / Time" : "Expiration Date"}</p>
              <p className="mt-1.5 text-sm font-bold !text-white/80">{countdownStartsLater ? "Not set" : formatDate(isDone && ad.endedAt ? ad.endedAt : ad.expiresAt)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide !text-white/30">
                <MapPin className="size-3" /> Submitted Brand Link
              </p>
              {ad.submittedLink ? <a className="mt-1.5 inline-flex items-center gap-2 text-sm font-bold !text-white/80 hover:!text-white" href={ad.submittedLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-3" /> Visit submitted brand link</a> : <p className="mt-1.5 text-sm font-bold !text-white/80">No submitted link</p>}
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wide !text-white/30">Product Type</p>
              <p className="mt-1.5 text-sm font-bold !text-white/80">{ad.productType}</p>
            </div>
          </div>
          {ad.packageName && (
            <div className="mt-5 rounded-md border border-[#d9a514]/20 bg-[#d9a514]/[.06] p-4">
              <p className="text-[9px] font-black uppercase tracking-wide !text-[#f3c747]">Selected package</p>
              <p className="mt-1 text-sm font-black !text-white">{ad.packageName} · {formatMoney(ad.revenue)} · {ad.packageDurationDays || linkedApplication?.duration || "—"} days</p>
              {ad.packagePlacement && <p className="mt-2 text-xs leading-relaxed !text-white/65">{ad.packagePlacement}</p>}
              {ad.packageReporting && <p className="mt-1 text-xs leading-relaxed !text-white/55">{ad.packageReporting}</p>}
              <details className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed !text-white/55">
                <summary className="cursor-pointer font-bold !text-white/75">Delivery and under-delivery policy</summary>
                <p className="mt-2">The package covers the selected display period. Clicks and visits are not guaranteed. For verified Crew On Set downtime, add replacement days. If that is not possible, arrange a prorated refund for the undelivered days. Delays or issues with brand materials, links, or the brand website are not covered.</p>
              </details>
            </div>
          )}
          {ad.brandPromotionUrl && (
            <a href={ad.brandPromotionUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold !text-[#f3c747] hover:underline">
              <ExternalLink className="size-3.5" /> Open brand promotion report
            </a>
          )}
          {(ad.deliveryAdjustments?.length || 0) > 0 && (
            <div className="mt-4 rounded-md border border-[#2d9d8f]/25 bg-[#2d9d8f]/[.06] p-3">
              <p className="text-[9px] font-black uppercase tracking-wide !text-[#4bc4b4]">Make-good history · {ad.deliveryMakeGoodDays || 0} days added</p>
              {ad.deliveryAdjustments?.map((adjustment, index) => <p key={adjustment.recordedAt + index} className="mt-2 text-xs leading-relaxed !text-white/60">{adjustment.days} day{adjustment.days === 1 ? "" : "s"} · {adjustment.reason} · Revised end {formatDate(adjustment.revisedEndAt)}</p>)}
            </div>
          )}
          {ad.status === "On-going" && (linkedApplication || !isMockMode()) && (
            <form onSubmit={recordMakeGood} className="mt-5 rounded-md border border-white/10 bg-[#101923] p-4">
              <h3 className="text-xs font-black uppercase !text-white">Record verified placement outage</h3>
              <p className="mt-1 text-xs leading-relaxed !text-white/50">Add replacement days only for documented Crew On Set placement downtime. The brand’s promotion page and campaign expiry schedule will be updated.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
                <label className="text-[10px] font-bold uppercase !text-white/55">Days
                  <input type="number" min="1" max="365" step="1" required value={makeGoodDays} onChange={(event) => setMakeGoodDays(event.target.value)} className="mt-1 w-full rounded border border-white/15 bg-white/[.06] px-3 py-2 text-sm !text-white" />
                </label>
                <label className="text-[10px] font-bold uppercase !text-white/55">Reason
                  <input type="text" maxLength={600} required value={makeGoodReason} onChange={(event) => setMakeGoodReason(event.target.value)} placeholder="Describe the verified placement outage" className="mt-1 w-full rounded border border-white/15 bg-white/[.06] px-3 py-2 text-sm !text-white placeholder:!text-white/30" />
                </label>
              </div>
              {makeGoodMessage && <p role="status" className="mt-3 text-xs leading-relaxed !text-[#f3c747]">{makeGoodMessage}</p>}
              <button disabled={savingMakeGood} type="submit" className="mt-3 rounded bg-[#d9a514] px-3 py-2 text-[10px] font-black uppercase text-[#101923] disabled:opacity-50">{savingMakeGood ? "Saving…" : "Add make-good days"}</button>
            </form>
          )}
          {ad.trackedLink && (
            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <p className="text-[9px] font-black uppercase tracking-wide !text-white/30">Game Click-Tracking URL</p>
              <p className="mt-1 text-xs leading-relaxed !text-white/50">Set this as the click-through destination for the promotion image or button in the game. The site records aggregate click-throughs and uses a random first-party cookie to estimate unique browsers. It does not record player usernames or PlayFab IDs, and it cannot confirm that the brand page loaded.</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <code className="min-w-0 flex-1 break-all rounded-md bg-[#101923] p-3 text-xs !text-white/70">{ad.trackedLink}</code>
                <button type="button" onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(ad.trackedLink || "");
                    setTrackingLinkCopied(true);
                    window.setTimeout(() => setTrackingLinkCopied(false), 2_000);
                  } catch {
                    window.prompt("Copy this tracking URL for the in-game promotion:", ad.trackedLink);
                  }
                }} className="inline-flex shrink-0 items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-[10px] font-black uppercase !text-white/70 hover:border-coral hover:!text-white">
                  {trackingLinkCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {trackingLinkCopied ? "Copied" : "Copy tracking URL"}
                </button>
                <a
                  href={ad.trackedLink + '&test=1'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-[10px] font-black uppercase !text-white/70 hover:border-coral hover:!text-white"
                >
                  Test redirect · excluded from metrics
                </a>
              </div>
            </div>
          )}
          {!isMockMode() && !ad.trackingEnabled && (
            <div className="mt-5 rounded-md border border-[#d9a514]/30 bg-[#d9a514]/10 p-3 text-xs leading-relaxed !text-white/70">
              Click tracking is not configured, so a tracked game link is not available. Add the <code className="font-bold">DATABASE_URL</code> Neon connection string to the Vercel environment and redeploy to enable durable click counts.
            </div>
          )}
          {!isMockMode() && ad.status === "On-going" && ad.trackingEnabled && !ad.trackedLink && (
            <div className="mt-5 rounded-md border border-[#d9a514]/30 bg-[#d9a514]/10 p-3 text-xs leading-relaxed !text-white/70">
              This live promotion has no tracking token yet. A tracking link must be generated for the application before its popup ad can be enabled.
            </div>
          )}
          {ad.endReason && <p className="mt-4 rounded-md border border-white/10 bg-white/[.03] p-3 text-xs leading-relaxed !text-white/65">Completion reason: {ad.endReason}</p>}
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-[#182330] p-6 shadow-xl">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase !text-white">
            <CalendarClock className="size-4 !text-coral" />
            Live Expiration Countdown
          </h2>

          {isExpired || countdown === null ? (
            <p className="mt-6 text-center text-sm font-black uppercase !text-[#ff7663]">
              {countdownStartsLater ? "Countdown starts when status is On-going" : countdown === null ? "Loading…" : "Contract Expired"}
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-4 gap-2 text-center">
              {[
                { value: countdown.days, label: "Days" },
                { value: countdown.hours, label: "Hrs" },
                { value: countdown.minutes, label: "Min" },
                { value: countdown.seconds, label: "Sec" },
              ].map((unit) => (
                <div key={unit.label} className="rounded-md border border-white/[0.07] bg-[#101923] py-3">
                  <p className="text-2xl font-black !text-white">{String(unit.value).padStart(2, "0")}</p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-wide !text-white/30">{unit.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
          <div className="grid size-10 place-items-center rounded-md bg-[#d9a514] text-[#101923]">
            <Banknote className="size-5" />
          </div>
          <p className="mt-5 text-3xl font-black tracking-tight !text-white">{formatMoney(ad.revenue)}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">Revenue</p>
        </article>

        <article className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
          <div className="grid size-10 place-items-center rounded-md bg-coral text-white">
            <MousePointerClick className="size-5" />
          </div>
          <p className="mt-5 text-3xl font-black tracking-tight !text-white">{ad.clicks.toLocaleString()}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">Tracked Click-Throughs</p>
        </article>

        <article className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
          <div className="grid size-10 place-items-center rounded-md bg-[#243241] text-white">
            <Users className="size-5" />
          </div>
          <p className="mt-5 text-3xl font-black tracking-tight !text-white">{ad.visits.toLocaleString()}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">Unique Browsers</p>
        </article>

        <article className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
          <div className="grid size-10 place-items-center rounded-md bg-[#2d9d8f] text-white">
            <MonitorPlay className="size-5" />
          </div>
          <p className="mt-5 text-3xl font-black tracking-tight !text-white">{ad.impressions.toLocaleString()}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">Ad Displays / Impressions</p>
        </article>
      </section>
      <p className="mt-3 text-xs leading-relaxed !text-white/45">
        {isMockMode() ? "Sample metrics are shown in mock mode; live click tracking is disabled." : <>{ad.automatedRequests ?? 0} likely automated requests and {ad.testClicks ?? 0} marked test clicks excluded. Unique browsers are cookie-based estimates, not confirmed brand-site sessions. Player usernames and PlayFab IDs are not collected or shown.</>}
      </p>
    </div>
  );
}
