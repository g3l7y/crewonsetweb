import { useState } from "react";
import { Clock, Star, Trophy, X } from "lucide-react";

type ProductionLog = {
  id: string;
  production: string;
  role: string;
  client: string;
  date: string;
  score: number;
  rank: string;
  runtime: string;
  summary: string;
  setupNotes: string;
  result: string;
  stats: [string, string][];
};

const productionLogs: ProductionLog[] = [
  {
    id: "PRD-2291",
    production: "Kalye Cold Brew — Morning Ritual",
    role: "Cameraman",
    client: "Cafe Kalye",
    date: "2026-08-26",
    score: 98,
    rank: "S",
    runtime: "42m 10s",
    summary:
      "Single-location commercial shot handheld at first light. Client asked for warm practicals and steady push-ins on the pour.",
    setupNotes: "NL-70 prime, 2x soft box bounce, no ND. Reflector on the barista's left.",
    result: "Client approved the first cut. Bonus paid for zero retakes.",
    stats: [
      ["Shots", "24"],
      ["Retakes", "0"],
      ["Focus Accuracy", "99%"],
      ["Client Rating", "5.0"],
    ],
  },
  {
    id: "PRD-2287",
    production: "Vantage Crew Jacket — Backlot Walk",
    role: "Cameraman",
    client: "Vantage Apparel",
    date: "2026-08-22",
    score: 94,
    rank: "A",
    runtime: "1h 04m",
    summary:
      "Tracking shots along the backlot with two talent changes. Wind pushed the audio department into a re-record.",
    setupNotes: "Gimbal rig, 35mm, polariser on for the jacket sheen.",
    result: "Delivered on schedule. One retake requested by the Editor for soft focus.",
    stats: [
      ["Shots", "31"],
      ["Retakes", "1"],
      ["Focus Accuracy", "94%"],
      ["Client Rating", "4.6"],
    ],
  },
  {
    id: "PRD-2280",
    production: "Bolt Zero — Night Court",
    role: "AV Technician",
    client: "Bolt Energy",
    date: "2026-08-17",
    score: 88,
    rank: "B",
    runtime: "58m 32s",
    summary:
      "Night exterior on the studio court. Practicals blew out the highlights until the lighting rig was re-balanced.",
    setupNotes: "Two 1.2k HMI, haze, lav mics on both talent.",
    result: "Passed review after a colour pass. Clipping flagged in two takes.",
    stats: [
      ["Shots", "19"],
      ["Retakes", "2"],
      ["Audio Clipping", "2 takes"],
      ["Client Rating", "4.2"],
    ],
  },
  {
    id: "PRD-2274",
    production: "Skyfare Domestic Promo",
    role: "Director",
    client: "Skyfare Airlines",
    date: "2026-08-11",
    score: 91,
    rank: "A",
    runtime: "1h 27m",
    summary:
      "Multi-set promo covering check-in, cabin and arrival. Directed a four-person crew across three set dressings.",
    setupNotes: "Studio A cabin build, soft top light, dolly on the aisle.",
    result: "Client requested one extra insert shot; delivered same day.",
    stats: [
      ["Shots", "44"],
      ["Retakes", "3"],
      ["Crew Size", "4"],
      ["Client Rating", "4.8"],
    ],
  },
  {
    id: "PRD-2268",
    production: "Northline NL-70 — Lens Feature",
    role: "Editor",
    client: "Northline Optics",
    date: "2026-08-04",
    score: 96,
    rank: "S",
    runtime: "36m 55s",
    summary:
      "Product feature cut from two camera angles. Auto-sync handled the audio, error highlighting caught one soft frame.",
    setupNotes: "Reference monitor calibrated, macro coverage on the lens barrel.",
    result: "Approved without notes. Used as the studio reference cut.",
    stats: [
      ["Shots", "17"],
      ["Retakes", "0"],
      ["Sync Errors", "0"],
      ["Client Rating", "4.9"],
    ],
  },
  {
    id: "PRD-2259",
    production: "Studio B — Craft Services Spot",
    role: "Cameraman",
    client: "Cafe Kalye",
    date: "2026-07-29",
    score: 84,
    rank: "B",
    runtime: "51m 08s",
    summary:
      "Fast turnaround spot with limited coverage. Two shots lost to a boom entering frame.",
    setupNotes: "24mm wide, overhead bounce, handheld.",
    result: "Delivered late by 20 minutes. Client accepted the cut.",
    stats: [
      ["Shots", "22"],
      ["Retakes", "2"],
      ["Focus Accuracy", "88%"],
      ["Client Rating", "4.0"],
    ],
  },
  {
    id: "PRD-2251",
    production: "Vantage Apparel — Lookbook Stills",
    role: "AV Technician",
    client: "Vantage Apparel",
    date: "2026-07-21",
    score: 90,
    rank: "A",
    runtime: "1h 12m",
    summary:
      "Lighting-led session with rapid wardrobe changes. Ran a two-key setup to keep the turnaround tight.",
    setupNotes: "Key + rim, white cyc, 5600K balanced.",
    result: "All looks captured within the booked window.",
    stats: [
      ["Looks", "12"],
      ["Retakes", "1"],
      ["Setup Time", "18m"],
      ["Client Rating", "4.7"],
    ],
  },
  {
    id: "PRD-2244",
    production: "Bolt Energy — Vending Reveal",
    role: "Director",
    client: "Bolt Energy",
    date: "2026-07-14",
    score: 79,
    rank: "C",
    runtime: "1h 33m",
    summary:
      "Backlot reveal that ran long. Talent availability forced a compressed shot list late in the day.",
    setupNotes: "Practical vending light, 50mm, bounce card.",
    result: "Client requested a re-shoot of the hero reveal.",
    stats: [
      ["Shots", "28"],
      ["Retakes", "5"],
      ["Overtime", "22m"],
      ["Client Rating", "3.6"],
    ],
  },
  {
    id: "PRD-2236",
    production: "Skyfare — Cabin Safety Insert",
    role: "Editor",
    client: "Skyfare Airlines",
    date: "2026-07-06",
    score: 93,
    rank: "A",
    runtime: "44m 21s",
    summary:
      "Assembly cut of cabin inserts with on-screen callouts. Error highlighting caught a clipped announcement track.",
    setupNotes: "Reference monitor, dual-audio timeline, colour matched to plate.",
    result: "Approved after one round of notes.",
    stats: [
      ["Shots", "20"],
      ["Retakes", "1"],
      ["Sync Errors", "1"],
      ["Client Rating", "4.6"],
    ],
  },
  {
    id: "PRD-2228",
    production: "Cafe Kalye — Barista Portrait Series",
    role: "Cameraman",
    client: "Cafe Kalye",
    date: "2026-06-28",
    score: 97,
    rank: "S",
    runtime: "39m 44s",
    summary:
      "Portrait series shot on long glass with shallow depth. Focus pulls landed on every take.",
    setupNotes: "85mm, single soft key, negative fill on camera-left.",
    result: "Featured in the client's storefront campaign.",
    stats: [
      ["Shots", "18"],
      ["Retakes", "0"],
      ["Focus Accuracy", "100%"],
      ["Client Rating", "5.0"],
    ],
  },
  {
    id: "PRD-2219",
    production: "Studio A — Crew Training Reel",
    role: "AV Technician",
    client: "Crew On Set! Studios",
    date: "2026-06-19",
    score: 86,
    rank: "B",
    runtime: "1h 02m",
    summary:
      "Internal training reel demonstrating rig safety. Audio needed a second pass in the noisy stage.",
    setupNotes: "Lav + boom, 3-point lighting, static frame.",
    result: "Published to the crew library.",
    stats: [
      ["Shots", "26"],
      ["Retakes", "2"],
      ["Audio Passes", "2"],
      ["Client Rating", "4.3"],
    ],
  },
];

const rankTone: Record<string, string> = {
  S: "bg-yellow/20 text-navy border-yellow/50",
  A: "bg-coral/15 text-coral border-coral/40",
  B: "bg-navy/[.06] text-navy/70 border-navy/15",
  C: "bg-navy/[.04] text-navy/50 border-navy/10",
};

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function ProductionLogs() {
  const [openLog, setOpenLog] = useState<ProductionLog | null>(null);

  return (
    <section className="mt-14">
      {/* Production logs */}
      <div>
        <h2 className="section-title text-3xl text-navy sm:text-4xl">
          Production Logs
        </h2>
        <p className="mt-1 text-sm text-navy/55">
          Every production you wrapped, scored and ranked.
        </p>

        <div className="admin-table-wrap mt-5 border-navy/10">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Production</th>
                <th>Role</th>
                <th>Client</th>
                <th>Date</th>
                <th>Score</th>
                <th>Rank</th>
                <th className="text-right">Info</th>
              </tr>
            </thead>
            <tbody>
              {productionLogs.map((log) => (
                <tr key={log.id}>
                  <td className="font-bold text-navy">{log.production}</td>
                  <td>{log.role}</td>
                  <td>{log.client}</td>
                  <td className="whitespace-nowrap">{formatDate(log.date)}</td>
                  <td className="font-black text-navy">{log.score}%</td>
                  <td>
                    <span
                      className={`inline-grid size-7 place-items-center rounded-md border text-xs font-black ${
                        rankTone[log.rank] ?? rankTone["B"]
                      }`}
                    >
                      {log.rank}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => setOpenLog(log)}
                      className="rounded-md border border-navy/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-navy transition hover:bg-navy/5"
                    >
                      See Info
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {openLog && (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-navy/70 p-4 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setOpenLog(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={openLog.production}
            onClick={(event) => event.stopPropagation()}
            className="my-auto w-full max-w-3xl rounded-xl bg-white shadow-2xl"
          >
            <header className="flex items-start gap-4 border-b border-navy/10 p-5 sm:p-6">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">
                  {openLog.id} · {openLog.role}
                </p>
                <h3 className="section-title mt-1 text-2xl text-navy sm:text-3xl">
                  {openLog.production}
                </h3>
                <p className="mt-1 text-xs font-semibold text-navy/50">
                  {openLog.client} · {formatDate(openLog.date)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpenLog(null)}
                aria-label="Close production details"
                className="rounded-md p-1.5 text-navy/40 transition hover:bg-navy/5 hover:text-navy"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="space-y-6 p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {openLog.stats.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-navy/10 bg-navy/[.03] p-3"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[.16em] text-navy/40">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-black text-navy">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-navy/45">
                    Shoot Summary
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-navy/70">
                    {openLog.summary}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-navy/45">
                    Setup Notes
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-navy/70">
                    {openLog.setupNotes}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-lg border border-navy/10 p-3">
                  <Clock className="size-4 text-coral" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.16em] text-navy/40">
                      Runtime
                    </p>
                    <p className="text-sm font-bold text-navy">{openLog.runtime}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-navy/10 p-3">
                  <Star className="size-4 text-yellow" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.16em] text-navy/40">
                      Score
                    </p>
                    <p className="text-sm font-bold text-navy">
                      {openLog.score}% · Rank {openLog.rank}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-navy/10 p-3 sm:col-span-1">
                  <Trophy className="size-4 text-coral" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[.16em] text-navy/40">
                      Result
                    </p>
                    <p className="text-sm font-bold text-navy">{openLog.rank === "S" ? "Exceptional" : "Wrapped"}</p>
                  </div>
                </div>
              </div>

              <p className="rounded-lg border border-coral/25 bg-coral/[.06] p-4 text-sm leading-relaxed text-navy/75">
                {openLog.result}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
