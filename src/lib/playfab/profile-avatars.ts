import { PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from "@/lib/playfab/config";

type PlayFabEntityKey = { Type: string; Id: string };
type FileMetadata = { FileName: string; DownloadUrl: string; Size?: number };

type PlayFabResult<T> = {
  code?: number;
  errorMessage?: string;
  data?: T;
};

async function getTitleEntityContext(secretKey: string) {
  const response = await fetch(`${PLAYFAB_API_BASE}/Authentication/GetEntityToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
    body: JSON.stringify({}),
  });
  const result = await response.json() as PlayFabResult<{ EntityToken?: string; Entity?: PlayFabEntityKey }>;
  if (!response.ok || result.code !== 200 || !result.data?.EntityToken) {
    throw new Error(result.errorMessage || "PlayFab file storage is unavailable.");
  }
  return {
    token: result.data.EntityToken,
    entity: result.data.Entity || { Type: "title", Id: PLAYFAB_TITLE_ID },
  };
}

async function playFabFileRequest<T>(
  path: string,
  token: string,
  entity: PlayFabEntityKey,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-EntityToken": token },
    body: JSON.stringify({ ...body, Entity: entity }),
  });
  const result = await response.json() as PlayFabResult<T>;
  if (!response.ok || result.code !== 200 || result.data === undefined) {
    throw new Error(result.errorMessage || `PlayFab file request failed: ${path}`);
  }
  return result.data;
}

function avatarExtension(file: File): "jpg" | "png" {
  return file.type === "image/png" ? "png" : "jpg";
}

function getFileMetadata(metadata: FileMetadata[] | Record<string, FileMetadata> | undefined, fileName: string) {
  if (!metadata) return null;
  return Array.isArray(metadata)
    ? metadata.find((file) => file.FileName === fileName) ?? null
    : metadata[fileName] ?? Object.values(metadata).find((file) => file.FileName === fileName) ?? null;
}

export async function uploadProfileAvatar(
  playFabId: string,
  file: File,
  secretKey: string,
): Promise<string> {
  const context = await getTitleEntityContext(secretKey);
  const safePlayerId = playFabId.replace(/[^a-z0-9_-]/gi, "_");
  const fileName = `profile_avatar_${safePlayerId}_${crypto.randomUUID().replace(/-/g, "")}.${avatarExtension(file)}`;
  const initiated = await playFabFileRequest<{
    ProfileVersion: number;
    UploadDetails?: Array<{ FileName: string; UploadUrl: string }>;
  }>("/File/InitiateFileUploads", context.token, context.entity, { FileNames: [fileName] });
  const upload = initiated.UploadDetails?.find((item) => item.FileName === fileName);
  if (!upload?.UploadUrl) throw new Error("PlayFab did not return an avatar upload URL.");

  const uploaded = await fetch(upload.UploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: await file.arrayBuffer(),
  });
  if (!uploaded.ok) throw new Error("The avatar image could not be uploaded to PlayFab.");

  await playFabFileRequest("/File/FinalizeFileUploads", context.token, context.entity, {
    FileNames: [fileName],
    ProfileVersion: initiated.ProfileVersion,
  });

  return fileName;
}

export async function getProfileAvatarFile(
  playFabId: string,
  fileName: string,
  secretKey: string,
): Promise<FileMetadata | null> {
  const safePlayerId = playFabId.replace(/[^a-z0-9_-]/gi, "_");
  if (!new RegExp(`^profile_avatar_${safePlayerId}_[a-f0-9]{32}\\.(jpg|png)$`, "i").test(fileName)) return null;
  const context = await getTitleEntityContext(secretKey);
  const result = await playFabFileRequest<{
    Metadata?: FileMetadata[] | Record<string, FileMetadata>;
  }>("/File/GetFiles", context.token, context.entity, {});
  return getFileMetadata(result.Metadata, fileName);
}
