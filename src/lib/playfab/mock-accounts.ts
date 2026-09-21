import { players } from "@/lib/admin-demo-data";

export type MockAccount = {
  playFabId: string;
  sessionTicket: string;
  role: "admin" | "player";
  username: string;
  displayName: string;
  email: string;
  password: string;
};

function accountKey(value: string) {
  return value.trim().toLowerCase();
}

const reservedDemoUsernames = new Set([
  "ADMIN",
  "CAMERA_PRO",
  ...players.map((player) => player.username.toUpperCase()),
]);

const mockAccounts = new Map<string, MockAccount>();

const demoAccounts: MockAccount[] = [
  {
    playFabId: "MOCK-ADMIN-001",
    sessionTicket: "mock-admin-ticket",
    role: "admin",
    username: "ADMIN",
    displayName: "ADMIN",
    email: "admin@crewonset.com",
    password: "admin",
  },
  {
    playFabId: "MOCK-PLAYER-001",
    sessionTicket: "mock-player-ticket",
    role: "player",
    username: "CAMERA_PRO",
    displayName: "CAMERA_PRO",
    email: "player@crewonset.com",
    password: "player",
  },
];

for (const account of demoAccounts) {
  mockAccounts.set(accountKey(account.username), account);
}

const mockLoginAliases: Record<string, string> = {
  admin: "admin@crewonset.com",
  player: "player@crewonset.com",
  "player@gmail.com": "player@crewonset.com",
};

export function findMockAccount(identifier: string) {
  const normalizedIdentifier = accountKey(identifier);
  const aliasedIdentifier = mockLoginAliases[normalizedIdentifier] ?? normalizedIdentifier;

  return (
    Array.from(mockAccounts.values()).find(
      (account) =>
        accountKey(account.username) === aliasedIdentifier ||
        accountKey(account.email) === aliasedIdentifier,
    ) ?? null
  );
}

export function isMockUsernameTaken(username: string) {
  const normalizedUsername = accountKey(username);

  return (
    reservedDemoUsernames.has(username.trim().toUpperCase()) ||
    Array.from(mockAccounts.values()).some(
      (account) => accountKey(account.username) === normalizedUsername,
    )
  );
}

export function updateMockAccountUsername(sessionTicket: string, username: string) {
  const account = Array.from(mockAccounts.values()).find(
    (candidate) => candidate.sessionTicket === sessionTicket,
  );
  if (!account) return { success: false as const, error: "Session expired. Please sign in again." };

  if (accountKey(account.username) !== accountKey(username) && isMockUsernameTaken(username)) {
    return { success: false as const, error: "That username is already in use. Please choose another." };
  }

  mockAccounts.delete(accountKey(account.username));
  account.username = username;
  account.displayName = username;
  mockAccounts.set(accountKey(username), account);
  return { success: true as const };
}

export function registerMockAccount(email: string, password: string, username: string) {
  if (isMockUsernameTaken(username)) return null;

  const suffix = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  const account: MockAccount = {
    playFabId: "MOCK-PLAYER-" + suffix,
    sessionTicket: "mock-player-ticket-" + suffix,
    role: "player",
    username,
    displayName: username,
    email,
    password,
  };

  mockAccounts.set(accountKey(username), account);
  return account;
}

export function updateMockAccountEmail(sessionTicket: string, email: string) {
  const account = getMockAccountBySessionTicket(sessionTicket);
  if (!account) return { success: false as const, error: "Session expired. Please sign in again." };
  const conflict = Array.from(mockAccounts.values()).some(
    (candidate) => candidate.sessionTicket !== sessionTicket && accountKey(candidate.email) === accountKey(email),
  );
  if (conflict) return { success: false as const, error: "That email is already in use. Please choose another." };
  account.email = email;
  return { success: true as const };
}

export function updateMockAccountPassword(sessionTicket: string, password: string) {
  const account = getMockAccountBySessionTicket(sessionTicket);
  if (!account) return { success: false as const, error: "Session expired. Please sign in again." };
  account.password = password;
  return { success: true as const };
}

export function getMockAccountBySessionTicket(sessionTicket: string) {
  return Array.from(mockAccounts.values()).find(
    (account) => account.sessionTicket === sessionTicket,
  ) ?? null;
}

export function getMockAccountByPlayFabId(playFabId: string) {
  return Array.from(mockAccounts.values()).find(
    (account) => account.playFabId === playFabId,
  ) ?? null;
}
