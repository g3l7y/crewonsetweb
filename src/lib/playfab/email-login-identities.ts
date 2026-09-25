import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

export type AccountRole = "player" | "admin";

type EmailAliasRow = { playfab_id: string; role: AccountRole };

function databaseUrl() {
  return process.env["DATABASE_URL"]?.trim() || null;
}

function getSql() {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is required for verified email sign-in changes.");
  return neon(url);
}

let schemaPromise: Promise<void> | null = null;

async function ensureSchema(sql: ReturnType<typeof getSql>) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      // Keep only a one-way email digest locally; PlayFab remains the account
      // authority and the destination email itself stays in its profile.
      await sql`
        CREATE TABLE IF NOT EXISTS playfab_email_login_aliases (
          playfab_id TEXT PRIMARY KEY,
          email_hash TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL CHECK (role IN ('player', 'admin')),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS playfab_email_change_tokens (
          token_hash TEXT PRIMARY KEY,
          playfab_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('player', 'admin')),
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS playfab_email_change_tokens_owner_idx ON playfab_email_change_tokens (playfab_id, created_at DESC)`;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

export function isEmailLoginIdentityStoreConfigured() {
  return Boolean(databaseUrl());
}

export function hashAccountEmail(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export function hashEmailChangeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function findEmailLoginAlias(email: string): Promise<EmailAliasRow | null> {
  const sql = getSql();
  await ensureSchema(sql);
  const rows = (await sql`
    SELECT playfab_id, role
    FROM playfab_email_login_aliases
    WHERE email_hash = ${hashAccountEmail(email)}
    LIMIT 1
  `) as EmailAliasRow[];
  return rows[0] ?? null;
}

export async function saveEmailLoginAlias(email: string, playFabId: string, role: AccountRole) {
  const sql = getSql();
  await ensureSchema(sql);
  await sql`
    INSERT INTO playfab_email_login_aliases (playfab_id, email_hash, role, updated_at)
    VALUES (${playFabId}, ${hashAccountEmail(email)}, ${role}, NOW())
    ON CONFLICT (playfab_id) DO UPDATE
      SET email_hash = EXCLUDED.email_hash,
          role = EXCLUDED.role,
          updated_at = NOW()
  `;
}

export async function createEmailChangeToken(
  tokenHash: string,
  playFabId: string,
  role: AccountRole,
  expiresAt: Date,
) {
  const sql = getSql();
  await ensureSchema(sql);
  await sql`DELETE FROM playfab_email_change_tokens WHERE playfab_id = ${playFabId} AND used_at IS NULL`;
  await sql`
    INSERT INTO playfab_email_change_tokens (token_hash, playfab_id, role, expires_at)
    VALUES (${tokenHash}, ${playFabId}, ${role}, ${expiresAt.toISOString()})
  `;
}

export async function revokeEmailChangeToken(tokenHash: string) {
  const sql = getSql();
  await ensureSchema(sql);
  await sql`DELETE FROM playfab_email_change_tokens WHERE token_hash = ${tokenHash} AND used_at IS NULL`;
}

export async function hasValidEmailChangeToken(
  tokenHash: string,
  playFabId: string,
  role: AccountRole,
) {
  const sql = getSql();
  await ensureSchema(sql);
  const rows = await sql`
    SELECT token_hash
    FROM playfab_email_change_tokens
    WHERE token_hash = ${tokenHash}
      AND playfab_id = ${playFabId}
      AND role = ${role}
      AND used_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `;
  return rows.length > 0;
}

/** Atomically claim the link and replace this account's prior email alias. */
export async function completeEmailChangeToken(
  tokenHash: string,
  newEmail: string,
  playFabId: string,
  role: AccountRole,
) {
  const sql = getSql();
  await ensureSchema(sql);
  const rows = await sql`
    WITH valid_token AS (
      SELECT token_hash, playfab_id, role
      FROM playfab_email_change_tokens
      WHERE token_hash = ${tokenHash}
        AND playfab_id = ${playFabId}
        AND role = ${role}
        AND used_at IS NULL
        AND expires_at > NOW()
      FOR UPDATE
    ), saved_alias AS (
      INSERT INTO playfab_email_login_aliases (playfab_id, email_hash, role, updated_at)
      SELECT playfab_id, ${hashAccountEmail(newEmail)}, role, NOW()
      FROM valid_token
      ON CONFLICT (playfab_id) DO UPDATE
        SET email_hash = EXCLUDED.email_hash,
            role = EXCLUDED.role,
            updated_at = NOW()
      RETURNING playfab_id
    )
    UPDATE playfab_email_change_tokens
    SET used_at = NOW()
    WHERE token_hash = ${tokenHash}
      AND playfab_id = ${playFabId}
      AND role = ${role}
      AND used_at IS NULL
      AND expires_at > NOW()
      AND EXISTS (SELECT 1 FROM saved_alias)
    RETURNING playfab_id
  `;
  return rows.length > 0;
}
