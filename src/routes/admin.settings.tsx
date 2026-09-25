import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Crew On Set! Admin" },
      { name: "description", content: "Manage the administrator email and password." },
      { property: "og:title", content: "Settings — Crew On Set! Admin" },
      { property: "og:description", content: "Manage the administrator email and password." },
    ],
  }),
  component: SettingsPage,
});

import { FormEvent, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, Link2, Mail, Pencil, Plus, Settings as SettingsIcon, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { adminAccountStore, socialLinksStore, uid, type AdminAccount, type SocialLink } from "@/lib/demo/store";
import { EMAIL_ERROR, PASSWORD_ERROR, PASSWORD_INPUT_PATTERN, USERNAME_ERROR, isValidEmail, isValidPassword, isValidUsername } from "@/lib/validation";
import { DisplayThemeSwitcher } from "@/components/theme/display-theme-switcher";
import { PasswordRecoveryModal } from "@/components/password-recovery-modal";
import { isMockMode } from "@/lib/playfab/config";
import { QUERY_KEYS, useSession } from "@/lib/playfab/hooks";

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  error,
  passwordRules = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string | undefined;
  error?: string | undefined;
  passwordRules?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="form-label !text-white/60">
      {label}
      <span className="relative mt-2 block">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={passwordRules ? 8 : undefined}
          maxLength={passwordRules ? 64 : undefined}
          pattern={passwordRules ? PASSWORD_INPUT_PATTERN : undefined}
          title={passwordRules ? PASSWORD_ERROR : undefined}
          className={`w-full rounded-md border bg-[#101923] px-3 py-2.5 pr-11 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 ${
            error ? "border-coral" : "border-white/10 focus:border-coral"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-white/40 transition hover:bg-white/5 hover:text-white"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </button>
      </span>
      {error && <span className="mt-1.5 block text-[11px] font-bold normal-case tracking-normal text-coral">{error}</span>}
    </label>
  );
}

function SocialLinksSection() {
  const [links, setLinks] = socialLinksStore.useStore();
  const [platform, setPlatform] = useState("");
  const [url, setUrl] = useState("");

  const [editing, setEditing] = useState<SocialLink | null>(null);
  const [editPlatform, setEditPlatform] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<SocialLink | null>(null);

  function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!platform.trim() || !url.trim()) return;

    setLinks([
      ...links,
      { id: uid("soc"), platform: platform.trim(), url: url.trim(), active: true },
    ]);
    setPlatform("");
    setUrl("");
    toast.success("Social link added.");
  }

  function toggleActive(id: string) {
    setLinks(links.map((link) => (link.id === id ? { ...link, active: !link.active } : link)));
  }

  function openEdit(link: SocialLink) {
    setEditing(link);
    setEditPlatform(link.platform);
    setEditUrl(link.url);
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    if (!editPlatform.trim() || !editUrl.trim()) return;

    setLinks(
      links.map((link) =>
        link.id === editing.id ? { ...link, platform: editPlatform.trim(), url: editUrl.trim() } : link
      )
    );
    setEditing(null);
    toast.success("Social link updated.");
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setLinks(links.filter((link) => link.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success("Social link removed.");
  }

  return (
    <section className="mt-6 rounded-lg border border-white/[0.06] bg-[#182330] p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-md bg-[#2d9d8f] text-white">
          <Link2 className="size-4.5" />
        </div>
        <div>
          <h2 className="font-black uppercase !text-white">Social Links</h2>
          <p className="text-xs !text-white/35">Drives the icons shown in the public site footer.</p>
        </div>
      </div>

      <form onSubmit={addLink} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
        <label className="form-label !text-white/60">
          PLATFORM
          <input
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="e.g. Facebook, Instagram, TikTok"
            className="mt-2 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
          />
        </label>
        <label className="form-label !text-white/60">
          URL
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
            placeholder="https://..."
            className="mt-2 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-fit items-center gap-2 rounded-md bg-coral px-4 py-2.5 text-sm font-black uppercase text-white transition hover:bg-coral-dark"
        >
          <Plus className="size-4" />
          Add Link
        </button>
      </form>

      <div className="admin-table-wrap mt-6 overflow-hidden rounded-lg border border-white/[0.06]">
        <div className="admin-table-wrap overflow-x-auto">
          <table className="admin-table w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#141e29]">
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">Platform</th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">URL</th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">Active</th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-b border-white/[0.05] transition hover:bg-white/[0.025] last:border-0">
                  <td className="px-5 py-4 font-black !text-white">{link.platform}</td>
                  <td className="max-w-[280px] truncate px-5 py-4 text-sm !text-white/50">{link.url}</td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => toggleActive(link.id)}
                      className={`rounded px-2.5 py-1 text-[10px] font-black uppercase transition ${
                        link.active
                          ? "bg-[#2d9d8f]/15 text-[#4bc4b4] hover:bg-[#2d9d8f]/25"
                          : "bg-white/[0.06] !text-white/35 hover:bg-white/10"
                      }`}
                    >
                      {link.active ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(link)}
                        aria-label={`Edit ${link.platform}`}
                        className="grid size-8 place-items-center rounded-md border border-white/10 !text-white/50 transition hover:border-coral hover:text-white"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(link)}
                        aria-label={`Delete ${link.platform}`}
                        className="grid size-8 place-items-center rounded-md border border-coral/25 text-coral transition hover:bg-coral hover:text-white"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {links.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm !text-white/35">
                    No social links yet. Add one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setEditing(null)}
        >
          <form
            onSubmit={saveEdit}
            className="w-full max-w-sm rounded-xl border border-white/10 bg-[#182330] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black uppercase !text-white">Edit Social Link</h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-md !text-white/40 transition hover:bg-white/5 hover:!text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="form-label !text-white/60">
                PLATFORM
                <input
                  value={editPlatform}
                  onChange={(e) => setEditPlatform(e.target.value)}
                  required
                  className="mt-2 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold !text-white outline-none focus:border-coral"
                />
              </label>
              <label className="form-label !text-white/60">
                URL
                <input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  type="url"
                  required
                  className="mt-2 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold !text-white outline-none focus:border-coral"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-black uppercase !text-white/50 transition hover:!text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-coral px-4 py-2.5 text-xs font-black uppercase text-white transition hover:bg-coral-dark"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-xl border border-coral/40 bg-[#182330] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-black uppercase !text-white">Remove this link?</h2>
            <p className="mt-2 text-sm !text-white/45">
              “{deleteTarget.platform}” will be removed from the public site footer immediately.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-black uppercase !text-white/50 transition hover:!text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-md bg-coral px-4 py-2.5 text-xs font-black uppercase text-white transition hover:bg-coral-dark"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SettingsPage() {
  const mockMode = isMockMode();
  const sessionQuery = useSession();
  const queryClient = useQueryClient();
  const [account, setAccount] = adminAccountStore.useStore();
  const admin: AdminAccount = mockMode
    ? account[0] ?? {
        name: "Administrator",
        email: "admin@crew-on-set.game",
        password: "admin",
      }
    : {
        name: sessionQuery.data?.displayName || sessionQuery.data?.username || "Administrator",
        email: sessionQuery.data?.email || "",
        password: "",
      };

  const [email, setEmail] = useState(mockMode ? account[0]?.email ?? "" : sessionQuery.data?.email ?? "");
  const [username, setUsername] = useState(mockMode ? account[0]?.name ?? "" : sessionQuery.data?.displayName ?? sessionQuery.data?.username ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [usernameConfirmOpen, setUsernameConfirmOpen] = useState(false);
  const [usernameConfirmPassword, setUsernameConfirmPassword] = useState("");
  const [usernameConfirmError, setUsernameConfirmError] = useState("");
  const [pendingUsername, setPendingUsername] = useState("");
  const [emailChangeDemoLink, setEmailChangeDemoLink] = useState("");
  const [emailChangeToken, setEmailChangeToken] = useState("");
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  const [emailChangeDraft, setEmailChangeDraft] = useState("");
  const [emailChangeError, setEmailChangeError] = useState("");
  const [emailChangeSaving, setEmailChangeSaving] = useState(false);
  const handledEmailChangeLink = useRef("");

  useEffect(() => {
    if (!mockMode && sessionQuery.data?.email) setEmail(sessionQuery.data.email);
    if (!mockMode && (sessionQuery.data?.displayName || sessionQuery.data?.username)) setUsername(sessionQuery.data.displayName || sessionQuery.data.username || "");
  }, [mockMode, sessionQuery.data?.email, sessionQuery.data?.displayName, sessionQuery.data?.username]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("emailChangeToken") ?? "";
    if (!token || handledEmailChangeLink.current === token) return;
    handledEmailChangeLink.current = token;
    url.searchParams.delete("emailChangeToken");
    window.history.replaceState({}, "", url.toString());
    void openEmailChangeLink(token);
  }, []);

  async function saveUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedUsername = username.trim();
    if (!isValidUsername(normalizedUsername)) {
      toast.error(USERNAME_ERROR);
      return;
    }
    if (normalizedUsername.toLowerCase() === admin.name.trim().toLowerCase()) {
      toast.success("Username is already up to date.");
      return;
    }
    setPendingUsername(normalizedUsername);
    setUsernameConfirmPassword("");
    setUsernameConfirmError("");
    setUsernameConfirmOpen(true);
  }

  async function confirmUsernameChange() {
    if (!usernameConfirmPassword) {
      setUsernameConfirmError("Enter your current password.");
      return;
    }
    const response = await fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: pendingUsername, currentPassword: usernameConfirmPassword }),
    });
    const result = (await response.json().catch(() => ({}))) as { success?: boolean; username?: string; error?: string };
    if (!response.ok || result.success === false) {
      setUsernameConfirmError(result.error || "The current password was rejected or the username is already in use.");
      return;
    }
    const updatedUsername = result.username || pendingUsername;
    if (mockMode) setAccount([{ ...admin, name: updatedUsername }]);
    setUsername(updatedUsername);
    setUsernameConfirmOpen(false);
    setUsernameConfirmPassword("");
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });
    toast.success("Username updated.");
  }

  async function requestEmailChange() {
    setEmailChangeDemoLink("");
    try {
      const response = await fetch("/api/auth/email-change/request", { method: "POST" });
      const result = await response.json().catch(() => ({})) as { success?: boolean; error?: string; message?: string; verificationUrl?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? "Unable to send an email-change link.");
      if (result.verificationUrl) setEmailChangeDemoLink(result.verificationUrl);
      toast.success(result.message ?? "Check your current email for a secure change link.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send an email-change link.");
    }
  }

  async function openEmailChangeLink(token: string) {
    try {
      const response = await fetch("/api/auth/email-change/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json().catch(() => ({})) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? "This email-change link is invalid or expired.");
      setEmailChangeToken(token);
      setEmailChangeDraft("");
      setEmailChangeError("");
      setEmailChangeOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to verify this email-change link.");
    }
  }

  async function completeEmailChange() {
    const nextEmail = emailChangeDraft.trim().toLowerCase();
    if (!isValidEmail(nextEmail)) {
      setEmailChangeError(EMAIL_ERROR);
      return;
    }
    setEmailChangeSaving(true);
    setEmailChangeError("");
    try {
      const response = await fetch("/api/auth/email-change/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: emailChangeToken, email: nextEmail }),
      });
      const result = await response.json().catch(() => ({})) as { success?: boolean; email?: string; error?: string; message?: string };
      if (!response.ok || !result.success) throw new Error(result.error ?? "Unable to update the administrator email.");
      const updatedEmail = result.email ?? nextEmail;
      if (mockMode) setAccount([{ ...admin, email: updatedEmail }]);
      setEmail(updatedEmail);
      setEmailChangeOpen(false);
      setEmailChangeDemoLink("");
      setEmailChangeToken("");
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });
      toast.success(result.message ?? "Email updated.");
    } catch (error) {
      setEmailChangeError(error instanceof Error ? error.message : "Unable to update the administrator email.");
    } finally {
      setEmailChangeSaving(false);
    }
  }
  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: { current?: string; next?: string; confirm?: string } = {};

    if (mockMode && currentPassword !== admin.password) {
      errors.current = "Current password is incorrect.";
    }
    if (!isValidPassword(newPassword)) {
      errors.next = PASSWORD_ERROR;
    }
    if (newPassword !== confirmPassword) {
      errors.confirm = "Passwords do not match.";
    }

    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const response = await fetch("/api/auth/password/change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const result = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string; recoveryRequired?: boolean; message?: string };
    if (!response.ok || result.success === false) {
      setPasswordErrors({ current: result.error ?? "Unable to update your password." });
      return;
    }

    if (mockMode) setAccount([{ ...admin, password: newPassword }]);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    if (result.recoveryRequired) {
      toast.success(result.message ?? "Follow the secure reset link sent to your email to finish changing your password.");
      return;
    }
    toast.success("Password updated.");
  }

  return (
  <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
  <header className="mb-8">
        <h1 className="admin-heading !text-white">Settings</h1>
        <p className="admin-kicker !text-white/45">Manage your administrator username, email, and password.</p>
      </header>

      <div className="mb-6 rounded-lg border border-white/[0.06] bg-[#182330] p-5"><DisplayThemeSwitcher admin /></div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* USERNAME */}
        <section className="rounded-lg border border-white/[0.06] bg-[#182330] p-6 shadow-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-[#d9a514] text-[#101923]">
              <Pencil className="size-4.5" />
            </div>
            <div>
              <h2 className="font-black uppercase !text-white">Username</h2>
              <p className="text-xs !text-white/35">Used to sign in to the admin portal.</p>
            </div>
          </div>
          <form onSubmit={saveUsername} className="grid gap-4">
            <label className="form-label !text-white/60">
              USERNAME
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value.replace(/[^A-Za-z0-9_]/g, '').replace(/^[^A-Za-z]+/, '').slice(0, 20))}
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z][A-Za-z0-9_]{2,19}"
                title={USERNAME_ERROR}
                autoCapitalize="none"
                required
                className="mt-2 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold !text-white outline-none transition focus:border-coral"
              />
            </label>
            <button type="submit" className="w-fit rounded-md bg-[#d9a514] px-5 py-2.5 text-sm font-black uppercase text-[#101923] transition hover:bg-[#e6b62b]">Save Username</button>
          </form>
        </section>

        {/* EMAIL */}
        <section className="rounded-lg border border-white/[0.06] bg-[#182330] p-6 shadow-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-coral text-white">
              <Mail className="size-4.5" />
            </div>
            <div>
              <h2 className="font-black uppercase !text-white">Email Address</h2>
              <p className="text-xs !text-white/35">Used to sign in to the admin portal.</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="form-label !text-white/60">EMAIL<p className="mt-2 rounded-md border border-white/10 bg-[#101923] px-3 py-3 text-sm font-bold !text-white">{email || "No email on file"}</p></div>
            <button type="button" onClick={() => void requestEmailChange()} className="w-fit rounded-md bg-coral px-5 py-2.5 text-sm font-black uppercase text-white transition hover:bg-coral-dark">Request Email Change</button>
            {emailChangeDemoLink && <p className="text-xs text-white/50">Demo verification is ready. <a href={emailChangeDemoLink} onClick={(event) => { event.preventDefault(); const token = new URL(emailChangeDemoLink).searchParams.get("emailChangeToken") ?? ""; void openEmailChangeLink(token); }} className="font-black text-coral underline">Open demo email link</a></p>}
          </div>
        </section>

        {/* PASSWORD */}
        <section className="rounded-lg border border-white/[0.06] bg-[#182330] p-6 shadow-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-[#d9a514] text-[#101923]">
              <KeyRound className="size-4.5" />
            </div>
            <div>
              <h2 className="font-black uppercase !text-white">Password</h2>
              <p className="text-xs !text-white/35">Confirm your current password to set a new one.</p>
            </div>
          </div>

          <form onSubmit={savePassword} className="grid gap-4">
            <PasswordField
              label="CURRENT PASSWORD"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              error={passwordErrors.current}
            />
            <PasswordField
              label="NEW PASSWORD"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              error={passwordErrors.next}
              passwordRules
            />
            <PasswordField
              label="CONFIRM NEW PASSWORD"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              error={passwordErrors.confirm}
              passwordRules
            />

            <button
              type="submit"
              className="w-fit rounded-md bg-[#d9a514] px-5 py-2.5 text-sm font-black uppercase text-[#101923] transition hover:bg-[#e6b62b]"
            >
              Update Password
            </button>
            <button
              type="button"
              onClick={() => setRecoveryOpen(true)}
              className="w-fit text-left text-xs font-black uppercase tracking-wide text-coral hover:underline"
            >
              Forgot password?
            </button>
          </form>
        </section>
      </div>

      {usernameConfirmOpen && (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <section className="w-full max-w-md rounded-xl border border-white/10 bg-[#182330] p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">ACCOUNT SECURITY</p>
                <h2 className="mt-2 text-xl font-black uppercase">Confirm Username Change</h2>
              </div>
              <button type="button" onClick={() => setUsernameConfirmOpen(false)} aria-label="Close" className="grid size-8 place-items-center rounded-md text-white/40 hover:text-white"><X className="size-4" /></button>
            </div>
            <p className="mt-4 text-sm text-white/55">Enter your current password before we update the administrator username.</p>
            {usernameConfirmError && <p className="mt-4 rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-xs font-bold text-coral">{usernameConfirmError}</p>}
            <input
              type="password"
              value={usernameConfirmPassword}
              onChange={(event) => setUsernameConfirmPassword(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") void confirmUsernameChange(); }}
              autoComplete="current-password"
              placeholder="Current password"
              className="mt-4 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-coral"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setUsernameConfirmOpen(false)} className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-black uppercase text-white/50 hover:text-white">Cancel</button>
              <button type="button" onClick={() => void confirmUsernameChange()} className="rounded-md bg-coral px-5 py-2.5 text-xs font-black uppercase text-white hover:bg-coral-dark">Confirm</button>
            </div>
          </section>
        </div>
      )}

      {emailChangeOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <section className="w-full max-w-md rounded-xl border border-white/10 bg-[#182330] p-6 text-white shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">ACCOUNT SECURITY</p>
            <h2 className="mt-2 text-xl font-black uppercase">Enter New Email</h2>
            <p className="mt-4 text-sm text-white/55">This link expires in 30 minutes. The new address will become your admin sign-in email.</p>
            {emailChangeError && <p className="mt-4 rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-xs font-bold text-coral">{emailChangeError}</p>}
            <input type="email" value={emailChangeDraft} onChange={(event) => setEmailChangeDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void completeEmailChange(); }} autoComplete="email" placeholder="New email address" className="mt-4 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-coral" autoFocus />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEmailChangeOpen(false)} className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-black uppercase text-white/50 hover:text-white">Cancel</button>
              <button type="button" disabled={emailChangeSaving} onClick={() => void completeEmailChange()} className="rounded-md bg-coral px-5 py-2.5 text-xs font-black uppercase text-white hover:bg-coral-dark disabled:opacity-60">{emailChangeSaving ? "SAVING…" : "SAVE NEW EMAIL"}</button>
            </div>
          </section>
        </div>
      )}

      {recoveryOpen && <PasswordRecoveryModal scope="admin" onClose={() => setRecoveryOpen(false)} />}

      <SocialLinksSection />

      <p className="mt-6 flex items-center gap-2 text-xs !text-white/30">
        <SettingsIcon className="size-3.5" />
        Demo mode only: changes are stored locally and reset if browser storage is cleared.
      </p>
    </div>
  );
}
