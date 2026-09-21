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
import {
  Check,
  Coins,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import CheckoutPage from "@/components/portal/checkout";
import { useSearchParams } from "@/components/next-compat/navigation";
import { CosmeticArt } from "@/components/portal/cosmetic-art";
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
import { isMockMode } from "@/lib/playfab/config";
import {
  useCatalog,
  usePlayerInventory,
  usePlayerWallet,
  usePurchaseItem,
} from "@/lib/playfab/hooks";

type Category = "All" | CosmeticCategory;
type ViewMode = "shop" | "owned";
const categories: Category[] = ["All", "Hair", "Tops", "Bottoms", "Eyeglasses"];

const realCategoryPlaceholders: CosmeticItem[] = categories.slice(1).map((category) => ({
  id: `real-placeholder-${category.toLowerCase()}`,
  name: "",
  category,
  price: 0,
  rarity: "Common",
  description: "",
  assetKey: "",
  placeholder: true,
}));

const rarityStyles: Record<string, string> = {
  Common: "cos-rarity-common",
  Rare: "cos-rarity-rare",
  Epic: "cos-rarity-epic",
  Legendary: "cos-rarity-legendary",
};

type ConfirmTarget = { mode: "cart" } | { mode: "single"; itemId: string };

function ShopPage() {
  const mockMode = isMockMode();
  const searchParams = useSearchParams();
  const requestedView: ViewMode = searchParams.get("view") === "owned" ? "owned" : "shop";
  const [view, setView] = useState<ViewMode>(requestedView);

  useEffect(() => {
    setView(requestedView);
  }, [requestedView]);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<CosmeticItem | null>(null);
  const [shopError, setShopError] = useState("");
  const [purchaseBusy, setPurchaseBusy] = useState(false);

  const catalogQuery = useCatalog();
  const walletQuery = usePlayerWallet();
  const inventoryQuery = usePlayerInventory();
  const purchaseItem = usePurchaseItem();

  const [demoOwnedIds, setDemoOwnedIds] = ownedItemsStore.useStore();
  const [cart, setCart] = cartStore.useStore();
  const [demoWallet, setDemoWallet] = walletStore.useStore();
  const [notifications, setNotifications] = notificationsStore.useStore();
  const [transactions, setTransactions] = transactionsStore.useStore();

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
          name,
          category,
          price: remote.price ?? 0,
          rarity,
          description,
          assetKey,
          imageUrl,
          placeholder: !name && !description && !assetKey && !imageUrl,
        } satisfies CosmeticItem;
      })
      .filter((item): item is CosmeticItem => item !== null);
    const liveCategories = new Set(liveItems.map((item) => item.category));
    return [
      ...liveItems,
      ...realCategoryPlaceholders.filter((item) => !liveCategories.has(item.category)),
    ];
  }, [catalogQuery.data, mockMode]);

  const ownedIds = mockMode
    ? demoOwnedIds
    : (inventoryQuery.data ?? []).map((item) => item.itemId);
  const balance = mockMode ? (demoWallet[0] ?? 0) : (walletQuery.data?.cCoins ?? 0);
  const loading = !mockMode && (catalogQuery.isLoading || walletQuery.isLoading || inventoryQuery.isLoading);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return catalog.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      return matchesCategory && item.name.toLowerCase().includes(normalizedSearch);
    });
  }, [activeCategory, catalog, search]);

  const ownedCatalogItems = useMemo(
    () => catalog.filter((item) => ownedIds.includes(item.id)),
    [catalog, ownedIds],
  );

  const cartLines = useMemo(
    () =>
      cart
        .map((line) => ({ line, item: catalog.find((item) => item.id === line.itemId) }))
        .filter((entry): entry is { line: (typeof cart)[number]; item: CosmeticItem } => !!entry.item),
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

  const [checkoutOpen, setCheckoutOpen] = useState(
    () => searchParams.get("payment") === "success" && Boolean(searchParams.get("reference")),
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{ names: string[]; spent: number; remaining: number } | null>(null);
  const [clearCartOpen, setClearCartOpen] = useState(false);

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
            throw new Error(typeof result === "boolean" ? "PlayFab rejected the purchase." : result.error || "PlayFab rejected the purchase.");
          }
        }
        const refreshedWallet = await walletQuery.refetch();
        await inventoryQuery.refetch();
        const remaining = refreshedWallet.data?.cCoins ?? Math.max(balance - confirmTotal, 0);
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
      {
        id: uid("ntf"),
        title: purchasedIds.length > 1 ? "Cart purchase complete" : `Purchased ${names[0]}`,
        body: `${formatCoins(confirmTotal)} C-Coins were spent. Your cosmetic is now in your collection.`,
        createdAt: new Date().toISOString(),
        kind: "shop",
        read: false,
      },
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
            <p className="portal-kicker portal-title-eyebrow">PLAYER MARKETPLACE / COSMETICS ONLY</p>
            <h1 className="portal-title-heading">Studio Shop</h1>
            <p className="shop-subtitle">Style the crew. Keep the stats honest. Every item here is cosmetic-only.</p>
          </div>
          <div className="shop-toolbar">
            <div className="coin-balance">
              <Coins aria-hidden="true" />
              <span><small>C-COIN BALANCE</small><strong>{loading ? "—" : formatCoins(balance)}</strong></span>
            </div>
            <button type="button" className="shop-cart-button" onClick={() => setCartOpen(true)} aria-label={`Open cart, ${cartCount} items`}>
              <ShoppingCart aria-hidden="true" /> Cart
              {cartCount > 0 && <b>{cartCount}</b>}
            </button>
          </div>
        </header>

        {shopError && <div className="shop-alert" role="alert">{shopError}<button type="button" onClick={() => setShopError("")} aria-label="Dismiss message"><X /></button></div>}

        <div className="shop-tabs" role="tablist" aria-label="Shop views">
          <button type="button" role="tab" aria-selected={view === "shop"} onClick={() => setView("shop")} className={view === "shop" ? "active" : ""}><ShoppingBag /> Shop</button>
          <button type="button" role="tab" aria-selected={view === "owned"} onClick={() => setView("owned")} className={view === "owned" ? "active" : ""}><Package /> Owned items</button>
        </div>

        {view === "shop" ? (
          <>
            <div className="shop-filters">
              <div className="shop-category-list" role="list">
                {categories.map((category) => (
                  <button key={category} type="button" onClick={() => setActiveCategory(category)} className={activeCategory === category ? "active" : ""}>{category}</button>
                ))}
              </div>
              <label className="shop-search"><Search aria-hidden="true" /><span className="sr-only">Search cosmetics</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cosmetics" /></label>
            </div>

            {loading ? (
              <div className="shop-empty">Syncing the catalog from PlayFab…</div>
            ) : (
              <section className="shop-grid" aria-label="Cosmetics catalog">
                {filteredItems.map((item) => {
                  const owned = ownedIds.includes(item.id);
                  const inCart = cart.some((line) => line.itemId === item.id);
                  const hasArtwork = mockMode || Boolean(item.assetKey || item.imageUrl);
                  const hasDetails = mockMode || !item.placeholder;
                  return (
                    <article key={item.id} className={`shop-card${item.placeholder ? " real-placeholder-card" : ""}`}>
                      {hasDetails && hasArtwork ? (
                        <button type="button" className="shop-art-button" onClick={() => setSelectedItem(item)} aria-label={`View ${item.name || item.category} details`}>
                          {item.imageUrl ? <img className="shop-live-image" src={item.imageUrl} alt="" /> : <CosmeticArt item={item} />}
                          <span className={`cos-rarity ${rarityStyles[item.rarity]}`}>{item.rarity}</span>
                          {owned && <span className="owned-mark"><Check /></span>}
                        </button>
                      ) : (
                        <div className="shop-art-button shop-art-placeholder" aria-hidden="true" />
                      )}
                      <div className="shop-card-copy">
                        <p className="shop-category">{item.category}</p>
                        {hasDetails && <>
                          {item.name && <h2>{item.name}</h2>}
                          {item.description && <p className="shop-description">{item.description}</p>}
                          <div className="shop-card-bottom"><span className="shop-price"><Coins /> {formatCoins(item.price)}</span><span className="shop-status">{owned ? "Owned" : inCart ? "In cart" : "Available"}</span></div>
                          {owned ? (
                            <button type="button" className="shop-secondary-button" disabled>Owned</button>
                          ) : (
                            <div className="shop-card-actions">
                              <button type="button" className="shop-secondary-button" onClick={() => addToCart(item.id)}>{inCart ? "In cart" : "Add to cart"}</button>
                              <button type="button" className="shop-primary-button" onClick={() => setConfirmTarget({ mode: "single", itemId: item.id })}>Buy now</button>
                            </div>
                          )}
                        </>}
                      </div>
                    </article>
                  );
                })}
              </section>
            )}

            {!loading && filteredItems.length === 0 && <div className="shop-empty">No cosmetics match your search.</div>}

            <section className="coin-pack-section" aria-labelledby="coin-pack-title">
              <div>
                <p className="portal-kicker">{mockMode ? "PAYMONGO TEST TOP-UP" : "PAYMONGO WALLET TOP-UP"}</p>
                <h2 id="coin-pack-title">More C-Coins, when the set needs them.</h2>
                <p>{mockMode ? "Demo accounts use PayMongo test checkout when configured, with a local fallback when test keys are unavailable." : "Pay securely through PayMongo. Available payment methods are shown on PayMongo's hosted checkout."}</p>
              </div>
              <div className="coin-pack-grid">
                {coinPackages.map((pack) => (
                  <article key={pack.id} className="coin-pack-card"><Coins /><strong>{formatCoins(pack.coins)} <small>C-COINS</small></strong><p>{pack.priceLabel}</p><button type="button" onClick={() => startPackageCheckout(pack.id)}>{mockMode ? "Buy demo pack" : "Buy with PayMongo"}</button></article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="shop-grid" aria-label="Owned cosmetics">
            {ownedCatalogItems.map((item) => (
              <article key={item.id} className="shop-card owned-card"><button type="button" className="shop-art-button" onClick={() => setSelectedItem(item)} aria-label={`View ${item.name} details`}><CosmeticArt item={item} /><span className="owned-mark"><Check /></span></button><div className="shop-card-copy"><p className="shop-category">{item.category}</p><h2>{item.name}</h2><span className="shop-owned-label">Owned</span></div></article>
            ))}
            {ownedCatalogItems.length === 0 && <div className="shop-empty">No synced cosmetics yet. Purchase a cosmetic to start your collection.</div>}
          </section>
        )}
      </div>

      {selectedItem && (
        <div className="shop-modal-backdrop" role="presentation" onMouseDown={() => setSelectedItem(null)}>
          <section className="shop-modal" role="dialog" aria-modal="true" aria-labelledby="cosmetic-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelectedItem(null)} aria-label="Close product details"><X /></button>
            <div className="modal-art">{selectedItem.imageUrl ? <img className="shop-live-image" src={selectedItem.imageUrl} alt="" /> : selectedItem.assetKey ? <CosmeticArt item={selectedItem} /> : <div className="shop-art-placeholder" aria-hidden="true" />}</div>
            <div className="modal-copy"><p className="shop-category">{selectedItem.category}</p><h2 id="cosmetic-modal-title">{selectedItem.name}</h2><p>{selectedItem.description}</p><strong className="modal-price"><Coins /> {formatCoins(selectedItem.price)} C-Coins</strong><div className="modal-meta"><span>{ownedIds.includes(selectedItem.id) ? "Owned" : "Not owned"}</span><span>{cart.some((line) => line.itemId === selectedItem.id) ? "In cart" : "Not in cart"}</span></div><div className="modal-actions"><button type="button" className="shop-secondary-button" disabled={ownedIds.includes(selectedItem.id) || cart.some((line) => line.itemId === selectedItem.id)} onClick={() => addToCart(selectedItem.id)}>{ownedIds.includes(selectedItem.id) ? "Owned" : cart.some((line) => line.itemId === selectedItem.id) ? "In cart" : "Add to cart"}</button><button type="button" className="shop-primary-button" disabled={ownedIds.includes(selectedItem.id)} onClick={() => { setSelectedItem(null); setConfirmTarget({ mode: "single", itemId: selectedItem.id }); }}>Buy now</button></div></div>
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="shop-modal-backdrop" role="presentation" onMouseDown={() => setCartOpen(false)}>
          <aside className="shop-cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><p className="portal-kicker">YOUR CURRENT PICKS</p><h2 id="cart-title">Cart <span>({cartCount})</span></h2></div><button type="button" className="modal-close" onClick={() => setCartOpen(false)} aria-label="Close cart"><X /></button></header>
            <div className="cart-lines">{cartLines.length === 0 ? <p className="shop-empty">Your cart is empty.</p> : cartLines.map(({ item }) => <div className="cart-line" key={item.id}><CosmeticArt item={item} className="cart-art" /><div><strong>{item.name}</strong><span>{item.category}</span><b><Coins /> {formatCoins(item.price)}</b></div><button type="button" onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name} from cart`}><Trash2 /></button></div>)}</div>
            {cartLines.length > 0 && <footer><div><span>Total</span><strong><Coins /> {formatCoins(cartTotal)}</strong></div><button type="button" className="shop-primary-button" onClick={() => { setCartOpen(false); setConfirmTarget({ mode: "cart" }); }}>Buy cart</button><button type="button" className="shop-secondary-button" onClick={() => setClearCartOpen(true)}>Clear cart</button></footer>}
          </aside>
        </div>
      )}

      {confirmTarget && confirmLines.length > 0 && (
        <div className="shop-modal-backdrop">
          <section className="purchase-modal" role="dialog" aria-modal="true" aria-labelledby="purchase-title">
            <p className="portal-kicker">C-COIN CHECK</p><h2 id="purchase-title">Confirm purchase</h2>
            <div className="confirm-list">{confirmLines.map(({ item }) => <div key={item.id}><CosmeticArt item={item} className="confirm-art" /><span>{item.name}</span><b><Coins /> {formatCoins(item.price)}</b></div>)}</div>
            <div className="purchase-summary"><span>Total cost</span><strong>{formatCoins(confirmTotal)} C-Coins</strong><span>Current balance</span><strong>{formatCoins(balance)} C-Coins</strong><span>Remaining balance</span><strong className={canAffordConfirm ? "is-good" : "is-bad"}>{formatCoins(Math.max(0, balance - confirmTotal))} C-Coins</strong></div>
            {!canAffordConfirm && <p className="shop-alert compact" role="alert">Insufficient C-Coins. No charge will be made.</p>}
            <div className="modal-actions"><button type="button" className="shop-secondary-button" onClick={() => setConfirmTarget(null)}>Cancel</button><button type="button" className="shop-primary-button" disabled={!canAffordConfirm || purchaseBusy} onClick={() => void confirmPurchase()}>{purchaseBusy ? "Processing…" : "Confirm purchase"}</button></div>
          </section>
        </div>
      )}

      {purchaseSuccess && (
        <div className="shop-modal-backdrop">
          <section className="purchase-modal success-modal" role="dialog" aria-modal="true" aria-labelledby="success-title"><div className="success-icon"><Check /></div><p className="portal-kicker">PURCHASE COMPLETE</p><h2 id="success-title">{purchaseSuccess.names.length > 1 ? `${purchaseSuccess.names.length} cosmetics added` : purchaseSuccess.names[0]}</h2><p>{formatCoins(purchaseSuccess.spent)} C-Coins spent. Your new balance is <strong>{formatCoins(purchaseSuccess.remaining)} C-Coins</strong>.</p><button type="button" className="shop-primary-button" onClick={() => setPurchaseSuccess(null)}>Done</button></section>
        </div>
      )}

      {clearCartOpen && (
        <div className="shop-modal-backdrop">
          <section className="purchase-modal" role="dialog" aria-modal="true" aria-labelledby="clear-cart-title"><div className="success-icon warning"><Trash2 /></div><p className="portal-kicker">CART MANAGEMENT</p><h2 id="clear-cart-title">Clear cart?</h2><p>Remove all {cartCount} cosmetic{cartCount === 1 ? "" : "s"} without spending any C-Coins?</p><div className="modal-actions"><button type="button" className="shop-secondary-button" onClick={() => setClearCartOpen(false)}>Keep cart</button><button type="button" className="shop-primary-button" onClick={() => { setCart([]); setClearCartOpen(false); }}>Clear cart</button></div></section>
        </div>
      )}
    </div>
  );
}
