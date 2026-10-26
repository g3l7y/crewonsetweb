import type { Loadout } from "./types";

/** Shared PlayFab user-data contract consumed by Unity's AccountAppearanceData. */
export const GAME_APPEARANCE_KEY = "character_appearance";

export type GameAppearance = {
  version: 1;
  updated_at?: number;
  player_id: string;
  base_character: string;
  selected_frame?: string | null;
  change_id: string;
  equipped_parts: string[];
};

const WEBSITE_TO_GAME: Record<string, string> = {
  "accessory-crew-backpack": "character_accessory1",
  "accessory-rectangular-frames": "character_accessory2",
  "accessory-set-gloves": "character_accessory4",
  "accessory-utility-belt": "character_accessory3",
  "accessory-call-sheet-pass": "character_accessory5",
  "accessory-face-mask": "character_accessory6",
  "hair-chestnut-bun": "character_hair1",
  "hair-golden-curtains": "character_hair2",
  "hair-low-tie": "character_hair3",
  "hair-swept-fringe": "character_hair5",
  "hair-center-fringe": "character_hair4",
  "hair-tousled-fringe": "character_hair6",
  "face-neutral-focus": "character_face1",
  "face-set-day-scowl": "character_face2",
  "face-half-lidded": "character_face3",
  "face-side-eye-smirk": "character_face4",
  "face-big-surprise": "character_face5",
  "avatar-body-boy": "character_body_boy",
  "avatar-body-girl": "character_body_girl",
  "top-utility-vest": "character_shirt3",
  "top-open-collar": "character_shirt4",
  "top-white-tee": "character_shirt5",
  "top-field-jacket": "character_shirt2",
  "top-charcoal-vneck": "character_shirt1",
  "bottom-wide-slate": "character_pants1",
  "bottom-tan-cargo": "character_pants6",
  "bottom-teal-joggers": "character_pants4",
  "bottom-coral-shorts": "character_pants2",
  "bottom-slate-cargo": "character_pants3",
  "bottom-brown-tailored": "character_pants5",
  "shoe-platform-boots": "character_shoe2",
  "shoe-buckle-flats": "character_shoe6",
  "shoe-slip-ons": "character_shoe1",
  "shoe-red-sneakers": "character_shoe3",
  "shoe-green-sandals": "character_shoe5",
  "shoe-charcoal-slides": "character_shoe4",
};

/** Resolve a website cosmetic ID to the same model key used by Unity's catalog. */
export function websiteCosmeticModelKey(websiteItemId: string): string | null {
  const gameItemId = WEBSITE_TO_GAME[websiteItemId];
  return gameItemId?.replace(/^character_/, "") ?? null;
}

const GAME_TO_WEBSITE = Object.fromEntries(
  Object.entries(WEBSITE_TO_GAME).map(([websiteId, gameId]) => [gameId, websiteId]),
) as Record<string, string>;

const SLOT_KEYS: Record<string, string[]> = {
  Face: ["Face", "face"],
  Body: ["Body", "body"],
  Hair: ["Hair", "hair"],
  Tops: ["Tops", "tops", "Shirt", "shirt"],
  Bottoms: ["Bottoms", "bottoms", "Pants", "pants"],
  "Shoe Wear": ["Shoe Wear", "ShoeWear", "Shoes", "shoes", "shoe"],
  Accessories: ["Accessories", "Accessory", "accessory", "Eyeglasses", "eyeglasses", "decorator"],
};

export function gameAppearanceToLoadout(value: unknown): Loadout {
  if (!value || typeof value !== "object") return {};
  const record = value as Partial<GameAppearance>;
  const result: Loadout = {};
  for (const gameId of Array.isArray(record.equipped_parts) ? record.equipped_parts : []) {
    const websiteId = GAME_TO_WEBSITE[gameId];
    if (!websiteId) continue;
    const slot = websiteSlot(websiteId);
    if (slot) result[slot] = websiteId;
  }
  return result;
}

export function mergeLoadoutIntoGameAppearance(
  loadout: Partial<Loadout>,
  playerId: string,
  previous?: unknown,
): GameAppearance {
  const prior = previous && typeof previous === "object" ? previous as Partial<GameAppearance> : {};
  const merged = { ...gameAppearanceToLoadout(prior), ...loadout };
  const parts = new Set<string>();
  for (const [slot, keys] of Object.entries(SLOT_KEYS)) {
    const itemId = keys.map((key) => merged[key]).find((value) => typeof value === "string" && value.length > 0);
    if (!itemId) continue;
    const gameId = WEBSITE_TO_GAME[itemId];
    if (gameId) parts.add(gameId);
  }
  const changeId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return {
    version: 1,
    updated_at: Date.now(),
    player_id: playerId,
    base_character: prior.base_character || "DefaultCharacGirlRig",
    selected_frame: prior.selected_frame ?? null,
    change_id: changeId,
    equipped_parts: [...parts],
  };
}

function websiteSlot(itemId: string): string | null {
  if (itemId.startsWith("face-")) return "Face";
  if (itemId.startsWith("avatar-body-")) return "Body";
  if (itemId.startsWith("hair-")) return "Hair";
  if (itemId.startsWith("top-")) return "Tops";
  if (itemId.startsWith("bottom-")) return "Bottoms";
  if (itemId.startsWith("shoe-")) return "Shoe Wear";
  if (itemId.startsWith("accessory-")) return "Accessories";
  return null;
}
