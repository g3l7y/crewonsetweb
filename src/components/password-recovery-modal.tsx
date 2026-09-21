import { FormEvent, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { isMockMode } from "@/lib/playfab/config";
import { EMAIL_ERROR, PASSWORD_ERROR, PASSWORD_INPUT_PATTERN, isValidEmail, isValidPassword } from "@/lib/validation";

type RecoveryScope = "player" | "admin";
type RecoveryStep = "email" | "code" | "password" | "sent" | "done";

type PasswordRecoveryModalProps = {
  scope: RecoveryScope;
  onClose: () => void;
  dark?: boolean;
};

export function PasswordRecoveryModal({ scope, onClose, dark = false }: PasswordRecoveryModalProps) {
  const mockMode = isMockMode();
  const [step, setStep] = useState<RecoveryStep>("email");
  const [email, setEmail] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [code, setCode] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const shellClass = dark ? "border-white/10 bg-[#151c29] text-white" : "border-navy/10 bg-cream text-navy";
  const mutedClass = dark ? "text-white/55" : "text-navy/60";
  const labelClass = dark ? "!text-white/60" : "";
  const inputClass = dark
    ? "form-input !border-white/10 !bg-[#0d121c] !text-white placeholder:!text-white/25 focus:!border-coral"
    : "form-input";
  const buttonClass = dark
    ? "bg-coral text-white hover:bg-coral-dark"
    : "bg-navy text-white hover:bg-coral";
  const title = scope === "admin" ? "Admin password recovery" : "Password recovery";

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setError(EMAIL_ERROR);
      return;
    }

    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password-recovery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, scope }),
      });
      const result = (await response.json()) as { success?: boolean; error?: string; mode?: string; demoCode?: string };
      if (!response.ok || result.success === false) throw new Error(result.error ?? "Unable to start password recovery.");
      setEmail(normalizedEmail);
      if (result.mode === "mock") {
        setDemoCode(result.demoCode ?? "");
        setStep("code");
      } else {
        setStep("sent");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to start password recovery.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password-recovery/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, scope, code }),
      });
      const result = (await response.json()) as { success?: boolean; error?: string; recoveryToken?: string };
      if (!response.ok || result.success === false || !result.recoveryToken) throw new Error(result.error ?? "That code is invalid or expired.");
      setRecoveryToken(result.recoveryToken);
      setStep("password");
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "That code is invalid or expired.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidPassword(newPassword)) {
      setError(PASSWORD_ERROR);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password-recovery/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryToken, password: newPassword }),
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || result.success === false) throw new Error(result.error ?? "Unable to reset the password.");
      setStep("done");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to reset the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="password-recovery-title">
      <section className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl sm:p-8 ${shellClass}`}>
        <button type="button" onClick={onClose} aria-label="Close" className={`absolute right-4 top-4 ${dark ? "text-white/45 hover:text-white" : "text-navy/40 hover:text-navy"}`}>
          <X className="size-5" />
        </button>

        <p className="text-xs font-black tracking-[.18em] text-coral">{mockMode ? "PASSWORD RECOVERY (DEMO)" : "PASSWORD RECOVERY"}</p>
        <h2 id="password-recovery-title" className="mt-2 text-2xl font-black uppercase">{title}</h2>

        {step === "email" && (
          <form onSubmit={submitEmail} className="mt-6">
            <p className={`text-sm leading-relaxed ${mutedClass}`}>
              Enter the email used by the account. Someone is trying to change this password; if it&apos;s you, use the recovery {mockMode ? "code" : "link"} and never share it with anyone.
            </p>
            <label className={`form-label mt-4 ${labelClass}`}>EMAIL
              <input className={inputClass} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="player@example.com" />
            </label>
            {error && <p role="alert" className="mt-3 text-sm font-bold text-coral">{error}</p>}
            <button disabled={busy} type="submit" className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-3.5 text-sm font-black tracking-wider transition disabled:cursor-wait disabled:opacity-70 ${buttonClass}`}>
              {busy ? <><LoaderCircle className="size-4 animate-spin" /> SENDING RECOVERY</> : mockMode ? "SEND RECOVERY CODE" : "SEND RECOVERY EMAIL"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verifyCode} className="mt-6">
            <p className={`text-sm leading-relaxed ${mutedClass}`}>
              This is a demo recovery. The code was created for <strong>{email}</strong>. Use it once and never share it: <strong className="text-coral">{demoCode}</strong>
            </p>
            <label className={`form-label mt-4 ${labelClass}`}>RECOVERY CODE
              <input className={inputClass} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" />
            </label>
            {error && <p role="alert" className="mt-3 text-sm font-bold text-coral">{error}</p>}
            <button disabled={busy} type="submit" className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-3.5 text-sm font-black tracking-wider transition disabled:cursor-wait disabled:opacity-70 ${buttonClass}`}>
              {busy ? <><LoaderCircle className="size-4 animate-spin" /> VERIFYING CODE</> : "VERIFY CODE"}
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={resetPassword} className="mt-6">
            <p className={`text-sm leading-relaxed ${mutedClass}`}>Code verified. Choose a new password.</p>
            <label className={`form-label mt-4 ${labelClass}`}>NEW PASSWORD
              <input className={inputClass} name="newPassword" type="password" minLength={8} maxLength={64} pattern={PASSWORD_INPUT_PATTERN} title={PASSWORD_ERROR} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" placeholder="8+ characters with upper/lowercase, number, and symbol" />
            </label>
            <label className={`form-label mt-4 ${labelClass}`}>CONFIRM PASSWORD
              <input className={inputClass} name="confirmPassword" type="password" minLength={8} maxLength={64} pattern={PASSWORD_INPUT_PATTERN} title={PASSWORD_ERROR} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="Repeat password" />
            </label>
            {error && <p role="alert" className="mt-3 text-sm font-bold text-coral">{error}</p>}
            <button disabled={busy} type="submit" className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-3.5 text-sm font-black tracking-wider transition disabled:cursor-wait disabled:opacity-70 ${buttonClass}`}>
              {busy ? <><LoaderCircle className="size-4 animate-spin" /> SAVING PASSWORD</> : "RESET PASSWORD"}
            </button>
          </form>
        )}

        {step === "sent" && (
          <div className="mt-6">
            <p className={`text-sm leading-relaxed ${mutedClass}`}>
              We sent a secure recovery link to <strong>{email}</strong>. Someone is trying to change this password; if it&apos;s you, open the link and never share it with anyone. The link expires after 30 minutes.
            </p>
            <button type="button" onClick={onClose} className={`mt-5 inline-flex w-full items-center justify-center rounded-md px-5 py-3.5 text-sm font-black tracking-wider transition ${buttonClass}`}>BACK TO LOGIN</button>
          </div>
        )}

        {step === "done" && (
          <div className="mt-6">
            <p className={`text-sm leading-relaxed ${mutedClass}`}>Your password has been reset. You can now sign in with the new password.</p>
            <button type="button" onClick={onClose} className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-[#278b78] px-5 py-3.5 text-sm font-black tracking-wider text-white transition hover:bg-[#1f7464]">BACK TO LOGIN</button>
          </div>
        )}
      </section>
    </div>
  );
}