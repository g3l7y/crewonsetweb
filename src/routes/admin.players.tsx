import { createFileRoute } from "@tanstack/react-router";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  getPlayerTransactions,
  topUpsStore,
} from "@/lib/admin-demo-data";
import { notificationsStore, uid } from "@/lib/demo/store";
import { isMockMode } from "@/lib/playfab/config";
import { DEFAULT_PROFILE_PICTURE_URL } from "@/lib/profile-avatar";
import { useAdminPlayer, useAdminPlayers } from "@/lib/playfab/hooks";
import type { AdminPlayerDetails, PlayerProfile } from "@/lib/playfab/types";

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

type PlayerStatus = "Active" | "Banned";

type Player = {
  id: string;
  username: string;
  email: string;
  status: PlayerStatus;
  joined: string;
  score: number;
  role?: string;
  bannedUntil?: string | null;
  avatarUrl: string;
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

const filterOptions = ["Joined Date", "Level", "Production Score", "Playtime"];

/* =========================================================
   STATUS STYLES
   ========================================================= */

const statusStyles: Record<PlayerStatus, string> = {
  Active: "admin-player-status-active text-[#54c9b8]",
  Banned: "admin-player-status-banned text-[#ff6248]",
};

const statusDotStyles: Record<PlayerStatus, string> = {
  Active: "bg-[#39b7a5]",
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

function formatJoinedDate(value: string) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function mapPlayFabPlayer(player: PlayerProfile): Player {
  const id = player.playFabId || player.id || player.username;
  const username = player.username || player.displayName || `Player ${id}`;

  return {
    id,
    username,
    email: player.email || "—",
    status: player.adminStatus === "Banned" ? "Banned" : "Active",
    joined: formatJoinedDate(player.joinedAt),
    score: 0,
    role: player.primaryRole || player.role || "Player",
    avatarUrl: player.avatarUrl || DEFAULT_PROFILE_PICTURE_URL,
  };
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
  const mockMode = isMockMode();
  const realPlayersQuery = useAdminPlayers(!mockMode);
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

  function handleRowClick(id: string) {
    if (isDragging.current) {
      return;
    }

    togglePlayerSelection(id);
  }

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const realPlayerDetailQuery = useAdminPlayer(
    !mockMode && selectedPlayer ? selectedPlayer.id : "",
  );
  const [topUps] = topUpsStore.useStore();
  const selectedPlayerTransactions = useMemo(
    () => (selectedPlayer ? getPlayerTransactions(selectedPlayer.username) : []),
    [selectedPlayer, topUps],
  );
  const livePlayerDetail =
    realPlayerDetailQuery.data && "profile" in realPlayerDetailQuery.data
      ? (realPlayerDetailQuery.data as AdminPlayerDetails)
      : null;
  const displayProfile = livePlayerDetail?.profile;
  const displayScore =
    livePlayerDetail?.career?.productionScore ?? (mockMode ? (selectedPlayer?.score ?? 0) : 0);
  const displayGamesPlayed =
    livePlayerDetail?.career?.gamesPlayed ??
    (mockMode && selectedPlayer ? getGamesPlayed(selectedPlayer.score) : 0);
  const displayPlaytime =
    livePlayerDetail?.career?.playtime ??
    (mockMode && selectedPlayer ? getPlaytime(selectedPlayer.score) : "0h 0m");
  const displayLevel =
    livePlayerDetail?.progression.level ??
    (mockMode && selectedPlayer ? getLevel(selectedPlayer.score) : 1);
  const displayActivity =
    livePlayerDetail?.activity ??
    (mockMode && selectedPlayer
      ? getPlayerActivity(selectedPlayer.id, selectedPlayer.username)
      : []);
  const displayTransactions =
    livePlayerDetail?.transactions ?? (mockMode ? selectedPlayerTransactions : []);
  const displayAccount =
    livePlayerDetail?.accountInfo ??
    (mockMode && selectedPlayer ? getPlayerAccountInfo(selectedPlayer.id) : null);

  const [contactPlayer, setContactPlayer] = useState<Player | null>(null);

  const [contactSubject, setContactSubject] = useState("");

  const [contactMessage, setContactMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isActionBusy, setIsActionBusy] = useState(false);

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

        id: string;
      }
    | {
        type: "mass-delete" | "mass-reset";

        ids: string[];
      }
    | null
  >(null);

  /* =========================================================
     LOAD PLAYERS
     ========================================================= */

  useEffect(() => {
    if (!mockMode) {
      return;
    }

    setPlayerList(
      initialPlayers.map(
        (player) =>
          ({
            ...player,
            id: String(player.id),
            status: player.status === "Banned" ? "Banned" : "Active",
            avatarUrl: DEFAULT_PROFILE_PICTURE_URL,
          }) as Player,
      ),
    );
  }, [mockMode]);

  useEffect(() => {
    if (mockMode || !realPlayersQuery.data) {
      return;
    }

    setPlayerList(realPlayersQuery.data.map((player) => mapPlayFabPlayer(player)));
    setSelectedPlayers([]);
    setSelectedPlayer(null);
  }, [mockMode, realPlayersQuery.data]);
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
      return [...filteredPlayers].sort((a, b) => {
        const aTime = Date.parse(a.joined) || 0;
        const bTime = Date.parse(b.joined) || 0;
        return bTime - aTime;
      });
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

  function togglePlayerSelection(id: string) {
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

  async function runPlayerAction(
    action: "status" | "reset" | "delete",
    ids: string[],
    options: { status?: PlayerStatus; bannedUntil?: string | null } = {},
  ): Promise<boolean> {
    const targetIds = new Set(ids.filter(Boolean));
    if (targetIds.size === 0) return false;

    setActionError("");
    setIsActionBusy(true);

    try {
      if (mockMode) {
        setPlayerList((current) => {
          if (action === "delete") return current.filter((player) => !targetIds.has(player.id));
          return current.map((player) => {
            if (!targetIds.has(player.id)) return player;
            if (action === "reset")
              return { ...player, score: 0, status: "Active", bannedUntil: null };
            return {
              ...player,
              status: options.status ?? player.status,
              bannedUntil: options.status === "Banned" ? (options.bannedUntil ?? null) : null,
            };
          });
        });

        if (action === "delete") {
          setSelectedPlayers((current) => current.filter((id) => !targetIds.has(id)));
          setSelectedPlayer((current) => (current && targetIds.has(current.id) ? null : current));
        } else if (selectedPlayer && targetIds.has(selectedPlayer.id)) {
          setSelectedPlayer((current) => {
            if (!current) return current;
            if (action === "reset")
              return { ...current, score: 0, status: "Active", bannedUntil: null };
            return {
              ...current,
              status: options.status ?? current.status,
              bannedUntil: options.status === "Banned" ? (options.bannedUntil ?? null) : null,
            };
          });
        }
        return true;
      }

      const response = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ids: Array.from(targetIds),
          ...(options.status ? { status: options.status } : {}),
          ...(options.bannedUntil ? { bannedUntil: options.bannedUntil } : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || "The player action could not be completed.");
      }

      await realPlayersQuery.refetch();
      if (action === "delete") {
        setSelectedPlayers((current) => current.filter((id) => !targetIds.has(id)));
        setSelectedPlayer((current) => (current && targetIds.has(current.id) ? null : current));
      } else if (selectedPlayer && targetIds.has(selectedPlayer.id)) {
        await realPlayerDetailQuery.refetch();
      }
      return true;
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "The player action could not be completed.",
      );
      return false;
    } finally {
      setIsActionBusy(false);
    }
  }

  function deletePlayer(id: string) {
    return runPlayerAction("delete", [id]);
  }

  function resetPlayer(id: string) {
    return runPlayerAction("reset", [id]);
  }

  function deleteSelectedPlayers(ids = selectedPlayers) {
    return runPlayerAction("delete", ids);
  }

  function resetSelectedPlayers(ids = selectedPlayers) {
    return runPlayerAction("reset", ids);
  }

  async function submitContactPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!contactPlayer || !contactSubject.trim() || !contactMessage.trim()) {
      return;
    }

    const player = contactPlayer;

    const subject = contactSubject.trim();
    const body = contactMessage.trim();
    const createdAt = new Date().toISOString();
    const href = "/portal/inbox?tab=mail&contact=admin";
    if (mockMode) {
      const id = uid("admin-mail");
      const target = { kind: "players" as const, playerIds: [String(player.id)] };
      notificationsStore.set([
        {
          id: id + "-notice",
          title: "New message from Administrator",
          body: "The admin team sent you a message: " + subject + ". Open your Inbox to read it.",
          createdAt,
          kind: "system",
          channel: "notification",
          read: false,
          href,
          recipientUsername: player.username,
          recipientEmail: player.email,
          target,
          senderUsername: "ADMINISTRATOR",
          adminMessage: true,
        },
        {
          id,
          title: subject,
          body,
          createdAt,
          kind: "system",
          channel: "mail",
          read: false,
          href,
          recipientUsername: player.username,
          recipientEmail: player.email,
          target,
          senderUsername: "ADMINISTRATOR",
          adminMessage: true,
        },
        ...notificationsStore.get(),
      ]);
    } else {
      try {
        const response = await fetch("/api/admin/player-mail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            recipientPlayerId: String(player.id),
            subject,
            body,
          }),
        });
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) throw new Error(result?.error || "The message could not be sent.");
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "The message could not be sent.");
        return;
      }
    }

    setContactPlayer(null);
    setContactSubject("");
    setContactMessage("");
  }

  /* =========================================================
     BULK STATUS
     ========================================================= */

  function applyBulkStatus() {
    void runPlayerAction("status", selectedPlayers, {
      status: bulkStatus,
      bannedUntil: bulkStatus === "Banned" ? bulkBanUntil : null,
    }).then((success) => {
      if (success) setShowBulkStatus(false);
    });
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
    <div className="admin-page admin-player-management flex h-full min-h-0 flex-col overflow-hidden bg-[#0d1217] text-white">
      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <header className="mb-8 shrink-0">
        <h1 className="admin-heading !text-white">Player Management</h1>

        <p className="admin-kicker !text-white/45">Search, review, and manage registered players.</p>
      </header>

      {/* =====================================================
          SEARCH + FILTER BAR
          ===================================================== */}

      <section className="shrink-0 py-4">
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
                placeholder="Search username, email, or joined date"
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
                <div className="admin-player-filter-menu absolute right-0 top-12 z-50 box-border h-[22rem] min-h-[22rem] w-[15rem] min-w-[15rem] max-w-none overflow-hidden rounded-lg border border-white/10 bg-[#151c21] p-3 shadow-2xl">
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
                      className={`grid size-4 shrink-0 place-items-center rounded border ${
                        activeFilters.includes("Status")
                          ? "border-[#39b7a5] bg-[#39b7a5] text-[#08100f]"
                          : "border-white/15"
                      }`}
                    >
                      {activeFilters.includes("Status") && (
                        <Check className="size-2.5 stroke-[4]" />
                      )}
                    </span>

                    <span className="whitespace-nowrap text-[11px] font-bold text-white/55">
                      All Statuses
                    </span>
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
                          className={`grid size-4 shrink-0 place-items-center rounded border ${
                            active
                              ? "border-[#39b7a5] bg-[#39b7a5] text-[#08100f]"
                              : "border-white/15"
                          }`}
                        >
                          {active && <Check className="size-2.5 stroke-[4]" />}
                        </span>

                        <span
                          className={`whitespace-nowrap text-[11px] font-bold ${
                            active ? "text-white/75" : "text-white/45"
                          }`}
                        >
                          {filter}
                        </span>
                      </button>
                    );
                  })}

                  <div className="mt-3 box-border h-8 border-t border-white/[.06] pt-3">
                    {activeFilters.length > 0 ? (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="w-full text-[9px] font-black uppercase tracking-wide text-[#ff6248] hover:text-[#ff806b]"
                      >
                        Clear All Filters
                      </button>
                    ) : (
                      <span className="invisible block w-full text-[9px] font-black uppercase tracking-wide">
                        Clear All Filters
                      </span>
                    )}
                  </div>
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

      <section className="min-h-0 flex-1 overflow-hidden pb-4">
        <div className="h-full overflow-hidden rounded-lg border border-white/[.07] bg-[#11171b]">
          <div className="admin-player-table-scroll h-full min-h-[20rem] overflow-auto">
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
                          <div className="size-8 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#222b31]">
                            <img src={player.avatarUrl || DEFAULT_PROFILE_PICTURE_URL} alt={player.username + " avatar"} className="size-full object-cover" />
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
                          className="ml-auto flex items-center gap-2 rounded-md border border-[#39b7a5]/20 bg-[#39b7a5]/10 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-[#54c9b8] opacity-100 transition hover:border-[#39b7a5]/40 hover:bg-[#39b7a5]/20"
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
        {actionError && <p className="mb-2 text-xs font-bold text-[#ff6248]">{actionError}</p>}
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
                  <div className="absolute bottom-11 right-0 z-50 w-56 rounded-lg border border-white/10 bg-[#151c21] p-3 shadow-2xl">
                    <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-white/30">
                      Set status
                    </p>

                    {(["Active", "Banned"] as PlayerStatus[]).map((option) => (
                      <button
                        key={option}
                        onClick={() => setBulkStatus(option)}
                        className="flex w-full min-w-0 items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-white/[.04]"
                      >
                        <span className={`size-2 rounded-full ${statusDotStyles[option]}`} />

                        <span
                          className={`whitespace-nowrap text-xs font-bold ${statusStyles[option]}`}
                        >
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
                      disabled={isActionBusy}
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
                className="admin-player-delete-action flex items-center gap-2 rounded-md border border-[#ff6248]/30 bg-[#ff6248]/10 px-3 py-2 text-[10px] font-black uppercase text-[#ff6248] hover:bg-[#ff6248] hover:text-white"
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
                  <div className="size-[105px] overflow-hidden rounded-2xl border-2 border-[#f5c431] bg-[#202a3a]">
                    <img
                      src={displayProfile?.avatarUrl || selectedPlayer.avatarUrl || DEFAULT_PROFILE_PICTURE_URL}
                      alt={selectedPlayer.username + " avatar"}
                      className="size-full object-cover"
                    />
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
                    {displayProfile?.role || selectedPlayer.role || "Player"}
                  </p>

                  <div className="mt-3 flex gap-3 text-[10px] font-black uppercase text-white/25">
                    <span>LEVEL {displayLevel}</span>

                    <span>•</span>
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

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/40">
                      {displayProfile?.bio?.trim() || "This player has not added a biography yet."}
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
                          {displayScore.toLocaleString()}
                        </p>

                        <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-white/30">
                          Production Score
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[.07] bg-[#1c2636] p-5">
                        <p className="text-3xl font-black text-white">{displayGamesPlayed}</p>

                        <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-white/30">
                          Games Played
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-white/[.07] bg-[#1c2636] p-5">
                      <p className="text-[9px] font-black uppercase tracking-wide text-white/30">
                        PLAYTIME
                      </p>

                      <p className="mt-2 text-lg font-black text-white/75">{displayPlaytime}</p>
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
                          setContactPlayer(selectedPlayer);
                          setContactSubject("");
                          setContactMessage("");
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
                        className="admin-player-delete-action flex items-center gap-2 rounded-lg border border-[#ff6248]/20 bg-[#ff6248]/5 px-4 py-3 text-[10px] font-black uppercase text-[#ff6248] hover:bg-[#ff6248] hover:text-white"
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
                      {displayActivity.map((entry) => (
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
                      ))}
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
                      {displayTransactions.map((tx) => (
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

                  <div className="admin-player-profile-section-heading flex items-center gap-3">
                    <span className="h-6 w-1 rounded-full bg-[#ff6248]" />

                    <h3 className="text-[9px] font-black uppercase tracking-[.18em] text-[#ff6248]">
                      Player Information
                    </h3>
                  </div>

                  <div className="admin-player-profile-info-card mt-6 overflow-hidden rounded-xl border border-white/[.07]">
                    {[
                      ["Name", selectedPlayer.username],
                      ["Email", displayProfile?.email || selectedPlayer.email],
                      [
                        "Joined",
                        displayProfile?.joinedAt
                          ? formatJoinedDate(displayProfile.joinedAt)
                          : selectedPlayer.joined,
                      ],
                      ["Current Role", displayProfile?.role || selectedPlayer.role || "Player"],
                      ["Level", `Level ${displayLevel}`],
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

                  <div className="admin-player-profile-section-heading mt-8 flex items-center gap-3">
                    <span className="h-6 w-1 rounded-full bg-[#ff6248]" />

                    <h3 className="text-[9px] font-black uppercase tracking-[.18em] text-[#ff6248]">
                      Account Information
                    </h3>
                  </div>

                  <div className="admin-player-profile-info-card mt-6 overflow-hidden rounded-xl border border-white/[.07]">
                    {displayAccount ? (
                      [
                        ["Platform", displayAccount.platform],
                        ["Device", displayAccount.device],
                        ["Login Method", displayAccount.loginMethod],
                        ["Two-Factor Auth", displayAccount.twoFactor],
                        ["Last Login", displayAccount.lastLogin],
                      ].map(([label, value], index, rows) => (
                        <div
                          key={label}
                          className={`p-4 ${index < rows.length - 1 ? "border-b border-white/[.07]" : ""}`}
                        >
                          <p className="text-[8px] font-black uppercase text-white/25">{label}</p>
                          <p className="mt-2 text-xs font-bold text-white/60">{value}</p>
                        </div>
                      ))
                    ) : (
                      <p className="p-4 text-xs text-white/40">Account information is loading.</p>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          CONTACT PLAYER MODAL
          ===================================================== */}

      {contactPlayer && (
        <div
          className="admin-player-contact-overlay fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(event) => {
            event.stopPropagation();

            if (event.target === event.currentTarget) {
              setContactPlayer(null);
            }
          }}
        >
          <form
            onSubmit={submitContactPlayer}
            className="admin-player-contact-modal w-full max-w-xl rounded-xl border border-white/10 bg-[#151c28] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="admin-player-contact-accent text-[10px] font-black uppercase tracking-[.18em] text-[#ff6248]">
                  Contact Player
                </p>

                <h3 className="mt-2 text-xl font-black uppercase text-white">Send a message</h3>

                <p className="mt-2 text-sm text-white/50">
                  Send a direct Mail message to {contactPlayer.username}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setContactPlayer(null)}
                className="admin-player-contact-close grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                aria-label="Close contact player window"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <p className="text-xs font-bold text-white/50">
                To: <span className="font-black text-white">{contactPlayer.username}</span>
                <span className="text-white/35"> · {contactPlayer.email}</span>
              </p>

              <label className="block text-[10px] font-black uppercase tracking-wider text-white/50">
                Subject
                <input
                  name="subject"
                  value={contactSubject}
                  onChange={(event) => setContactSubject(event.target.value)}
                  required
                  autoFocus
                  placeholder="Message subject"
                  className="admin-input mt-2 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2.5 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#ff6248]"
                />
              </label>

              <label className="block text-[10px] font-black uppercase tracking-wider text-white/50">
                Message
                <textarea
                  name="message"
                  value={contactMessage}
                  onChange={(event) => setContactMessage(event.target.value)}
                  required
                  rows={8}
                  placeholder="Write your message to this player..."
                  className="admin-input mt-2 min-h-[180px] w-full resize-y rounded-md border border-white/10 bg-[#101923] px-3 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#ff6248]"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setContactPlayer(null)}
                className="admin-player-contact-cancel rounded-md border border-white/10 px-4 py-2.5 text-xs font-black uppercase text-white/60 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="admin-player-contact-submit inline-flex items-center gap-2 rounded-md bg-[#ff6248] px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-[#ff806b]"
              >
                <Mail className="size-3.5" />
                Send Message
              </button>
            </div>
          </form>
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
                "This permanently clears the player's progression, statistics, inventory, currencies, production history, achievements, and C-Coin payment records."}

              {confirmAction.type === "mass-delete" &&
                "This permanently removes all selected players from the roster."}

              {confirmAction.type === "mass-reset" &&
                "This permanently clears all stored progression, statistics, inventory, currencies, history, achievements, and C-Coin payment records for the selected players."}
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-md border border-white/10 px-4 py-2 text-xs font-bold text-white/60 hover:text-white"
              >
                Cancel
              </button>

              <button
                disabled={isActionBusy}
                onClick={() => {
                  const action = confirmAction;
                  void (async () => {
                    const success =
                      action.type === "delete"
                        ? await deletePlayer(action.id)
                        : action.type === "reset"
                          ? await resetPlayer(action.id)
                          : action.type === "mass-delete"
                            ? await deleteSelectedPlayers(action.ids)
                            : await resetSelectedPlayers(action.ids);
                    if (success) setConfirmAction(null);
                  })();
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
