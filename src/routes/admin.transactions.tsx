import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Crew On Set! Admin" },
          { name: "description", content: "Review PayMongo payments and transaction receipts." },
    ],
  }),
  component: TransactionsPage,
});

import { useEffect, useMemo, useState } from "react";
import { Coins, Eye, ReceiptText, Search, Wallet2, X } from "lucide-react";
import { formatMoney } from "@/lib/demo/store";
import { topUps, topUpsStore } from "@/lib/admin-demo-data";
import { isMockMode } from "@/lib/playfab/config";
import { useAdminPayMongoOrders } from "@/lib/admin-paymongo-orders";
import type { TopUpRecord } from "@/lib/admin-demo-data";
import { PayMongoTopUpReceipt } from "@/components/transactions/paymongo-top-up-receipt";

const statusStyles: Record<string, string> = {
  Completed: "bg-[#2d9d8f]/15 text-[#4bc4b4]",
  Pending: "bg-[#d9a514]/15 text-[#e1b42b]",
  Failed: "bg-coral/15 text-[#ff7663]",
};

function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<TopUpRecord | null>(null);
  const mockMode = isMockMode();
  const [demoTopUps] = topUpsStore.useStore();
  const liveTopUpsQuery = useAdminPayMongoOrders();
  useEffect(() => {
    if (!mockMode) return;
    topUpsStore.set((current) => current.map((row) => {
      const seeded = topUps.find((sample) => sample.id === row.id);
      return seeded ? { ...seeded, ...row, bank: "PayMongo", amount: seeded.amount, coins: row.coins ?? seeded.coins, paymentMethod: "PayMongo", email: row.email ?? seeded.email, packageId: row.packageId ?? seeded.packageId, item: row.item ?? seeded.item, timestamp: row.timestamp ?? seeded.timestamp } : row;
    }));
  }, [mockMode]);
  const topUps = useMemo(
    () => (mockMode ? demoTopUps : (liveTopUpsQuery.data ?? [])),
    [demoTopUps, liveTopUpsQuery.data, mockMode],
  );

  const matches = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return topUps;
    return topUps.filter(
      (row) => row.playerName.toLowerCase().includes(search),
    );
  }, [query, topUps]);

  const matchedPlayer = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return null;
    const first = topUps.find((row) => row.playerName.toLowerCase() === search);
    return first ?? (matches.length > 0 ? matches[0] : null);
  }, [query, matches, topUps]);

  const rows = matchedPlayer
    ? topUps.filter((row) => row.playerId === matchedPlayer.playerId)
    : matches;

  const total = topUps.reduce((sum, row) => sum + row.amount, 0);
  const completed = topUps.filter((r) => r.status === "Completed").length;

  const summaries = [
    {
      label: "Total Payment Volume",
      value: formatMoney(total),
      icon: Coins,
      color: "bg-[#d9a514] text-[#101923]",
    },
    {
      label: "Completed Payments",
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
        <h1 className="admin-heading !text-white">Payment Ledger</h1>
        <p className="admin-kicker !text-white/45">
          Review PayMongo top-ups and partnership payments, then open a transaction receipt.
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
            placeholder="Search by player or brand"
            className="h-11 w-full rounded-md border border-white/10 bg-[#101923] pl-10 pr-3 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
          />
        </label>

        {matchedPlayer && (
          <p className="mt-3 text-xs !text-white/45">
            Showing top-up history for{" "}
            <span className="font-bold !text-white/80">{matchedPlayer.playerName}</span>
          </p>
        )}
      </section>

      <section className="mt-4 overflow-hidden rounded-lg border border-white/[0.06] bg-[#182330] shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full border-collapse text-left">
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
                  Payment Channel
                </th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                  Amount
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
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.05] transition hover:bg-white/[0.025] last:border-0"
                >
                  <td className="px-5 py-4 text-sm !text-white/60">{row.date}</td>
                  <td className="px-5 py-4 text-sm !text-white/45">{row.time}</td>
                  <td className="px-5 py-4">
                    <p className="font-bold !text-white">{row.playerName}</p>
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
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedTransaction(row)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-coral/40 px-3 py-2 text-[10px] font-black uppercase tracking-wide !text-coral transition hover:border-coral hover:bg-coral hover:!text-[#101923] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                    >
                      <Eye className="size-3.5" /> See Info
                    </button>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <p className="text-sm font-bold !text-white/40">No matching transactions</p>
                    <p className="mt-1 text-xs !text-white/25">
                      Try a different username.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedTransaction && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setSelectedTransaction(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-receipt-title"
            className="relative w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-[#182330] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] !text-coral">Crew On Set</p>
                <h2 id="transaction-receipt-title" className="mt-1 text-xl font-black uppercase !text-white">
                  Transaction Details
                </h2>
                <p className="mt-1 text-xs !text-white/40">Payment record and receipt summary</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                aria-label="Close transaction details"
                className="grid size-9 shrink-0 place-items-center rounded-full border border-white/15 !text-white/60 transition hover:bg-white/10 hover:!text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-5 sm:p-6">
              {selectedTransaction.transactionType !== "partnership" ? (
                <div className="mx-auto max-w-xl">
                  <PayMongoTopUpReceipt
                    reference={selectedTransaction.id}
                    playerName={selectedTransaction.playerName}
                    email={selectedTransaction.email}
                    dateTime={selectedTransaction.timestamp || `${selectedTransaction.date}T${selectedTransaction.time}:00`}
                    paymentMethod={selectedTransaction.paymentMethod}
                    amountPhp={selectedTransaction.amount}
                    coins={selectedTransaction.coins || 0}
                    status={selectedTransaction.status}
                    checkoutSessionId={selectedTransaction.checkoutSessionId}
                    eventId={selectedTransaction.eventId}
                  />
                </div>
              ) : <div className="mx-auto max-w-xl rounded-lg bg-[#fffdf6] p-5 text-[#101923] shadow-lg sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#101923]/15 pb-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#657080]">Crew On Set</p>
                    <h3 className="mt-2 text-lg font-black uppercase">
                      {selectedTransaction.status === "Completed" ? "Payment Receipt" : "Transaction Summary"}
                    </h3>
                    <p className="mt-1 break-all font-mono text-xs text-[#657080]">Reference: {selectedTransaction.id}</p>
                  </div>
                  <span className={`rounded px-3 py-1.5 text-[10px] font-black uppercase ${statusStyles[selectedTransaction.status]}`}>
                    {selectedTransaction.status}
                  </span>
                </div>

                <div className="grid gap-x-8 gap-y-5 border-b border-[#101923]/15 py-5 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#7b8490]">Paid by</p>
                    <p className="mt-1 break-words text-sm font-bold">{selectedTransaction.playerName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#7b8490]">Email</p>
                    <p className="mt-1 break-all text-sm font-bold">{selectedTransaction.email || "Not available"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#7b8490]">Date and time</p>
                    <p className="mt-1 text-sm font-bold">{selectedTransaction.date} · {selectedTransaction.time}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#7b8490]">Payment method</p>
                    <p className="mt-1 text-sm font-bold">{selectedTransaction.paymentMethod || selectedTransaction.bank}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#7b8490]">Item</p>
                    <p className="mt-1 text-sm font-bold">
                      {selectedTransaction.item || (selectedTransaction.transactionType === "partnership" ? "Brand partnership payment" : "C-Coin top-up")}
                    </p>
                    {selectedTransaction.coins !== undefined && (
                      <p className="mt-1 text-xs text-[#657080]">{selectedTransaction.coins.toLocaleString("en-PH")} C-Coins</p>
                    )}
                    {selectedTransaction.packageId && (
                      <p className="mt-1 font-mono text-[11px] text-[#657080]">Package: {selectedTransaction.packageId}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-end justify-between gap-4 py-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#7b8490]">
                      {selectedTransaction.status === "Completed" ? "Amount paid" : "Amount"}
                    </p>
                    <p className="mt-1 text-2xl font-black">{formatMoney(selectedTransaction.amount)}</p>
                  </div>
                  <p className="text-right text-xs font-bold uppercase text-[#657080]">PHP</p>
                </div>

                <div className="space-y-2 border-t border-dashed border-[#101923]/20 pt-4 text-[11px] text-[#657080]">
                  <p>
                    {selectedTransaction.transactionType === "partnership" ? "Application" : "Player account"}: {" "}
                    <span className="break-all font-mono text-[#101923]">{selectedTransaction.playerId}</span>
                  </p>
                  {selectedTransaction.checkoutSessionId && (
                    <p>PayMongo checkout: <span className="break-all font-mono text-[#101923]">{selectedTransaction.checkoutSessionId}</span></p>
                  )}
                  {selectedTransaction.eventId && (
                    <p>Payment event: <span className="break-all font-mono text-[#101923]">{selectedTransaction.eventId}</span></p>
                  )}
                  <p className="pt-2">
                    {selectedTransaction.status === "Completed"
                      ? "This is a Crew On Set transaction record. PayMongo may also send its own receipt to the billing email."
                      : "Payment is not complete, so this transaction summary is not a payment receipt."}
                  </p>
                </div>
              </div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
