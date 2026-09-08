import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Eye,
  Mail,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import {
  players as initialPlayers,
  getPlayerAccountInfo,
  getPlayerActivity,
  getPlayerProductionStats,
  getPlayerTransactions,
} from "@/lib/admin-demo-data";

export const Route = createFileRoute("/admin/players")({
  head: () => ({
    meta: [
      {
        title: "Players — Crew On Set! Admin",
      },
      {
        name: "description",
        content: "Review and manage Crew On Set! player accounts.",
      },
    ],
  }),
  component: PlayersPage,
});

type PlayerStatus = "Active" | "Inactive" | "Banned";

type Player = {
  id: number;
  username: string;
  email: string;
  status: PlayerStatus;
  joined: string;
  score: number;
  role?: string;
  bannedUntil?: string | null;
};

type SortKey = "playtime" | "score" | "joined" | "gamesPlayed";

type SortDirection = "asc" | "desc";

/* =========================================================
   FILTER OPTIONS
   ========================================================= */

const roleOptions = [
  "All Roles",
  "Director",
  "Cameraman",
  "AV Technician",
  "Editor",
  "All-Rounder",
];

const filterOptions = ["Role", "Joined Date", "Level", "Production Score", "Playtime"];

/* =========================================================
   STATUS STYLES
   ========================================================= */

const statusStyles: Record<PlayerStatus, string> = {
  Active: "text-[#54c9b8]",
  Inactive: "text-white/40",
  Banned: "text-[#ff6248]",
};

const statusDotStyles: Record<PlayerStatus, string> = {
  Active: "bg-[#39b7a5]",
  Inactive: "bg-white/25",
  Banned: "bg-[#ff6248]",
};

/* =========================================================
   HELPERS
   ========================================================= */

function getLevel(score: number) {
  return Math.max(1, Math.floor(score / 100));
}

function getGamesPlayed(score: number) {
  return Math.max(1, Math.floor(score / 35));
}

function getDefaultBanUntil() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function getPlaytimeMinutes(score: number) {
  const hours = Math.max(1, Math.floor(score / 70));

  const minutes = Math.floor(score % 60);

  return hours * 60 + minutes;
}

function getPlaytime(score: number) {
  const hours = Math.max(1, Math.floor(score / 70));

  const minutes = Math.floor(score % 60);

  return `${hours}h ${minutes}m`;
}

function getInitials(username: string) {
  const clean = username.replace(/[^a-zA-Z0-9]/g, "");

  if (!clean) {
    return "PL";
  }

  return clean.slice(0, 2).toUpperCase();
}

/* =========================================================
   DATE HELPER

   Converts:
   "Jul 18, 2026"

   into:
   "2026-07-18"

   so it can be compared with the
   HTML calendar input.
   ========================================================= */

function getPlayerDateValue(joined: string) {
  if (!joined) {
    return "";
  }

  const parsed = new Date(joined);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();

  const month = String(parsed.getMonth() + 1).padStart(2, "0");

  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =========================================================
   PAGE
   ========================================================= */

function PlayersPage() {
  /* =======================================================
     PLAYER DATA
     ======================================================= */

  const [playerList, setPlayerList] = useState<Player[]>([]);

  /* =======================================================
     PENDING SEARCH

     These are what the user is currently typing/selecting.

     THEY DO NOT FILTER THE TABLE YET.
     ======================================================= */

  const [query, setQuery] = useState("");

  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const [status, setStatus] = useState("All Statuses");

  const [role, setRole] = useState("All Roles");

  const [joinedFilter, setJoinedFilter] = useState("");

  const [levelFilter, setLevelFilter] = useState("");

  const [scoreFilter, setScoreFilter] = useState("");

  const [playtimeFilter, setPlaytimeFilter] = useState("");

  /* =======================================================
     APPLIED SEARCH / FILTERS

     THESE are the values actually used to filter
     the player table.

     They only update when SEARCH is clicked.
     ======================================================= */

  const [appliedQuery, setAppliedQuery] = useState("");

  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);

  const [appliedStatus, setAppliedStatus] = useState("All Statuses");

  const [appliedRole, setAppliedRole] = useState("All Roles");

  const [appliedJoinedFilter, setAppliedJoinedFilter] = useState("");

  const [appliedLevelFilter, setAppliedLevelFilter] = useState("");

  const [appliedScoreFilter, setAppliedScoreFilter] = useState("");

  const [appliedPlaytimeFilter, setAppliedPlaytimeFilter] = useState("");

  // When true, the table is forced to show the original
  // unfiltered player list immediately. Search turns this off again.
  const [forceUnfiltered, setForceUnfiltered] = useState(false);

  /* =======================================================
     FILTER MENU
     ======================================================= */

  const [showFilterMenu, setShowFilterMenu] = useState(false);

  /* =======================================================
     PLAYER SELECTION
     ======================================================= */

  // Drag-select state. This lets the admin hold the mouse button
  // and drag across player rows to select a range.
  const dragStartIndex = useRef<number | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    function handleMouseUp() {
      dragStartIndex.current = null;
      isDragging.current = false;
    }

    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  function handleRowMouseDown(index: number) {
    dragStartIndex.current = index;
    isDragging.current = false;
  }

  function handleRowMouseEnter(index: number) {
    if (dragStartIndex.current === null) {
      return;
    }

    isDragging.current = true;

    const start = dragStartIndex.current;
    const end = index;
    const from = Math.min(start, end);
    const to = Math.max(start, end);

    const rangeIds = sortedPlayers.slice(from, to + 1).map((player) => player.id);

    setSelectedPlayers((current) => {
      const ids = new Set(current);

      rangeIds.forEach((id) => {
        ids.add(id);
      });

      return Array.from(ids);
    });
  }

  function handleRowClick(id: number) {
    if (isDragging.current) {
      return;
    }

    togglePlayerSelection(id);
  }

  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  /* =======================================================
     SORTING
     ======================================================= */

  const [sortKey, setSortKey] = useState<SortKey | null>(null);

  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  /* =======================================================
     BULK STATUS
     ======================================================= */

  const [showBulkStatus, setShowBulkStatus] = useState(false);

  const [bulkStatus, setBulkStatus] = useState<PlayerStatus>("Active");

  const [bulkBanUntil, setBulkBanUntil] = useState(getDefaultBanUntil());

  /* =======================================================
     CONFIRMATION
     ======================================================= */

  const [confirmAction, setConfirmAction] = useState<
    | {
        type: "delete" | "reset";

        id: number;
      }
    | {
        type: "mass-delete" | "mass-reset";

        ids: number[];
      }
    | null
  >(null);

  /* =========================================================
     LOAD PLAYERS
     ========================================================= */

  useEffect(() => {
    setPlayerList(
      initialPlayers.map(
        (player) =>
          ({
            ...player,
          }) as Player,
      ),
    );
  }, []);

  /* =========================================================
     APPLY SEARCH + FILTERS

     THIS IS ONLY CALLED WHEN THE USER CLICKS SEARCH.
     ========================================================= */

  function applyFilters() {
    // Search is the only action that commits the pending controls.
    setForceUnfiltered(false);

    setAppliedQuery(query);

    setAppliedFilters([...activeFilters]);

    setAppliedStatus(status);

    setAppliedRole(role);

    setAppliedJoinedFilter(joinedFilter);

    setAppliedLevelFilter(levelFilter);

    setAppliedScoreFilter(scoreFilter);

    setAppliedPlaytimeFilter(playtimeFilter);

    setShowFilterMenu(false);
  }

  /* =========================================================
     FILTER MENU
     ========================================================= */

  function toggleFilter(filter: string) {
    setActiveFilters((current) => {
      if (current.includes(filter)) {
        return current.filter((item) => item !== filter);
      }

      return [...current, filter];
    });
  }

  function removeFilter(filter: string) {
    // Removing an already-applied filter is an immediate reset.
    // The table returns to the original unfiltered state without
    // requiring the Search button.
    setActiveFilters((current) => current.filter((item) => item !== filter));

    if (filter === "Status") {
      setStatus("All Statuses");
    }

    if (filter === "Role") {
      setRole("All Roles");
    }

    if (filter === "Joined Date") {
      setJoinedFilter("");
    }

    if (filter === "Level") {
      setLevelFilter("");
    }

    if (filter === "Production Score") {
      setScoreFilter("");
    }

    if (filter === "Playtime") {
      setPlaytimeFilter("");
    }

    // Immediately revert the displayed table to its original state.
    setAppliedQuery("");
    setAppliedStatus("All Statuses");
    setAppliedRole("All Roles");
    setAppliedJoinedFilter("");
    setAppliedLevelFilter("");
    setAppliedScoreFilter("");
    setAppliedPlaytimeFilter("");
    setAppliedFilters([]);
    setForceUnfiltered(true);
  }

  function clearAllFilters() {
    // CLEAR ALL IS AN IMMEDIATE RESET.
    // The table must return to the original unfiltered player list
    // right now. No Search click is required.

    setActiveFilters([]);
    setStatus("All Statuses");
    setRole("All Roles");
    setJoinedFilter("");
    setLevelFilter("");
    setScoreFilter("");
    setPlaytimeFilter("");
    setShowFilterMenu(false);

    setAppliedQuery("");
    setAppliedFilters([]);
    setAppliedStatus("All Statuses");
    setAppliedRole("All Roles");
    setAppliedJoinedFilter("");
    setAppliedLevelFilter("");
    setAppliedScoreFilter("");
    setAppliedPlaytimeFilter("");

    // This is what makes the visible table immediately unfiltered.
    setForceUnfiltered(true);
  }

  /* =========================================================
     FILTERED PLAYERS

     IMPORTANT:
     ONLY APPLIED VALUES ARE USED HERE.

     This prevents the table from changing immediately
     while the user is configuring filters.
     ========================================================= */

  const filteredPlayers = useMemo(() => {
    if (forceUnfiltered) {
      return playerList;
    }

    return playerList.filter((player) => {
      /* ===============================================
             SEARCH
             =============================================== */

      const search = appliedQuery.trim().toLowerCase();

      const matchesSearch =
        !search ||
        [player.username, player.email, String(player.id), player.joined]
          .join(" ")
          .toLowerCase()
          .includes(search);

      /* ===============================================
             STATUS
             =============================================== */

      const matchesStatus =
        !appliedFilters.includes("Status") ||
        appliedStatus === "All Statuses" ||
        player.status === appliedStatus;

      /* ===============================================
             ROLE
             =============================================== */

      const playerRole = player.role || "Player";

      const matchesRole =
        !appliedFilters.includes("Role") ||
        appliedRole === "All Roles" ||
        playerRole.toLowerCase() === appliedRole.toLowerCase();

      /* ===============================================
             JOINED DATE
             =============================================== */

      const matchesJoinedDate =
        !appliedFilters.includes("Joined Date") ||
        !appliedJoinedFilter ||
        getPlayerDateValue(player.joined) === appliedJoinedFilter;

      /* ===============================================
             LEVEL
             =============================================== */

      const playerLevel = getLevel(player.score);

      const levelValue = Number(appliedLevelFilter);

      const matchesLevel =
        !appliedFilters.includes("Level") ||
        !appliedLevelFilter ||
        (Number.isFinite(levelValue) && playerLevel >= levelValue);

      /* ===============================================
             PRODUCTION SCORE
             =============================================== */

      const scoreValue = Number(appliedScoreFilter);

      const matchesScore =
        !appliedFilters.includes("Production Score") ||
        !appliedScoreFilter ||
        (Number.isFinite(scoreValue) && player.score >= scoreValue);

      /* ===============================================
             PLAYTIME
             =============================================== */

      const playtimeHours = getPlaytimeMinutes(player.score) / 60;

      const playtimeValue = Number(appliedPlaytimeFilter);

      const matchesPlaytime =
        !appliedFilters.includes("Playtime") ||
        !appliedPlaytimeFilter ||
        (Number.isFinite(playtimeValue) && playtimeHours >= playtimeValue);

      /* ===============================================
             FINAL RESULT
             =============================================== */

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRole &&
        matchesJoinedDate &&
        matchesLevel &&
        matchesScore &&
        matchesPlaytime
      );
    });
  }, [
    playerList,
    forceUnfiltered,
    appliedQuery,
    appliedFilters,
    appliedStatus,
    appliedRole,
    appliedJoinedFilter,
    appliedLevelFilter,
    appliedScoreFilter,
    appliedPlaytimeFilter,
  ]);

  /* =========================================================
     SORTED PLAYERS
     ========================================================= */

  const sortedPlayers = useMemo(() => {
    if (!sortKey) {
      return filteredPlayers;
    }

    return [...filteredPlayers].sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      switch (sortKey) {
        case "playtime":
          aValue = getPlaytimeMinutes(a.score);

          bValue = getPlaytimeMinutes(b.score);

          break;

        case "score":
          aValue = a.score;

          bValue = b.score;

          break;

        case "joined":
          aValue = new Date(a.joined).getTime();

          bValue = new Date(b.joined).getTime();

          break;

        case "gamesPlayed":
          aValue = getGamesPlayed(a.score);

          bValue = getGamesPlayed(b.score);

          break;
      }

      if (aValue === bValue) {
        return 0;
      }

      const result = aValue > bValue ? 1 : -1;

      return sortDirection === "asc" ? result : -result;
    });
  }, [filteredPlayers, sortKey, sortDirection]);

  /* =========================================================
     SORT
     ========================================================= */

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);

      setSortDirection("asc");

      return;
    }

    if (sortDirection === "asc") {
      setSortDirection("desc");

      return;
    }

    setSortKey(null);

    setSortDirection("desc");
  }

  /* =========================================================
     SELECTION
     ========================================================= */

  const allVisibleSelected =
    sortedPlayers.length > 0 &&
    sortedPlayers.every((player) => selectedPlayers.includes(player.id));

  function togglePlayerSelection(id: number) {
    setSelectedPlayers((current) =>
      current.includes(id) ? current.filter((playerId) => playerId !== id) : [...current, id],
    );
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedPlayers((current) =>
        current.filter((id) => !sortedPlayers.some((player) => player.id === id)),
      );

      return;
    }

    setSelectedPlayers((current) => {
      const ids = new Set(current);

      sortedPlayers.forEach((player) => {
        ids.add(player.id);
      });

      return Array.from(ids);
    });
  }

  /* =========================================================
     PLAYER ACTIONS
     ========================================================= */

  function deletePlayer(id: number) {
    setPlayerList((current) => current.filter((player) => player.id !== id));

    setSelectedPlayers((current) => current.filter((playerId) => playerId !== id));

    if (selectedPlayer?.id === id) {
      setSelectedPlayer(null);
    }
  }

  function resetPlayer(id: number) {
    setPlayerList((current) =>
      current.map((player) =>
        player.id === id
          ? {
              ...player,
              score: 0,
              status: "Active",
              bannedUntil: null,
            }
          : player,
      ),
    );
  }

  function deleteSelectedPlayers() {
    setPlayerList((current) => current.filter((player) => !selectedPlayers.includes(player.id)));

    setSelectedPlayers([]);

    setSelectedPlayer(null);
  }

  function resetSelectedPlayers() {
    setPlayerList((current) =>
      current.map((player) =>
        selectedPlayers.includes(player.id)
          ? {
              ...player,
              score: 0,
              status: "Active",
              bannedUntil: null,
            }
          : player,
      ),
    );
  }

  /* =========================================================
     BULK STATUS
     ========================================================= */

  function applyBulkStatus() {
    setPlayerList((current) =>
      current.map((player) =>
        selectedPlayers.includes(player.id)
          ? {
              ...player,
              status: bulkStatus,
              bannedUntil: bulkStatus === "Banned" ? bulkBanUntil : null,
            }
          : player,
      ),
    );

    setShowBulkStatus(false);
  }

  /* =========================================================
     SORT HEADER
     ========================================================= */

  function SortableHeader({ label, sort }: { label: string; sort: SortKey }) {
    const active = sortKey === sort;

    return (
      <th className="px-4 py-3 text-left">
        <button
          type="button"
          onClick={() => handleSort(sort)}
          className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.08em] transition ${
            active ? "text-white/75" : "text-white/30 hover:text-white/60"
          }`}
        >
          {label}

          {active &&
            (sortDirection === "asc" ? (
              <ArrowUp className="size-3 text-[#39b7a5]" />
            ) : (
              <ArrowDown className="size-3 text-[#39b7a5]" />
            ))}
        </button>
      </th>
    );
  }

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0d1217] text-white">
      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <header className="shrink-0 border-b border-white/[.06] px-5 pb-6 pt-7">
        <p className="text-xs font-black tracking-[.18em] text-[#ff6248]">COMMUNITY</p>

        <h1 className="mt-2 text-[30px] font-black uppercase leading-none tracking-[-.025em] text-white">
          Player Management
        </h1>

        <p className="mt-2 text-sm text-white/40">Search, review, and manage registered players.</p>
      </header>

      {/* =====================================================
          SEARCH + FILTER BAR
          ===================================================== */}

      <section className="shrink-0 px-4 py-4">
        <div className="rounded-lg border border-white/[.07] bg-[#151c21] p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            {/* =================================================
                MAIN SEARCH
                ================================================= */}

            <label className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/25" />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applyFilters();
                  }
                }}
                placeholder="Search username, email, player ID, or joined date"
                className="h-10 w-full rounded-md border border-white/10 bg-[#090e12] pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/25 focus:border-white/20"
              />
            </label>

            {/* =================================================
                SEARCH BUTTON

                THIS NOW ACTUALLY APPLIES THE SEARCH
                AND ALL FILTERS.
                ================================================= */}

            <button
              type="button"
              onClick={applyFilters}
              className="flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-[#11171b] px-5 text-xs font-bold text-white/55 transition hover:border-white/20 hover:bg-white/[.04] hover:text-white"
            >
              <Search className="size-3.5" />
              Search
            </button>

            {/* =================================================
                ADD FILTER
                ================================================= */}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilterMenu((current) => !current)}
                className={`flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-xs font-bold transition ${
                  showFilterMenu || activeFilters.length > 0
                    ? "border-white/20 bg-white/[.06] text-white/75"
                    : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/75"
                }`}
              >
                <span className="text-sm">+</span>
                Add Filter
                {activeFilters.length > 0 && (
                  <span className="grid min-w-4 place-items-center rounded-full bg-[#39b7a5] px-1 text-[8px] font-black text-[#08100f]">
                    {activeFilters.length}
                  </span>
                )}
                <ChevronDown
                  className={`size-3 transition-transform ${showFilterMenu ? "rotate-180" : ""}`}
                />
              </button>

              {/* =================================================
                  FILTER DROPDOWN
                  ================================================= */}

              {showFilterMenu && (
                <div className="absolute right-0 top-12 z-50 w-[290px] rounded-lg border border-white/10 bg-[#151c21] p-3 shadow-2xl">
                  <div className="mb-3 border-b border-white/[.06] pb-3">
                    <p className="text-[9px] font-black uppercase tracking-[.16em] text-white/30">
                      Filters
                    </p>

                    <p className="mt-1 text-[10px] text-white/25">
                      Choose the filters you want to apply.
                    </p>
                  </div>

                  {/* =================================================
                      STATUS
                      ================================================= */}

                  <button
                    type="button"
                    onClick={() => toggleFilter("Status")}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition ${
                      activeFilters.includes("Status") ? "bg-white/[.07]" : "hover:bg-white/[.04]"
                    }`}
                  >
                    <span
                      className={`grid size-4 place-items-center rounded border ${
                        activeFilters.includes("Status")
                          ? "border-[#39b7a5] bg-[#39b7a5] text-[#08100f]"
                          : "border-white/15"
                      }`}
                    >
                      {activeFilters.includes("Status") && (
                        <Check className="size-2.5 stroke-[4]" />
                      )}
                    </span>

                    <span className="text-[11px] font-bold text-white/55">All Statuses</span>
                  </button>

                  {/* =================================================
                      OTHER FILTERS
                      ================================================= */}

                  {filterOptions.map((filter) => {
                    const active = activeFilters.includes(filter);

                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => toggleFilter(filter)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition ${
                          active ? "bg-white/[.07]" : "hover:bg-white/[.04]"
                        }`}
                      >
                        <span
                          className={`grid size-4 place-items-center rounded border ${
                            active
                              ? "border-[#39b7a5] bg-[#39b7a5] text-[#08100f]"
                              : "border-white/15"
                          }`}
                        >
                          {active && <Check className="size-2.5 stroke-[4]" />}
                        </span>

                        <span
                          className={`text-[11px] font-bold ${
                            active ? "text-white/75" : "text-white/45"
                          }`}
                        >
                          {filter}
                        </span>
                      </button>
                    );
                  })}

                  {activeFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="mt-3 w-full border-t border-white/[.06] pt-3 text-[9px] font-black uppercase tracking-wide text-[#ff6248] hover:text-[#ff806b]"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* =====================================================
              FILTER INPUTS

              CHANGES HERE DO NOT AFFECT THE TABLE UNTIL
              SEARCH IS CLICKED.
              ===================================================== */}

          {activeFilters.length > 0 && (
            <div className="mt-4 border-t border-white/[.06] pt-4">
              <div className="flex flex-wrap items-end gap-3">
                {/* =================================================
                    STATUS
                    ================================================= */}

                {activeFilters.includes("Status") && (
                  <div className="min-w-[180px]">
                    <label className="mb-1.5 block text-[8px] font-black uppercase tracking-[.12em] text-white/30">
                      Status
                    </label>

                    <div className="relative">
                      <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="h-9 w-full appearance-none rounded-md border border-white/10 bg-[#11171b] px-3 pr-8 text-[10px] font-bold text-white/60 outline-none focus:border-[#39b7a5]"
                      >
                        <option>All Statuses</option>

                        <option>Active</option>

                        <option>Inactive</option>

                        <option>Banned</option>
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-white/25" />
                    </div>
                  </div>
                )}

                {/* =================================================
                    ROLE
                    ================================================= */}

                {activeFilters.includes("Role") && (
                  <div className="min-w-[180px]">
                    <label className="mb-1.5 block text-[8px] font-black uppercase tracking-[.12em] text-white/30">
                      Role
                    </label>

                    <div className="relative">
                      <select
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        className="h-9 w-full appearance-none rounded-md border border-white/10 bg-[#11171b] px-3 pr-8 text-[10px] font-bold text-white/60 outline-none focus:border-[#39b7a5]"
                      >
                        {roleOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-white/25" />
                    </div>
                  </div>
                )}

                {/* =================================================
                    JOINED DATE
                    ================================================= */}

                {activeFilters.includes("Joined Date") && (
                  <div className="min-w-[190px]">
                    <label className="mb-1.5 block text-[8px] font-black uppercase tracking-[.12em] text-white/30">
                      Joined Date
                    </label>

                    <input
                      type="date"
                      value={joinedFilter}
                      onChange={(event) => setJoinedFilter(event.target.value)}
                      className="h-9 w-full rounded-md border border-white/10 bg-[#090e12] px-3 text-[10px] font-bold text-white/65 outline-none focus:border-[#39b7a5] [color-scheme:dark]"
                    />
                  </div>
                )}

                {/* =================================================
                    LEVEL
                    ================================================= */}

                {activeFilters.includes("Level") && (
                  <div className="min-w-[150px]">
                    <label className="mb-1.5 block text-[8px] font-black uppercase tracking-[.12em] text-white/30">
                      Minimum Level
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={levelFilter}
                      onChange={(event) => setLevelFilter(event.target.value)}
                      placeholder="e.g. 50"
                      className="h-9 w-full rounded-md border border-white/10 bg-[#090e12] px-3 text-[10px] text-white outline-none placeholder:text-white/20 focus:border-[#39b7a5]"
                    />
                  </div>
                )}

                {/* =================================================
                    PRODUCTION SCORE
                    ================================================= */}

                {activeFilters.includes("Production Score") && (
                  <div className="min-w-[190px]">
                    <label className="mb-1.5 block text-[8px] font-black uppercase tracking-[.12em] text-white/30">
                      Minimum Score
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={scoreFilter}
                      onChange={(event) => setScoreFilter(event.target.value)}
                      placeholder="e.g. 5000"
                      className="h-9 w-full rounded-md border border-white/10 bg-[#090e12] px-3 text-[10px] text-white outline-none placeholder:text-white/20 focus:border-[#39b7a5]"
                    />
                  </div>
                )}

                {/* =================================================
                    PLAYTIME
                    ================================================= */}

                {activeFilters.includes("Playtime") && (
                  <div className="min-w-[170px]">
                    <label className="mb-1.5 block text-[8px] font-black uppercase tracking-[.12em] text-white/30">
                      Minimum Hours
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={playtimeFilter}
                      onChange={(event) => setPlaytimeFilter(event.target.value)}
                      placeholder="e.g. 50"
                      className="h-9 w-full rounded-md border border-white/10 bg-[#090e12] px-3 text-[10px] text-white outline-none placeholder:text-white/20 focus:border-[#39b7a5]"
                    />
                  </div>
                )}

                {/* =================================================
                    REMOVE FILTER BUTTONS
                    ================================================= */}

                {activeFilters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => removeFilter(filter)}
                    className="flex h-9 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-[9px] font-bold text-white/35 transition hover:border-[#ff6248]/30 hover:text-[#ff6248]"
                  >
                    <X className="size-3" />

                    {filter === "Status" ? "Status" : filter}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          PLAYER TABLE
          ===================================================== */}

      <section className="min-h-0 flex-1 overflow-hidden px-4 pb-4">
        <div className="h-full overflow-hidden rounded-lg border border-white/[.07] bg-[#11171b]">
          <div className="h-full overflow-auto">
            <table className="min-w-[1450px] w-full border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-white/[.06] bg-[#151c21]">
                  <th className="w-12 px-4 py-3">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className={`grid size-3.5 place-items-center rounded border ${
                        allVisibleSelected
                          ? "border-[#39b7a5] bg-[#39b7a5] text-[#08100f]"
                          : "border-white/15"
                      }`}
                    >
                      {allVisibleSelected && <Check className="size-2.5 stroke-[4]" />}
                    </button>
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[.08em] text-white/30">
                    Player
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[.08em] text-white/30">
                    Email
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[.08em] text-white/30">
                    Crew ID
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[.08em] text-white/30">
                    Role
                  </th>

                  <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[.08em] text-white/30">
                    Status
                  </th>

                  <SortableHeader label="Playtime" sort="playtime" />

                  <SortableHeader label="Score" sort="score" />

                  <SortableHeader label="Joined" sort="joined" />

                  <SortableHeader label="Games Played" sort="gamesPlayed" />

                  <th className="w-[150px] px-4 py-3 text-right text-[9px] font-black uppercase tracking-[.08em] text-white/30">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedPlayers.map((player) => {
                  const isSelected = selectedPlayers.includes(player.id);

                  return (
                    <tr
                      key={player.id}
                      onMouseDown={() =>
                        handleRowMouseDown(sortedPlayers.findIndex((item) => item.id === player.id))
                      }
                      onMouseEnter={() =>
                        handleRowMouseEnter(
                          sortedPlayers.findIndex((item) => item.id === player.id),
                        )
                      }
                      onClick={() => handleRowClick(player.id)}
                      className={`group cursor-pointer border-b border-white/[.045] transition select-none ${
                        isSelected ? "bg-[#263635]" : "hover:bg-white/[.025]"
                      }`}
                    >
                      {/* CHECKBOX */}

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();

                            togglePlayerSelection(player.id);
                          }}
                          className={`grid size-3.5 place-items-center rounded border ${
                            isSelected
                              ? "border-[#39b7a5] bg-[#39b7a5] text-[#08100f]"
                              : "border-white/15"
                          }`}
                        >
                          {isSelected && <Check className="size-2.5 stroke-[4]" />}
                        </button>
                      </td>

                      {/* PLAYER */}

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-[#222b31] text-[9px] font-black text-white/55">
                            {getInitials(player.username)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white/75 group-hover:text-white">
                              {player.username}
                            </p>

                            <p className="mt-0.5 text-[9px] text-white/25">
                              Level {getLevel(player.score)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* EMAIL */}

                      <td className="px-4 py-3">
                        <span className="text-[11px] text-white/40">{player.email}</span>
                      </td>

                      {/* CREW ID */}

                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] text-white/35">
                          COS-
                          {String(player.id).padStart(4, "0")}
                        </span>
                      </td>

                      {/* ROLE */}

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-[#f5b82e]" />

                          <span className="text-[10px] font-bold uppercase text-white/45">
                            {player.role || "Player"}
                          </span>
                        </div>
                      </td>

                      {/* STATUS */}

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${statusDotStyles[player.status]}`}
                          />

                          <span
                            className={`text-[10px] font-bold uppercase ${statusStyles[player.status]}`}
                          >
                            {player.status}
                          </span>
                        </div>
                      </td>

                      {/* PLAYTIME */}

                      <td className="px-4 py-3">
                        <span className="text-[10px] text-white/45">
                          {getPlaytime(player.score)}
                        </span>
                      </td>

                      {/* SCORE */}

                      <td className="px-4 py-3">
                        <span className="text-[11px] font-bold text-white/60">
                          {player.score.toLocaleString()}
                        </span>
                      </td>

                      {/* JOINED */}

                      <td className="px-4 py-3">
                        <span className="text-[10px] text-white/35">{player.joined}</span>
                      </td>

                      {/* GAMES */}

                      <td className="px-4 py-3">
                        <span className="text-[10px] text-white/40">
                          {getGamesPlayed(player.score)}
                        </span>
                      </td>

                      {/* ACTION */}

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();

                            setSelectedPlayer(player);
                          }}
                          className="ml-auto flex items-center gap-2 rounded-md border border-[#39b7a5]/20 bg-[#39b7a5]/10 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-[#54c9b8] opacity-0 transition group-hover:opacity-100"
                        >
                          <Eye className="size-3.5" />
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {sortedPlayers.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-20 text-center">
                      <Users className="mx-auto size-8 text-white/10" />

                      <p className="mt-4 text-sm font-bold text-white/40">No players found</p>

                      <p className="mt-1 text-xs text-white/20">
                        Try adjusting your search or filters.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* =====================================================
          BULK ACTION BAR
          ===================================================== */}

      <section className="shrink-0 border-t border-white/[.07] bg-[#171f23] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-white/50">
              {selectedPlayers.length} {selectedPlayers.length === 1 ? "player" : "players"}{" "}
              selected
            </span>

            {selectedPlayers.length > 0 && (
              <button
                onClick={() => setSelectedPlayers([])}
                className="text-[10px] font-bold text-white/25 hover:text-white/60"
              >
                Clear
              </button>
            )}
          </div>

          {selectedPlayers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {/* STATUS */}

              <div className="relative">
                <button
                  onClick={() => setShowBulkStatus((current) => !current)}
                  className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-[10px] font-bold text-white/50 hover:border-white/20 hover:text-white/75"
                >
                  <ShieldCheck className="size-3.5" />
                  Change Status
                  <ChevronDown className="size-3" />
                </button>

                {showBulkStatus && (
                  <div className="absolute bottom-11 right-0 z-50 w-52 rounded-lg border border-white/10 bg-[#151c21] p-3 shadow-2xl">
                    <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-white/30">
                      Set status
                    </p>

                    {(["Active", "Inactive", "Banned"] as PlayerStatus[]).map((option) => (
                      <button
                        key={option}
                        onClick={() => setBulkStatus(option)}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-white/[.04]"
                      >
                        <span className={`size-2 rounded-full ${statusDotStyles[option]}`} />

                        <span className={`text-xs font-bold ${statusStyles[option]}`}>
                          {option}
                        </span>

                        {bulkStatus === option && (
                          <Check className="ml-auto size-3 text-[#39b7a5]" />
                        )}
                      </button>
                    ))}

                    {bulkStatus === "Banned" && (
                      <div className="mt-2 border-t border-white/[.06] pt-3">
                        <label className="block">
                          <span className="text-[9px] font-black uppercase tracking-[.12em] text-white/35">
                            Banned Until
                          </span>

                          <input
                            type="datetime-local"
                            value={bulkBanUntil}
                            min={(() => {
                              const now = new Date();
                              const pad = (value: number) => String(value).padStart(2, "0");

                              return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
                                now.getDate(),
                              )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                            })()}
                            onChange={(event) => setBulkBanUntil(event.target.value)}
                            className="mt-1.5 h-9 w-full rounded-md border border-white/10 bg-[#0d1217] px-2.5 text-[10px] font-bold text-white/70 outline-none transition focus:border-[#ff6248]/60 focus:ring-1 focus:ring-[#ff6248]/20"
                          />

                          <p className="mt-1.5 text-[8px] leading-4 text-white/25">
                            Select the exact date and time when the ban expires.
                          </p>
                        </label>
                      </div>
                    )}

                    <button
                      onClick={applyBulkStatus}
                      className="mt-2 w-full rounded-md bg-[#ff6248] py-2 text-[10px] font-black uppercase text-white"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* RESET */}

              <button
                onClick={() =>
                  setConfirmAction({
                    type: "mass-reset",
                    ids: [...selectedPlayers],
                  })
                }
                className="flex items-center gap-2 rounded-md border border-[#f5c431]/25 px-3 py-2 text-[10px] font-bold text-[#f5c431] hover:bg-[#f5c431] hover:text-[#101923]"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </button>

              {/* DELETE */}

              <button
                onClick={() =>
                  setConfirmAction({
                    type: "mass-delete",
                    ids: [...selectedPlayers],
                  })
                }
                className="flex items-center gap-2 rounded-md border border-[#ff6248]/30 bg-[#ff6248]/10 px-3 py-2 text-[10px] font-black uppercase text-[#ff6248] hover:bg-[#ff6248] hover:text-white"
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          PLAYER PROFILE POPUP
          ===================================================== */}

      {selectedPlayer && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedPlayer(null)}
        >
          <div
            className="relative flex max-h-[94vh] w-full max-w-[1150px] flex-col overflow-hidden rounded-xl border border-white/[.08] bg-[#151c28] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* CLOSE */}

            <button
              onClick={() => setSelectedPlayer(null)}
              className="absolute right-4 top-4 z-20 grid size-9 place-items-center rounded-full border border-white/10 bg-black/20 text-white/40 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>

            {/* PROFILE HEADER */}

            <div className="shrink-0 border-b border-white/[.06] bg-[#0d121b] px-8 py-7">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="grid size-[105px] place-items-center rounded-2xl border-2 border-[#f5c431] bg-[#202a3a] text-3xl font-black text-white/70">
                    {getInitials(selectedPlayer.username)}
                  </div>

                  <span
                    className={`absolute bottom-2 right-2 size-4 rounded-full border-[3px] border-[#151c28] ${statusDotStyles[selectedPlayer.status]}`}
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-3xl font-black uppercase text-white">
                      {selectedPlayer.username}
                    </h2>

                    <span
                      className={`rounded-full bg-white/[.06] px-3 py-1 text-[9px] font-black uppercase ${statusStyles[selectedPlayer.status]}`}
                    >
                      {selectedPlayer.status}
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-[#f5c431]">
                    {selectedPlayer.role || "Player"}
                  </p>

                  <div className="mt-3 flex gap-3 text-[10px] font-black uppercase text-white/25">
                    <span>LEVEL {getLevel(selectedPlayer.score)}</span>

                    <span>•</span>

                    <span>
                      COS-
                      {String(selectedPlayer.id).padStart(4, "0")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PROFILE BODY */}

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid gap-10 p-8 lg:grid-cols-[1fr_300px]">
                {/* =================================================
                    LEFT
                    ================================================= */}

                <div>
                  {/* BIO */}

                  <section>
                    <p className="text-[9px] font-black tracking-[.2em] text-[#ff6248]">ABOUT</p>

                    <h3 className="mt-3 text-2xl font-black uppercase text-white">BIO</h3>

                    <p className="mt-4 text-sm leading-7 text-white/40">
                      This player has not added a biography yet.
                    </p>
                  </section>

                  {/* CAREER */}

                  <section className="mt-10">
                    <h3 className="flex items-center gap-3 text-2xl font-black uppercase text-white">
                      <span className="h-7 w-1 rounded-full bg-[#ff6248]" />
                      Career Overview
                    </h3>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/[.07] bg-[#1c2636] p-5">
                        <p className="text-3xl font-black text-white">
                          {selectedPlayer.score.toLocaleString()}
                        </p>

                        <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-white/30">
                          Production Score
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[.07] bg-[#1c2636] p-5">
                        <p className="text-3xl font-black text-white">
                          {getGamesPlayed(selectedPlayer.score)}
                        </p>

                        <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-white/30">
                          Games Played
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-white/[.07] bg-[#1c2636] p-5">
                      <p className="text-[9px] font-black uppercase tracking-wide text-white/30">
                        PLAYTIME
                      </p>

                      <p className="mt-2 text-lg font-black text-white/75">
                        {getPlaytime(selectedPlayer.score)}
                      </p>
                    </div>
                  </section>

                  {/* ADMIN ACTIONS */}

                  <section className="mt-10">
                    <h3 className="flex items-center gap-3 text-2xl font-black uppercase text-white">
                      <span className="h-7 w-1 rounded-full bg-[#ff6248]" />
                      Admin Actions
                    </h3>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = `mailto:${selectedPlayer.email}`;
                        }}
                        className="flex items-center gap-2 rounded-lg border border-white/[.08] bg-white/[.03] px-4 py-3 text-[10px] font-black uppercase text-white/50 hover:text-white"
                      >
                        <Mail className="size-3.5" />
                        Contact Player
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmAction({
                            type: "reset",
                            id: selectedPlayer.id,
                          })
                        }
                        className="flex items-center gap-2 rounded-lg border border-[#f5c431]/20 bg-[#f5c431]/5 px-4 py-3 text-[10px] font-black uppercase text-[#f5c431] hover:bg-[#f5c431] hover:text-[#101923]"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset Account
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmAction({
                            type: "delete",
                            id: selectedPlayer.id,
                          })
                        }
                        className="flex items-center gap-2 rounded-lg border border-[#ff6248]/20 bg-[#ff6248]/5 px-4 py-3 text-[10px] font-black uppercase text-[#ff6248] hover:bg-[#ff6248] hover:text-white"
                      >
                        <Trash2 className="size-3.5" />
                        Delete Player
                      </button>
                    </div>
                  </section>

                  {/* =================================================
                      RECENT ACTIVITY
                      ================================================= */}

                  <section className="mt-10">
                    <h3 className="flex items-center gap-3 text-2xl font-black uppercase text-white">
                      <span className="h-7 w-1 rounded-full bg-[#ff6248]" />
                      Recent Activity
                    </h3>

                    <div className="mt-5 space-y-3">
                      {getPlayerActivity(selectedPlayer.id, selectedPlayer.username).map(
                        (entry) => (
                          <div
                            key={entry.id}
                            className="rounded-xl border border-white/[.07] bg-[#1c2636] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-black uppercase text-white/75">
                                {entry.label}
                              </p>

                              <p className="text-[9px] text-white/25">{entry.timestamp}</p>
                            </div>

                            <p className="mt-1.5 text-xs text-white/45">{entry.detail}</p>
                          </div>
                        ),
                      )}
                    </div>
                  </section>

                  {/* =================================================
                      RELEVANT TRANSACTIONS
                      ================================================= */}

                  <section className="mt-10">
                    <h3 className="flex items-center gap-3 text-2xl font-black uppercase text-white">
                      <span className="h-7 w-1 rounded-full bg-[#ff6248]" />
                      Relevant Transactions
                    </h3>

                    <div className="mt-5 space-y-3">
                      {getPlayerTransactions(selectedPlayer.username).map((tx) => (
                        <div
                          key={tx.id}
                          className="rounded-xl border border-white/[.07] bg-[#1c2636] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-black uppercase text-white/75">{tx.type}</p>

                            <span className="rounded bg-white/[.06] px-2 py-1 text-[9px] font-black uppercase text-white/50">
                              {tx.status}
                            </span>
                          </div>

                          <p className="mt-1.5 text-xs text-white/45">{tx.item}</p>

                          <div className="mt-2 flex items-center justify-between text-[10px] text-white/30">
                            <span>{tx.date}</span>

                            <span className="font-bold text-white/55">{tx.amount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* =================================================
                    RIGHT COLUMN
                    ================================================= */}

                <aside>
                  {/* PLAYER INFORMATION */}

                  <div className="flex items-center gap-3">
                    <span className="h-6 w-1 rounded-full bg-[#ff6248]" />

                    <h3 className="text-[9px] font-black uppercase tracking-[.18em] text-[#ff6248]">
                      Player Information
                    </h3>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-xl border border-white/[.07]">
                    {[
                      ["Name", selectedPlayer.username],
                      ["Email", selectedPlayer.email],
                      ["Crew ID", `COS-${String(selectedPlayer.id).padStart(4, "0")}`],
                      ["Joined", selectedPlayer.joined],
                      ["Current Role", selectedPlayer.role || "Player"],
                      ["Level", `Level ${getLevel(selectedPlayer.score)}`],
                    ].map(([label, value], index, rows) => (
                      <div
                        key={label}
                        className={`p-4 ${
                          index < rows.length - 1 ? "border-b border-white/[.07]" : ""
                        }`}
                      >
                        <p className="text-[8px] font-black uppercase text-white/25">{label}</p>

                        <p className="mt-2 break-all text-xs font-bold text-white/60">{value}</p>
                      </div>
                    ))}

                    <div className="border-t border-white/[.07] p-4">
                      <p className="text-[8px] font-black uppercase text-white/25">Status</p>

                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${statusDotStyles[selectedPlayer.status]}`}
                        />

                        <span
                          className={`text-xs font-bold ${statusStyles[selectedPlayer.status]}`}
                        >
                          {selectedPlayer.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACCOUNT INFORMATION */}

                  <div className="mt-8 flex items-center gap-3">
                    <span className="h-6 w-1 rounded-full bg-[#ff6248]" />

                    <h3 className="text-[9px] font-black uppercase tracking-[.18em] text-[#ff6248]">
                      Account Information
                    </h3>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-xl border border-white/[.07]">
                    {(() => {
                      const account = getPlayerAccountInfo(selectedPlayer.id);

                      const rows = [
                        ["Platform", account.platform],
                        ["Device", account.device],
                        ["Login Method", account.loginMethod],
                        ["Two-Factor Auth", account.twoFactor],
                        ["Last Login", account.lastLogin],
                      ];

                      return rows.map(([label, value], index) => (
                        <div
                          key={label}
                          className={`p-4 ${
                            index < rows.length - 1 ? "border-b border-white/[.07]" : ""
                          }`}
                        >
                          <p className="text-[8px] font-black uppercase text-white/25">{label}</p>

                          <p className="mt-2 text-xs font-bold text-white/60">{value}</p>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* PRODUCTION STATISTICS */}

                  <div className="mt-8 flex items-center gap-3">
                    <span className="h-6 w-1 rounded-full bg-[#ff6248]" />

                    <h3 className="text-[9px] font-black uppercase tracking-[.18em] text-[#ff6248]">
                      Production Statistics
                    </h3>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-xl border border-white/[.07]">
                    {(() => {
                      const stats = getPlayerProductionStats(selectedPlayer.score);

                      const rows = [
                        ["Productions Completed", stats.productionsCompleted.toLocaleString()],
                        ["Average Crew Rating", `${stats.averageRating.toFixed(1)} / 5`],
                        ["On-Time Wrap Rate", `${stats.onTimeWrapRate}%`],
                        ["Favorite Role", stats.favoriteRole],
                        ["Best Set", stats.bestSet],
                      ];

                      return rows.map(([label, value], index) => (
                        <div
                          key={label}
                          className={`p-4 ${
                            index < rows.length - 1 ? "border-b border-white/[.07]" : ""
                          }`}
                        >
                          <p className="text-[8px] font-black uppercase text-white/25">{label}</p>

                          <p className="mt-2 text-xs font-bold text-white/60">{value}</p>
                        </div>
                      ));
                    })()}
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          CONFIRM MODAL
          ===================================================== */}

      {confirmAction && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-white/10 bg-[#151c28] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-black uppercase text-white">
              {confirmAction.type === "delete" && "Delete Player?"}

              {confirmAction.type === "reset" && "Reset Account?"}

              {confirmAction.type === "mass-delete" &&
                `Delete ${confirmAction.ids.length} Players?`}

              {confirmAction.type === "mass-reset" && `Reset ${confirmAction.ids.length} Accounts?`}
            </h3>

            <p className="mt-3 text-sm text-white/50">
              {confirmAction.type === "delete" &&
                "This permanently removes the player from the roster."}

              {confirmAction.type === "reset" &&
                "This resets the player's production score and restores their status to Active."}

              {confirmAction.type === "mass-delete" &&
                "This permanently removes all selected players from the roster."}

              {confirmAction.type === "mass-reset" &&
                "This resets the production score and status for all selected players."}
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-md border border-white/10 px-4 py-2 text-xs font-bold text-white/60 hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (confirmAction.type === "delete") {
                    deletePlayer(confirmAction.id);
                  }

                  if (confirmAction.type === "reset") {
                    resetPlayer(confirmAction.id);
                  }

                  if (confirmAction.type === "mass-delete") {
                    deleteSelectedPlayers();
                  }

                  if (confirmAction.type === "mass-reset") {
                    resetSelectedPlayers();
                  }

                  setConfirmAction(null);
                }}
                className={`rounded-md px-4 py-2 text-xs font-black uppercase ${
                  confirmAction.type === "delete" || confirmAction.type === "mass-delete"
                    ? "bg-[#ff6248] text-white"
                    : "bg-[#f5c431] text-[#101923]"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
