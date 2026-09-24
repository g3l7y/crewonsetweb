import { WEBSITE_DATA_KEYS, getWebsiteRecords, setWebsiteRecords } from "@/lib/playfab/websiteData";

type CompletedTopUp = {
  id: string;
  playFabId: string;
  username?: string;
  coins: number;
  amountInCentavos: number;
  completedAt?: string;
};

type PlayerNotificationRecord = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  kind: "transaction";
  channel: "notification";
  read: boolean;
  href: string;
  target: { kind: "players"; playerIds: string[] };
  recipientUsername?: string;
};

/** Persist one account-scoped notice per fulfilled C-Coin top-up. */
export async function recordPlayerTopUpNotification(
  order: CompletedTopUp,
  secretKey: string,
): Promise<boolean> {
  const existing = await getWebsiteRecords<PlayerNotificationRecord>(
    WEBSITE_DATA_KEYS.playerNotifications,
    secretKey,
  );
  const id = "paymongo-topup-" + order.id;
  if (existing.some((notification) => notification.id === id)) return true;

  const amount = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(order.amountInCentavos / 100);
  const notification: PlayerNotificationRecord = {
    id,
    title: "C-Coin top-up confirmed",
    body:
      order.coins.toLocaleString("en-PH") +
      " C-Coins have been credited to your account after your " +
      amount +
      " payment.",
    createdAt: order.completedAt || new Date().toISOString(),
    kind: "transaction",
    channel: "notification",
    read: false,
    href: "/portal/shop",
    target: { kind: "players", playerIds: [order.playFabId] },
    ...(order.username ? { recipientUsername: order.username } : {}),
  };
  return setWebsiteRecords(
    WEBSITE_DATA_KEYS.playerNotifications,
    [notification, ...existing],
    secretKey,
  );
}
