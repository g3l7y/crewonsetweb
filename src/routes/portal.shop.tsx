import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/shop")({
  head: () => ({
    meta: [
      { title: "Studio Shop — Crew On Set!" },
      { name: "description", content: "Spend C-Coins on cosmetic crew items." },
      { property: "og:title", content: "Studio Shop — Crew On Set!" },
      { property: "og:description", content: "Spend C-Coins on cosmetic crew items." },
    ],
  }),
  component: ShopPage,
});

import { useEffect, useMemo, useState } from "react";
import { Check, Coins, Package, ReceiptText, Search, ShoppingBag, ShoppingCart, Trash2, X } from "lucide-react";
import CheckoutPage from "@/components/portal/checkout";
import { useSearchParams } from "@/components/next-compat/navigation";
import { CosmeticArt } from "@/components/portal/cosmetic-art";
import { PayMongoTopUpReceipt } from "@/components/transactions/paymongo-top-up-receipt";
import {
  cosmeticCatalog,
  coinPackages,
  ownedItemsStore,
  cartStore,
  setCheckoutPayload,
  type CosmeticCategory,
  type CosmeticItem,
} from "@/lib/demo/portal-shop";
import { topUpsStore } from "@/lib/admin-demo-data";
import {
  walletStore,
  formatCoins,
  notificationsStore,
  transactionsStore,
  uid,
} from "@/lib/demo/store";
import { isMockMode } from "@/lib/playfab/config";
import {
  useCatalog,
  usePlayerInventory,
  usePlayerWallet,
  usePlayerProfile,
  useSession,
  useNotifications,
  usePurchaseItem,
  useTransactions,
} from "@/lib/playfab/hooks";
import type { Transaction } from "@/lib/playfab/types";

type Category = "All" | CosmeticCategory;
type ViewMode = "shop" | "owned" | "transactions";
type PayMongoOrder = {
  id: string;
  checkoutSessionId?: string;
  packageId: string;
  coins: number;
  amountInCentavos: number;
  status: "pending" | "active" | "processing" | "fulfilled" | "failed";
  createdAt: string;
  paidAt?: string;
  paymentMethod?: string;
  email?: string;
  eventId?: string;
  updatedAt?: string;
};
type ShopHistoryRecord = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  amount: number;
  isSpend?: boolean;
  currency: string;
  status: string;
  payMongo: boolean;
  reference?: string;
  paymentMethod?: string;
  coinsReceived?: number;
  email?: string;
  checkoutSessionId?: string;
  eventId?: string;
  payMongoStatus?: "Completed" | "Pending" | "Failed";
};
const categories: Category[] = ["All", "Face", "Hair", "Tops", "Bottoms", "Shoe Wear", "Accessories"];
const bundledFaceItems = cosmeticCatalog.filter((item) => item.category === "Face");

const rarityStyles: Record<string, string> = {
  Common: "cos-rarity-common",
  Rare: "cos-rarity-rare",
  Epic: "cos-rarity-epic",
  Legendary: "cos-rarity-legendary",
};

type ConfirmTarget = { mode: "cart" } | { mode: "single"; itemId: string };

function cleanPaymentReturnUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("payment");
  url.searchParams.delete("reference");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

function formatHistoryDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

function formatHistoryAmount(amount: number, currency: string) {
  if (currency === "PHP") {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
  }
  return `${amount.toLocaleString("en-PH")} ${currency}`;
}

function ShopPage() {
  const mockMode = isMockMode();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const requestedView: ViewMode = viewParam === "owned" || viewParam === "transactions" ? viewParam : "shop";
  const [view, setView] = useState<ViewMode>(requestedView);
  const categoryParam = searchParams.get("category");

  useEffect(() => {
    setView(requestedView);
  }, [requestedView]);
  const requestedCategory = categories.find((category) => category.toLowerCase() === categoryParam?.toLowerCase()) ?? "All";
  const [activeCategory, setActiveCategory] = useState<Category>(requestedCategory);

  useEffect(() => {
    if (requestedView === "owned" && requestedCategory !== "All") setActiveCategory(requestedCategory);
  }, [requestedCategory, requestedView]);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<CosmeticItem | null>(null);
  const [shopError, setShopError] = useState("");
  const [purchaseBusy, setPurchaseBusy] = useState(false);

  const catalogQuery = useCatalog();
  const walletQuery = usePlayerWallet();
  const profileQuery = usePlayerProfile();
  const sessionQuery = useSession();
  const refreshPlayerWallet = walletQuery.refetch;
  const mockPlayerId =
    profileQuery.data?.playFabId || sessionQuery.data?.playFabId || "MOCK-PLAYER-001";
  const mockPlayerName = profileQuery.data?.username || sessionQuery.data?.username || "CAMERA_PRO";
  const inventoryQuery = usePlayerInventory();
  const purchaseItem = usePurchaseItem();
  const realNotificationsQuery = useNotifications();
  const refreshPlayerNotifications = realNotificationsQuery.refetch;
  const playerTransactionsQuery = useTransactions();

  const [demoOwnedIds, setDemoOwnedIds] = ownedItemsStore.useStore();
  const [cart, setCart] = cartStore.useStore();
  const [demoWallet, setDemoWallet] = walletStore.useStore();
  const [notifications, setNotifications] = notificationsStore.useStore();
  const [transactions, setTransactions] = transactionsStore.useStore();
  const [payMongoOrders, setPayMongoOrders] = useState<PayMongoOrder[]>([]);
  const [payMongoOrdersLoading, setPayMongoOrdersLoading] = useState(false);
  const [payMongoOrdersError, setPayMongoOrdersError] = useState("");
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<ShopHistoryRecord | null>(null);
  const paymentResult = searchParams.get("payment");
  const paymentReference = searchParams.get("reference");
  const [paymentNotice, setPaymentNotice] = useState<{
    status: "success" | "failure" | "pending";
    coins: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (view !== "transactions") return;
    let cancelled = false;
    setPayMongoOrdersLoading(true);
    setPayMongoOrdersError("");
    void fetch("/api/paymongo/orders", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as {
          data?: PayMongoOrder[];
          error?: string;
        };
        if (!response.ok) throw new Error(result.error || "Transaction history could not be loaded.");
        if (!cancelled) setPayMongoOrders(Array.isArray(result.data) ? result.data : []);
      })
      .catch((error) => {
        if (!cancelled) setPayMongoOrdersError(error instanceof Error ? error.message : "Transaction history could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setPayMongoOrdersLoading(false);
      });
    return () => { cancelled = true; };
  }, [paymentReference, view]);

  const historyRecords = useMemo<ShopHistoryRecord[]>(() => {
    const walletHistory: ShopHistoryRecord[] = (mockMode ? transactions : playerTransactionsQuery.data ?? []).map((transaction) => {
      if ("kind" in transaction) {
        const amount = transaction.amount;
        const seededPayMongoTopUp = mockMode && transaction.id === "tx-seed-2";
        const coinsReceived = seededPayMongoTopUp ? 7500 : Math.abs(amount);
        const paymentAmountPhp = transaction.paymentAmountPhp ?? (seededPayMongoTopUp ? 499 : undefined);
        return {
          id: transaction.id,
          title: transaction.kind === "topup" ? "C-Coin Top Up" : transaction.kind === "purchase" ? "Shop Purchase" : transaction.label,
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
      return {
        id: playFabTransaction.id,
        title: isSpend ? "Shop Purchase" : "C-Coin Top Up",
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
  }, [mockMode, payMongoOrders, playerTransactionsQuery.data, transactions]);

  const catalog = useMemo(() => {
    if (mockMode) return cosmeticCatalog;
    const liveItems = (catalogQuery.data ?? [])
      .map((remote) => {
        const category = remote.category as CosmeticCategory;
        if (!categories.slice(1).includes(category)) return null;
        const name = remote.displayName ?? "";
        const description = remote.description ?? "";
        const assetKey = remote.customData?.assetKey ?? "";
        const imageUrl = remote.customData?.imageUrl ?? "";
        const bundledAsset = cosmeticCatalog.find(
          (candidate) => candidate.id === remote.itemId || candidate.assetKey === assetKey,
        );
        const rarityValue = String(remote.rarity ?? "").toLowerCase();
        const rarity =
          rarityValue === "rare"
            ? "Rare"
            : rarityValue === "epic"
              ? "Epic"
              : rarityValue === "legendary"
                ? "Legendary"
                : "Common";
        return {
          id: remote.itemId,
          name,
          category,
          price: remote.price ?? 0,
          rarity,
          description,
          assetKey,
          imageUrl,
          imagePath: bundledAsset?.imagePath,
          placeholder: !name && !description && !assetKey && !imageUrl,
        } satisfies CosmeticItem;
      })
      .filter((item): item is CosmeticItem => item !== null);
    return [
      ...liveItems,
      ...bundledFaceItems.filter((item) => !liveItems.some((liveItem) => liveItem.id === item.id)),
    ];
  }, [catalogQuery.data, mockMode]);

  const bundledFaceIds = bundledFaceItems.map((item) => item.id);
  const ownedIds = mockMode
    ? [...new Set([...demoOwnedIds, ...bundledFaceIds])]
    : [...new Set([...(inventoryQuery.data ?? []).map((item) => item.itemId), ...bundledFaceIds])];
  const balance = mockMode ? (demoWallet[0] ?? 0) : (walletQuery.data?.cCoins ?? 0);
  const loading =
    !mockMode && (catalogQuery.isLoading || walletQuery.isLoading || inventoryQuery.isLoading);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return catalog.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      return matchesCategory && item.name.toLowerCase().includes(normalizedSearch);
    }).sort((left, right) => categories.indexOf(left.category) - categories.indexOf(right.category));
  }, [activeCategory, catalog, search]);

  const ownedCatalogItems = useMemo(
    () => catalog.filter((item) => ownedIds.includes(item.id))
      .sort((left, right) => categories.indexOf(left.category) - categories.indexOf(right.category)),
    [catalog, ownedIds],
  );
  const filteredOwnedItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return ownedCatalogItems.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, ownedCatalogItems, search]);

  const cartLines = useMemo(
    () =>
      cart
        .map((line) => ({ line, item: catalog.find((item) => item.id === line.itemId) }))
        .filter(
          (entry): entry is { line: (typeof cart)[number]; item: CosmeticItem } => !!entry.item,
        ),
    [cart, catalog],
  );

  const cartCount = cart.length;
  const cartTotal = cartLines.reduce((sum, { item }) => sum + item.price, 0);

  function addToCart(itemId: string) {
    setShopError("");
    if (ownedIds.includes(itemId)) return;
    if (cart.some((line) => line.itemId === itemId)) {
      setShopError("That cosmetic is already in your cart. Each cosmetic can be purchased once.");
      return;
    }
    setCart([...cart, { itemId, qty: 1 }]);
  }

  function removeFromCart(itemId: string) {
    setCart(cart.filter((line) => line.itemId !== itemId));
  }

  function startPackageCheckout(packageId: string) {
    setShopError("");
    setCheckoutPayload({ kind: "coins", packageId });
    setCheckoutOpen(true);
  }

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{
    names: string[];
    spent: number;
    remaining: number;
  } | null>(null);
  const [clearCartOpen, setClearCartOpen] = useState(false);

  useEffect(() => {
    const resultKind = paymentResult;
    if (!resultKind || !paymentReference) return;
    const reference = paymentReference;
    let cancelled = false;
    setCheckoutOpen(false);
    setPaymentNotice(null);

    async function reconcileReturn() {
      const maxAttempts = resultKind === "cancelled" ? 1 : 20;
      let lastResult: {
        status?: string;
        coins?: number;
        amountInCentavos?: number;
        timestamp?: string;
      } | null = null;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const response = await fetch(
          "/api/paymongo/status?orderId=" + encodeURIComponent(reference),
          { credentials: "include", cache: "no-store" },
        );
        const result = (await response.json().catch(() => ({}))) as {
          status?: string;
          coins?: number;
          amountInCentavos?: number;
          timestamp?: string;
          paymentMethod?: string;
          packageId?: string;
          checkoutSessionId?: string;
          email?: string;
          eventId?: string;
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error || "Payment confirmation is temporarily unavailable.");
        lastResult = result;
        if (result.status === "fulfilled") break;
        if (result.status === "failed") break;
        if (resultKind === "cancelled" || attempt === maxAttempts - 1) break;
        await new Promise((resolve) => window.setTimeout(resolve, 1_000));
      }
      if (cancelled) return;

      const confirmedCoins = Number(lastResult?.coins) || 0;
      if (lastResult?.status === "fulfilled" && confirmedCoins > 0) {
        if (mockMode) {
          const alreadyCredited =
            window.localStorage.getItem("cos.paymongo.demo.credited." + reference) === "1" ||
            window.localStorage.getItem("cos.paymongo.fulfilled." + reference) === "1";
          if (!alreadyCredited) {
            const completedAt = lastResult.timestamp || new Date().toISOString();
            const completedDate = new Date(completedAt);
            const playerId = mockPlayerId;
            const playerName = mockPlayerName;
            const transactionId = reference;
            const paymentAmount = (Number(lastResult.amountInCentavos) || 0) / 100;
            walletStore.set((current) => [(current[0] ?? 0) + confirmedCoins]);
            topUpsStore.set((current) =>
              current.some((item) => item.id === transactionId)
                ? current
                : [
                    {
                      id: transactionId,
                      playerName,
                      playerId,
                      date: Number.isNaN(completedDate.getTime())
                        ? completedAt.slice(0, 10)
                        : completedDate.toISOString().slice(0, 10),
                      time: Number.isNaN(completedDate.getTime())
                        ? "--:--"
                        : completedDate.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                            timeZone: "UTC",
                          }),
                      timestamp: completedAt,
                      bank: "Demo Checkout",
                      amount: paymentAmount,
                      coins: confirmedCoins,
                      packageId: lastResult.packageId,
                      paymentMethod: lastResult.paymentMethod,
                      email: lastResult.email,
                      checkoutSessionId: lastResult.checkoutSessionId,
                      eventId: lastResult.eventId,
                      status: "Completed",
                    },
                    ...current,
                  ],
            );
            notificationsStore.set((current) => [
              {
                id: "topup-" + transactionId,
                title: "C-Coin top-up confirmed",
                body:
                  confirmedCoins.toLocaleString("en-PH") +
                  " C-Coins have been added to your wallet.",
                createdAt: completedAt,
                kind: "transaction",
                channel: "notification",
                read: false,
                href: "/portal/shop?view=transactions",
                recipientUsername: playerName,
                target: { kind: "players", playerIds: [playerId] },
              },
              ...current,
            ]);
            window.localStorage.setItem("cos.paymongo.demo.credited." + reference, "1");
            window.localStorage.setItem("cos.paymongo.fulfilled." + reference, "1");
          }
        } else {
          await Promise.all([refreshPlayerWallet(), refreshPlayerNotifications()]);
        }
        setCheckoutPayload(null);
        setPaymentNotice({
          status: "success",
          coins: confirmedCoins,
          message:
            "Payment received. " +
            confirmedCoins.toLocaleString("en-PH") +
            " C-Coins have been delivered to your wallet.",
        });
        cleanPaymentReturnUrl();
      } else if (lastResult?.status === "failed" || resultKind === "cancelled") {
        setCheckoutPayload(null);
        setPaymentNotice({
          status: "failure",
          coins: 0,
          message:
            "The payment was not completed, so no C-Coins were added. If your bank or payment account shows a charge, please contact support.",
        });
        cleanPaymentReturnUrl();
      } else {
        setPaymentNotice({
          status: "pending",
          coins: 0,
          message:
            "We are still confirming your payment. C-Coins have not been delivered yet; please check back shortly.",
        });
      }
    }

    void reconcileReturn().catch((error) => {
      if (cancelled) return;
      setPaymentNotice({
        status: "pending",
        coins: 0,
        message:
          error instanceof Error
            ? error.message + " C-Coins have not been marked as delivered."
            : "We could not confirm the payment yet. C-Coins have not been marked as delivered.",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    mockMode,
    mockPlayerId,
    mockPlayerName,
    paymentReference,
    paymentResult,
    refreshPlayerWallet,
    refreshPlayerNotifications,
  ]);

  const confirmLines = useMemo(() => {
    if (!confirmTarget) return [];
    if (confirmTarget.mode === "cart") return cartLines;
    const item = catalog.find((candidate) => candidate.id === confirmTarget.itemId);
    return item ? [{ line: { itemId: item.id, qty: 1 }, item }] : [];
  }, [catalog, cartLines, confirmTarget]);

  const confirmTotal = confirmLines.reduce((sum, { item }) => sum + item.price, 0);
  const canAffordConfirm = balance >= confirmTotal;

  async function confirmPurchase() {
    if (!confirmTarget || confirmLines.length === 0 || !canAffordConfirm || purchaseBusy) return;

    const purchasedIds = confirmLines.map(({ item }) => item.id);
    const names = confirmLines.map(({ item }) => item.name);
    setShopError("");
    setPurchaseBusy(true);

    if (!mockMode) {
      try {
        for (const { item } of confirmLines) {
          const result = await purchaseItem.mutateAsync({
            itemId: item.id,
            price: item.price,
            currency: "cCoins",
          });
          if (typeof result === "boolean" ? !result : !result.success) {
            throw new Error(
              typeof result === "boolean"
                ? "We couldn't complete the purchase. Please try again."
                : "We couldn't complete the purchase. Please try again.",
            );
          }
        }
        const refreshedWallet = await walletQuery.refetch();
        await inventoryQuery.refetch();
        const remaining = refreshedWallet.data?.cCoins ?? Math.max(balance - confirmTotal, 0);
        await Promise.all(confirmLines.map(({ item }) => fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            kind: "shop",
            title: "Shop Purchase",
            body: `${item.name} was added to your collection.`,
            href: "/portal/shop?view=owned&category=" + encodeURIComponent(item.category),
          }),
        })));
        await realNotificationsQuery.refetch();
        setCart(cart.filter((line) => !purchasedIds.includes(line.itemId)));
        setConfirmTarget(null);
        setPurchaseSuccess({ names, spent: confirmTotal, remaining });
      } catch (error) {
        await walletQuery.refetch();
        await inventoryQuery.refetch();
        setShopError(error instanceof Error ? error.message : "The purchase was not completed.");
      } finally {
        setPurchaseBusy(false);
      }
      return;
    }

    const remaining = Math.max(0, balance - confirmTotal);
    setDemoWallet([remaining]);
    setDemoOwnedIds([...new Set([...demoOwnedIds, ...purchasedIds])]);
    setCart(cart.filter((line) => !purchasedIds.includes(line.itemId)));
    setNotifications([
      ...confirmLines.map(({ item }) => ({
        id: uid("ntf"),
        title: "Shop Purchase",
        body: `${item.name} was added to your collection.`,
        createdAt: new Date().toISOString(),
        kind: "shop",
        read: false,
        href: "/portal/shop?view=owned&category=" + encodeURIComponent(item.category),
        recipientUsername: mockPlayerName,
        target: { kind: "players", playerIds: [mockPlayerId] },
      })),
      ...notifications,
    ]);
    setTransactions([
      ...confirmLines.map(({ item }) => ({
        id: uid("tx"),
        label: item.name,
        detail: `Shop purchase — ${item.category}`,
        amount: -item.price,
        kind: "purchase" as const,
        createdAt: new Date().toISOString(),
      })),
      ...transactions,
    ]);
    setConfirmTarget(null);
    setPurchaseSuccess({ names, spent: confirmTotal, remaining });
    setPurchaseBusy(false);
  }

  if (checkoutOpen) {
    return (
      <CheckoutPage
        onBack={() => {
          setCheckoutPayload(null);
          setCheckoutOpen(false);
        }}
      />
    );
  }

  return (
    <div className="portal-shop-page portal-title-page">
      <div className="portal-shop-inner portal-title-container">
        <header className="shop-heading portal-title-header">
          <div>
            <h1 className="portal-title-heading">Studio Shop</h1>
            <p className="shop-subtitle">
              Style the crew. Keep the stats honest. Every item here is cosmetic-only.
            </p>
          </div>
          <div className="shop-toolbar">
            <div className="coin-balance">
              <Coins aria-hidden="true" />
              <span>
                <small>C-COIN BALANCE</small>
                <strong>{loading ? "—" : formatCoins(balance)}</strong>
              </span>
            </div>
            <button
              type="button"
              className="shop-cart-button"
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart, ${cartCount} items`}
            >
              <ShoppingCart aria-hidden="true" /> Cart
              {cartCount > 0 && <b>{cartCount}</b>}
            </button>
          </div>
        </header>

        {shopError && (
          <div className="shop-alert" role="alert">
            {shopError}
            <button type="button" onClick={() => setShopError("")} aria-label="Dismiss message">
              <X />
            </button>
          </div>
        )}

        <div className="shop-tabs" role="tablist" aria-label="Shop views">
          <button
            type="button"
            role="tab"
            aria-selected={view === "shop"}
            onClick={() => setView("shop")}
            className={view === "shop" ? "active" : ""}
          >
            <ShoppingBag /> Shop
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "owned"}
            onClick={() => setView("owned")}
            className={view === "owned" ? "active" : ""}
          >
            <Package /> Owned items
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "transactions"}
            onClick={() => setView("transactions")}
            className={view === "transactions" ? "active" : ""}
          >
            <ReceiptText /> Transactions
          </button>
        </div>

        {view === "shop" ? (
          <>
            <div className="shop-filters">
              <div className="shop-category-list" role="list">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={activeCategory === category ? "active" : ""}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <label className="shop-search">
                <Search aria-hidden="true" />
                <span className="sr-only">Search cosmetics</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search cosmetics"
                />
              </label>
            </div>

            {loading ? (
              <div className="shop-empty">Loading shop items…</div>
            ) : (
              <section className="shop-grid" aria-label="Cosmetics catalog">
                {filteredItems.map((item) => {
                  const owned = ownedIds.includes(item.id);
                  const inCart = cart.some((line) => line.itemId === item.id);
                  const hasArtwork = mockMode || Boolean(item.assetKey || item.imageUrl || item.imagePath);
                  const hasDetails = mockMode || !item.placeholder;
                  return (
                    <article
                      key={item.id}
                      className={`shop-card${item.placeholder ? " real-placeholder-card" : ""}`}
                    >
                      {hasDetails && hasArtwork ? (
                        <button
                          type="button"
                          className="shop-art-button"
                          onClick={() => setSelectedItem(item)}
                          aria-label={`View ${item.name || item.category} details`}
                        >
                          {item.imageUrl ? (
                            <img className="shop-live-image" src={item.imageUrl} alt="" />
                          ) : (
                            <CosmeticArt item={item} />
                          )}
                          <span className={`cos-rarity ${rarityStyles[item.rarity]}`}>
                            {item.rarity}
                          </span>
                          {owned && (
                            <span className="owned-mark">
                              <Check />
                            </span>
                          )}
                        </button>
                      ) : (
                        <div className="shop-art-button shop-art-placeholder" aria-hidden="true" />
                      )}
                      <div className="shop-card-copy">
                        <p className="shop-category">{item.category}</p>
                        {hasDetails && (
                          <>
                            {item.name && <h2>{item.name}</h2>}
                            {item.description && (
                              <p className="shop-description">{item.description}</p>
                            )}
                            <div className="shop-card-bottom">
                              <span className="shop-price">
                                <Coins /> {formatCoins(item.price)}
                              </span>
                              <span className="shop-status">
                                {owned ? "Owned" : inCart ? "In cart" : "Available"}
                              </span>
                            </div>
                            {!owned && (
                              <div className="shop-card-actions">
                                <button
                                  type="button"
                                  className="shop-secondary-button"
                                  onClick={() => addToCart(item.id)}
                                >
                                  {inCart ? "In cart" : "Add to cart"}
                                </button>
                                <button
                                  type="button"
                                  className="shop-primary-button"
                                  onClick={() =>
                                    setConfirmTarget({ mode: "single", itemId: item.id })
                                  }
                                >
                                  Buy now
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </section>
            )}

            {!loading && filteredItems.length === 0 && (
              <div className="shop-empty">No cosmetics match your search.</div>
            )}

            <section className="coin-pack-section" aria-labelledby="coin-pack-title">
              <div>
                <p className="portal-kicker">
                  {mockMode ? "C-COIN DEMO TOP-UP" : "C-COIN WALLET TOP-UP"}
                </p>
                <h2 id="coin-pack-title">More C-Coins, when the set needs them.</h2>
                <p>
                  {mockMode
                    ? "Add C-Coins in this demo. No real payment will be taken."
                    : "Securely add C-Coins to your wallet at checkout. Available payment methods will appear on the next screen."}
                </p>
              </div>
              <div className="coin-pack-grid">
                {coinPackages.map((pack) => (
                  <article key={pack.id} className="coin-pack-card">
                    <Coins />
                    <strong>
                      {formatCoins(pack.coins)} <small>C-COINS</small>
                    </strong>
                    <p>{pack.priceLabel}</p>
                    <button type="button" onClick={() => startPackageCheckout(pack.id)}>
                      {mockMode ? "Add demo C-Coins" : "Add C-Coins"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : view === "owned" ? (
          <>
            <div className="shop-filters">
              <div className="shop-category-list" role="list" aria-label="Filter owned cosmetics by category">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={activeCategory === category ? "active" : ""}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <label className="shop-search">
                <Search aria-hidden="true" />
                <span className="sr-only">Search owned cosmetics</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search owned items"
                />
              </label>
            </div>
            <section className="shop-grid" aria-label="Owned cosmetics">
              {filteredOwnedItems.map((item) => (
              <article key={item.id} className="shop-card owned-card">
                <button
                  type="button"
                  className="shop-art-button"
                  onClick={() => setSelectedItem(item)}
                  aria-label={`View ${item.name} details`}
                >
                  {item.imageUrl ? (
                    <img className="shop-live-image" src={item.imageUrl} alt={`${item.name} cosmetic`} />
                  ) : (
                    <CosmeticArt item={item} />
                  )}
                  <span className="owned-mark">
                    <Check />
                  </span>
                </button>
                <div className="shop-card-copy">
                  <p className="shop-category">{item.category}</p>
                  <h2>{item.name}</h2>
                <span className="shop-status">
                  Owned
                </span>
                </div>
              </article>
              ))}
              {filteredOwnedItems.length === 0 && (
                <div className="shop-empty">
                  {ownedCatalogItems.length === 0
                    ? "You haven't collected any cosmetics yet. Browse the shop to find your next look."
                    : "No owned cosmetics match your filters."}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="mt-6 rounded-2xl border border-navy/10 bg-white/70 p-4 shadow-sm sm:p-6" aria-labelledby="shop-transactions-title">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="portal-kicker">YOUR PURCHASE HISTORY</p>
                <h2 id="shop-transactions-title" className="text-2xl font-black uppercase text-navy">Transactions</h2>
                <p className="mt-1 text-sm text-navy/60">Review C-Coin purchases, top-ups, and payment details.</p>
              </div>
              <button
                type="button"
                className="shop-secondary-button"
                onClick={() => {
                  setPayMongoOrdersLoading(true);
                  void fetch("/api/paymongo/orders", { credentials: "include", cache: "no-store" })
                    .then(async (response) => {
                      const result = (await response.json().catch(() => ({}))) as { data?: PayMongoOrder[]; error?: string };
                      if (!response.ok) throw new Error(result.error || "Transaction history could not be loaded.");
                      setPayMongoOrders(Array.isArray(result.data) ? result.data : []);
                      setPayMongoOrdersError("");
                    })
                    .catch((error) => setPayMongoOrdersError(error instanceof Error ? error.message : "Transaction history could not be loaded."))
                    .finally(() => setPayMongoOrdersLoading(false));
                }}
                disabled={payMongoOrdersLoading}
              >
                {payMongoOrdersLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            {payMongoOrdersError && <p className="mb-4 rounded-lg border border-coral/30 bg-coral/10 p-3 text-sm font-bold text-coral" role="alert">{payMongoOrdersError}</p>}
            {payMongoOrdersLoading && historyRecords.length === 0 ? (
              <div className="shop-empty">Loading your transactions…</div>
            ) : historyRecords.length === 0 ? (
              <div className="shop-empty">Your purchases and receipts will appear here.</div>
            ) : (
              <div className="space-y-3">
                {historyRecords.map((record) => (
                  <article key={record.id} className="flex flex-col gap-4 rounded-xl border border-navy/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate font-black text-navy">{record.title}</h3>
                      {record.description && <p className="mt-1 text-sm text-navy/60">{record.description}</p>}
                      <p className="mt-1 text-xs text-navy/50">{formatHistoryDate(record.createdAt)} · {record.status}</p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right">
                        <strong className="block text-navy">{record.isSpend ? "−" : ""}{formatHistoryAmount(record.amount, record.currency)}</strong>
                        {record.coinsReceived !== undefined && <span className="mt-1 block text-xs font-bold text-emerald-700">+{record.coinsReceived.toLocaleString("en-PH")} C-Coins</span>}
                      </div>
                      <button type="button" className="shop-secondary-button" onClick={() => setSelectedHistoryRecord(record)}>
                        View receipt
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {selectedHistoryRecord && (
        <div className="shop-modal-backdrop" role="presentation" onMouseDown={() => setSelectedHistoryRecord(null)}>
          <section
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-navy/15 bg-[#fffdf7] text-navy shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-receipt-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 rounded-t-2xl bg-[#123c36] px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <ReceiptText aria-hidden="true" className="size-6 text-[#65d2b1]" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-white/65">Crew On Set</p>
              <p className="font-black">TRANSACTION DETAILS</p>
                </div>
              </div>
              <button type="button" className="rounded-full p-2 text-white/75 transition hover:bg-white/10 hover:text-white" onClick={() => setSelectedHistoryRecord(null)} aria-label="Close transaction details">
                <X className="size-5" />
              </button>
            </div>
            {selectedHistoryRecord.payMongo ? (
              <div className="p-5 sm:p-7">
                <PayMongoTopUpReceipt
                  reference={selectedHistoryRecord.reference || selectedHistoryRecord.id}
                  playerName={profileQuery.data?.displayName || profileQuery.data?.username || sessionQuery.data?.displayName || sessionQuery.data?.username || "Player"}
                  email={selectedHistoryRecord.email || sessionQuery.data?.email}
                  dateTime={selectedHistoryRecord.createdAt}
                  paymentMethod={selectedHistoryRecord.paymentMethod}
                  amountPhp={selectedHistoryRecord.amount}
                  coins={selectedHistoryRecord.coinsReceived || 0}
                  status={selectedHistoryRecord.payMongoStatus || "Completed"}
                  checkoutSessionId={selectedHistoryRecord.checkoutSessionId}
                  eventId={selectedHistoryRecord.eventId}
                />
              </div>
            ) : <div className="p-6 sm:p-8">
              <p className="text-sm text-navy/65">Your receipt from</p>
              <h2 id="transaction-receipt-title" className="mt-1 text-2xl font-black uppercase">Crew On Set</h2>
              <p className="mt-3 break-all text-sm text-navy/65">Reference: <span className="font-semibold text-navy">#{selectedHistoryRecord.reference || selectedHistoryRecord.id}</span></p>
              <p className="mt-7 text-sm">Hi {profileQuery.data?.displayName || profileQuery.data?.username || sessionQuery.data?.displayName || sessionQuery.data?.username || "Player"},</p>
              <p className="mt-2 text-sm leading-relaxed text-navy/70">
                {selectedHistoryRecord.payMongo
                  ? "Thanks for your payment. Here is a copy of your Crew On Set transaction details. PayMongo may also send its own receipt to your billing email."
                  : "Here is a copy of your Crew On Set account transaction details."}
              </p>

              <div className="mt-7 border-y border-navy/10 py-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-navy/45">Order details</p>
                <div className="flex items-start justify-between gap-4 text-sm">
                  <span>{selectedHistoryRecord.title} × 1</span>
                  <strong className="shrink-0">{formatHistoryAmount(selectedHistoryRecord.amount, selectedHistoryRecord.currency)}</strong>
                </div>
              </div>
              <div className="border-b border-navy/10 py-5">
                <p className="text-xs text-navy/45">{selectedHistoryRecord.payMongo ? "Amount paid" : selectedHistoryRecord.isSpend && selectedHistoryRecord.currency === "C-Coins" ? "C-Coins paid" : "Amount recorded"}</p>
                <p className="mt-1 text-2xl font-black">{formatHistoryAmount(selectedHistoryRecord.amount, selectedHistoryRecord.currency)}</p>
              </div>
              <div className="space-y-3 border-b border-navy/10 py-5 text-sm">
                <p><span className="text-navy/45">Transaction</span><br /><strong>{selectedHistoryRecord.description}</strong></p>
                <p><span className="text-navy/45">Payment method</span><br /><strong>{selectedHistoryRecord.paymentMethod || (selectedHistoryRecord.payMongo ? "PayMongo" : "C-Coins")}</strong></p>
                <p><span className="text-navy/45">Date</span><br /><strong>{formatHistoryDate(selectedHistoryRecord.createdAt)}</strong></p>
                <p><span className="text-navy/45">Status</span><br /><strong className={selectedHistoryRecord.status === "Completed" || selectedHistoryRecord.status === "Recorded" ? "text-emerald-700" : selectedHistoryRecord.status === "Failed" ? "text-coral" : "text-amber-700"}>{selectedHistoryRecord.status}</strong></p>
              </div>
              <p className="mt-4 text-center text-xs leading-relaxed text-navy/50">
                This is a Crew On Set transaction record. For a PayMongo payment, check your email for the provider’s receipt as well.
              </p>
            </div>}
          </section>
        </div>
      )}

      {selectedItem && (
        <div
          className="shop-modal-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedItem(null)}
        >
          <section
            className="shop-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cosmetic-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setSelectedItem(null)}
              aria-label="Close product details"
            >
              <X />
            </button>
            <div className="modal-art">
              {selectedItem.imageUrl ? (
                <img className="shop-live-image" src={selectedItem.imageUrl} alt="" />
              ) : selectedItem.assetKey ? (
                <CosmeticArt item={selectedItem} />
              ) : (
                <div className="shop-art-placeholder" aria-hidden="true" />
              )}
            </div>
            <div className="modal-copy">
              <p className="shop-category">{selectedItem.category}</p>
              <h2 id="cosmetic-modal-title">{selectedItem.name}</h2>
              <p>{selectedItem.description}</p>
              <strong className="modal-price">
                <Coins /> {formatCoins(selectedItem.price)} C-Coins
              </strong>
              <div className="modal-meta">
                <span>{ownedIds.includes(selectedItem.id) ? "Owned" : "Not owned"}</span>
                <span>
                  {cart.some((line) => line.itemId === selectedItem.id) ? "In cart" : "Not in cart"}
                </span>
              </div>
              <div className="modal-actions">
                {!ownedIds.includes(selectedItem.id) && (
                  <>
                    <button
                      type="button"
                      className="shop-secondary-button"
                      disabled={cart.some((line) => line.itemId === selectedItem.id)}
                      onClick={() => addToCart(selectedItem.id)}
                    >
                      {cart.some((line) => line.itemId === selectedItem.id) ? "In cart" : "Add to cart"}
                    </button>
                    <button
                      type="button"
                      className="shop-primary-button"
                      onClick={() => {
                        setSelectedItem(null);
                        setConfirmTarget({ mode: "single", itemId: selectedItem.id });
                      }}
                    >
                      Buy now
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {cartOpen && (
        <div
          className="shop-modal-backdrop"
          role="presentation"
          onMouseDown={() => setCartOpen(false)}
        >
          <aside
            className="shop-cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="portal-kicker">YOUR CURRENT PICKS</p>
                <h2 id="cart-title">
                  Cart <span>({cartCount})</span>
                </h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
              >
                <X />
              </button>
            </header>
            <div className="cart-lines">
              {cartLines.length === 0 ? (
                <p className="shop-empty">Your cart is empty.</p>
              ) : (
                cartLines.map(({ item }) => (
                  <div className="cart-line" key={item.id}>
                    <CosmeticArt item={item} className="cart-art" />
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.category}</span>
                      <b>
                        <Coins /> {formatCoins(item.price)}
                      </b>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))
              )}
            </div>
            {cartLines.length > 0 && (
              <footer>
                <div>
                  <span>Total</span>
                  <strong>
                    <Coins /> {formatCoins(cartTotal)}
                  </strong>
                </div>
                <button
                  type="button"
                  className="shop-primary-button"
                  onClick={() => {
                    setCartOpen(false);
                    setConfirmTarget({ mode: "cart" });
                  }}
                >
                  Buy cart
                </button>
                <button
                  type="button"
                  className="shop-secondary-button"
                  onClick={() => setClearCartOpen(true)}
                >
                  Clear cart
                </button>
              </footer>
            )}
          </aside>
        </div>
      )}

      {confirmTarget && confirmLines.length > 0 && (
        <div className="shop-modal-backdrop">
          <section
            className="purchase-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-title"
          >
            <p className="portal-kicker">C-COIN CHECK</p>
            <h2 id="purchase-title">Confirm purchase</h2>
            <div className="confirm-list">
              {confirmLines.map(({ item }) => (
                <div key={item.id}>
                  <CosmeticArt item={item} className="confirm-art" />
                  <span>{item.name}</span>
                  <b>
                    <Coins /> {formatCoins(item.price)}
                  </b>
                </div>
              ))}
            </div>
            <div className="purchase-summary">
              <span>Total cost</span>
              <strong>{formatCoins(confirmTotal)} C-Coins</strong>
              <span>Current balance</span>
              <strong>{formatCoins(balance)} C-Coins</strong>
              <span>Remaining balance</span>
              <strong className={canAffordConfirm ? "is-good" : "is-bad"}>
                {formatCoins(Math.max(0, balance - confirmTotal))} C-Coins
              </strong>
            </div>
            {!canAffordConfirm && (
              <p className="shop-alert compact" role="alert">
                Insufficient C-Coins. No charge will be made.
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="shop-secondary-button"
                onClick={() => setConfirmTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="shop-primary-button"
                disabled={!canAffordConfirm || purchaseBusy}
                onClick={() => void confirmPurchase()}
              >
                {purchaseBusy ? "Processing…" : "Confirm purchase"}
              </button>
            </div>
          </section>
        </div>
      )}

      {purchaseSuccess && (
        <div className="shop-modal-backdrop">
          <section
            className="purchase-modal success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-title"
          >
            <div className="success-icon">
              <Check />
            </div>
            <p className="portal-kicker">PURCHASE COMPLETE</p>
            <h2 id="success-title">
              {purchaseSuccess.names.length > 1
                ? `${purchaseSuccess.names.length} cosmetics added`
                : purchaseSuccess.names[0]}
            </h2>
            <p>
              {formatCoins(purchaseSuccess.spent)} C-Coins spent. Your new balance is{" "}
              <strong>{formatCoins(purchaseSuccess.remaining)} C-Coins</strong>.
            </p>
            <button
              type="button"
              className="shop-primary-button"
              onClick={() => setPurchaseSuccess(null)}
            >
              Done
            </button>
          </section>
        </div>
      )}

      {paymentNotice && (
        <div className="shop-modal-backdrop">
          <section
            className={
              "purchase-modal success-modal" +
              (paymentNotice?.status === "failure" ? " payment-failure" : "")
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-return-title"
            aria-live="polite"
          >
            <div
              className={"success-icon" + (paymentNotice?.status === "failure" ? " warning" : "")}
            >
              {paymentNotice?.status === "failure" ? (
                <X />
              ) : paymentNotice?.status === "success" ? (
                <Check />
              ) : (
                <Coins />
              )}
            </div>
            <p className="portal-kicker">
              {paymentNotice.status === "success"
                ? "PAYMENT RECEIVED"
                : paymentNotice.status === "failure"
                  ? "PAYMENT NOT COMPLETED"
                  : "PAYMENT PENDING"}
            </p>
            <h2 id="payment-return-title">
              {paymentNotice.status === "success"
                ? "C-Coins delivered"
                : paymentNotice.status === "failure"
                  ? "No C-Coins were added"
                  : "Confirmation in progress"}
            </h2>
            <p>{paymentNotice.message}</p>
            {paymentNotice.status === "pending" && paymentReference && (
              <button
                type="button"
                className="shop-secondary-button"
                onClick={() => window.location.reload()}
              >
                Check payment again
              </button>
            )}
            <button
              type="button"
              className="shop-primary-button"
              onClick={() => {
                cleanPaymentReturnUrl();
                setPaymentNotice(null);
              }}
            >
              Return to Shop
            </button>
          </section>
        </div>
      )}

      {clearCartOpen && (
        <div className="shop-modal-backdrop">
          <section
            className="purchase-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-cart-title"
          >
            <div className="success-icon warning">
              <Trash2 />
            </div>
            <p className="portal-kicker">CART MANAGEMENT</p>
            <h2 id="clear-cart-title">Clear cart?</h2>
            <p>
              Remove all {cartCount} cosmetic{cartCount === 1 ? "" : "s"} without spending any
              C-Coins?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="shop-secondary-button"
                onClick={() => setClearCartOpen(false)}
              >
                Keep cart
              </button>
              <button
                type="button"
                className="shop-primary-button"
                onClick={() => {
                  setCart([]);
                  setClearCartOpen(false);
                }}
              >
                Clear cart
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
