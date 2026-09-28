import { neon } from "@neondatabase/serverless";

function sqlClient() {
  const url = process.env["DATABASE_URL"]?.trim();
  if (!url) throw new Error("DATABASE_URL is required for brand update tracking.");
  return neon(url);
}

let schema: Promise<void> | undefined;
async function ensureSchema() {
  schema ??=
    sqlClient()`CREATE TABLE IF NOT EXISTS brand_update_events (event_id TEXT PRIMARY KEY, update_id TEXT NOT NULL, visitor_id TEXT NOT NULL, event_type TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`.then(
      () => undefined,
    );
  await schema;
}

export async function recordBrandUpdateEvent(
  updateId: string,
  visitorId: string,
  type: "impression" | "click",
) {
  const sql = sqlClient();
  await ensureSchema();
  await sql`INSERT INTO brand_update_events (event_id, update_id, visitor_id, event_type) VALUES (${crypto.randomUUID()}, ${updateId}, ${visitorId}, ${type})`;
}

export async function getBrandUpdateMetrics(updateId: string) {
  const sql = sqlClient();
  await ensureSchema();
  const rows =
    (await sql`SELECT COUNT(*) FILTER (WHERE event_type = 'click') AS clicks, COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions, COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'click') AS visits FROM brand_update_events WHERE update_id = ${updateId}`) as Array<{
      clicks: number | string;
      impressions: number | string;
      visits: number | string;
    }>;
  return {
    clicks: Number(rows[0]?.clicks ?? 0),
    impressions: Number(rows[0]?.impressions ?? 0),
    visits: Number(rows[0]?.visits ?? 0),
  };
}
