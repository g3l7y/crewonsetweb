type ReceiptStatus = "Completed" | "Pending" | "Failed";

type PayMongoTopUpReceiptProps = {
  reference: string;
  playerName: string;
  email?: string;
  dateTime: string;
  paymentMethod?: string;
  amountPhp: number;
  coins: number;
  status: ReceiptStatus;
  checkoutSessionId?: string;
  eventId?: string;
};

const statusStyles: Record<ReceiptStatus, string> = {
  Completed: "bg-emerald-50 text-emerald-800",
  Pending: "bg-amber-50 text-amber-800",
  Failed: "bg-rose-50 text-rose-800",
};

function formatPhp(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatReceiptDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value || "Not available"
    : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

export function PayMongoTopUpReceipt({
  reference,
  playerName,
  email,
  dateTime,
  amountPhp,
  coins,
  status,
  checkoutSessionId,
  eventId,
}: PayMongoTopUpReceiptProps) {
  const completed = status === "Completed";

  return (
    <article className="relative overflow-hidden border border-[#d8d3c7] bg-[#fffdf7] text-[#17231f] shadow-[0_18px_45px_rgba(15,23,42,.14)]">
      <div className="h-2 bg-[#0d493d]" />
      <div className="p-5 sm:p-8">
        <header className="flex items-start justify-between gap-4 border-b border-dashed border-[#b9b6ad] pb-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#315b4d]">Crew On Set</p>
            <h3 className="mt-2 font-mono text-xl font-black uppercase tracking-[.12em]">{completed ? "Payment receipt" : "Payment record"}</h3>
            <p className="mt-2 break-all font-mono text-xs text-[#68736f]">Reference: {reference}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${statusStyles[status]}`}>
            {status}
          </span>
        </header>

        <section className="grid gap-5 border-b border-dashed border-[#b9b6ad] py-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#7b8580]">Paid by</p>
            <p className="mt-1 break-words font-semibold">{playerName || "Player"}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#7b8580]">Email</p>
            <p className="mt-1 break-all font-semibold">{email || "Not available"}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#7b8580]">Date and time</p>
            <p className="mt-1 font-semibold">{formatReceiptDate(dateTime)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#7b8580]">Payment method</p>
            <p className="mt-1 font-semibold">PayMongo</p>
          </div>
        </section>

        <section className="py-5">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[.16em] text-[#7b8580]">Order details</p>
          <div className="flex items-start justify-between gap-4 text-sm">
            <div>
              <p className="font-bold">C-Coin top-up</p>
              <p className="mt-1 text-xs text-[#68736f]">{completed ? coins.toLocaleString("en-PH") : "0"} C-Coins credited</p>
            </div>
            <strong className="shrink-0 font-mono">{formatPhp(amountPhp)}</strong>
          </div>
        </section>

        <section className="grid gap-4 border-y border-dashed border-[#b9b6ad] py-5 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#7b8580]">Amount paid</p>
            <p className="mt-1 font-mono text-2xl font-black">{formatPhp(amountPhp)}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#68736f]">PHP</p>
          </div>
          <div className="sm:border-l sm:border-[#d8d3c7] sm:pl-5">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#7b8580]">C-Coins {completed ? "received" : "to be credited"}</p>
            <p className="mt-1 font-mono text-2xl font-black">{completed ? `+${coins.toLocaleString("en-PH")}` : "—"}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#68736f]">C-Coins</p>
          </div>
        </section>

        <div className="space-y-2 bg-transparent pt-4 font-mono text-[10px] leading-relaxed text-[#68736f]">
          {checkoutSessionId && <p className="break-all">PayMongo checkout: {checkoutSessionId}</p>}
          {eventId && <p className="break-all">Payment event: {eventId}</p>}
          <p className="pt-2 font-sans text-xs">Keep this receipt for your records. C-Coins are credited to the player account shown above.</p>
        </div>
      </div>
    </article>
  );
}
