import { randomBytes } from "node:crypto";
import type { AccountRole } from "./email-login-identities";

type PendingMockEmailChange = {
  sessionTicket: string;
  role: AccountRole;
  expiresAt: number;
};

const pendingChanges = new Map<string, PendingMockEmailChange>();

export function createMockEmailChange(sessionTicket: string, role: AccountRole) {
  const token = randomBytes(32).toString("base64url");
  pendingChanges.set(token, { sessionTicket, role, expiresAt: Date.now() + 30 * 60 * 1000 });
  return token;
}

export function hasMockEmailChange(token: string, sessionTicket: string, role: AccountRole) {
  const pending = pendingChanges.get(token);
  return Boolean(
    pending &&
    pending.sessionTicket === sessionTicket &&
    pending.role === role &&
    pending.expiresAt > Date.now(),
  );
}

export function consumeMockEmailChange(token: string, sessionTicket: string, role: AccountRole) {
  if (!hasMockEmailChange(token, sessionTicket, role)) return false;
  pendingChanges.delete(token);
  return true;
}
