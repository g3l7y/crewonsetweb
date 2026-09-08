import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/game")({
  head: () => ({
    meta: [
      { title: "Game Config — Crew On Set! Admin" },
      { name: "description", content: "Tune game content, economy, and live settings." },
      { property: "og:title", content: "Game Config — Crew On Set! Admin" },
      { property: "og:description", content: "Tune game content, economy, and live settings." },
    ],
  }),
  component: GamePage,
});

import { FormEvent, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  FileUp,
  ListChecks,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import { players } from "@/lib/admin-demo-data";
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
  type NotificationTargetKind,
  type SystemRequirementRow,
} from "@/lib/demo/store";
import { Megaphone, Plus as PlusIcon, RotateCcw, Trash2 } from "lucide-react";

export function playerCode(id: number) {
  return `COS-${String(id).padStart(4, "0")}`;
}

function GamePage() {
  const [notifications, setNotifications] = notificationsStore.useStore();
  const [target, setTarget] = useState<NotificationTargetKind>("all");
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [playerQuery, setPlayerQuery] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [openAnnouncement, setOpenAnnouncement] = useState<string | null>(null);

  const announcements = notifications.filter((n) => n.kind === "announcement");
  const detail = announcements.find((a) => a.id === openAnnouncement) ?? null;

  const playerMatches = players.filter((player) => {
    const query = playerQuery.trim().toLowerCase();
    if (!query) return false;
    return (
      player.username.toLowerCase().includes(query) ||
      playerCode(player.id).toLowerCase().includes(query)
    );
  });

  const hasDraft = Boolean(title.trim() || body.trim() || selectedPlayers.length > 0);

  function resetComposer() {
    setTitle("");
    setBody("");
    setSelectedPlayers([]);
    setPlayerQuery("");
    setTarget("all");
    setDiscardOpen(false);
  }

  function publishAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;

    notificationsStore.set([
      {
        id: uid("ntf"),
        title,
        body,
        createdAt: new Date().toISOString(),
        kind: "announcement",
        read: false,
        target:
          target === "players"
            ? { kind: "players", playerIds: selectedPlayers.map((id) => String(id)) }
            : { kind: "all" },
      },
      ...notifications,
    ]);

    resetComposer();
  }

  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [requirements, setRequirements] = useState<SystemRequirementRow[]>(() =>
    systemRequirementsStore.get()
  );
  const [buildInfo, setBuildInfo] = useState(() => buildInfoStore.get()[0] ?? seedBuildInfo);
  const [savedMessage, setSavedMessage] = useState("");

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
    setRequirements(seedSystemRequirements.map((row) => ({ ...row })));
    setBuildInfo({ ...seedBuildInfo });
    systemRequirementsStore.set(seedSystemRequirements);
    buildInfoStore.set([seedBuildInfo]);
    setSavedMessage("Reset to defaults.");
    window.setTimeout(() => setSavedMessage(""), 3000);
  }

  /* ---------------------------------------------- current game build */

  const [buildRows] = gameBuildStore.useStore();
  const [historyRows] = buildHistoryStore.useStore();
  const currentBuild = buildRows[0];

  const [uploadOpen, setUploadOpen] = useState(false);
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

  function openUpload() {
    setBuildDraft({ ...(gameBuildStore.get()[0] as GameBuild) });
    setUploadOpen(true);
  }

  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!buildDraft.version.trim() || !buildDraft.buildNumber.trim()) return;

    const previous = gameBuildStore.get()[0];
    if (previous) buildHistoryStore.set([previous, ...buildHistoryStore.get()].slice(0, 20));

    const next: GameBuild = { ...buildDraft, releasedAt: new Date().toISOString() };
    gameBuildStore.set([next]);

    logAdminActivity({
      kind: "game",
      label: "Game build uploaded",
      detail: `Version ${next.version} (build ${next.buildNumber}) is now the current build.`,
    });

    setUploadOpen(false);
    setSavedMessage(`Version ${next.version} is now live.`);
    window.setTimeout(() => setSavedMessage(""), 3000);
  }

  /* -------------------------------------- installation instructions */

  const [installOpen, setInstallOpen] = useState(false);
  const [installDraft, setInstallDraft] = useState<InstallStep[]>(() =>
    installStepsStore.get().slice(0, MAX_INSTALL_STEPS),
  );

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
            GAME RELEASES
          </h1>

          <p className="admin-kicker !text-white/45">
            Manage builds, requirements, and release history.
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

          <button
            onClick={openUpload}
            className="inline-flex items-center gap-2 rounded-md bg-[#d9a514] px-4 py-2.5 text-sm font-black text-[#101923] transition hover:bg-[#e6b62b]"
          >
            <UploadCloud className="size-4" />
            Upload Update
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
            68,320
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

          <button
            onClick={openUpload}
            className="shrink-0 rounded-md border border-white/10 bg-[#1d2a38] px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:border-coral"
          >
            Manage
          </button>
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

      {/* ANNOUNCEMENT COMPOSER */}
      <section className="mt-6 rounded-lg border border-white/[0.06] bg-[#182330] p-5 shadow-xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-coral text-white">
            <Megaphone className="size-4.5" />
          </div>
          <div>
            <h2 className="font-black uppercase !text-white">New Announcement</h2>
            <p className="text-xs !text-white/35">Publishes to the player portal notification bell.</p>
          </div>
        </div>

        <form onSubmit={publishAnnouncement} className="grid gap-4">
          <label className="form-label !text-white/60">
            TITLE
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-2 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold !text-white outline-none focus:border-coral"
              placeholder="Season 4 wraps this Friday"
            />
          </label>

          <label className="form-label !text-white/60">
            MESSAGE
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={3}
              className="mt-2 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold !text-white outline-none focus:border-coral"
              placeholder="Details for the crew..."
            />
          </label>

          <div>
            <p className="form-label !text-white/60">TARGET</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["all", "players"] as NotificationTargetKind[]).map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setTarget(option)}
                  className={`rounded-md border px-3 py-2 text-xs font-bold uppercase transition ${
                    target === option
                      ? "border-coral bg-coral text-white"
                      : "border-white/10 !text-white/50 hover:border-white/25"
                  }`}
                >
                  {option === "all" ? "All Players" : "Specific Player(s)"}
                </button>
              ))}
            </div>
          </div>

          {target === "players" && (
            <div className="rounded-md border border-white/10 bg-[#101923] p-3">
              <label className="form-label !text-white/50">
                SEARCH PLAYERS
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/25" />
                  <input
                    value={playerQuery}
                    onChange={(e) => setPlayerQuery(e.target.value)}
                    placeholder="Player name or ID (e.g. COS-0001)"
                    className="w-full rounded-md border border-white/10 bg-[#0d141d] pl-9 pr-3 py-2.5 text-sm font-bold !text-white outline-none placeholder:text-white/20 focus:border-coral"
                  />
                </div>
              </label>

              {playerQuery.trim() && (
                <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-white/10 bg-[#0d141d]">
                  {playerMatches.length === 0 && (
                    <p className="p-3 text-xs !text-white/35">No players match that search.</p>
                  )}
                  {playerMatches.map((player) => {
                    const selected = selectedPlayers.includes(player.id);
                    return (
                      <button
                        type="button"
                        key={player.id}
                        onClick={() =>
                          setSelectedPlayers((current) =>
                            current.includes(player.id)
                              ? current.filter((id) => id !== player.id)
                              : [...current, player.id]
                          )
                        }
                        className="flex w-full items-center gap-3 border-b border-white/[0.05] px-3 py-2.5 text-left transition last:border-0 hover:bg-white/[0.04]"
                      >
                        <span
                          className={`grid size-4 shrink-0 place-items-center rounded border ${
                            selected ? "border-coral bg-coral text-white" : "border-white/20"
                          }`}
                        >
                          {selected && <Check className="size-3" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold !text-white">{player.username}</span>
                          <span className="block truncate text-[10px] !text-white/35">{playerCode(player.id)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-3">
                <p className="text-[10px] font-black uppercase tracking-wide !text-white/35">
                  Selected recipients ({selectedPlayers.length})
                </p>
                {selectedPlayers.length === 0 ? (
                  <p className="mt-1.5 text-xs !text-white/30">
                    Search above and select the players who should receive this announcement.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedPlayers.map((id) => {
                      const player = players.find((p) => p.id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex max-w-full items-center gap-2 rounded-full border border-coral/30 bg-coral/10 px-3 py-1.5 text-[11px] font-bold !text-white"
                        >
                          <span className="truncate">
                            {player?.username ?? "Player"} · {playerCode(id)}
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove ${player?.username ?? "player"}`}
                            onClick={() =>
                              setSelectedPlayers((current) => current.filter((value) => value !== id))
                            }
                            className="shrink-0 !text-white/50 transition hover:!text-coral-light"
                          >
                            <X className="size-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-md bg-coral px-5 py-2.5 text-sm font-black uppercase text-white transition hover:bg-coral-dark"
            >
              Publish Announcement
            </button>

            <button
              type="button"
              onClick={() => (hasDraft ? setDiscardOpen(true) : resetComposer())}
              className="rounded-md border border-white/12 px-5 py-2.5 text-sm font-black uppercase !text-white/55 transition hover:border-white/30 hover:!text-white"
            >
              Cancel
            </button>
          </div>
        </form>
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

      {/* DISCARD DRAFT CONFIRMATION */}
      {discardOpen && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
          onClick={() => setDiscardOpen(false)}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-xl border border-white/10 bg-[#182330] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-black uppercase !text-white">Discard this announcement?</h2>
            <p className="mt-2 text-sm !text-white/45">
              Nothing has been published yet. Discarding clears the title, message, and selected recipients.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDiscardOpen(false)}
                className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-black uppercase !text-white/50 transition hover:!text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resetComposer}
                className="rounded-md bg-coral px-4 py-2.5 text-xs font-black uppercase text-white transition hover:bg-coral-dark"
              >
                Discard
              </button>
            </div>
          </section>
        </div>
      )}

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
                        <span className="shrink-0 !text-white/40">{playerCode(Number(playerId))}</span>
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

      {/* UPLOAD UPDATE MODAL */}
      {uploadOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setUploadOpen(false)}
        >
          <form
            onSubmit={submitUpload}
            onClick={(event) => event.stopPropagation()}
            className="my-auto w-full max-w-2xl rounded-xl border border-white/10 bg-[#151c28] shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
              <h3 className="min-w-0 text-base font-black uppercase !text-white">Upload Update</h3>

              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="grid size-8 shrink-0 place-items-center rounded-md border border-white/10 !text-white/50 transition hover:!text-white"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
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

              <label className="mt-4 block text-[10px] font-black uppercase tracking-wider !text-white/45">
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

              <label className="mt-4 block text-[10px] font-black uppercase tracking-wider !text-white/45">
                Release Notes
                <textarea
                  value={buildDraft.releaseNotes}
                  onChange={(event) =>
                    setBuildDraft((current) => ({ ...current, releaseNotes: event.target.value }))
                  }
                  rows={5}
                  placeholder="What changed in this build?"
                  className="admin-input mt-2 w-full resize-y rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.07] px-5 py-4">
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-black uppercase !text-white/60 transition hover:!text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md bg-[#d9a514] px-5 py-2.5 text-xs font-black uppercase text-[#101923] transition hover:bg-[#e6b62b]"
              >
                <UploadCloud className="size-4" />
                Submit Update
              </button>
            </div>
          </form>
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
