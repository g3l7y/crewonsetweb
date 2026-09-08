/**
 * Demo cosmetics catalog for the player shop + checkout flow.
 * Ownership + wallet state live in localStorage via createStore, matching
 * the shape used by the rest of the demo data layer.
 */

import { createStore } from "@/lib/demo/store";

export type CosmeticCategory = "Hair" | "Outfits" | "Accessories";

export type CosmeticItem = {
  id: string;
  name: string;
  category: CosmeticCategory;
  price: number;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  gradient: string;
  initials: string;
};

export const cosmeticCatalog: CosmeticItem[] = [
  { id: "hair-buzz", name: "Buzz Cut", category: "Hair", price: 250, rarity: "Common", gradient: "from-slate-400 to-slate-600", initials: "BZ" },
  { id: "hair-curls", name: "Studio Curls", category: "Hair", price: 400, rarity: "Rare", gradient: "from-amber-400 to-orange-600", initials: "SC" },
  { id: "hair-mohawk", name: "Director's Mohawk", category: "Hair", price: 650, rarity: "Epic", gradient: "from-fuchsia-500 to-purple-700", initials: "DM" },
  { id: "hair-silver", name: "Silver Streak", category: "Hair", price: 1200, rarity: "Legendary", gradient: "from-slate-200 to-slate-500", initials: "SS" },
  { id: "outfit-pa", name: "PA Windbreaker", category: "Outfits", price: 300, rarity: "Common", gradient: "from-sky-400 to-blue-600", initials: "PA" },
  { id: "outfit-gaffer", name: "Gaffer Overalls", category: "Outfits", price: 550, rarity: "Rare", gradient: "from-yellow-400 to-amber-600", initials: "GA" },
  { id: "outfit-director", name: "Director's Jacket", category: "Outfits", price: 900, rarity: "Epic", gradient: "from-rose-500 to-red-700", initials: "DJ" },
  { id: "outfit-legend", name: "Legendary Crew Vest", category: "Outfits", price: 1800, rarity: "Legendary", gradient: "from-yellow-300 via-amber-400 to-orange-600", initials: "LV" },
  { id: "acc-headphones", name: "Boom Headphones", category: "Accessories", price: 200, rarity: "Common", gradient: "from-emerald-400 to-teal-600", initials: "BH" },
  { id: "acc-clapper", name: "Golden Clapperboard", category: "Accessories", price: 700, rarity: "Rare", gradient: "from-yellow-400 to-yellow-600", initials: "GC" },
  { id: "acc-lanyard", name: "VIP Crew Lanyard", category: "Accessories", price: 450, rarity: "Rare", gradient: "from-indigo-400 to-indigo-700", initials: "VL" },
  { id: "acc-visor", name: "Cinematic Visor", category: "Accessories", price: 1100, rarity: "Epic", gradient: "from-cyan-400 to-blue-700", initials: "CV" },
];

export type CoinPackage = {
  id: string;
  coins: number;
  bonus?: number;
  priceLabel: string;
};

export const coinPackages: CoinPackage[] = [
  { id: "pack-500", coins: 500, priceLabel: "₱4.99" },
  { id: "pack-1200", coins: 1200, bonus: 150, priceLabel: "₱9.99" },
  { id: "pack-2600", coins: 2600, bonus: 500, priceLabel: "₱19.99" },
  { id: "pack-6000", coins: 6000, bonus: 1500, priceLabel: "₱39.99" },
];

export type PaymentMethodId = "card" | "gcash" | "unionbank" | "paypal";

export const paymentMethods: { id: PaymentMethodId; label: string; hint: string }[] = [
  { id: "card", label: "Card", hint: "Visa, Mastercard" },
  { id: "gcash", label: "GCash", hint: "Mobile wallet" },
  { id: "unionbank", label: "UnionBank", hint: "Online banking" },
  { id: "paypal", label: "PayPal", hint: "Pay with balance" },
];

/** Owned cosmetic item ids for the demo player. */
export const ownedItemsStore = createStore<string>("cos.ownedItems", [
  "hair-buzz",
  "outfit-pa",
  "acc-headphones",
]);

export type CartLine = { itemId: string; qty: number };

/** Player's cosmetic shopping cart, persisted across sessions. */
export const cartStore = createStore<CartLine>("cos.cart", []);

/** Pending checkout payload, set by Shop, consumed by Checkout (coin packages only). */
export type CheckoutPayload = { kind: "coins"; packageId: string };

const CHECKOUT_KEY = "cos.checkoutPayload";

export function setCheckoutPayload(payload: CheckoutPayload | null) {
  if (typeof window === "undefined") return;
  if (!payload) {
    window.localStorage.removeItem(CHECKOUT_KEY);
  } else {
    window.localStorage.setItem(CHECKOUT_KEY, JSON.stringify(payload));
  }
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
