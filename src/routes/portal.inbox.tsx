import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox — Crew On Set!" },
      {
        name: "description",
        content: "Review player activity and exchange messages with friends.",
      },
    ],
  }),
  component: InboxPage,
});

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "@/components/next-compat/image";
import { useRouter, useSearchParams } from "@/components/next-compat/navigation";
import {
  ArrowRight,
  Bell,
  CheckCheck,
  CircleDot,
  Flag,
  Mail,
  MailOpen,
  Megaphone,
  MessageCircle,
  Send,
  Settings2,
  ShoppingBag,
  Trophy,
  Users,
} from "lucide-react";
import { friendRosterStore } from "@/lib/demo/friends";
import {
  notificationsStore,
  playerMailStore,
  type PlayerMail,
  type PlayerNotification,
} from "@/lib/demo/store";
import {
  isActivityNotification,
  isPlayerAccountNotification,
  isMailNotification,
  matchesPlayerRecipient,
  notificationHref,
  relativeTime,
} from "@/lib/demo/inbox";
import { getProfileArtwork } from "@/lib/demo/profile-art";
import { isMockMode } from "@/lib/playfab/config";
import { useFriends, useNotifications, usePlayerProfile, useSession } from "@/lib/playfab/hooks";

type InboxNotification = {
  id: string;
  title: string;
  body?: string | undefined;
  createdAt: string;
  kind?: string | undefined;
  read: boolean;
  href?: string | undefined;
  channel?: "notification" | "mail" | undefined;
  recipientUsername?: string | undefined;
  recipientEmail?: string | undefined;
  target?: { kind: "all" | "players"; playerIds?: string[] | undefined } | undefined;
  senderUsername?: string | undefined;
};

type MailRow =
  | PlayerMail
  | (InboxNotification & {
      senderUsername: string;
      recipientUsername: string;
      subject: string;
      kind: "admin" | "friend";
    });

type InboxFriend = {
  name: string;
  level: number;
  role: string;
  online: boolean;
  showStatus?: boolean | undefined;
  crewId: string;
  profileImage?: string | undefined;
  playFabId?: string;
};

const iconByKind: Record<string, typeof Bell> = {
  announcement: Megaphone,
  achievement: Trophy,
  friend: Users,
  shop: ShoppingBag,
  transaction: ShoppingBag,
  report: Flag,
  system: Settings2,
};

type RawInboxNotification = {
  id: string;
  title: string;
  body?: string | undefined;
  createdAt: string;
  kind?: string | undefined;
  read: boolean;
  href?: string | undefined;
  channel?: "notification" | "mail" | undefined;
  recipientUsername?: string | undefined;
  recipientEmail?: string | undefined;
  target?: InboxNotification["target"];
  senderUsername?: string | undefined;
};

function normalizeNotification(notification: RawInboxNotification): InboxNotification {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body ?? "",
    createdAt: notification.createdAt,
    kind: notification.kind,
    read: notification.read,
    href: notification.href,
    channel: notification.channel,
    recipientUsername: notification.recipientUsername,
    recipientEmail: notification.recipientEmail,
    target: notification.target,
    senderUsername: notification.senderUsername,
  };
}

function sortNewest<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function formatMessageTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function InboxPage() {
  const mockMode = isMockMode();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileQuery = usePlayerProfile();
  const sessionQuery = useSession();
  const realFriendsQuery = useFriends();
  const realNotificationsQuery = useNotifications();
  const [demoNotifications, setDemoNotifications] = notificationsStore.useStore();
  const [demoMail, setDemoMail] = playerMailStore.useStore();
  const [demoFriends] = friendRosterStore.useStore();
  const [realNotifications, setRealNotifications] = useState<InboxNotification[]>([]);
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [composerMessage, setComposerMessage] = useState("");

  const currentUsername =
    profileQuery.data?.username ??
    profileQuery.data?.displayName ??
    sessionQuery.data?.username ??
    (mockMode ? "CAMERA_PRO" : "");
  const currentEmail =
    profileQuery.data?.email ??
    sessionQuery.data?.email ??
    (mockMode ? "player@crewonset.com" : "");
  const currentPlayerId =
    profileQuery.data?.playFabId ??
    sessionQuery.data?.playFabId ??
    (mockMode ? "MOCK-PLAYER-001" : "");
  const requestedTab = searchParams.get("tab") === "mail" ? "mail" : "notifications";
  const [activeTab, setActiveTab] = useState<"notifications" | "mail">(requestedTab);

  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    if (!mockMode) {
      setRealNotifications((realNotificationsQuery.data ?? []).map(normalizeNotification));
    }
  }, [mockMode, realNotificationsQuery.data]);

  const sourceNotifications = mockMode
    ? demoNotifications.map(normalizeNotification)
    : realNotifications;

  const visibleNotifications = useMemo(
    () =>
      sourceNotifications.filter(
        (notification) =>
          isPlayerAccountNotification(notification) &&
          matchesPlayerRecipient(notification, currentUsername, currentEmail, currentPlayerId),
      ),
    [currentEmail, currentPlayerId, currentUsername, sourceNotifications],
  );

  const activityNotifications = useMemo(
    () => sortNewest(visibleNotifications.filter(isActivityNotification)),
    [visibleNotifications],
  );

  const directMail = useMemo(
    () =>
      visibleNotifications.filter(isMailNotification).map<MailRow>((notification) => ({
        ...notification,
        subject: notification.title,
        senderUsername: notification.senderUsername ?? "ADMINISTRATOR",
        recipientUsername: notification.recipientUsername ?? currentUsername,
        kind: notification.kind === "friend" ? "friend" : "admin",
      })),
    [currentUsername, visibleNotifications],
  );

  const friendMail = useMemo(
    () =>
      mockMode
        ? demoMail.filter(
            (mail) =>
              mail.recipientUsername.toLowerCase() === currentUsername.toLowerCase() ||
              mail.senderUsername.toLowerCase() === currentUsername.toLowerCase(),
          )
        : [],
    [currentUsername, demoMail, mockMode],
  );
  const mailRows = useMemo(
    () => sortNewest([...friendMail, ...directMail]),
    [directMail, friendMail],
  );

  const allFriends: InboxFriend[] = mockMode
    ? demoFriends
    : (realFriendsQuery.data ?? [])
        .filter((friend) => friend.status === "confirmed")
        .map((friend) => ({
          name: friend.username?.trim() || friend.displayName.trim() || "Crew Member",
          level: friend.level ?? 1,
          role: friend.role ?? "Crew Member",
          online: Boolean(friend.online),
          showStatus: friend.showStatus,
          crewId: friend.playFabId,
          profileImage: friend.avatarUrl,
          playFabId: friend.playFabId,
        }));
  function avatarFor(username: string) {
    const matchingFriend = allFriends.find(
      (friend) => friend.name.toLowerCase() === username.toLowerCase(),
    );
    if (matchingFriend?.profileImage) {
      return matchingFriend.profileImage;
    }

    if (username.toLowerCase() === currentUsername.toLowerCase()) {
      return profileQuery.data?.avatarUrl || getProfileArtwork(currentUsername);
    }

    return getProfileArtwork(username);
  }

  const unreadNotifications = activityNotifications.filter(
    (notification) => !notification.read,
  ).length;
  const unreadMail = mailRows.filter((mail) => !mail.read).length;
  const selectedFriend = allFriends.find(
    (friend) => friend.name.toLowerCase() === recipient.toLowerCase(),
  );
  const selectedAdminMail = recipient === "ADMINISTRATOR";
  const selectedMessages = selectedFriend
    ? mailRows.filter(
        (mail) =>
          mail.kind === "friend" &&
          ((mail.senderUsername.toLowerCase() === selectedFriend.name.toLowerCase() &&
            mail.recipientUsername.toLowerCase() === currentUsername.toLowerCase()) ||
            (mail.senderUsername.toLowerCase() === currentUsername.toLowerCase() &&
              mail.recipientUsername.toLowerCase() === selectedFriend.name.toLowerCase())),
      )
    : selectedAdminMail
      ? mailRows.filter((mail) => mail.kind === "admin")
      : [];

  useEffect(() => {
    if (requestedTab !== "mail" || searchParams.get("contact") !== "admin") return;
    setRecipient("ADMINISTRATOR");
    const unreadMailIds = new Set(
      mailRows.filter((mail) => mail.kind === "admin" && !mail.read).map((mail) => mail.id),
    );
    if (unreadMailIds.size === 0) return;
    const unreadNoticeIds = new Set([...unreadMailIds].map((id) => id + "-notice"));
    if (mockMode) {
      setDemoNotifications((current) =>
        current.map((item) => (unreadNoticeIds.has(item.id) ? { ...item, read: true } : item)),
      );
      setDemoMail((current) =>
        current.map((item) => (unreadMailIds.has(item.id) ? { ...item, read: true } : item)),
      );
    } else {
      setRealNotifications((current) =>
        current.map((item) => (unreadNoticeIds.has(item.id) ? { ...item, read: true } : item)),
      );
      void fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...unreadMailIds, ...unreadNoticeIds] }),
      });
    }
  }, [
    mailRows,
    mockMode,
    requestedTab,
    searchParams,
    setDemoMail,
    setDemoNotifications,
    setRealNotifications,
  ]);

  function selectTab(tab: "notifications" | "mail") {
    setActiveTab(tab);
    router.push(tab === "mail" ? "/portal/inbox?tab=mail" : "/portal/inbox?tab=notifications");
  }

  function markNotificationRead(id: string) {
    if (mockMode) {
      setDemoNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
    } else {
      setRealNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
      void fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
    }
  }

  function markAllNotificationsRead() {
    if (mockMode) {
      setDemoNotifications((current) =>
        current.map((item) =>
          matchesPlayerRecipient(item, currentUsername, currentEmail, currentPlayerId) &&
          isPlayerAccountNotification(item)
            ? { ...item, read: true }
            : item,
        ),
      );
    } else {
      setRealNotifications((current) => current.map((item) => ({ ...item, read: true })));
      void fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: realNotifications.filter(isPlayerAccountNotification).map((item) => item.id),
        }),
      });
    }
  }

  function markMailRead(mail: MailRow) {
    if (mail.read) return;
    if (visibleNotifications.some((notification) => notification.id === mail.id)) {
      markNotificationRead(mail.id);
    } else if (mockMode) {
      setDemoMail((current) =>
        current.map((item) => (item.id === mail.id ? { ...item, read: true } : item)),
      );
    }
  }

  function selectContact(name: string) {
    setRecipient(name);
    mailRows
      .filter((mail) => {
        if (name === "ADMINISTRATOR") return mail.kind === "admin";
        return (
          mail.kind === "friend" &&
          (mail.senderUsername.toLowerCase() === name.toLowerCase() ||
            mail.recipientUsername.toLowerCase() === name.toLowerCase())
        );
      })
      .filter((mail) => !mail.read)
      .forEach(markMailRead);
  }

  function openNotification(notification: InboxNotification) {
    markNotificationRead(notification.id);
    router.push(notificationHref(notification));
  }

  function sendFriendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const friend = allFriends.find(
      (item) => item.name.toLowerCase() === recipient.trim().toLowerCase(),
    );
    if (!friend || !message.trim()) {
      setComposerMessage("Choose a friend and write a message.");
      return;
    }

    if (!mockMode) {
      if (!friend.playFabId) {
        setComposerMessage("This friend is missing a real PlayFab ID.");
        return;
      }
      void fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          recipientPlayerId: friend.playFabId,
          subject: "Message from " + currentUsername,
          body: message.trim(),
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const result = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(result?.error || "Message could not be sent.");
          }
          setMessage("");
          setComposerMessage("Message sent to " + friend.name + ".");
          window.setTimeout(() => setComposerMessage(""), 2500);
          void realNotificationsQuery.refetch();
        })
        .catch((error: unknown) => {
          setComposerMessage(error instanceof Error ? error.message : "Message could not be sent.");
        });
      return;
    }

    playerMailStore.set([
      {
        id: "mail-" + Date.now(),
        threadId: "thread-" + friend.name.toLowerCase(),
        subject: "Message from " + currentUsername,
        body: message.trim(),
        senderUsername: currentUsername,
        recipientUsername: friend.name,
        createdAt: new Date().toISOString(),
        read: true,
        kind: "friend",
      },
      ...playerMailStore.get(),
    ]);
    setMessage("");
    setComposerMessage("Message sent to " + friend.name + ".");
    window.setTimeout(() => setComposerMessage(""), 2500);
  }

  return (
    <div className="portal-page portal-title-page min-h-screen bg-[#0b1426] px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-8">
      <div className="portal-title-container mx-auto max-w-[1500px]">
        <header className="portal-title-header">
          <p className="portal-title-eyebrow text-xs font-black tracking-[.18em] text-coral">
            COMMUNICATION
          </p>
          <h1 className="portal-title-heading mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Inbox
          </h1>
          <p className="portal-title-subtitle mt-3 max-w-2xl text-base text-white/60 sm:text-lg">
            Keep up with your crew activity and messages.
          </p>
        </header>

        <div className="mt-8 grid gap-6">
          <section className="portal-panel portal-inbox-panel flex h-[min(760px,calc(100vh-9rem))] min-h-[34rem] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#121d32]">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Inbox sections">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "notifications"}
                  onClick={() => selectTab("notifications")}
                  className={
                    activeTab === "notifications"
                      ? "inline-flex items-center gap-2 rounded-md border-2 border-[#f0573d] bg-[#f0573d] px-4 py-2 text-xs font-black uppercase tracking-wide text-[#0a0e19]"
                      : "inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-wide text-white/70 transition hover:bg-white/10 hover:text-white"
                  }
                >
                  <Bell className="size-4" /> Notifications
                  {unreadNotifications > 0 && (
                    <span className="rounded-full bg-coral px-1.5 py-0.5 text-[10px] text-white">
                      {unreadNotifications}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "mail"}
                  onClick={() => selectTab("mail")}
                  className={
                    activeTab === "mail"
                      ? "inline-flex items-center gap-2 rounded-md border-2 border-[#fbbf24] bg-[#fbbf24] px-4 py-2 text-xs font-black uppercase tracking-wide text-[#0a0e19]"
                      : "inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-wide text-white/70 transition hover:bg-white/10 hover:text-white"
                  }
                >
                  <Mail className="size-4" /> Mail
                  {unreadMail > 0 && (
                    <span className="rounded-full bg-coral px-1.5 py-0.5 text-[10px] text-white">
                      {unreadMail}
                    </span>
                  )}
                </button>
              </div>
              {activeTab === "notifications" && unreadNotifications > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-coral hover:text-yellow"
                >
                  <CheckCheck className="size-4" /> Mark all read
                </button>
              )}
            </div>

            {activeTab === "notifications" ? (
              <div className="min-h-0 flex-1 overflow-y-scroll divide-y divide-white/10">
                {activityNotifications.length === 0 ? (
                  <div className="inbox-empty-state flex min-h-full translate-y-3 flex-col items-center justify-center px-6 py-16 text-center">
                    <Bell className="mx-auto size-10 text-white/25" />
                    <p className="mt-4 text-sm font-bold text-white/50">
                      You&apos;re all caught up.
                    </p>
                  </div>
                ) : (
                  activityNotifications.map((notification) => {
                    const Icon = iconByKind[notification.kind ?? "system"] ?? CircleDot;
                    return (
                      <button
                        type="button"
                        key={notification.id}
                        onClick={() => openNotification(notification)}
                        className={
                          notification.read
                            ? "flex w-full items-start gap-4 px-5 py-5 text-left opacity-70 transition hover:bg-white/[.04] sm:px-6"
                            : "flex w-full items-start gap-4 px-5 py-5 text-left transition hover:bg-white/[.04] sm:px-6"
                        }
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-coral">
                          <Icon className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-4">
                            <span className="text-sm font-black text-white sm:text-base">
                              {notification.title}
                            </span>
                            {!notification.read && (
                              <span className="mt-1 size-2 shrink-0 rounded-full bg-coral" />
                            )}
                          </span>
                          <span className="mt-1 block text-sm leading-relaxed text-white/60">
                            {notification.body}
                          </span>
                          <span className="mt-2 block text-[10px] font-black uppercase tracking-wide text-white/35">
                            {relativeTime(notification.createdAt)}
                          </span>
                        </span>
                        <ArrowRight className="mt-1 hidden size-4 shrink-0 text-white/35 sm:block" />
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="flex min-h-0 flex-col overflow-hidden border-b border-white/10 lg:border-b-0 lg:border-r">
                  <div className="shrink-0 border-b border-white/10 px-5 py-5 sm:px-6">
                    <h2 className="text-sm font-black uppercase tracking-wide text-white">Chat</h2>
                    <p className="mt-1 text-xs text-white/45">
                      Select one to open the conversation
                    </p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-scroll divide-y divide-white/10">
                    {allFriends.map((friend) => {
                      const isOnline = friend.online && friend.showStatus !== false;
                      const selected = recipient.toLowerCase() === friend.name.toLowerCase();
                      return (
                        <button
                          type="button"
                          key={friend.name}
                          aria-pressed={selected}
                          onClick={() => selectContact(friend.name)}
                          className={
                            selected
                              ? "flex w-full items-center gap-3 bg-white/[.08] px-5 py-4 text-left transition hover:bg-white/[.1]"
                              : "flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[.05]"
                          }
                        >
                          <span className="relative size-10 shrink-0 overflow-hidden rounded-full border border-white/15 bg-yellow">
                            <Image
                              src={friend.profileImage || getProfileArtwork(friend.name)}
                              alt={friend.name + " profile"}
                              fill
                              className="object-cover"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-black text-white">
                                {friend.name}
                              </span>
                              <span
                                className={
                                  isOnline
                                    ? "size-2 shrink-0 rounded-full bg-[#4bc4b4]"
                                    : "size-2 shrink-0 rounded-full bg-white/25"
                                }
                              />
                            </span>
                            <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-wide text-white/40">
                              {isOnline ? "Online" : "Offline"} · Level {friend.level} ·{" "}
                              {friend.role}
                            </span>
                          </span>
                          {mailRows.some(
                            (mail) =>
                              mail.kind === "friend" &&
                              !mail.read &&
                              (mail.senderUsername === friend.name ||
                                mail.recipientUsername === friend.name),
                          ) && <span className="size-2 shrink-0 rounded-full bg-coral" />}
                        </button>
                      );
                    })}
                    {mailRows.some((mail) => mail.kind === "admin") && (
                      <button
                        type="button"
                        aria-pressed={selectedAdminMail}
                        onClick={() => selectContact("ADMINISTRATOR")}
                        className={
                          selectedAdminMail
                            ? "flex w-full items-center gap-3 bg-white/[.08] px-5 py-4 text-left transition hover:bg-white/[.1]"
                            : "flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[.05]"
                        }
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-coral/15 text-coral">
                          <MailOpen className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-white">
                            Administrator
                          </span>
                          <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-white/40">
                            Inbox messages
                          </span>
                        </span>
                        {mailRows.some((mail) => mail.kind === "admin" && !mail.read) && (
                          <span className="size-2 shrink-0 rounded-full bg-coral" />
                        )}
                      </button>
                    )}
                  </div>
                </aside>

                <section className="flex min-h-0 min-w-0 flex-col">
                  {!recipient ? (
                    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                      <MessageCircle className="size-16 text-white/25" strokeWidth={1.5} />
                      <p className="mt-5 text-sm font-black uppercase tracking-wide text-white/45">
                        Select a friend to start chatting
                      </p>
                    </div>
                  ) : (
                    <>
                      <header className="flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
                        {selectedFriend ? (
                          <>
                            <span className="relative size-10 shrink-0 overflow-hidden rounded-full border border-white/15 bg-yellow">
                              <Image
                                src={
                                  selectedFriend.profileImage ||
                                  getProfileArtwork(selectedFriend.name)
                                }
                                alt={selectedFriend.name + " profile"}
                                fill
                                className="object-cover"
                              />
                            </span>
                            <span>
                              <span className="flex items-center gap-2 text-sm font-black uppercase text-white">
                                {selectedFriend.name}
                                <span
                                  className={
                                    selectedFriend.online && selectedFriend.showStatus !== false
                                      ? "size-2 rounded-full bg-[#4bc4b4]"
                                      : "size-2 rounded-full bg-white/25"
                                  }
                                />
                              </span>
                              <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-white/40">
                                Level {selectedFriend.level} · {selectedFriend.role}
                              </span>
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="grid size-10 place-items-center rounded-full bg-coral/15 text-coral">
                              <MailOpen className="size-5" />
                            </span>
                            <span>
                              <span className="block text-sm font-black uppercase text-white">
                                Administrator
                              </span>
                              <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-white/40">
                                Inbox messages
                              </span>
                            </span>
                          </>
                        )}
                      </header>

                      <div className="min-h-0 flex-1 overflow-y-scroll px-5 py-6 sm:px-8">
                        {selectedMessages.length === 0 ? (
                          <div className="flex h-full min-h-[18rem] flex-col items-center justify-center text-center">
                            <MessageCircle className="size-12 text-white/25" strokeWidth={1.5} />
                            <p className="mt-4 text-base font-black uppercase tracking-wide text-white/55">
                              {selectedFriend ? "Start the first convo!" : "No admin messages yet"}
                            </p>
                            {selectedFriend && (
                              <p className="mt-2 text-sm text-white/40">
                                Send a message below to begin.
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="mx-auto grid max-w-2xl gap-4">
                            {[...selectedMessages].reverse().map((mail) => {
                              const fromCurrentPlayer =
                                mail.senderUsername.toLowerCase() === currentUsername.toLowerCase();
                              return (
                                <div
                                  key={mail.id}
                                  className={
                                    fromCurrentPlayer
                                      ? "ml-auto flex max-w-[88%] items-start gap-2"
                                      : "mr-auto flex max-w-[88%] items-start gap-2"
                                  }
                                >
                                  <span
                                    className={
                                      fromCurrentPlayer
                                        ? "relative order-2 mt-1 size-8 shrink-0 overflow-hidden rounded-full border border-white/15 bg-yellow"
                                        : "relative mt-1 size-8 shrink-0 overflow-hidden rounded-full border border-white/15 bg-yellow"
                                    }
                                  >
                                    <Image
                                      src={avatarFor(mail.senderUsername)}
                                      alt={mail.senderUsername + " profile"}
                                      fill
                                      className="object-cover"
                                    />
                                  </span>
                                  <div className="min-w-0">
                                    <div
                                      className={
                                        fromCurrentPlayer
                                          ? "rounded-2xl rounded-br-sm bg-coral px-4 py-3 text-white"
                                          : "rounded-2xl rounded-bl-sm bg-white/[.08] px-4 py-3 text-white"
                                      }
                                    >
                                      <p className="text-sm leading-relaxed">{mail.body}</p>
                                    </div>
                                    <p
                                      className={
                                        fromCurrentPlayer
                                          ? "mt-1 text-right text-[10px] font-bold uppercase tracking-wide text-white/35"
                                          : "mt-1 text-[10px] font-bold uppercase tracking-wide text-white/35"
                                      }
                                    >
                                      {formatMessageTimestamp(mail.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {selectedFriend ? (
                        <form
                          onSubmit={sendFriendMessage}
                          className="border-t border-white/10 p-4 sm:p-5"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              value={message}
                              onChange={(event) => setMessage(event.target.value)}
                              className="min-w-0 flex-1 rounded-full border border-white/15 bg-[#0f1626] px-4 py-3 text-sm text-white"
                              placeholder={"Message " + selectedFriend.name + "..."}
                              aria-label="Message"
                            />
                            <button
                              type="submit"
                              aria-label="Send message"
                              className="mail-send-button grid size-11 shrink-0 place-items-center rounded-full bg-coral text-white transition hover:bg-yellow hover:text-[#0a0e19]"
                            >
                              <Send className="size-4" />
                            </button>
                          </div>
                          {composerMessage && (
                            <p className="mt-2 px-4 text-xs font-bold text-coral">
                              {composerMessage}
                            </p>
                          )}
                        </form>
                      ) : (
                        <p className="border-t border-white/10 px-5 py-4 text-center text-xs font-bold text-white/35">
                          This is a one-way support inbox. Replies to Administrator messages are
                          disabled.
                        </p>
                      )}
                    </>
                  )}
                </section>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
