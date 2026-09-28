import { createFileRoute } from '@tanstack/react-router';
import { CheckCircle2, Clock3, ExternalLink, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from '@/components/next-compat/navigation';

type ConfirmationState = 'checking' | 'paid' | 'pending' | 'failed' | 'cancelled' | 'error';

export const Route = createFileRoute('/brand-payment-result')({
  head: () => ({
    meta: [
      { title: 'Payment Confirmation — Crew On Set!' },
      { name: 'description', content: 'Confirmation for a Crew On Set brand partnership payment.' },
    ],
  }),
  component: BrandPaymentResultPage,
});

function BrandPaymentResultPage() {
  const searchParams = useSearchParams();
  const payment = searchParams.get('payment');
  const reference = searchParams.get('reference');
  const [state, setState] = useState<ConfirmationState>(payment === 'cancelled' ? 'cancelled' : 'checking');

  useEffect(() => {
    if (payment === 'cancelled') {
      setState('cancelled');
      return;
    }
    if (payment !== 'success' || !reference) {
      setState('error');
      return;
    }

    let active = true;
    let timer: number | undefined;

    async function confirm(attempt: number) {
      try {
        const response = await fetch('/api/paymongo/brand-status?reference=' + encodeURIComponent(reference), {
          cache: 'no-store',
        });
        const body = await response.json().catch(() => ({})) as { status?: string };
        if (!active) return;

        if (response.ok && body.status === 'Paid') {
          setState('paid');
          return;
        }
        if (response.ok && body.status === 'Failed') {
          setState('failed');
          return;
        }
        if (attempt < 5) {
          timer = window.setTimeout(() => { void confirm(attempt + 1); }, 1800);
          return;
        }
        setState(response.ok ? 'pending' : 'error');
      } catch {
        if (!active) return;
        if (attempt < 5) {
          timer = window.setTimeout(() => { void confirm(attempt + 1); }, 1800);
        } else {
          setState('error');
        }
      }
    }

    void confirm(0);
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [payment, reference]);

  const content = {
    paid: {
      icon: CheckCircle2,
      iconClass: 'text-[#2d9d8f]',
      eyebrow: 'PAYMENT CONFIRMED',
      title: 'Payment successful',
      body: 'Your payment has been received and recorded. Your brand partnership application is now ready for the next stage of review. Please wait for the Crew On Set team to contact you regarding implementation.',
    },
    pending: {
      icon: Clock3,
      iconClass: 'text-[#d9a514]',
      eyebrow: 'PAYMENT CONFIRMATION',
      title: 'Payment is being confirmed',
      body: 'Your checkout was completed, but confirmation is still in progress. Please keep this page or check your email for the confirmation message from Crew On Set.',
    },
    failed: {
      icon: XCircle,
      iconClass: 'text-[#f4513b]',
      eyebrow: 'PAYMENT NOT COMPLETED',
      title: 'Payment was not completed',
      body: 'We could not confirm a completed payment for this checkout. Please use the payment link from your email again or contact Crew On Set Partnerships for assistance.',
    },
    cancelled: {
      icon: XCircle,
      iconClass: 'text-[#f4513b]',
      eyebrow: 'CHECKOUT CANCELLED',
      title: 'Payment was cancelled',
      body: 'No payment was completed. You may return to the payment link in your email whenever you are ready to continue.',
    },
    checking: {
      icon: Clock3,
      iconClass: 'text-[#d9a514]',
      eyebrow: 'PAYMENT CONFIRMATION',
      title: 'Confirming your payment',
      body: 'Please wait while we verify your payment securely.',
    },
    error: {
      icon: XCircle,
      iconClass: 'text-[#f4513b]',
      eyebrow: 'PAYMENT CONFIRMATION',
      title: 'We could not confirm the payment',
      body: 'Please keep your PayMongo receipt and contact Crew On Set Partnerships so we can verify your payment and update your application.',
    },
  }[state];

  const Icon = content.icon;

  return (
    <main className="min-h-screen bg-[#0a0e19] px-5 py-12 text-[#fefaef] sm:px-8">
      <div className="mx-auto flex min-h-[75vh] max-w-2xl items-center justify-center">
        <section className="w-full rounded-2xl border border-white/10 bg-[#101923] p-8 text-center shadow-2xl sm:p-12">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-white/10">
            <Icon className={'size-9 ' + content.iconClass} />
          </div>
          <p className="mt-6 text-xs font-black tracking-[.2em] text-[#ff6248]">{content.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-4xl">{content.title}</h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/65">{content.body}</p>
          {state === 'paid' && (
            <p className="mt-5 text-xs font-bold uppercase tracking-wide text-[#4bc4b4]">
              Reference: {reference}
            </p>
          )}
          <a
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#f4513b] px-5 py-3 text-xs font-black uppercase text-white transition hover:bg-[#ff6248]"
          >
            Return to Crew On Set <ExternalLink className="size-4" />
          </a>
        </section>
      </div>
    </main>
  );
}