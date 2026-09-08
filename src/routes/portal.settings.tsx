import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Crew On Set!" },
      { name: "description", content: "Manage your account details and gameplay preferences." },
      { property: "og:title", content: "Settings — Crew On Set!" },
      {
        property: "og:description",
        content: "Manage your account details and gameplay preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

import Image from "@/components/next-compat/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Bell,
  Bug,
  Check,
  Eye,
  EyeOff,
  Flag,
  LoaderCircle,
  Lock,
  Monitor,
  Paperclip,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import { EMAIL_ERROR, USERNAME_ERROR, PASSWORD_ERROR, isValidEmail, isValidPassword, isValidUsername } from "@/lib/validation";
import { DisplayThemeSwitcher } from "@/components/theme/display-theme-switcher";
import {
  bugCategories,
  adminNotificationsStore,
  bugReportsStore,
  insertSharedRecord,
  playerReportsStore,
  playerReportTypes,
  uid,
  readAttachmentAsDataUrl,
} from "@/lib/demo/store";

/** Accepted attachment MIME types for reports: images and PDF only. */
const ACCEPTED_ATTACHMENT_TYPES = ["image/", "application/pdf"];
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/** Validates that a file is an image or PDF (ZIP and everything else rejected). */
function isAllowedAttachment(file: File): boolean {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const allowedExtension = ["jpg", "jpeg", "png", "webp", "gif", "pdf"].includes(extension);
  const isPdf = extension === "pdf" || file.type === "application/pdf";
  const isImage = file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(extension);
  return allowedExtension && (isImage || isPdf) && file.size <= MAX_ATTACHMENT_BYTES;
}

/** Demo player identity used for player-submitted bug reports. */
const BUG_REPORT_PLAYER_NAME = "CAMERA_PRO";
const BUG_REPORT_PLAYER_ID = "COS-2847-CP";

/** Fixed demo password used to confirm sensitive account actions. */
const DEMO_PASSWORD = "player";

const sections = [
  { name: "Account", icon: UserCircle },
  { name: "Profile", icon: UserCircle },
  { name: "Display", icon: Monitor },
  { name: "Privacy", icon: Shield },
  { name: "Notifications", icon: Bell },
  { name: "Support", icon: Bug },
];

type AccountData = {
  username: string;
  email: string;
  displayName: string;
  avatar: string;
};

type Preferences = {
  profileVisibility: boolean;
  showCrewActivity: boolean;
  showCareerInfo: boolean;
  productionUpdates: boolean;
  friendRequests: boolean;
  crewInvites: boolean;
  emailNotifications: boolean;
  compactMode: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
};

const defaultAccount: AccountData = {
  username: "CAMERA_PRO",
  email: "player@gmail.com",
  displayName: "Camera Pro",
  avatar: "/assets/hero-key-art.png",
};

const defaultPreferences: Preferences = {
  profileVisibility: true,
  showCrewActivity: true,
  showCareerInfo: true,
  productionUpdates: true,
  friendRequests: true,
  crewInvites: true,
  emailNotifications: false,
  compactMode: false,
  reduceMotion: false,
  highContrast: false,
  largeText: false,
};

function SettingsPage() {
  const [section, setSection] = useState("Account");

  const [account, setAccount] = useState<AccountData>(defaultAccount);

  const [savedAccount, setSavedAccount] = useState<AccountData>(defaultAccount);

  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);

  const [savedPreferences, setSavedPreferences] = useState<Preferences>(defaultPreferences);

  const [editing, setEditing] = useState<string | null>(null);

  const [draftValue, setDraftValue] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordError, setPasswordError] = useState("");

  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [deleteText, setDeleteText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [bugCategory, setBugCategory] = useState("");
  const [bugEmail, setBugEmail] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [bugAttachment, setBugAttachment] = useState<File | null>(null);
  const [bugError, setBugError] = useState("");
  const [bugWarning, setBugWarning] = useState("");
  const [bugSubmitted, setBugSubmitted] = useState(false);
  const bugAttachmentInput = useRef<HTMLInputElement>(null);

  const [playerReportOpen, setPlayerReportOpen] = useState(false);
  const [playerReportType, setPlayerReportType] = useState("");
  const [playerReportUsername, setPlayerReportUsername] = useState("");
  const [playerReportDescription, setPlayerReportDescription] = useState("");
  const [playerReportAttachment, setPlayerReportAttachment] = useState<File | null>(null);
  const [playerReportError, setPlayerReportError] = useState("");
  const [playerReportSubmitted, setPlayerReportSubmitted] = useState(false);
  const playerReportAttachmentInput = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const [loaded, setLoaded] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);

  /* =========================================================
     LOAD SAVED SETTINGS
  ========================================================= */

  useEffect(() => {
    try {
      const storedAccount = localStorage.getItem("player-account");

      const storedPreferences = localStorage.getItem("player-preferences");

      const loadedAccount = storedAccount
        ? {
            ...defaultAccount,
            ...JSON.parse(storedAccount),
          }
        : defaultAccount;

      const loadedPreferences = storedPreferences
        ? {
            ...defaultPreferences,
            ...JSON.parse(storedPreferences),
          }
        : defaultPreferences;

      setAccount(loadedAccount);
      setSavedAccount(loadedAccount);

      setPreferences(loadedPreferences);
      setSavedPreferences(loadedPreferences);
    } catch {
      console.error("Unable to load player settings.");
    } finally {
      setLoaded(true);
    }
  }, []);

  /* =========================================================
     UNSAVED CHANGES
  ========================================================= */

  const hasUnsavedChanges =
    JSON.stringify(account) !== JSON.stringify(savedAccount) ||
    JSON.stringify(preferences) !== JSON.stringify(savedPreferences);

  /* =========================================================
     MESSAGE
  ========================================================= */

  const showMessage = (text: string, type: "success" | "error" = "success") => {
    setMessage(text);
    setMessageType(type);

    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const saveChanges = () => {
    try {
      localStorage.setItem("player-account", JSON.stringify(account));

      localStorage.setItem("player-preferences", JSON.stringify(preferences));

      setSavedAccount(account);
      setSavedPreferences(preferences);

      setEditing(null);
      setDraftValue("");

      showMessage("Your settings have been saved.");
    } catch {
      showMessage("Unable to save your settings.", "error");
    }
  };

  /* =========================================================
     DISCARD
  ========================================================= */

  const discardChanges = () => {
    setAccount(savedAccount);
    setPreferences(savedPreferences);

    setEditing(null);
    setDraftValue("");

    showMessage("Unsaved changes were discarded.");
  };

  /* =========================================================
     EDIT ACCOUNT FIELD
  ========================================================= */

  const startEditing = (field: "Username" | "Email" | "Display Name", value: string) => {
    setEditing(field);
    setDraftValue(value);
  };

  /* =========================================================
     SAVE ACCOUNT FIELD
  ========================================================= */

  const saveAccountField = (field: "Username" | "Email" | "Display Name") => {
    const value = draftValue.trim();

    if (!value) {
      showMessage(`${field} cannot be empty.`, "error");
      return;
    }

    if (field === "Email" && !isValidEmail(draftValue)) {
      showMessage(EMAIL_ERROR, "error");
      return;
    }

    if (field === "Username" && !isValidUsername(value)) {
      showMessage(USERNAME_ERROR, "error");
      return;
    }

    if (field === "Username") {
      setAccount((prev) => ({
        ...prev,
        username: value.toUpperCase(),
      }));
    }

    if (field === "Email") {
      setAccount((prev) => ({
        ...prev,
        email: value,
      }));
    }

    if (field === "Display Name") {
      setAccount((prev) => ({
        ...prev,
        displayName: value,
      }));
    }

    setEditing(null);
    setDraftValue("");
  };

  /* =========================================================
     AVATAR
  ========================================================= */

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      showMessage("Please select a JPG or PNG image.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("Avatar must be smaller than 5 MB.", "error");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        showMessage("Unable to load the selected image.", "error");
        return;
      }

      setAccount((prev) => ({
        ...prev,
        avatar: result,
      }));
    };

    reader.onerror = () => {
      showMessage("Unable to load the selected image.", "error");
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  };

  /* =========================================================
     PASSWORD
  ========================================================= */

  const handlePasswordChange = () => {
    setPasswordError("");
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please complete all password fields.");
      return;
    }

    if (!isValidPassword(newPassword)) {
      setPasswordError(PASSWORD_ERROR);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (currentPassword !== DEMO_PASSWORD) {
      setPasswordError("Current password is incorrect.");
      return;
    }

    // The demo auth service owns password changes; never persist passwords in browser storage.
    setPasswordSuccess(true);

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    window.setTimeout(() => {
      setPasswordOpen(false);
      setPasswordSuccess(false);
    }, 1200);
  };

  /* =========================================================
     DELETE ACCOUNT
  ========================================================= */

  const handleDeleteAccount = () => {
    setDeleteError("");

    if (deleteText !== "DELETE") {
      setDeleteError("Type DELETE to confirm.");
      return;
    }

    if (deletePassword !== DEMO_PASSWORD) {
      setDeleteError('Incorrect password. This is a demo — try "player".');
      return;
    }

    localStorage.removeItem("player-account");

    localStorage.removeItem("player-preferences");

    localStorage.removeItem("player-password");

    setAccount(defaultAccount);
    setSavedAccount(defaultAccount);

    setPreferences(defaultPreferences);
    setSavedPreferences(defaultPreferences);

    setDeleteOpen(false);
    setDeleteText("");
    setDeletePassword("");

    showMessage("Your player account data has been cleared.");
  };

  /* =========================================================
     BUG REPORT
  ========================================================= */

  const openBugReport = () => {
    setBugCategory("");
    setBugEmail("");
    setBugDescription("");
  setBugAttachment(null);
  setBugError("");
  setBugWarning("");
  setBugSubmitted(false);
    setBugReportOpen(true);
  };

  const closeBugReport = () => {
    setBugReportOpen(false);
    setBugCategory("");
    setBugEmail("");
    setBugDescription("");
  setBugAttachment(null);
  setBugError("");
  setBugWarning("");
  setBugSubmitted(false);
  };

  const handleBugAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setBugAttachment(null);
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setBugError("Attachments must be 5 MB or smaller.");
      setBugAttachment(null);
      event.target.value = "";
      return;
    }
    if (!isAllowedAttachment(file)) {
      setBugError("Only image or PDF files are allowed.");
      setBugAttachment(null);
      event.target.value = "";
      return;
    }
    setBugError("");
    setBugAttachment(file);
  };

  const submitBugReport = async () => {
    setBugError("");

    if (!bugCategory.trim()) {
      setBugError("Please choose a bug category.");
      return;
    }

    if (!isValidEmail(bugEmail)) {
      setBugError(EMAIL_ERROR);
      return;
    }

    if (!bugDescription.trim()) {
      setBugError("Please describe the bug.");
      return;
    }

    if (bugAttachment && !isAllowedAttachment(bugAttachment)) {
      setBugError("Only image or PDF files are allowed.");
      return;
    }

    setBugWarning("");
    let attachmentUrl = "";
    if (bugAttachment) {
      try {
        attachmentUrl = await readAttachmentAsDataUrl(bugAttachment, "bug-reports");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[v0] Bug report attachment upload failed; submitting without attachment: ${message}`);
        setBugWarning("The attachment could not be uploaded, but your bug report will still be submitted.");
      }
    }

    const bugReport = {
      id: uid("BUG"),
      playerName: BUG_REPORT_PLAYER_NAME,
      playerId: BUG_REPORT_PLAYER_ID,
      category: bugCategory,
      description: bugDescription.trim(),
      email: bugEmail.trim(),
      ...(bugAttachment?.name ? { attachmentName: bugAttachment.name } : {}),
      ...(attachmentUrl ? { attachmentUrl } : {}),
      ...(bugAttachment?.type ? { attachmentType: bugAttachment.type } : {}),
      submittedAt: new Date().toISOString(),
      status: "New" as const,
    };
    let insertError = "";
    if (!(await insertSharedRecord("cos.bugReports", bugReport, (message) => { insertError = message; }))) {
      setBugError(insertError || "We could not submit your bug report. Please try again.");
      return;
    }
    bugReportsStore.set((current) => [bugReport, ...current.filter((item) => item.id !== bugReport.id)]);
    setBugCategory("");
    setBugEmail("");
    setBugDescription("");
    setBugAttachment(null);
    setBugSubmitted(true);
  };

  const submitPlayerReport = async () => {
    setPlayerReportError("");
    if (!playerReportType.trim()) {
      setPlayerReportError("Please choose a report type.");
      return;
    }
    if (!playerReportUsername.trim()) {
      setPlayerReportError("Please enter the username of the player you are reporting.");
      return;
    }
    if (!playerReportDescription.trim()) {
      setPlayerReportError("Please describe the issue.");
      return;
    }
    if (playerReportAttachment && !isAllowedAttachment(playerReportAttachment)) {
      setPlayerReportError("Only image or PDF files are allowed.");
      return;
    }
    let playerAttachmentUrl = "";
    if (playerReportAttachment) {
      try {
        playerAttachmentUrl = await readAttachmentAsDataUrl(playerReportAttachment, "player-reports");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setPlayerReportError(`Attachment upload failed: ${message}`);
        return;
      }
    }
    const reportId = uid("PRPT");
    const submittedAt = new Date().toISOString();
    const playerReport = {
      id: reportId,
      reporterName: BUG_REPORT_PLAYER_NAME,
      reporterId: BUG_REPORT_PLAYER_ID,
      reportType: playerReportType,
      description: playerReportDescription.trim(),
      reportedUsername: playerReportUsername.trim(),
      ...(playerReportAttachment?.name ? { attachmentName: playerReportAttachment.name } : {}),
      ...(playerAttachmentUrl ? { attachmentUrl: playerAttachmentUrl } : {}),
      ...(playerReportAttachment?.type ? { attachmentType: playerReportAttachment.type } : {}),
      submittedAt,
      status: "New" as const,
    };
    if (!(await insertSharedRecord("cos.playerReports", playerReport))) {
      setPlayerReportError("We could not submit your report. Please try again.");
      return;
    }
    playerReportsStore.set((current) => [playerReport, ...current.filter((item) => item.id !== playerReport.id)]);
    adminNotificationsStore.set([
      ...adminNotificationsStore.get(),
      { id: `player-report-${reportId}`, title: "New player report submitted", body: `${reportId}: ${BUG_REPORT_PLAYER_NAME} reported ${playerReportUsername.trim()}.`, kind: "player-report", href: "/admin/player-reports", entityId: reportId, entityType: "player-report", read: false, createdAt: submittedAt },
    ]);
    setPlayerReportType("");
    setPlayerReportUsername("");
    setPlayerReportDescription("");
    setPlayerReportAttachment(null);
    setPlayerReportSubmitted(true);
  };

  const openPlayerReport = () => {
    setPlayerReportType("");
    setPlayerReportUsername("");
    setPlayerReportDescription("");
    setPlayerReportAttachment(null);
    setPlayerReportError("");
    setPlayerReportSubmitted(false);
    setPlayerReportOpen(true);
  };

  const closePlayerReport = () => {
    setPlayerReportOpen(false);
    setPlayerReportType("");
    setPlayerReportUsername("");
    setPlayerReportDescription("");
    setPlayerReportAttachment(null);
    setPlayerReportError("");
    setPlayerReportSubmitted(false);
  };

  const handlePlayerReportAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPlayerReportAttachment(null);
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setPlayerReportError("Attachments must be 5 MB or smaller.");
      setPlayerReportAttachment(null);
      event.target.value = "";
      return;
    }
    if (!isAllowedAttachment(file)) {
      setPlayerReportError("Only image or PDF files are allowed.");
      setPlayerReportAttachment(null);
      event.target.value = "";
      return;
    }
    setPlayerReportError("");
    setPlayerReportAttachment(file);
  };

  /* =========================================================
     DEACTIVATE ACCOUNT (SIMULATED)
  ========================================================= */

  /* =========================================================
     TOGGLE
  ========================================================= */

  const togglePreference = (key: keyof Preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  /* =========================================================
     ACCOUNT ROWS
  ========================================================= */

  const accountRows = [
    {
      label: "Username",
      value: account.username,
      key: "Username" as const,
    },
    {
      label: "Email",
      value: account.email,
      key: "Email" as const,
    },
    {
      label: "Display Name",
      value: account.displayName,
      key: "Display Name" as const,
    },
  ];

  /* =========================================================
     LOADING
  ========================================================= */

  if (!loaded) {
    return (
      <div className="grid min-h-[400px] place-items-center bg-[#0d121c]">
        <LoaderCircle className="size-7 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d121c] px-4 pb-20 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1450px] pt-8 sm:pt-10">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-coral">
              ACCOUNT CONTROL
            </p>

            <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
              Settings
            </h1>
          </div>

          {/* SAVE / DISCARD */}

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={discardChanges}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-[#151c29] px-4 py-2.5 text-xs font-black text-white/60 transition hover:border-white/20 hover:bg-[#1b2433] hover:text-white"
              >
                <RotateCcw className="size-4" />
                DISCARD
              </button>
            )}

            <button
              type="button"
              onClick={saveChanges}
              disabled={!hasUnsavedChanges}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-coral px-4 py-2.5 text-xs font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Save className="size-4" />
              SAVE CHANGES
            </button>
          </div>
        </header>

        {/* =====================================================
            MESSAGE
        ===================================================== */}

        {message && (
          <div
            className={`fixed right-6 top-6 z-[100] flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold shadow-2xl backdrop-blur-md ${
              messageType === "success"
                ? "border-white/10 bg-[#151c29] text-white"
                : "border-coral/30 bg-[#24151a] text-white"
            }`}
          >
            {messageType === "success" ? (
              <Check className="size-4 text-yellow" />
            ) : (
              <X className="size-4 text-coral" />
            )}

            {message}
          </div>
        )}

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <div className="mt-7 grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* ===================================================
              SIDEBAR
          =================================================== */}

          <aside className="h-fit rounded-xl border border-white/[0.07] bg-[#151c29] p-2">
            {sections.map((item) => (
              <button
                type="button"
                key={item.name}
                onClick={() => setSection(item.name)}
                className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-bold transition ${
                  section === item.name
                    ? "bg-[#0d121c] text-white shadow-sm"
                    : "text-white/40 hover:bg-white/[0.04] hover:text-white/75"
                }`}
              >
                <item.icon
                  className={`size-4 ${section === item.name ? "text-yellow" : "text-white/30"}`}
                />

                {item.name}
              </button>
            ))}
          </aside>

          {/* ===================================================
              MAIN
          =================================================== */}

          <main>
            {/* =================================================
                ACCOUNT
            ================================================= */}

            {section === "Account" && (
              <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#151c29]">
                <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] p-6 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">
                      ACCOUNT
                    </p>

                    <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                      Account Details
                    </h2>

                    <p className="mt-1 text-sm text-white/35">
                      Manage your sign-in and identity information.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPasswordOpen(true);
                      setPasswordError("");
                      setPasswordSuccess(false);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-[#1b2433] px-4 py-2.5 text-xs font-black text-white/70 transition hover:border-yellow/40 hover:text-white"
                  >
                    <Lock className="size-4" />
                    CHANGE PASSWORD
                  </button>
                </div>

                <div className="divide-y divide-white/[0.07] px-6">
                  {/* ACCOUNT FIELDS */}

                  {accountRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex flex-col justify-between gap-3 py-5 sm:flex-row sm:items-center"
                    >
                      <div className="w-full">
                        <p className="text-[10px] font-black uppercase tracking-wider text-white/30">
                          {row.label}
                        </p>

                        {editing === row.key ? (
                          <input
                            value={draftValue}
                            onChange={(event) => setDraftValue(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                saveAccountField(row.key);
                              }

                              if (event.key === "Escape") {
                                setEditing(null);
                                setDraftValue("");
                              }
                            }}
                            autoFocus
                            type={row.key === "Email" ? "email" : "text"}
                            className="mt-2 w-full rounded-md border border-white/10 bg-[#0d121c] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-coral"
                          />
                        ) : (
                          <p className="mt-1 font-bold text-white/80">{row.value}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (editing === row.key) {
                            saveAccountField(row.key);
                          } else {
                            startEditing(row.key, row.value);
                          }
                        }}
                        className="w-fit rounded-md border border-white/10 px-3 py-2 text-xs font-black text-white/45 transition hover:border-coral hover:text-coral"
                      >
                        {editing === row.key ? "DONE" : "CHANGE"}
                      </button>
                    </div>
                  ))}

                  {/* AVATAR */}

                  <div className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4">
                      <div className="relative size-16 overflow-hidden rounded-full border-2 border-yellow bg-[#0d121c]">
                        <Image
                          src={account.avatar}
                          alt="Player avatar"
                          fill
                          unoptimized={account.avatar.startsWith("data:")}
                          className="object-cover object-[62%_45%]"
                        />
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-white/30">
                          Avatar
                        </p>

                        <p className="mt-1 text-sm text-white/40">JPG or PNG, up to 5 MB</p>
                      </div>
                    </div>

                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />

                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="w-fit rounded-md border border-white/10 px-3 py-2 text-xs font-black text-white/45 transition hover:border-coral hover:text-coral"
                    >
                      CHANGE
                    </button>
                  </div>
                </div>

                {/* DELETE ACCOUNT */}

                <div className="border-t border-coral/20 bg-coral/[0.04] p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-black uppercase text-coral">Delete Account</h3>

                      <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/40">
                        Deleting your account is permanent. Your progression, productions,
                        purchases, and social connections cannot be recovered.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteOpen(true);
                        setDeleteText("");
                        setDeleteError("");
                      }}
                      className="inline-flex w-fit items-center gap-2 rounded-md border border-coral px-4 py-2.5 text-xs font-black text-coral transition hover:bg-coral hover:text-white"
                    >
                      <Trash2 className="size-4" />
                      DELETE ACCOUNT
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* =================================================
                PROFILE
            ================================================= */}

            {section === "Profile" && (
              <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#151c29]">
                <div className="border-b border-white/[0.07] p-7">
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">
                    PROFILE CONTROL
                  </p>

                  <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                    Profile
                  </h2>

                  <p className="mt-2 text-sm text-white/40">
                    Control what other players can see on your profile.
                  </p>
                </div>

                <div className="space-y-3 p-7">
                  <PreferenceRow
                    label="Show Career Information"
                    description="Display your career overview and achievements."
                    checked={preferences.showCareerInfo}
                    onChange={() => togglePreference("showCareerInfo")}
                  />

                  <PreferenceRow
                    label="Show Crew Activity"
                    description="Allow other players to see your recent crew activity."
                    checked={preferences.showCrewActivity}
                    onChange={() => togglePreference("showCrewActivity")}
                  />

                  <PreferenceRow
                    label="Public Profile"
                    description="Allow other players to open and view your profile."
                    checked={preferences.profileVisibility}
                    onChange={() => togglePreference("profileVisibility")}
                  />
                </div>
              </section>
            )}

            {/* =================================================
                DISPLAY
            ================================================= */}

            {section === "Display" && (
              <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#151c29]">
                <div className="border-b border-white/[0.07] p-7">
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">
                    DISPLAY CONTROL
                  </p>

                  <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                    Display
                  </h2>

                  <p className="mt-2 text-sm text-white/40">
                    Fine-tune the portal's look and feel.                     These preferences are saved to this
                    device.
                  </p>
                </div>

                <div className="space-y-6 p-7">
                  <DisplayThemeSwitcher />
                  <PreferenceRow
                    label="Compact Mode"
                    description="Reduce spacing to fit more information on screen."
                    checked={preferences.compactMode}
                    onChange={() => togglePreference("compactMode")}
                  />

                  <PreferenceRow
                    label="Reduce Motion"
                    description="Minimize animations and transitions across the portal."
                    checked={preferences.reduceMotion}
                    onChange={() => togglePreference("reduceMotion")}
                  />

                  <PreferenceRow
                    label="High Contrast"
                    description="Increase contrast for better readability."
                    checked={preferences.highContrast}
                    onChange={() => togglePreference("highContrast")}
                  />

                  <PreferenceRow
                    label="Large Text"
                    description="Increase base text size across the portal."
                    checked={preferences.largeText}
                    onChange={() => togglePreference("largeText")}
                  />
                </div>
              </section>
            )}

            {/* =================================================
                PRIVACY
            ================================================= */}

            {section === "Privacy" && (
              <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#151c29]">
                <div className="border-b border-white/[0.07] p-7">
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">
                    PRIVACY CONTROL
                  </p>

                  <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                    Privacy
                  </h2>

                  <p className="mt-2 text-sm text-white/40">
                    Manage your visibility and personal information settings.
                  </p>
                </div>

                <div className="space-y-3 p-7">
                  <PreferenceRow
                    label="Profile Visibility"
                    description="Let other players find and view your player profile."
                    checked={preferences.profileVisibility}
                    onChange={() => togglePreference("profileVisibility")}
                  />

                  <PreferenceRow
                    label="Career Information"
                    description="Show your career statistics and achievements."
                    checked={preferences.showCareerInfo}
                    onChange={() => togglePreference("showCareerInfo")}
                  />

                  <PreferenceRow
                    label="Crew Activity"
                    description="Show your activity to current crew members."
                    checked={preferences.showCrewActivity}
                    onChange={() => togglePreference("showCrewActivity")}
                  />
                </div>
              </section>
            )}

            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            {section === "Notifications" && (
              <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#151c29]">
                <div className="border-b border-white/[0.07] p-7">
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">
                    NOTIFICATION CONTROL
                  </p>

                  <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                    Notifications
                  </h2>

                  <p className="mt-2 text-sm text-white/40">
                    Choose which player and crew notifications you receive.
                  </p>
                </div>

                <div className="space-y-3 p-7">
                  <PreferenceRow
                    label="Production Updates"
                    description="Receive updates about productions you are involved in."
                    checked={preferences.productionUpdates}
                    onChange={() => togglePreference("productionUpdates")}
                  />

                  <PreferenceRow
                    label="Friend Requests"
                    description="Receive notifications when players send you friend requests."
                    checked={preferences.friendRequests}
                    onChange={() => togglePreference("friendRequests")}
                  />

                  <PreferenceRow
                    label="Crew Invitations"
                    description="Receive notifications when a crew invites you."
                    checked={preferences.crewInvites}
                    onChange={() => togglePreference("crewInvites")}
                  />

                  <PreferenceRow
                    label="Email Notifications"
                    description="Receive important player updates through email."
                    checked={preferences.emailNotifications}
                    onChange={() => togglePreference("emailNotifications")}
                  />
                </div>
              </section>
            )}

            {/* =================================================
                SUPPORT
            ================================================= */}

            {section === "Support" && (
              <div className="space-y-6">
                {/* REPORT A BUG */}

                <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#151c29]">
                  <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] p-7 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">
                        SUPPORT
                      </p>

                      <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                        Report a Bug
                      </h2>

                      <p className="mt-2 text-sm text-white/40">
                        Run into a glitch on set? Let the crew know so we can fix it.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={openBugReport}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-coral px-4 py-2.5 text-xs font-black text-white transition hover:opacity-90"
                    >
                      <Bug className="size-4" />
                      REPORT A BUG
                    </button>
                  </div>

                  <div className="p-7">
                    <p className="text-sm text-white/40">
                      Include as much detail as possible — what you were doing, what happened, and
                      how to reproduce it.
                    </p>
                  </div>
                </section>

                {/* REPORT A PLAYER */}

                <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#151c29]">
                  <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] p-7 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">
                        SAFETY
                      </p>

                      <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                        Report a Player
                      </h2>

                      <p className="mt-2 text-sm text-white/40">
                        Experienced bad behavior on set? Flag it so our crew can review and take
                        action.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={openPlayerReport}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-coral px-4 py-2.5 text-xs font-black text-white transition hover:opacity-90"
                    >
                      <Flag className="size-4" />
                      REPORT A PLAYER
                    </button>
                  </div>

                  <div className="p-7">
                    <p className="text-sm text-white/40">
                      Reports are confidential. Include as much detail as possible so the crew can
                      investigate fairly.
                    </p>
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* =========================================================
          REPORT A BUG MODAL
      ========================================================= */}

      {bugReportOpen && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[#05080d]/85 p-5 backdrop-blur-md"
          onClick={closeBugReport}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/[0.09] bg-[#151c29] p-6 shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-md bg-coral/10 text-coral">
                <Bug className="size-5" />
              </div>

              <button
                type="button"
                onClick={closeBugReport}
                className="rounded-md p-1 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <h2 className="mt-5 text-2xl font-black uppercase tracking-tight text-white">
              Report a Bug
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-white/45">
              Tell us what went wrong. Our crew reviews every report.
            </p>

            {bugSubmitted ? (
              <div className="mt-6 flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                  <Check className="size-4" />
                </span>
                Thanks! Your bug report has been submitted.
              </div>
            ) : (
              <>
          {bugError && (
            <div className="mt-4 rounded-md border border-coral/20 bg-coral/10 p-3 text-sm font-bold text-coral">
              {bugError}
            </div>
          )}
          {bugWarning && (
            <div className="mt-4 rounded-md border border-[#F3C747]/25 bg-[#F3C747]/10 p-3 text-sm font-bold text-[#F3C747]">
              {bugWarning}
            </div>
          )}

                <div className="mt-5 space-y-4">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/35">
                    Bug Category
                    <select
                      value={bugCategory}
                      onChange={(event) => setBugCategory(event.target.value)}
                      className="mt-2 w-full rounded-md border border-white/10 bg-[#0d121c] px-3 py-3 text-sm font-bold text-white outline-none focus:border-coral"
                    >
                      <option value="">Select a category</option>
                      {bugCategories.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/35">
                    Email
                    <input
                      type="email"
                      value={bugEmail}
                      onChange={(event) => setBugEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="mt-2 w-full rounded-md border border-white/10 bg-[#0d121c] px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/15 focus:border-coral"
                    />
                  </label>

                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/35">
                    Bug Description
                    <textarea
                      value={bugDescription}
                      onChange={(event) => setBugDescription(event.target.value)}
                      placeholder="Describe what happened and how to reproduce it..."
                      rows={5}
                      className="mt-2 w-full resize-none rounded-md border border-white/10 bg-[#0d121c] px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/15 focus:border-coral"
                    />
                  </label>

                  <div className="text-[10px] font-black uppercase tracking-wider text-white/35">
                    Attachment
                    <span className="ml-1 normal-case text-white/25">
                      (optional — image or PDF)
                    </span>
                    <input
                      ref={bugAttachmentInput}
                      type="file"
                      accept="image/*,application/pdf,.pdf"
                      onChange={handleBugAttachmentChange}
                      className="hidden"
                    />
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => bugAttachmentInput.current?.click()}
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#0d121c] px-3 py-2.5 text-xs font-black text-white/70 transition hover:border-coral/40 hover:text-white"
                      >
                        <Paperclip className="size-4" />
                        {bugAttachment ? "CHANGE FILE" : "ADD FILE"}
                      </button>

                      {bugAttachment && (
                        <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-white/60">
                          <span className="truncate">{bugAttachment.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setBugAttachment(null);
                              if (bugAttachmentInput.current) bugAttachmentInput.current.value = "";
                            }}
                            className="text-white/40 transition hover:text-coral"
                            aria-label="Remove attachment"
                          >
                            <X className="size-3.5" />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeBugReport}
                    className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-black text-white/45 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    CANCEL
                  </button>

                  <button
                    type="button"
                    onClick={submitBugReport}
                    className="rounded-md bg-coral px-4 py-2.5 text-xs font-black text-white transition hover:opacity-90"
                  >
                    SUBMIT REPORT
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* =========================================================
          REPORT A PLAYER MODAL
      ========================================================= */}

      {playerReportOpen && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[#05080d]/85 p-5 backdrop-blur-md"
          onClick={closePlayerReport}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/[0.09] bg-[#151c29] p-6 shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-md bg-coral/10 text-coral">
                <Flag className="size-5" />
              </div>

              <button
                type="button"
                onClick={closePlayerReport}
                className="rounded-md p-1 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <h2 className="mt-5 text-2xl font-black uppercase tracking-tight text-white">
              Report a Player
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-white/45">
              Tell us what happened. Reports are confidential and reviewed by our crew.
            </p>

            {playerReportSubmitted ? (
              <div className="mt-6 flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                  <Check className="size-4" />
                </span>
                Thanks! Your player report has been submitted.
              </div>
            ) : (
              <>
                {playerReportError && (
                  <div className="mt-4 rounded-md border border-coral/20 bg-coral/10 p-3 text-sm font-bold text-coral">
                    {playerReportError}
                  </div>
                )}

                <div className="mt-5 space-y-4">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/35">
                    Report Type
                    <select
                      value={playerReportType}
                      onChange={(event) => setPlayerReportType(event.target.value)}
                      className="mt-2 w-full rounded-md border border-white/10 bg-[#0d121c] px-3 py-3 text-sm font-bold text-white outline-none focus:border-coral"
                    >
                      <option value="">Select a report type</option>
                      {playerReportTypes.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/35">
                    Reported Player Username
                    <input
                      type="text"
                      value={playerReportUsername}
                      onChange={(event) => setPlayerReportUsername(event.target.value)}
                      placeholder="Enter the username of the player"
                      className="mt-2 w-full rounded-md border border-white/10 bg-[#0d121c] px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/15 focus:border-coral"
                    />
                  </label>

                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/35">
                    Description
                    <textarea
                      value={playerReportDescription}
                      onChange={(event) => setPlayerReportDescription(event.target.value)}
                      placeholder="Describe what happened, including who was involved and when..."
                      rows={5}
                      className="mt-2 w-full resize-none rounded-md border border-white/10 bg-[#0d121c] px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/15 focus:border-coral"
                    />
                  </label>

                  <div className="text-[10px] font-black uppercase tracking-wider text-white/35">
                    Attachment
                    <span className="ml-1 normal-case text-white/25">
                      (optional — image or PDF)
                    </span>
                    <input
                      ref={playerReportAttachmentInput}
                      type="file"
                      accept="image/*,application/pdf,.pdf"
                      onChange={handlePlayerReportAttachmentChange}
                      className="hidden"
                    />
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => playerReportAttachmentInput.current?.click()}
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#0d121c] px-3 py-2.5 text-xs font-black text-white/70 transition hover:border-coral/40 hover:text-white"
                      >
                        <Paperclip className="size-4" />
                        {playerReportAttachment ? "CHANGE FILE" : "ADD FILE"}
                      </button>

                      {playerReportAttachment && (
                        <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-white/60">
                          <span className="truncate">{playerReportAttachment.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPlayerReportAttachment(null);
                              if (playerReportAttachmentInput.current)
                                playerReportAttachmentInput.current.value = "";
                            }}
                            className="text-white/40 transition hover:text-coral"
                            aria-label="Remove attachment"
                          >
                            <X className="size-3.5" />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closePlayerReport}
                    className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-black text-white/45 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    CANCEL
                  </button>

                  <button
                    type="button"
                    onClick={submitPlayerReport}
                    className="rounded-md bg-coral px-4 py-2.5 text-xs font-black text-white transition hover:opacity-90"
                  >
                    SUBMIT REPORT
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* =========================================================
          CHANGE PASSWORD MODAL
      ========================================================= */}

      {passwordOpen && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[#05080d]/85 p-5 backdrop-blur-md"
          onClick={() => setPasswordOpen(false)}
        >
          <section
            className="w-full max-w-md overflow-hidden rounded-xl border border-white/[0.09] bg-[#151c29] shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-coral">
                  ACCOUNT SECURITY
                </p>

                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                  Change Password
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setPasswordOpen(false)}
                aria-label="Close"
                className="grid size-9 place-items-center rounded-md text-white/30 transition hover:bg-white/[0.05] hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6">
              {passwordSuccess ? (
                <div className="rounded-lg border border-[#2d9d8f]/20 bg-[#2d9d8f]/10 p-5 text-center">
                  <div className="mx-auto grid size-11 place-items-center rounded-full bg-[#2d9d8f]/15 text-[#55b8aa]">
                    <Check className="size-5" />
                  </div>

                  <p className="mt-3 font-black uppercase text-[#55b8aa]">Password Updated</p>

                  <p className="mt-1 text-sm text-white/40">
                    Your password has been changed successfully.
                  </p>
                </div>
              ) : (
                <>
                  {passwordError && (
                    <div className="rounded-md border border-coral/20 bg-coral/10 p-3 text-sm font-bold text-coral">
                      {passwordError}
                    </div>
                  )}

                  <div className="mt-5 space-y-4">
                    <PasswordField
                      label="CURRENT PASSWORD"
                      value={currentPassword}
                      onChange={setCurrentPassword}
                      visible={showCurrentPassword}
                      onToggle={() => setShowCurrentPassword((value) => !value)}
                    />

                    <PasswordField
                      label="NEW PASSWORD"
                      value={newPassword}
                      onChange={setNewPassword}
                      visible={showNewPassword}
                      onToggle={() => setShowNewPassword((value) => !value)}
                    />

                    <PasswordField
                      label="CONFIRM NEW PASSWORD"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      visible={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((value) => !value)}
                    />

                    <p className="text-xs text-white/30">
                      Password must contain at least 8 characters.
                    </p>

                    <button
                      type="button"
                      onClick={handlePasswordChange}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-coral px-4 py-3 text-xs font-black text-white transition hover:opacity-90"
                    >
                      <Save className="size-4" />
                      SAVE PASSWORD
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {/* =========================================================
          DELETE ACCOUNT MODAL
      ========================================================= */}

      {deleteOpen && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[#05080d]/85 p-5 backdrop-blur-md"
          onClick={() => {
            setDeleteOpen(false);
            setDeleteText("");
            setDeleteError("");
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-white/[0.09] bg-[#151c29] p-6 shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid size-11 place-items-center rounded-md bg-coral/10 text-coral">
              <Trash2 className="size-5" />
            </div>

            <h2 className="mt-5 text-2xl font-black uppercase tracking-tight text-white">
              Delete Account?
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-white/45">
              This action permanently clears your local player account data. This cannot be undone.
            </p>

            {deleteError && (
              <div className="mt-4 rounded-md border border-coral/20 bg-coral/10 p-3 text-sm font-bold text-coral">
                {deleteError}
              </div>
            )}

            <div className="mt-5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-white/35">
                Type DELETE to confirm
                <input
                  value={deleteText}
                  onChange={(event) => setDeleteText(event.target.value.toUpperCase())}
                  placeholder="DELETE"
                  className="mt-2 w-full rounded-md border border-white/10 bg-[#0d121c] px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/15 focus:border-coral"
                  autoComplete="off"
                />
              </label>

              <label className="mt-4 block text-[10px] font-black uppercase tracking-wider text-white/35">
                Confirm your password
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  placeholder="Enter password"
                  className="mt-2 w-full rounded-md border border-white/10 bg-[#0d121c] px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-white/15 focus:border-coral"
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteText("");
                  setDeleteError("");
                  setDeletePassword("");
                }}
                className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-black text-white/45 transition hover:bg-white/[0.04] hover:text-white"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteText !== "DELETE" || !deletePassword}
                className="rounded-md bg-coral px-4 py-2.5 text-xs font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
              >
                CONFIRM DELETE
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PREFERENCE ROW
========================================================= */

function PreferenceRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="group flex w-full items-center justify-between gap-5 rounded-lg border border-white/[0.07] bg-[#1b2433] p-4 text-left transition hover:border-white/[0.13] hover:bg-[#202a3a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coral/25"
    >
      <div>
        <span className="text-sm font-bold text-white/85">{label}</span>

        <p className="mt-1 text-xs leading-relaxed text-white/35">{description}</p>
      </div>

      <span
        className={`portal-switch relative flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? "portal-switch-on" : "portal-switch-off"
        }`}
      >
        <span
          className={`portal-switch-thumb absolute size-4 rounded-full shadow-sm transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

/* =========================================================
   PASSWORD FIELD
========================================================= */

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="block text-[10px] font-black uppercase tracking-wider text-white/35">
      {label}

      <div className="relative mt-2">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-white/10 bg-[#0d121c] px-3 py-3 pr-11 text-sm font-bold text-white outline-none placeholder:text-white/15 focus:border-coral"
          autoComplete="off"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 transition hover:text-white"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </label>
  );
}
