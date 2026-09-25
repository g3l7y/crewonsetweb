import Image from "@/components/next-compat/image";
import Link from "@/components/next-compat/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "@/components/next-compat/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle, Send, UserPlus, X } from "lucide-react";
import {
  EMAIL_ERROR,
  PASSWORD_ERROR,
  PASSWORD_INPUT_PATTERN,
  USERNAME_ERROR,
  isValidEmail,
  isValidPassword,
  isValidUsername,
} from "@/lib/validation";
import { PasswordRecoveryModal } from "@/components/password-recovery-modal";
import { GOOGLE_CLIENT_ID, isGoogleAuthConfigured, isMockMode } from "@/lib/playfab/config";

type CrewAccessPageProps = {
  mode: "login" | "signup";
  scope?: "player" | "admin";
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GooglePopupError = {
  type?: "popup_closed" | "popup_failed_to_open" | "unknown";
};

type GoogleAccessTokenClient = {
  requestAccessToken: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback: (error: GooglePopupError) => void;
          }) => GoogleAccessTokenClient;
        };
      };
    };
  }
}

let googleScriptPromise: Promise<void> | undefined;

async function requestGoogleAccessToken() {
  if (typeof window === "undefined") {
    throw new Error("Google sign-in is only available in a browser.");
  }
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google sign-in is not configured yet.");
  }

  if (!window.google?.accounts?.oauth2) {
    googleScriptPromise ??= new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        googleScriptPromise = undefined;
        reject(new Error("Unable to load Google sign-in."));
      };
      document.head.appendChild(script);
    });
    await googleScriptPromise;
  }

  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error("Google sign-in is unavailable. Please try again.");

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const rejectOnce = (message: string) => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    };
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: (response) => {
        if (response.error) {
          rejectOnce(
            response.error_description ??
              "Google sign-in was cancelled. You can continue with your email and password.",
          );
        } else if (!response.access_token) {
          rejectOnce("Google did not return an access token. Please try again.");
        } else {
          settled = true;
          resolve(response.access_token);
        }
      },
      error_callback: (error) => {
        const message =
          error.type === "popup_closed"
            ? "Google sign-in was cancelled. You can continue with your email and password."
            : error.type === "popup_failed_to_open"
              ? "The Google sign-in window could not be opened. Allow pop-ups or continue with your email and password."
              : "Google sign-in could not be completed. Please try again or use your email and password.";
        rejectOnce(message);
      },
    });
    client.requestAccessToken();
  });
}

async function loginWithCredentials(
  identifier: string,
  password: string,
  scope: "player" | "admin",
) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: identifier, password, scope }),
  });
  const result = (await response.json()) as {
    error?: string;
    destination?: string;
    success?: boolean;
    session?: { displayName?: string; email?: string };
  };
  if (!response.ok || result.success === false)
    throw new Error(result.error ?? "Unable to sign in.");
  if (scope === "player") rememberMockProfile(result.session);
  return result.destination ?? (scope === "admin" ? "/admin" : "/portal");
}

async function registerWithCredentials(
  username: string,
  email: string,
  password: string,
  acceptedPolicies: boolean,
) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, acceptedPolicies }),
  });
  const result = (await response.json()) as {
    error?: string;
    destination?: string;
    success?: boolean;
    session?: { displayName?: string; email?: string };
  };
  if (!response.ok || result.success === false) {
    throw new Error(result.error ?? "Unable to create your account.");
  }
  rememberMockProfile(result.session);
  return result.destination ?? "/portal";
}

async function loginWithGoogleAccessToken(
  accessToken: string,
  intent: "login" | "signup",
  acceptedPolicies: boolean,
) {
  const response = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, intent, acceptedPolicies }),
  });
  const result = (await response.json()) as {
    error?: string;
    destination?: string;
    success?: boolean;
    needsProfileSetup?: boolean;
  };
  if (!response.ok || result.success === false) {
    throw new Error(result.error ?? "Unable to sign in with Google.");
  }
  return {
    destination: result.destination ?? "/portal",
    needsProfileSetup: result.needsProfileSetup === true,
  };
}

function rememberMockProfile(session?: { displayName?: string; email?: string }) {
  if (!isMockMode() || typeof window === "undefined" || !session?.displayName) return;
  window.localStorage.setItem(
    "cos.profile.account",
    JSON.stringify({
      username: session.displayName,
      email: session.email ?? "",
    }),
  );
  window.localStorage.setItem(
    "player-account",
    JSON.stringify({
      username: session.displayName,
      email: session.email ?? "",
      displayName: session.displayName,
    }),
  );
}

export function CrewAccessPage({ mode, scope = "player" }: CrewAccessPageProps) {
  const isLogin = mode === "login";
  const isAdmin = scope === "admin";
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleAttemptId = useRef(0);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [googleProfileSetupOpen, setGoogleProfileSetupOpen] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [policyOpen, setPolicyOpen] = useState<PolicyKind | null>(null);

  useEffect(() => {
    return () => {
      // Ignore a late OAuth callback if the user leaves the login/signup page.
      googleAttemptId.current += 1;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Choosing the manual form cancels any still-pending Google popup flow.
    googleAttemptId.current += 1;
    setGoogleLoading(false);
    const data = new FormData(event.currentTarget);

    if (!isLogin) {
      if (!acceptedPolicies) {
        setError(
          "Please agree to the Terms & Conditions and Privacy Policy before joining the crew.",
        );
        return;
      }
      const username = String(data.get("username") ?? "").trim();
      const email = String(data.get("email") ?? "");
      const password = String(data.get("password") ?? "");
      if (!isValidUsername(username)) {
        setError(USERNAME_ERROR);
        return;
      }
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
      setLoading(true);
      try {
        const destination = await registerWithCredentials(
          username,
          email.trim(),
          password,
          acceptedPolicies,
        );
        router.push(destination);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to create your account.");
        setLoading(false);
      }
      return;
    }

    const identifier = String(data.get("username") ?? "").trim();
    if (isAdmin) {
      if (!isValidEmail(identifier) && !isValidUsername(identifier)) {
        setError("Please enter a valid email address or username.");
        return;
      }
    } else if (!isValidEmail(identifier) && !isValidUsername(identifier)) {
      setError("Please enter a valid email address or username.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const destination = await loginWithCredentials(
        identifier,
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

  async function handleGoogleSignIn() {
    if (!isLogin && !acceptedPolicies) {
      setError(
        "Please agree to the Terms & Conditions and Privacy Policy before signing up with Google.",
      );
      return;
    }
    const attemptId = ++googleAttemptId.current;
    setError("");
    setGoogleLoading(true);
    try {
      let googleResult: Awaited<ReturnType<typeof loginWithGoogleAccessToken>>;
      if (isMockMode()) {
        googleResult = await loginWithGoogleAccessToken(
          "mock-google-account",
          isLogin ? "login" : "signup",
          acceptedPolicies,
        );
      } else {
        const accessToken = await requestGoogleAccessToken();
        if (attemptId !== googleAttemptId.current) return;
        googleResult = await loginWithGoogleAccessToken(
          accessToken,
          isLogin ? "login" : "signup",
          acceptedPolicies,
        );
      }
      if (attemptId !== googleAttemptId.current) return;
      if (googleResult.needsProfileSetup) {
        setGoogleProfileSetupOpen(true);
        setGoogleLoading(false);
        return;
      }
      router.push(googleResult.destination);
      router.refresh();
    } catch (err) {
      if (attemptId !== googleAttemptId.current) return;
      setError(err instanceof Error ? err.message : "Unable to sign in with Google.");
      setGoogleLoading(false);
    }
  }

  return (
    <main className="crew-access-page relative grid min-h-screen place-items-center overflow-hidden bg-navy px-5 py-24 text-white">
      <Image
        src="/assets/crew-set-illustration.png"
        alt=""
        fill
        className="object-cover opacity-20"
        priority
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(19,27,52,.98),rgba(19,27,52,.8))]" />
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-xs font-black tracking-[.14em] text-white/65 transition hover:text-yellow"
        >
          <ArrowLeft className="size-4" /> BACK TO THE SET
        </Link>
        <section className="rounded-lg border border-white/15 bg-cream p-6 text-navy shadow-2xl sm:p-8">
          <div className="flex size-11 items-center justify-center rounded-md bg-coral text-white">
            {isLogin ? <KeyRound className="size-5" /> : <UserPlus className="size-5" />}
          </div>
          <h1
            className={`${isAdmin ? "mt-6" : "mt-2"} text-4xl font-black uppercase tracking-[.04em] text-coral`}
          >
            {isAdmin ? "Admin login" : isLogin ? "Login" : "Sign up"}
          </h1>
          <p className="mt-3 leading-relaxed text-navy/60">
            {isAdmin
              ? "Enter your studio admin credentials to open the Crew On Set console."
              : isLogin
                ? "Enter your account credentials to open your private Crew On Set portal."
                : "Join the community list for production updates and playtest calls."}
          </p>
          {isLogin && isMockMode() && (
            <div className="mt-4 space-y-1 rounded-md border border-navy/10 bg-navy/5 px-3 py-2 text-xs font-bold text-navy/55">
              <p>--This is demo accounts only--</p>
              {isAdmin ? (
                <p>Admin: admin@crewonset.com / admin</p>
              ) : (
                <p>Player: player@crewonset.com / player</p>
              )}
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-7">
            {isLogin ? (
              <>
                <label className="form-label">
                  EMAIL OR USERNAME
                  <input
                    className="form-input"
                    name="username"
                    autoComplete="username"
                    required
                    placeholder={
                      isMockMode()
                        ? isAdmin
                          ? "admin@crewonset.com"
                          : "player@crewonset.com"
                        : isAdmin
                          ? "admin@crewonset.com"
                          : "player@example.com"
                    }
                  />
                </label>
                <label className="form-label mt-4">
                  PASSWORD
                  <span className="relative block">
                    <input
                      className="form-input pr-12"
                      name="password"
                      type={passwordVisible ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordVisible((visible) => !visible)}
                      className="absolute right-1 top-[calc(50%+4px)] grid size-10 -translate-y-1/2 place-items-center rounded text-navy/40 transition hover:bg-navy/5 hover:text-navy"
                      aria-label={passwordVisible ? "Hide password" : "Show password"}
                    >
                      {passwordVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                  </span>
                </label>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs font-black uppercase tracking-wide text-coral hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="form-label">
                  USERNAME
                  <input
                    className="form-input"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    minLength={3}
                    maxLength={20}
                    pattern="[A-Za-z][A-Za-z0-9_]{2,19}"
                    title="3–20 characters; start with a letter; use only letters, numbers, or underscores."
                    required
                    placeholder="jane_director"
                    onInput={(event) => {
                      event.currentTarget.value = event.currentTarget.value
                        .replace(/[^A-Za-z0-9_]/g, "")
                        .replace(/^[^A-Za-z]+/, "")
                        .slice(0, 20);
                    }}
                  />
                </label>
                <label className="form-label mt-4">
                  YOUR EMAIL
                  <input
                    className="form-input"
                    name="email"
                    type="email"
                    required
                    placeholder="jane@example.com"
                  />
                </label>
                <label className="form-label mt-4">
                  PASSWORD
                  <span className="relative block">
                    <input
                      className="form-input pr-12"
                      name="password"
                      type={passwordVisible ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={64}
                      pattern={PASSWORD_INPUT_PATTERN}
                      title={PASSWORD_ERROR}
                      required
                      placeholder="8+ characters with upper/lowercase, number, and symbol"
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordVisible((visible) => !visible)}
                      className="absolute right-1 top-[calc(50%+4px)] grid size-10 -translate-y-1/2 place-items-center rounded text-navy/40 transition hover:bg-navy/5 hover:text-navy"
                      aria-label={passwordVisible ? "Hide password" : "Show password"}
                    >
                      {passwordVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                  </span>
                </label>
                <label className="form-label mt-4">
                  CONFIRM PASSWORD
                  <span className="relative block">
                    <input
                      className="form-input pr-12"
                      name="passwordConfirmation"
                      type={confirmationVisible ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={64}
                      pattern={PASSWORD_INPUT_PATTERN}
                      title={PASSWORD_ERROR}
                      required
                      placeholder="Repeat password"
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
                      {confirmationVisible ? (
                        <Eye className="size-4" />
                      ) : (
                        <EyeOff className="size-4" />
                      )}
                    </button>
                  </span>
                </label>
                <div className="mt-5 flex items-start gap-3 text-xs leading-relaxed text-navy/70">
                  <input
                    id="signup-policy-acceptance"
                    className="mt-0.5 size-4 shrink-0 accent-coral"
                    type="checkbox"
                    checked={acceptedPolicies}
                    onChange={(event) => setAcceptedPolicies(event.target.checked)}
                    required
                  />
                  <p>
                    <label htmlFor="signup-policy-acceptance">I agree to the </label>
                    <button
                      type="button"
                      onClick={() => setPolicyOpen("terms")}
                      className="font-bold text-coral underline underline-offset-2 hover:text-coral-dark"
                    >
                      Terms &amp; Conditions
                    </button>
                    <span> and </span>
                    <button
                      type="button"
                      onClick={() => setPolicyOpen("privacy")}
                      className="font-bold text-coral underline underline-offset-2 hover:text-coral-dark"
                    >
                      Privacy Policy
                    </button>
                    <span>.</span>
                  </p>
                </div>
              </>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm font-bold text-coral">
                {error}
              </p>
            )}
            <button
              disabled={loading}
              type="submit"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-yellow px-5 py-3.5 text-sm font-black tracking-wider text-navy transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />{" "}
                  {isLogin ? "SIGNING IN" : "CREATING ACCOUNT"}
                </>
              ) : (
                <>
                  {isAdmin ? "ENTER CONSOLE" : isLogin ? "ENTER PORTAL" : "JOIN THE CREW"}{" "}
                  <Send className="size-4" />
                </>
              )}
            </button>

            {!isAdmin && (isMockMode() || isGoogleAuthConfigured()) && (
              <>
                <div className="my-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-navy/35">
                  <span className="h-px flex-1 bg-navy/10" /> or{" "}
                  <span className="h-px flex-1 bg-navy/10" />
                </div>

                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={handleGoogleSignIn}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-md border border-navy/20 bg-white px-5 py-3.5 text-sm font-black tracking-wider text-navy transition hover:bg-navy/5 disabled:cursor-wait disabled:opacity-70"
                >
                  {googleLoading ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />{" "}
                      {isMockMode() ? "CONNECTING TO GOOGLE (DEMO)" : "CONNECTING TO GOOGLE"}
                    </>
                  ) : (
                    <>
                      <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M21.35 12.23c0-.79-.07-1.55-.2-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.93v2.44h3.14c1.84-1.7 2.92-4.2 2.92-7.4Z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 21.8c2.63 0 4.84-.87 6.45-2.35l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.55 0-4.71-1.72-5.49-4.04H3.27v2.52A9.75 9.75 0 0 0 12 21.8Z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M6.51 13.89a5.86 5.86 0 0 1 0-3.76V7.61H3.27a9.75 9.75 0 0 0 0 8.8l3.24-2.52Z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 6.09c1.43 0 2.72.49 3.74 1.45l2.8-2.8C16.83 3.18 14.63 2.2 12 2.2a9.75 9.75 0 0 0-8.73 5.41l3.24 2.52C7.29 7.81 9.45 6.09 12 6.09Z"
                        />
                      </svg>
                      CONTINUE WITH GOOGLE{isMockMode() ? " (DEMO)" : ""}
                    </>
                  )}
                </button>
                <p className="mt-2 text-center text-[11px] leading-relaxed text-navy/40">
                  {isMockMode()
                    ? "Simulated OAuth for demo purposes — signs you in as the demo player."
                    : "Use Google to create or open your player account."}
                </p>
              </>
            )}
          </form>
          {!isAdmin && (
            <p className="mt-6 text-center text-sm text-navy/65">
              {isLogin ? (
                <>
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/signup"
                    className="font-black text-coral underline-offset-4 hover:underline"
                  >
                    Sign up.
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-black text-coral underline-offset-4 hover:underline"
                  >
                    Log in.
                  </Link>
                </>
              )}
            </p>
          )}
        </section>
      </div>

      {forgotOpen && <PasswordRecoveryModal scope={scope} onClose={() => setForgotOpen(false)} />}
      {policyOpen && <SignupPolicyDialog kind={policyOpen} onClose={() => setPolicyOpen(null)} />}
      {googleProfileSetupOpen && (
        <GoogleProfileSetupModal
          onComplete={() => {
            setGoogleProfileSetupOpen(false);
            router.push("/portal");
            router.refresh();
          }}
        />
      )}
    </main>
  );
}

function GoogleProfileSetupModal({ onComplete }: { onComplete: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = username.trim();
    if (!isValidUsername(normalized)) {
      setError(USERNAME_ERROR);
      return;
    }
    if (!isValidPassword(password)) {
      setError(PASSWORD_ERROR);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/auth/profile/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalized, password }),
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || result.success === false) {
        throw new Error(result.error ?? "Unable to save your account credentials.");
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save your account credentials.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#05080d]/85 p-4 backdrop-blur-md">
      <section
        className="w-full max-w-md rounded-2xl border border-navy/15 bg-cream p-6 text-navy shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-profile-title"
      >
        <p className="text-xs font-black tracking-[.18em] text-coral">ONE LAST STEP</p>
        <h2 id="google-profile-title" className="mt-2 text-3xl font-black uppercase">
          Set up your profile
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-navy/65">
          Set a username and password for your PlayFab account. You can use these credentials to
          sign in without Google, while keeping this same account and progress.
        </p>
        <form onSubmit={submit} className="mt-6">
          <label className="form-label">
            USERNAME
            <input
              className="form-input"
              value={username}
              onChange={(event) =>
                setUsername(
                  event.target.value
                    .replace(/[^A-Za-z0-9_]/g, "")
                    .replace(/^[^A-Za-z]+/, "")
                    .slice(0, 20),
                )
              }
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z][A-Za-z0-9_]{2,19}"
              autoCapitalize="none"
              autoFocus
              required
              placeholder="jane_director"
            />
          </label>
          <label className="form-label mt-4">
            PASSWORD
            <span className="relative block">
              <input
                className="form-input pr-12"
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={64}
                pattern={PASSWORD_INPUT_PATTERN}
                title={PASSWORD_ERROR}
                autoComplete="new-password"
                required
                placeholder="8+ characters with upper/lowercase, number, and symbol"
              />
              <button
                type="button"
                onClick={() => setPasswordVisible((visible) => !visible)}
                className="absolute right-1 top-[calc(50%+4px)] grid size-10 -translate-y-1/2 place-items-center rounded text-navy/40 transition hover:bg-navy/5 hover:text-navy"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
              >
                {passwordVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
            </span>
          </label>
          <label className="form-label mt-4">
            CONFIRM PASSWORD
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
                autoComplete="new-password"
                required
                placeholder="Repeat password"
              />
              <button
                type="button"
                onClick={() => setConfirmationVisible((visible) => !visible)}
                className="absolute right-1 top-[calc(50%+4px)] grid size-10 -translate-y-1/2 place-items-center rounded text-navy/40 transition hover:bg-navy/5 hover:text-navy"
                aria-label={
                  confirmationVisible ? "Hide password confirmation" : "Show password confirmation"
                }
              >
                {confirmationVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
            </span>
          </label>
          {error && (
            <p role="alert" className="mt-3 text-sm font-bold text-coral">
              {error}
            </p>
          )}
          <button
            disabled={saving}
            type="submit"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-yellow px-5 py-3.5 text-sm font-black tracking-wider text-navy transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
          >
            {saving ? (
              <>
                <LoaderCircle className="size-4 animate-spin" /> SAVING CREDENTIALS
              </>
            ) : (
              <>
                SAVE CREDENTIALS <Send className="size-4" />
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
}

type PolicyKind = "terms" | "privacy";

function SignupPolicyDialog({ kind, onClose }: { kind: PolicyKind; onClose: () => void }) {
  const sections =
    kind === "terms"
      ? [
          {
            title: "Your account",
            body: "Provide accurate account information, keep your sign-in credentials secure, and tell us promptly if you believe someone else has accessed your account. You are responsible for activity carried out through your account.",
          },
          {
            title: "Respectful and lawful use",
            body: "Use Crew On Set in a lawful and respectful way. Do not harass or impersonate others, exploit bugs, interfere with the service, attempt unauthorized access, or submit abusive, deceptive, or unlawful content.",
          },
          {
            title: "Community content",
            body: "You remain responsible for the messages, reports, profile details, and other content you submit. You allow Crew On Set to store and display that content as needed to provide the service, review reports, and support the community.",
          },
          {
            title: "Game items and payments",
            body: "Game progress, virtual currency, and cosmetic items are for use within Crew On Set and are not cash. Any purchase price and payment conditions will be presented during checkout. Payment providers may also apply their own terms.",
          },
          {
            title: "Service and account action",
            body: "We may update or temporarily interrupt features as the service develops. We may restrict or suspend an account when needed to protect players, the service, or enforce these terms.",
          },
          {
            title: "Third-party services",
            body: "Some features rely on services such as Google sign-in, PlayFab, hosting, and payment providers. Their own terms and policies may also apply when you use those features.",
          },
        ]
      : [
          {
            title: "Information we handle",
            body: "Depending on the features you use, this may include your username, email address, Google account details shared during sign-in, profile information, game progress and activity, friends and inbox interactions, reports and attachments, and purchase or transaction records.",
          },
          {
            title: "How it is used",
            body: "We use this information to create and secure accounts, provide game and community features, restore access, process and reconcile purchases, respond to support requests, review reports, prevent abuse, and improve the service.",
          },
          {
            title: "Service providers",
            body: "Information is handled by providers that help operate the service, such as PlayFab for account and game data, Google when you choose Google sign-in, Vercel for hosting, PayMongo for checkout, and email providers for service messages. They receive information as needed to provide their services.",
          },
          {
            title: "Retention and protection",
            body: "We keep information for as long as needed to operate the service, maintain account and transaction records, address safety issues, and meet applicable obligations. We use access controls and other reasonable safeguards, though no online service can guarantee absolute security.",
          },
          {
            title: "Your choices and questions",
            body: "You can choose whether to use Google sign-in and can avoid optional profile or community features. For questions or requests about your account information, contact crewonsetgame@gmail.com.",
          },
        ];

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-policy-title"
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-navy/20 bg-cream p-5 text-navy shadow-2xl sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-md text-navy/55 transition hover:bg-navy/5 hover:text-navy"
          aria-label="Close policy"
        >
          <X className="size-5" />
        </button>
        <p className="text-xs font-black tracking-[.18em]">
          <span className="text-[var(--cos-gold)]">CREW</span>{" "}
          <span className="text-[var(--cos-gold)]">ON</span>{" "}
          <span className="text-[var(--cos-gold)]">SET</span>
        </p>
        <h2
          id="signup-policy-title"
          className="mt-2 pr-10 text-3xl font-black uppercase text-coral"
        >
          {kind === "terms" ? "Terms & Conditions" : "Privacy Policy"}
        </h2>
        <div className="mt-5 min-h-0 overflow-y-auto rounded-lg border-2 border-navy bg-cream p-4 text-sm leading-relaxed text-navy/75 shadow-[4px_4px_0_#0a0e19] sm:p-5">
          <div className="space-y-5">
            {sections.map((section) => (
              <article key={section.title}>
                <h3 className="font-black uppercase tracking-wide text-navy">{section.title}</h3>
                <p className="mt-1">{section.body}</p>
              </article>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-yellow px-5 py-3 text-sm font-black tracking-wider text-navy transition hover:brightness-95"
        >
          CLOSE
        </button>
      </section>
    </div>
  );
}
