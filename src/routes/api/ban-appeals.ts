import { createFileRoute } from "@tanstack/react-router";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { sendBanAppealVerificationCode } from "@/lib/account-email";
import { PLAYFAB_API_BASE } from "@/lib/playfab/config";
import { resolvePlayFabLogin } from "@/lib/playfab/credential-verification";
import { appendWebsiteRecord, deleteWebsiteRecords, getWebsiteRecords, setWebsiteRecords, WEBSITE_DATA_KEYS } from "@/lib/playfab/websiteData";
import type { PlayerReport } from "@/lib/playfab/types";

type BanInfo = { Active?: boolean; BanId?: string; Created?: string; Expires?: string };
type Verification = {
  id: string;
  playFabId: string;
  username: string;
  email: string;
  banId: string;
  banStartsAt: string;
  banEndsAt: string | null;
  codeHash: string;
  createdAt: string;
  expiresAt: string;
};

function getSecretKey() {
  return process.env["PLAYFAB_SECRET_KEY"]?.trim() || "";
}

async function serverRequest<T>(path: string, body: Record<string, unknown>, secretKey: string): Promise<T> {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({})) as { code?: number; errorMessage?: string; data?: T };
  if (!response.ok || result.code !== 200 || !result.data) throw new Error(result.errorMessage || "PlayFab request failed.");
  return result.data;
}

async function activeBan(playFabId: string, secretKey: string) {
  const data = await serverRequest<{ BanData?: BanInfo[] }>("/Server/GetUserBans", { PlayFabId: playFabId }, secretKey);
  return (data.BanData ?? []).find((ban) => {
    if (!ban.Active) return false;
    if (!ban.Expires) return true;
    const expires = Date.parse(ban.Expires);
    return Number.isNaN(expires) || expires > Date.now();
  }) ?? null;
}

function hashCode(playFabId: string, code: string, secretKey: string) {
  return createHash("sha256").update(`${playFabId}:${code}:${secretKey}`).digest("hex");
}

function matchesHash(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function genericRequestResponse() {
  return Response.json({ success: true, message: "If the account is eligible for an appeal, a verification code has been sent to its registered email." });
}

export const Route = createFileRoute("/api/ban-appeals")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretKey = getSecretKey();
        if (!secretKey) return Response.json({ error: "Ban appeals are temporarily unavailable." }, { status: 503 });
        try {
          const body = await request.json() as { action?: string; identifier?: string; code?: string; reason?: string; newInformation?: boolean };
          const identifier = body.identifier?.trim() ?? "";
          if (!identifier || identifier.length > 254) return Response.json({ error: "Enter the username or email for the banned account." }, { status: 400 });
          const login = await resolvePlayFabLogin(identifier);
          if (!login) return genericRequestResponse();
          const email = login.profileMetadata.email || login.account.email || "";
          if (!email) return genericRequestResponse();
          const ban = await activeBan(login.account.playFabId, secretKey);
          if (!ban?.BanId) return genericRequestResponse();

          const collection = WEBSITE_DATA_KEYS.banAppealVerifications;
          const verifications = await getWebsiteRecords<Verification>(collection, secretKey);
          const now = Date.now();
          if (body.action === "request-code") {
            const prior = verifications.find((item) => item.id === login.account.playFabId);
            if (prior && prior.banId === ban.BanId && now - Date.parse(prior.createdAt) < 60_000) return genericRequestResponse();
            const code = String(randomInt(100_000, 1_000_000));
            const verification: Verification = {
              id: login.account.playFabId,
              playFabId: login.account.playFabId,
              username: login.profileMetadata.username || login.account.displayName || login.account.username || identifier,
              email,
              banId: ban.BanId,
              banStartsAt: ban.Created || new Date().toISOString(),
              banEndsAt: ban.Expires || null,
              codeHash: hashCode(login.account.playFabId, code, secretKey),
              createdAt: new Date(now).toISOString(),
              expiresAt: new Date(now + 10 * 60_000).toISOString(),
            };
            if (!await setWebsiteRecords(collection, [verification, ...verifications.filter((item) => item.id !== verification.id)], secretKey)) {
              return Response.json({ error: "We could not start the appeal verification. Please try again." }, { status: 500 });
            }
            try {
              await sendBanAppealVerificationCode(email, code);
            } catch (error) {
              await deleteWebsiteRecords<Verification>(collection, [verification.id], secretKey);
              console.error("[Ban Appeals] Verification email failed:", error);
              return Response.json({ error: "We could not send a verification email. Please contact crewonsetgame@gmail.com for help." }, { status: 503 });
            }
            return genericRequestResponse();
          }

          if (body.action !== "submit") return Response.json({ error: "Choose a valid appeal action." }, { status: 400 });
          const reason = body.reason?.trim() ?? "";
          if (reason.length < 20 || reason.length > 2_000) return Response.json({ error: "Explain why you are appealing in 20 to 2,000 characters." }, { status: 400 });
          const verification = verifications.find((item) => item.id === login.account.playFabId);
          if (!verification || Date.parse(verification.expiresAt) <= now || verification.banId !== ban.BanId ||
            typeof body.code !== "string" || !matchesHash(verification.codeHash, hashCode(login.account.playFabId, body.code.trim(), secretKey))) {
            return Response.json({ error: "The code is incorrect or expired. Request a new code and try again." }, { status: 400 });
          }

          const appeals = await getWebsiteRecords<PlayerReport & { banAppeal?: boolean; banId?: string; appealStatus?: string }>(WEBSITE_DATA_KEYS.playerReports, secretKey);
          const sameBan = appeals.filter((item) => item.banAppeal && item.reporterId === login.account.playFabId && item.banId === ban.BanId);
          if (sameBan.some((item) => item.appealStatus === "Pending")) {
            return Response.json({ error: "You already have an appeal waiting for review." }, { status: 409 });
          }
          const previousDenials = sameBan.filter((item) => item.appealStatus === "Denied");
          if (previousDenials.length && (!body.newInformation || previousDenials.some((item) => item.description.trim() === reason))) {
            return Response.json({ error: "A previous appeal was denied. A new appeal must include new information." }, { status: 409 });
          }

          const appeal: PlayerReport & Record<string, unknown> = {
            id: `BA-${Date.now()}-${randomInt(1000, 10_000)}`,
            reporterId: login.account.playFabId,
            reporterName: verification.username,
            reportedUsername: verification.username,
            reportType: "Ban Appeal",
            description: reason,
            submittedAt: new Date().toISOString(),
            status: "New",
            banAppeal: true,
            appealStatus: "Pending",
            banId: ban.BanId,
            banStartsAt: ban.Created || verification.banStartsAt,
            banEndsAt: ban.Expires || null,
            verifiedEmail: email,
            newInformation: previousDenials.length > 0,
          };
          if (!await appendWebsiteRecord(WEBSITE_DATA_KEYS.playerReports, appeal, secretKey)) {
            return Response.json({ error: "We could not save your appeal. Please try again." }, { status: 500 });
          }
          await deleteWebsiteRecords<Verification>(collection, [verification.id], secretKey);
          return Response.json({ success: true, message: "Your appeal was sent to the admin team for review." }, { status: 201 });
        } catch (error) {
          console.error("[API] Ban appeal error:", error);
          return Response.json({ error: "We could not complete the appeal request. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
