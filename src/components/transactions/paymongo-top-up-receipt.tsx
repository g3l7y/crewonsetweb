type ReceiptStatus = "Completed" | "Pending" | "Failed" | "Partially Refunded" | "Refunded";

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
  refundedAmount?: number;
  simulated?: boolean;
  refunds?: Array<{ id: string; amount: number; status: "pending" | "processing" | "succeeded" | "failed"; reason: string; notes?: string; createdAt: string; receiptEmailSentAt?: string; notificationSentAt?: string; simulated?: boolean }>;
};

const statusStyles: Record<ReceiptStatus, string> = {
  Completed: "bg-emerald-50 text-emerald-800",
  Pending: "bg-amber-50 text-amber-800",
  Failed: "bg-rose-50 text-rose-800",
  "Partially Refunded": "bg-amber-50 text-amber-800",
  Refunded: "bg-emerald-50 text-emerald-800",
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
  refundedAmount = 0,
  simulated = false,
  refunds = [],
}: PayMongoTopUpReceiptProps) {
  const completed = status !== "Pending" && status !== "Failed";

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

        {refunds.length > 0 && <section className="border-b border-dashed border-[#b9b6ad] py-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#7b8580]">Refund history</p>
            <p className="text-sm font-bold">Confirmed refunded: {formatPhp(refundedAmount)}</p>
          </div>
          <div className="mt-3 space-y-3">{refunds.map((refund) => <div key={refund.id} className="rounded-lg border border-[#d8d3c7] p-3 text-xs">
            <div className="flex flex-wrap justify-between gap-2"><strong>{formatPhp(refund.amount)} · {refund.status}</strong><span>{formatReceiptDate(refund.createdAt)}</span></div>
            <p className="mt-1">Reason: {refund.reason.replaceAll("_", " ")}{refund.notes ? ` · ${refund.notes}` : ""}</p>
            <p className="mt-1 break-all text-[#68736f]">Refund reference: {refund.id}</p>
            {refund.simulated ? <p className="mt-1 font-bold text-amber-800">Simulated only: no money moved and no email was sent.</p> : <>
              <p className="mt-1">Email receipt: {refund.receiptEmailSentAt ? `sent ${formatReceiptDate(refund.receiptEmailSentAt)}` : "not yet confirmed as sent"}</p>
              <p>In-app notification: {refund.notificationSentAt ? `sent ${formatReceiptDate(refund.notificationSentAt)}` : "not yet confirmed as sent"}</p>
            </>}
          </div>)}</div>
          <p className="mt-3 text-xs text-[#68736f]">{simulated ? "Mock mode records the refund for display only. No real payment is refunded." : "A confirmed refund is sent to the original payment method. Your bank or provider may take additional time to post it."}</p>
        </section>}

        <div className="space-y-2 bg-transparent pt-4 font-mono text-[10px] leading-relaxed text-[#68736f]">
          {checkoutSessionId && <p className="break-all">PayMongo checkout: {checkoutSessionId}</p>}
          {eventId && <p className="break-all">Payment event: {eventId}</p>}
          <p className="pt-2 font-sans text-xs">Keep this receipt for your records. {simulated ? "This is a simulated payment; no money moved and no email was sent." : "C-Coins are credited to the player account shown above. PayMongo may also send a receipt to your email."}</p>
        </div>
      </div>
    </article>
  );
}

type ShopPurchaseReceiptProps = {
  reference: string;
  playerName: string;
  email?: string;
  dateTime: string;
  itemName: string;
  coinsPaid: number;
  status: "Completed" | "Recorded" | "Pending" | "Failed";
};

const shopStatusStyles: Record<ShopPurchaseReceiptProps["status"], string> = {
  Completed: "bg-emerald-50 text-emerald-800",
  Recorded: "bg-emerald-50 text-emerald-800",
  Pending: "bg-amber-50 text-amber-800",
  Failed: "bg-rose-50 text-rose-800",
};

export function ShopPurchaseReceipt({
  reference,
  playerName,
  email,
  dateTime,
  itemName,
  coinsPaid,
  status,
}: ShopPurchaseReceiptProps) {
  return (
    <article className="relative overflow-hidden border border-[#d8d3c7] bg-[#fffdf7] text-[#17231f] shadow-[0_18px_45px_rgba(15,23,42,.14)]">
      <div className="h-2 bg-[#0d493d]" />
      <div className="p-5 sm:p-8">
        <header className="flex items-start justify-between gap-4 border-b border-dashed border-[#b9b6ad] pb-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#315b4d]">Crew On Set</p>
            <h3 className="mt-2 font-mono text-xl font-black uppercase tracking-[.12em]">Transaction receipt</h3>
            <p className="mt-2 break-all font-mono text-xs text-[#68736f]">Reference: {reference}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${shopStatusStyles[status]}`}>
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
            <p className="mt-1 font-semibold">C-Coins</p>
          </div>
        </section>

        <section className="py-5">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[.16em] text-[#7b8580]">Order details</p>
          <div className="flex items-start justify-between gap-4 text-sm">
            <p className="font-bold">{itemName}</p>
            <strong className="shrink-0 font-mono">−{coinsPaid.toLocaleString("en-PH")} C-Coins</strong>
          </div>
        </section>

        <section className="grid gap-4 border-y border-dashed border-[#b9b6ad] py-5 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#7b8580]">C-Coins paid</p>
            <p className="mt-1 font-mono text-2xl font-black">−{coinsPaid.toLocaleString("en-PH")}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#68736f]">C-Coins</p>
          </div>
          <div className="sm:border-l sm:border-[#d8d3c7] sm:pl-5">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#7b8580]">Item received</p>
            <p className="mt-1 break-words font-mono text-xl font-black">{itemName}</p>
          </div>
        </section>

        <p className="pt-4 text-xs leading-relaxed text-[#68736f]">Keep this receipt for your records. The item has been added to your collection.</p>
      </div>
    </article>
  );
}
