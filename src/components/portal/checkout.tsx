import { FormEvent, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  Coins,
  CreditCard,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import {
  coinPackages,
  getCheckoutPayload,
  setCheckoutPayload,
  paymentMethods,
  type PaymentMethodId,
} from "@/lib/demo/portal-shop";
import { walletStore, formatCoins, notificationsStore, uid } from "@/lib/demo/store";
import { EMAIL_ERROR, isValidEmail } from "@/lib/validation";

const methodIcons: Record<PaymentMethodId, typeof CreditCard> = {
  card: CreditCard,
  gcash: Smartphone,
  unionbank: Building2,
  paypal: Wallet,
};

type CheckoutPageProps = {
  onBack?: () => void;
};

/**
 * Checkout is exclusively the mock real-money flow for buying C-Coin
 * packages. Cosmetic item purchases are handled entirely in the Shop via the
 * in-page confirmation popup and never route here.
 */
export default function CheckoutPage({ onBack }: CheckoutPageProps) {
  const [wallet, setWallet] = walletStore.useStore();
  const [notifications, setNotifications] = notificationsStore.useStore();

  const [payload] = useState(() => getCheckoutPayload());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("card");
  const [email, setEmail] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardholder, setCardholder] = useState("");
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const balance = wallet[0] ?? 0;

  const pack = useMemo(
    () => (payload?.kind === "coins" ? coinPackages.find((p) => p.id === payload.packageId) : undefined),
    [payload],
  );

  function formatCardNumber(value: string) {
    return value
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  }

  function formatExpiry(value: string) {
    const numbers = value.replace(/\D/g, "").slice(0, 4);
    if (numbers.length <= 2) return numbers;
    return `${numbers.slice(0, 2)} / ${numbers.slice(2)}`;
  }

  function handleBack() {
    setCheckoutPayload(null);
    if (onBack) {
      onBack();
      return;
    }
    window.history.back();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!pack) {
      setError("Nothing to check out. Please return to the shop.");
      return;
    }

    if (!isValidEmail(email)) {
      setError(EMAIL_ERROR);
      return;
    }

    if (paymentMethod === "card") {
      if (cardNumber.replace(/\D/g, "").length < 16) {
        setError("Please enter a valid 16-digit card number.");
        return;
      }
      if (expiry.replace(/\D/g, "").length < 4) {
        setError("Please enter a valid expiry date.");
        return;
      }
      if (cvc.replace(/\D/g, "").length < 3) {
        setError("Please enter a valid CVC.");
        return;
      }
      if (!cardholder.trim()) {
        setError("Please enter the cardholder name.");
        return;
      }
    } else if (!accountId.trim()) {
      setError(`Please enter your ${paymentMethods.find((m) => m.id === paymentMethod)?.label} account details.`);
      return;
    }

    setWallet([balance + pack.coins + (pack.bonus ?? 0)]);
    setNotifications([
      {
        id: uid("ntf"),
        title: "C-Coin top-up confirmed",
        body: `${formatCoins(pack.coins + (pack.bonus ?? 0))} C-Coins were added to your wallet.`,
        createdAt: new Date().toISOString(),
        kind: "shop",
        read: false,
      },
      ...notifications,
    ]);

    setCheckoutPayload(null);
    setSubmitted(true);
  }

  if (!payload || !pack) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6f8] px-4 text-center">
        <div>
          <p className="text-lg font-black text-navy">Nothing to check out.</p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-coral px-4 py-2.5 text-sm font-black text-white"
          >
            <ArrowLeft className="size-4" /> Back to Shop
          </button>
        </div>
      </main>
    );
  }

  if (submitted) {
    const title = `${formatCoins(pack.coins + (pack.bonus ?? 0))} C-Coins`;
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6f8] px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-navy/10 bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500 text-white">
            <Check className="size-8" />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-wider text-emerald-600">
            Purchase confirmed
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy">Thanks for your order.</h1>
          <p className="mt-3 text-sm leading-relaxed text-navy/55">
            {title} has been credited to your wallet. This is a demo checkout — no real payment was made.
          </p>

          <div className="mt-5 flex items-center gap-3 rounded-lg border border-navy/10 bg-navy/[0.03] p-3 text-left">
            <Mail className="size-5 shrink-0 text-coral" />
            <p className="text-xs text-navy/60">
              A confirmation email has been mock-sent to <strong>{email}</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={handleBack}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-coral px-4 py-3 text-sm font-black text-white transition hover:opacity-90"
          >
            <ArrowLeft className="size-4" /> Back to Shop
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-8 text-navy sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm sm:p-8">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-navy/50 transition hover:text-coral"
          >
            <ArrowLeft className="size-4" /> Back to Shop
          </button>

          <h1 className="mt-5 text-3xl font-black uppercase tracking-tight text-navy sm:text-4xl">
            Checkout
          </h1>
          <p className="mt-2 text-sm text-navy/50">Review your C-Coin top-up before confirming payment.</p>

          <div className="mt-6 flex items-center gap-4 rounded-xl border border-navy/10 bg-navy/[0.02] p-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-full bg-yellow/20 text-yellow">
              <Coins className="size-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-navy">
                {formatCoins(pack.coins)} C-Coins{pack.bonus ? ` + ${formatCoins(pack.bonus)} bonus` : ""}
              </p>
              <p className="text-xs text-navy/40">C-Coin package</p>
            </div>
            <p className="shrink-0 font-black text-coral">{pack.priceLabel}</p>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-navy/10 bg-yellow/10 px-4 py-3 text-sm">
            <span className="font-bold text-navy/70">Wallet balance after purchase</span>
            <span className="font-black text-navy">
              {formatCoins(balance + pack.coins + (pack.bonus ?? 0))} C-Coins
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-wider text-coral">Payment</p>
          <h2 className="mt-1 text-2xl font-black text-navy">Complete your purchase</h2>

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-navy/50">
                Email for confirmation
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-md border border-navy/15 px-3 py-3 text-sm outline-none focus:border-coral"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-navy/50">
                Payment method
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => {
                  const Icon = methodIcons[method.id];
                  const active = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-center gap-2 rounded-md border p-3 text-left text-xs font-bold transition ${
                        active ? "border-coral bg-coral/5" : "border-navy/10 hover:border-navy/25"
                      }`}
                    >
                      <Icon className="size-4 shrink-0 text-coral" />
                      <span>
                        <span className="block">{method.label}</span>
                        <span className="block text-[10px] font-medium text-navy/40">{method.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {paymentMethod === "card" ? (
              <div className="space-y-3 rounded-lg border border-navy/10 p-4">
                <input
                  value={cardNumber}
                  onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                  placeholder="1234 1234 1234 1234"
                  className="w-full rounded-md border border-navy/15 px-3 py-2.5 text-sm outline-none focus:border-coral"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={expiry}
                    onChange={(event) => setExpiry(formatExpiry(event.target.value))}
                    placeholder="MM / YY"
                    className="w-full rounded-md border border-navy/15 px-3 py-2.5 text-sm outline-none focus:border-coral"
                  />
                  <input
                    value={cvc}
                    onChange={(event) => setCvc(event.target.value.replace(/\D/g, "").slice(0, 3))}
                    placeholder="CVC"
                    className="w-full rounded-md border border-navy/15 px-3 py-2.5 text-sm outline-none focus:border-coral"
                  />
                </div>
                <input
                  value={cardholder}
                  onChange={(event) => setCardholder(event.target.value)}
                  placeholder="Name on card"
                  className="w-full rounded-md border border-navy/15 px-3 py-2.5 text-sm outline-none focus:border-coral"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-navy/10 p-4">
                <label className="block text-xs font-black uppercase tracking-wide text-navy/50">
                  {paymentMethods.find((m) => m.id === paymentMethod)?.label} account / number
                </label>
                <input
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  placeholder="e.g. 09xx-xxx-xxxx or account email"
                  className="mt-2 w-full rounded-md border border-navy/15 px-3 py-2.5 text-sm outline-none focus:border-coral"
                />
              </div>
            )}

            {error && (
              <div className="rounded-md border border-coral/30 bg-coral/10 px-3 py-2.5 text-sm font-bold text-coral">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-coral px-4 py-3.5 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90"
            >
              <LockKeyhole className="size-4" />
              Confirm Purchase
            </button>

            <p className="flex items-center gap-2 text-[11px] text-navy/40">
              <ShieldCheck className="size-3.5 shrink-0" />
              Demo checkout only — no real payment is processed.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
