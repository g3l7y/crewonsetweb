import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import Link from "@/components/next-compat/link";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { PASSWORD_ERROR, PASSWORD_INPUT_PATTERN, isValidPassword } from "@/lib/validation";

export const Route = createFileRoute("/password-recovery")({
  head: () => ({
    meta: [
      { title: "Reset Password — Crew On Set!" },
      { name: "description", content: "Set a new Crew On Set password after account recovery." },
    ],
  }),
  component: PasswordRecoveryPage,
});

function PasswordRecoveryPage() {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [recoveryScope, setRecoveryScope] = useState<"player" | "admin">("player");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("This recovery link is missing or invalid.");
      return;
    }
    if (!isValidPassword(newPassword)) {
      setError(PASSWORD_ERROR);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/auth/password-recovery/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryToken: token, password: newPassword }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        scope?: "player" | "admin";
      };
      if (!response.ok || result.success === false)
        throw new Error(result.error ?? "This recovery link is invalid or expired.");
      setRecoveryScope(result.scope === "admin" ? "admin" : "player");
      setSuccess(true);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to reset the password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="crew-access-page grid min-h-screen place-items-center bg-navy px-5 py-24 text-white">
      <section className="w-full max-w-md rounded-lg border border-white/15 bg-cream p-6 text-navy shadow-2xl sm:p-8">
        <div className="grid size-11 place-items-center rounded-md bg-coral text-white">
          <LockKeyhole className="size-5" />
        </div>
        <h1 className="mt-6 text-3xl font-black uppercase text-coral">Reset password</h1>
        {success ? (
          <>
            <p className="mt-4 text-sm leading-relaxed text-navy/65">
              Your password has been reset successfully. You can now sign in with it.
            </p>
            <Link
              href={recoveryScope === "admin" ? "/admin/login" : "/login"}
              className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-yellow px-4 py-3 text-xs font-black uppercase text-navy transition hover:brightness-95"
            >
              {recoveryScope === "admin" ? "Admin login" : "Player login"}
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <p className="text-sm leading-relaxed text-navy/65">
              This secure PlayFab recovery link expires after 30 minutes. Choose a new password
              below.
            </p>
            <label className="form-label">
              NEW PASSWORD
              <span className="relative block">
                <input
                  className="form-input pr-12"
                  type={passwordVisible ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  maxLength={64}
                  pattern={PASSWORD_INPUT_PATTERN}
                  title={PASSWORD_ERROR}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  className="absolute right-1 top-[calc(50%+4px)] grid size-10 -translate-y-1/2 place-items-center rounded text-navy/40 transition hover:bg-navy/5 hover:text-navy"
                  aria-label={passwordVisible ? "Hide new password" : "Show new password"}
                >
                  {passwordVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
              </span>
            </label>
            <label className="form-label">
              CONFIRM NEW PASSWORD
              <span className="relative block">
                <input
                  className="form-input pr-12"
                  type={confirmationVisible ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  maxLength={64}
                  pattern={PASSWORD_INPUT_PATTERN}
                  title={PASSWORD_ERROR}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setConfirmationVisible((visible) => !visible)}
                  className="absolute right-1 top-[calc(50%+4px)] grid size-10 -translate-y-1/2 place-items-center rounded text-navy/40 transition hover:bg-navy/5 hover:text-navy"
                  aria-label={
                    confirmationVisible
                      ? "Hide password confirmation"
                      : "Show password confirmation"
                  }
                >
                  {confirmationVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
              </span>
            </label>
            {error && (
              <p role="alert" className="text-sm font-bold text-coral">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving || !token}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-yellow px-5 py-3.5 text-sm font-black tracking-wider text-navy transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" /> SAVING PASSWORD
                </>
              ) : (
                "RESET PASSWORD"
              )}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
