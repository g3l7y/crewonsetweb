import { neon } from '@neondatabase/serverless';

type BrandClickRow = {
  clicks: number | string;
  visits: number | string;
  automatedRequests: number | string;
  testClicks: number | string;
};
export type BrandClickTrafficType = 'valid' | 'automated' | 'test';

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
          traffic_type TEXT NOT NULL DEFAULT 'valid',
          clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`ALTER TABLE brand_promotion_clicks ADD COLUMN IF NOT EXISTS traffic_type TEXT NOT NULL DEFAULT 'valid'`;
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

export async function recordBrandPromotionClick(
  applicationId: string,
  visitorId: string,
  trafficType: BrandClickTrafficType = 'valid',
): Promise<void> {
  const sql = getSql();
  await ensureSchema(sql);
  await sql`
    INSERT INTO brand_promotion_clicks (click_id, application_id, visitor_id, traffic_type)
    VALUES (${crypto.randomUUID()}, ${applicationId}, ${visitorId}, ${trafficType})
  `;
}

export async function getBrandPromotionMetrics(applicationId: string): Promise<{
  clicks: number;
  visits: number;
  automatedRequests: number;
  testClicks: number;
}> {
  const sql = getSql();
  await ensureSchema(sql);
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE traffic_type = 'valid') AS clicks,
      COUNT(DISTINCT visitor_id) FILTER (WHERE traffic_type = 'valid') AS visits,
      COUNT(*) FILTER (WHERE traffic_type = 'automated') AS "automatedRequests",
      COUNT(*) FILTER (WHERE traffic_type = 'test') AS "testClicks"
    FROM brand_promotion_clicks
    WHERE application_id = ${applicationId}
  ` as BrandClickRow[];
  return {
    clicks: Number(rows[0]?.clicks || 0),
    visits: Number(rows[0]?.visits || 0),
    automatedRequests: Number(rows[0]?.automatedRequests || 0),
    testClicks: Number(rows[0]?.testClicks || 0),
  };
}

/** Filter common crawlers and scripted clients while retaining only a coarse traffic class. */
export function isLikelyAutomatedClick(userAgent: string | null): boolean {
  if (!userAgent?.trim()) return true;
  return /bot|crawler|spider|preview|headless|lighthouse|puppeteer|playwright|selenium|curl\/|wget\/|python-requests|go-http-client|facebookexternalhit|slackbot|discordbot|whatsapp|twitterbot|linkedinbot/i.test(userAgent);
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

/** Permanently remove all tracking and completion-email ledger data for a purged brand application. */
export async function deleteBrandPromotionData(applicationId: string): Promise<void> {
  if (!databaseUrl()) return;
  const sql = getSql();
  await ensureSchema(sql);
  await sql`DELETE FROM brand_promotion_clicks WHERE application_id = ${applicationId}`;
  await sql`DELETE FROM brand_promotion_email_events WHERE event_id = ${'promotion-complete:' + applicationId}`;
}
