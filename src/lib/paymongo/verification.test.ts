import assert from "node:assert/strict";
import test from "node:test";
import { isPaidCheckoutAmount } from "./verification.ts";

test("accepts a paid checkout when the charged amount matches the order", () => {
  assert.equal(
    isPaidCheckoutAmount(
      {
        payments: [{ attributes: { amount: 49900, currency: "PHP", status: "paid" } }],
      },
      49900,
    ),
    true,
  );
});

test("accepts a paid checkout when PayMongo reports the order amount as net_amount", () => {
  assert.equal(
    isPaidCheckoutAmount(
      {
        payments: [
          {
            attributes: {
              amount: 50660,
              net_amount: 49900,
              currency: "PHP",
              status: "paid",
            },
          },
        ],
      },
      49900,
    ),
    true,
  );
});

test("rejects unpaid, wrong-currency, and amount-mismatched checkouts", () => {
  assert.equal(
    isPaidCheckoutAmount(
      {
        payments: [{ attributes: { amount: 49900, currency: "PHP", status: "pending" } }],
      },
      49900,
    ),
    false,
  );
  assert.equal(
    isPaidCheckoutAmount(
      {
        payments: [{ attributes: { amount: 49900, currency: "USD", status: "paid" } }],
      },
      49900,
    ),
    false,
  );
  assert.equal(
    isPaidCheckoutAmount(
      {
        payments: [
          {
            attributes: {
              amount: 50660,
              net_amount: 49000,
              currency: "PHP",
              status: "paid",
            },
          },
        ],
      },
      49900,
    ),
    false,
  );
});

test("continues to support the paid payment-intent response shape", () => {
  assert.equal(
    isPaidCheckoutAmount(
      {
        payment_intent: {
          attributes: { amount: 49900, currency: "PHP", status: "succeeded" },
        },
      },
      49900,
    ),
    true,
  );
});
