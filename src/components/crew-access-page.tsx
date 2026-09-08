import Image from "@/components/next-compat/image";
import Link from "@/components/next-compat/link";
import { FormEvent, useState } from "react";
import { useRouter } from "@/components/next-compat/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle, Send, UserPlus, X } from "lucide-react";
import { EMAIL_ERROR, PASSWORD_ERROR, USERNAME_ERROR, isValidEmail, isValidPassword, isValidUsername } from "@/lib/validation";

type CrewAccessPageProps = {
  mode: "login" | "signup";
  scope?: "player" | "admin";
};

async function loginWithCredentials(
  username: string,
  password: string,
  scope: "player" | "admin",
) {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, scope }),
  });
  const result = (await response.json()) as { error?: string; destination?: string };
  if (!response.ok) throw new Error(result.error ?? "Unable to sign in.");
  return result.destination ?? (scope === "admin" ? "/admin" : "/portal");
}

export function CrewAccessPage({ mode, scope = "player" }: CrewAccessPageProps) {
  const isLogin = mode === "login";
  const isAdmin = scope === "admin";
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    if (!isLogin) {
      const name = String(data.get("name") ?? "");
      const email = String(data.get("email") ?? "");
      const password = String(data.get("password") ?? "");
      if (!isValidEmail(email)) {
        setError(EMAIL_ERROR);
        return;
      }
      const confirmation = String(data.get("passwordConfirmation") ?? "");
      if (!isValidPassword(password)) {
        setError(PASSWORD_ERROR);
        return;
      }
      if (password !== confirmation) {
        setError("Passwords do not match.");
        return;
      }
      setError("");
      const body = `Name: ${name}\nEmail: ${email}\n\nI'd like to join the Crew On Set community.`;
      window.location.href = `mailto:hello@crew-on-set.game?subject=${encodeURIComponent("Crew On Set community sign up")}&body=${encodeURIComponent(body)}`;
      return;
    }

    const username = String(data.get("username") ?? "");
    if (!isAdmin && !username.includes("@")) {
      setError(USERNAME_ERROR);
      return;
    }
    if (isAdmin && !isValidUsername(username)) {
      setError(USERNAME_ERROR);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const destination = await loginWithCredentials(
        username,
        String(data.get("password") ?? ""),
        scope,
      );
      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setLoading(false);
    }
  }

  async function handleGoogleMock() {
    setError("");
    setGoogleLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    try {
      const destination = await loginWithCredentials("player@gmail.com", "player", "player");
      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in with Google.");
      setGoogleLoading(false);
    }
  }

  return (

    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-navy px-5 py-24 text-white">
      <Image src="/assets/hero-key-art.png" alt="" fill className="object-cover opacity-20" priority />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(19,27,52,.98),rgba(19,27,52,.8))]" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs font-black tracking-[.14em] text-white/65 transition hover:text-yellow">
          <ArrowLeft className="size-4" /> BACK TO THE SET
        </Link>
        <section className="rounded-lg border border-white/15 bg-cream p-6 text-navy shadow-2xl sm:p-8">
          <div className="flex size-11 items-center justify-center rounded-md bg-coral text-white">
            {isLogin ? <KeyRound className="size-5" /> : <UserPlus className="size-5" />}
          </div>
          <p className="mt-6 text-xs font-black tracking-[.18em] text-coral">{isAdmin ? "STUDIO ADMIN" : isLogin ? "PORTAL ACCESS" : "CREW ACCESS"}</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[.04em]">{isAdmin ? "Admin login" : isLogin ? "Login" : "Sign up"}
          </h1>
          <p className="mt-3 leading-relaxed text-navy/60">
            {isAdmin ? "Enter your studio admin credentials to open the Crew On Set console." : isLogin ? "Enter your account credentials to open your private Crew On Set portal." : "Join the community list for production updates and playtest calls."}
          </p>
          {isLogin && <div className="mt-4 space-y-1 rounded-md border border-navy/10 bg-navy/5 px-3 py-2 text-xs font-bold text-navy/55"><p>--This is demo accounts only--</p>{isAdmin ? <p>Admin: admin / admin</p> : <p>Player: player@gmail.com / player</p>}</div>}
          <form onSubmit={handleSubmit} className="mt-7">
            {isLogin ? (
              <>
                <label className="form-label">{isAdmin ? "USERNAME" : "EMAIL"}<input className="form-input" name="username" autoComplete="username" required placeholder={isAdmin ? "admin" : "player@gmail.com"} /></label>
                <label className="form-label mt-4">PASSWORD

                  <span className="relative block">
                    <input className="form-input pr-12" name="password" type={passwordVisible ? "text" : "password"} autoComplete="current-password" required placeholder="••••••••" />
                    <button type="button" onClick={() => setPasswordVisible((visible) => !visible)} className="absolute right-1 top-[calc(50%+4px)] grid size-10 -translate-y-1/2 place-items-center rounded text-navy/40 transition hover:bg-navy/5 hover:text-navy" aria-label={passwordVisible ? "Hide password" : "Show password"}>
                      {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </span>
                </label>
                <div className="mt-2 text-right">
                  <button type="button" onClick={() => setForgotOpen(true)} className="text-xs font-black uppercase tracking-wide text-coral hover:underline">
                    Forgot password?
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="form-label">YOUR NAME<input className="form-input" name="name" required placeholder="Jane Director" /></label>
                <label className="form-label mt-4">YOUR EMAIL<input className="form-input" name="email" type="email" required placeholder="jane@example.com" /></label>
                <label className="form-label mt-4">PASSWORD
                  <span className="relative block">
                    <input className="form-input pr-12" name="password" type={passwordVisible ? "text" : "password"} autoComplete="new-password" minLength={6} required placeholder="Minimum 6 characters" />
                    <button type="button" onClick={() => setPasswordVisible((visible) => !visible)} className="absolute right-1 top-[calc(50%+4px)] grid size-10 -translate-y-1/2 place-items-center rounded text-navy/40 transition hover:bg-navy/5 hover:text-navy" aria-label={passwordVisible ? "Hide password" : "Show password"}>
                      {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </span>
                </label>
                <label className="form-label mt-4">CONFIRM PASSWORD
                  <span className="relative block">
                    <input className="form-input pr-12" name="passwordConfirmation" type={confirmationVisible ? "text" : "password"} autoComplete="new-password" minLength={6} required placeholder="Repeat password" />
                    <button type="button" onClick={() => setConfirmationVisible((visible) => !visible)} className="absolute right-1 top-[calc(50%+4px)] grid size-10 -translate-y-1/2 place-items-center rounded text-navy/40 transition hover:bg-navy/5 hover:text-navy" aria-label={confirmationVisible ? "Hide password confirmation" : "Show password confirmation"}>
                      {confirmationVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </span>
                </label>
              </>
            )}
            {error && <p role="alert" className="mt-4 text-sm font-bold text-coral">{error}</p>}
            <button disabled={loading} type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy px-5 py-3.5 text-sm font-black tracking-wider text-white transition hover:bg-coral disabled:cursor-wait disabled:opacity-70">
              {loading ? <><LoaderCircle className="size-4 animate-spin" /> SIGNING IN</> : <>{isAdmin ? "ENTER CONSOLE" : isLogin ? "ENTER PORTAL" : "JOIN THE CREW"} <Send className="size-4" /></>}
            </button>

            {!isAdmin && (
              <>
                <div className="my-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-navy/35">
                  <span className="h-px flex-1 bg-navy/10" /> or <span className="h-px flex-1 bg-navy/10" />
                </div>

                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={handleGoogleMock}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-md border border-navy/20 bg-white px-5 py-3.5 text-sm font-black tracking-wider text-navy transition hover:bg-navy/5 disabled:cursor-wait disabled:opacity-70"
                >
                  {googleLoading ? (
                    <><LoaderCircle className="size-4 animate-spin" /> CONNECTING TO GOOGLE (DEMO)</>
                  ) : (
                    <>
                      <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M21.35 12.23c0-.79-.07-1.55-.2-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.93v2.44h3.14c1.84-1.7 2.92-4.2 2.92-7.4Z" />
                        <path fill="#34A853" d="M12 21.8c2.63 0 4.84-.87 6.45-2.35l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.55 0-4.71-1.72-5.49-4.04H3.27v2.52A9.75 9.75 0 0 0 12 21.8Z" />
                        <path fill="#FBBC05" d="M6.51 13.89a5.86 5.86 0 0 1 0-3.76V7.61H3.27a9.75 9.75 0 0 0 0 8.8l3.24-2.52Z" />
                        <path fill="#EA4335" d="M12 6.09c1.43 0 2.72.49 3.74 1.45l2.8-2.8C16.83 3.18 14.63 2.2 12 2.2a9.75 9.75 0 0 0-8.73 5.41l3.24 2.52C7.29 7.81 9.45 6.09 12 6.09Z" />
                      </svg>
                      CONTINUE WITH GOOGLE (DEMO)
                    </>
                  )}
                </button>
                <p className="mt-2 text-center text-[11px] leading-relaxed text-navy/40">
                  Simulated OAuth for demo purposes — signs you in as the demo player.
                </p>
              </>
            )}

          </form>
        </section>
      </div>

      {forgotOpen && <ForgotPasswordModal onClose={() => setForgotOpen(false)} />}
    </main>
  );
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"email" | "code" | "password" | "done">("email");
  const [email, setEmail] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError(EMAIL_ERROR);
      return;
    }
    setError("");
    setSending(true);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setTimeout(() => {
      setSentCode(code);
      setSending(false);
      setStep("code");
    }, 900);
  }

  function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (codeInput !== sentCode) {
      setError("That code doesn't match. Please try again.");
      return;
    }
    setError("");
    setStep("password");
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("newPassword") ?? "");
    const confirm = String(data.get("confirmPassword") ?? "");
    if (!isValidPassword(password)) {
      setError(PASSWORD_ERROR);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setStep("done");
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 px-5" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md rounded-lg border border-navy/10 bg-cream p-6 text-navy shadow-2xl sm:p-8">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-navy/40 hover:text-navy">
          <X className="size-5" />
        </button>

        <p className="text-xs font-black tracking-[.18em] text-coral">PASSWORD RECOVERY (DEMO)</p>
        <h2 className="mt-2 text-2xl font-black uppercase">Forgot password?</h2>

        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="mt-6">
            <p className="text-sm leading-relaxed text-navy/60">Enter your account email and we&apos;ll simulate sending a 6-digit recovery code.</p>
            <label className="form-label mt-4">EMAIL
              <input className="form-input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="player@gmail.com" />
            </label>
            {error && <p role="alert" className="mt-3 text-sm font-bold text-coral">{error}</p>}
            <button disabled={sending} type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy px-5 py-3.5 text-sm font-black tracking-wider text-white transition hover:bg-coral disabled:cursor-wait disabled:opacity-70">
              {sending ? <><LoaderCircle className="size-4 animate-spin" /> SENDING CODE</> : "SEND RECOVERY CODE"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleCodeSubmit} className="mt-6">
            <p className="text-sm leading-relaxed text-navy/60">
              A simulated 6-digit code was &quot;sent&quot; to <strong>{email}</strong>. For this demo, here it is: <strong className="text-coral">{sentCode}</strong>
            </p>
            <label className="form-label mt-4">RECOVERY CODE
              <input className="form-input" required maxLength={6} value={codeInput} onChange={(event) => setCodeInput(event.target.value)} placeholder="123456" />
            </label>
            {error && <p role="alert" className="mt-3 text-sm font-bold text-coral">{error}</p>}
            <button type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy px-5 py-3.5 text-sm font-black tracking-wider text-white transition hover:bg-coral">
              VERIFY CODE
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="mt-6">
            <p className="text-sm leading-relaxed text-navy/60">Code verified. Choose a new password.</p>
            <label className="form-label mt-4">NEW PASSWORD
              <span className="relative block">
                <input className="form-input pr-12" name="newPassword" type={newPasswordVisible ? "text" : "password"} minLength={6} required placeholder="Minimum 6 characters" />
                <button type="button" onClick={() => setNewPasswordVisible((visible) => !visible)} className="absolute right-1 top-[calc(50%+4px)] grid size-10 -translate-y-1/2 place-items-center rounded text-navy/40 transition hover:bg-navy/5 hover:text-navy" aria-label={newPasswordVisible ? "Hide new password" : "Show new password"}>
                  {newPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>
            <label className="form-label mt-4">CONFIRM PASSWORD
              <span className="relative block">
                <input className="form-input pr-12" name="confirmPassword" type={confirmPasswordVisible ? "text" : "password"} minLength={6} required placeholder="Repeat password" />
                <button type="button" onClick={() => setConfirmPasswordVisible((visible) => !visible)} className="absolute right-1 top-[calc(50%+4px)] grid size-10 -translate-y-1/2 place-items-center rounded text-navy/40 transition hover:bg-navy/5 hover:text-navy" aria-label={confirmPasswordVisible ? "Hide confirm password" : "Show confirm password"}>
                  {confirmPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>
            {error && <p role="alert" className="mt-3 text-sm font-bold text-coral">{error}</p>}
            <button type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy px-5 py-3.5 text-sm font-black tracking-wider text-white transition hover:bg-coral">
              RESET PASSWORD
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="mt-6">
            <p className="text-sm leading-relaxed text-navy/60">
              Your password has been reset (simulated). You can now sign in with your new password.
            </p>
            <button type="button" onClick={onClose} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#278b78] px-5 py-3.5 text-sm font-black tracking-wider text-white transition hover:bg-[#1f7464]">
              BACK TO LOGIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
