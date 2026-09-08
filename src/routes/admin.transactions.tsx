import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Crew On Set! Admin" },
      { name: "description", content: "Track C-Coin top-ups and currency transactions." },
    ],
  }),
  component: TransactionsPage,
});

import { useMemo, useState } from "react";
import { Coins, ReceiptText, Search, Wallet2 } from "lucide-react";
import { formatMoney } from "@/lib/demo/store";
import { topUps } from "@/lib/admin-demo-data";

const statusStyles: Record<string, string> = {
  Completed: "bg-[#2d9d8f]/15 text-[#4bc4b4]",
  Pending: "bg-[#d9a514]/15 text-[#e1b42b]",
  Failed: "bg-coral/15 text-[#ff7663]",
};

function TransactionsPage() {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return topUps;
    return topUps.filter(
      (row) =>
        row.playerName.toLowerCase().includes(search) ||
        row.playerId.toLowerCase().includes(search),
    );
  }, [query]);

  const matchedPlayer = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return null;
    const first = topUps.find(
      (row) => row.playerName.toLowerCase() === search || row.playerId.toLowerCase() === search,
    );
    return first ?? (matches.length > 0 ? matches[0] : null);
  }, [query, matches]);

  const rows = matchedPlayer
    ? topUps.filter((row) => row.playerId === matchedPlayer.playerId)
    : matches;

  const total = topUps.reduce((sum, row) => sum + row.amount, 0);
  const completed = topUps.filter((r) => r.status === "Completed").length;

  const summaries = [
    {
      label: "Total C-Coin Revenue",
      value: formatMoney(total),
      icon: Coins,
      color: "bg-[#d9a514] text-[#101923]",
    },
    {
      label: "Completed Top-Ups",
      value: completed.toLocaleString(),
      icon: ReceiptText,
      color: "bg-[#243241] text-white",
    },
    {
      label: "Total Ledger Entries",
      value: topUps.length.toLocaleString(),
      icon: Wallet2,
      color: "bg-coral text-white",
    },
  ];

  return (
    <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
      <header className="mb-8">
        <p className="text-xs font-black tracking-[.18em] !text-coral">ECONOMY</p>
        <h1 className="admin-heading mt-2 !text-white">C-Coin Top-Up Ledger</h1>
        <p className="admin-kicker !text-white/45">
          Monitor bank-funded C-Coin top-ups and search by player.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {summaries.map((summary) => (
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
      </section>

      <section className="mt-6 rounded-lg border border-white/[0.06] bg-[#182330] p-4 shadow-xl">
        <label className="relative block max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 !text-white/30" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by Player Name or Player ID"
            className="h-11 w-full rounded-md border border-white/10 bg-[#101923] pl-10 pr-3 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
          />
        </label>

        {matchedPlayer && (
          <p className="mt-3 text-xs !text-white/45">
            Showing top-up history for{" "}
            <span className="font-bold !text-white/80">{matchedPlayer.playerName}</span> (
            {matchedPlayer.playerId})
          </p>
        )}
      </section>

      <section className="mt-4 overflow-hidden rounded-lg border border-white/[0.06] bg-[#182330] shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#141e29]">
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                  Date
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                  Time
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                  Player
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                  Bank Account
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                  Amount
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.05] transition hover:bg-white/[0.025] last:border-0"
                >
                  <td className="px-5 py-4 text-sm !text-white/60">{row.date}</td>
                  <td className="px-5 py-4 text-sm !text-white/45">{row.time}</td>
                  <td className="px-5 py-4">
                    <p className="font-bold !text-white">{row.playerName}</p>
                    <p className="mt-0.5 text-[10px] !text-white/30">{row.playerId}</p>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs !text-white/55">{row.bank}</td>
                  <td className="px-5 py-4 font-black !text-white">{formatMoney(row.amount)}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded px-2.5 py-1 text-[10px] font-black uppercase ${statusStyles[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <p className="text-sm font-bold !text-white/40">No matching transactions</p>
                    <p className="mt-1 text-xs !text-white/25">
                      Try a different player name or player ID.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
