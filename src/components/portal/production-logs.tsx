import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useProductionHistory } from "@/lib/playfab/hooks";
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
  preProductionFeedback: string;
  productionFeedback: string;
  postProductionFeedback: string;
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
  const sourceDetails = (log.details && typeof log.details === "object" ? log.details : {}) as Record<string, unknown>;
  const budgetDetails = (sourceDetails["budgetReview"] ?? sourceDetails["budget"]) as Record<string, unknown> | undefined;
  const hasRootBudget = log.hasBudgetReview || [log.budgetOpeningBalance, log.budgetIncome, log.budgetUsed, log.budgetRemaining].some((value) => value != null);
  const details = {
    ...sourceDetails,
    ...(budgetDetails || hasRootBudget ? { budgetReview: {
      ...(budgetDetails ?? {}),
      ...(log.budgetOpeningBalance != null ? { openingBalance: log.budgetOpeningBalance } : {}),
      ...(log.budgetIncome != null ? { income: log.budgetIncome } : {}),
      ...(log.budgetUsed != null ? { spent: log.budgetUsed } : {}),
      ...(log.budgetRemaining != null ? { remaining: log.budgetRemaining } : {}),
      ...(log.hasBudgetReview != null ? { available: log.hasBudgetReview } : {}),
      ...(log.budgetFeedback ? { feedback: log.budgetFeedback } : {}),
    } } : {}),
  };
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
    preProductionFeedback: log.preProductionFeedback || "",
    productionFeedback: log.productionFeedback || "",
    postProductionFeedback: log.postProductionFeedback || "",
    details,
    nextStep,
  };
}

export function ProductionLogs() {
  const logsQuery = useProductionHistory();
  const [openLog, setOpenLog] = useState<ProductionLog | null>(null);
  const logs = useMemo(() => (logsQuery.data?.logs ?? []).map(mapGameProduction), [logsQuery.data]);
  const careers = logsQuery.data?.careers ?? [];

  return (
    <section className="production-history-panel mt-7 almanac-content-panel p-4 sm:p-6">
      <div className="almanac-content-body">
        <h2 className="section-title text-3xl text-navy sm:text-4xl">Production Logs</h2>
        <div className="production-history-heading mt-1 flex items-center justify-between gap-3 text-sm text-navy"><p>Saved career progress and completed attempts from Crew On Set!</p><button type="button" className="rounded border px-3 py-2 font-bold" disabled={logsQuery.isFetching} onClick={() => void logsQuery.refetch()}>{logsQuery.isFetching ? "Refreshing…" : "Refresh"}</button></div>
        {careers.length > 0 && <div className="production-career-progress mt-5 space-y-3">
          <h3 className="text-sm font-black uppercase">Current saved progress</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{careers.map((career) => <article key={career.id} className="rounded-lg border border-navy/20 p-4">
            <h4 className="font-bold">{career.name || "Saved career"}</h4>
            <p className="mt-1 text-sm">Level {career.level} · {career.balance == null ? "Budget not recorded" : `${career.balance.toLocaleString()} B-Coins`}</p>
            <p className="mt-2 text-sm">{career.activeLevel != null ? `Level ${career.activeLevel} attempt in progress` : "Saved checkpoint"}</p>
            <p className="text-xs">{career.completedAttempts} completed attempts recorded{career.takes != null ? ` · ${career.takes} takes in current attempt` : ""}</p>
            <p className="mt-2 text-xs">Checkpoint saved: {formatDate(career.updatedUtc)}</p>
            {career.transactions.length > 0 && <details className="mt-3 text-sm"><summary className="cursor-pointer font-bold">Current attempt transactions</summary><ul className="mt-2 space-y-1">{career.transactions.map((transaction, index) => <li key={index}>{transaction.item || transaction.category}: {transaction.amount > 0 ? "+" : ""}{transaction.amount.toLocaleString()} B-Coins</li>)}</ul></details>}
          </article>)}</div>
          <p className="text-xs">A saved level is current progress. Scores, ranks and feedback appear only when the game records a completed attempt.</p>
        </div>}
        <h3 className="production-history-heading mt-5 text-sm font-black uppercase">Completed production history</h3>
        <div className="player-account-scroll-list almanac-content-scroll production-logs-list admin-table-wrap mt-5 border-navy/10">
          <table className="admin-table">
            <thead><tr><th className="production-log-column-heading">Level</th><th className="production-log-column-heading">Product / Contract</th><th className="production-log-column-heading">Role</th><th className="production-log-column-heading">Client</th><th className="production-log-column-heading">Date</th><th className="production-log-column-heading">Score</th><th className="production-log-column-heading">Rank</th><th className="production-log-column-heading text-right">Info</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.level || "—"}</td>
                  <td className="font-bold">{log.production || (log.level ? `Level ${log.level} production` : "Production")}{typeof log.details["careerName"] === "string" && <span className="production-log-career block text-xs font-normal">Career: {log.details["careerName"]}{log.details["archivedCareer"] === true ? " · Archived" : ""}</span>}</td>
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
              {!logsQuery.isLoading && !logsQuery.isError && logs.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-navy/55">{careers.length ? "Your saved careers are synced. They do not contain completed production results yet. Finish and submit a production in the game, then sync and refresh." : "No saved careers or completed productions were returned for this account. Sign into the same account in the game and sync, then refresh."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {openLog && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-navy/70 p-4 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setOpenLog(null)}>
          <div role="dialog" aria-modal="true" aria-label={openLog.production} onClick={(event) => event.stopPropagation()} className="production-log-dialog my-auto flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="flex shrink-0 items-start gap-4 border-b border-navy/10 p-5 sm:p-6">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">Level {openLog.level} · {openLog.role}</p>
                <h3 className="production-log-title section-title mt-1 text-2xl text-navy sm:text-3xl">{openLog.production || `Level ${openLog.level} production`}</h3>
                <p className="mt-1 text-xs font-semibold text-navy/50">Client: {openLog.client} · {formatDate(openLog.date)}</p>
              </div>
              <button type="button" onClick={() => setOpenLog(null)} aria-label="Close production details" className="production-log-close rounded-md p-1.5 transition hover:bg-red-500/10"><X className="size-5" /></button>
            </header>

            <div className="min-h-0 space-y-6 overflow-y-auto p-5 sm:p-6">
              <section className="space-y-3">
                <h4 className="production-log-results-heading text-xs font-black uppercase tracking-[.16em]">Game Results</h4>
                <div className="flex flex-wrap gap-4 text-sm">{([["Camera", "cameraScore", "/70"], ["Lighting", "lightingScore", "/30"], ["Recorded takes", "takes", ""]] as const).map(([label, key, unit]) => typeof openLog.details[key] === "number" ? <p key={key}>{label}: {String(openLog.details[key])}{unit}</p> : null)}</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {([["Pre-production", openLog.preProductionScore, openLog.preProductionFeedback], ["Production", openLog.productionScore, openLog.productionFeedback], ["Post-production", openLog.postProductionScore, openLog.postProductionFeedback]] as const).filter(([, score, review]) => score != null || Boolean(review)).map(([label, score, review]) => <div key={label} className="rounded-lg border border-navy/10 bg-navy/[.03] p-3"><p className="text-[9px] font-black uppercase tracking-[.14em] text-navy/55">{label} Review</p>{score != null && <p className="mt-1 text-sm font-bold text-navy">{score}/100</p>}{review && <p className="mt-2 whitespace-pre-line text-sm text-navy/75">{cleanGameFeedback(review)}</p>}</div>)}
                </div>
                {(() => {
                  const budget = (openLog.details["budgetReview"] && typeof openLog.details["budgetReview"] === "object" ? openLog.details["budgetReview"] : openLog.details["budget"]) as Record<string, unknown> | undefined;
                  const spent = budget?.["spent"] ?? budget?.["amount_spent"];
                  const remaining = budget?.["remaining"] ?? budget?.["remaining_cash"];
                  const opening = budget?.["openingBalance"] ?? budget?.["opening_cash"];
                  const income = budget?.["income"];
                  const trackingComplete = budget?.["tracking_complete"] ?? budget?.["complete"];
                  const trackingAvailable = budget?.["available"];
                  const hasBudgetInfo = budget && [opening, income, spent, remaining, trackingComplete, trackingAvailable].some((item) => item != null);
                  return <div className="grid gap-3 sm:grid-cols-2">
                    {hasBudgetInfo && <div className="rounded-lg border border-navy/10 p-3"><p className="text-[10px] font-black uppercase text-navy/50">Budget Review</p><p className="mt-1 text-sm text-navy/75">{[opening, income, spent, remaining].some((item) => item != null) ? `Opening balance: ${opening ?? "—"} · Income: ${income ?? "—"} · Spent: ${spent ?? "—"} · Remaining: ${remaining ?? "—"}` : "Budget information recorded."}</p>{trackingAvailable === false && <p className="mt-1 text-sm text-navy/65">Budget tracking unavailable.</p>}{typeof trackingComplete === "boolean" && <p className="mt-1 text-sm text-navy/65">Tracking {trackingComplete ? "complete" : "incomplete"}.</p>}</div>}
                    {openLog.result && <div className="rounded-lg border border-navy/10 p-3"><p className="text-[10px] font-black uppercase text-navy/50">Client Decision</p><p className="mt-1 text-sm font-bold text-navy">{openLog.result}</p></div>}
                  </div>;
                })()}
                {openLog.nextStep && <div className="rounded-lg border border-coral/25 bg-coral/[.06] p-3"><p className="text-[10px] font-black uppercase text-coral">Your Next Step</p><p className="mt-1 text-sm text-navy/75">{openLog.nextStep}</p></div>}
              </section>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
