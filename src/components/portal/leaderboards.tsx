import { useMemo, useState } from "react";
import { Award, Crown, Film, Star, TrendingUp, Users, X } from "lucide-react";

type Leader = {
  name: string;
  level: number;
  score: number;
  xp: number;
  productions: number;
  rating: number;
  legendary?: boolean;
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

const friendLeaders: Leader[] = [
  {
    name: "CAMERA_PRO",
    level: 27,
    score: 984250,
    xp: 7020,
    productions: 87,
    rating: 94,
  },
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
    name: "DOLLYDASH",
    level: 31,
    score: 921860,
    xp: 7780,
    productions: 102,
    rating: 93,
  },
];

const formatNumber = (value: number) => value.toLocaleString();

export function Leaderboards() {
  const [leaderTab, setLeaderTab] = useState("Global");
  const [leaderSort, setLeaderSort] = useState("Total Score");
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);

  const currentLeaders = useMemo(() => {
    let data: Leader[];

    if (leaderTab === "Friends") {
      data = friendLeaders;
    } else {
      data = globalLeaders;
    }

    return [...data].sort((a, b) => {
      if (leaderSort === "XP") {
        return b.xp - a.xp;
      }

      if (leaderSort === "Productions") {
        return b.productions - a.productions;
      }

      if (leaderSort === "Rating") {
        return b.rating - a.rating;
      }

      return b.score - a.score;
    });
  }, [leaderTab, leaderSort]);

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
                className={`border-b-2 pb-2 text-xs font-black uppercase tracking-[0.1em] transition ${
                  leaderTab === tab
                    ? "border-coral text-white"
                    : "border-transparent text-white/35 hover:text-white/70"
                }`}
              >
                {tab}
              </button>
            ))}

          </div>

        </div>

        <select
          value={leaderSort}
          onChange={(e) => setLeaderSort(e.target.value)}
          className="rounded-md border border-white/10 bg-[#151c29] px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-white/70 outline-none transition focus:border-coral"
        >
          <option value="Total Score">
            Total Score
          </option>

          <option value="XP">
            XP
          </option>

          <option value="Productions">
            Productions
          </option>

          <option value="Rating">
            Rating
          </option>
        </select>

      </div>

      {leaderTab === "Friends" && currentLeaders.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/35">
          <Users className="size-4" />
          Comparing your performance with your friends.
        </div>
      )}

      {/* TABLE */}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#151c29]">

        <table className="min-w-[640px] w-full text-left">

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

              const isCurrentPlayer = leader.name === "CAMERA_PRO";

              return (
                <tr
                  key={leader.name}
                  onClick={() => setSelectedLeader(leader)}
                  className={`cursor-pointer border-b border-white/[0.05] transition-colors hover:bg-white/[0.035] ${
                    isCurrentPlayer ? "bg-yellow/[0.05]" : ""
                  }`}
                >

                  <td className="px-5 py-4">

                    <span
                      className={`grid size-8 place-items-center rounded-md font-black ${
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

                      <div className="grid size-9 place-items-center rounded-full bg-coral text-xs font-black text-white">
                        {leader.name.slice(0, 2)}
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
                    Level {leader.level}
                  </td>

                  <td className="px-5 py-4 text-sm text-white/55">
                    {leader.productions}
                  </td>

                  <td className="px-5 py-4 text-sm text-white/55">
                    {leader.rating}%
                  </td>

                  <td className="px-5 py-4 font-black text-white">
                    {formatNumber(leader.score)}
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
              No friends yet
            </h3>

            <p className="mt-1 text-sm text-white/35">
              Add crew members as friends to compare your
              leaderboard performance.
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

                <div className="grid size-16 place-items-center rounded-full bg-coral text-lg font-black text-white">
                  {selectedLeader.name.slice(0, 2)}
                </div>

                <div>

                  <div className="flex items-center gap-2">

                    <h2 className="text-xl font-black">
                      {selectedLeader.name}
                    </h2>

                    {selectedLeader.legendary && (
                      <Crown className="size-5 text-yellow" />
                    )}

                  </div>

                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/30">
                    Level {selectedLeader.level}
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

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-4">

                <TrendingUp className="size-4 text-coral" />

                <p className="mt-3 text-[9px] font-black uppercase tracking-wider text-white/30">
                  Score
                </p>

                <p className="mt-1 text-lg font-black text-white">
                  {formatNumber(selectedLeader.score)}
                </p>

              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-4">

                <Star className="size-4 text-coral" />

                <p className="mt-3 text-[9px] font-black uppercase tracking-wider text-white/30">
                  XP
                </p>

                <p className="mt-1 text-lg font-black text-white">
                  {formatNumber(selectedLeader.xp)}
                </p>

              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-4">

                <Film className="size-4 text-coral" />

                <p className="mt-3 text-[9px] font-black uppercase tracking-wider text-white/30">
                  Productions
                </p>

                <p className="mt-1 text-lg font-black text-white">
                  {selectedLeader.productions}
                </p>

              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-4">

                <Award className="size-4 text-coral" />

                <p className="mt-3 text-[9px] font-black uppercase tracking-wider text-white/30">
                  Rating
                </p>

                <p className="mt-1 text-lg font-black text-white">
                  {selectedLeader.rating}%
                </p>

              </div>

            </div>

            {/* CAREER */}

            <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.035] p-4">

              <p className="text-[10px] font-black uppercase tracking-wider text-white/30">
                Career Overview
              </p>

              <p className="mt-2 text-sm leading-relaxed text-white/50">
                {selectedLeader.name} is a Level {selectedLeader.level} crew
                member with {selectedLeader.productions} completed productions
                and an average production rating of {selectedLeader.rating}%.
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
