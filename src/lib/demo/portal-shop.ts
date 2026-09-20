/** Cosmetic-only catalog shared by the demo provider and PlayFab adapter. */

import { createStore } from "@/lib/demo/store";

export type CosmeticCategory = "Hair" | "Tops" | "Bottoms" | "Eyeglasses";

export type CosmeticItem = {
  id: string;
  name: string;
  category: CosmeticCategory;
  price: number;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  description: string;
  assetKey: string;
  gradient?: string;
  initials?: string;
};

export const cosmeticCatalog: CosmeticItem[] = [
  { id: "hair-soft-crop", name: "Soft Crop", category: "Hair", price: 350, rarity: "Common", description: "A tidy, low-maintenance crop for call sheets and coffee runs.", assetKey: "soft-crop" },
  { id: "hair-coral-bob", name: "Coral Bob", category: "Hair", price: 550, rarity: "Rare", description: "A sharp bob with a warm coral streak that reads great on camera.", assetKey: "coral-bob" },
  { id: "hair-studio-curls", name: "Studio Curls", category: "Hair", price: 650, rarity: "Rare", description: "Expressive curls with enough bounce for a last-minute retake.", assetKey: "studio-curls" },
  { id: "hair-indigo-swoop", name: "Indigo Swoop", category: "Hair", price: 900, rarity: "Epic", description: "A clean swept shape with a confident muted-lavender accent.", assetKey: "indigo-swoop" },
  { id: "hair-gold-pompadour", name: "Gold Pompadour", category: "Hair", price: 1350, rarity: "Legendary", description: "A statement silhouette for the crew member who calls the final take.", assetKey: "gold-pompadour" },
  { id: "top-coral-tee", name: "Coral Call Sheet Tee", category: "Tops", price: 300, rarity: "Common", description: "A clean coral tee with a bold crew-ready silhouette.", assetKey: "coral-tee" },
  { id: "top-blue-overshirt", name: "Blue Overshirt", category: "Tops", price: 475, rarity: "Common", description: "A muted-blue overshirt for long days in the production bay.", assetKey: "blue-overshirt" },
  { id: "top-utility-hoodie", name: "Utility Hoodie", category: "Tops", price: 700, rarity: "Rare", description: "A structured hoodie with a practical front pocket and soft lining.", assetKey: "utility-hoodie" },
  { id: "top-mustard-sweater", name: "Mustard Knit", category: "Tops", price: 850, rarity: "Epic", description: "Warm mustard knitwear with a neat, graphic collar shape.", assetKey: "mustard-knit" },
  { id: "top-plum-jacket", name: "Plum Work Jacket", category: "Tops", price: 1100, rarity: "Legendary", description: "A polished plum layer with crisp pockets and a studio-ready cut.", assetKey: "plum-jacket" },
  { id: "bottom-charcoal-jeans", name: "Charcoal Jeans", category: "Bottoms", price: 325, rarity: "Common", description: "Straight-leg charcoal denim that works with every department.", assetKey: "charcoal-jeans" },
  { id: "bottom-olive-cargos", name: "Olive Cargos", category: "Bottoms", price: 520, rarity: "Rare", description: "A practical olive pair with roomy pockets for set essentials.", assetKey: "olive-cargos" },
  { id: "bottom-coral-skirt", name: "Coral Pleat Skirt", category: "Bottoms", price: 640, rarity: "Rare", description: "A graphic pleated skirt that adds motion to the crew wardrobe.", assetKey: "coral-skirt" },
  { id: "bottom-indigo-trousers", name: "Indigo Trousers", category: "Bottoms", price: 800, rarity: "Epic", description: "Tailored indigo trousers with a clean, production-floor drape.", assetKey: "indigo-trousers" },
  { id: "glasses-round-ink", name: "Round Ink Frames", category: "Eyeglasses", price: 425, rarity: "Common", description: "Classic round frames with a confident dark outline.", assetKey: "round-ink" },
  { id: "glasses-square-coral", name: "Coral Square Frames", category: "Eyeglasses", price: 600, rarity: "Rare", description: "Graphic square frames with a small coral bridge accent.", assetKey: "square-coral" },
  { id: "glasses-cat-eye", name: "Cat-Eye Frames", category: "Eyeglasses", price: 780, rarity: "Epic", description: "Playful lifted frames for a little extra editorial attitude.", assetKey: "cat-eye" },
  { id: "glasses-gold-wire", name: "Gold Wire Frames", category: "Eyeglasses", price: 1050, rarity: "Legendary", description: "Fine gold frames with a warm, polished finish.", assetKey: "gold-wire" },
];

export type CoinPackage = {
  id: string;
  coins: number;
  bonus?: number;
  priceLabel: string;
  pricePhp: number;
};

export const coinPackages: CoinPackage[] = [
  { id: "pack-500", coins: 500, priceLabel: "\u20b14.99", pricePhp: 4.99 },
  { id: "pack-1200", coins: 1200, bonus: 150, priceLabel: "\u20b19.99", pricePhp: 9.99 },
  { id: "pack-2600", coins: 2600, bonus: 500, priceLabel: "\u20b119.99", pricePhp: 19.99 },
  { id: "pack-6000", coins: 6000, bonus: 1500, priceLabel: "\u20b139.99", pricePhp: 39.99 },
];

export const ownedItemsStore = createStore<string>("cos.ownedItems", ["hair-soft-crop", "top-coral-tee", "glasses-round-ink"]);
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
