import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/friends")({
  head: () => ({
    meta: [
      { title: "Crew & Friends — Crew On Set!" },
      { name: "description", content: "Manage your crew list, requests, and invites." },
      { property: "og:title", content: "Crew & Friends — Crew On Set!" },
      { property: "og:description", content: "Manage your crew list, requests, and invites." },
    ],
  }),
  component: FriendsPage,
});

import { useMemo, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import {
  Ban,
  Check,
  Copy,
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  MoreHorizontal,
  Search,
  Share2,
  UserPlus,
  Users,
  UserX,
  Twitter,
  X,
} from "lucide-react";

type Socials = {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
};

type CareerOverview = {
  productionsCompleted: number;
  yearsExperience: number;
  specialties: string[];
};

type Friend = {
  name: string;
  level: number;
  role: string;
  online: boolean;
  crewId: string;
  profileImage?: string;
  bio: string;
  joinedDate: string;
  socials: Socials;
  career: CareerOverview;
};

type FriendRequest = {
  name: string;
  level: number;
  role: string;
  crewId: string;
};

type SentRequest = {
  name: string;
  level: number;
  role: string;
  crewId: string;
  sentDate: string;
};

type Player = Friend;

const initialFriends: Friend[] = [
  {
    name: "BOOMBUDDY",
    level: 39,
    role: "Sound Mixer",
    online: true,
    crewId: "COS-1942-BM",
    profileImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80",
    bio: "Sound enthusiast focused on clean production audio and creating immersive soundscapes for every project.",
    joinedDate: "March 14, 2024",
    socials: {
      instagram: "boombuddy",
      facebook: "boombuddy.cos",
      twitter: "boombuddy",
    },
    career: {
      productionsCompleted: 87,
      yearsExperience: 6,
      specialties: [
        "Production Sound",
        "Boom Operation",
        "Location Recording",
      ],
    },
  },
  {
    name: "DOLLYDASH",
    level: 31,
    role: "Camera Operator",
    online: true,
    crewId: "COS-7381-DD",
    profileImage:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80",
    bio: "Camera operator who loves dynamic movement, practical lighting, and finding the perfect shot.",
    joinedDate: "July 22, 2024",
    socials: {
      instagram: "dollydash",
      facebook: "dollydash.film",
      linkedin: "dollydash",
    },
    career: {
      productionsCompleted: 62,
      yearsExperience: 4,
      specialties: [
        "Camera Operation",
        "Gimbal",
        "Steadicam",
      ],
    },
  },
  {
    name: "LIGHTLEAK",
    level: 29,
    role: "Lighting Artist",
    online: false,
    crewId: "COS-4920-LL",
    profileImage:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80",
    bio: "Lighting artist creating cinematic atmosphere through color, contrast, and carefully controlled light.",
    joinedDate: "November 3, 2023",
    socials: {
      instagram: "lightleak",
      twitter: "lightleakfilm",
    },
    career: {
      productionsCompleted: 74,
      yearsExperience: 5,
      specialties: [
        "Lighting Design",
        "Color",
        "Practical Lighting",
      ],
    },
  },
  {
    name: "PROPMaster",
    level: 34,
    role: "Prop Master",
    online: false,
    crewId: "COS-6157-PM",
    profileImage:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80",
    bio: "Prop master specializing in detailed environments, practical props, and believable production worlds.",
    joinedDate: "January 9, 2024",
    socials: {
      instagram: "propmaster",
      facebook: "propmaster.cos",
    },
    career: {
      productionsCompleted: 51,
      yearsExperience: 7,
      specialties: [
        "Props",
        "Set Dressing",
        "Production Design",
      ],
    },
  },
];

const initialRequests: FriendRequest[] = [
  {
    name: "FRAMEHUNTER",
    level: 27,
    role: "Director",
    crewId: "COS-3812-FH",
  },
  {
    name: "CUTMASTER",
    level: 22,
    role: "Editor",
    crewId: "COS-7291-CM",
  },
];

const initialSentRequests: SentRequest[] = [
  {
    name: "GAFFER_GEM",
    level: 24,
    role: "Gaffer",
    crewId: "COS-8873-GG",
    sentDate: "August 20, 2026",
  },
  {
    name: "SLATEQUEEN",
    level: 19,
    role: "Script Supervisor",
    crewId: "COS-2295-SQ",
    sentDate: "August 17, 2026",
  },
  {
    name: "TRACKSHOT",
    level: 45,
    role: "Dolly Grip",
    crewId: "COS-6604-TS",
    sentDate: "August 9, 2026",
  },
];

const searchablePlayers: Player[] = [
  {
    name: "FRAMEHUNTER",
    level: 27,
    role: "Director",
    online: true,
    crewId: "COS-3812-FH",
    bio: "Director focused on character-driven stories and strong visual composition.",
    joinedDate: "February 18, 2025",
    socials: {
      instagram: "framehunter",
    },
    career: {
      productionsCompleted: 23,
      yearsExperience: 3,
      specialties: [
        "Direction",
        "Storytelling",
        "Visual Development",
      ],
    },
  },
  {
    name: "CUTMASTER",
    level: 22,
    role: "Editor",
    online: false,
    crewId: "COS-7291-CM",
    bio: "Editor who enjoys shaping raw footage into tight and emotional stories.",
    joinedDate: "June 7, 2025",
    socials: {
      instagram: "cutmaster",
      linkedin: "cutmaster",
    },
    career: {
      productionsCompleted: 18,
      yearsExperience: 2,
      specialties: [
        "Editing",
        "Color Grading",
        "Post Production",
      ],
    },
  },
  {
    name: "REELRUNNER",
    level: 41,
    role: "Cinematographer",
    online: true,
    crewId: "COS-5832-RR",
    bio: "Cinematographer exploring movement, natural light, and cinematic visual language.",
    joinedDate: "August 12, 2023",
    socials: {
      instagram: "reelrunner",
      twitter: "reelrunnerfilm",
    },
    career: {
      productionsCompleted: 103,
      yearsExperience: 8,
      specialties: [
        "Cinematography",
        "Camera",
        "Lighting",
      ],
    },
  },
  {
    name: "BOOMOPERATOR",
    level: 36,
    role: "Boom Operator",
    online: true,
    crewId: "COS-2164-BO",
    bio: "Location sound specialist who loves working fast and staying invisible on set.",
    joinedDate: "December 1, 2023",
    socials: {
      instagram: "boomoperator",
    },
    career: {
      productionsCompleted: 69,
      yearsExperience: 5,
      specialties: [
        "Boom Operation",
        "Production Sound",
        "Location Audio",
      ],
    },
  },
  {
    name: "STORYBOARD",
    level: 30,
    role: "Storyboard Artist",
    online: false,
    crewId: "COS-9051-SB",
    bio: "Storyboard artist translating scripts into clear visual sequences before production begins.",
    joinedDate: "April 25, 2024",
    socials: {
      instagram: "storyboard",
    },
    career: {
      productionsCompleted: 34,
      yearsExperience: 4,
      specialties: [
        "Storyboarding",
        "Concept Art",
        "Pre-production",
      ],
    },
  },
  {
    name: "FOCUSPULLER",
    level: 33,
    role: "1st AC",
    online: true,
    crewId: "COS-4438-FP",
    bio: "1st AC with a passion for precision, lenses, and keeping the camera department moving.",
    joinedDate: "October 11, 2023",
    socials: {
      instagram: "focuspuller",
      linkedin: "focuspuller",
    },
    career: {
      productionsCompleted: 58,
      yearsExperience: 6,
      specialties: [
        "1st AC",
        "Focus Pulling",
        "Camera Department",
      ],
    },
  },
];

function resolveProfile(entry: {
  name: string;
  level: number;
  role: string;
  crewId: string;
}): Friend {
  return (
    searchablePlayers.find((player) => player.name === entry.name) ??
    initialFriends.find((friend) => friend.name === entry.name) ?? {
      ...entry,
      online: false,
      bio: "Crew On Set member.",
      joinedDate: "Recently",
      socials: {},
      career: {
        productionsCompleted: 0,
        yearsExperience: 0,
        specialties: [entry.role],
      },
    }
  );
}

const crewId = "COS-2847-CP";

function FriendsPage() {
  const [tab, setTab] = useState("Friends");

  const [friends, setFriends] =
    useState<Friend[]>(initialFriends);

  const [requests, setRequests] =
    useState<FriendRequest[]>(initialRequests);

  const [sentRequests, setSentRequests] =
    useState<SentRequest[]>(initialSentRequests);

  const [blocked, setBlocked] =
    useState<Player[]>([]);

  const [blockedFriends, setBlockedFriends] =
    useState<Record<string, Friend>>({});

  const [search, setSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");

  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  const [openMenu, setOpenMenu] =
    useState<string | null>(null);

  const [removeTarget, setRemoveTarget] =
    useState<Friend | null>(null);

  const [selectedProfile, setSelectedProfile] =
    useState<Friend | null>(null);

  const filteredFriends = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return friends;
    }

    return friends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(query) ||
        friend.crewId.toLowerCase().includes(query) ||
        friend.role.toLowerCase().includes(query)
    );
  }, [friends, search]);

  const searchResults = useMemo(() => {
    const query = addSearch.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return searchablePlayers.filter(
      (player) =>
        player.name.toLowerCase().includes(query) ||
        player.crewId.toLowerCase().includes(query)
    );
  }, [addSearch]);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(crewId);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setMessage("Unable to copy Crew ID.");
    }
  }

  async function shareId() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Add me on Crew On Set!",
          text: `My Crew ID is ${crewId}`,
        });
      } else {
        await copyId();
      }
    } catch {
      // User cancelled sharing.
    }
  }

  function openProfile(friend: Friend) {
    setOpenMenu(null);
    setSelectedProfile(friend);
  }

  function closeProfile() {
    setSelectedProfile(null);
  }

  function addFriend(player: Player) {
    const alreadyFriend = friends.some(
      (friend) => friend.name === player.name
    );

    const isBlocked = blocked.some(
      (blockedPlayer) =>
        blockedPlayer.name === player.name
    );

    if (alreadyFriend) {
      setMessage(
        `${player.name} is already your friend.`
      );
      return;
    }

    if (isBlocked) {
      setMessage(
        `Unblock ${player.name} before adding them.`
      );
      return;
    }

    setFriends((current) => [
      ...current,
      player,
    ]);

    setMessage(
      `${player.name} has been added to your friends.`
    );

    setAddSearch("");
  }

  function cancelSentRequest(name: string) {
    setSentRequests((current) =>
      current.filter((request) => request.name !== name)
    );

    setMessage(`Friend request to ${name} was cancelled.`);
  }

  function requestRemoveFriend(friend: Friend) {
    setOpenMenu(null);
    setRemoveTarget(friend);
  }

  function confirmRemoveFriend() {
    if (!removeTarget) {
      return;
    }

    const name = removeTarget.name;

    setFriends((current) =>
      current.filter(
        (friend) => friend.name !== name
      )
    );

    setRemoveTarget(null);

    setMessage(
      `${name} has been removed from your friends.`
    );
  }

  function cancelRemoveFriend() {
    setRemoveTarget(null);
  }

  function blockFriend(friend: Friend) {
    setBlockedFriends((current) => ({
      ...current,
      [friend.name]: friend,
    }));

    setFriends((current) =>
      current.filter(
        (item) => item.name !== friend.name
      )
    );

    setBlocked((current) => {
      if (
        current.some(
          (item) => item.name === friend.name
        )
      ) {
        return current;
      }

      return [...current, friend];
    });

    setOpenMenu(null);

    setMessage(
      `${friend.name} has been blocked.`
    );
  }

  function unblockPlayer(name: string) {
    const originalFriend =
      blockedFriends[name];

    setBlocked((current) =>
      current.filter(
        (player) => player.name !== name
      )
    );

    if (originalFriend) {
      setFriends((current) => {
        if (
          current.some(
            (friend) => friend.name === name
          )
        ) {
          return current;
        }

        return [
          ...current,
          originalFriend,
        ];
      });

      setBlockedFriends((current) => {
        const updated = { ...current };

        delete updated[name];

        return updated;
      });

      setMessage(
        `${name} has been unblocked and added back to your friends.`
      );

      return;
    }

    setMessage(
      `${name} has been unblocked.`
    );
  }

  function acceptRequest(
    request: FriendRequest
  ) {
    const player =
      searchablePlayers.find(
        (item) => item.name === request.name
      );

    const friend: Friend = player ?? {
      ...request,
      online: true,
      bio: "Crew On Set member.",
      joinedDate: "Recently",
      socials: {},
      career: {
        productionsCompleted: 0,
        yearsExperience: 0,
        specialties: [request.role],
      },
    };

    setFriends((current) => {
      if (
        current.some(
          (item) => item.name === friend.name
        )
      ) {
        return current;
      }

      return [...current, friend];
    });

    setRequests((current) =>
      current.filter(
        (item) => item.name !== request.name
      )
    );

    setMessage(
      `${request.name} is now your friend.`
    );
  }

  function declineRequest(name: string) {
    setRequests((current) =>
      current.filter(
        (request) => request.name !== name
      )
    );

    setMessage(
      `Friend request from ${name} declined.`
    );
  }

  function changeTab(nextTab: string) {
    setTab(nextTab);
    setOpenMenu(null);
    setMessage("");
  }

  return (
    <>
      <div
        className="min-h-screen bg-[#0d121c] text-white"
        onClick={() => setOpenMenu(null)}
      >
        <div className="mx-auto max-w-[1500px] px-4 pb-12 pt-8 sm:px-6 sm:pt-10 lg:px-8">

          {/* =====================================================
              HEADER
          ===================================================== */}

          <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

            <div>

              <p className="text-xs font-black tracking-[.18em] text-coral">
                SOCIAL HUB
              </p>

              <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
                Friends
              </h1>

            </div>

            <label
              className="relative"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/25" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                className="w-full rounded-md border border-white/10 bg-[#151c29] px-4 py-3 pl-10 text-sm text-white outline-none placeholder:text-white/25 focus:border-coral sm:w-72"
                placeholder="Find a player"
              />
            </label>

          </header>

          {/* =====================================================
              TABS
          ===================================================== */}

          <div className="mt-7 flex gap-5 overflow-x-auto border-b border-white/[0.07]">

            {[
              "Friends",
              "Add Friends",
              "Sent Requests",
              "Friend Requests",
              "Blocked",
            ].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  changeTab(item)
                }
                className={`whitespace-nowrap border-b-2 pb-3 text-xs font-black uppercase tracking-[0.1em] transition ${
                  tab === item
                    ? "border-coral text-white"
                    : "border-transparent text-white/35 hover:text-white/70"
                }`}
              >
                {item}

                {item === "Friend Requests" &&
                  requests.length > 0 && (
                    <span className="ml-2 rounded-full bg-coral px-2 py-0.5 text-[9px] text-white">
                      {requests.length}
                    </span>
                  )}

                {item === "Sent Requests" &&
                  sentRequests.length > 0 && (
                    <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-[9px] text-white">
                      {sentRequests.length}
                    </span>
                  )}

                {item === "Friends" && (
                  <span className="ml-2 text-[10px] text-white/25">
                    {friends.length}
                  </span>
                )}
              </button>
            ))}

          </div>

          {/* =====================================================
              MESSAGE
          ===================================================== */}

          {message && (
            <div
              className="mt-4 flex items-center justify-between rounded-md border border-white/[0.07] bg-[#151c29] px-4 py-3 text-sm font-bold text-white"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <span>{message}</span>

              <button
                type="button"
                onClick={() =>
                  setMessage("")
                }
                className="text-white/30 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* =====================================================
              FRIENDS
          ===================================================== */}

          {tab === "Friends" && (
            <section className="mt-7">

              <div className="flex items-center gap-3">

                <Users className="size-5 text-coral" />

                <h2 className="text-2xl font-black uppercase text-white">
                  Your Friends
                </h2>

                <span className="text-xs text-white/30">
                  {friends.length}
                </span>

              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151c29]">

                {filteredFriends.length === 0 ? (
                  <EmptyState
                    title={
                      search
                        ? "No players found"
                        : "No friends yet"
                    }
                    description={
                      search
                        ? "Try another username or Crew ID."
                        : "Add some players to start building your crew."
                    }
                  />
                ) : (
                  filteredFriends.map(
                    (friend) => (
                      <FriendRow
                        key={friend.name}
                        friend={friend}
                        menuOpen={
                          openMenu ===
                          friend.name
                        }
                        onProfile={() =>
                          openProfile(friend)
                        }
                        onMenu={(event) => {
                          event.stopPropagation();

                          setOpenMenu(
                            openMenu ===
                              friend.name
                              ? null
                              : friend.name
                          );
                        }}
                        onRemove={() =>
                          requestRemoveFriend(
                            friend
                          )
                        }
                        onBlock={() =>
                          blockFriend(friend)
                        }
                      />
                    )
                  )
                )}

              </div>

            </section>
          )}

          {/* =====================================================
              ADD FRIENDS
          ===================================================== */}

          {tab === "Add Friends" && (
            <section className="mt-7 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151c29]">

              <div className="grid lg:grid-cols-[1fr_300px]">

                <div className="p-6 sm:p-8">

                  <div className="flex items-center gap-3">

                    <div className="grid size-11 place-items-center rounded-md bg-yellow text-[#0d121c]">
                      <UserPlus className="size-5" />
                    </div>

                    <div>

                      <h2 className="text-2xl font-black uppercase text-white">
                        Add Friends
                      </h2>

                      <p className="text-sm text-white/40">
                        Search by username or Crew ID
                      </p>

                    </div>

                  </div>

                  <div className="mt-6 flex flex-col gap-2 sm:flex-row">

                    <input
                      value={addSearch}
                      onChange={(event) =>
                        setAddSearch(
                          event.target.value
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          const first =
                            searchResults[0];

                          if (first) {
                            addFriend(first);
                          }
                        }
                      }}
                      className="flex-1 rounded-md border border-white/10 bg-[#0d121c] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-coral"
                      placeholder="Username or COS-0000-XX"
                    />

                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 rounded-md bg-coral px-5 py-3 text-xs font-black text-white transition hover:opacity-90"
                      onClick={() => {
                        const first =
                          searchResults[0];

                        if (first) {
                          addFriend(first);
                        } else {
                          setMessage(
                            "No player found."
                          );
                        }
                      }}
                    >
                      <Search className="size-4" />
                      SEARCH
                    </button>

                  </div>

                  {addSearch && (
                    <div className="mt-5 space-y-2">

                      {searchResults.length === 0 ? (
                        <div className="rounded-md border border-white/[0.07] px-4 py-5 text-sm text-white/40">
                          No players found for{" "}
                          <strong className="text-white/70">
                            {addSearch}
                          </strong>
                          .
                        </div>
                      ) : (
                        searchResults.map(
                          (player) => {
                            const isFriend =
                              friends.some(
                                (friend) =>
                                  friend.name ===
                                  player.name
                              );

                            return (
                              <div
                                key={
                                  player.name
                                }
                                onClick={() =>
                                  openProfile(player)
                                }
                                className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3 transition hover:bg-white/[0.04]"
                              >
                                <PlayerAvatar
                                  player={
                                    player
                                  }
                                />

                                <div className="min-w-0 flex-1">

                                  <h3 className="truncate font-black text-white">
                                    {player.name}
                                  </h3>

                                  <p className="text-xs text-white/40">
                                    Level{" "}
                                    {player.level}
                                  </p>

                                  <p className="mt-0.5 text-[10px] font-bold text-white/25">
                                    {player.crewId}
                                  </p>

                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    isFriend
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    addFriend(
                                      player
                                    );
                                  }}
                                  className={`rounded-md px-3 py-2 text-[10px] font-black ${
                                    isFriend
                                      ? "cursor-not-allowed bg-white/[0.06] text-white/25"
                                      : "bg-coral text-white hover:opacity-90"
                                  }`}
                                >
                                  {isFriend
                                    ? "ADDED"
                                    : "ADD"}
                                </button>

                              </div>
                            );
                          }
                        )
                      )}

                    </div>
                  )}

                </div>

                <aside className="border-t border-white/[0.07] bg-[#0d121c] p-6 text-white lg:border-l lg:border-t-0">

                  <p className="text-[10px] font-black uppercase tracking-wider text-white/35">
                    Your Crew ID
                  </p>

                  <p className="mt-2 text-xl font-black text-yellow">
                    {crewId}
                  </p>

                  <div className="mt-5 flex gap-2">

                    <button
                      type="button"
                      onClick={copyId}
                      className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white/[0.06] px-3 py-2 text-xs font-bold hover:bg-white/10"
                    >
                      {copied ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}

                      {copied
                        ? "COPIED"
                        : "COPY"}
                    </button>

                    <button
                      type="button"
                      onClick={shareId}
                      className="grid size-9 place-items-center rounded-md bg-coral"
                      aria-label="Share Crew ID"
                    >
                      <Share2 className="size-4" />
                    </button>

                  </div>

                </aside>

              </div>

            </section>
          )}

          {/* =====================================================
              SENT REQUESTS
          ===================================================== */}

          {tab === "Sent Requests" && (
            <section className="mt-7">

              <div className="flex items-center gap-3">

                <Share2 className="size-5 text-coral" />

                <h2 className="text-2xl font-black uppercase text-white">
                  Sent Requests
                </h2>

                <span className="text-xs text-white/30">
                  {sentRequests.length}
                </span>

              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151c29]">

                {sentRequests.length === 0 ? (
                  <EmptyState
                    title="No outgoing requests"
                    description="Requests you send to other players will show up here."
                  />
                ) : (
                  sentRequests.map((request) => (
                    <article
                      key={request.name}
                      onClick={() => openProfile(resolveProfile(request))}
                      className="flex cursor-pointer items-center gap-4 border-b border-white/[0.06] p-4 transition last:border-b-0 hover:bg-white/[0.025] sm:p-5"
                    >

                      <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[#0d121c] text-xs font-black text-yellow">
                        {request.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">

                        <h3 className="truncate font-black text-white">
                          {request.name}
                        </h3>

                        <p className="text-xs text-white/40">
                          Level {request.level}
                        </p>

                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-white/25">
                          Sent {request.sentDate}
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          cancelSentRequest(request.name);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white/50 transition hover:border-coral hover:text-coral"
                      >
                        <X className="size-3.5" />
                        Cancel
                      </button>

                    </article>
                  ))
                )}

              </div>

            </section>
          )}

          {/* =====================================================
              FRIEND REQUESTS
          ===================================================== */}

          {tab === "Friend Requests" && (
            <section className="mt-7">

              <div className="flex items-center gap-3">

                <UserPlus className="size-5 text-coral" />

                <h2 className="text-2xl font-black uppercase text-white">
                  Friend Requests
                </h2>

                <span className="text-xs text-white/30">
                  {requests.length}
                </span>

              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151c29]">

                {requests.length === 0 ? (
                  <EmptyState
                    title="No friend requests"
                    description="You're all caught up."
                  />
                ) : (
                  requests.map(
                    (request) => (
                      <article
                        key={
                          request.name
                        }
                        onClick={() =>
                          openProfile(resolveProfile(request))
                        }
                        className="flex cursor-pointer items-center gap-4 border-b border-white/[0.06] p-4 transition last:border-b-0 hover:bg-white/[0.025] sm:p-5"
                      >

                        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[#0d121c] text-xs font-black text-yellow">
                          {request.name
                            .slice(
                              0,
                              2
                            )
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">

                          <h3 className="truncate font-black text-white">
                            {request.name}
                          </h3>

                          <p className="text-xs text-white/40">
                            Level{" "}
                            {request.level}
                          </p>

                        </div>

                        <div className="flex gap-2">

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              acceptRequest(
                                request
                              );
                            }}
                            className="grid size-9 place-items-center rounded-md bg-coral text-white"
                            title="Accept request"
                          >
                            <Check className="size-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              declineRequest(
                                request.name
                              );
                            }}
                            className="grid size-9 place-items-center rounded-md border border-white/10 text-white/35 hover:border-coral hover:text-coral"
                            title="Decline request"
                          >
                            <X className="size-4" />
                          </button>

                        </div>

                      </article>
                    )
                  )
                )}

              </div>

            </section>
          )}

          {/* =====================================================
              BLOCKED
          ===================================================== */}

          {tab === "Blocked" && (
            <section className="mt-7">

              <div className="flex items-center gap-3">

                <Ban className="size-5 text-coral" />

                <h2 className="text-2xl font-black uppercase text-white">
                  Blocked Players
                </h2>

                <span className="text-xs text-white/30">
                  {blocked.length}
                </span>

              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151c29]">

                {blocked.length === 0 ? (
                  <EmptyState
                    title="No blocked players"
                    description="Players you block will appear here."
                  />
                ) : (
                  blocked.map(
                    (player) => (
                      <article
                        key={
                          player.name
                        }
                        onClick={() =>
                          openProfile(player)
                        }
                        className="flex cursor-pointer items-center gap-4 border-b border-white/[0.06] p-4 transition last:border-b-0 hover:bg-white/[0.025] sm:p-5"
                      >

                        <PlayerAvatar
                          player={player}
                        />

                        <div className="min-w-0 flex-1">

                          <h3 className="truncate font-black text-white">
                            {player.name}
                          </h3>

                          <p className="text-xs text-white/40">
                            Level{" "}
                            {player.level}
                          </p>

                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            unblockPlayer(
                              player.name
                            );
                          }}
                          className="rounded-md border border-white/10 px-3 py-2 text-[10px] font-black text-white/45 hover:border-coral hover:text-coral"
                        >
                          UNBLOCK
                        </button>

                      </article>
                    )
                  )
                )}

              </div>

            </section>
          )}

        </div>
      </div>

      {/* =========================================================
          PLAYER PROFILE MODAL
      ========================================================= */}

      {selectedProfile && (
        <PlayerProfile
          player={selectedProfile}
          onClose={closeProfile}
        />
      )}

      {/* =========================================================
          REMOVE CONFIRMATION
      ========================================================= */}

      {removeTarget && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-[#05080d]/80 p-4 backdrop-blur-md"
          onClick={cancelRemoveFriend}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151c29] p-6 text-white shadow-2xl shadow-black/50 sm:p-7"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="grid size-12 place-items-center rounded-md bg-coral/10 text-coral">
              <UserX className="size-5" />
            </div>

            <h2 className="mt-5 text-xl font-black uppercase text-white">
              Remove Friend?
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/45">
              Are you sure you want to remove{" "}
              <strong className="text-white">
                {removeTarget.name}
              </strong>{" "}
              from your friends list?
            </p>

            <p className="mt-2 text-xs text-white/25">
              You can send them another friend
              request later.
            </p>

            <div className="mt-7 flex gap-3">

              <button
                type="button"
                onClick={cancelRemoveFriend}
                className="flex-1 rounded-md border border-white/10 px-4 py-3 text-xs font-black text-white/50 hover:bg-white/[0.04]"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={confirmRemoveFriend}
                className="flex-1 rounded-md bg-coral px-4 py-3 text-xs font-black text-white hover:opacity-90"
              >
                REMOVE
              </button>

            </div>

          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   PLAYER PROFILE MODAL
========================================================= */

function PlayerProfile({
  player,
  onClose,
}: {
  player: Friend;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#05080d]/85 p-3 backdrop-blur-md sm:p-6 lg:p-10"
      onClick={onClose}
    >
      <div
        className="mx-auto flex min-h-full w-full max-w-5xl items-center justify-center py-4 sm:py-8"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.09] bg-[#151c29] shadow-[0_30px_100px_rgba(0,0,0,0.55)]">

          {/* =================================================
              CLOSE BUTTON
          ================================================= */}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="absolute right-5 top-5 z-20 grid size-10 place-items-center rounded-full border border-white/[0.08] bg-[#0d121c]/80 text-white/35 backdrop-blur-sm transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
          >
            <X className="size-5" />
          </button>

          {/* =================================================
              PROFILE HEADER
          ================================================= */}

          <div className="relative overflow-hidden border-b border-white/[0.07] bg-[#0d121c] px-6 pb-7 pt-7 sm:px-9 sm:pb-8 sm:pt-8">

            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-coral/[0.06] blur-3xl" />

            <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-yellow/[0.035] blur-3xl" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">

              {/* PROFILE IMAGE */}

              <div className="relative mx-auto shrink-0 sm:mx-0">

                <div className="size-28 overflow-hidden rounded-2xl border-[3px] border-yellow bg-[#151c29] shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:size-32">

                  {player.profileImage ? (
                    <img
                      src={player.profileImage}
                      alt={`${player.name} profile`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-2xl font-black text-yellow">
                      {player.name
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}

                </div>

                <span
                  className={`absolute bottom-2 right-2 size-5 rounded-full border-[3px] border-[#0d121c] ${
                    player.online
                      ? "bg-[#2d9d8f]"
                      : "bg-white/20"
                  }`}
                />

              </div>

              {/* PLAYER NAME */}

              <div className="min-w-0 flex-1 text-center sm:text-left">

                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">

                  <h2 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
                    {player.name}
                  </h2>

                  <span
                    className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wide ${
                      player.online
                        ? "bg-[#2d9d8f] text-white"
                        : "bg-white/[0.07] text-white/40"
                    }`}
                  >
                    {player.online
                      ? "Online"
                      : "Offline"}
                  </span>

                </div>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-wider text-white/30 sm:justify-start">

                  <span>
                    Level {player.level}
                  </span>

                  <span className="size-1 rounded-full bg-white/20" />

                  <span>
                    {player.crewId}
                  </span>

                </div>

              </div>

            </div>
          </div>

          {/* =================================================
              MAIN CONTENT
          ================================================= */}

          <div className="grid lg:grid-cols-[1fr_290px]">

            {/* LEFT */}

            <div className="p-6 sm:p-8 lg:p-9">

              {/* ABOUT */}

              <section>

                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-coral">
                  About
                </p>

                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                  Bio
                </h3>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">
                  {player.bio}
                </p>

              </section>

              {/* CAREER */}

              <section className="mt-9">

                <div className="flex items-center gap-3">

                  <div className="h-7 w-1 rounded-full bg-coral" />

                  <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                    Career Overview
                  </h3>

                </div>

                {/* CAREER STATS */}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">

                  <div className="rounded-xl border border-white/[0.07] bg-[#1b2433] p-5 transition hover:border-white/[0.12]">

                    <p className="text-3xl font-black tracking-tight text-white">
                      {player.career.productionsCompleted}
                    </p>

                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                      Productions Completed
                    </p>

                  </div>

                  <div className="rounded-xl border border-white/[0.07] bg-[#1b2433] p-5 transition hover:border-white/[0.12]">

                    <p className="text-3xl font-black tracking-tight text-white">
                      {player.career.yearsExperience}
                    </p>

                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                      Years Experience
                    </p>

                  </div>

                </div>

                {/* SPECIALTIES */}

                <div className="mt-3 rounded-xl border border-white/[0.07] bg-[#1b2433] p-5">

                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">
                    Specialties
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">

                    {player.career.specialties.map(
                      (specialty) => (
                        <span
                          key={specialty}
                          className="rounded-md border border-white/[0.06] bg-[#252f40] px-3 py-2 text-[9px] font-black uppercase tracking-wide text-white/55"
                        >
                          {specialty}
                        </span>
                      )
                    )}

                  </div>

                </div>

              </section>

              {/* SOCIALS */}

              <section className="mt-9">

                <div className="flex items-center gap-3">

                  <div className="h-7 w-1 rounded-full bg-coral" />

                  <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                    Socials
                  </h3>

                </div>

                {Object.keys(player.socials).length ===
                0 ? (
                  <p className="mt-4 text-sm text-white/30">
                    No social accounts linked.
                  </p>
                ) : (
                  <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">

                    {player.socials.instagram && (
                      <SocialLink
                        icon={
                          <Instagram className="size-4" />
                        }
                        label="Instagram"
                        username={
                          player.socials.instagram
                        }
                      />
                    )}

                    {player.socials.facebook && (
                      <SocialLink
                        icon={
                          <Facebook className="size-4" />
                        }
                        label="Facebook"
                        username={
                          player.socials.facebook
                        }
                      />
                    )}

                    {player.socials.twitter && (
                      <SocialLink
                        icon={
                          <Twitter className="size-4" />
                        }
                        label="Twitter"
                        username={
                          player.socials.twitter
                        }
                      />
                    )}

                    {player.socials.linkedin && (
                      <SocialLink
                        icon={
                          <Linkedin className="size-4" />
                        }
                        label="LinkedIn"
                        username={
                          player.socials.linkedin
                        }
                      />
                    )}

                  </div>
                )}

              </section>

            </div>

            {/* =================================================
                PLAYER INFORMATION
            ================================================= */}

            <aside className="border-t border-white/[0.07] bg-[#0d121c] p-6 sm:p-8 lg:border-l lg:border-t-0">

              <div className="flex items-center gap-3">

                <div className="h-6 w-1 rounded-full bg-coral" />

                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-coral">
                  Player Information
                </p>

              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-white/[0.07] bg-[#151c29]">

                <ProfileDetail
                  label="Name"
                  value={player.name}
                />

                <ProfileDetail
                  label="Crew ID"
                  value={player.crewId}
                />

                <ProfileDetail
                  label="Joined"
                  value={player.joinedDate}
                />

                <ProfileDetail
                  label="Level"
                  value={`Level ${player.level}`}
                />

                <ProfileDetail
                  label="Status"
                  value={
                    player.online
                      ? "Currently Online"
                      : "Currently Offline"
                  }
                  status={player.online}
                />

              </div>

            </aside>

          </div>

        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FRIEND ROW
========================================================= */

function FriendRow({
  friend,
  menuOpen,
  onProfile,
  onMenu,
  onRemove,
  onBlock,
}: {
  friend: Friend;
  menuOpen: boolean;
  onProfile: () => void;
  onMenu: (
    event: MouseEvent<HTMLButtonElement>
  ) => void;
  onRemove: () => void;
  onBlock: () => void;
}) {
  return (
    <article
      onClick={onProfile}
      className="relative flex cursor-pointer items-center gap-4 border-b border-white/[0.06] p-4 transition last:border-b-0 hover:bg-white/[0.025] sm:p-5"
    >

      <PlayerAvatar player={friend} />

      <div className="min-w-0 flex-1">

        <h3 className="truncate font-black text-white">
          {friend.name}
        </h3>

        <p className="text-xs text-white/40">
          Level {friend.level}
        </p>

      </div>

      <span
        className={`hidden text-[10px] font-black uppercase sm:block ${
          friend.online
            ? "text-[#55b8aa]"
            : "text-white/25"
        }`}
      >
        {friend.online
          ? "Online"
          : "Offline"}
      </span>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        title="Remove friend"
        className="grid size-9 place-items-center rounded-md border border-white/10 text-white/35 transition hover:border-coral hover:text-coral"
      >
        <UserX className="size-4" />
      </button>

      <button
        type="button"
        onClick={onMenu}
        className="grid size-9 place-items-center text-white/30 hover:text-white"
        aria-label="More friend options"
      >
        <MoreHorizontal className="size-5" />
      </button>

      {menuOpen && (
        <div
          className="absolute right-4 top-[calc(100%-8px)] z-20 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#151c29] shadow-2xl shadow-black/40"
          onClick={(event) =>
            event.stopPropagation()
          }
        >

          <button
            type="button"
            onClick={onRemove}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-bold text-white/70 hover:bg-white/[0.04] hover:text-white"
          >
            <UserX className="size-4" />
            Remove Friend
          </button>

          <button
            type="button"
            onClick={onBlock}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-bold text-coral hover:bg-coral/5"
          >
            <Ban className="size-4" />
            Block Player
          </button>

        </div>
      )}

    </article>
  );
}

/* =========================================================
   PLAYER AVATAR
========================================================= */

function PlayerAvatar({
  player,
}: {
  player: Player;
}) {
  return (
    <div className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#0d121c] text-xs font-black text-yellow">

      {player.profileImage ? (
        <img
          src={player.profileImage}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        player.name
          .slice(0, 2)
          .toUpperCase()
      )}

      <span
        className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-[#151c29] ${
          player.online
            ? "bg-[#2d9d8f]"
            : "bg-white/20"
        }`}
      />

    </div>
  );
}

/* =========================================================
   PROFILE DETAIL
========================================================= */

function ProfileDetail({
  label,
  value,
  status = false,
}: {
  label: string;
  value: string;
  status?: boolean;
}) {
  return (
    <div className="border-b border-white/[0.06] px-5 py-4 last:border-b-0">

      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/25">
        {label}
      </p>

      <div className="mt-1.5 flex items-center gap-2">

        {status && (
          <span className="size-2 rounded-full bg-[#2d9d8f]" />
        )}

        <p className="text-xs font-black text-white/75">
          {value}
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   SOCIAL LINK
========================================================= */

function SocialLink({
  icon,
  label,
  username,
}: {
  icon: ReactNode;
  label: string;
  username: string;
}) {
  return (
    <a
      href="#"
      onClick={(event) =>
        event.preventDefault()
      }
      className="group flex items-center gap-3 rounded-md border border-white/[0.07] bg-white/[0.025] px-4 py-3 transition hover:border-coral hover:bg-white/[0.04]"
    >

      <span className="text-white/35 transition group-hover:text-coral">
        {icon}
      </span>

      <span className="min-w-0">

        <span className="block text-[9px] font-black uppercase tracking-wider text-white/25">
          {label}
        </span>

        <span className="mt-0.5 block truncate text-xs font-black text-white/75">
          @{username}
        </span>

      </span>

      <ExternalLink className="ml-auto size-3 shrink-0 text-white/15 group-hover:text-coral" />

    </a>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-14 text-center">

      <Users className="mx-auto size-8 text-white/15" />

      <h3 className="mt-3 text-sm font-black uppercase text-white">
        {title}
      </h3>

      <p className="mt-1 text-xs text-white/30">
        {description}
      </p>

    </div>
  );
}
