import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifestPath = resolve(projectRoot, "src/lib/demo/shop-products.json");
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const verifyOnly = args.has("--verify");
const overwriteExisting = args.has("--overwrite-existing");
const createMissingCurrency = args.has("--create-ccoin-if-missing");

async function readLocalEnv() {
  const values = {};
  for (const fileName of [".env.local", ".env"]) {
    let source;
    try {
      source = await readFile(resolve(projectRoot, fileName), "utf8");
    } catch {
      continue;
    }
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!match || match[1] in values) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else {
        value = value.replace(/\s+#.*$/, "");
      }
      values[match[1]] = value;
    }
  }
  return values;
}

async function callPlayFab(titleId, secretKey, endpoint, body) {
  const response = await fetch(`https://${titleId}.playfabapi.com/Admin/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SecretKey": secretKey,
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.code !== 200) {
    throw new Error(`${endpoint} failed (${response.status}): ${result.errorMessage || result.error || "PlayFab returned an unknown error."}`);
  }
  return result.data ?? {};
}

const products = JSON.parse(await readFile(manifestPath, "utf8"));
if (!Array.isArray(products) || products.length !== 29) {
  throw new Error("Shop manifest must contain exactly 29 products.");
}

const categoryCounts = products.reduce((counts, product) => {
  counts[product.category] = (counts[product.category] ?? 0) + 1;
  return counts;
}, {});
console.log(`Shop manifest ready: ${products.length} items (${Object.entries(categoryCounts).map(([category, count]) => `${category}: ${count}`).join(", ")}).`);

if (!apply && !verifyOnly) {
  console.log("Dry run only. Add PLAYFAB_SECRET_KEY and VITE_PLAYFAB_TITLE_ID to .env.local, then rerun with --apply to publish.");
  console.log("The import uses PlayFab's additive UpdateCatalogItems endpoint and will not replace the rest of the catalog.");
  process.exit(0);
}

const env = { ...await readLocalEnv(), ...process.env };
const titleId = env.PLAYFAB_TITLE_ID || env.VITE_PLAYFAB_TITLE_ID;
const secretKey = env.PLAYFAB_SECRET_KEY;
const currencyCode = (env.PLAYFAB_CCOIN_CURRENCY_CODE || env.VITE_PLAYFAB_CCOIN_CURRENCY_CODE || "CC").trim().toUpperCase();
if (!titleId || !/^[A-Za-z0-9]+$/.test(titleId)) {
  throw new Error("Set the exact PlayFab title ID in VITE_PLAYFAB_TITLE_ID in .env.local before applying.");
}
if (!secretKey || secretKey === "replace_with_server_only_secret") {
  throw new Error("Set the PlayFab Developer Secret Key in PLAYFAB_SECRET_KEY in .env.local before applying.");
}
if (!/^[A-Z0-9]{2}$/.test(currencyCode)) {
  throw new Error("The C-Coin virtual currency code must be exactly two letters or digits.");
}

const existingCatalog = await callPlayFab(titleId, secretKey, "GetCatalogItems", {});
const existingIds = new Set((existingCatalog.Catalog ?? []).map((item) => item.ItemId));
const collisions = products.map((product) => product.id).filter((id) => existingIds.has(id));
if (apply && collisions.length && !overwriteExisting) {
  throw new Error(`These IDs already exist and were not changed: ${collisions.join(", ")}. Review them, then rerun with --overwrite-existing only if replacing those entries is intended.`);
}

let currencyResult = await callPlayFab(titleId, secretKey, "ListVirtualCurrencyTypes", {});
let currencies = currencyResult.VirtualCurrencies ?? [];
let activeCurrencyCode = currencyCode;
if (!currencies.some((currency) => currency.CurrencyCode === activeCurrencyCode)) {
  let ccoin = currencies.find((currency) => /c[\s_-]*coins?/i.test(currency.DisplayName ?? ""));
  if (!ccoin && currencies.length === 0 && createMissingCurrency) {
    await callPlayFab(titleId, secretKey, "AddVirtualCurrencyTypes", {
      VirtualCurrencies: [{
        CurrencyCode: activeCurrencyCode,
        DisplayName: "C-Coins",
        InitialDeposit: 0,
        RechargeRate: 0,
        RechargeMax: 0,
      }],
    });
    console.log(`Created ${activeCurrencyCode} (C-Coins) with no initial player grant.`);
    currencyResult = await callPlayFab(titleId, secretKey, "ListVirtualCurrencyTypes", {});
    currencies = currencyResult.VirtualCurrencies ?? [];
    ccoin = currencies.find((currency) => currency.CurrencyCode === activeCurrencyCode);
  }
  if (!ccoin?.CurrencyCode) {
    const available = currencies.map((currency) => `${currency.DisplayName} (${currency.CurrencyCode})`).join(", ") || "none configured";
    throw new Error(`Currency ${activeCurrencyCode} is not configured, and no C-Coin currency could be identified. Available currencies: ${available}. Set PLAYFAB_CCOIN_CURRENCY_CODE to the correct code before retrying.`);
  }
  if (ccoin.CurrencyCode !== activeCurrencyCode) {
    activeCurrencyCode = ccoin.CurrencyCode;
    console.log(`PlayFab identifies C-Coins as ${activeCurrencyCode}; using the configured title currency.`);
  }
}

if (verifyOnly) {
  const liveById = new Map((existingCatalog.Catalog ?? []).map((item) => [item.ItemId, item]));
  const mismatches = products.flatMap((product) => {
    const liveItem = liveById.get(product.id);
    const livePrice = Number(liveItem?.VirtualCurrencyPrices?.[activeCurrencyCode]);
    return liveItem?.DisplayName === product.name && livePrice === product.price ? [] : [product.id];
  });
  if (mismatches.length) {
    throw new Error(`PlayFab catalog is missing or differs on ${mismatches.length} products: ${mismatches.join(", ")}.`);
  }
  console.log(`Verified: all ${products.length} products and ${activeCurrencyCode} prices are present in PlayFab.`);
  process.exit(0);
}

const catalog = products.map((product) => ({
  ItemId: product.id,
  DisplayName: product.name,
  Description: product.description,
  ItemClass: product.category,
  Tags: ["cosmetic", product.category.toLowerCase()],
  VirtualCurrencyPrices: { [activeCurrencyCode]: product.price },
  CustomData: JSON.stringify({
    category: product.category,
    rarity: product.rarity.toLowerCase(),
    assetKey: product.assetKey,
  }),
  IsStackable: false,
  IsTradable: false,
}));

await callPlayFab(titleId, secretKey, "UpdateCatalogItems", { Catalog: catalog });
console.log(`Published ${catalog.length} cosmetic items to PlayFab title ${titleId} using ${activeCurrencyCode}.`);
