import { cosmeticCatalog } from "./demo/portal-shop";
import type { PlayerTransaction } from "./demo/store";
import type { Transaction } from "./playfab/types";
export type PayMongoOrder = {
  id: string;
  checkoutSessionId?: string | undefined;
  packageId: string;
  coins: number;
  amountInCentavos: number;
  status: "pending" | "active" | "processing" | "fulfilled" | "failed";
  createdAt: string;
  paidAt?: string | undefined;
  paymentMethod?: string | undefined;
  email?: string | undefined;
  eventId?: string | undefined;
  updatedAt?: string | undefined;
};
export type ShopHistoryRecord = {
  id: string;
  title: string;
  itemName?: string | undefined;
  description: string;
  createdAt: string;
  amount: number;
  isSpend?: boolean;
  currency: string;
  status: string;
  payMongo: boolean;
  reference?: string | undefined;
  paymentMethod?: string | undefined;
  coinsReceived?: number;
  email?: string | undefined;
  checkoutSessionId?: string | undefined;
  eventId?: string | undefined;
  payMongoStatus?: "Completed" | "Pending" | "Failed";
};

export function buildShopHistory(mockMode: boolean, transactions: PlayerTransaction[], playerTransactions: Transaction[], payMongoOrders: PayMongoOrder[]): ShopHistoryRecord[] {
    const walletHistory: ShopHistoryRecord[] = (mockMode ? transactions : playerTransactions).map((transaction) => {
      if ("kind" in transaction) {
        const amount = transaction.amount;
        const seededPayMongoTopUp = mockMode && transaction.id === "tx-seed-2";
        const coinsReceived = seededPayMongoTopUp ? 7500 : Math.abs(amount);
        const paymentAmountPhp = transaction.paymentAmountPhp ?? (seededPayMongoTopUp ? 499 : undefined);
        return {
          id: transaction.id,
          title: transaction.kind === "topup" ? "C-Coin Top Up" : transaction.kind === "purchase" ? "Shop Purchase" : transaction.label,
          ...(transaction.kind === "purchase" ? { itemName: transaction.label } : {}),
          description: "",
          createdAt: transaction.createdAt,
          amount: paymentAmountPhp ?? Math.abs(amount),
          isSpend: transaction.kind === "purchase" || amount < 0,
          currency: paymentAmountPhp !== undefined ? "PHP" : "C-Coins",
          status: transaction.payMongo || seededPayMongoTopUp ? "Completed" : "Recorded",
          payMongo: transaction.payMongo ?? seededPayMongoTopUp,
          reference: transaction.id,
          ...(transaction.kind === "topup" ? { coinsReceived } : {}),
          ...(transaction.kind === "purchase" ? { paymentMethod: "C-Coins" } : {}),
          ...(transaction.paymentMethod || seededPayMongoTopUp ? { paymentMethod: transaction.paymentMethod || "QR Ph · Demo" } : {}),
        };
      }
      const playFabTransaction = transaction as Transaction;
      const isSpend = playFabTransaction.type === "purchase" || playFabTransaction.type === "spend";
      const itemName = playFabTransaction.itemId
        ? cosmeticCatalog.find((item) => item.id === playFabTransaction.itemId)?.name || playFabTransaction.description || playFabTransaction.itemId
        : playFabTransaction.description;
      return {
        id: playFabTransaction.id,
        title: isSpend ? "Shop Purchase" : "C-Coin Top Up",
        ...(isSpend ? { itemName } : {}),
        description: "",
        createdAt: playFabTransaction.timestamp || playFabTransaction.date || "",
        amount: Math.abs(playFabTransaction.amount),
        isSpend,
        currency: playFabTransaction.currency === "cCoins" ? "C-Coins" : "B-Coins",
        status: "Recorded",
        payMongo: false,
        ...(isSpend ? { paymentMethod: "C-Coins" } : {}),
        reference: playFabTransaction.id,
      };
    });
    const topUpHistory: ShopHistoryRecord[] = payMongoOrders.map((order) => {
      return {
        id: order.id,
        title: "C-Coin Top Up",
        description: "",
        createdAt: order.paidAt || order.createdAt,
        amount: order.amountInCentavos / 100,
        currency: "PHP",
        status: order.status === "fulfilled" ? "Completed" : order.status === "failed" ? "Failed" : "Pending",
        payMongo: true,
        reference: order.id,
        paymentMethod: "PayMongo",
        coinsReceived: order.coins,
        email: order.email,
        checkoutSessionId: order.checkoutSessionId,
        eventId: order.eventId,
        payMongoStatus: order.status === "fulfilled" ? "Completed" : order.status === "failed" ? "Failed" : "Pending",
      };
    });
    return [...topUpHistory, ...walletHistory].sort((left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
}
