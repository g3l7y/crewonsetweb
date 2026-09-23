import { WEBSITE_DATA_KEYS, getWebsiteRecords, setWebsiteRecords } from "@/lib/playfab/websiteData";

type PlayerMessageKind = "report" | "system";

type StoredPlayerRecord = {
  id: string;
  title: string;
  body: string;
  kind: PlayerMessageKind;
  channel: "notification" | "mail";
  read: boolean;
  createdAt: string;
  href: string;
  threadId?: string;
  senderUsername?: string;
  recipientUsername: string;
  target: { kind: "players"; playerIds: string[] };
};

export async function persistAdminPlayerMessage(args: {
  id: string;
  subject: string;
  body: string;
  recipientPlayerId: string;
  recipientUsername: string;
  kind: PlayerMessageKind;
  secretKey: string;
}) {
  const target = { kind: "players" as const, playerIds: [args.recipientPlayerId] };
  const href = "/portal/inbox?tab=mail&contact=admin";
  const createdAt = new Date().toISOString();
  const message: StoredPlayerRecord = {
    id: args.id,
    title: args.subject,
    body: args.body,
    kind: args.kind,
    channel: "mail",
    read: false,
    createdAt,
    href,
    threadId: "admin-" + args.recipientPlayerId,
    senderUsername: "ADMINISTRATOR",
    recipientUsername: args.recipientUsername,
    target,
  };
  const notice: StoredPlayerRecord = {
    id: args.id + "-notice",
    title: "New message from Administrator",
    body: "The admin team sent you a message: " + args.subject + ". Open your Inbox to read it.",
    kind: args.kind,
    channel: "notification",
    read: false,
    createdAt,
    href,
    recipientUsername: args.recipientUsername,
    target,
  };

  const mail = await getWebsiteRecords<StoredPlayerRecord>(WEBSITE_DATA_KEYS.playerMail, args.secretKey);
  const notifications = await getWebsiteRecords<StoredPlayerRecord>(WEBSITE_DATA_KEYS.notifications, args.secretKey);
  const nextMail = [message, ...mail.filter((item) => item.id !== message.id)];
  const nextNotifications = [notice, ...notifications.filter((item) => item.id !== notice.id)];
  const mailSaved = await setWebsiteRecords(WEBSITE_DATA_KEYS.playerMail, nextMail, args.secretKey);
  if (!mailSaved) return false;
  return setWebsiteRecords(WEBSITE_DATA_KEYS.notifications, nextNotifications, args.secretKey);
}
