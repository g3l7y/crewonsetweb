import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/profile")({
  head: () => ({
    meta: [
      { title: "Crew Profile — Crew On Set!" },
      { name: "description", content: "Your player profile, stats, and showcase." },
      { property: "og:title", content: "Crew Profile — Crew On Set!" },
      { property: "og:description", content: "Your player profile, stats, and showcase." },
    ],
  }),
  component: CrewProfilePage,
});

import Image from "@/components/next-compat/image";
import Link from "@/components/next-compat/link";
import {
  Check,
  Eye,
  EyeOff,
  Instagram,
  Pencil,
  Upload,
  X,
  Twitter,
  Youtube,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { EMAIL_ERROR, USERNAME_ERROR, isValidEmail, isValidUsername } from "@/lib/validation";
import { useQueryClient } from "@tanstack/react-query";
import {
  formatCoins,
  formatTransactionDate,
  loadoutSlots,
  transactionsStore,
} from "@/lib/demo/store";
import { CosmeticArt } from "@/components/portal/cosmetic-art";
import { cosmeticCatalog, ownedItemsStore } from "@/lib/demo/portal-shop";
import { getProfileArtwork } from "@/lib/demo/profile-art";
import { isMockMode } from "@/lib/playfab/config";
import { QUERY_KEYS, useCatalog, usePlayerInventory, usePlayerLoadout, usePlayerProfile, usePlayerProgression, useTransactions, useUpdateProfile } from "@/lib/playfab/hooks";
import { Coins, Lock } from "lucide-react";

type ProfileTransaction = {
  id: string;
  label: string;
  detail: string;
  amount: number;
  createdAt: string;
};

const DEMO_PASSWORD = "player";
const PROFILE_ACCOUNT_KEY = "cos.profile.account";

type ProfileAccount = {
  username: string;
  email: string;
};

const defaultProfileAccount: ProfileAccount = {
  username: "CAMERA_PRO",
  email: "player@gmail.com",
};

function readProfileAccount(): ProfileAccount {
  if (typeof window === "undefined") return defaultProfileAccount;
  try {
    const raw = window.localStorage.getItem(PROFILE_ACCOUNT_KEY);
    return raw ? { ...defaultProfileAccount, ...JSON.parse(raw) } : defaultProfileAccount;
  } catch {
    return defaultProfileAccount;
  }
}

function CrewProfilePage() {
  const mockMode = isMockMode();
  const [transactions] = transactionsStore.useStore();
  const [ownedIds] = ownedItemsStore.useStore();
  const profileQuery = usePlayerProfile();
  const progressionQuery = usePlayerProgression();
  const inventoryQuery = usePlayerInventory();
  const catalogQuery = useCatalog();
  const loadoutQuery = usePlayerLoadout();
  const transactionsQuery = useTransactions();
  const updateProfileMutation = useUpdateProfile();
  const queryClient = useQueryClient();

  const demoOwnedItems = cosmeticCatalog.filter((item) => ownedIds.includes(item.id));
  const realCatalogItems = useMemo(() => (catalogQuery.data ?? [])
    .map((remote) => {
      const category = remote.category as (typeof cosmeticCatalog)[number]["category"];
      if (!["Hair", "Tops", "Bottoms", "Eyeglasses"].includes(category)) return null;
      const rarityValue = String(remote.rarity ?? "").toLowerCase();
      const rarity = rarityValue === "rare"
        ? "Rare"
        : rarityValue === "epic"
          ? "Epic"
          : rarityValue === "legendary"
            ? "Legendary"
            : "Common";
      return {
        id: remote.itemId,
        name: remote.displayName ?? "",
        category,
        price: remote.price ?? 0,
        rarity,
        description: remote.description ?? "",
        assetKey: remote.customData?.assetKey ?? "",
        imageUrl: remote.customData?.imageUrl ?? "",
      };
    })
    .filter((item): item is (typeof cosmeticCatalog)[number] => item !== null), [catalogQuery.data]);
  const realOwnedItems = realCatalogItems.filter((item) =>
    inventoryQuery.data?.some((inventoryItem) => inventoryItem.itemId === item.id)
  );
  const ownedItems = mockMode ? demoOwnedItems : realOwnedItems;

  const demoEquippedBySlot = {
    Hair: demoOwnedItems.find((item) => item.category === "Hair"),
    Tops: demoOwnedItems.find((item) => item.category === "Tops"),
    Bottoms: demoOwnedItems.find((item) => item.category === "Bottoms"),
    Eyeglasses: demoOwnedItems.find((item) => item.category === "Eyeglasses"),
  };
  const realLoadout = loadoutQuery.data ?? {};
  const realEquippedBySlot = {
    Hair: realOwnedItems.find((item) => item.id === (realLoadout.Hair ?? realLoadout.hair)),
    Tops: realOwnedItems.find((item) => item.id === (realLoadout.Tops ?? realLoadout.tops ?? realLoadout.Shirt ?? realLoadout.shirt ?? realLoadout.costume)),
    Bottoms: realOwnedItems.find((item) => item.id === (realLoadout.Bottoms ?? realLoadout.bottoms ?? realLoadout.Shoes ?? realLoadout.shoes ?? realLoadout.equipment)),
    Eyeglasses: realOwnedItems.find((item) => item.id === (realLoadout.Eyeglasses ?? realLoadout.eyeglasses ?? realLoadout.Accessory ?? realLoadout.accessory ?? realLoadout.decorator)),
  };
  const equippedBySlot = mockMode ? demoEquippedBySlot : realEquippedBySlot;

  const recentTransactions = useMemo<ProfileTransaction[]>(() => {
    const entries = mockMode
      ? transactions
          .filter((transaction) =>
            transaction.kind !== "purchase" ||
            demoOwnedItems.some((item) => item.name === transaction.label)
          )
          .map((transaction) => ({
            id: transaction.id,
            label: transaction.label,
            detail: transaction.detail,
            amount: transaction.amount,
            createdAt: transaction.createdAt,
          }))
      : (transactionsQuery.data ?? []).map((transaction) => ({
          id: transaction.id,
          label: transaction.description || "PlayFab transaction",
          detail: transaction.type + " — " + transaction.currency,
          amount: transaction.type === "purchase" || transaction.type === "spend"
            ? -Math.abs(transaction.amount)
            : Math.abs(transaction.amount),
          createdAt: transaction.timestamp ?? transaction.date ?? new Date(0).toISOString(),
        }));

    return entries
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [demoOwnedItems, mockMode, transactions, transactionsQuery.data]);

  const [profileImage, setProfileImage] = useState(
    getProfileArtwork("CAMERA_PRO")
  );

  const [account, setAccount] = useState<ProfileAccount>(defaultProfileAccount);

  const [bio, setBio] = useState(
    "Chasing the perfect frame, one chaotic commercial at a time. Usually found behind the dolly—or underneath it."
  );

  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);

  const [draftBio, setDraftBio] = useState(bio);
  const [draftTwitter, setDraftTwitter] = useState(twitter);
  const [draftInstagram, setDraftInstagram] = useState(instagram);
  const [draftYoutube, setDraftYoutube] = useState(youtube);

  const [draftUsername, setDraftUsername] = useState(account.username);
  const [draftEmail, setDraftEmail] = useState(account.email);
  const [draftPassword, setDraftPassword] = useState("");
  const [draftPasswordConfirm, setDraftPasswordConfirm] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mockMode) {
      setAccount(readProfileAccount());
      return;
    }

    const profile = profileQuery.data;
    if (!profile) return;

    setAccount({
      username: profile.username || profile.displayName || "Player",
      email: profile.email || "",
    });
    setBio(profile.bio || "");
    setTwitter(profile.socialLinks?.twitter || "");
    setInstagram(profile.socialLinks?.instagram || "");
    setYoutube(profile.socialLinks?.youtube || "");
    setProfileImage(profile.avatarUrl || getProfileArtwork(profile.username || profile.displayName || "Player"));
  }, [mockMode, profileQuery.data]);

  const profileDisplayName = mockMode
    ? account.username
    : profileQuery.data?.username || profileQuery.data?.displayName || account.username;
  const profileLevel = mockMode ? 27 : progressionQuery.data?.level ?? 1;
  const profileCurrentXp = mockMode ? 6820 : progressionQuery.data?.currentXp ?? 0;
  const profileXpToNextLevel = mockMode ? 10000 : progressionQuery.data?.xpToNextLevel ?? 0;
  const profileXpPercent = profileXpToNextLevel > 0
    ? Math.min(100, Math.max(0, (profileCurrentXp / profileXpToNextLevel) * 100))
    : 0;
  const profileJoined = mockMode
    ? "March 14, 2025"
    : profileQuery.data?.joinedAt
      ? new Date(profileQuery.data.joinedAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "—";
  const openEditor = () => {
    setDraftBio(bio);
    setDraftTwitter(twitter);
    setDraftInstagram(instagram);
    setDraftYoutube(youtube);
    setDraftUsername(account.username);
    setDraftEmail(account.email);
    setDraftPassword("");
    setDraftPasswordConfirm("");
    setFieldError("");
    setEditMode(true);
  };

  const cancelEditor = () => {
    setDraftBio(bio);
    setDraftTwitter(twitter);
    setDraftInstagram(instagram);
    setDraftYoutube(youtube);
    setDraftUsername(account.username);
    setDraftEmail(account.email);
    setDraftPassword("");
    setDraftPasswordConfirm("");
    setFieldError("");
    setEditMode(false);
  };

  const applySave = async () => {
    const nextAccount: ProfileAccount = {
      username: (draftUsername.trim() || account.username).toUpperCase(),
      email: draftEmail.trim() || account.email,
    };

    if (!mockMode) {
      try {
        await updateProfileMutation.mutateAsync({
          username: nextAccount.username,
          bio: draftBio,
          socialLinks: {
            twitter: draftTwitter,
            instagram: draftInstagram,
            youtube: draftYoutube,
          },
        });
      } catch {
        setFieldError("PlayFab could not save your profile changes. Please try again.");
        return;
      }
    } else {
      try {
        if (nextAccount.username.toLowerCase() !== account.username.toLowerCase()) {
          const response = await fetch("/api/auth/check-username", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: nextAccount.username }),
          });
          if (!response.ok) {
            const result = (await response.json()) as { error?: string };
            throw new Error(result.error ?? "That username is already in use. Please choose another.");
          }
        }
        window.localStorage.setItem(
          PROFILE_ACCOUNT_KEY,
          JSON.stringify(nextAccount)
        );
        const existingPlayerAccount = window.localStorage.getItem("player-account");
        const playerAccount = existingPlayerAccount
          ? JSON.parse(existingPlayerAccount) as Record<string, unknown>
          : {};
        window.localStorage.setItem(
          "player-account",
          JSON.stringify({ ...playerAccount, ...nextAccount }),
        );
        if (draftPassword) {
          window.localStorage.setItem("cos.profile.password", draftPassword);
        }
      } catch {
        setFieldError("Unable to apply the username change. Please try again.");
        return;
      }
    }

    setBio(draftBio);
    setTwitter(draftTwitter);
    setInstagram(draftInstagram);
    setYoutube(draftYoutube);
    setAccount(nextAccount);
    setDraftPassword("");
    setDraftPasswordConfirm("");
    setEditMode(false);
    setConfirmOpen(false);
    setConfirmPasswordInput("");
    setConfirmError("");
    setSaved(true);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.session });

    window.setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  const saveProfile = async () => {
    setFieldError("");

    if (!draftUsername.trim()) {
      setFieldError("Username cannot be empty.");
      return;
    }

    if (!isValidUsername(draftUsername.trim())) {
      setFieldError(USERNAME_ERROR);
      return;
    }

    if (!isValidEmail(draftEmail)) {
      setFieldError(EMAIL_ERROR);
      return;
    }

    if (draftPassword && draftPassword.length < 6) {
      setFieldError("New password must be at least 6 characters.");
      return;
    }

    if (draftPassword && draftPassword !== draftPasswordConfirm) {
      setFieldError("New passwords do not match.");
      return;
    }

    if (!mockMode && (draftEmail.trim() !== account.email || draftPassword.length > 0)) {
      setFieldError("Email and password changes are managed by the PlayFab account service.");
      return;
    }

    if (draftUsername.trim().toLowerCase() !== account.username.toLowerCase()) {
      try {
        const response = await fetch("/api/auth/check-username?username=" + encodeURIComponent(draftUsername.trim()));
        const result = (await response.json()) as { available?: boolean; error?: string };
        if (!response.ok || result.available === false) {
          setFieldError(result.error ?? "That username is already in use. Please choose another.");
          return;
        }
      } catch {
        setFieldError("Unable to verify username availability. Please try again.");
        return;
      }
    }

    if (!mockMode) {
      await applySave();
      return;
    }

    const credentialsChanged =
      draftUsername.trim() !== account.username ||
      draftEmail.trim() !== account.email ||
      draftPassword.length > 0;

    if (credentialsChanged) {
      setConfirmPasswordInput("");
      setConfirmError("");
      setConfirmOpen(true);
      return;
    }

    void applySave();
  };

  const confirmCredentialChange = () => {
    if (!mockMode) {
      setConfirmError("Credential changes are managed by the PlayFab account service.");
      return;
    }

    if (confirmPasswordInput !== DEMO_PASSWORD) {
      setConfirmError('Incorrect password. This is a demo — try "player".');
      return;
    }
    void applySave();
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (!mockMode) {
      setFieldError("Profile photo uploads are not connected to PlayFab yet.");
      return;
    }
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    setProfileImage(imageUrl);
  };

  const removeProfileImage = () => {
    if (mockMode) {
      setProfileImage(getProfileArtwork("CAMERA_PRO"));
    } else {
      setProfileImage(profileQuery.data?.avatarUrl || getProfileArtwork(profileDisplayName));
    }
  };

  const hasSocials = twitter || instagram || youtube;

  return (
    <div className="portal-title-page min-h-screen bg-[#0d121c] px-4 pb-12 text-white sm:px-6 lg:px-8">
      <div className="portal-title-container mx-auto max-w-[1500px] pt-8 sm:pt-10">

        {/* =========================================================
            PAGE HEADER
        ========================================================= */}

        <header className="portal-title-header flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="portal-title-eyebrow text-xs font-black tracking-[.18em] text-coral">
              IDENTITY CARD
            </p>

            <h1 className="portal-title-heading mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
              Crew Profile
            </h1>
          </div>

          {/* ONLY EDIT BUTTON */}

          <button
            type="button"
            onClick={openEditor}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-coral px-5 py-3 text-xs font-black uppercase tracking-[0.08em] text-white shadow-lg shadow-coral/20 transition hover:-translate-y-0.5 hover:bg-coral/90"
          >
            <Pencil className="size-4" />
            Edit Profile
          </button>
        </header>

        {/* =========================================================
            SUCCESS MESSAGE
        ========================================================= */}

        {saved && (
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
            <span className="grid size-7 place-items-center rounded-full bg-emerald-500 text-white">
              <Check className="size-4" />
            </span>

            Profile updated successfully.
          </div>
        )}

          <section className="profile-surface mt-7 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151c29] shadow-2xl shadow-black/20">
          {/* =========================================================
              PROFILE INFORMATION
          ========================================================= */}

          <div className="profile-info p-6 sm:p-8 lg:p-10">

            {/* PROFILE HEADER */}

            <div className="flex flex-col gap-7 sm:flex-row sm:items-center">

              {/* PROFILE PHOTO */}

              <div className="relative size-36 shrink-0 overflow-hidden rounded-full border-[6px] border-yellow bg-[#0d121c] shadow-2xl shadow-black/30">
                <Image
                  src={profileImage}
                  alt={profileDisplayName + " avatar"}
                  fill
                  unoptimized={profileImage.startsWith("blob:")}
                  className="object-cover object-[62%_45%]"
                />
              </div>

              {/* NAME / ROLE / LEVEL */}

              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-4xl font-black uppercase tracking-tight text-white">
                    {profileDisplayName}
                  </h2>

                  <span className="rounded-full border border-yellow/20 bg-yellow/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-yellow">
                    Level {profileLevel}
                  </span>
                </div>

                {/* XP */}

                <div className="mt-5 flex max-w-xl items-center gap-3">
                  <strong className="whitespace-nowrap text-xs font-black text-white">
                    LEVEL {profileLevel}
                  </strong>

                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-coral" style={{ width: profileXpPercent + "%" }} />
                  </div>

                  <span className="whitespace-nowrap text-xs text-white/40">
                    {profileCurrentXp.toLocaleString("en-US")} / {profileXpToNextLevel.toLocaleString("en-US")} XP
                  </span>
                </div>
              </div>
            </div>

            {/* =====================================================
                BIO
            ===================================================== */}

            <div className="mt-9">
              <span className="text-xs font-black uppercase tracking-[0.15em] text-white/35">
                About
              </span>

              <p className="mt-3 max-w-3xl text-base leading-7 text-white/65">
                {bio}
              </p>
            </div>

            {/* =====================================================
                JOINED
            ===================================================== */}

            <div className="mt-8 flex flex-wrap gap-x-12 gap-y-5 border-t border-white/[0.07] pt-7">

              <div>
                <span className="block text-xs font-black uppercase tracking-[0.14em] text-white/35">
                  Joined
                </span>

                <strong className="mt-1.5 block text-sm text-white/80">
                  {profileJoined}
                </strong>
              </div>
            </div>

            {/* =====================================================
                SOCIALS
            ===================================================== */}

            <div className="mt-8">
              <span className="text-xs font-black uppercase tracking-[0.15em] text-white/35">
                Socials
              </span>

              <div className="mt-3 flex flex-wrap gap-2">

                {twitter && (
                  <a
                    href={twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3.5 py-2.5 text-sm font-bold text-white/60 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                  >
                    <Twitter className="size-4" />
                    Twitter / X
                  </a>
                )}

                {instagram && (
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3.5 py-2.5 text-sm font-bold text-white/60 transition hover:border-coral/40 hover:bg-coral/10 hover:text-coral"
                  >
                    <Instagram className="size-4" />
                    Instagram
                  </a>
                )}

                {youtube && (
                  <a
                    href={youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3.5 py-2.5 text-sm font-bold text-white/60 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-400"
                  >
                    <Youtube className="size-4" />
                    YouTube
                  </a>
                )}

                {!hasSocials && (
                  <span className="rounded-md border border-dashed border-white/10 px-4 py-3 text-sm font-bold text-white/30">
                    No social profiles added
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* =======================================================
              EQUIPPED LOADOUT
          ======================================================= */}

          <div className="loadout-surface border-t border-white/[0.07] p-6 sm:p-8 lg:p-10">

            <div className="flex items-center justify-between gap-4">

              <div>
                <h3 className="text-lg font-black uppercase text-white">
                  Equipped Loadout
                </h3>

                <p className="mt-1 text-sm text-white/40">
                  Cosmetics currently equipped on your crew avatar
                </p>
              </div>

              <Link
                href="/portal/shop"
                className="text-xs font-black text-coral transition hover:text-white"
              >
                GO TO SHOP →
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {loadoutSlots.map((slot) => {
                const piece = equippedBySlot[slot];

                return (
                  <div
                    key={slot}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-center"
                  >
                    <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                      {slot}
                    </span>

                    <div className="mt-3 flex flex-col items-center gap-2">
                      {piece ? (
                        <>
                          <div className="size-14 overflow-hidden rounded-full border border-white/10 bg-[#0d121c]">
                            {piece.imageUrl ? <img src={piece.imageUrl} alt="" className="size-full object-cover" /> : piece.assetKey ? <CosmeticArt item={piece} className="size-full" /> : <div className="size-full" aria-hidden="true" />}
                          </div>

                          {piece.name && <p className="truncate text-xs font-bold text-white">{piece.name}</p>}
                        </>
                      ) : (
                        <>
                          <div className="grid size-14 place-items-center rounded-full border border-dashed border-white/10 text-white/20">
                            <X className="size-5" />
                          </div>

                          <p className="text-xs font-bold uppercase text-white/25">
                            Nothing Equipped
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================
            RECENT TRANSACTIONS (PRIVATE — OWNER ONLY)
        ========================================================= */}

        <section className="transactions-surface mt-7 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151c29] shadow-2xl shadow-black/20">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-yellow" />
                  <h3 className="text-lg font-black uppercase text-white">
                    Recent Transactions
                  </h3>
                </div>

                <p className="mt-1 text-sm text-white/40">
                  Private to you — never shown on your public profile.
                </p>
              </div>

              <Link
                href="/portal/shop"
                className="text-xs font-black text-coral transition hover:text-white"
              >
                GO TO SHOP →
              </Link>
            </div>

            <div className="mt-5 divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.06]">
              {recentTransactions.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-white/35">
                  No transactions yet.
                </p>
              )}

              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-4 bg-white/[0.02] px-4 py-4"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.05] text-yellow">
                    <Coins className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">
                      {transaction.label}
                    </p>
                    <p className="truncate text-xs text-white/40">
                      {transaction.detail}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-white/25">
                      {formatTransactionDate(transaction.createdAt)}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 text-sm font-black ${
                      transaction.amount < 0 ? "text-coral" : "text-emerald-400"
                    }`}
                  >
                    {transaction.amount < 0 ? "-" : "+"}
                    {formatCoins(Math.abs(transaction.amount))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* =========================================================
          EDIT PROFILE MODAL
      ========================================================= */}

      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#05080d]/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#151c29] p-6 text-white shadow-2xl">
            <h3 className="text-lg font-black uppercase">Confirm Password</h3>
            <p className="mt-2 text-sm text-white/50">
              Enter your current password to save changes to your username,
              email, or password.
            </p>
            {confirmError && (
              <p className="mt-3 rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-xs font-bold text-coral">
                {confirmError}
              </p>
            )}
            <input
              type="password"
              value={confirmPasswordInput}
              onChange={(event) => setConfirmPasswordInput(event.target.value)}
              placeholder="Current password"
              className="mt-4 w-full rounded-lg border border-white/10 bg-[#0d121c] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-coral focus:ring-4 focus:ring-coral/10"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-black uppercase text-white/50 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCredentialChange}
                className="rounded-md bg-coral px-5 py-2.5 text-xs font-black uppercase text-white hover:bg-coral/90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {editMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05080d]/80 p-4 backdrop-blur-md">

          <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#151c29] text-white shadow-2xl shadow-black/50">

            {/* MODAL HEADER */}

            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#151c29]/95 px-6 py-5 sm:px-8">

              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-coral">
                  Identity Settings
                </p>

                <h2 className="mt-1 text-2xl font-black uppercase text-white">
                  Edit Profile
                </h2>
              </div>

              <button
                type="button"
                onClick={cancelEditor}
                className="grid size-10 place-items-center rounded-full bg-white/[0.06] text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8 space-y-8">

              {/* =================================================
                  PROFILE PHOTO
              ================================================= */}

              <div>
                <label className="text-xs font-black uppercase tracking-[0.15em] text-white/40">
                  Profile Picture
                </label>

                <div className="mt-4 flex items-center gap-5">

                  <div className="relative size-24 shrink-0 overflow-hidden rounded-full border-4 border-yellow bg-[#0d121c] shadow-xl">
                    <Image
                      src={profileImage}
                      alt={profileDisplayName + " profile preview"}
                      fill
                      unoptimized={profileImage.startsWith("blob:")}
                      className="object-cover object-[62%_45%]"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-md bg-coral px-4 py-3 text-xs font-black uppercase text-white shadow-lg shadow-coral/10 transition hover:bg-coral/90"
                    >
                      <Upload className="size-4" />
                      Change Photo
                    </button>


                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                <p className="mt-2 text-xs text-white/30">
                  JPG, PNG or WEBP. Recommended 500×500.
                </p>
              </div>

              {/* =================================================
                  ACCOUNT CREDENTIALS
              ================================================= */}

              <div className="space-y-4 rounded-lg border border-white/10 bg-black/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-white/40">
                    Account Credentials
                  </p>
                  <Link
                    href="/portal/settings"
                    className="inline-flex items-center rounded-md border border-coral/50 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#0a0e19] transition hover:bg-coral hover:text-[#0a0e19]"
                  >
                    Edit Credentials
                  </Link>
                </div>

                <p className="text-xs leading-relaxed text-white/40">
                  Your sign-in credentials are protected here. Use Account Settings to change your username, email, or password.
                </p>
                {fieldError && (
                  <p className="rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-xs font-bold text-coral">
                    {fieldError}
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold text-white/50">Username</p>
                    <div className="mt-2 rounded-lg border border-white/10 bg-[#0d121c] px-4 py-3 text-sm text-white/80">
                      {account.username || "—"}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/50">Email</p>
                    <div className="mt-2 break-all rounded-lg border border-white/10 bg-[#0d121c] px-4 py-3 text-sm text-white/80">
                      {account.email || "—"}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-bold text-white/50">Password</p>
                    <div className="mt-2 rounded-lg border border-white/10 bg-[#0d121c] px-4 py-3 text-sm tracking-[0.25em] text-white/80">
                      ••••••••
                    </div>
                  </div>
                </div>
              </div>
{/* =================================================
                  BIO
              ================================================= */}

              <div>
                <div className="flex items-center justify-between">

                  <label
                    htmlFor="profile-bio"
                    className="text-xs font-black uppercase tracking-[0.15em] text-white/40"
                  >
                    Bio
                  </label>

                  <span className="text-xs font-bold text-white/30">
                    {draftBio.length}/180
                  </span>
                </div>

                <textarea
                  id="profile-bio"
                  value={draftBio}
                  maxLength={180}
                  onChange={(event) => setDraftBio(event.target.value)}
                  rows={4}
                  placeholder="Tell your crew something about yourself..."
                  className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-[#0d121c] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-coral focus:ring-4 focus:ring-coral/10"
                />
              </div>

              {/* =================================================
                  SOCIALS
              ================================================= */}

              <div>
                <label className="text-xs font-black uppercase tracking-[0.15em] text-white/40">
                  Social Profiles
                </label>

                <p className="mt-1 text-sm text-white/35">
                  Add your public social profiles so other crew members can
                  find you.
                </p>

                <div className="mt-4 space-y-3">

                  {/* TWITTER */}

                  <div className="relative">
                    <Twitter className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/30" />

                    <input
                      type="url"
                      value={draftTwitter}
                      onChange={(event) =>
                        setDraftTwitter(event.target.value)
                      }
                      placeholder="https://x.com/yourusername"
                      className="w-full rounded-lg border border-white/10 bg-[#0d121c] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-coral focus:ring-4 focus:ring-coral/10"
                    />
                  </div>

                  {/* INSTAGRAM */}

                  <div className="relative">
                    <Instagram className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/30" />

                    <input
                      type="url"
                      value={draftInstagram}
                      onChange={(event) =>
                        setDraftInstagram(event.target.value)
                      }
                      placeholder="https://instagram.com/yourusername"
                      className="w-full rounded-lg border border-white/10 bg-[#0d121c] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-coral focus:ring-4 focus:ring-coral/10"
                    />
                  </div>

                  {/* YOUTUBE */}

                  <div className="relative">
                    <Youtube className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/30" />

                    <input
                      type="url"
                      value={draftYoutube}
                      onChange={(event) =>
                        setDraftYoutube(event.target.value)
                      }
                      placeholder="https://youtube.com/@yourchannel"
                      className="w-full rounded-lg border border-white/10 bg-[#0d121c] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-coral focus:ring-4 focus:ring-coral/10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================
                MODAL FOOTER
            ================================================= */}

            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-white/[0.07] bg-[#151c29]/95 px-6 py-5 backdrop-blur-xl sm:flex-row sm:justify-end sm:px-8">

              <button
                type="button"
                onClick={cancelEditor}
                className="rounded-md border border-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.08em] text-white/50 transition hover:border-white/20 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveProfile}
                className="rounded-md bg-coral px-6 py-3 text-xs font-black uppercase tracking-[0.08em] text-white shadow-lg shadow-coral/20 transition hover:-translate-y-0.5 hover:bg-coral/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
