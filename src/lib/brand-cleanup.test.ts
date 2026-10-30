import { test } from "node:test";
import assert from "node:assert/strict";
import { relatedBrandRecord } from "./brand-cleanup.ts";
const application = { id: "app-1", brandPromotionToken: "token-1", link: "https://brand.test/product" };
test("cleanup follows application, token, published update, and announcement references", () => {
  for (const record of [{ applicationId: "app-1" }, { url: "https://site.test/api/brand-promotions/click?token=token-1" }, { href: "/api/brand-updates/update-1/click" }, { id: "brand-notice-update-1" }]) {
    assert.equal(relatedBrandRecord(record, application, ["update-1"]), true);
  }
});
test("cleanup preserves unrelated records and partial identifier matches", () => {
  for (const record of [{ applicationId: "app-10" }, { url: "https://site.test/api/brand-promotions/click?token=token-10" }, { href: "/api/brand-updates/update-10/click" }, { id: "game-update" }]) {
    assert.equal(relatedBrandRecord(record, application, ["update-1"]), false);
  }
});
