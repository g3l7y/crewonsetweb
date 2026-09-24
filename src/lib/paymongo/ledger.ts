import { neon } from "@neondatabase/serverless";

type PayMongoLedgerStatus = "pending" | "active" | "processing" | "fulfilled" | "failed";

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
  { status: "claimed" } | { status: Exclude<PayMongoLedgerStatus, "pending" | "active"> };

export type PayMongoLedgerOrder = {
  orderId: string;
  checkoutSessionId: string;
  playFabId: string;
  packageId: string;
  coins: number;
  amountInCentavos: number;
  status: PayMongoLedgerStatus;
  createdAt: string;
  fulfilledAt?: string;
};

let schemaPromise: Promise<void> | null = null;

function getDatabaseUrl(): string | null {
  const value = process.env["DATABASE_URL"]?.trim();
  return value || null;
}

function getSql() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the PayMongo payment ledger.");
  }
  return neon(databaseUrl);
}

async function ensureSchema(sql: ReturnType<typeof neon>): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS paymongo_payment_ledger (
          order_id TEXT PRIMARY KEY,
          checkout_session_id TEXT NOT NULL,
          playfab_id TEXT NOT NULL,
          package_id TEXT NOT NULL,
          coins INTEGER NOT NULL CHECK (coins > 0),
          amount_in_centavos INTEGER NOT NULL CHECK (amount_in_centavos > 0),
          status TEXT NOT NULL,
          event_id TEXT,
          claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          fulfilled_at TIMESTAMPTZ,
          failed_at TIMESTAMPTZ,
          last_error TEXT
        )
      `;
      // Keep existing installations compatible with mock Test checkout states.
      await sql`ALTER TABLE paymongo_payment_ledger DROP CONSTRAINT IF EXISTS paymongo_payment_ledger_status_check`;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

export function isPayMongoLedgerConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

export async function registerPayMongoOrder(input: PayMongoOrderInput): Promise<boolean> {
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
      'pending',
      ${input.eventId || null}
    )
    ON CONFLICT (order_id) DO NOTHING
    RETURNING order_id
  `;
  return inserted.length > 0;
}

export async function activatePayMongoOrder(
  orderId: string,
  checkoutSessionId: string,
): Promise<boolean> {
  const sql = getSql();
  await ensureSchema(sql);
  const updated = await sql`
    UPDATE paymongo_payment_ledger
    SET checkout_session_id = ${checkoutSessionId},
        status = CASE WHEN status IN ('pending', 'active') THEN 'active' ELSE status END
    WHERE order_id = ${orderId}
    RETURNING order_id
  `;
  return updated.length > 0;
}

export async function getPayMongoOrder(
  orderIdOrCheckoutSessionId: string,
): Promise<PayMongoLedgerOrder | null> {
  const sql = getSql();
  await ensureSchema(sql);
  const rows = await sql`
    SELECT order_id, checkout_session_id, playfab_id, package_id,
           coins, amount_in_centavos, status, claimed_at, fulfilled_at
    FROM paymongo_payment_ledger
    WHERE order_id = ${orderIdOrCheckoutSessionId}
       OR checkout_session_id = ${orderIdOrCheckoutSessionId}
    ORDER BY claimed_at DESC
    LIMIT 1
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    orderId: String(row.order_id),
    checkoutSessionId: String(row.checkout_session_id),
    playFabId: String(row.playfab_id),
    packageId: String(row.package_id),
    coins: Number(row.coins),
    amountInCentavos: Number(row.amount_in_centavos),
    status: String(row.status) as PayMongoLedgerStatus,
    createdAt: new Date(String(row.claimed_at)).toISOString(),
    ...(row.fulfilled_at ? { fulfilledAt: new Date(String(row.fulfilled_at)).toISOString() } : {}),
  };
}

/**
 * Atomically claims an order for fulfillment. The order ID is the idempotency
 * key: only the first webhook delivery can receive `claimed`.
 */
export async function claimPayMongoOrder(input: PayMongoOrderInput): Promise<PayMongoClaimResult> {
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

  if (inserted.length > 0) return { status: "claimed" };

  const activated = await sql`
    UPDATE paymongo_payment_ledger
    SET status = 'processing',
        event_id = COALESCE(${input.eventId || null}, event_id)
    WHERE order_id = ${input.orderId}
      AND status IN ('pending', 'active')
    RETURNING order_id
  `;
  if (activated.length > 0) return { status: "claimed" };

  const existing = await sql`
    SELECT status
    FROM paymongo_payment_ledger
    WHERE order_id = ${input.orderId}
    LIMIT 1
  `;
  const status = String(existing[0]?.status || "processing") as PayMongoLedgerStatus;
  if (!["pending", "active", "processing", "fulfilled", "failed"].includes(status)) {
    throw new Error(`Unknown PayMongo ledger status for ${input.orderId}: ${status}`);
  }
  if (status === "pending" || status === "active") return { status: "processing" };
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

export async function markPayMongoOrderFailed(orderId: string, reason: string): Promise<boolean> {
  const sql = getSql();
  await ensureSchema(sql);
  const updated = await sql`
    UPDATE paymongo_payment_ledger
    SET status = 'failed',
        failed_at = NOW(),
        last_error = ${reason.slice(0, 1000)}
    WHERE order_id = ${orderId}
      AND status IN ('pending', 'active', 'processing')
    RETURNING order_id
  `;
  return updated.length > 0;
}
