import { PLAYFAB_API_BASE } from "@/lib/playfab/config";

type PlayFabResponse = {
  code?: number;
  errorCode?: number;
  errorMessage?: string;
  data?: {
    UserInfo?: { Username?: string };
    AccountInfo?: { Username?: string };
  };
};

async function request(path: string, body: Record<string, unknown>, secretKey: string) {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as PlayFabResponse;
  return { response, result };
}

export async function sendPlayFabRecoveryEmail(
  playFabId: string,
  email: string,
  secretKey: string,
) {
  const templateId = process.env["PLAYFAB_RECOVERY_EMAIL_TEMPLATE_ID"]?.trim();
  if (!templateId)
    throw new Error(
      "Server recovery is not configured: PLAYFAB_RECOVERY_EMAIL_TEMPLATE_ID is missing.",
    );

  const contact = await request(
    "/Server/AddOrUpdateContactEmail",
    {
      PlayFabId: playFabId,
      EmailAddress: email.trim().toLowerCase(),
    },
    secretKey,
  );
  if (!contact.response.ok || contact.result.code !== 200) {
    throw new Error(
      contact.result.errorMessage ?? "PlayFab could not register the account email for recovery.",
    );
  }

  const account = await request("/Server/GetUserAccountInfo", { PlayFabId: playFabId }, secretKey);
  if (!account.response.ok || account.result.code !== 200) {
    throw new Error(
      account.result.errorMessage ?? "PlayFab could not resolve the account for password recovery.",
    );
  }
  const username =
    account.result.data?.UserInfo?.Username ?? account.result.data?.AccountInfo?.Username;

  const sent = await request(
    "/Server/SendCustomAccountRecoveryEmail",
    {
      ...(typeof username === "string" && username
        ? { Username: username }
        : { Email: email.trim().toLowerCase() }),
      EmailTemplateId: templateId,
    },
    secretKey,
  );
  if (!sent.response.ok || sent.result.code !== 200) {
    switch (sent.result.errorCode) {
      case 1325:
        throw new Error(
          "This account has no PlayFab contact email. Sign in once so Crew On Set can register its recovery email, then try again.",
        );
      case 1341:
        throw new Error(
          "PlayFab email delivery is not configured. Install and configure the SMTP add-on in PlayFab Game Manager.",
        );
      case 1427:
        throw new Error(
          "PlayFab rejected this recipient email address. Check the address and try again.",
        );
      default:
        throw new Error(sent.result.errorMessage ?? "PlayFab could not send the recovery email.");
    }
  }
}
