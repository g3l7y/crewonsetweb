import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { CalendarClock, ExternalLink, Megaphone, MousePointerClick, Users, MonitorPlay, Wallet2 } from 'lucide-react';
import { isMockMode } from '@/lib/playfab/config';
import { applicationsStore, adsStore } from '@/lib/demo/store';
import { BRAND_PROMOTION_DELIVERY_TERMS } from '@/lib/brand-promotion-packages';

export const Route = createFileRoute('/brand-promotions/$token')({
  head: () => ({
    meta: [
      { title: 'Brand Promotion — Crew On Set!' },
      { name: 'description', content: 'Live brand promotion information from Crew On Set.' },
    ],
  }),
  component: BrandPromotionPage,
});

type Promotion = {
  id: string;
  brand?: string;
  exactModel?: string;
  productType?: string;
  description?: string;
  packageName?: string;
  packagePrice?: number;
  packageDurationDays?: number;
  packagePlacement?: string;
  packageReporting?: string;
  deliveryTerms?: string;
  deliveryAdjustments?: Array<{ days: number; reason: string; recordedAt: string; revisedEndAt: string }>;
  deliveryMakeGoodDays?: number;
  link?: string;
  trackedLink?: string;
  submittedLink?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  endedAt?: string;
  endReason?: string;
  performance: {
    clicks: number;
    visits: number;
    automatedRequests: number;
    testClicks: number;
    impressions: number;
    revenue: number;
  };
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value);
}

function splitCountdown(ms: number) {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function BrandPromotionPage() {
  const { token } = Route.useParams();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [mockApplications] = applicationsStore.useStore();
  const [mockAds] = adsStore.useStore();

  useEffect(() => {
    if (isMockMode()) {
      const application = mockApplications.find((item) => item.brandPromotionToken === token && ['On-going', 'Done'].includes(item.status));
      if (!application) {
        setError('Promotion not found or not available.');
        setPromotion(null);
        return;
      }
      const ad = mockAds.find((item) => item.applicationId === application.id);
      const startDate = application.promotionStartedAt || application.paymentPaidAt || application.submittedAt;
      const endDate = application.promotionEndedAt || application.promotionEndsAt || ad?.expiresAt || startDate;
      setPromotion({
        id: application.id,
        brand: application.brand,
        exactModel: application.exactModel,
        productType: application.productType,
        description: application.description,
        packageName: application.packageName,
        packagePrice: application.budget,
        packageDurationDays: application.duration,
        packagePlacement: application.packagePlacement,
        packageReporting: application.packageReporting,
        deliveryTerms: BRAND_PROMOTION_DELIVERY_TERMS,
        deliveryAdjustments: application.deliveryAdjustments || [],
        deliveryMakeGoodDays: application.deliveryMakeGoodDays || 0,
        link: application.link,
        submittedLink: application.link,
        trackedLink: ad?.trackedLink,
        status: application.status,
        startDate,
        endDate,
        endedAt: application.promotionEndedAt,
        performance: {
          clicks: ad?.clicks || 0,
          visits: ad?.visits || 0,
          automatedRequests: ad?.automatedRequests || 0,
          testClicks: ad?.testClicks || 0,
          impressions: ad?.impressions || 0,
          revenue: ad?.revenue || application.budget || 0,
        },
      });
      setError(null);
      setNow(Date.now());
      const tick = window.setInterval(() => setNow(Date.now()), 1_000);
      return () => window.clearInterval(tick);
    }
    let active = true;
    let loaded = false;
    const load = async () => {
      try {
        const response = await fetch('/api/brand-promotions?token=' + encodeURIComponent(token), { cache: 'no-store' });
        const body = await response.json().catch(() => ({})) as { data?: Promotion; error?: string };
        if (!response.ok || !body.data) throw new Error(body.error || 'Promotion information is unavailable.');
        if (active) {
          loaded = true;
          setPromotion(body.data);
          setError(null);
        }
      } catch (reason) {
        if (active && !loaded) setError(reason instanceof Error ? reason.message : 'Promotion information is unavailable.');
      }
    };
    void load();
    const refresh = window.setInterval(() => { void load(); }, 30_000);
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => { active = false; window.clearInterval(refresh); window.clearInterval(tick); };
  }, [token, mockApplications, mockAds]);

  if (error || !promotion) {
    return (
      <main className="min-h-screen bg-[#0a0e19] px-6 py-16 text-[#fefaef]">
        <div className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-[#101923] p-8 text-center shadow-2xl">
          <Megaphone className="mx-auto mb-4 size-10 text-[#ff6248]" />
          <h1 className="text-2xl font-black uppercase">{error || 'Loading promotion…'}</h1>
          {error && <p className="mt-3 text-sm text-white/60">Please use the latest promotion link from your Crew On Set email.</p>}
        </div>
      </main>
    );
  }

  const isDone = promotion.status === 'Done';
  const isApproved = promotion.status === 'Approved';
  const remainingMs = isDone || isApproved || now === null || !promotion.endDate ? 0 : new Date(promotion.endDate).getTime() - now;
  const countdown = splitCountdown(remainingMs);
  const metrics = [
    { label: 'Tracked click-throughs', value: promotion.performance.clicks.toLocaleString(), icon: MousePointerClick },
    { label: 'Unique browsers', value: promotion.performance.visits.toLocaleString(), icon: Users },
    { label: 'Impressions', value: promotion.performance.impressions.toLocaleString(), icon: MonitorPlay },
    { label: 'Promotion value', value: formatMoney(promotion.performance.revenue), icon: Wallet2 },
  ];

  return (
    <main className="min-h-screen bg-[#0a0e19] px-6 py-10 text-[#fefaef]">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-black tracking-[.2em] text-[#ff6248]">CREW ON SET · BRAND PROMOTION</p>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight">{promotion.brand || 'Brand promotion'}</h1>
            <p className="mt-2 text-white/55">{promotion.exactModel || promotion.productType || 'Live campaign information'}</p>
          </div>
          <span className="rounded-full bg-[#2d9d8f]/15 px-3 py-1.5 text-xs font-black uppercase text-[#4bc4b4]">{promotion.status}</span>
        </div>

        <section className="mt-8 rounded-xl border border-white/10 bg-[#101923] p-6 shadow-2xl">
          <div className="flex items-center gap-2 text-sm font-black uppercase"><Megaphone className="size-4 text-[#ff6248]" /> Promotion details</div>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">{promotion.description || (isApproved ? 'Your application is approved. The promotion countdown will begin when the placement goes live.' : 'Your Crew On Set brand promotion is active.')}</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {!isApproved && promotion.startDate && <div><p className="text-[10px] font-black uppercase tracking-wide text-white/35">Live from</p><p className="mt-1 text-sm font-bold">{formatDate(promotion.startDate)}</p></div>}
            {!isApproved && (promotion.endedAt || promotion.endDate) && <div><p className="text-[10px] font-black uppercase tracking-wide text-white/35">{isDone ? 'Ended' : 'Contract ends'}</p><p className="mt-1 text-sm font-bold">{formatDate(promotion.endedAt || promotion.endDate!)}</p></div>}
          </div>
          {promotion.packageName && (
            <div className="mt-6 rounded-lg border border-white/10 bg-white/[.03] p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#f3c747]">Selected package</p>
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-black uppercase">{promotion.packageName}</h2>
                <p className="text-lg font-black">{formatMoney(promotion.packagePrice || 0)} · {promotion.packageDurationDays} days</p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/65">{promotion.packagePlacement}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/55">{promotion.packageReporting}</p>
              <p className="mt-3 text-xs leading-relaxed text-white/45">No minimum views, clicks, website visits, leads, or sales are promised. Reported click-throughs count the outbound redirect only.</p>
              {(promotion.deliveryMakeGoodDays || 0) > 0 && (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="text-xs font-black uppercase text-[#4bc4b4]">Make-good time added · {promotion.deliveryMakeGoodDays} days</p>
                  {promotion.deliveryAdjustments?.map((adjustment, index) => (
                    <p key={adjustment.recordedAt + index} className="mt-2 text-xs leading-relaxed text-white/60">{adjustment.days} day{adjustment.days === 1 ? '' : 's'} added: {adjustment.reason}. Revised end: {formatDate(adjustment.revisedEndAt)}.</p>
                  ))}
                </div>
              )}
              {promotion.deliveryTerms && <details className="mt-4 border-t border-white/10 pt-3 text-xs leading-relaxed text-white/55"><summary className="cursor-pointer font-bold text-white/75">Delivery and under-delivery policy</summary><p className="mt-2">{promotion.deliveryTerms}</p></details>}
            </div>
          )}
          {promotion.endReason && <p className="mt-5 rounded-lg border border-white/10 bg-white/[.03] p-3 text-sm text-white/65">Completion note: {promotion.endReason}</p>}
          {(promotion.submittedLink || promotion.link) && <a href={promotion.submittedLink || promotion.link} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#f3c747] hover:underline"><ExternalLink className="size-4" /> Visit submitted brand link</a>}
        </section>

        {!isApproved && <section className="mt-5 rounded-xl border border-white/10 bg-[#101923] p-6 shadow-2xl" aria-live="polite">
          <div className="flex items-center gap-2 text-sm font-black uppercase"><CalendarClock className="size-4 text-[#ff6248]" /> Live expiration countdown</div>
          {now === null ? <p className="mt-5 text-sm text-white/55">Loading countdown.</p> : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                {[
                  { value: countdown.days, label: 'Days' },
                  { value: countdown.hours, label: 'Hrs' },
                  { value: countdown.minutes, label: 'Min' },
                  { value: countdown.seconds, label: 'Sec' },
                ].map((unit) => <div key={unit.label} className="rounded-lg border border-white/10 bg-[#182330] py-3"><p className="text-2xl font-black">{String(unit.value).padStart(2, '0')}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/40">{unit.label}</p></div>)}
              </div>
              <p className="mt-4 text-center text-xs font-bold uppercase tracking-wide text-white/45">{isDone ? 'Promotion completed - countdown stopped' : remainingMs <= 0 ? 'Contract ended - updating campaign status' : 'Time remaining in the agreed promotion period'}</p>
            </>
          )}
        </section>}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => <article key={metric.label} className="rounded-xl border border-white/10 bg-[#182330] p-5"><metric.icon className="size-5 text-[#f3c747]" /><p className="mt-4 text-2xl font-black">{metric.value}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-white/40">{metric.label}</p></article>)}
        </section>
        <p className="mt-3 text-xs leading-relaxed text-white/45">
          {isMockMode() ? 'Sample metrics are shown in mock mode; no live campaign tracking is performed.' : <>{promotion.performance.automatedRequests.toLocaleString()} likely automated requests and {promotion.performance.testClicks.toLocaleString()} marked test clicks excluded. A random first-party cookie estimates unique browsers; click-throughs do not confirm that this page loaded. Player usernames and PlayFab IDs are not collected or shared.</>}
        </p>
      </div>
    </main>
  );
}
