import { createFileRoute } from '@tanstack/react-router';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import { getWebsiteRecords, getWebsiteValue, setWebsiteRecords, setWebsiteValue } from '@/lib/playfab/websiteData';

const DATA_KEYS: Record<string, string> = {
  ads: 'website_admin_ads',
  revenue: 'website_admin_revenue',
  gameBuild: 'website_admin_game_build',
  buildHistory: 'website_admin_build_history',
  systemRequirements: 'website_admin_system_requirements',
  buildInfo: 'website_admin_build_info',
  installSteps: 'website_admin_install_steps',
  socialLinks: 'website_admin_social_links',
  activity: 'website_admin_activity',
  messages: 'website_admin_messages',
  contentStats: 'website_admin_content_stats',
  notifications: 'website_admin_notifications',
  alertRead: 'website_admin_alert_read',
};

function getSecretKey(): string {
  const key = process.env['PLAYFAB_SECRET_KEY'];
  if (!key) throw new Error('PLAYFAB_SECRET_KEY is not configured');
  return key;
}

function resolveKey(request: Request): string | null {
  const name = new URL(request.url).searchParams.get('key');
  return name ? DATA_KEYS[name] ?? null : null;
}

const RECORD_COLLECTION_KEYS = new Set([
  "website_admin_ads",
  "website_admin_revenue",
  "website_admin_system_requirements",
  "website_admin_install_steps",
  "website_admin_social_links",
  "website_admin_activity",
  "website_admin_messages",
  "website_admin_notifications",
]);

async function readAdminData(key: string, secretKey: string): Promise<unknown> {
  return RECORD_COLLECTION_KEYS.has(key)
    ? getWebsiteRecords<{ id: string }>(key, secretKey)
    : getWebsiteValue<unknown>(key, secretKey);
}

async function writeAdminData(key: string, value: unknown, secretKey: string): Promise<boolean> {
  return RECORD_COLLECTION_KEYS.has(key) && Array.isArray(value)
    ? setWebsiteRecords(key, value as Array<{ id: string }>, secretKey)
    : setWebsiteValue(key, value, secretKey);
}function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export const Route = createFileRoute('/api/admin/data')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        const key = resolveKey(request);
        if (!key) return Response.json({ error: 'Unknown admin data key.' }, { status: 400 });
        try {
          const value = await readAdminData(key, getSecretKey());
          return Response.json({ success: true, data: value ?? [] });
        } catch (error) {
          console.error('[API] GET admin/data error:', error);
          return Response.json({ error: 'Failed to load admin data.' }, { status: 500 });
        }
      },

      PUT: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        const key = resolveKey(request);
        if (!key) return Response.json({ error: 'Unknown admin data key.' }, { status: 400 });
        try {
          const body = (await request.json()) as { data?: unknown };
          if (body.data === undefined) {
            return Response.json({ error: 'Data is required.' }, { status: 400 });
          }
          const success = await writeAdminData(key, body.data, getSecretKey());
          return success
            ? Response.json({ success: true })
            : Response.json({ error: 'Failed to save admin data.' }, { status: 500 });
        } catch (error) {
          console.error('[API] PUT admin/data error:', error);
          return Response.json({ error: 'Failed to save admin data.' }, { status: 500 });
        }
      },

      POST: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        const key = resolveKey(request);
        if (!key) return Response.json({ error: 'Unknown admin data key.' }, { status: 400 });
        try {
          const incoming = (await request.json()) as Record<string, unknown>;
          if (!incoming["id"]) return Response.json({ error: 'Record ID is required.' }, { status: 400 });
          const current = ((await readAdminData(key, getSecretKey())) as unknown[] | null) ?? [];
          const next = [incoming, ...current.filter((item) => !isRecord(item) || item["id"] !== incoming["id"])];
          const success = await writeAdminData(key, next, getSecretKey());
          return success
            ? Response.json({ success: true, data: incoming }, { status: 201 })
            : Response.json({ error: 'Failed to create admin record.' }, { status: 500 });
        } catch (error) {
          console.error('[API] POST admin/data error:', error);
          return Response.json({ error: 'Failed to create admin record.' }, { status: 500 });
        }
      },

      PATCH: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        const key = resolveKey(request);
        if (!key) return Response.json({ error: 'Unknown admin data key.' }, { status: 400 });
        try {
          const incoming = (await request.json()) as Record<string, unknown>;
          if (!incoming["id"]) return Response.json({ error: 'Record ID is required.' }, { status: 400 });
          const current = ((await readAdminData(key, getSecretKey())) as unknown[] | null) ?? [];
          let found = false;
          const next = current.map((item) => {
            if (!isRecord(item) || item["id"] !== incoming["id"]) return item;
            found = true;
            return { ...item, ...incoming };
          });
          if (!found) return Response.json({ error: 'Record not found.' }, { status: 404 });
          const success = await writeAdminData(key, next, getSecretKey());
          return success
            ? Response.json({ success: true })
            : Response.json({ error: 'Failed to update admin record.' }, { status: 500 });
        } catch (error) {
          console.error('[API] PATCH admin/data error:', error);
          return Response.json({ error: 'Failed to update admin record.' }, { status: 500 });
        }
      },

      DELETE: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }
        const key = resolveKey(request);
        if (!key) return Response.json({ error: 'Unknown admin data key.' }, { status: 400 });
        try {
          const body = (await request.json()) as { ids?: string[] };
          const ids = new Set(body.ids ?? []);
          if (!ids.size) return Response.json({ error: 'Record IDs are required.' }, { status: 400 });
          const current = ((await readAdminData(key, getSecretKey())) as unknown[] | null) ?? [];
          const next = current.filter((item) => !isRecord(item) || typeof item["id"] !== 'string' || !ids.has(item["id"]));
          const success = await writeAdminData(key, next, getSecretKey());
          return success
            ? Response.json({ success: true })
            : Response.json({ error: 'Failed to delete admin records.' }, { status: 500 });
        } catch (error) {
          console.error('[API] DELETE admin/data error:', error);
          return Response.json({ error: 'Failed to delete admin records.' }, { status: 500 });
        }
      },
    },
  },
});
