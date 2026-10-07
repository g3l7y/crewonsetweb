/** Cosmetic-only catalog shared by the demo provider and PlayFab adapter. */

import { createStore } from "@/lib/demo/store";
import shopProducts from "./shop-products.json";

export type CosmeticCategory = "Hair" | "Face" | "Body" | "Tops" | "Bottoms" | "Shoe Wear" | "Accessories";

export type CosmeticItem = {
  id: string;
  name: string;
  category: CosmeticCategory;
  price: number;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  description: string;
  assetKey: string;
  /** True when real mode has a category but the game has not supplied item metadata yet. */
  placeholder?: boolean;
  /** Optional artwork URL supplied by the live game catalog. */
  imageUrl?: string;
  imagePath?: string;
  gradient?: string;
  initials?: string;
};

export const cosmeticCatalog = shopProducts as CosmeticItem[];

/** Body choices are free, always owned, and map to the game's two built-in rigs. */
export const freeBodyItems: CosmeticItem[] = [
  { id: "avatar-body-boy", name: "Crew Member · Boy", category: "Body", price: 0, rarity: "Common", description: "A free player body style.", assetKey: "body-boy" },
  { id: "avatar-body-girl", name: "Crew Member · Girl", category: "Body", price: 0, rarity: "Common", description: "A free player body style.", assetKey: "body-girl" },
];

/** These appearance choices are free and treated as owned in both app surfaces. */
export const freeCatalogItems = cosmeticCatalog.filter((item) =>
  ["hair-chestnut-bun", "hair-swept-fringe", "top-white-tee", "bottom-teal-joggers", "shoe-slip-ons"].includes(item.id),
);
export const freeCosmeticIds = [
  ...cosmeticCatalog.filter((item) => item.category === "Face").map((item) => item.id),
  ...freeCatalogItems.map((item) => item.id),
  ...freeBodyItems.map((item) => item.id),
];

export type CoinPackage = {
  id: string;
  coins: number;
  priceLabel: string;
  pricePhp: number;
};

export const coinPackages: CoinPackage[] = [
  { id: "pack-500", coins: 500, priceLabel: "\u20b149.00", pricePhp: 49.00 },
  { id: "pack-1350", coins: 1350, priceLabel: "\u20b1119.00", pricePhp: 119.00 },
  { id: "pack-3100", coins: 3100, priceLabel: "\u20b1249.00", pricePhp: 249.00 },
  { id: "pack-7500", coins: 7500, priceLabel: "\u20b1499.00", pricePhp: 499.00 },
];

export const ownedItemsStore = createStore<string>("cos.ownedItems", ["hair-chestnut-bun", "face-neutral-focus", "face-set-day-scowl", "face-half-lidded", "face-side-eye-smirk", "face-big-surprise", "top-utility-vest", "accessory-rectangular-frames"]);
export const equippedItemsStore = createStore<Record<string, string>>("cos.equippedItems", {
  Hair: "hair-chestnut-bun",
  Tops: "top-utility-vest",
  Accessories: "accessory-rectangular-frames",
});
export type CartLine = { itemId: string; qty: number };
export const cartStore = createStore<CartLine>("cos.cart", []);

export type CheckoutPayload = { kind: "coins"; packageId: string };
const CHECKOUT_KEY = "cos.checkoutPayload";

export function setCheckoutPayload(payload: CheckoutPayload | null) {
  if (typeof window === "undefined") return;
  if (!payload) window.localStorage.removeItem(CHECKOUT_KEY);
  else window.localStorage.setItem(CHECKOUT_KEY, JSON.stringify(payload));
}

export function getCheckoutPayload(): CheckoutPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CHECKOUT_KEY);
    return raw ? (JSON.parse(raw) as CheckoutPayload) : null;
  } catch {
    return null;
  }
}
