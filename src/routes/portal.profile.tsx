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
  X,
  Twitter,
  Youtube,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EMAIL_ERROR, USERNAME_ERROR, isValidEmail, isValidUsername } from "@/lib/validation";
import { useQueryClient } from "@tanstack/react-query";
import {
  formatCoins,
  formatTransactionDate,
  loadoutSlots,
  transactionsStore,
} from "@/lib/demo/store";
import { CosmeticArt } from "@/components/portal/cosmetic-art";
import { cosmeticCatalog, equippedItemsStore, freeBodyItems, freeCatalogItems, freeCosmeticIds, ownedItemsStore, type CosmeticItem } from "@/lib/demo/portal-shop";
import { getProfileArtwork } from "@/lib/demo/profile-art";
import { DEFAULT_PROFILE_PICTURE_URL } from "@/lib/profile-avatar";
import { isMockMode } from "@/lib/playfab/config";
import { achievementEmoji } from "@/lib/achievement-emoji";
import { formatSocialUsername, getSocialProfileUrl, normalizeSocialProfile } from "@/lib/profile-socials";
import { QUERY_KEYS, useAchievements, useCatalog, usePlayerInventory, usePlayerLoadout, usePlayerProfile, usePlayerProgression, useTransactions, useUpdateLoadout, useUpdateProfile } from "@/lib/playfab/hooks";
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
  const [demoEquippedItems] = equippedItemsStore.useStore();
  const profileQuery = usePlayerProfile();
  const achievementsQuery = useAchievements();
  const progressionQuery = usePlayerProgression();
  const inventoryQuery = usePlayerInventory();
  const catalogQuery = useCatalog();
  const loadoutQuery = usePlayerLoadout();
  const transactionsQuery = useTransactions();
  const updateProfileMutation = useUpdateProfile();
  const updateLoadoutMutation = useUpdateLoadout();
  const queryClient = useQueryClient();

  const demoOwnedItems = [...cosmeticCatalog, ...freeBodyItems].filter((item) => ownedIds.includes(item.id) || freeCosmeticIds.includes(item.id));
  const realCatalogItems = useMemo(() => (catalogQuery.data ?? [])
    .map((remote) => {
      const category = remote.category as (typeof cosmeticCatalog)[number]["category"];
      if (!["Face", "Hair", "Tops", "Bottoms", "Shoe Wear", "Accessories"].includes(category)) return null;
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
        price: freeCosmeticIds.includes(remote.itemId) ? 0 : remote.price ?? 0,
        rarity,
        description: remote.description ?? "",
        assetKey: remote.customData?.assetKey ?? "",
        imagePath: cosmeticCatalog.find((candidate) =>
          candidate.id === remote.itemId || candidate.assetKey === (remote.customData?.assetKey ?? "")
        )?.imagePath,
        imageUrl: cosmeticCatalog.some((candidate) =>
          candidate.id === remote.itemId || candidate.assetKey === (remote.customData?.assetKey ?? "")
        ) ? "" : remote.customData?.imageUrl ?? "",
      };
    })
    .filter((item): item is (typeof cosmeticCatalog)[number] => item !== null), [catalogQuery.data]);
  const bundledFaceItems = cosmeticCatalog.filter((item) => item.category === "Face");
  const profileCosmeticItems = mockMode
    ? [...cosmeticCatalog, ...freeBodyItems]
    : [
        ...realCatalogItems,
        ...bundledFaceItems.filter((item) => !realCatalogItems.some((remote) => remote.id === item.id)),
        ...freeCatalogItems.filter((item) => !realCatalogItems.some((remote) => remote.id === item.id)),
        ...freeBodyItems,
      ];
  const realOwnedItems = profileCosmeticItems.filter((item) =>
    freeCosmeticIds.includes(item.id) || inventoryQuery.data?.some((inventoryItem) => inventoryItem.itemId === item.id)
  );
  const ownedItems = mockMode ? demoOwnedItems : realOwnedItems;

  const demoEquippedBySlot = Object.fromEntries(
    [...cosmeticCatalog, ...freeBodyItems].map((item) => [item.category, item.id]).filter(([slot, id]) =>
      demoEquippedItems[slot as string] === id && (ownedIds.includes(id as string) || freeCosmeticIds.includes(id as string))
    ).map(([slot, id]) => [slot, profileCosmeticItems.find((item) => item.id === id)]),
  );
  const realLoadout = loadoutQuery.data ?? {};
  const realEquippedBySlot = {
    Face: realOwnedItems.find((item) => item.id === (realLoadout.Face ?? realLoadout.face)),
    Body: realOwnedItems.find((item) => item.id === (realLoadout.Body ?? realLoadout.body)) ?? realOwnedItems.find((item) => item.id === "avatar-body-girl"),
    Hair: realOwnedItems.find((item) => item.id === (realLoadout.Hair ?? realLoadout.hair)),
    Tops: realOwnedItems.find((item) => item.id === (realLoadout.Tops ?? realLoadout.tops ?? realLoadout.Shirt ?? realLoadout.shirt ?? realLoadout.costume)),
    Bottoms: realOwnedItems.find((item) => item.id === (realLoadout.Bottoms ?? realLoadout.bottoms)),
    "Shoe Wear": realOwnedItems.find((item) => item.id === (realLoadout["Shoe Wear"] ?? realLoadout.ShoeWear ?? realLoadout.Shoes ?? realLoadout.shoes ?? realLoadout.equipment)),
    Accessories: realOwnedItems.find((item) => item.id === (realLoadout.Accessories ?? realLoadout.Accessory ?? realLoadout.accessory ?? realLoadout.Eyeglasses ?? realLoadout.eyeglasses ?? realLoadout.decorator)),
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
          label: transaction.description || "Account transaction",
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
    DEFAULT_PROFILE_PICTURE_URL
  );
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarCategory, setAvatarCategory] = useState<"All" | CosmeticItem["category"]>("All");
  const [avatarDraftLoadout, setAvatarDraftLoadout] = useState<Record<string, string>>({});
  const [avatarStatus, setAvatarStatus] = useState("");

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


  useEffect(() => {
    const profile = profileQuery.data;
    if (mockMode) {
      setAccount(readProfileAccount());
      if (!profile) return;
      setBio(profile.bio || "");
      setTwitter(profile.socialLinks?.twitter || "");
      setInstagram(profile.socialLinks?.instagram || "");
      setYoutube(profile.socialLinks?.youtube || "");
      setProfileImage(profile.avatarUrl || getProfileArtwork(profile.username || profile.displayName || "Player"));
      return;
    }

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
    const socialLinks = {
      twitter: normalizeSocialProfile(draftTwitter, "twitter"),
      instagram: normalizeSocialProfile(draftInstagram, "instagram"),
      youtube: normalizeSocialProfile(draftYoutube, "youtube"),
    };
    const normalizedBio = draftBio.trim();
    if (!mockMode) {
      try {
        const credentialsChanged =
          nextAccount.username.toLowerCase() !== account.username.toLowerCase() ||
          nextAccount.email.toLowerCase() !== account.email.toLowerCase();
        await updateProfileMutation.mutateAsync({
          ...(credentialsChanged && nextAccount.username.toLowerCase() !== account.username.toLowerCase()
            ? { username: nextAccount.username }
            : {}),
          ...(credentialsChanged && nextAccount.email.toLowerCase() !== account.email.toLowerCase()
            ? { email: nextAccount.email }
            : {}),
          bio: normalizedBio,
          socialLinks,
        });
      } catch {
        setFieldError("Couldn't save your profile changes. Please try again.");
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

        await updateProfileMutation.mutateAsync({ bio: normalizedBio, socialLinks });
        window.localStorage.setItem(
          PROFILE_ACCOUNT_KEY,
          JSON.stringify(nextAccount),
        );
        const existingPlayerAccount = window.localStorage.getItem("player-account");
        const playerAccount = existingPlayerAccount
          ? JSON.parse(existingPlayerAccount) as Record<string, unknown>
          : {};
        window.localStorage.setItem(
          "player-account",
          JSON.stringify({ ...playerAccount, ...nextAccount, bio: normalizedBio, socialLinks }),
        );
        if (draftPassword) {
          window.localStorage.setItem("cos.profile.password", draftPassword);
        }
      } catch {
        setFieldError("Unable to save your profile changes. Please try again.");
        return;
      }
    }

    setBio(normalizedBio);
    setTwitter(socialLinks.twitter);
    setInstagram(socialLinks.instagram);
    setYoutube(socialLinks.youtube);
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
      setFieldError("Email and password changes aren't available from this page yet. Contact support if you need help.");
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
      setConfirmError("Account sign-in details can't be changed from this page yet. Contact support for help.");
      return;
    }

    if (confirmPasswordInput !== DEMO_PASSWORD) {
      setConfirmError('Incorrect password. This is a demo — try "player".');
      return;
    }
    void applySave();
  };

  const hasSocials = twitter || instagram || youtube;
  const avatarCategories: Array<"All" | CosmeticItem["category"]> = ["All", "Face", "Body", "Hair", "Tops", "Bottoms", "Shoe Wear", "Accessories"];
  const avatarOwnedIds = new Set([
    ...ownedItems.map((item) => item.id),
    ...profileCosmeticItems.filter((item) => freeCosmeticIds.includes(item.id)).map((item) => item.id),
  ]);
  const visibleAvatarItems = profileCosmeticItems.filter((item) =>
    avatarOwnedIds.has(item.id) && (avatarCategory === "All" || item.category === avatarCategory),
  );
  const getAvatarItem = (slot: string) => profileCosmeticItems.find((item) => item.id === avatarDraftLoadout[slot]);

  const openAvatarCustomizer = () => {
    const equipped = Object.fromEntries(Object.entries(equippedBySlot)
      .filter(([, item]) => item)
      .map(([slot, item]) => [slot, item!.id]));
    if (!equipped.Body) equipped.Body = "avatar-body-girl";
    setAvatarDraftLoadout(equipped);
    setAvatarCategory("All");
    setAvatarStatus("");
    setAvatarOpen(true);
  };

  const tryOnAvatarItem = (item: CosmeticItem) => {
    setAvatarDraftLoadout((current) => ({ ...current, [item.category]: item.id }));
    setAvatarStatus(`Trying on ${item.name}. This preview is not saved yet.`);
  };

  const equipAvatarItem = async (item: CosmeticItem) => {
    if (!avatarOwnedIds.has(item.id)) {
      setAvatarStatus("You need to own this cosmetic before equipping it.");
      return;
    }
    const next = { ...avatarDraftLoadout, [item.category]: item.id };
    try {
      await updateLoadoutMutation.mutateAsync(next);
      setAvatarDraftLoadout(next);
      setAvatarStatus(`${item.name} equipped. The game will sync this outfit from your account.`);
    } catch (error) {
      setAvatarStatus(error instanceof Error ? error.message : "Could not sync this outfit. Please try again.");
    }
  };

  return (
    <div className="portal-title-page min-h-screen bg-[#0d121c] px-4 pb-12 text-white sm:px-6 lg:px-8">
      <div className="portal-title-container mx-auto max-w-[1500px] pt-8 sm:pt-10">

        {/* =========================================================
            PAGE HEADER
        ========================================================= */}

        <header className="portal-title-header flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="portal-title-heading text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
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

              <div className="flex shrink-0 flex-col items-center gap-3">
                <div className="relative size-36 overflow-hidden rounded-full border-[6px] border-yellow bg-[#0d121c] shadow-2xl shadow-black/30">
                  <Image
                    src={profileImage}
                    alt={profileDisplayName + " avatar"}
                    fill
                    unoptimized={profileImage.startsWith("blob:") || profileImage.startsWith("data:")}
                    className="object-cover object-[62%_45%]"
                  />
                </div>
                <button
                  type="button"
                  onClick={openAvatarCustomizer}
                  className="rounded-md border border-yellow/30 bg-[#0d121c] px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-yellow transition hover:border-yellow hover:bg-yellow/10"
                >
                  View Avatar
                </button>
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
                    href={getSocialProfileUrl("twitter", twitter)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3.5 py-2.5 text-sm font-bold text-white/60 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                  >
                    <Twitter className="size-4" />
                    <span>Twitter / X <span className="text-white/35">{formatSocialUsername("twitter", twitter)}</span></span>
                  </a>
                )}

                {instagram && (
                  <a
                    href={getSocialProfileUrl("instagram", instagram)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3.5 py-2.5 text-sm font-bold text-white/60 transition hover:border-coral/40 hover:bg-coral/10 hover:text-coral"
                  >
                    <Instagram className="size-4" />
                    <span>Instagram <span className="text-white/35">{formatSocialUsername("instagram", instagram)}</span></span>
                  </a>
                )}

                {youtube && (
                  <a
                    href={getSocialProfileUrl("youtube", youtube)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3.5 py-2.5 text-sm font-bold text-white/60 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-400"
                  >
                    <Youtube className="size-4" />
                    <span>YouTube <span className="text-white/35">{formatSocialUsername("youtube", youtube)}</span></span>
                  </a>
                )}

                {!hasSocials && (
                  <span className="rounded-md border border-dashed border-white/10 px-4 py-3 text-sm font-bold text-white/30">
                    No social profiles added
                  </span>
                )}
              </div>
            </div>

            {profileQuery.data?.showCrewActivity !== false && (
              <section className="mt-8 border-t border-white/[0.07] pt-7">
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-white/45">Unlocked Achievements</h3>
                {(achievementsQuery.data ?? []).filter((achievement) => achievement.unlocked).length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(achievementsQuery.data ?? []).filter((achievement) => achievement.unlocked).map((achievement) => (
                      <span key={achievement.id} className="inline-flex items-center gap-2 rounded-md border border-yellow/20 bg-yellow/10 px-3 py-2 text-xs font-bold text-yellow">
                        <span aria-hidden="true" className="text-base leading-none">
                          {achievementEmoji(achievement.name || achievement.title)}
                        </span>
                        {achievement.name || achievement.title}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-white/35">No achievements unlocked yet.</p>
                )}
              </section>
            )}
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
                            {piece.imageUrl ? <img src={piece.imageUrl} alt="" className="size-full object-cover" /> : piece.assetKey || piece.imagePath ? <CosmeticArt item={piece} className="size-full" /> : <div className="size-full" aria-hidden="true" />}
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

      {avatarOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#05080d]/85 p-3 backdrop-blur-md sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setAvatarOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="avatar-customizer-title" className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border-2 border-yellow/70 bg-[#f1eadb] text-[#121826] shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b-2 border-[#121826]/15 bg-[#e6dcc7] px-5 py-4 sm:px-7">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#aa7100]">Crew wardrobe</p>
                <h2 id="avatar-customizer-title" className="mt-1 text-2xl font-black uppercase tracking-wide sm:text-3xl">View Avatar</h2>
                <p className="mt-1 text-sm text-[#303b4c]/75">Try on cosmetics, then equip owned items to sync your outfit to the game.</p>
              </div>
              <button type="button" aria-label="Close avatar customizer" onClick={() => setAvatarOpen(false)} className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#121826]/20 bg-[#f8f2e6] text-[#121826] transition hover:bg-yellow">
                <X className="size-5" />
              </button>
            </header>
            <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="border-b border-[#121826]/15 bg-[#e9dfcc] p-5 lg:border-b-0 lg:border-r">
                <div className="mx-auto grid size-40 place-items-center overflow-hidden rounded-full border-[5px] border-yellow bg-[#0d121c] shadow-lg">
                  <Image src={profileImage} alt={profileDisplayName + " avatar"} width={160} height={160} unoptimized={profileImage.startsWith("blob:") || profileImage.startsWith("data:")} className="size-full object-cover object-[62%_45%]" />
                </div>
                <p className="mt-3 text-center text-sm font-black uppercase tracking-wide">{profileDisplayName}</p>
                <p className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#303b4c]/55">Profile picture</p>
                <p className="mt-1 text-center text-[10px] leading-4 text-[#303b4c]/60">Item artwork previews are shown here. The live 3D avatar render is available in the game.</p>
                <div className="mt-5 rounded-xl border border-[#121826]/10 bg-[#f8f2e6] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#aa7100]">Outfit preview</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {loadoutSlots.map((slot) => {
                      const item = getAvatarItem(slot);
                      return <div key={slot} className="min-w-0 rounded-lg border border-[#121826]/10 bg-white/60 p-2">
                        <span className="block text-[9px] font-black uppercase tracking-wide text-[#303b4c]/55">{slot}</span>
                        {item ? <div className="mt-1 flex items-center gap-2">
                          <div className="size-9 shrink-0 overflow-hidden rounded-md bg-[#eee7d9]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="size-full object-contain" /> : <CosmeticArt item={item} className="size-full" />}</div>
                          <span className="truncate text-[10px] font-bold">{item.name}</span>
                        </div> : <p className="mt-1 text-[10px] text-[#303b4c]/45">Default</p>}
                      </div>;
                    })}
                  </div>
                </div>
              </aside>
              <div className="min-w-0 p-4 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  {avatarCategories.map((category) => <button key={category} type="button" onClick={() => setAvatarCategory(category)} className={`rounded-md border px-3 py-2 text-[10px] font-black uppercase tracking-wide transition ${avatarCategory === category ? "border-[#121826] bg-yellow text-[#121826]" : "border-[#121826]/20 bg-white/60 text-[#303b4c] hover:bg-yellow/35"}`}>{category === "Shoe Wear" ? "Shoe Wear" : category}</button>)}
                  <Link href="/portal/shop" onClick={() => setAvatarOpen(false)} className="ml-auto rounded-md border border-[#121826]/20 bg-[#121826] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-yellow hover:bg-[#263246]">Shop C-Coin items</Link>
                </div>
                {avatarStatus && <p role="status" className="mt-4 rounded-lg border border-[#aa7100]/25 bg-yellow/20 px-3 py-2 text-xs font-bold text-[#51401c]">{avatarStatus}</p>}
                {updateLoadoutMutation.isPending && <p className="mt-3 text-xs font-bold text-[#303b4c]/65">Syncing your outfit to your game account…</p>}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {visibleAvatarItems.map((item) => {
                    const owned = avatarOwnedIds.has(item.id);
                    const equipped = equippedBySlot[item.category]?.id === item.id;
                    const previewed = avatarDraftLoadout[item.category] === item.id;
                    return <article key={item.id} className={`flex min-w-0 flex-col overflow-hidden rounded-xl border-2 bg-[#f8f2e6] shadow-[3px_3px_0_#12182622] ${previewed ? "border-yellow" : "border-[#121826]/15"}`}>
                      <div className="relative aspect-square bg-[#eee7d9] p-3">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="size-full object-contain" /> : <CosmeticArt item={item} className="size-full" />}
                        <span className="absolute left-2 top-2 rounded-full border border-[#121826]/15 bg-[#fffaf0] px-2 py-1 text-[8px] font-black uppercase tracking-wide text-[#aa7100]">{item.category}</span>
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <h3 className="line-clamp-2 min-h-9 text-xs font-black uppercase leading-4">{item.name}</h3>
                        <p className="mt-1 text-[10px] font-bold text-[#aa7100]">{item.price === 0 ? "FREE" : `${item.price.toLocaleString()} C-COINS`}</p>
                        <p className="mt-1 text-[10px] font-bold text-[#303b4c]/55">{equipped ? "Equipped" : owned ? "Owned" : "Available"}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => tryOnAvatarItem(item)} className="rounded-md border border-[#121826]/20 bg-yellow px-2 py-2 text-[9px] font-black uppercase tracking-wide hover:bg-yellow/75">Try On</button>
                          {owned ? <button type="button" disabled={equipped || updateLoadoutMutation.isPending} onClick={() => void equipAvatarItem(item)} className="rounded-md border border-[#121826] bg-[#121826] px-2 py-2 text-[9px] font-black uppercase tracking-wide text-white disabled:opacity-50">{equipped ? "Equipped" : "Equip"}</button> : <Link href="/portal/shop" onClick={() => setAvatarOpen(false)} className="rounded-md border border-coral bg-coral px-2 py-2 text-center text-[9px] font-black uppercase tracking-wide text-white hover:bg-coral/85">Buy</Link>}
                        </div>
                      </div>
                    </article>;
                  })}
                </div>
                {visibleAvatarItems.length === 0 && <p className="rounded-xl border border-dashed border-[#121826]/20 p-8 text-center text-sm text-[#303b4c]/60">You don’t own any {avatarCategory === "All" ? "cosmetics" : avatarCategory} yet.</p>}
              </div>
            </div>
          </section>
        </div>
      )}

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
                      type="text"
                      value={draftTwitter}
                      onChange={(event) =>
                        setDraftTwitter(event.target.value)
                      }
                      placeholder="@yourusername"
                      className="w-full rounded-lg border border-white/10 bg-[#0d121c] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-coral focus:ring-4 focus:ring-coral/10"
                    />
                  </div>

                  {/* INSTAGRAM */}

                  <div className="relative">
                    <Instagram className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/30" />

                    <input
                      type="text"
                      value={draftInstagram}
                      onChange={(event) =>
                        setDraftInstagram(event.target.value)
                      }
                      placeholder="@yourusername"
                      className="w-full rounded-lg border border-white/10 bg-[#0d121c] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-coral focus:ring-4 focus:ring-coral/10"
                    />
                  </div>

                  {/* YOUTUBE */}

                  <div className="relative">
                    <Youtube className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/30" />

                    <input
                      type="text"
                      value={draftYoutube}
                      onChange={(event) =>
                        setDraftYoutube(event.target.value)
                      }
                      placeholder="@yourchannel"
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
