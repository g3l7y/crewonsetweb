import { useMemo, useState } from "react";
import { Star, X } from "lucide-react";
import { useProductionLogs } from "@/lib/playfab/hooks";
import type { ProductionLog as GameProductionLog } from "@/lib/playfab/types";

type ProductionLog = {
  id: string;
  level: number;
  production: string;
  role: string;
  client: string;
  date: string;
  score: number | undefined;
  rank: string;
  summary: string;
  setupNotes: string;
  result: string;
  preProductionScore: number | undefined;
  productionScore: number | undefined;
  postProductionScore: number | undefined;
  details: Record<string, unknown>;
  nextStep: string | undefined;
};

const rankTone: Record<string, string> = {
  S: "bg-yellow/20 text-navy border-yellow/50",
  A: "bg-coral/15 text-coral border-coral/40",
  B: "bg-navy/[.06] text-navy/70 border-navy/15",
  C: "bg-navy/[.04] text-navy/50 border-navy/10",
  F: "bg-red-100 text-red-800 border-red-300",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function cleanGameFeedback(value: string) {
  return value.replace(/<\/?color(?:=[^>]+)?>/gi, "").replace(/<\/?b>/gi, "").trim();
}

function mapGameProduction(log: GameProductionLog): ProductionLog {
  const details = (log.details && typeof log.details === "object" ? log.details : {}) as Record<string, unknown>;
  const nextStep = log.nextStep || (typeof details["nextStep"] === "string" ? details["nextStep"] as string : undefined);
  return {
    id: log.id || log.productionId || log.submissionId || "",
    level: log.level,
    production: log.title || log.stage || log.production || "",
    role: log.role || log.roles?.join(", ") || "",
    client: log.clientName || log.clientBrandName || log.client || "",
    date: log.date,
    score: log.overallScore,
    rank: log.rank || log.letterGrade || "",
    summary: log.feedback || "",
    setupNotes: typeof details["setupNotes"] === "string" ? details["setupNotes"] : "",
    result: log.clientDecision || "",
    preProductionScore: log.preProductionScore,
    productionScore: log.productionScore,
    postProductionScore: log.postProductionScore,
    details,
    nextStep,
  };
}

export function ProductionLogs() {
  const logsQuery = useProductionLogs();
  const [openLog, setOpenLog] = useState<ProductionLog | null>(null);
  const logs = useMemo(() => (logsQuery.data ?? []).map(mapGameProduction), [logsQuery.data]);

  return (
    <section className="mt-7 almanac-content-panel p-4 sm:p-6">
      <div className="almanac-content-body">
        <h2 className="section-title text-3xl text-navy sm:text-4xl">Production Logs</h2>
        <p className="mt-1 text-sm text-navy/55">Completed productions reported by Crew On Set!</p>
        <div className="player-account-scroll-list almanac-content-scroll production-logs-list admin-table-wrap mt-5 border-navy/10">
          <table className="admin-table">
            <thead><tr><th>Level</th><th>Product / Contract</th><th>Role</th><th>Client</th><th>Date</th><th>Score</th><th>Rank</th><th className="text-right">Info</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.level}</td>
                  <td className="font-bold">{log.production || "—"}</td>
                  <td>{log.role || "—"}</td>
                  <td>{log.client || "—"}</td>
                  <td className="whitespace-nowrap">{formatDate(log.date)}</td>
                  <td className="font-black">{log.score == null ? "—" : `${log.score}%`}</td>
                  <td><span className={`production-log-rank inline-grid size-7 place-items-center rounded-md border text-xs font-black ${rankTone[log.rank] ?? "bg-navy/[.04] text-navy/50 border-navy/10"}`}>{log.rank || "—"}</span></td>
                  <td className="text-right"><button type="button" onClick={() => setOpenLog(log)} className="production-log-info rounded-md border border-navy/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-navy transition hover:bg-navy/5">See Info</button></td>
                </tr>
              ))}
              {logsQuery.isLoading && <tr><td colSpan={8} className="py-8 text-center">Loading production history…</td></tr>}
              {logsQuery.isError && <tr><td colSpan={8} className="py-8 text-center text-red-700">Could not load production history from PlayFab. Retrying automatically…</td></tr>}
              {!logsQuery.isLoading && !logsQuery.isError && logs.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-navy/55">No completed productions have synced from the game yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {openLog && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-navy/70 p-4 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setOpenLog(null)}>
          <div role="dialog" aria-modal="true" aria-label={openLog.production} onClick={(event) => event.stopPropagation()} className="production-log-dialog my-auto w-full max-w-3xl rounded-xl bg-white shadow-2xl">
            <header className="flex items-start gap-4 border-b border-navy/10 p-5 sm:p-6">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">Level {openLog.level} · {openLog.role}</p>
                <h3 className="production-log-title section-title mt-1 text-2xl text-navy sm:text-3xl">{openLog.production}</h3>
                <p className="mt-1 text-xs font-semibold text-navy/50">Client: {openLog.client} · {formatDate(openLog.date)}</p>
              </div>
              <button type="button" onClick={() => setOpenLog(null)} aria-label="Close production details" className="rounded-md p-1.5 text-navy/40 transition hover:bg-navy/5 hover:text-navy"><X className="size-5" /></button>
            </header>

            <div className="space-y-6 p-5 sm:p-6">
              <section className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-[.16em] text-navy/60">Game Results</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  {([["Pre-production", openLog.preProductionScore], ["Production", openLog.productionScore], ["Post-production", openLog.postProductionScore]] as const).map(([label, score]) => <div key={label} className="rounded-lg border border-navy/10 bg-navy/[.03] p-3"><p className="text-[9px] font-black uppercase tracking-[.14em] text-navy/45">{label}</p><p className="mt-1 text-sm font-bold text-navy">{score == null ? "—" : `${score}/100`}</p></div>)}
                </div>
                {Object.entries((openLog.details["phases"] && typeof openLog.details["phases"] === "object" ? openLog.details["phases"] : {}) as Record<string, unknown>).map(([phase, value]) => {
                  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
                  const feedback = typeof data["feedback"] === "string" ? data["feedback"] : "";
                  return feedback ? <div key={phase} className="rounded-lg border border-navy/10 p-3"><p className="text-[10px] font-black uppercase text-navy/60">{phase.replace(/_/g, " ")}</p><p className="mt-1 whitespace-pre-line text-sm text-navy/75">{cleanGameFeedback(feedback)}</p></div> : null;
                })}
                {(() => {
                  const budget = (openLog.details["budgetReview"] && typeof openLog.details["budgetReview"] === "object" ? openLog.details["budgetReview"] : openLog.details["budget"]) as Record<string, unknown> | undefined;
                  const spent = budget?.["spent"] ?? budget?.["amount_spent"];
                  const remaining = budget?.["remaining"] ?? budget?.["remaining_cash"];
                  const opening = budget?.["openingBalance"] ?? budget?.["opening_cash"];
                  const income = budget?.["income"];
                  const trackingComplete = budget?.["tracking_complete"] ?? budget?.["complete"];
                  const trackingAvailable = budget?.["available"];
                  return <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-navy/10 p-3"><p className="text-[10px] font-black uppercase text-navy/50">Budget Review</p><p className="mt-1 text-sm text-navy/75">{[opening, income, spent, remaining].some((item) => item != null) ? `Opening balance: ${opening ?? "—"} · Income: ${income ?? "—"} · Spent: ${spent ?? "—"} · Remaining: ${remaining ?? "—"}` : "—"}</p>{trackingAvailable === false && <p className="mt-1 text-sm text-navy/65">Budget tracking unavailable.</p>}{typeof trackingComplete === "boolean" && <p className="mt-1 text-sm text-navy/65">Tracking {trackingComplete ? "complete" : "incomplete"}.</p>}{typeof budget?.["feedback"] === "string" && <p className="mt-1 text-sm text-navy/65">{budget["feedback"]}</p>}</div>
                    <div className="rounded-lg border border-navy/10 p-3"><p className="text-[10px] font-black uppercase text-navy/50">Client Decision</p><p className="mt-1 text-sm font-bold text-navy">{openLog.result || "—"}</p></div>
                  </div>;
                })()}
                {openLog.nextStep && <div className="rounded-lg border border-coral/25 bg-coral/[.06] p-3"><p className="text-[10px] font-black uppercase text-coral">Your Next Step</p><p className="mt-1 text-sm text-navy/75">{openLog.nextStep}</p></div>}
              </section>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-navy/45">Game Feedback</p><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-navy/70">{cleanGameFeedback(openLog.summary) || "—"}</p></div>
                <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-navy/45">Setup Notes</p><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-navy/70">{cleanGameFeedback(openLog.setupNotes) || "—"}</p></div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-navy/10 p-3"><Star className="size-4 text-yellow" /><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-navy/40">Score</p><p className="text-sm font-bold text-navy">{openLog.score == null ? "—" : `${openLog.score}% · Rank ${openLog.rank}`}</p></div></div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
