import { neon } from "@neondatabase/serverless";

export type GameDownloadSource = "public" | "player";

function getSql() {
  const url = process.env["DATABASE_URL"]?.trim();
  return url ? neon(url) : null;
}

let schemaPromise: Promise<void> | undefined;

async function ensureSchema(sql: ReturnType<typeof neon>) {
  schemaPromise ??= sql`
    CREATE TABLE IF NOT EXISTS game_download_events (
      download_id TEXT PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('public', 'player')),
      downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.then(() => undefined).catch((error) => {
    schemaPromise = undefined;
    throw error;
  });
  await schemaPromise;
}

/** Returns null when durable download tracking has not been configured. */
export async function getGameDownloadCount(): Promise<number | null> {
  const sql = getSql();
  if (!sql) return null;
  await ensureSchema(sql);
  const rows = await sql`SELECT COUNT(*) AS total FROM game_download_events` as Array<{ total: number | string }>;
  return Number(rows[0]?.total ?? 0);
}

/** Count a download request after its destination is known to be available. */
export async function recordGameDownload(source: GameDownloadSource): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  await ensureSchema(sql);
  await sql`
    INSERT INTO game_download_events (download_id, source)
    VALUES (${crypto.randomUUID()}, ${source})
  `;
  return true;
}

