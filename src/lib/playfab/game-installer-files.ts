import { PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from "@/lib/playfab/config";
import { getWebsiteValue, setWebsiteValue } from "@/lib/playfab/websiteData";

type EntityKey = { Type: string; Id: string };
type FileMetadata = { FileName: string; DownloadUrl: string; Size?: number };
type EntityContext = { token: string; entity: EntityKey };

const GAME_INSTALLER_PATTERN = /^game_installer_[a-f0-9]{32}\.exe$/i;
const INSTALLER_GROUP_KEY = "website_game_installer_group";
const INSTALLER_GROUP_NAME = "CrewOnSetInstallerStorage";

async function getTitleContext(secretKey: string): Promise<EntityContext> {
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

/**
 * Keep game installers in their own PlayFab group profile. Title files share a
 * 10-file limit with player submissions, so using the title profile eventually
 * prevents admins from publishing builds.
 */
async function getInstallerContext(
  secretKey: string,
  options: { createIfMissing?: boolean } = {},
): Promise<EntityContext | null> {
  const titleContext = await getTitleContext(secretKey);
  const storedGroup = await getWebsiteValue<unknown>(INSTALLER_GROUP_KEY, secretKey);
  if (
    storedGroup &&
    typeof storedGroup === "object" &&
    "Id" in storedGroup &&
    typeof storedGroup.Id === "string"
  ) {
    return { token: titleContext.token, entity: { Type: "group", Id: storedGroup.Id } };
  }
  if (options.createIfMissing === false) return null;

  const group = await fileRequest<{ Group?: EntityKey }>(
    "/Group/CreateGroup",
    titleContext.token,
    titleContext.entity,
    { GroupName: INSTALLER_GROUP_NAME },
  );
  if (!group.Group?.Id) throw new Error("PlayFab did not return the installer storage group.");
  const saved = await setWebsiteValue(INSTALLER_GROUP_KEY, group.Group, secretKey);
  if (!saved) throw new Error("The installer storage group could not be saved.");
  return { token: titleContext.token, entity: group.Group };
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
  const context = await getInstallerContext(secretKey);
  if (!context) throw new Error("Installer storage is unavailable.");
  await pruneOldInstallers(context, await getActiveInstallerFileName(secretKey));
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
  const context = await getInstallerContext(secretKey);
  if (!context) throw new Error("Installer storage is unavailable.");
  await fileRequest("/File/FinalizeFileUploads", context.token, context.entity, {
    FileNames: [fileName],
    ProfileVersion: profileVersion,
  });
}

export async function getGameInstallerMetadata(fileName: string, secretKey: string) {
  if (!GAME_INSTALLER_PATTERN.test(fileName)) return null;
  const context = await getInstallerContext(secretKey, { createIfMissing: false });
  if (!context) return null;
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

async function getActiveInstallerFileName(secretKey: string): Promise<string | null> {
  const build = await getWebsiteValue<unknown>("website_admin_game_build", secretKey);
  const current = Array.isArray(build) ? build[0] : build;
  if (!current || typeof current !== "object" || !("downloadUrl" in current)) return null;
  const downloadUrl = current.downloadUrl;
  if (typeof downloadUrl !== "string") return null;
  try {
    const fileName = new URL(downloadUrl, "https://local.invalid").searchParams.get("file");
    return fileName && GAME_INSTALLER_PATTERN.test(fileName) ? fileName : null;
  } catch {
    return null;
  }
}

async function pruneOldInstallers(context: EntityContext, activeFileName: string | null) {
  const result = await fileRequest<{
    Metadata?: FileMetadata[] | Record<string, FileMetadata>;
  }>("/File/GetFiles", context.token, context.entity, {});
  const metadata = result.Metadata;
  const files = Array.isArray(metadata) ? metadata : Object.values(metadata ?? {});
  const staleFiles = files
    .map((file) => file.FileName)
    .filter((fileName) => GAME_INSTALLER_PATTERN.test(fileName) && fileName !== activeFileName);
  if (staleFiles.length) {
    await fileRequest("/File/DeleteFiles", context.token, context.entity, {
      FileNames: staleFiles,
    });
  }
}
