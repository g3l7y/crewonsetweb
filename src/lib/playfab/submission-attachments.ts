import { PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from "@/lib/playfab/config";

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "pdf"]);

type PlayFabEntityKey = {
  Type: string;
  Id: string;
};

type PlayFabFileMetadata = {
  FileName: string;
  DownloadUrl: string;
  Size?: number;
};

type ParsedSubmissionRequest = {
  fields: Record<string, string>;
  attachment?: File;
};

function isFile(value: FormDataEntryValue | undefined): value is File {
  return Boolean(value && typeof value !== "string" && typeof value.arrayBuffer === "function");
}

export async function parseSubmissionRequest(request: Request): Promise<ParsedSubmissionRequest> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    const body = (await request.json()) as Record<string, unknown>;
    return {
      fields: Object.fromEntries(
        Object.entries(body).map(([key, value]) => [key, value == null ? "" : String(value)]),
      ),
    };
  }

  const form = await request.formData();
  const fields: Record<string, string> = {};
  let attachment: File | undefined;

  for (const [key, value] of form.entries()) {
    if (key === "attachment" && isFile(value)) {
      attachment = value;
      continue;
    }
    if (typeof value === "string") fields[key] = value;
  }

  return { fields, ...(attachment ? { attachment } : {}) };
}

function getExtension(file: File): string {
  const fromName = file.name.toLowerCase().split(".").pop() || "";
  if (ALLOWED_EXTENSIONS.has(fromName)) return fromName;
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "bin";
}

export function validateSubmissionAttachment(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_BYTES) return "Attachments must be 5 MB or smaller.";
  const extension = getExtension(file);
  const image = file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(extension);
  const pdf = file.type === "application/pdf" || extension === "pdf";
  if (!ALLOWED_EXTENSIONS.has(extension) || (!image && !pdf)) {
    return "Only image or PDF files are allowed.";
  }
  return null;
}

async function getTitleEntityContext(
  secretKey: string,
): Promise<{ token: string; entity: PlayFabEntityKey }> {
  const response = await fetch(`${PLAYFAB_API_BASE}/Authentication/GetEntityToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SecretKey": secretKey,
    },
    body: JSON.stringify({}),
  });
  const result = await response.json();
  if (!response.ok || result.code !== 200 || !result.data?.EntityToken) {
    throw new Error(result.errorMessage || "Could not authenticate the PlayFab title entity.");
  }

  return {
    token: result.data.EntityToken as string,
    entity: result.data.Entity || { Type: "title", Id: PLAYFAB_TITLE_ID },
  };
}

async function playFabFileRequest<T>(
  path: string,
  entityToken: string,
  body: Record<string, unknown>,
  entity: PlayFabEntityKey,
): Promise<T> {
  const response = await fetch(`${PLAYFAB_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-EntityToken": entityToken,
    },
    body: JSON.stringify({ ...body, Entity: entity }),
  });
  const result = await response.json();
  if (!response.ok || result.code !== 200) {
    throw new Error(result.errorMessage || `PlayFab file request failed: ${path}`);
  }
  return result.data as T;
}

function storageFileName(recordId: string, file: File): string {
  const safeId = recordId.replace(/[^a-z0-9_-]/gi, "_");
  const randomPart = crypto.randomUUID().replace(/-/g, "");
  return `submission_${safeId}_${randomPart}.${getExtension(file)}`;
}

export async function uploadSubmissionAttachment(
  recordId: string,
  file: File,
  secretKey: string,
): Promise<{ fileName: string; attachmentUrl: string }> {
  const validationError = validateSubmissionAttachment(file);
  if (validationError) throw new Error(validationError);

  const fileName = storageFileName(recordId, file);
  const entityContext = await getTitleEntityContext(secretKey);
  const initiated = await playFabFileRequest<{
    ProfileVersion: number;
    UploadDetails: Array<{ FileName: string; UploadUrl: string }>;
  }>(
    "/File/InitiateFileUploads",
    entityContext.token,
    { FileNames: [fileName] },
    entityContext.entity,
  );
  const upload = initiated.UploadDetails?.[0];
  if (!upload?.UploadUrl) throw new Error("PlayFab did not return an attachment upload URL.");

  const uploaded = await fetch(upload.UploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: await file.arrayBuffer(),
  });
  if (!uploaded.ok) throw new Error("The attachment could not be uploaded to PlayFab.");

  await playFabFileRequest(
    "/File/FinalizeFileUploads",
    entityContext.token,
    {
      FileNames: [fileName],
      ProfileVersion: initiated.ProfileVersion,
    },
    entityContext.entity,
  );

  return {
    fileName,
    attachmentUrl: `/api/admin/submission-attachments?file=${encodeURIComponent(fileName)}`,
  };
}

export async function getSubmissionAttachment(
  fileName: string,
  secretKey: string,
): Promise<PlayFabFileMetadata | null> {
  if (!/^[a-z0-9_.()-]+$/i.test(fileName)) return null;
  const entityContext = await getTitleEntityContext(secretKey);
  const result = await playFabFileRequest<{
    Metadata?: PlayFabFileMetadata[] | Record<string, PlayFabFileMetadata>;
  }>(
    "/File/GetFiles",
    entityContext.token,
    {},
    entityContext.entity,
  );
  const metadata = result.Metadata;
  if (!metadata) return null;

  // PlayFab has returned this collection as both an array and a filename-keyed
  // object across API versions. Support both shapes so existing uploads remain
  // viewable instead of failing while calling Array.prototype.find.
  if (Array.isArray(metadata)) {
    return metadata.find((file) => file.FileName === fileName) ?? null;
  }

  return metadata[fileName] ?? Object.values(metadata).find((file) => file.FileName === fileName) ?? null;
}
