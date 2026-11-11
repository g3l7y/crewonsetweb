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
  bCoinsEarned: number | undefined;
  preProductionFeedback: string;
  productionFeedback: string;
  postProductionFeedback: string;
  details: Record<string, unknown>;
  nextStep: string | undefined;
};

const scoreFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

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

function FeedbackText({ value }: { value: string }) {
  return cleanGameFeedback(value).split(/\r?\n/).map((line, index) => {
    const text = line.trim();
    const heading = /[A-Z]/.test(text) && text === text.toUpperCase();
    const positive = /^\+(?:\s|\d)/.test(text);
    const negative = /^[-−](?:\s|\d)/.test(text);
    const tone = positive ? "review-gain" : negative ? "review-loss" : "";
    return <span key={index} className={tone}>
      {index > 0 && <br />}
      {heading ? <strong>{line}</strong> : line.split(/(\b(?:Income|Spent|Reward):\s*[\d,.]+|(?<![\w\d])[+−-]\d[\d,.]*|^[A-Z][A-Z -]+:)/g).map((part, n) => {
        if (/^(Income:|Reward:|\+\d)/i.test(part)) return <strong key={n} className="review-gain">{part}</strong>;
        if (/^(Spent:|[-−]\d)/i.test(part)) return <strong key={n} className="review-loss">{part}</strong>;
        return /^[A-Z][A-Z -]+:$/.test(part) ? <strong key={n}>{part}</strong> : part;
      })}
    </span>;
  });
}

function getPhaseFeedback(details: Record<string, unknown>, camel: string, snake: string): string {
  const phases = details["phases"] && typeof details["phases"] === "object" ? details["phases"] as Record<string, unknown> : {};
  const phase = phases[camel] ?? phases[snake];
  const phaseData = phase && typeof phase === "object" ? phase as Record<string, unknown> : {};
  const candidates = [
    phaseData["feedback"], phaseData["clientFeedback"], phaseData["notes"], phaseData["review"],
    phase, details[camel + "Feedback"], details[snake + "_feedback"], details[camel + "Review"], details[snake + "_review"],
  ];
  const value = candidates.find((candidate) => (typeof candidate === "string" && candidate.trim()) || (Array.isArray(candidate) && candidate.length > 0));
  return typeof value === "string" ? value.trim() : Array.isArray(value) ? value.map(String).join("\n") : "";
}

function getDecisionNotes(value: string): string {
  let section = "decision";
  return cleanGameFeedback(value).split(/\r?\n/).map((line) => line.trim()).filter((line) => {
    const heading = line.replace(/[^a-z ]/gi, "").trim().toLowerCase();
    if (heading === "your next step") { section = "next"; return false; }
    if (heading === "budget review") { section = "budget"; return false; }
    if (section !== "decision" || /^recorded takes\s*:/i.test(line)) return false;
    return Boolean(line) && !/^(?:contract\s+)?(?:passed|failed)[.!:]?$/i.test(line);
  }).join("\n");
}

function mapGameProduction(log: GameProductionLog): ProductionLog {
  const sourceDetails = (log.details && typeof log.details === "object" ? log.details : {}) as Record<string, unknown>;
  const budgetDetails = (sourceDetails["budgetReview"] ?? sourceDetails["budget"]) as Record<string, unknown> | undefined;
  const hasRootBudget = log.hasBudgetReview || [log.budgetOpeningBalance, log.budgetIncome, log.budgetUsed, log.budgetRemaining].some((value) => value != null) || Boolean(log.budgetFeedback);
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
    role: log.mode === "multiplayer" ? formatCrewRoles(log.role || log.roles?.join(", ") || "") : "All Roles",
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
    bCoinsEarned: log.bCoinsEarned,
    preProductionFeedback: log.preProductionFeedback || getPhaseFeedback(details, "preProduction", "pre_production"),
    productionFeedback: log.productionFeedback || getPhaseFeedback(details, "production", "production"),
    postProductionFeedback: log.postProductionFeedback || getPhaseFeedback(details, "postProduction", "post_production"),
    details,
    nextStep,
  };
}

function formatCrewRoles(value: string): string {
  return value.split(",").map((role) => {
    const normalized = role.trim().toLowerCase();
    if (normalized === "camera" || normalized === "cameraman") return "Cameraman";
    if (normalized === "av technician" || normalized === "av_technician") return "AV Technician";
    if (normalized === "director") return "Director";
    if (normalized === "editor") return "Editor";
    return role.trim();
  }).filter(Boolean).join(", ");
}

export function ProductionLogs() {
  const logsQuery = useProductionHistory();
  const [openLog, setOpenLog] = useState<ProductionLog | null>(null);
  const logs = useMemo(() => (logsQuery.data?.logs ?? []).map(mapGameProduction), [logsQuery.data]);

  return (
    <section className="production-history-panel mt-7 almanac-content-panel p-4 sm:p-6">
      <div className="almanac-content-body">
        <h2 className="section-title text-3xl text-navy sm:text-4xl">Production Logs</h2>
        <div className="production-history-heading mt-1 flex items-center justify-between gap-3 text-sm text-navy"><p>Latest complete single-player result for each level, plus completed multiplayer productions.</p><button type="button" className="rounded border px-3 py-2 font-bold" disabled={logsQuery.isFetching} onClick={() => void logsQuery.refetch()}>{logsQuery.isFetching ? "Refreshing…" : "Refresh"}</button></div>
        <h3 className="production-history-heading mt-5 text-sm font-black uppercase">Completed production history</h3>
        <div className="player-account-scroll-list almanac-content-scroll production-logs-list admin-table-wrap mt-5 border-navy/10">
          <table className="admin-table">
            <thead><tr><th className="production-log-column-heading">Level</th><th className="production-log-column-heading">Contract</th><th className="production-log-column-heading">Roles</th><th className="production-log-column-heading">Date</th><th className="production-log-column-heading">Score</th><th className="production-log-column-heading">Rank</th><th className="production-log-column-heading text-right">Info</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.level || "—"}</td>
                  <td className="font-bold">{log.production || (log.level ? `Level ${log.level} production` : "Production")}{typeof log.details["careerName"] === "string" && <span className="production-log-career block text-xs font-normal">Career: {log.details["careerName"]}{log.details["archivedCareer"] === true ? " · Archived" : ""}</span>}</td>
                  <td>{log.role || "—"}</td>
                  <td className="whitespace-nowrap">{formatDate(log.date)}</td>
                  <td className="font-black">{log.score == null ? "—" : `${scoreFormat.format(log.score)}%`}</td>
                  <td><span className={`production-log-rank inline-grid size-7 place-items-center rounded-md border text-xs font-black ${rankTone[log.rank] ?? "bg-navy/[.04] text-navy/50 border-navy/10"}`}>{log.rank || "—"}</span></td>
                  <td className="text-right"><button type="button" onClick={() => setOpenLog(log)} className="production-log-info rounded-md border border-navy/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-navy transition hover:bg-navy/5">See Info</button></td>
                </tr>
              ))}
              {logsQuery.isLoading && <tr><td colSpan={7} className="py-8 text-center">Loading completed productions…</td></tr>}
              {logsQuery.isError && <tr><td colSpan={7} className="py-8 text-center text-red-700">Couldn't load production history. Please try again.</td></tr>}
              {!logsQuery.isLoading && !logsQuery.isError && logs.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-navy/55">No completed productions recorded yet. Finish a level or multiplayer production in the game, then refresh to see your results here.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {openLog && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-navy/70 p-4 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setOpenLog(null)}>
          <div role="dialog" aria-modal="true" aria-label={openLog.production} onClick={(event) => event.stopPropagation()} className="production-log-dialog my-auto flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="flex shrink-0 items-start gap-4 border-b border-navy/10 p-5 sm:p-6">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">Level {openLog.level} · {openLog.role}</p>
                <h3 className="production-log-title mt-1 text-2xl text-navy sm:text-3xl">{openLog.production || `Level ${openLog.level} production`}</h3>
                <p className="mt-1 text-xs font-semibold text-navy/50">{formatDate(openLog.date)} · Rank {openLog.rank}{openLog.score != null && ` · ${scoreFormat.format(openLog.score)}% overall`}</p>
              </div>
              <button type="button" onClick={() => setOpenLog(null)} aria-label="Close production details" className="production-log-close rounded-md p-1.5 transition hover:bg-red-500/10"><X className="size-5" /></button>
            </header>

            <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:px-10 sm:py-7">
              <section className="space-y-5">
                <h4 className="production-log-results-heading text-xs font-black uppercase tracking-[.16em]">Game Results</h4>
                <div className="flex flex-wrap gap-4 text-sm">{([["Camera", "cameraScore", "/70"], ["Lighting", "lightingScore", "/30"], ["Recorded takes", "takes", ""]] as const).map(([label, key, unit]) => typeof openLog.details[key] === "number" ? <p key={key}>{label}: {scoreFormat.format(Number(openLog.details[key]))}{unit}</p> : null)}</div>
                <div className="grid gap-3">
                  {([["Pre-production", openLog.preProductionScore, openLog.preProductionFeedback], ["Production", openLog.productionScore, openLog.productionFeedback], ["Post-production", openLog.postProductionScore, openLog.postProductionFeedback]] as const).filter(([, score, review]) => score != null || Boolean(review)).map(([label, score, review]) => (
                    <details key={label} className="rounded-lg border border-current/20">
                      <summary className="cursor-pointer px-5 py-4 text-base font-bold">
                        {label} review
                        {score != null && <span className="float-right ml-2 text-sm tabular-nums">{scoreFormat.format(score)}/100</span>}
                      </summary>
                      <p className="max-w-prose whitespace-pre-line px-5 pb-5 text-base leading-7">
                        {review ? <FeedbackText value={review} /> : "No written feedback was recorded."}
                      </p>
                    </details>
                  ))}
                </div>
                {(() => {
                  const budget = (openLog.details["budgetReview"] && typeof openLog.details["budgetReview"] === "object" ? openLog.details["budgetReview"] : openLog.details["budget"]) as Record<string, unknown> | undefined;
                  const spent = budget?.["spent"] ?? budget?.["amount_spent"];
                  const remaining = budget?.["remaining"] ?? budget?.["remaining_cash"];
                  const opening = budget?.["openingBalance"] ?? budget?.["opening_cash"];
                  const income = budget?.["income"];
                  const trackingComplete = budget?.["tracking_complete"] ?? budget?.["complete"];
                  const trackingAvailable = budget?.["available"];
                  const hasBudgetInfo = budget && ([opening, income, spent, remaining, trackingComplete, trackingAvailable].some((item) => item != null) || Boolean(budget["feedback"]));
                  return <div className="grid items-start gap-4">
                    {hasBudgetInfo && <div className="rounded-lg border border-navy/10 p-5"><p className="text-[10px] font-black uppercase text-navy/50">Budget Review</p>{openLog.bCoinsEarned != null && <p className="mt-1 text-sm font-bold text-navy">This submission: <strong className={openLog.bCoinsEarned < 0 ? "review-loss" : "review-gain"}>{openLog.bCoinsEarned >= 0 ? "+" : ""}{openLog.bCoinsEarned.toLocaleString()} B-Coins</strong></p>}{typeof budget?.["feedback"] === "string" && budget["feedback"].trim() ? <p className="mt-1 max-w-prose whitespace-pre-line text-sm leading-7 text-navy/75">{<FeedbackText value={budget["feedback"].replace(/^BUDGET REVIEW\s*\n/i, "")} />}</p> : <p className="mt-1 text-sm text-navy/75">{[opening, income, spent, remaining].some((item) => item != null) ? `Opening balance: ${opening ?? "—"} · Income: ${income ?? "—"} · Spent: ${spent ?? "—"} · Remaining: ${remaining ?? "—"}` : "Budget information recorded."}</p>}{trackingAvailable === false && <p className="mt-1 text-sm text-navy/65">Budget tracking unavailable.</p>}{typeof trackingComplete === "boolean" && <p className="mt-1 text-sm text-navy/65">Tracking {trackingComplete ? "complete" : "incomplete"}.</p>}</div>}
                    {openLog.result && <div className="rounded-lg border border-navy/10 p-5"><p className="text-[10px] font-black uppercase text-navy/50">Client Decision</p><p className="mt-1 text-sm font-bold text-navy">{<strong className={openLog.result === "passed" ? "review-gain" : openLog.result === "failed" ? "review-loss" : ""}>{["passed", "failed"].includes(openLog.result) ? "CONTRACT " + openLog.result.toUpperCase() : openLog.result}</strong>}</p>{getDecisionNotes(openLog.summary) && <p className="mt-2 max-w-prose whitespace-pre-line text-sm leading-7 font-normal text-navy/75"><FeedbackText value={getDecisionNotes(openLog.summary)} /></p>}</div>}
                  </div>;
                })()}
                {openLog.nextStep && <div className="rounded-lg border border-coral/25 bg-coral/[.06] p-3"><p className="text-[10px] font-black uppercase text-coral">Your Next Step</p><p className="mt-1 text-sm text-navy/75"><FeedbackText value={openLog.nextStep} /></p></div>}
              </section>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
