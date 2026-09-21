import { neon } from '@neondatabase/serverless';

type PayMongoLedgerStatus = 'processing' | 'fulfilled' | 'failed';

type PayMongoOrderInput = {
  orderId: string;
  checkoutSessionId: string;
  playFabId: string;
  packageId: string;
  coins: number;
  amountInCentavos: number;
  eventId: string;
};

export type PayMongoClaimResult =
  | { status: 'claimed' }
  | { status: 'processing' | 'fulfilled' | 'failed' };

let schemaPromise: Promise<void> | null = null;

function getDatabaseUrl(): string | null {
  const value = process.env['DATABASE_URL']?.trim();
  return value || null;
}

function getSql() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for the PayMongo payment ledger.');
  }
  return neon(databaseUrl);
}

async function ensureSchema(sql: ReturnType<typeof neon>): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = sql`
      CREATE TABLE IF NOT EXISTS paymongo_payment_ledger (
        order_id TEXT PRIMARY KEY,
        checkout_session_id TEXT NOT NULL,
        playfab_id TEXT NOT NULL,
        package_id TEXT NOT NULL,
        coins INTEGER NOT NULL CHECK (coins > 0),
        amount_in_centavos INTEGER NOT NULL CHECK (amount_in_centavos > 0),
        status TEXT NOT NULL CHECK (status IN ('processing', 'fulfilled', 'failed')),
        event_id TEXT,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        fulfilled_at TIMESTAMPTZ,
        failed_at TIMESTAMPTZ,
        last_error TEXT
      )
    `.then(() => undefined).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

export function isPayMongoLedgerConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

/**
 * Atomically claims an order for fulfillment. The order ID is the idempotency
 * key: only the first webhook delivery can receive `claimed`.
 */
export async function claimPayMongoOrder(
  input: PayMongoOrderInput,
): Promise<PayMongoClaimResult> {
  const sql = getSql();
  await ensureSchema(sql);

  const inserted = await sql`
    INSERT INTO paymongo_payment_ledger (
      order_id,
      checkout_session_id,
      playfab_id,
      package_id,
      coins,
      amount_in_centavos,
      status,
      event_id
    ) VALUES (
      ${input.orderId},
      ${input.checkoutSessionId},
      ${input.playFabId},
      ${input.packageId},
      ${input.coins},
      ${input.amountInCentavos},
      'processing',
      ${input.eventId || null}
    )
    ON CONFLICT (order_id) DO NOTHING
    RETURNING order_id
  `;

  if (inserted.length > 0) return { status: 'claimed' };

  const existing = await sql`
    SELECT status
    FROM paymongo_payment_ledger
    WHERE order_id = ${input.orderId}
    LIMIT 1
  `;
  const status = String(existing[0]?.status || 'processing') as PayMongoLedgerStatus;
  if (!['processing', 'fulfilled', 'failed'].includes(status)) {
    throw new Error(`Unknown PayMongo ledger status for ${input.orderId}: ${status}`);
  }
  return { status };
}

export async function markPayMongoOrderFulfilled(
  orderId: string,
  eventId: string,
): Promise<boolean> {
  const sql = getSql();
  await ensureSchema(sql);
  const updated = await sql`
    UPDATE paymongo_payment_ledger
    SET status = 'fulfilled',
        event_id = COALESCE(${eventId || null}, event_id),
        fulfilled_at = NOW()
    WHERE order_id = ${orderId}
      AND status = 'processing'
    RETURNING order_id
  `;
  return updated.length > 0;
}

export async function markPayMongoOrderFailed(
  orderId: string,
  reason: string,
): Promise<boolean> {
  const sql = getSql();
  await ensureSchema(sql);
  const updated = await sql`
    UPDATE paymongo_payment_ledger
    SET status = 'failed',
        failed_at = NOW(),
        last_error = ${reason.slice(0, 1000)}
    WHERE order_id = ${orderId}
      AND status = 'processing'
    RETURNING order_id
  `;
  return updated.length > 0;
}