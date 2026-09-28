import { PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from "@/lib/playfab/config";

type EntityKey = { Type: string; Id: string };
type FileMetadata = { FileName: string; DownloadUrl: string; Size?: number };

const GAME_INSTALLER_PATTERN = /^game_installer_[a-f0-9]{32}\.exe$/i;

async function getTitleContext(secretKey: string) {
  const response = await fetch(`${PLAYFAB_API_BASE}/Authentication/GetEntityToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
    body: JSON.stringify({}),
  });
  const result = (await response.json()) as {
    code?: number;
    errorMessage?: string;
    data?: { EntityToken?: string; Entity?: EntityKey };
  };
  if (!response.ok || result.code !== 200 || !result.data?.EntityToken) {
    throw new Error(result.errorMessage || "PlayFab installer storage is unavailable.");
  }
  return {
    token: result.data.EntityToken,
    entity: result.data.Entity || { Type: "title", Id: PLAYFAB_TITLE_ID },
  };
}

async function fileRequest<T>(
  endpoint: string,
  token: string,
  entity: EntityKey,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${PLAYFAB_API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-EntityToken": token },
    body: JSON.stringify({ ...body, Entity: entity }),
  });
  const result = (await response.json()) as {
    code?: number;
    errorMessage?: string;
    data?: T;
  };
  if (!response.ok || result.code !== 200 || result.data === undefined) {
    throw new Error(result.errorMessage || `PlayFab installer request failed: ${endpoint}`);
  }
  return result.data;
}

export async function initiateGameInstallerUpload(secretKey: string) {
  const fileName = `game_installer_${crypto.randomUUID().replace(/-/g, "")}.exe`;
  const context = await getTitleContext(secretKey);
  const result = await fileRequest<{
    ProfileVersion: number;
    UploadDetails?: Array<{ FileName: string; UploadUrl: string }>;
  }>("/File/InitiateFileUploads", context.token, context.entity, { FileNames: [fileName] });
  const upload = result.UploadDetails?.find((entry) => entry.FileName === fileName);
  if (!upload?.UploadUrl) throw new Error("PlayFab did not return an installer upload URL.");
  return { fileName, uploadUrl: upload.UploadUrl, profileVersion: result.ProfileVersion };
}

export async function finalizeGameInstallerUpload(
  fileName: string,
  profileVersion: number,
  secretKey: string,
) {
  if (!GAME_INSTALLER_PATTERN.test(fileName) || !Number.isInteger(profileVersion)) {
    throw new Error("Invalid installer upload details.");
  }
  const context = await getTitleContext(secretKey);
  await fileRequest("/File/FinalizeFileUploads", context.token, context.entity, {
    FileNames: [fileName],
    ProfileVersion: profileVersion,
  });
}

export async function getGameInstallerMetadata(fileName: string, secretKey: string) {
  if (!GAME_INSTALLER_PATTERN.test(fileName)) return null;
  const context = await getTitleContext(secretKey);
  const result = await fileRequest<{
    Metadata?: FileMetadata[] | Record<string, FileMetadata>;
  }>("/File/GetFiles", context.token, context.entity, {});
  const metadata = result.Metadata;
  if (!metadata) return null;
  return Array.isArray(metadata)
    ? (metadata.find((entry) => entry.FileName === fileName) ?? null)
    : (metadata[fileName] ??
        Object.values(metadata).find((entry) => entry.FileName === fileName) ??
        null);
}
