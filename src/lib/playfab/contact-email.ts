import { PLAYFAB_API_BASE } from "@/lib/playfab/config";

/**
 * PlayFab sends account-recovery mail to the contact email, not merely the
 * login email. Keep the two aligned when a real account signs in or is made.
 */
export async function syncPlayFabContactEmail(sessionTicket: string, email: string) {
  const response = await fetch(`${PLAYFAB_API_BASE}/Client/AddOrUpdateContactEmail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Authorization": sessionTicket,
    },
    body: JSON.stringify({ EmailAddress: email }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.code !== 200) {
    throw new Error(result.errorMessage ?? "PlayFab could not associate the contact email.");
  }
}