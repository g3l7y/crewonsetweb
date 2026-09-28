import type { MockAccount } from "@/lib/playfab/mock-accounts";

type MockRecoveryRecord = {
  email: string;
  scope: "player" | "admin";
  sessionTicket: string;
  code: string;
  token?: string;
  expiresAt: number;
  attempts: number;
};

const records = new Map<string, MockRecoveryRecord>();

function key(email: string, scope: "player" | "admin") {
  return `${scope}:${email.trim().toLowerCase()}`;
}

export function createMockRecovery(account: MockAccount, scope: "player" | "admin") {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const record: MockRecoveryRecord = {
    email: account.email,
    scope,
    sessionTicket: account.sessionTicket,
    code,
    expiresAt: Date.now() + 15 * 60 * 1000,
    attempts: 0,
  };
  records.set(key(account.email, scope), record);
  return record;
}

export function verifyMockRecovery(email: string, scope: "player" | "admin", code: string) {
  const record = records.get(key(email, scope));
  if (!record || record.expiresAt < Date.now() || record.attempts >= 5) return null;
  record.attempts += 1;
  if (record.code !== code.trim()) return null;
  record.token = `mock-recovery-${crypto.randomUUID()}`;
  return record.token;
}

export function consumeMockRecovery(token: string) {
  for (const [recordKey, record] of records.entries()) {
    if (record.token !== token || record.expiresAt < Date.now()) continue;
    records.delete(recordKey);
    return record;
  }
  return null;
}