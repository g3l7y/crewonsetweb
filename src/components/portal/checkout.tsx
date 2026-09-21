import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Coins,
  CreditCard,
  LockKeyhole,
  Mail,
  QrCode,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  coinPackages,
  getCheckoutPayload,
  setCheckoutPayload,
} from "@/lib/demo/portal-shop";
import { topUpsStore } from "@/lib/admin-demo-data";
import { walletStore, formatCoins, notificationsStore, uid } from "@/lib/demo/store";
import { isMockMode } from "@/lib/playfab/config";
import { useSession } from "@/lib/playfab/hooks";
import { EMAIL_ERROR, isValidEmail } from "@/lib/validation";

type CheckoutPageProps = {
  onBack?: () => void;
};

type CheckoutResponse = {
  checkoutUrl?: string;
  error?: string;
};

type DemoPaymentMethod = "card" | "gcash" | "qrph";

/**
 * Checkout uses PayMongo Hosted Checkout in both demo and real modes when a
 * PayMongo key is configured. Demo accounts retain a clearly marked local
 * fallback so the rest of the portal remains usable without provider keys.
 */
export default function CheckoutPage({ onBack }: CheckoutPageProps) {
  const mockMode = isMockMode();
  const { data: session } = useSession();
  const [wallet, setWallet] = walletStore.useStore();
  const [notifications, setNotifications] = notificationsStore.useStore();
  const [payload] = useState(() => getCheckoutPayload());
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showHostedPreview, setShowHostedPreview] = useState(false);
  const [demoPaymentMethod, setDemoPaymentMethod] = useState<DemoPaymentMethod>("card");
  const [demoCardNumber, setDemoCardNumber] = useState("");
  const [demoCardName, setDemoCardName] = useState("");
  const [demoCardExpiry, setDemoCardExpiry] = useState("");
  const [demoCardCvc, setDemoCardCvc] = useState("");

  const balance = wallet[0] ?? 0;

  const pack = useMemo(
    () => (payload?.kind === "coins" ? coinPackages.find((item) => item.id === payload.packageId) : undefined),
    [payload],
  );

  function completeDemoPurchase() {
    if (!pack) return;
    const totalCoins = pack.coins;
    const completedAt = new Date();

    topUpsStore.set([
      {
        id: uid("top"),
        playerName: session?.username || "CAMERA_PRO",
        playerId: session?.playFabId || "MOCK-PLAYER-001",
        date: completedAt.toISOString().slice(0, 10),
        time: completedAt.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        bank: "PayMongo Test Checkout",
        amount: pack.pricePhp,
        status: "Completed",
      },
      ...topUpsStore.get(),
    ]);

    setWallet([balance + totalCoins]);
    setNotifications([
      {
        id: uid("ntf"),
        title: "C-Coin top-up confirmed",
        body: formatCoins(totalCoins) + " C-Coins were added to your wallet.",
        createdAt: new Date().toISOString(),
        kind: "shop",
        read: false,
      },
      ...notifications,
    ]);
    setCheckoutPayload(null);
    setSubmitted(true);
    setProcessing(false);
  }

  useEffect(() => {
    if (!mockMode || typeof window === 'undefined' || !pack) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success') return;
    const reference = params.get('reference')?.trim();
    if (!reference) return;

    const processedKey = `cos.paymongo.test.fulfilled.${reference}`;
    const clearPaymentQuery = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      url.searchParams.delete('reference');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    };

    if (window.localStorage.getItem(processedKey) === '1') {
      setCheckoutPayload(null);
      setSubmitted(true);
      clearPaymentQuery();
      return;
    }

    let cancelled = false;
    setProcessing(true);
    fetch(`/api/paymongo/status?orderId=${encodeURIComponent(reference)}`, { credentials: 'include' })
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as {
          status?: string;
          coins?: number;
          error?: string;
        };
        if (!response.ok) throw new Error(result.error || 'Payment status is temporarily unavailable.');
        return result;
      })
      .then((result) => {
        if (cancelled) return;
        if (result.status !== 'fulfilled' || result.coins !== pack.coins) {
          setError('Payment is still being confirmed. Please wait for the PayMongo webhook and refresh this page.');
          setProcessing(false);
          return;
        }
        window.localStorage.setItem(processedKey, '1');
        completeDemoPurchase();
        clearPaymentQuery();
      })
      .catch((statusError) => {
        if (cancelled) return;
        setError(statusError instanceof Error ? statusError.message : 'Payment status is temporarily unavailable.');
        setProcessing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mockMode, pack?.id]);
  function handleBack() {
    setCheckoutPayload(null);
    if (onBack) {
      onBack();
      return;
    }
    window.history.back();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    setProcessing(true);

    try {
      const response = await fetch("/api/paymongo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pack.id, email: email.trim() }),
      });
      const result = (await response.json().catch(() => ({}))) as CheckoutResponse;

      if (mockMode && response.status === 503) {
        setShowHostedPreview(true);
        setProcessing(false);
        return;
      }

      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error || "PayMongo checkout could not be started.");
      }

      window.location.assign(result.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "PayMongo checkout could not be started.");
      setProcessing(false);
    }
  }

  function handleDemoHostedSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    completeDemoPurchase();
  }

  if (!payload || !pack) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center">
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
    const totalCoins = pack.coins;
    return (
      <main className="grid min-h-screen place-items-center px-4 py-10">
        <div className="portal-card w-full max-w-md rounded-2xl border border-navy/10 p-8 text-center shadow-2xl">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500 text-white">
            <Check className="size-8" />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-wider text-emerald-600">
            Purchase confirmed
          </p>
          <h1 className="mt-2 text-3xl font-black text-navy">Thanks for your order.</h1>
          <p className="mt-3 text-sm leading-relaxed text-navy/55">
            {formatCoins(totalCoins)} C-Coins has been credited to your wallet.
            This is a demo checkout — no real payment was made.
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

  if (showHostedPreview) {
    const demoMethods = [
      { id: "card" as const, label: "Card", detail: "Visa or Mastercard", icon: CreditCard },
      { id: "gcash" as const, label: "GCash", detail: "Mobile wallet", icon: Smartphone },
      { id: "qrph" as const, label: "QR Ph", detail: "Scan to pay", icon: QrCode },
    ];
    const selectedMethod = demoMethods.find((method) => method.id === demoPaymentMethod) ?? demoMethods[0];
    const SelectedIcon = selectedMethod.icon;

    return (
      <main className="portal-checkout-page min-h-screen px-4 py-8 text-navy sm:px-6 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="portal-card overflow-hidden rounded-2xl border border-navy/10 shadow-2xl">
            <header className="flex items-center justify-between gap-4 border-b border-navy/10 px-5 py-4 sm:px-8">
              <div>
                <p className="text-lg font-black tracking-tight text-navy">CREW ON SET</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-navy/45">PayMongo Hosted Checkout</p>
              </div>
              <span className="rounded-full bg-yellow/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-navy">
                Test mode
              </span>
            </header>

            <div className="grid gap-0 lg:grid-cols-[1fr_0.8fr]">
              <form onSubmit={handleDemoHostedSubmit} className="space-y-5 p-5 sm:p-8">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-coral">Secure payment</p>
                  <h1 className="mt-1 text-2xl font-black text-navy">Choose a payment method</h1>
                  <p className="mt-2 text-sm text-navy/55">
                    This demo preview mirrors the PayMongo test checkout. With a test key configured, the real PayMongo-hosted page opens instead.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {demoMethods.map((method) => {
                    const Icon = method.icon;
                    const active = demoPaymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setDemoPaymentMethod(method.id)}
                        className={"flex items-center gap-2 rounded-lg border px-3 py-3 text-left transition " + (active ? "border-coral bg-coral/10" : "border-navy/15 hover:border-coral/60")}
                      >
                        <Icon className="size-4 shrink-0 text-coral" />
                        <span>
                          <span className="block text-xs font-black text-navy">{method.label}</span>
                          <span className="block text-[10px] text-navy/45">{method.detail}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {demoPaymentMethod === "card" ? (
                  <div className="space-y-3 rounded-xl border border-navy/10 bg-navy/[0.02] p-4">
                    <input
                      required
                      value={demoCardNumber}
                      onChange={(event) => setDemoCardNumber(event.target.value)}
                      placeholder="Card number"
                      inputMode="numeric"
                      className="w-full rounded-md border border-navy/15 px-3 py-3 text-sm outline-none focus:border-coral"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        required
                        value={demoCardExpiry}
                        onChange={(event) => setDemoCardExpiry(event.target.value)}
                        placeholder="MM / YY"
                        className="w-full rounded-md border border-navy/15 px-3 py-3 text-sm outline-none focus:border-coral"
                      />
                      <input
                        required
                        value={demoCardCvc}
                        onChange={(event) => setDemoCardCvc(event.target.value)}
                        placeholder="CVC"
                        inputMode="numeric"
                        className="w-full rounded-md border border-navy/15 px-3 py-3 text-sm outline-none focus:border-coral"
                      />
                    </div>
                    <input
                      required
                      value={demoCardName}
                      onChange={(event) => setDemoCardName(event.target.value)}
                      placeholder="Name on card"
                      className="w-full rounded-md border border-navy/15 px-3 py-3 text-sm outline-none focus:border-coral"
                    />
                    <p className="text-[11px] text-navy/45">Test card example: 4343 4343 4343 4345</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-navy/10 bg-navy/[0.02] p-5">
                    <div className="flex items-start gap-3">
                      <SelectedIcon className="mt-0.5 size-5 shrink-0 text-coral" />
                      <p className="text-sm leading-relaxed text-navy/65">
                        Continue to the {selectedMethod.label} test screen to simulate authorization. No real wallet or bank account is charged.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-coral px-4 py-3.5 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90"
                >
                  <LockKeyhole className="size-4" /> Pay {pack.priceLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setShowHostedPreview(false)}
                  className="w-full text-xs font-black uppercase tracking-wide text-navy/50 hover:text-coral"
                >
                  Return to order
                </button>
              </form>

              <aside className="border-t border-navy/10 bg-navy/[0.03] p-5 sm:p-8 lg:border-l lg:border-t-0">
                <p className="text-xs font-black uppercase tracking-wider text-navy/45">Order summary</p>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-navy">{formatCoins(pack.coins)} C-Coins</p>
                  </div>
                  <p className="font-black text-coral">{pack.priceLabel}</p>
                </div>
                <div className="mt-6 border-t border-navy/10 pt-4 text-xs text-navy/55">
                  <p className="font-black text-navy">PayMongo Test Checkout</p>
                  <p className="mt-2 leading-relaxed">
                    This screen is only shown for demo accounts without a configured PayMongo test key. Live payments always open PayMongo’s hosted page.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const totalCoins = pack.coins;

  return (
    <main className="portal-checkout-page min-h-screen px-4 py-8 text-navy sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="portal-card rounded-2xl border border-navy/10 p-6 shadow-sm sm:p-8">
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

          <div className="portal-card mt-6 flex items-center gap-4 rounded-xl border border-navy/10 bg-navy/[0.02] p-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-full bg-yellow/20 text-yellow">
              <Coins className="size-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-navy">
                {formatCoins(pack.coins)} C-Coins
              </p>
              <p className="text-xs text-navy/40">C-Coin package</p>
            </div>
            <p className="shrink-0 font-black text-coral">{pack.priceLabel}</p>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-navy/10 bg-yellow/10 px-4 py-3 text-sm">
            <span className="font-bold text-navy/70">Wallet balance after purchase</span>
            <span className="font-black text-navy">{formatCoins(balance + totalCoins)} C-Coins</span>
          </div>
        </section>

        <section className="portal-card rounded-2xl border border-navy/10 p-6 shadow-sm sm:p-8">
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

            <div className="portal-card rounded-lg border border-navy/10 bg-navy/[0.02] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-coral" />
                <div>
                  <p className="text-sm font-black text-navy">PayMongo Hosted Checkout</p>
                  <p className="mt-1 text-xs leading-relaxed text-navy/50">
                    The next screen is PayMongo's hosted payment page, where the customer chooses an enabled method and completes payment securely.
                  </p>
                  <p className="mt-2 text-[11px] font-black uppercase tracking-wide text-coral">
                    Card · GCash · QR Ph
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-coral/30 bg-coral/10 px-3 py-2.5 text-sm font-bold text-coral">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={processing}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-coral px-4 py-3.5 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              <LockKeyhole className="size-4" />
              {processing
                ? "Opening PayMongo..."
                : mockMode
                  ? "Open PayMongo Test Checkout"
                  : "Continue to PayMongo"}
            </button>

            <p className="flex items-center gap-2 text-[11px] text-navy/40">
              <ShieldCheck className="size-3.5 shrink-0" />
              {mockMode
                ? "Demo mode uses PayMongo test checkout when configured; no live money is charged."
                : "You will be redirected to PayMongo's secure hosted checkout."}
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
