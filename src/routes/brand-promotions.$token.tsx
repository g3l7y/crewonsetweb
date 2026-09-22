import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { CalendarClock, ExternalLink, Megaphone, MousePointerClick, Users, MonitorPlay, Wallet2 } from 'lucide-react';

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
  link?: string;
  status: string;
  startDate: string;
  endDate: string;
  placement: string;
  performance: { clicks: number; visits: number; impressions: number; revenue: number };
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

function BrandPromotionPage() {
  const { token } = Route.useParams();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch('/api/brand-promotions?token=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as { data?: Promotion; error?: string };
        if (!response.ok || !body.data) throw new Error(body.error || 'Promotion information is unavailable.');
        if (active) setPromotion(body.data);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Promotion information is unavailable.');
      });
    return () => { active = false; };
  }, [token]);

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

  const metrics = [
    { label: 'Ad clicks', value: promotion.performance.clicks.toLocaleString(), icon: MousePointerClick },
    { label: 'Visits', value: promotion.performance.visits.toLocaleString(), icon: Users },
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
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">{promotion.description || 'Your Crew On Set brand promotion is active.'}</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <div><p className="text-[10px] font-black uppercase tracking-wide text-white/35">Live from</p><p className="mt-1 text-sm font-bold">{formatDate(promotion.startDate)}</p></div>
            <div><p className="text-[10px] font-black uppercase tracking-wide text-white/35">Contract ends</p><p className="mt-1 text-sm font-bold">{formatDate(promotion.endDate)}</p></div>
            <div><p className="text-[10px] font-black uppercase tracking-wide text-white/35">Placement</p><p className="mt-1 text-sm font-bold">{promotion.placement}</p></div>
          </div>
          {promotion.link && <a href={promotion.link} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#f3c747] hover:underline"><ExternalLink className="size-4" /> Visit submitted brand link</a>}
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => <article key={metric.label} className="rounded-xl border border-white/10 bg-[#182330] p-5"><metric.icon className="size-5 text-[#f3c747]" /><p className="mt-4 text-2xl font-black">{metric.value}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-white/40">{metric.label}</p></article>)}
        </section>
      </div>
    </main>
  );
}