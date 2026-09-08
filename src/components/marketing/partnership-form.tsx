import { FormEvent, useRef, useState } from "react";
import { CheckCircle2, FileImage, Send, X } from "lucide-react";

import { EMAIL_ERROR, isValidEmail } from "@/lib/validation";
import {
  applicationsStore,
  insertSharedRecord,
  readAttachmentAsDataUrl,
  uid,
  type PartnershipApplication,
} from "@/lib/demo/store";

export function PartnershipForm() {
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const brandName = String(data.get("brandName") ?? "").trim();
    const productType = String(data.get("productType") ?? "");
    const exactModel = String(data.get("exactModel") ?? "").trim();
    const link = String(data.get("link") ?? "").trim();
    const budget = Number(data.get("budget"));
    const duration = Number(data.get("duration"));
    const durationUnit = String(data.get("durationUnit") ?? "Days") as "Days" | "Months";
    const rawEmail = String(data.get("email") ?? "");
    const email = rawEmail.trim();
    const description = String(data.get("description") ?? "").trim();

    if (!brandName || !productType || !exactModel || !email) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!isValidEmail(rawEmail)) {
      setError(EMAIL_ERROR);
      return;
    }
    if (!Number.isFinite(budget) || budget <= 0) {
      setError("Please enter a valid proposed budget.");
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      setError("Please enter a valid advertisement duration.");
      return;
    }
    if (link) {
      const normalizedLink = /^https?:\/\//i.test(link) ? link : `https://${link}`;
      try {
        const parsed = new URL(normalizedLink);
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
    if (file) {
      try {
        attachmentUrl = await readAttachmentAsDataUrl(file, "partnerships");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[Crew On Set] partnership attachment upload failed; submitting without attachment`, { message });
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
      budget,
      duration,
      durationUnit,
      email,
      description,
      submittedAt: new Date().toISOString(),
      status: "Pending",
    };

    const persisted = await insertSharedRecord("cos.applications", application);
    if (!persisted) {
      setError("We could not submit your application. Please try again.");
      return;
    }
    applicationsStore.set((current) => [application, ...current.filter((item) => item.id !== application.id)]);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-navy/10 bg-white p-8 text-center shadow-xl shadow-navy/5">
        <CheckCircle2 className="mx-auto size-12 text-[#278b78]" />
        <h2 className="mt-4 text-2xl font-black uppercase">Application submitted</h2>
        <p className="mt-3 leading-relaxed text-navy/60">
          Thanks for applying to bring your brand onto the set. Your application status is now{" "}
          <strong>Pending</strong> and our production team will review it shortly.
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
            <option>Camera</option>
            <option>Lens</option>
            <option>Lights</option>
            <option>Audio</option>
            <option>Software</option>
            <option>Other</option>
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

        <label className="form-label">
          PROPOSED BUDGET (₱ PHP)
          <input
            className="form-input"
            name="budget"
            type="number"
            min={1}
            step={1}
            required
            placeholder="10000"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="form-label">
            AD DURATION
            <input
              className="form-input"
              name="duration"
              type="number"
              min={1}
              step={1}
              required
              placeholder="30"
            />
          </label>
          <label className="form-label">
            UNIT
            <select className="form-input" name="durationUnit" defaultValue="Days">
              <option>Days</option>
              <option>Months</option>
            </select>
          </label>
        </div>

        <label className="form-label sm:col-span-2">
          DESCRIPTION
          <textarea
            className="form-input min-h-[120px] resize-y"
            name="description"
            rows={5}
            placeholder="Tell us about your product and how you'd like to collaborate."
          />
        </label>

        <label className="form-label sm:col-span-2">
          FILE ATTACHMENT (OPTIONAL)
          <span className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-navy/15 bg-navy/[.025] px-4 py-4 text-sm transition hover:border-coral hover:bg-coral/[.03]">
            <FileImage className="size-5 shrink-0 text-coral" />
            <span className="min-w-0 flex-1 truncate font-bold">
              {file ? file.name : "Choose a file (image or PDF only)"}
            </span>
            {file && (
              <button
                type="button"
                aria-label="Remove attachment"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setFile(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
                className="grid size-7 shrink-0 place-items-center rounded border border-navy/15 text-navy/60 transition hover:border-coral hover:text-coral"
              >
                <X className="size-4" />
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*,application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </span>
        </label>
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
        No account is required. Every partnership application is reviewed by our production team.
      </p>
    </form>
  );
}
