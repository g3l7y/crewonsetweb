import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, FileImage, Send, X } from "lucide-react";

import { EMAIL_ERROR, isValidEmail } from "@/lib/validation";
import { isMockMode } from "@/lib/playfab/config";
import { BRAND_PROMOTION_DELIVERY_TERMS, BRAND_PROMOTION_PACKAGES, getBrandPromotionPackage } from "@/lib/brand-promotion-packages";
import {
  applicationsStore,
  adminNotificationsStore,
  brandUpdatesStore,
  insertSharedRecord,
  readAttachmentAsDataUrl,
  partnershipProductTypes,
  uid,
  type BrandUpdate,
  type PartnershipApplication,
} from "@/lib/demo/store";

type PromotionForecast = {
  sampleSize: number;
  clicks: { min: number; max: number };
  visits: { min: number; max: number };
};

function mockPromotionForecast(updates: BrandUpdate[], durationDays: number): PromotionForecast | undefined {
  const completed = updates.filter((update) =>
    update.expiresAt && new Date(update.expiresAt).getTime() < Date.now() &&
    update.durationDays === durationDays && (update.mockImpressions ?? 0) > 0,
  );
  if (completed.length < 3) return undefined;
  return {
    sampleSize: completed.length,
    clicks: {
      min: Math.min(...completed.map((update) => update.mockClicks ?? 0)),
      max: Math.max(...completed.map((update) => update.mockClicks ?? 0)),
    },
    visits: {
      min: Math.min(...completed.map((update) => update.mockVisits ?? 0)),
      max: Math.max(...completed.map((update) => update.mockVisits ?? 0)),
    },
  };
}

export function PartnershipForm() {
  const mockMode = isMockMode();
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState(BRAND_PROMOTION_PACKAGES[1]?.id ?? BRAND_PROMOTION_PACKAGES[0]!.id);
  const [brandUpdates] = brandUpdatesStore.useStore();
  const [realForecasts, setRealForecasts] = useState<Record<string, PromotionForecast>>({});

  useEffect(() => {
    if (mockMode) return;
    let active = true;
    void fetch("/api/brand-promotions/forecast", { credentials: "include", cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ available?: boolean; forecasts?: Record<string, PromotionForecast> }> : undefined)
      .then((result) => {
        if (active && result?.available && result.forecasts) setRealForecasts(result.forecasts);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [mockMode]);

  function forecastFor(durationDays: number) {
    return mockMode ? mockPromotionForecast(brandUpdates, durationDays) : realForecasts[String(durationDays)];
  }

  function handlePackageKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    const nextIndex = (index + direction + BRAND_PROMOTION_PACKAGES.length) % BRAND_PROMOTION_PACKAGES.length;
    const nextPackage = BRAND_PROMOTION_PACKAGES[nextIndex];
    if (!nextPackage) return;
    setSelectedPackageId(nextPackage.id);
    document.getElementById(`promotion-package-${nextPackage.id}`)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const brandName = String(data.get("brandName") ?? "").trim();
    const productType = String(data.get("productType") ?? "");
    const exactModel = String(data.get("exactModel") ?? "").trim();
    const rawLink = String(data.get("link") ?? "").trim();
    const link = rawLink && (/^https?:\/\//i.test(rawLink) ? rawLink : `https://${rawLink}`);
    const selectedPackage = getBrandPromotionPackage(data.get("packageId"));
    const rawEmail = String(data.get("email") ?? "");
    const email = rawEmail.trim();
    const description = String(data.get("description") ?? "").trim();

    if (!file) {
      setError("Please attach proof of business to submit your application.");
      return;
    }
    if (!brandName || !productType || !exactModel || !email) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!isValidEmail(rawEmail)) {
      setError(EMAIL_ERROR);
      return;
    }
    if (!selectedPackage) {
      setError("Please choose a promotion package.");
      return;
    }
    if (link) {
      try {
        const parsed = new URL(link);
        if (!parsed.hostname.includes(".") || !/^[a-z0-9.-]+$/i.test(parsed.hostname)) {
          throw new Error("Invalid hostname");
        }
      } catch {
        setError("Please enter a valid domain or URL.");
        return;
      }
    }
    if (file) {
      const extension = file.name.toLowerCase().split(".").pop() ?? "";
      const isPdf = file.type === "application/pdf" || extension === "pdf";
      const isAllowed =
        ["jpg", "jpeg", "png", "webp", "gif"].includes(extension) ||
        file.type.startsWith("image/") ||
        isPdf;
      if (file.size > 5 * 1024 * 1024) {
        setError("Attachments must be 5 MB or smaller.");
        return;
      }
      if (!isAllowed) {
        setError("Attachments must be an image or a PDF file.");
        return;
      }
    }

    setError("");

    let attachmentUrl = "";
    if (file && mockMode) {
      try {
        attachmentUrl = await readAttachmentAsDataUrl(file, "partnerships");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[Crew On Set] partnership attachment preview failed; submitting without attachment`, { message });
      }
    }

    const application: PartnershipApplication = {
      id: uid("APP"),
      brand: brandName,
      productType,
      exactModel,
      link,
      fileName: file?.name ?? "",
      ...(attachmentUrl ? { attachmentUrl } : {}),
      ...(file?.type ? { attachmentType: file.type } : {}),
      budget: selectedPackage.pricePhp,
      duration: selectedPackage.durationDays,
      durationUnit: "Days",
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
      packagePlacement: selectedPackage.placement,
      packageReporting: selectedPackage.reporting,
      email,
      description,
      submittedAt: new Date().toISOString(),
      status: "New",
    };

    const persisted = await insertSharedRecord("cos.applications", application, (message) => setError(message), mockMode ? undefined : file);
    if (!persisted) {
      setError((current) => current || "We could not submit your application. Please try again.");
      return;
    }
    applicationsStore.set((current) => [application, ...current.filter((item) => item.id !== application.id)]);
    if (mockMode) {
      adminNotificationsStore.set((current) => [{
        id: "partnership-submitted-" + application.id,
        title: "New brand application submitted",
        body: brandName + " submitted a partnership application for " + exactModel + ".",
        kind: "partnership",
        href: "/admin/partnerships",
        entityId: application.id,
        entityType: "partnership",
        read: false,
        createdAt: application.submittedAt,
      }, ...current]);
    }
    setSubmittedEmail(email);
    formRef.current?.reset();
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    setError("");
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-navy/10 bg-white p-8 text-center shadow-xl shadow-navy/5">
        <CheckCircle2 className="mx-auto size-12 text-[#278b78]" />
        <h2 className="mt-4 text-2xl font-black uppercase text-yellow">Application submitted</h2>
        <p className="mt-3 leading-relaxed text-navy/60">
          Thanks for applying to bring your brand onto the set. Our production team will review your application and contact you with updates at{" "}
          <strong>{submittedEmail}</strong>.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-md border border-navy/15 px-5 py-3 text-sm font-black uppercase tracking-wide text-navy transition hover:bg-navy/5"
        >
          Submit another application
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-xl border border-navy/10 bg-white p-5 shadow-xl shadow-navy/5 sm:p-8"
    >
      <div className="flex items-center justify-between border-b border-navy/10 pb-5">
        <div>
          <p className="text-xs font-black tracking-[.16em] text-coral">PARTNERSHIP APPLICATION</p>
          <h2 className="mt-2 text-2xl font-black uppercase">Brand Partnership</h2>
        </div>
        <span className="hidden rounded bg-navy px-3 py-1.5 text-[10px] font-black tracking-wider text-yellow sm:block">
          B2B INQUIRY
        </span>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <label className="form-label">
          BRAND NAME
          <input
            className="form-input"
            name="brandName"
            required
            placeholder="Your company or brand"
          />
        </label>

        <label className="form-label">
          PRODUCT TYPE
          <select className="form-input" name="productType" required defaultValue="">
            <option value="" disabled>
              Select a product type
            </option>
            {partnershipProductTypes.map((productType) => (
              <option key={productType}>{productType}</option>
            ))}
          </select>
        </label>

        <label className="form-label">
          EXACT MODEL
          <input
            className="form-input"
            name="exactModel"
            required
            placeholder="Product name and model"
          />
        </label>

        <label className="form-label">
          LINK
          <input
            className="form-input"
            name="link"
            inputMode="url"
            placeholder="yourbrand.com/product"
          />
        </label>

        <label className="form-label">
          BUSINESS EMAIL
          <input
            className="form-input"
            name="email"
            type="email"
            required
            placeholder="you@company.com"
          />
        </label>

        <fieldset className="form-label sm:col-span-2">
          <legend>CHOOSE A PROMOTION PACKAGE</legend>
          <input type="hidden" name="packageId" value={selectedPackageId} />
          <div className="mt-2 grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Promotion package">
            {BRAND_PROMOTION_PACKAGES.map((promotionPackage, index) => (
              <button
                key={promotionPackage.id}
                id={`promotion-package-${promotionPackage.id}`}
                type="button"
                role="radio"
                aria-checked={selectedPackageId === promotionPackage.id}
                tabIndex={selectedPackageId === promotionPackage.id ? 0 : -1}
                onClick={() => setSelectedPackageId(promotionPackage.id)}
                onKeyDown={(event) => handlePackageKeyDown(event, index)}
                className={`h-full w-full cursor-pointer rounded-lg border-2 p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral ${selectedPackageId === promotionPackage.id ? "border-coral bg-coral/[.06] shadow-md shadow-coral/10 ring-2 ring-coral/15" : "border-navy/15 bg-white hover:border-coral/50 hover:bg-coral/[.025]"}`}
              >
                  <span className="block text-xs font-black uppercase tracking-wide">{promotionPackage.name}</span>
                  <span className="mt-2 block text-2xl font-black text-coral">₱{promotionPackage.pricePhp.toLocaleString("en-PH")}</span>
                  <span className="mt-1 block text-xs font-bold text-navy/65">{promotionPackage.durationDays} days</span>
                  <span className="mt-3 block text-xs font-normal leading-relaxed text-navy/60" style={{ textTransform: "none", letterSpacing: "normal" }}>{promotionPackage.placement}</span>
                  {(() => {
                    const forecast = forecastFor(promotionPackage.durationDays);
                    return forecast ? (
                      <span className="mt-2 block text-[11px] font-normal leading-relaxed text-navy/55" style={{ textTransform: "none", letterSpacing: "normal" }}>
                        {mockMode ? "Mock results. " : ""}From {forecast.sampleSize} past promotions, we saw {forecast.clicks.min} to {forecast.clicks.max} link clicks and {forecast.visits.min} to {forecast.visits.max} different browsers clicking through. Your results may differ.
                      </span>
                    ) : null;
                  })()}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] font-normal leading-relaxed text-navy/60" style={{ textTransform: "none", letterSpacing: "normal" }}>
            Your product promotion stays displayed for the selected number of days. We will share how many people clicked the link and how many different browsers clicked it. Your results may differ.
          </p>
          <details className="mt-3 rounded-md border border-navy/10 bg-navy/[.025] p-3 text-[11px] font-normal leading-relaxed text-navy/65" style={{ textTransform: "none", letterSpacing: "normal" }}>
            <summary className="cursor-pointer font-bold text-navy">Delivery and under-delivery policy</summary>
            <p className="mt-2">{BRAND_PROMOTION_DELIVERY_TERMS}</p>
          </details>
        </fieldset>

        <label className="form-label sm:col-span-2">
          DESCRIPTION
          <textarea
            className="form-input min-h-[120px] resize-y"
            name="description"
            rows={5}
            placeholder="Tell us about your product and how you'd like to collaborate."
          />
        </label>

        <div className="form-label sm:col-span-2">
          <span>PROOF OF BUSINESS</span>
          <p
            className="mt-1 text-[11px] font-normal leading-relaxed text-navy/55"
            style={{ textTransform: "none", letterSpacing: "normal" }}
          >
            Attach one of these documents: <strong className="font-semibold">DTI Business Name Certificate</strong>, <strong className="font-semibold">SEC Certificate of Registration or Incorporation</strong>, <strong className="font-semibold">CDA Registration Certificate</strong>, or <strong className="font-semibold">Local Business Permit</strong>. Make sure the registered business name is easy to read.
          </p>
          <div className="mt-2 flex items-center gap-3 rounded-lg border-2 border-dashed border-navy/15 bg-navy/[.025] px-4 py-4 text-sm transition hover:border-coral hover:bg-coral/[.03]">
            <FileImage className="size-5 shrink-0 text-coral" />
            <label htmlFor="partnership-attachment" className="min-w-0 flex-1 cursor-pointer truncate font-bold">
              {file ? file.name : "Choose a file (image or PDF only)"}
            </label>
            {file && (
              <button
                type="button"
                aria-label="Remove attached file"
                title="Remove attached file"
                onClick={() => {
                  setFile(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
                className="grid size-7 shrink-0 place-items-center rounded border border-navy/15 text-navy/60 transition hover:border-coral hover:bg-coral/10 hover:text-coral"
              >
                <X className="size-4" />
              </button>
            )}
            <input
              ref={fileInput}
              id="partnership-attachment"
              type="file"
              accept="image/*,application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError("");
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-bold text-coral">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-md bg-[#278b78] px-6 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-[#278b78]/20 transition hover:-translate-y-0.5 hover:bg-[#1f7464]"
      >
        <Send className="size-5" /> Submit Partnership Application
      </button>
      <p className="mt-4 text-center text-xs leading-relaxed text-navy/45">
        Our production team will review your application and contact you with updates at the email address you provide.
      </p>
    </form>
  );
}
