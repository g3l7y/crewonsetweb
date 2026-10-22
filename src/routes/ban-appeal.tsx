import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import Link from "@/components/next-compat/link";
import { isMockMode } from "@/lib/playfab/config";
import { getMockPlayerAdminStatus, getMockPlayerBanDetails } from "@/lib/playfab/mock-provider";
import { playerReportsStore, uid } from "@/lib/demo/store";

export const Route = createFileRoute("/ban-appeal")({
  head: () => ({ meta: [{ title: "Ban Appeal — Crew On Set!" }, { name: "description", content: "Submit an appeal for a Crew On Set account ban." }] }),
  component: BanAppealPage,
});

function BanAppealPage() {
  const mockMode = isMockMode();
  const [mockBanned, setMockBanned] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [newInformation, setNewInformation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [priorDenied, setPriorDenied] = useState(false);

  useEffect(() => {
    if (mockMode) setMockBanned(getMockPlayerAdminStatus() === "Banned");
  }, [mockMode]);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      if (mockMode) {
        if (!mockBanned) throw new Error("The demo player account is not currently banned.");
        const details = getMockPlayerBanDetails();
        const previous = playerReportsStore.get().filter((item) => item.banAppeal && item.banId === details.banId);
        if (previous.some((item) => item.appealStatus === "Pending")) throw new Error("You already have an appeal waiting for review.");
        setPriorDenied(previous.some((item) => item.appealStatus === "Denied"));
      } else {
        const response = await fetch("/api/ban-appeals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "request-code", identifier }),
        });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error || "We could not send a verification code.");
      }
      setCodeRequested(true);
      setSuccess(mockMode ? "Demo verification is ready. Use the demo code shown below." : "If the account is eligible, a code has been sent to its registered email.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not start the appeal.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAppeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      if (mockMode) {
        if (!mockBanned || code.trim() !== "123456") throw new Error("Enter the demo verification code 123456.");
        const details = getMockPlayerBanDetails();
        const previous = playerReportsStore.get().filter((item) => item.banAppeal && item.banId === details.banId);
        if (previous.some((item) => item.appealStatus === "Pending")) throw new Error("You already have an appeal waiting for review.");
        const deniedBefore = previous.some((item) => item.appealStatus === "Denied");
        if (deniedBefore && (!newInformation || previous.some((item) => item.appealStatus === "Denied" && item.description.trim() === reason.trim()))) {
          throw new Error("A new appeal must include new information.");
        }
        const report = {
          id: uid("BA"),
          reporterName: "CAMERA_PRO",
          reporterId: "MOCK-PLAYER-001",
          reportedUsername: "CAMERA_PRO",
          reportType: "Ban Appeal",
          description: reason.trim(),
          submittedAt: new Date().toISOString(),
          status: "New" as const,
          banAppeal: true,
          appealStatus: "Pending" as const,
          banId: details.banId || "mock-active-ban",
          banStartsAt: details.startsAt || new Date().toISOString(),
          banEndsAt: details.endsAt,
          verifiedEmail: identifier.trim() || "player@crewonset.com",
          newInformation: deniedBefore,
        };
        playerReportsStore.set((items) => [report, ...items]);
      } else {
        const response = await fetch("/api/ban-appeals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "submit", identifier, code, reason, newInformation }),
        });
        const result = await response.json().catch(() => ({})) as { error?: string; message?: string };
        if (!response.ok) throw new Error(result.error || "We could not submit your appeal.");
      }
      setSuccess("Your appeal was sent to the admin team for review. You can close this page now.");
      setCodeRequested(false);
      setReason("");
      setCode("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not submit your appeal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0b0f19] px-4 py-12 text-white">
      <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#121a28] p-6 shadow-2xl sm:p-9">
        <Link href="/login" className="text-xs font-black uppercase tracking-wider text-white/50 hover:text-white">← Back to login</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[.18em] text-[#ff6248]">Account review</p>
        <h1 className="mt-2 text-3xl font-black uppercase">Appeal a ban</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">Tell us why you think the ban should be reviewed. We’ll verify that you own the account before sending the appeal to the admin team.</p>
        {mockMode && mockBanned && <p className="mt-4 rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-3 text-xs text-yellow-200">Demo verification code: <strong>123456</strong></p>}
        {error && <p role="alert" className="mt-5 rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        {success && <p role="status" className="mt-5 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{success}</p>}

        {!codeRequested ? (
          <form onSubmit={requestCode} className="mt-6 space-y-4">
            <label className="block text-xs font-black uppercase tracking-wide text-white/60">Account username or email
              <input required maxLength={254} value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="mt-2 h-12 w-full rounded-md border border-white/15 bg-[#0b0f19] px-3 text-sm text-white outline-none focus:border-yellow-400" placeholder={mockMode ? "player@crewonset.com" : "Your account email or username"} />
            </label>
            <button disabled={busy} className="w-full rounded-md bg-yellow-400 px-4 py-3 text-sm font-black uppercase text-[#111827] disabled:opacity-50">{busy ? "Please wait" : "Send verification code"}</button>
          </form>
        ) : (
          <form onSubmit={submitAppeal} className="mt-6 space-y-4">
            {!mockMode && <label className="block text-xs font-black uppercase tracking-wide text-white/60">Verification code
              <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 h-12 w-full rounded-md border border-white/15 bg-[#0b0f19] px-3 text-sm text-white outline-none focus:border-yellow-400" placeholder="6 digit code" />
            </label>}
            {mockMode && <label className="block text-xs font-black uppercase tracking-wide text-white/60">Demo code
              <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 h-12 w-full rounded-md border border-white/15 bg-[#0b0f19] px-3 text-sm text-white outline-none focus:border-yellow-400" placeholder="123456" />
            </label>}
            {priorDenied && <label className="flex items-start gap-2 text-xs leading-5 text-white/65"><input type="checkbox" checked={newInformation} onChange={(event) => setNewInformation(event.target.checked)} className="mt-1" />I have new information that was not included in my previous appeal.</label>}
            <label className="block text-xs font-black uppercase tracking-wide text-white/60">Why should we review this ban?
              <textarea required minLength={20} maxLength={2000} rows={6} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-md border border-white/15 bg-[#0b0f19] p-3 text-sm font-normal leading-6 text-white outline-none focus:border-yellow-400" placeholder="Explain what happened and include any details that may help us review the decision." />
              <span className="mt-1 block text-right text-[10px] font-normal text-white/35">{reason.length}/2,000</span>
            </label>
            <button disabled={busy} className="w-full rounded-md bg-yellow-400 px-4 py-3 text-sm font-black uppercase text-[#111827] disabled:opacity-50">{busy ? "Sending appeal" : "Submit appeal"}</button>
          </form>
        )}
        <p className="mt-6 text-xs leading-5 text-white/40">You can have one appeal under review for a ban at a time. If an appeal is denied, you may submit another with new information. Need help accessing your registered email? Contact <a className="font-bold text-white/65 underline" href="mailto:crewonsetgame@gmail.com">Crew On Set support</a>.</p>
      </section>
    </main>
  );
}
