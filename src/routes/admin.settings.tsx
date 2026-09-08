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

import { FormEvent, useState } from "react";
import { Eye, EyeOff, KeyRound, Link2, Mail, Pencil, Plus, Settings as SettingsIcon, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { adminAccountStore, socialLinksStore, uid, type AdminAccount, type SocialLink } from "@/lib/demo/store";
import { EMAIL_ERROR, isValidEmail } from "@/lib/validation";
import { DisplayThemeSwitcher } from "@/components/theme/display-theme-switcher";

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string | undefined;
  error?: string | undefined;
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
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
  const [account, setAccount] = adminAccountStore.useStore();
  const admin: AdminAccount = account[0] ?? {
    name: "Administrator",
    email: "admin@crew-on-set.game",
    password: "admin",
  };

  const [email, setEmail] = useState(account[0]?.email ?? "");
  const [emailError, setEmailError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});

  function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError("");

    if (!isValidEmail(email)) {
      setEmailError(EMAIL_ERROR);
      return;
    }

    setAccount([{ ...admin, email: email.trim() }]);
    toast.success("Email updated.");
  }

  function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors: { current?: string; next?: string; confirm?: string } = {};

    if (currentPassword !== admin.password) {
      errors.current = "Current password is incorrect.";
    }
    if (newPassword.length < 6) {
      errors.next = "New password must be at least 6 characters.";
    }
    if (newPassword !== confirmPassword) {
      errors.confirm = "Passwords do not match.";
    }

    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAccount([{ ...admin, password: newPassword }]);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated.");
  }

  return (
  <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
  <header className="mb-8">
        <p className="text-xs font-black tracking-[.18em] !text-coral">ACCOUNT</p>
        <h1 className="admin-heading mt-2 !text-white">Settings</h1>
        <p className="admin-kicker !text-white/45">Manage your administrator email and password.</p>
      </header>

      <div className="mb-6 rounded-lg border border-white/[0.06] bg-[#182330] p-5"><DisplayThemeSwitcher admin /></div>

      <div className="grid gap-6 lg:grid-cols-2">
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

          <form onSubmit={saveEmail} className="grid gap-4">
            <label className="form-label !text-white/60">
              EMAIL
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`mt-2 w-full rounded-md border bg-[#101923] px-3 py-2.5 text-sm font-bold !text-white outline-none transition ${
                  emailError ? "border-coral" : "border-white/10 focus:border-coral"
                }`}
              />
              {emailError && <span className="mt-1.5 block text-[11px] font-bold normal-case tracking-normal text-coral">{emailError}</span>}
            </label>

            <button
              type="submit"
              className="w-fit rounded-md bg-coral px-5 py-2.5 text-sm font-black uppercase text-white transition hover:bg-coral-dark"
            >
              Save Email
            </button>
          </form>
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
            />
            <PasswordField
              label="CONFIRM NEW PASSWORD"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              error={passwordErrors.confirm}
            />

            <button
              type="submit"
              className="w-fit rounded-md bg-[#d9a514] px-5 py-2.5 text-sm font-black uppercase text-[#101923] transition hover:bg-[#e6b62b]"
            >
              Update Password
            </button>
          </form>
        </section>
      </div>

      <SocialLinksSection />

      <p className="mt-6 flex items-center gap-2 text-xs !text-white/30">
        <SettingsIcon className="size-3.5" />
        Demo mode only: changes are stored locally and reset if browser storage is cleared.
      </p>
    </div>
  );
}
