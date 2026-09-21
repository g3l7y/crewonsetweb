import { useMemo, useState } from "react";
import { Award, ChevronDown, Crown, Film, Star, TrendingUp, Users, X } from "lucide-react";
import { friendRosterStore } from "@/lib/demo/friends";
import { getProfileArtwork } from "@/lib/demo/profile-art";
import { isMockMode } from "@/lib/playfab/config";
import { useFriends, useLeaderboard, usePlayerProfile } from "@/lib/playfab/hooks";

type Leader = {
  playFabId?: string;
  name: string;
  level: number | null;
  score: number;
  xp: number | null;
  productions: number | null;
  rating: number | null;
  legendary?: boolean;
  profileImage?: string;
};

const globalLeaders: Leader[] = [
  {
    name: "FRAMEPERFECT",
    level: 42,
    score: 1284920,
    xp: 9820,
    productions: 126,
    rating: 98,
    legendary: true,
  },
  {
    name: "BOOMBUDDY",
    level: 39,
    score: 1120480,
    xp: 9140,
    productions: 118,
    rating: 96,
  },
  {
    name: "CAMERA_PRO",
    level: 27,
    score: 984250,
    xp: 7020,
    productions: 87,
    rating: 94,
  },
  {
    name: "DOLLYDASH",
    level: 31,
    score: 921860,
    xp: 7780,
    productions: 102,
    rating: 93,
  },
  {
    name: "LIGHTLEAK",
    level: 29,
    score: 887420,
    xp: 7410,
    productions: 95,
    rating: 92,
  },
];

const formatNumber = (value: number) => value.toLocaleString();

export function Leaderboards() {
  const [leaderTab, setLeaderTab] = useState("Global");
  const [leaderSort, setLeaderSort] = useState("Total Score");
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);
  const mockMode = isMockMode();
  const [friends] = friendRosterStore.useStore();
  const realLeaderboardQuery = useLeaderboard("total_score", 100);
  const realFriendsQuery = useFriends();
  const currentProfileQuery = usePlayerProfile();
  const currentPlayerName = currentProfileQuery.data?.username || currentProfileQuery.data?.displayName || (mockMode ? "CAMERA_PRO" : "");

  const realGlobalLeaders = useMemo<Leader[]>(
    () =>
      (realLeaderboardQuery.data ?? []).map((entry) => ({
        playFabId: entry.playFabId,
        name: entry.username || entry.displayName,
        level: null,
        score: entry.statValue,
        xp: null,
        productions: null,
        rating: null,
        profileImage: entry.avatarUrl,
      })),
    [realLeaderboardQuery.data],
  );

  const friendLeaders = useMemo<Leader[]>(() => {
    if (!mockMode) {
      const friendIds = new Set(
        [
          currentProfileQuery.data?.playFabId,
          ...(realFriendsQuery.data ?? [])
            .filter((friend) => friend.status === "confirmed")
            .map((friend) => friend.playFabId),
        ].filter((id): id is string => Boolean(id)),
      );

      return realGlobalLeaders.filter(
        (leader) => leader.playFabId && friendIds.has(leader.playFabId),
      );
    }

    return [
      {
        name: currentPlayerName,
        level: 27,
        score: 984250,
        xp: 7020,
        productions: 87,
        rating: 94,
      },
      ...friends.map((friend) => ({
        name: friend.name,
        level: friend.level,
        score: friend.career.productionsCompleted * 12000 + friend.level * 1000,
        xp: friend.career.productionsCompleted * 70 + friend.level * 40,
        productions: friend.career.productionsCompleted,
        rating: Math.min(99, 78 + Math.round(friend.level / 4)),
        profileImage: friend.profileImage,
      })),
    ];
  }, [
    currentPlayerName,
    currentProfileQuery.data?.playFabId,
    friends,
    mockMode,
    realFriendsQuery.data,
    realGlobalLeaders,
  ]);

  const currentLeaders = useMemo(() => {
    let data: Leader[];

    if (leaderTab === "Friends") {
      data = friendLeaders;
    } else {
      data = mockMode
        ? globalLeaders.map((leader) =>
            leader.name === "CAMERA_PRO" ? { ...leader, name: currentPlayerName } : leader,
          )
        : realGlobalLeaders;
    }

    return [...data].sort((a, b) => {
      if (leaderSort === "XP") {
        return (b.xp ?? Number.NEGATIVE_INFINITY) - (a.xp ?? Number.NEGATIVE_INFINITY);
      }

      if (leaderSort === "Productions") {
        return (b.productions ?? Number.NEGATIVE_INFINITY) - (a.productions ?? Number.NEGATIVE_INFINITY);
      }

      if (leaderSort === "Rating") {
        return (b.rating ?? Number.NEGATIVE_INFINITY) - (a.rating ?? Number.NEGATIVE_INFINITY);
      }

      return b.score - a.score;
    });
  }, [currentPlayerName, friendLeaders, leaderSort, leaderTab, mockMode, realGlobalLeaders]);

  const formatMetric = (value: number | null, suffix = "") =>
    value === null ? "—" : `${formatNumber(value)}${suffix}`;

  return (
    <section className="mt-12">

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

        <div>

          <h2 className="text-2xl font-black uppercase text-white">
            Leaderboards
          </h2>

          <div className="mt-3 flex gap-5">

            {["Global", "Friends"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setLeaderTab(tab)}
                className={`leaderboard-tab text-xs font-black uppercase tracking-[0.1em] transition ${
                  leaderTab === tab
                    ? "is-active"
                    : ""
                }`}
              >
                {tab}
              </button>
            ))}

          </div>

        </div>

        <div className="relative shrink-0">
          <select
            value={leaderSort}
            onChange={(e) => setLeaderSort(e.target.value)}
            className="leaderboard-sort-select appearance-none rounded-md border border-white/10 bg-[#151c29] px-4 py-3 pr-10 text-xs font-black uppercase tracking-[0.08em] !text-[#0a0e19] outline-none transition focus:border-coral"
          >
            <option value="Total Score">Total Score</option>
            <option value="XP">XP</option>
            <option value="Productions">Productions</option>
            <option value="Rating">Rating</option>
          </select>
          <ChevronDown className="leaderboard-sort-arrow pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#0a0e19]" aria-hidden="true" />
        </div>

      </div>

      <div
        className={`mt-4 flex min-h-4 items-center gap-2 text-xs font-bold ${
          leaderTab === "Friends" ? "text-white/35" : "invisible"
        }`}
        aria-hidden={leaderTab !== "Friends"}
      >
        <Users className="size-4" />
        Comparing your performance with your friends.
      </div>

      {/* TABLE */}

      <div className="leaderboard-scroll-list player-account-scroll-list mt-4 overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#151c29]">

        <table className="leaderboard-list-table min-w-[640px] w-full text-left">

          <thead className="border-b border-white/[0.07] bg-white/[0.025]">

            <tr>

              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-white/30">
                Rank
              </th>

              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-white/30">
                Player
              </th>

              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-white/30">
                Level
              </th>

              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-white/30">
                Productions
              </th>

              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-white/30">
                Rating
              </th>

              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-white/30">
                Score
              </th>

            </tr>

          </thead>

          <tbody>

            {currentLeaders.map((leader, index) => {

              const isCurrentPlayer = Boolean(currentPlayerName) && leader.name === currentPlayerName;

              return (
                <tr
                  key={leader.playFabId ?? leader.name}
                  onClick={() => setSelectedLeader(leader)}
                  className={`cursor-pointer border-b border-white/[0.05] transition-colors hover:bg-white/[0.035] ${
                    isCurrentPlayer ? "bg-yellow/[0.05]" : ""
                  }`}
                >

                  <td className="px-5 py-4">

                    <span
                      className={`leaderboard-rank grid size-8 place-items-center rounded-md font-black ${
                        index === 0
                          ? "bg-yellow text-[#0d121c]"
                          : "bg-white/[0.06] text-white/60"
                      }`}
                    >
                      {index + 1}
                    </span>

                  </td>

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-3">

                      <div className="relative grid size-9 place-items-center overflow-hidden rounded-full border-2 border-yellow bg-coral text-xs font-black text-white">
                        {(leader.profileImage ?? friends.find((friend) => friend.name === leader.name)?.profileImage ?? getProfileArtwork(leader.name)) ? (
                          <img
                            src={leader.profileImage ?? friends.find((friend) => friend.name === leader.name)?.profileImage ?? getProfileArtwork(leader.name)}
                            alt={`${leader.name} portrait`}
                            className="size-full object-cover"
                          />
                        ) : (
                          leader.name.slice(0, 2)
                        )}
                      </div>

                      <div className="flex items-center gap-2">

                        <strong className="text-white">
                          {leader.name}
                        </strong>

                        {leader.legendary && (
                          <Crown className="size-3.5 text-yellow" />
                        )}

                        {isCurrentPlayer && (
                          <span className="rounded-full border border-yellow/20 bg-yellow/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-yellow">
                            You
                          </span>
                        )}

                      </div>

                    </div>

                  </td>

                  <td className="px-5 py-4 text-sm text-white/55">
                    {leader.level === null ? "Level —" : `Level ${leader.level}`}
                  </td>

                  <td className="px-5 py-4 text-sm text-white/55">
                    {formatMetric(leader.productions)}
                  </td>

                  <td className="px-5 py-4 text-sm text-white/55">
                    {formatMetric(leader.rating, "%")}
                  </td>

                  <td className="px-5 py-4 font-black text-white">
                    {formatMetric(leader.score)}
                  </td>

                </tr>
              );
            })}

          </tbody>

        </table>

        {currentLeaders.length === 0 && (
          <div className="p-10 text-center">

            <Users className="mx-auto size-9 text-white/20" />

            <h3 className="mt-3 font-black uppercase text-white">
              {leaderTab === "Friends" ? "No friends yet" : "No leaderboard entries yet"}
            </h3>

            <p className="mt-1 text-sm text-white/35">
              {leaderTab === "Friends"
                ? "Add crew members as friends to compare your leaderboard performance."
                : "Players with a recorded total score will appear here."}
            </p>

          </div>
        )}

      </div>

      {/* PLAYER MODAL */}

      {selectedLeader && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#05080d]/80 p-4 backdrop-blur-md"
          onMouseDown={() => setSelectedLeader(null)}
        >

          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#151c29] p-6 text-white shadow-2xl shadow-black/50"
            onMouseDown={(e) => e.stopPropagation()}
          >

            {/* HEADER */}

            <div className="flex items-start justify-between">

              <div className="flex items-center gap-4">

                <div className="relative grid size-16 place-items-center overflow-hidden rounded-full border-2 border-yellow bg-coral text-lg font-black text-white">
                  <img
                    src={selectedLeader.profileImage ?? friends.find((friend) => friend.name === selectedLeader.name)?.profileImage ?? getProfileArtwork(selectedLeader.name)}
                    alt={`${selectedLeader.name} portrait`}
                    className="size-full object-cover"
                  />
                </div>

                <div>

                  <div className="flex items-center gap-2">

                    <h2 className="leaderboard-profile-name text-xl font-black">
                      {selectedLeader.name}
                    </h2>

                    {selectedLeader.legendary && (
                      <Crown className="size-5 text-yellow" />
                    )}

                  </div>

                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/30">
                    {selectedLeader.level === null ? "Level —" : `Level ${selectedLeader.level}`}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() => setSelectedLeader(null)}
                className="grid size-9 place-items-center rounded-full bg-white/[0.06] text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                <X className="size-5" />
              </button>

            </div>

            {/* STATS */}

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">

              <div className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3 sm:p-4">

                <TrendingUp className="size-4 text-coral" />

                <p className="mt-3 min-h-[1.5rem] break-words text-[8px] font-black uppercase leading-tight tracking-wider text-white/30 sm:text-[9px]">
                  Score
                </p>

                <p className="mt-1 min-w-0 whitespace-nowrap text-sm font-black leading-none text-white">
                  {formatMetric(selectedLeader.score)}
                </p>

              </div>

              <div className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3 sm:p-4">

                <Star className="size-4 text-coral" />

                <p className="mt-3 min-h-[1.5rem] break-words text-[8px] font-black uppercase leading-tight tracking-wider text-white/30 sm:text-[9px]">
                  XP
                </p>

                <p className="mt-1 min-w-0 whitespace-nowrap text-sm font-black leading-none text-white">
                  {formatMetric(selectedLeader.xp)}
                </p>

              </div>

              <div className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3 sm:p-4">

                <Film className="size-4 text-coral" />

                <p className="mt-3 min-h-[1.5rem] break-words text-[8px] font-black uppercase leading-tight tracking-wider text-white/30 sm:text-[9px]">
                  Productions
                </p>

                <p className="mt-1 min-w-0 whitespace-nowrap text-sm font-black leading-none text-white">
                  {formatMetric(selectedLeader.productions)}
                </p>

              </div>

              <div className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3 sm:p-4">

                <Award className="size-4 text-coral" />

                <p className="mt-3 min-h-[1.5rem] break-words text-[8px] font-black uppercase leading-tight tracking-wider text-white/30 sm:text-[9px]">
                  Rating
                </p>

                <p className="mt-1 min-w-0 whitespace-nowrap text-sm font-black leading-none text-white">
                  {formatMetric(selectedLeader.rating, "%")}
                </p>

              </div>

            </div>

            {/* CAREER */}

            <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.035] p-4">

              <p className="text-[10px] font-black uppercase tracking-wider text-white/30">
                Career Overview
              </p>

              <p className="mt-2 text-sm leading-relaxed text-white/50">
                {selectedLeader.name} is a crew member ranked by the
                {" "}
                {formatMetric(selectedLeader.score)} total score. Additional
                career metrics will appear when PlayFab provides them.
              </p>

            </div>

            {/* CLOSE */}

            <button
              type="button"
              onClick={() => setSelectedLeader(null)}
              className="mt-6 w-full rounded-md bg-white/[0.06] px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              Close
            </button>

          </div>

        </div>
      )}

    </section>
  );
}
