import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Coins,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  coinPackages,
  getCheckoutPayload,
  setCheckoutPayload,
} from "@/lib/demo/portal-shop";
import { topUpsStore } from "@/lib/admin-demo-data";
import { walletStore, formatCoins, notificationsStore, uid } from "@/lib/demo/store";
import { isMockMode } from "@/lib/playfab/config";
import { usePlayerWallet, useSession } from "@/lib/playfab/hooks";
import { EMAIL_ERROR, isValidEmail } from "@/lib/validation";

type CheckoutPageProps = {
  onBack?: () => void;
};

type CheckoutResponse = {
  checkoutUrl?: string;
  error?: string;
};

/**
 * Checkout uses PayMongo Hosted Checkout in both demo and real modes. Mock
 * mode uses the PayMongo Test environment and never falls back to a local
 * payment form, so the payment flow remains an authentic provider flow.
 */
export default function CheckoutPage({ onBack }: CheckoutPageProps) {
  const mockMode = isMockMode();
  const { data: session } = useSession();
  const walletQuery = usePlayerWallet();
  const [wallet, setWallet] = walletStore.useStore();
  const [notifications, setNotifications] = notificationsStore.useStore();
  const [payload] = useState(() => getCheckoutPayload());
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const balance = mockMode ? (wallet[0] ?? 0) : (walletQuery.data?.cCoins ?? 0);

  const pack = useMemo(
    () => (payload?.kind === "coins" ? coinPackages.find((item) => item.id === payload.packageId) : undefined),
    [payload],
  );

  function completeDemoPurchase(reference: string) {
    if (!pack) return;
    const creditedKey = `cos.paymongo.demo.credited.${reference}`;
    if (window.localStorage.getItem(creditedKey) === '1') {
      setCheckoutPayload(null);
      setSubmitted(true);
      setProcessing(false);
      return;
    }
    window.localStorage.setItem(creditedKey, '1');
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

    setWallet((current) => [(current[0] ?? 0) + totalCoins]);
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
    if (typeof window === 'undefined' || !pack) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success') return;
    const reference = params.get('reference')?.trim();
    if (!reference) return;

    const processedKey = `cos.paymongo.fulfilled.${reference}`;
    const legacyProcessedKey = `cos.paymongo.test.fulfilled.${reference}`;
    const clearPaymentQuery = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      url.searchParams.delete('reference');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    };

    if (
      window.localStorage.getItem(processedKey) === '1' ||
      (mockMode && window.localStorage.getItem(legacyProcessedKey) === '1')
    ) {
      if (mockMode) {
        completeDemoPurchase(reference);
      } else {
        setCheckoutPayload(null);
        void walletQuery.refetch();
        setSubmitted(true);
      }
      clearPaymentQuery();
      return;
    }

    let cancelled = false;
    setProcessing(true);

    async function confirmPayment() {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const response = await fetch(`/api/paymongo/status?orderId=${encodeURIComponent(reference)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const result = (await response.json().catch(() => ({}))) as {
          status?: string;
          coins?: number;
          error?: string;
        };
        if (!response.ok) throw new Error(result.error || 'Payment status is temporarily unavailable.');
        if (result.status === 'fulfilled' && result.coins === pack.coins) return;
        if (result.status === 'failed') throw new Error('Payment was received, but the C-Coin credit failed. Please contact support.');
        if (attempt < 19) await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
      throw new Error('Payment succeeded, but confirmation is still processing. Please refresh this page shortly.');
    }

    confirmPayment()
      .then(async () => {
        if (cancelled) return;
        window.localStorage.setItem(processedKey, '1');
        if (mockMode) {
          completeDemoPurchase(reference);
        } else {
          await walletQuery.refetch();
          if (cancelled) return;
          setCheckoutPayload(null);
          setSubmitted(true);
          setProcessing(false);
        }
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

      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error || "PayMongo checkout could not be started.");
      }

      window.location.assign(result.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "PayMongo checkout could not be started.");
      setProcessing(false);
    }
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
            {mockMode ? " This is a demo checkout — no live money was charged." : " PayMongo confirmed the payment and PlayFab updated your wallet."}
          </p>

          <div className="mt-5 flex items-center gap-3 rounded-lg border border-navy/10 bg-navy/[0.03] p-3 text-left">
            <Mail className="size-5 shrink-0 text-coral" />
            <p className="text-xs text-navy/60">
              {mockMode ? <>A demo confirmation was prepared for <strong>{email || "your email address"}</strong>.</> : <>Your PayMongo payment was confirmed securely.</>}
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
