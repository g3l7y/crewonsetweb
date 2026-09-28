import { neon } from '@neondatabase/serverless';

type BrandClickRow = { clicks: number | string; visits: number | string };

let schemaPromise: Promise<void> | null = null;

function databaseUrl(): string | null {
  return process.env['DATABASE_URL']?.trim() || null;
}

function getSql() {
  const url = databaseUrl();
  if (!url) throw new Error('DATABASE_URL is required for brand promotion click tracking.');
  return neon(url);
}

async function ensureSchema(sql: ReturnType<typeof getSql>) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS brand_promotion_clicks (
          click_id TEXT PRIMARY KEY,
          application_id TEXT NOT NULL,
          visitor_id TEXT NOT NULL,
          clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS brand_promotion_clicks_application_time_idx ON brand_promotion_clicks (application_id, clicked_at)`;
      await sql`
        CREATE TABLE IF NOT EXISTS brand_promotion_email_events (
          event_id TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          sent_at TIMESTAMPTZ
        )
      `;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

export function isBrandPromotionTrackingConfigured(): boolean {
  return Boolean(databaseUrl());
}

export async function recordBrandPromotionClick(applicationId: string, visitorId: string): Promise<void> {
  const sql = getSql();
  await ensureSchema(sql);
  await sql`
    INSERT INTO brand_promotion_clicks (click_id, application_id, visitor_id)
    VALUES (${crypto.randomUUID()}, ${applicationId}, ${visitorId})
  `;
}

export async function getBrandPromotionMetrics(applicationId: string): Promise<{ clicks: number; visits: number }> {
  const sql = getSql();
  await ensureSchema(sql);
  const rows = await sql`
    SELECT COUNT(*) AS clicks, COUNT(DISTINCT visitor_id) AS visits
    FROM brand_promotion_clicks
    WHERE application_id = ${applicationId}
  ` as BrandClickRow[];
  return {
    clicks: Number(rows[0]?.clicks || 0),
    visits: Number(rows[0]?.visits || 0),
  };
}

/** Prevent concurrent expiry checks from sending the same completion email. */
export async function claimPromotionCompletionEmail(eventId: string): Promise<boolean> {
  if (!databaseUrl()) return true;
  const sql = getSql();
  await ensureSchema(sql);
  const rows = await sql`
    INSERT INTO brand_promotion_email_events (event_id, status, claimed_at)
    VALUES (${eventId}, 'sending', NOW())
    ON CONFLICT (event_id) DO UPDATE
      SET status = 'sending', claimed_at = NOW()
      WHERE brand_promotion_email_events.status <> 'sent'
        AND (brand_promotion_email_events.status <> 'sending'
          OR brand_promotion_email_events.claimed_at < NOW() - INTERVAL '10 minutes')
    RETURNING event_id
  `;
  return rows.length > 0;
}

export async function finishPromotionCompletionEmail(eventId: string, sent: boolean): Promise<void> {
  if (!databaseUrl()) return;
  const sql = getSql();
  await ensureSchema(sql);
  await sql`
    UPDATE brand_promotion_email_events
    SET status = ${sent ? 'sent' : 'pending'}, sent_at = ${sent ? new Date().toISOString() : null}
    WHERE event_id = ${eventId}
  `;
}
