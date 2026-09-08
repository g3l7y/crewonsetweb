import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/ads/$id")({
  head: () => ({
    meta: [
      { title: "Advertisement Revenue — Crew On Set! Admin" },
      { name: "description", content: "Advertisement contract detail, revenue, and live countdown." },
    ],
  }),
  component: AdDetailPage,
});

import { useEffect, useRef, useState } from "react";
import Link from "@/components/next-compat/link";
import {
  ArrowLeft,
  Banknote,
  BellRing,
  CalendarClock,
  FileSignature,
  MapPin,
  MegaphoneOff,
  MonitorPlay,
  MousePointerClick,
  Users,
} from "lucide-react";
import { adsStore, formatMoney, notificationsStore, uid, type ActiveAd } from "@/lib/demo/store";

const statusStyles: Record<ActiveAd["status"], string> = {
  "On-going": "bg-[#2d9d8f]/15 text-[#4bc4b4]",
  Expiring: "bg-[#d9a514]/15 text-[#e1b42b]",
  Expired: "bg-coral/15 text-[#ff7663]",
  Done: "bg-white/[.08] text-white/50",
};

function formatDate(iso: string) {
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

function AdDetailPage() {
  const { id } = Route.useParams();
  const [ads, setAds] = adsStore.useStore();
  const [notifications, setNotifications] = notificationsStore.useStore();
  const [now, setNow] = useState<number | null>(null);
  const [adminNotified, setAdminNotified] = useState(false);
  const hasFiredExpiry = useRef(false);

  const ad = ads.find((a) => a.id === id);

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!ad || now === null || hasFiredExpiry.current) return;
    const remaining = new Date(ad.expiresAt).getTime() - now;
    if (remaining <= 0 && ad.status !== "Done") {
      hasFiredExpiry.current = true;
      setAds(ads.map((a) => (a.id === ad.id ? { ...a, status: "Done", endedAt: a.endedAt ?? new Date(ad.expiresAt).toISOString() } : a)));
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
      setAdminNotified(true);
    }
  }, [ad, now, ads, notifications, setAds, setNotifications]);

  if (!ad) {
    return (
      <div className="admin-page flex h-full flex-col items-center justify-center gap-4 bg-[#101923] p-6 text-center text-white">
        <MegaphoneOff className="size-10 !text-white/20" />
        <h1 className="text-xl font-black uppercase !text-white">Advertisement Not Found</h1>
        <p className="max-w-sm text-sm !text-white/40">
          No advertisement matches ID "{id}". It may have been removed or the link is incorrect.
        </p>
        <Link
          href="/admin/partnerships"
          className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-black uppercase text-white/60 transition hover:border-coral hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to Partnerships & Ads
        </Link>
      </div>
    );
  }

  const isDone = ad.status === "Done";
  const remainingMs = isDone ? 0 : now === null ? null : new Date(ad.expiresAt).getTime() - now;
  const countdown = remainingMs === null ? null : splitCountdown(remainingMs);
  const isExpired = !isDone && (ad.status === "Expired" || (remainingMs !== null && remainingMs <= 0));

  return (
    <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
      <Link
        href="/admin/partnerships"
        className="mb-6 inline-flex items-center gap-2 text-xs font-bold !text-white/45 transition hover:!text-white"
      >
        <ArrowLeft className="size-4" />
        Back to Partnerships & Ads
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
              <p className="mt-1.5 text-sm font-bold !text-white/80">{formatDate(ad.startDate)}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wide !text-white/30">{isDone ? "Ended Date / Time" : "Expiration Date"}</p>
              <p className="mt-1.5 text-sm font-bold !text-white/80">{formatDate(isDone && ad.endedAt ? ad.endedAt : ad.expiresAt)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide !text-white/30">
                <MapPin className="size-3" /> Placement
              </p>
              <p className="mt-1.5 text-sm font-bold !text-white/80">{ad.placement}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wide !text-white/30">Product Type</p>
              <p className="mt-1.5 text-sm font-bold !text-white/80">{ad.productType}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-[#182330] p-6 shadow-xl">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase !text-white">
            <CalendarClock className="size-4 !text-coral" />
            Live Expiration Countdown
          </h2>

          {isExpired || countdown === null ? (
            <p className="mt-6 text-center text-sm font-black uppercase !text-[#ff7663]">
              {countdown === null ? "Loading…" : "Contract Expired"}
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
          <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">Ad Clicks</p>
        </article>

        <article className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
          <div className="grid size-10 place-items-center rounded-md bg-[#243241] text-white">
            <Users className="size-5" />
          </div>
          <p className="mt-5 text-3xl font-black tracking-tight !text-white">{ad.visits.toLocaleString()}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">Visits</p>
        </article>

        <article className="rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
          <div className="grid size-10 place-items-center rounded-md bg-[#2d9d8f] text-white">
            <MonitorPlay className="size-5" />
          </div>
          <p className="mt-5 text-3xl font-black tracking-tight !text-white">{ad.impressions.toLocaleString()}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">Ad Displays / Impressions</p>
        </article>
      </section>
    </div>
  );
}
