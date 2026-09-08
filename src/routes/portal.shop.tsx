import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/shop")({
  head: () => ({
    meta: [
      { title: "Studio Shop — Crew On Set!" },
      { name: "description", content: "Spend C-Coins on hair, outfits, and accessories." },
      { property: "og:title", content: "Studio Shop — Crew On Set!" },
      { property: "og:description", content: "Spend C-Coins on hair, outfits, and accessories." },
    ],
  }),
  component: ShopPage,
});

import { useMemo, useState } from "react";
import {
  Check,
  Coins,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import CheckoutPage from "@/components/portal/checkout";
import {
  cosmeticCatalog,
  coinPackages,
  ownedItemsStore,
  cartStore,
  setCheckoutPayload,
  type CosmeticCategory,
  type CosmeticItem,
} from "@/lib/demo/portal-shop";
import {
  walletStore,
  formatCoins,
  notificationsStore,
  transactionsStore,
  uid,
} from "@/lib/demo/store";

type Category = "All" | CosmeticCategory;
type ViewMode = "shop" | "owned";

const categories: Category[] = ["All", "Hair", "Outfits", "Accessories"];

const rarityStyles: Record<string, string> = {
  Common: "text-white/60 border-white/15",
  Rare: "text-sky-300 border-sky-400/30",
  Epic: "text-fuchsia-300 border-fuchsia-400/30",
  Legendary: "text-yellow border-yellow/40",
};

type ConfirmTarget =
  | { mode: "cart" }
  | { mode: "single"; itemId: string };

function ItemBadge({ item, size = "size-20" }: { item: CosmeticItem; size?: string }) {
  return (
    <div
      className={`grid ${size} place-items-center rounded-full bg-gradient-to-br text-xl font-black text-white shadow-lg ${item.gradient}`}
    >
      {item.initials}
    </div>
  );
}

function ShopPage() {
  const [view, setView] = useState<ViewMode>("shop");
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [ownedIds, setOwnedIds] = ownedItemsStore.useStore();
  const [cart, setCart] = cartStore.useStore();
  const [wallet, setWallet] = walletStore.useStore();
  const [notifications, setNotifications] = notificationsStore.useStore();
  const [transactions, setTransactions] = transactionsStore.useStore();
  const balance = wallet[0] ?? 0;
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{ names: string[]; spent: number } | null>(null);
  const [clearCartOpen, setClearCartOpen] = useState(false);

  const filteredItems = useMemo(() => {
    return cosmeticCatalog.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(search.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  const ownedCatalogItems = useMemo(
    () => cosmeticCatalog.filter((item) => ownedIds.includes(item.id)),
    [ownedIds],
  );

  const cartLines = useMemo(
    () =>
      cart
        .map((line) => ({ line, item: cosmeticCatalog.find((i) => i.id === line.itemId) }))
        .filter((entry): entry is { line: (typeof cart)[number]; item: CosmeticItem } => !!entry.item),
    [cart],
  );

  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const cartTotal = cartLines.reduce((sum, { line, item }) => sum + line.qty * item.price, 0);

  function addToCart(itemId: string) {
    const existing = cart.find((line) => line.itemId === itemId);
    if (existing) {
      setCart(cart.map((line) => (line.itemId === itemId ? { ...line, qty: line.qty + 1 } : line)));
    } else {
      setCart([...cart, { itemId, qty: 1 }]);
    }
  }

  function updateQty(itemId: string, delta: number) {
    setCart(
      cart.map((line) =>
        line.itemId === itemId ? { ...line, qty: Math.max(1, line.qty + delta) } : line,
      ),
    );
  }

  function removeFromCart(itemId: string) {
    setCart(cart.filter((line) => line.itemId !== itemId));
  }

  function startPackageCheckout(packageId: string) {
    setCheckoutPayload({ kind: "coins", packageId });
    setCheckoutOpen(true);
  }

  // ----- confirmation popup data -----
  const confirmLines = useMemo(() => {
    if (!confirmTarget) return [];
    if (confirmTarget.mode === "cart") return cartLines;
    const single = cartLines.find((entry) => entry.item.id === confirmTarget.itemId);
    if (single) return [single];
    const item = cosmeticCatalog.find((i) => i.id === confirmTarget.itemId);
    return item ? [{ line: { itemId: item.id, qty: 1 }, item }] : [];
  }, [confirmTarget, cartLines]);

  const confirmTotal = confirmLines.reduce((sum, { line, item }) => sum + line.qty * item.price, 0);
  const canAffordConfirm = balance >= confirmTotal;

  function confirmPurchase() {
    if (!confirmTarget || confirmLines.length === 0 || !canAffordConfirm) return;

    const purchasedIds = confirmLines.map(({ item }) => item.id);
    const names = confirmLines.map(({ item }) => item.name);

    setWallet([balance - confirmTotal]);
    setOwnedIds([...new Set([...ownedIds, ...purchasedIds])]);
    setCart(cart.filter((line) => !purchasedIds.includes(line.itemId)));
    setNotifications([
      {
        id: uid("ntf"),
        title: purchasedIds.length > 1 ? "Cart purchase complete" : `Purchased ${names[0]}`,
        body: `${formatCoins(confirmTotal)} C-Coins were spent. Item${purchasedIds.length > 1 ? "s are" : " is"} now in your collection.`,
        createdAt: new Date().toISOString(),
        kind: "shop",
        read: false,
      },
      ...notifications,
    ]);
    setTransactions([
      ...confirmLines.map(({ line, item }) => ({
        id: uid("tx"),
        label: item.name,
        detail: `Shop purchase — ${item.category}${line.qty > 1 ? ` ×${line.qty}` : ""}`,
        amount: -(line.qty * item.price),
        kind: "purchase" as const,
        createdAt: new Date().toISOString(),
      })),
      ...transactions,
    ]);

    setConfirmTarget(null);
    setPurchaseSuccess({ names, spent: confirmTotal });
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
    <div className="min-h-screen bg-[#0d121c] px-4 pb-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] pt-8 sm:pt-10">
        {/* HEADER */}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[.18em] text-coral">PLAYER MARKETPLACE</p>
            <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
              Crew Shop
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-3 rounded-lg border border-yellow/30 bg-yellow/10 px-4 py-3">
              <Coins className="size-6 text-yellow" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-yellow/70">
                  C-Coin Balance
                </p>
                <p className="text-lg font-black text-yellow">{formatCoins(balance)}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#151c29] px-4 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:border-coral"
            >
              <ShoppingCart className="size-5" />
              Cart
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-coral text-[10px] font-black text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* VIEW SWITCH */}
        <div className="mt-6 inline-flex rounded-full border border-white/10 bg-[#151c29] p-1">
          <button
            type="button"
            onClick={() => setView("shop")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${
              view === "shop" ? "bg-coral text-white" : "text-white/50 hover:text-white"
            }`}
          >
            <ShoppingBag className="size-4" /> Shop
          </button>
          <button
            type="button"
            onClick={() => setView("owned")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${
              view === "owned" ? "bg-coral text-white" : "text-white/50 hover:text-white"
            }`}
          >
            <Package className="size-4" /> Owned Items
          </button>
        </div>

        {view === "shop" ? (
          <>
            {/* FILTERS */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide transition ${
                      activeCategory === category
                        ? "border-coral bg-coral text-white"
                        : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <label className="relative sm:w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/25" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search cosmetics..."
                  className="w-full rounded-md border border-white/10 bg-[#151c29] px-4 py-2.5 pl-10 text-sm text-white outline-none placeholder:text-white/25 focus:border-coral"
                />
              </label>
            </div>

            {/* PRODUCT GRID */}
            <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filteredItems.map((item) => {
                const owned = ownedIds.includes(item.id);
                const inCart = cart.find((line) => line.itemId === item.id);
                const canAfford = balance >= item.price;

                return (
                  <article
                    key={item.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#151c29] transition hover:border-white/20"
                  >
                    <div className="relative flex aspect-square items-center justify-center bg-[#0d121c]">
                      <ItemBadge item={item} />
                      <span
                        className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${rarityStyles[item.rarity]}`}
                      >
                        {item.rarity}
                      </span>
                      {owned && (
                        <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-emerald-500 text-white">
                          <Check className="size-3.5" />
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-2 p-3.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-white/35">
                        {item.category}
                      </p>
                      <h3 className="truncate text-sm font-black text-white">{item.name}</h3>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <span className="inline-flex items-center gap-1 text-sm font-black text-yellow">
                          <Coins className="size-3.5" />
                          {formatCoins(item.price)}
                        </span>
                      </div>

                      {owned ? (
                        <button
                          type="button"
                          disabled
                          className="mt-1 w-full cursor-not-allowed rounded-md bg-white/[0.06] px-3 py-2 text-xs font-black uppercase tracking-wide text-white/30"
                        >
                          Owned
                        </button>
                      ) : (
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => addToCart(item.id)}
                            className="w-full rounded-md border border-white/15 px-2 py-2 text-[11px] font-black uppercase tracking-wide text-white transition hover:border-coral"
                          >
                            {inCart ? `In Cart (${inCart.qty})` : "Add to Cart"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmTarget({ mode: "single", itemId: item.id })}
                            className={`w-full rounded-md px-2 py-2 text-[11px] font-black uppercase tracking-wide transition ${
                              canAfford
                                ? "bg-coral text-white hover:opacity-90"
                                : "bg-white/10 text-white/60 hover:bg-white/15"
                            }`}
                          >
                            Buy Now
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="col-span-full rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-white/40">
                  No cosmetics match your search.
                </div>
              )}
            </section>

            {/* C-COIN PACKAGES */}
            <section className="mt-12" id="coin-shop">
              <div className="mb-4">
                <p className="text-xs font-black tracking-[.18em] text-coral">TOP UP</p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
                  C-Coin Packages
                </h2>
                <p className="mt-1 text-sm text-white/40">
                  Purchase more C-Coins using a mock payment method — Card, GCash, UnionBank or PayPal.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {coinPackages.map((pack) => (
                  <article
                    key={pack.id}
                    className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-[#151c29] p-5 text-center transition hover:border-yellow/40"
                  >
                    <Coins className="size-8 text-yellow" />
                    <p className="text-lg font-black text-white">{formatCoins(pack.coins)}</p>
                    {pack.bonus ? (
                      <p className="text-[11px] font-bold text-emerald-400">+{formatCoins(pack.bonus)} bonus</p>
                    ) : (
                      <p className="text-[11px] text-white/20">&nbsp;</p>
                    )}
                    <p className="text-sm font-bold text-white/60">{pack.priceLabel}</p>
                    <button
                      type="button"
                      onClick={() => startPackageCheckout(pack.id)}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-yellow px-3 py-2 text-xs font-black uppercase tracking-wide text-navy transition hover:opacity-90"
                    >
                      <ShoppingBag className="size-4" />
                      Buy
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          /* OWNED ITEMS */
          <section className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ownedCatalogItems.map((item) => (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#151c29]"
              >
                <div className="relative flex aspect-square items-center justify-center bg-[#0d121c]">
                  <ItemBadge item={item} />
                  <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-emerald-500 text-white">
                    <Check className="size-3.5" />
                  </span>
                </div>
                <div className="flex flex-col gap-1 p-3.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/35">
                    {item.category}
                  </p>
                  <h3 className="truncate text-sm font-black text-white">{item.name}</h3>
                  <span className="mt-1 inline-block w-fit rounded-full border border-emerald-400/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-400">
                    Owned
                  </span>
                </div>
              </article>
            ))}

            {ownedCatalogItems.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-white/40">
                You don't own any cosmetics yet — head to the Shop tab to get started.
              </div>
            )}
          </section>
        )}
      </div>

      {/* CART DRAWER */}
      {cartOpen && (
        <div className="fixed inset-0 z-[90] flex justify-end">
          <button
            className="absolute inset-0 bg-navy/70"
            onClick={() => setCartOpen(false)}
            aria-label="Close cart"
          />
          <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-[#151c29] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="text-lg font-black uppercase tracking-wide">Your Cart</h2>
              <button onClick={() => setCartOpen(false)} className="text-white/50 hover:text-white" aria-label="Close cart">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 p-5">
              {cartLines.length === 0 && (
                <p className="mt-6 text-center text-sm text-white/40">Your cart is empty.</p>
              )}
              {cartLines.map(({ line, item }) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0d121c] p-3">
                  <ItemBadge item={item} size="size-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">{item.name}</p>
                    <p className="text-xs font-bold text-yellow">{formatCoins(item.price)} C-Coins ea.</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, -1)}
                        className="grid size-6 place-items-center rounded border border-white/15 text-white/70 hover:border-coral hover:text-white"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-black">{line.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, 1)}
                        className="grid size-6 place-items-center rounded border border-white/15 text-white/70 hover:border-coral hover:text-white"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="ml-auto grid size-6 place-items-center rounded text-coral/80 hover:text-coral"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCartOpen(false);
                      setConfirmTarget({ mode: "single", itemId: item.id });
                    }}
                    className="shrink-0 self-start rounded-md bg-coral/90 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-coral"
                  >
                    Buy
                  </button>
                </div>
              ))}
            </div>

            {cartLines.length > 0 && (
              <div className="border-t border-white/10 p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-white/60">Total</span>
                  <span className="inline-flex items-center gap-1 font-black text-yellow">
                    <Coins className="size-4" /> {formatCoins(cartTotal)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    setConfirmTarget({ mode: "cart" });
                  }}
                  className="mt-4 w-full rounded-md bg-coral px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90"
                >
                  Purchase Cart
                </button>

                <button
                  type="button"
                  onClick={() => setClearCartOpen(true)}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/15 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white/60 transition hover:border-coral hover:text-coral"
                >
                  <Trash2 className="size-3.5" /> Clear Cart
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* CONFIRMATION POPUP */}
      {confirmTarget && confirmLines.length > 0 && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-navy/70 p-5 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-2xl bg-[#151c29] p-6 text-white shadow-2xl">
            <h2 className="text-xl font-black uppercase tracking-wide">Confirm Purchase</h2>

            <div className="mt-4 max-h-56 space-y-3 overflow-y-auto pr-1">
              {confirmLines.map(({ line, item }) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0d121c] p-3">
                  <ItemBadge item={item} size="size-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">{item.name}</p>
                    <p className="text-xs text-white/40">Qty: {line.qty}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-black text-yellow">
                    <Coins className="size-3.5" /> {formatCoins(line.qty * item.price)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1.5 rounded-lg border border-white/10 bg-[#0d121c] p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/50">Total cost</span>
                <span className="font-black text-yellow">{formatCoins(confirmTotal)} C-Coins</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Current balance</span>
                <span className="font-bold text-white">{formatCoins(balance)} C-Coins</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Remaining balance</span>
                <span className={`font-black ${canAffordConfirm ? "text-emerald-400" : "text-coral"}`}>
                  {formatCoins(Math.max(balance - confirmTotal, 0))} C-Coins
                </span>
              </div>
            </div>

            {!canAffordConfirm && (
              <p className="mt-3 rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-xs font-bold text-coral">
                Insufficient C-Coin balance. Top up in the C-Coin Packages section below.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="rounded-md border border-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canAffordConfirm}
                onClick={confirmPurchase}
                className={`rounded-md px-4 py-2.5 text-sm font-black transition ${
                  canAffordConfirm
                    ? "bg-coral text-white hover:opacity-90"
                    : "cursor-not-allowed bg-white/10 text-white/40"
                }`}
              >
                Confirm
              </button>
            </div>
          </section>
        </div>
      )}

      {/* SUCCESS POPUP */}
      {purchaseSuccess && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-navy/70 p-5 backdrop-blur-sm">
          <section className="w-full max-w-sm rounded-2xl bg-[#151c29] p-6 text-center text-white shadow-2xl">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500 text-white">
              <Check className="size-7" />
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-wider text-emerald-400">Purchase confirmed</p>
            <h2 className="mt-1 text-xl font-black">
              {purchaseSuccess.names.length > 1
                ? `${purchaseSuccess.names.length} items added`
                : purchaseSuccess.names[0]}
            </h2>
            <p className="mt-2 text-sm text-white/50">
              {formatCoins(purchaseSuccess.spent)} C-Coins spent. New balance: {formatCoins(balance)} C-Coins.
            </p>
            <button
              type="button"
              onClick={() => setPurchaseSuccess(null)}
              className="mt-5 w-full rounded-md bg-coral px-4 py-2.5 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90"
            >
              Done
            </button>
          </section>
        </div>
      )}

      {/* CLEAR CART CONFIRMATION */}
      {clearCartOpen && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-navy/75 p-5 backdrop-blur-sm">
          <section className="w-full max-w-sm rounded-2xl bg-[#151c29] p-6 text-white shadow-2xl">
            <div className="grid size-12 place-items-center rounded-full bg-coral/15 text-coral">
              <Trash2 className="size-6" />
            </div>
            <h2 className="mt-4 text-xl font-black uppercase">Clear cart?</h2>
            <p className="mt-2 text-sm text-white/55">
              This removes all {cartCount} item{cartCount === 1 ? "" : "s"} from your cart. Nothing will be
              purchased and no C-Coins are spent.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setClearCartOpen(false)}
                className="rounded-md border border-white/15 px-4 py-2.5 text-sm font-black text-white/70 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setCart([]);
                  setClearCartOpen(false);
                }}
                className="rounded-md bg-coral px-4 py-2.5 text-sm font-black text-white transition hover:opacity-90"
              >
                Clear Cart
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
