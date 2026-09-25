type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

export type PaidCheckoutEvent = {
  eventId: string;
  sessionId: string;
  attributes: JsonRecord;
};

/** Normalize both PayMongo's Checkout webhook and standard event-envelope shapes. */
export function parsePaidCheckoutEvent(payload: unknown): PaidCheckoutEvent | null {
  const body = asRecord(payload);
  const data = asRecord(body["data"]);
  const envelopeAttributes = asRecord(data["attributes"]);
  const wrappedEvent = data["type"] === "event";
  // PayMongo's current Hosted Checkout webhook uses a compact `data.type`
  // envelope, while older event deliveries use `data.type === "event"` and
  // place the event name under `data.attributes.type`.
  const eventType = String(wrappedEvent ? envelopeAttributes["type"] : data["type"] || "");
  if (eventType !== "checkout_session.payment.paid") return null;

  const session = asRecord(wrappedEvent ? envelopeAttributes["data"] : data["data"]);
  const attributes = asRecord(session["attributes"]);
  if (!session["id"] || !Object.keys(attributes).length) return null;

  return {
    eventId: String((wrappedEvent ? data["id"] : body["id"] || data["id"]) || session["id"]),
    sessionId: String(session["id"]),
    attributes,
  };
}

/** Verify a paid checkout against the amount and currency on our server-created order. */
export function isPaidCheckoutAmount(attributes: JsonRecord, expectedAmount: number): boolean {
  const paymentIntent = asRecord(attributes["payment_intent"]);
  const intentAttributes = asRecord(paymentIntent["attributes"]);
  const paymentRecords = [
    ...(Array.isArray(attributes["payments"]) ? attributes["payments"] : []),
    ...(Array.isArray(intentAttributes["payments"]) ? intentAttributes["payments"] : []),
  ];

  const hasMatchingPaidPayment = paymentRecords.some((payment) => {
    const record = asRecord(payment);
    const paymentAttributes = asRecord(record["attributes"] ?? record);
    return (
      String(paymentAttributes["status"] || "").toLowerCase() === "paid" &&
      String(paymentAttributes["currency"] || "PHP").toUpperCase() === "PHP" &&
      Number(paymentAttributes["amount"] ?? paymentAttributes["net_amount"]) === expectedAmount
    );
  });
  if (hasMatchingPaidPayment) return true;

  return (
    String(intentAttributes["status"] || "").toLowerCase() === "succeeded" &&
    String(intentAttributes["currency"] || "PHP").toUpperCase() === "PHP" &&
    Number(intentAttributes["amount"]) === expectedAmount
  );
}
