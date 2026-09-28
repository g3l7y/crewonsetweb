import { createFileRoute } from "@tanstack/react-router";
import { unauthorizedSessionResponse, validateSessionFromRequest } from "@/lib/playfab/session";
import {
  getWebsiteRecords,
  getWebsiteValue,
  setWebsiteRecords,
  setWebsiteValue,
} from "@/lib/playfab/websiteData";

const DATA_KEYS: Record<string, string> = {
  ads: "website_admin_ads",
  revenue: "website_admin_revenue",
  gameBuild: "website_admin_game_build",
  brandUpdates: "website_admin_brand_updates",
  buildHistory: "website_admin_build_history",
  systemRequirements: "website_admin_system_requirements",
  buildInfo: "website_admin_build_info",
  installSteps: "website_admin_install_steps",
  socialLinks: "website_admin_social_links",
  activity: "website_admin_activity",
  messages: "website_admin_messages",
  contentStats: "website_admin_content_stats",
  notifications: "website_admin_notifications",
  alertRead: "website_admin_alert_read",
};

function getSecretKey(): string {
  const key = process.env["PLAYFAB_SECRET_KEY"];
  if (!key) throw new Error("PLAYFAB_SECRET_KEY is not configured");
  return key;
}

function resolveKey(request: Request): string | null {
  const name = new URL(request.url).searchParams.get("key");
  return name ? (DATA_KEYS[name] ?? null) : null;
}

const RECORD_COLLECTION_KEYS = new Set([
  "website_admin_ads",
  "website_admin_revenue",
  "website_admin_brand_updates",
  "website_admin_system_requirements",
  "website_admin_install_steps",
  "website_admin_social_links",
  "website_admin_activity",
  "website_admin_messages",
  "website_admin_notifications",
]);

const DEFAULT_SYSTEM_REQUIREMENTS = [
  { id: "req-os", label: "OS", minimum: "Windows 10 64-bit", recommended: "Windows 11 64-bit" },
  { id: "req-cpu", label: "Processor", minimum: "Intel Core i3-8100 / AMD Ryzen 3 2200G", recommended: "Intel Core i5-10400 / AMD Ryzen 5 3600" },
  { id: "req-ram", label: "Memory", minimum: "8 GB RAM", recommended: "16 GB RAM" },
  { id: "req-gpu", label: "Graphics", minimum: "GTX 960 / RX 570 (2 GB VRAM)", recommended: "GTX 1660 / RX 5600 XT (6 GB VRAM)" },
  { id: "req-dx", label: "DirectX", minimum: "Version 11", recommended: "Version 12" },
  { id: "req-storage", label: "Storage", minimum: "6 GB available space", recommended: "10 GB available space (SSD)" },
  { id: "req-net", label: "Network", minimum: "Broadband internet for co-op play", recommended: "Broadband internet for co-op play" },
];

async function readAdminData(key: string, secretKey: string): Promise<unknown> {
  return RECORD_COLLECTION_KEYS.has(key)
    ? getWebsiteRecords<{ id: string }>(key, secretKey)
    : getWebsiteValue<unknown>(key, secretKey);
}

async function writeAdminData(key: string, value: unknown, secretKey: string): Promise<boolean> {
  return RECORD_COLLECTION_KEYS.has(key) && Array.isArray(value)
    ? setWebsiteRecords(key, value as Array<{ id: string }>, secretKey)
    : setWebsiteValue(key, value, secretKey);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export const Route = createFileRoute("/api/admin/data")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const key = resolveKey(request);
        const publicContentKey =
          key === DATA_KEYS["gameBuild"] ||
          key === DATA_KEYS["buildHistory"] ||
          key === DATA_KEYS["systemRequirements"] ||
          key === DATA_KEYS["buildInfo"] ||
          key === DATA_KEYS["installSteps"] ||
          key === DATA_KEYS["brandUpdates"];
        if (
          !publicContentKey &&
          !(await validateSessionFromRequest(request, { requireAdmin: true }))
        ) {
          return unauthorizedSessionResponse();
        }
        if (!key) return Response.json({ error: "Unknown admin data key." }, { status: 400 });
        try {
          let value = await readAdminData(key, getSecretKey());
          if (key === DATA_KEYS["systemRequirements"] && Array.isArray(value) && value.length === 0) {
            const defaultsSaved = await writeAdminData(key, DEFAULT_SYSTEM_REQUIREMENTS, getSecretKey());
            if (!defaultsSaved) return Response.json({ error: "Failed to initialize system requirements." }, { status: 500 });
            value = DEFAULT_SYSTEM_REQUIREMENTS;
          }
          if (
            key === DATA_KEYS["gameBuild"] &&
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
          ) {
            value = [value];
          }
          return Response.json({ success: true, data: value ?? [] });
        } catch (error) {
          console.error("[API] GET admin/data error:", error);
          return Response.json({ error: "Failed to load admin data." }, { status: 500 });
        }
      },

      PUT: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        const key = resolveKey(request);
        if (!key) return Response.json({ error: "Unknown admin data key." }, { status: 400 });
        try {
          const body = (await request.json()) as { data?: unknown };
          if (body.data === undefined) {
            return Response.json({ error: "Data is required." }, { status: 400 });
          }
          const success = await writeAdminData(key, body.data, getSecretKey());
          return success
            ? Response.json({ success: true })
            : Response.json({ error: "Failed to save admin data." }, { status: 500 });
        } catch (error) {
          console.error("[API] PUT admin/data error:", error);
          return Response.json({ error: "Failed to save admin data." }, { status: 500 });
        }
      },

      POST: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        const key = resolveKey(request);
        if (!key) return Response.json({ error: "Unknown admin data key." }, { status: 400 });
        try {
          const incoming = (await request.json()) as Record<string, unknown>;
          if (!incoming["id"])
            return Response.json({ error: "Record ID is required." }, { status: 400 });
          const current = ((await readAdminData(key, getSecretKey())) as unknown[] | null) ?? [];
          const next = [
            incoming,
            ...current.filter((item) => !isRecord(item) || item["id"] !== incoming["id"]),
          ];
          const success = await writeAdminData(key, next, getSecretKey());
          return success
            ? Response.json({ success: true, data: incoming }, { status: 201 })
            : Response.json({ error: "Failed to create admin record." }, { status: 500 });
        } catch (error) {
          console.error("[API] POST admin/data error:", error);
          return Response.json({ error: "Failed to create admin record." }, { status: 500 });
        }
      },

      PATCH: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        const key = resolveKey(request);
        if (!key) return Response.json({ error: "Unknown admin data key." }, { status: 400 });
        try {
          const incoming = (await request.json()) as Record<string, unknown>;
          if (!incoming["id"])
            return Response.json({ error: "Record ID is required." }, { status: 400 });
          const current = ((await readAdminData(key, getSecretKey())) as unknown[] | null) ?? [];
          let found = false;
          const next = current.map((item) => {
            if (!isRecord(item) || item["id"] !== incoming["id"]) return item;
            found = true;
            return { ...item, ...incoming };
          });
          if (!found) return Response.json({ error: "Record not found." }, { status: 404 });
          const success = await writeAdminData(key, next, getSecretKey());
          return success
            ? Response.json({ success: true })
            : Response.json({ error: "Failed to update admin record." }, { status: 500 });
        } catch (error) {
          console.error("[API] PATCH admin/data error:", error);
          return Response.json({ error: "Failed to update admin record." }, { status: 500 });
        }
      },

      DELETE: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        const key = resolveKey(request);
        if (!key) return Response.json({ error: "Unknown admin data key." }, { status: 400 });
        try {
          const body = (await request.json()) as { ids?: string[] };
          const ids = new Set(body.ids ?? []);
          if (!ids.size)
            return Response.json({ error: "Record IDs are required." }, { status: 400 });
          const current = ((await readAdminData(key, getSecretKey())) as unknown[] | null) ?? [];
          const next = current.filter(
            (item) => !isRecord(item) || typeof item["id"] !== "string" || !ids.has(item["id"]),
          );
          const success = await writeAdminData(key, next, getSecretKey());
          return success
            ? Response.json({ success: true })
            : Response.json({ error: "Failed to delete admin records." }, { status: 500 });
        } catch (error) {
          console.error("[API] DELETE admin/data error:", error);
          return Response.json({ error: "Failed to delete admin records." }, { status: 500 });
        }
      },
    },
  },
});
