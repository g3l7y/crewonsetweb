import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/game")({
  head: () => ({
    meta: [
      { title: "Game & Updates — Crew On Set! Admin" },
      { name: "description", content: "Manage game releases and player communications." },
      { property: "og:title", content: "Game & Updates — Crew On Set! Admin" },
      { property: "og:description", content: "Manage game releases and player communications." },
    ],
  }),
  component: GamePage,
});

import { FormEvent, useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  FileUp,
  ListChecks,
  Mail,
  UploadCloud,
  X,
} from "lucide-react";
import { players } from "@/lib/admin-demo-data";
import { useAdminPlayers } from "@/lib/playfab/hooks";
import { isMockMode } from "@/lib/playfab/config";
import { isValidEmail } from "@/lib/validation";
import {
  buildHistoryStore,
  buildInfoStore,
  gameBuildStore,
  installStepsStore,
  logAdminActivity,
  MAX_INSTALL_STEPS,
  notificationsStore,
  seedBuildInfo,
  seedSystemRequirements,
  systemRequirementsStore,
  uid,
  type GameBuild,
  type InstallStep,
  type SystemRequirementRow,
} from "@/lib/demo/store";
import { Plus as PlusIcon, RotateCcw, Trash2 } from "lucide-react";

const emptyBuildInfo = {
  version: "",
  builtOn: "",
  platform: "",
  installSize: "",
};

const mockMailRecipients = [
  { id: "MOCK-PLAYER-001", username: "CAMERA_PRO", email: "player@crewonset.com" },
  ...players.map((player) => ({
    id: String(player.id),
    username: player.username,
    email: player.email,
  })),
];

function GamePage() {
  const [notifications] = notificationsStore.useStore();
  const realPlayersQuery = useAdminPlayers();
  const mailRecipients = isMockMode()
    ? mockMailRecipients
    : (realPlayersQuery.data ?? []).map((player) => ({
        id: String(player.playFabId || player.id),
        username: player.username || player.displayName,
        email: player.email,
      }));
  const [composerTab, setComposerTab] = useState<"game" | "mail">("game");
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [openAnnouncement, setOpenAnnouncement] = useState<string | null>(null);

  const announcements = notifications.filter((n) => n.kind === "announcement");
  const detail = announcements.find((a) => a.id === openAnnouncement) ?? null;
  const mailSuggestions = mailRecipients
    .filter((player) => {
      const query = mailTo.trim().toLowerCase();
      return query && !isValidEmail(query) && player.username.toLowerCase().includes(query);
    })
    .slice(0, 6);

  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [remoteRequirements] = systemRequirementsStore.useStore();
  const [remoteBuildInfoRows] = buildInfoStore.useStore();
  const [remoteInstallSteps] = installStepsStore.useStore();
  const [requirements, setRequirements] = useState<SystemRequirementRow[]>(() =>
    systemRequirementsStore.get(),
  );
  const [buildInfo, setBuildInfo] = useState(() =>
    buildInfoStore.get()[0] ?? (isMockMode() ? seedBuildInfo : emptyBuildInfo),
  );
  const [savedMessage, setSavedMessage] = useState("");
  const [composerMessage, setComposerMessage] = useState("");

  useEffect(() => {
    if (requirements.length === 0 && remoteRequirements.length > 0) {
      setRequirements(remoteRequirements.map((row) => ({ ...row })));
    }
  }, [remoteRequirements, requirements.length]);

  useEffect(() => {
    if (!buildInfo.version && remoteBuildInfoRows[0]) {
      setBuildInfo({ ...remoteBuildInfoRows[0] });
    }
  }, [remoteBuildInfoRows, buildInfo.version]);


  function updateRequirement(id: string, field: "label" | "minimum" | "recommended", value: string) {
    setRequirements((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addRequirement() {
    setRequirements((current) => [
      ...current,
      { id: uid("req"), label: "", minimum: "", recommended: "" },
    ]);
  }

  function removeRequirement(id: string) {
    setRequirements((current) => current.filter((row) => row.id !== id));
  }

  function saveRequirements() {
    systemRequirementsStore.set(requirements);
    buildInfoStore.set([buildInfo]);
    setSavedMessage("Saved — Download page updated.");
    window.setTimeout(() => setSavedMessage(""), 3000);
  }

  function resetRequirements() {
    setRequirements(isMockMode() ? seedSystemRequirements.map((row) => ({ ...row })) : []);
    setBuildInfo(isMockMode() ? { ...seedBuildInfo } : { ...emptyBuildInfo });
    systemRequirementsStore.set(isMockMode() ? seedSystemRequirements : []);
    buildInfoStore.set([isMockMode() ? seedBuildInfo : emptyBuildInfo]);
    setSavedMessage("Reset to defaults.");
    window.setTimeout(() => setSavedMessage(""), 3000);
  }

  /* ---------------------------------------------- current game build */

  const [buildRows] = gameBuildStore.useStore();
  const [historyRows] = buildHistoryStore.useStore();
  const currentBuild = buildRows[0];

  const [buildDraft, setBuildDraft] = useState<GameBuild>(
    () => gameBuildStore.get()[0] ?? {
      version: "",
      buildNumber: "",
      minWindows: "",
      installerFileName: "",
      downloadUrl: "",
      releaseNotes: "",
      releasedAt: new Date().toISOString(),
    },
  );

  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!buildDraft.version.trim() || !buildDraft.buildNumber.trim()) return;

    const previous = gameBuildStore.get()[0];
    if (previous) buildHistoryStore.set([previous, ...buildHistoryStore.get()].slice(0, 20));

    const next: GameBuild = { ...buildDraft, releasedAt: new Date().toISOString() };
    gameBuildStore.set([next]);

    // Keep the legacy download metadata version aligned with the published
    // build so every mock-mode admin/public surface reads the same release.
    const nextBuildInfo = {
      ...buildInfo,
      version: `Version ${next.version} (Playtest Build)`,
    };
    buildInfoStore.set([nextBuildInfo]);
    setBuildInfo(nextBuildInfo);

    logAdminActivity({
      kind: "game",
      label: "Game build uploaded",
      detail: `Version ${next.version} (build ${next.buildNumber}) is now the current build.`,
    });

    notificationsStore.set([
      {
        id: uid("ntf"),
        title: `New game update: v${next.version}`,
        body: `Build ${next.buildNumber} is now available. Open your dashboard to play the latest update.`,
        createdAt: new Date().toISOString(),
        kind: "announcement",
        read: false,
        href: "/portal",
        target: { kind: "all" },
      },
      ...notificationsStore.get(),
    ]);

    setBuildDraft(next);
    setComposerMessage(`Version ${next.version} is now live.`);
    window.setTimeout(() => setComposerMessage(""), 3000);
  }

  function resetBuildDraft() {
    const current = gameBuildStore.get()[0];
    if (current) setBuildDraft({ ...current });
  }

  function resetMailForm() {
    setMailTo("");
    setMailSubject("");
    setMailBody("");
  }

  function submitMail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mailTo.trim() || !mailBody.trim()) return;

    const recipientValue = mailTo.trim();
    const matchedPlayer = mailRecipients.find(
      (player) =>
        player.username.toLowerCase() === recipientValue.toLowerCase() ||
        player.email.toLowerCase() === recipientValue.toLowerCase(),
    );

    if (matchedPlayer) {
      notificationsStore.set([
        {
          id: uid("ntf"),
          title: mailSubject.trim(),
          body: mailBody.trim(),
          createdAt: new Date().toISOString(),
          kind: "system",
          channel: "mail",
          read: false,
          href: "/portal/inbox?tab=mail",
          recipientUsername: matchedPlayer.username,
          recipientEmail: matchedPlayer.email,
          target: { kind: "players", playerIds: [String(matchedPlayer.id)] },
        },
        ...notificationsStore.get(),
      ]);
      setComposerMessage(`In-app message sent to ${matchedPlayer.username}.`);
      resetMailForm();
      window.setTimeout(() => setComposerMessage(""), 3000);
      return;
    }

    if (isValidEmail(recipientValue)) {
      setComposerMessage(
        "Email delivery is not configured yet. Add a server-side mail provider before sending external email.",
      );
      return;
    }

    setComposerMessage("Select an existing player username or enter a valid email address.");
  }

  /* -------------------------------------- installation instructions */

  const [installOpen, setInstallOpen] = useState(false);
  const [installDraft, setInstallDraft] = useState<InstallStep[]>(() =>
    installStepsStore.get().slice(0, MAX_INSTALL_STEPS),
  );

  useEffect(() => {
    if (installDraft.length === 0 && remoteInstallSteps.length > 0) {
      setInstallDraft(remoteInstallSteps.slice(0, MAX_INSTALL_STEPS).map((step) => ({ ...step })));
    }
  }, [installDraft.length, remoteInstallSteps]);

  function openInstall() {
    setInstallDraft(installStepsStore.get().slice(0, MAX_INSTALL_STEPS).map((step) => ({ ...step })));
    setInstallOpen(true);
  }

  function updateInstallStep(id: string, field: "title" | "text", value: string) {
    setInstallDraft((current) =>
      current.map((step) => (step.id === id ? { ...step, [field]: value } : step)),
    );
  }

  function addInstallStep() {
    setInstallDraft((current) =>
      current.length >= MAX_INSTALL_STEPS
        ? current
        : [...current, { id: uid("step"), title: "", text: "" }],
    );
  }

  function removeInstallStep(id: string) {
    setInstallDraft((current) => current.filter((step) => step.id !== id));
  }

  function saveInstallSteps() {
    installStepsStore.set(installDraft.slice(0, MAX_INSTALL_STEPS));
    setInstallOpen(false);
    setSavedMessage("Installation instructions updated.");
    window.setTimeout(() => setSavedMessage(""), 3000);
  }

  const buildDate = currentBuild
    ? new Date(currentBuild.releasedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
      {/* PAGE HEADER */}
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black tracking-[.18em] !text-coral">
            PRODUCTION
          </p>

          <h1 className="admin-heading mt-2 !text-white">
            GAME &amp; UPDATES
          </h1>

          <p className="admin-kicker !text-white/45">
            Manage builds, releases, and player communications.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={openInstall}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#182330] px-4 py-2.5 text-sm font-bold text-white transition hover:border-coral hover:bg-[#1d2a38]"
          >
            <ListChecks className="size-4" />
            Edit Installation Instructions
          </button>

        </div>
      </header>

      {/* RELEASE STATS */}
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-lg border border-white/[0.06] bg-[#182330] p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="grid size-11 place-items-center rounded-md bg-coral text-white">
              <FileUp className="size-5" />
            </div>

            <span className="rounded bg-[#2d9d8f]/15 px-2 py-1 text-[10px] font-black text-[#4bc4b4]">
              LIVE
            </span>
          </div>

          <p className="mt-6 text-3xl font-black !text-white">
            v{currentBuild?.version ?? "—"}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">
            Current Version
          </p>
        </article>

        <article className="rounded-lg border border-white/[0.06] bg-[#182330] p-6 shadow-xl">
          <div className="grid size-11 place-items-center rounded-md bg-[#d9a514] text-[#101923]">
            <Download className="size-5" />
          </div>

          <p className="mt-6 text-3xl font-black !text-white">
            {isMockMode() ? "68,320" : "—"}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-wider !text-white/35">
            Total Downloads
          </p>
        </article>
      </section>

      {/* CURRENT GAME BUILD */}
      <section className="mt-6 rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-black uppercase !text-white">Current Game Build</h2>
            <p className="mt-1 text-xs !text-white/35">
              Live build details shown on the public Download page and the admin dashboard.
            </p>
          </div>

        </div>

        {currentBuild ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Version", `v${currentBuild.version}`],
                ["Build Number", currentBuild.buildNumber],
["Windows Requirement", currentBuild.minWindows],
              ["Release Date", buildDate],
              ["Installer File", currentBuild.installerFileName],
                ["Download URL", currentBuild.downloadUrl],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-md border border-white/[0.07] bg-[#101923] p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider !text-white/30">{label}</p>
                  <p className="mt-1.5 break-words text-sm font-bold !text-white/75">{value || "—"}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-md border border-white/[0.07] bg-[#101923] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider !text-white/30">Release Notes</p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed !text-white/65">
                {currentBuild.releaseNotes || "No release notes recorded."}
              </p>
            </div>
          </>
        ) : (
          <p className="mt-5 text-sm !text-white/40">No build uploaded yet.</p>
        )}
      </section>

      {/* SYSTEM REQUIREMENTS */}
      <section className="mt-6 overflow-hidden rounded-lg border border-white/[0.06] bg-[#182330] shadow-xl">
        <button
          onClick={() => setRequirementsOpen((open) => !open)}
          className="flex w-full items-center justify-between p-5 text-left transition hover:bg-white/[0.02]"
        >
          <div>
            <h2 className="font-black uppercase !text-white">
              System Requirements
            </h2>

            <p className="mt-1 text-xs !text-white/35">
              Editable minimum and recommended specs shown on the public Download page.
            </p>
          </div>

          <ChevronDown
            className={`size-5 !text-white/50 transition-transform ${
              requirementsOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <div
          className={`grid overflow-hidden transition-all duration-300 ${
            requirementsOpen
              ? "grid-rows-[1fr] border-t border-white/[0.08]"
              : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0">
            <div className="space-y-5 p-5">
              {/* BUILD INFO */}
              <div className="rounded-md border border-white/[0.07] bg-[#101923] p-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-wider !text-white/35">
                  Build Metadata
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="form-label !text-white/50">
                    VERSION LABEL
                    <input
                      value={buildInfo.version}
                      onChange={(e) => setBuildInfo({ ...buildInfo, version: e.target.value })}
                      className="mt-1.5 w-full rounded-md border border-white/10 bg-[#182330] px-3 py-2 text-sm font-bold !text-white outline-none focus:border-coral"
                    />
                  </label>
                  <label className="form-label !text-white/50">
                    BUILT ON
                    <input
                      value={buildInfo.builtOn}
                      onChange={(e) => setBuildInfo({ ...buildInfo, builtOn: e.target.value })}
                      className="mt-1.5 w-full rounded-md border border-white/10 bg-[#182330] px-3 py-2 text-sm font-bold !text-white outline-none focus:border-coral"
                    />
                  </label>
                  <label className="form-label !text-white/50">
                    PLATFORM
                    <input
                      value={buildInfo.platform}
                      onChange={(e) => setBuildInfo({ ...buildInfo, platform: e.target.value })}
                      className="mt-1.5 w-full rounded-md border border-white/10 bg-[#182330] px-3 py-2 text-sm font-bold !text-white outline-none focus:border-coral"
                    />
                  </label>
                  <label className="form-label !text-white/50">
                    INSTALL SIZE
                    <input
                      value={buildInfo.installSize}
                      onChange={(e) => setBuildInfo({ ...buildInfo, installSize: e.target.value })}
                      className="mt-1.5 w-full rounded-md border border-white/10 bg-[#182330] px-3 py-2 text-sm font-bold !text-white outline-none focus:border-coral"
                    />
                  </label>
                </div>
              </div>

              {/* REQUIREMENT ROWS */}
              <div className="space-y-3">
                {requirements.map((row) => (
                  <div key={row.id} className="grid gap-2 rounded-md border border-white/[0.07] bg-[#101923] p-3 sm:grid-cols-[1fr_1.4fr_1.4fr_auto]">
                    <input
                      value={row.label}
                      onChange={(e) => updateRequirement(row.id, "label", e.target.value)}
                      placeholder="Label"
                      className="rounded-md border border-white/10 bg-[#182330] px-3 py-2 text-sm font-bold !text-white outline-none focus:border-coral"
                    />
                    <input
                      value={row.minimum}
                      onChange={(e) => updateRequirement(row.id, "minimum", e.target.value)}
                      placeholder="Minimum"
                      className="rounded-md border border-white/10 bg-[#182330] px-3 py-2 text-sm !text-white/80 outline-none focus:border-coral"
                    />
                    <input
                      value={row.recommended}
                      onChange={(e) => updateRequirement(row.id, "recommended", e.target.value)}
                      placeholder="Recommended"
                      className="rounded-md border border-white/10 bg-[#182330] px-3 py-2 text-sm !text-white/80 outline-none focus:border-coral"
                    />
                    <button
                      type="button"
                      onClick={() => removeRequirement(row.id)}
                      className="grid size-9 shrink-0 place-items-center justify-self-end rounded-md border border-coral/25 text-coral transition hover:bg-coral hover:text-white sm:justify-self-auto"
                      aria-label={`Remove ${row.label || "row"}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addRequirement}
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#101923] px-3 py-2 text-xs font-bold !text-white/60 transition hover:border-coral hover:text-white"
                >
                  <PlusIcon className="size-3.5" />
                  Add Row
                </button>

                <button
                  type="button"
                  onClick={saveRequirements}
                  className="inline-flex items-center gap-2 rounded-md bg-coral px-4 py-2 text-xs font-black uppercase text-white transition hover:bg-coral-dark"
                >
                  Save Changes
                </button>

                <button
                  type="button"
                  onClick={resetRequirements}
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2 text-xs font-bold !text-white/50 transition hover:border-white/25 hover:text-white"
                >
                  <RotateCcw className="size-3.5" />
                  Reset to Defaults
                </button>

                {savedMessage && (
                  <span className="text-xs font-bold !text-[#4bc4b4]">{savedMessage}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RECENT UPLOADS */}
      <section className="mt-6">
        <h2 className="mb-4 text-lg font-black uppercase !text-white">
          Recent Uploads
        </h2>

        <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#182330] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#141e29]">
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Version
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Release Date
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Build
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {[
                  ...(currentBuild ? [{ build: currentBuild, live: true }] : []),
                  ...historyRows.map((build) => ({ build, live: false })),
                ].map(({ build, live }) => (
                  <tr
                    key={`${build.version}-${build.buildNumber}-${build.releasedAt}`}
                    className="border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.025]"
                  >
                    <td className="px-5 py-4 font-black !text-white">
                      v{build.version}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm !text-white/50">
                      {new Date(build.releasedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    <td className="px-5 py-4 text-sm !text-white/50">
                      Build {build.buildNumber}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded px-2.5 py-1 text-[10px] font-black uppercase ${
                          live
                            ? "bg-[#2d9d8f]/15 text-[#4bc4b4]"
                            : "bg-white/[0.06] !text-white/35"
                        }`}
                      >
                        {live ? "Live" : "Archived"}
                      </span>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* GAME UPDATES AND MAIL */}
      <section className="mt-6 rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
        <div className="mb-5 flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-md bg-coral text-white">
            {composerTab === "game" ? <UploadCloud className="size-4.5" /> : <Mail className="size-4.5" />}
          </div>
          <div className="min-w-0">
            <h2 className="font-black uppercase !text-white">
              {composerTab === "game" ? "New Game Release" : "Mail"}
            </h2>
            <p className="text-xs !text-white/35">
              {composerTab === "game"
                ? "Publish a new build and update the release details shown to players."
                : "Send status feedback to players who submitted reports or brands with applications."}
            </p>
          </div>
        </div>

        <div
          className="mb-5 flex flex-wrap gap-2 border-b border-white/[0.08] pb-3"
          role="tablist"
          aria-label="Game and updates forms"
        >
          {([
            ["game", "Game Updates"],
            ["mail", "Mail"],
          ] as const).map(([tab, label]) => {
            const active = composerTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setComposerTab(tab)}
                className={`rounded-md border px-4 py-2.5 text-xs font-black uppercase tracking-wide transition ${
                  active
                    ? "border-coral bg-coral text-white"
                    : "border-white/10 !text-white/50 hover:border-coral/50 hover:!text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {composerTab === "game" ? (
          <form onSubmit={submitUpload} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ["version", "Version", "0.9.5"],
                ["buildNumber", "Build Number", "950"],
                ["minWindows", "Minimum Windows Version", "Windows 10 64-bit"],
                ["installerFileName", "Windows Installer File Name", "CrewOnSet-0.9.5.exe"],
              ] as const).map(([field, label, placeholder]) => (
                <label key={field} className="block text-[10px] font-black uppercase tracking-wider !text-white/45">
                  {label}
                  <input
                    value={buildDraft[field]}
                    onChange={(event) =>
                      setBuildDraft((current) => ({ ...current, [field]: event.target.value }))
                    }
                    placeholder={placeholder}
                    required={field === "version" || field === "buildNumber"}
                    className="admin-input mt-2 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
                  />
                </label>
              ))}
            </div>

            <label className="block text-[10px] font-black uppercase tracking-wider !text-white/45">
              Download URL
              <input
                value={buildDraft.downloadUrl}
                onChange={(event) =>
                  setBuildDraft((current) => ({ ...current, downloadUrl: event.target.value }))
                }
                placeholder="https://..."
                className="admin-input mt-2 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
              />
            </label>

            <label className="block text-[10px] font-black uppercase tracking-wider !text-white/45">
              Release Notes
              <textarea
                value={buildDraft.releaseNotes}
                onChange={(event) =>
                  setBuildDraft((current) => ({ ...current, releaseNotes: event.target.value }))
                }
                rows={10}
                placeholder="What changed in this build?"
                className="admin-input mt-2 min-h-[220px] w-full resize-y rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md bg-[#d9a514] px-5 py-2.5 text-xs font-black uppercase text-[#101923] transition hover:bg-[#e6b62b]"
              >
                <UploadCloud className="size-4" />
                Publish Game Update
              </button>
              <button
                type="button"
                onClick={resetBuildDraft}
                className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-black uppercase !text-white/60 transition hover:!text-white"
              >
                Reset
              </button>
              {composerMessage && <span className="text-xs font-bold !text-[#4bc4b4]">{composerMessage}</span>}
            </div>
          </form>
        ) : (
          <form onSubmit={submitMail} className="grid gap-4">
            <label className="block text-[10px] font-black uppercase tracking-wider !text-white/45">
              TO:
              <div className="relative mt-2">
                <input
                  value={mailTo}
                  onChange={(event) => setMailTo(event.target.value)}
                  required
                  type="text"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={mailSuggestions.length > 0}
                  autoComplete="off"
                  placeholder="Player username or email address"
                  className="admin-input w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
                />

                {mailSuggestions.length > 0 && (
                  <div
                    role="listbox"
                    className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-white/10 bg-[#182330] shadow-2xl"
                  >
                    {mailSuggestions.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        role="option"
                        aria-selected={mailTo.toLowerCase() === player.username.toLowerCase()}
                        onClick={() => setMailTo(player.username)}
                        className="flex w-full items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-2.5 text-left transition last:border-0 hover:bg-white/[0.05]"
                      >
                        <span className="min-w-0 truncate text-xs font-black !text-white">
                          {player.username}
                        </span>
                        <span className="shrink-0 text-[10px] !text-white/35">{player.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="mt-1.5 block text-[10px] font-normal normal-case tracking-normal !text-white/30">
                Enter a player username, player email, or brand contact email.
              </span>
            </label>

            <label className="block text-[10px] font-black uppercase tracking-wider !text-white/45">
              SUBJECT
              <input
                value={mailSubject}
                onChange={(event) => setMailSubject(event.target.value)}
                required
                placeholder="Update on your submission"
                className="admin-input mt-2 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
              />
            </label>

            <label className="block text-[10px] font-black uppercase tracking-wider !text-white/45">
              MESSAGE
              <textarea
                value={mailBody}
                onChange={(event) => setMailBody(event.target.value)}
                required
                rows={10}
                placeholder="Write feedback about a report or application status..."
                className="admin-input mt-2 min-h-[220px] w-full resize-y rounded-md border border-white/10 bg-[#101923] px-3 py-3 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral sm:min-h-[260px]"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md bg-coral px-5 py-2.5 text-xs font-black uppercase text-white transition hover:bg-coral-dark"
              >
                <Mail className="size-4" />
                Send Message
              </button>
              <button
                type="button"
                onClick={resetMailForm}
                className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-black uppercase !text-white/60 transition hover:!text-white"
              >
                Reset
              </button>
              {composerMessage && <span className="text-xs font-bold !text-[#4bc4b4]">{composerMessage}</span>}
            </div>
          </form>
        )}
      </section>

      {/* PREVIOUS ANNOUNCEMENTS */}
      <section className="mt-6">
        <h2 className="mb-4 text-lg font-black uppercase !text-white">Sent Announcements</h2>
        <div className="space-y-3">
          {announcements.length === 0 && (
            <p className="text-sm !text-white/35">No announcements sent yet.</p>
          )}
          {announcements.map((a) => (
            <button
              type="button"
              key={a.id}
              onClick={() => setOpenAnnouncement(a.id)}
              className="block w-full rounded-lg border border-white/[0.06] bg-[#182330] p-4 text-left shadow-xl transition hover:border-coral/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black !text-white">{a.title}</p>
                <span className="rounded bg-white/[0.06] px-2 py-1 text-[10px] font-black uppercase !text-white/50">
                  {a.target?.kind === "players"
                    ? `Specific Players (${a.target.playerIds?.length ?? 0})`
                    : "All Players"}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm !text-white/50">{a.body}</p>
              <p className="mt-2 text-[10px] !text-white/25">
                {new Date(a.createdAt).toLocaleString()} · Tap to view details
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* SENT ANNOUNCEMENT DETAILS */}
      {detail && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/70 p-5 backdrop-blur-sm"
          onClick={() => setOpenAnnouncement(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#182330] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.18em] !text-coral">Announcement</p>
                <h2 className="mt-1 text-xl font-black uppercase !text-white">{detail.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenAnnouncement(null)}
                aria-label="Close details"
                className="grid size-9 shrink-0 place-items-center rounded-md !text-white/40 transition hover:bg-white/5 hover:!text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed !text-white/60">{detail.body}</p>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-white/[0.07] bg-[#101923] p-3">
                <dt className="text-[10px] font-black uppercase tracking-wide !text-white/30">Date</dt>
                <dd className="mt-1 text-sm font-bold !text-white">
                  {new Date(detail.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div className="rounded-md border border-white/[0.07] bg-[#101923] p-3">
                <dt className="text-[10px] font-black uppercase tracking-wide !text-white/30">Time</dt>
                <dd className="mt-1 text-sm font-bold !text-white">
                  {new Date(detail.createdAt).toLocaleTimeString()}
                </dd>
              </div>
              <div className="rounded-md border border-white/[0.07] bg-[#101923] p-3">
                <dt className="text-[10px] font-black uppercase tracking-wide !text-white/30">Status</dt>
                <dd className="mt-1 text-sm font-bold !text-white">Sent</dd>
              </div>
              <div className="rounded-md border border-white/[0.07] bg-[#101923] p-3">
                <dt className="text-[10px] font-black uppercase tracking-wide !text-white/30">Audience</dt>
                <dd className="mt-1 text-sm font-bold !text-white">
                  {detail.target?.kind === "players" ? "Specific Players" : "All Players"}
                </dd>
              </div>
            </dl>

            <div className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-wide !text-white/30">Recipients</p>
              {detail.target?.kind === "players" ? (
                <ul className="mt-2 divide-y divide-white/[0.05] overflow-hidden rounded-md border border-white/[0.07] bg-[#101923]">
                  {(detail.target.playerIds ?? []).map((playerId) => {
                    const player = players.find((p) => String(p.id) === String(playerId));
                    return (
                      <li
                        key={playerId}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"
                      >
                        <span className="min-w-0 truncate font-bold !text-white">
                          {player?.username ?? "Unknown player"}
                        </span>
                      </li>
                    );
                  })}
                  {(detail.target.playerIds ?? []).length === 0 && (
                    <li className="px-3 py-2.5 text-xs !text-white/35">No recipients recorded.</li>
                  )}
                </ul>
              ) : (
                <p className="mt-2 text-sm !text-white/55">
                  Every player in the game received this announcement.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* INSTALLATION INSTRUCTIONS MODAL */}
      {installOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setInstallOpen(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="my-auto w-full max-w-2xl rounded-xl border border-white/10 bg-[#151c28] shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-base font-black uppercase !text-white">Installation Instructions</h3>
                <p className="mt-1 text-xs !text-white/35">
                  Up to {MAX_INSTALL_STEPS} steps, shown on the public Download page.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInstallOpen(false)}
                className="grid size-8 shrink-0 place-items-center rounded-md border border-white/10 !text-white/50 transition hover:!text-white"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
              {installDraft.slice(0, MAX_INSTALL_STEPS).map((step, index) => (
                <div key={step.id} className="rounded-md border border-white/[0.07] bg-[#101923] p-4">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-coral text-xs font-black text-white">
                      {index + 1}
                    </span>

                    <input
                      value={step.title}
                      onChange={(event) => updateInstallStep(step.id, "title", event.target.value)}
                      placeholder="Step title"
                      className="admin-input min-w-0 rounded-md border border-white/10 bg-[#151c28] px-3 py-2.5 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
                    />

                    {installDraft.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInstallStep(step.id)}
                        className="grid size-8 shrink-0 place-items-center rounded-md border border-[#ff6248]/25 !text-[#ff6248] transition hover:bg-[#ff6248]/10"
                        aria-label={`Remove step ${index + 1}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <textarea
                    value={step.text}
                    onChange={(event) => updateInstallStep(step.id, "text", event.target.value)}
                    rows={3}
                    placeholder="Step description"
                    className="admin-input mt-3 w-full resize-y rounded-md border border-white/10 bg-[#151c28] px-3 py-2.5 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
                  />
                </div>
              ))}

              {installDraft.length < MAX_INSTALL_STEPS && (
                <button
                  type="button"
                  onClick={addInstallStep}
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2.5 text-xs font-black uppercase !text-white/60 transition hover:!text-white"
                >
                  <PlusIcon className="size-3.5" />
                  Add Step
                </button>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.07] px-5 py-4">
              <button
                type="button"
                onClick={() => setInstallOpen(false)}
                className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-black uppercase !text-white/60 transition hover:!text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveInstallSteps}
                className="inline-flex items-center gap-2 rounded-md bg-coral px-5 py-2.5 text-xs font-black uppercase text-white transition hover:bg-coral-dark"
              >
                <Check className="size-4" />
                Save Steps
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
