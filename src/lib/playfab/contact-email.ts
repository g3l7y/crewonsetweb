import { PLAYFAB_API_BASE } from "@/lib/playfab/config";

type ContactEmailOptions = {
  playFabId?: string;
  secretKey?: string;
};

function playFabError(result: any, fallback: string) {
  const code = result?.errorCode ? ` (PlayFab error ${result.errorCode})` : "";
  return new Error(`${result?.errorMessage ?? fallback}${code}`);
}

/**
 * Read the account's PlayFab contact email. This is intentionally separate
 * from the login email: PlayFab sends recovery mail to the contact email.
 */
export async function getPlayFabContactEmail(sessionTicket: string): Promise<string | null> {
  const response = await fetch(`${PLAYFAB_API_BASE}/Client/GetPlayerProfile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Authorization": sessionTicket },
    body: JSON.stringify({ ProfileConstraints: { ShowContactEmailAddresses: true } }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.code !== 200) throw playFabError(result, "PlayFab could not read the contact email.");

  const addresses = result.data?.PlayerProfile?.ContactEmailAddresses;
  if (!Array.isArray(addresses)) return null;
  const contact = addresses.find((entry: any) => typeof entry?.EmailAddress === "string" && entry.EmailAddress.trim());
  return typeof contact?.EmailAddress === "string" ? contact.EmailAddress.trim().toLowerCase() : null;
}

/**
 * PlayFab sends account-recovery mail to the contact email, not merely the
 * login email. Keep the two aligned when a real account signs in or is made.
 *
 * When a title secret and PlayFab ID are available, use the server endpoint.
 * It is the authoritative form and avoids silently treating a contact-email
 * update as a client-only profile change.
 */
export async function syncPlayFabContactEmail(sessionTicket: string, email: string, options: ContactEmailOptions = {}) {
  const useServerEndpoint = Boolean(options.playFabId && options.secretKey);
  const response = await fetch(`${PLAYFAB_API_BASE}/${useServerEndpoint ? "Server" : "Client"}/AddOrUpdateContactEmail`, {
    method: "POST",
    headers: useServerEndpoint
      ? { "Content-Type": "application/json", "X-SecretKey": options.secretKey as string }
      : { "Content-Type": "application/json", "X-Authorization": sessionTicket },
    body: JSON.stringify(useServerEndpoint
      ? { PlayFabId: options.playFabId, EmailAddress: email }
      : { EmailAddress: email }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.code !== 200) throw playFabError(result, "PlayFab could not associate the contact email.");
}
