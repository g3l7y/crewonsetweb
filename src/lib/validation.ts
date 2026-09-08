export const EMAIL_ERROR = "Please enter a valid email address.";

const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

export function isValidEmail(value: string) {
  const normalized = value.trim();
  if (normalized !== value || normalized.includes("..")) return false;
  const [localPart, domain] = normalized.split("@");
  return Boolean(localPart && domain && emailPattern.test(normalized));
}

export const USERNAME_ERROR = "Username must be 3–20 characters, start with a letter, and contain only letters, numbers, or underscores.";
export const PASSWORD_ERROR = "Password must be 8–64 characters with uppercase, lowercase, a number, a special character, and no spaces.";

const usernamePattern = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,64}$/;

export function isValidUsername(value: string) {
  return usernamePattern.test(value);
}

export function isValidPassword(value: string) {
  return passwordPattern.test(value);
}

export function validateUsername(value: string) {
  return isValidUsername(value) ? "" : USERNAME_ERROR;
}

export function validatePassword(value: string) {
  return isValidPassword(value) ? "" : PASSWORD_ERROR;
}

export function sortNewestFirst<T>(items: T[], getTimestamp: (item: T) => string | number | undefined) {
  return [...items].sort((a, b) => {
    const aTime = new Date(getTimestamp(a) ?? 0).getTime();
    const bTime = new Date(getTimestamp(b) ?? 0).getTime();
    return bTime - aTime;
  });
}

export function isExpired(expiresAt: string | undefined, now = Date.now()) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= now);
}
