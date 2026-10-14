import { PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from "@/lib/playfab/config";
import { neon } from "@neondatabase/serverless";

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "pdf"]);

type StoredSubmissionAttachment = {
  fileName: string;
  contentType: string;
  contentsBase64: string;
};

let attachmentSchemaPromise: Promise<void> | null = null;

function getAttachmentSql() {
  const databaseUrl = process.env["DATABASE_URL"]?.trim();
  return databaseUrl ? neon(databaseUrl) : null;
}

async function ensureAttachmentSchema(sql: NonNullable<ReturnType<typeof getAttachmentSql>>) {
  if (!attachmentSchemaPromise) {
    attachmentSchemaPromise = sql`
      CREATE TABLE IF NOT EXISTS submission_attachments (
        file_name TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        contents_base64 TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => undefined).catch((error) => {
      attachmentSchemaPromise = null;
      throw error;
    });
  }
  await attachmentSchemaPromise;
}

function getAttachmentContentType(file: File): string {
  const extension = getExtension(file);
  if (extension === "pdf") return "application/pdf";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return file.type || "application/octet-stream";
}

async function storeSubmissionAttachment(
  recordId: string,
  fileName: string,
  file: File,
): Promise<void> {
  const sql = getAttachmentSql();
  if (!sql) throw new Error("Attachment storage is not configured. Please contact the site administrator.");
  await ensureAttachmentSchema(sql);
  const contentsBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  await sql`
    INSERT INTO submission_attachments (file_name, record_id, content_type, contents_base64)
    VALUES (${fileName}, ${recordId}, ${getAttachmentContentType(file)}, ${contentsBase64})
    ON CONFLICT (file_name) DO UPDATE SET
      record_id = EXCLUDED.record_id,
      content_type = EXCLUDED.content_type,
      contents_base64 = EXCLUDED.contents_base64,
      created_at = NOW()
  `;
}

export async function getStoredSubmissionAttachment(fileName: string): Promise<StoredSubmissionAttachment | null> {
  const sql = getAttachmentSql();
  if (!sql) return null;
  await ensureAttachmentSchema(sql);
  const rows = await sql`
    SELECT file_name, content_type, contents_base64
    FROM submission_attachments
    WHERE file_name = ${fileName}
    LIMIT 1
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    fileName: String(row["file_name"]),
    contentType: String(row["content_type"]),
    contentsBase64: String(row["contents_base64"]),
  };
}

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
): Promise<{ fileName: string; attachmentUrl: string }> {
  const validationError = validateSubmissionAttachment(file);
  if (validationError) throw new Error(validationError);

  const fileName = storageFileName(recordId, file);
  if (!getAttachmentSql()) {
    throw new Error("DATABASE_URL must be configured to store attachments without the PlayFab title file limit.");
  }
  await storeSubmissionAttachment(recordId, fileName, file);
  return {
    fileName,
    attachmentUrl: `/api/admin/submission-attachments?storage=database&file=${encodeURIComponent(fileName)}`,
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

export async function deleteSubmissionAttachments(recordId: string, secretKey: string): Promise<void> {
  const safeId = recordId.replace(/[^a-z0-9_-]/gi, '_');
  const sql = getAttachmentSql();
  if (sql) {
    await ensureAttachmentSchema(sql);
    await sql`DELETE FROM submission_attachments WHERE record_id = ${recordId}`;
  }
  const entityContext = await getTitleEntityContext(secretKey);
  const result = await playFabFileRequest<{
    Metadata?: PlayFabFileMetadata[] | Record<string, PlayFabFileMetadata>;
  }>('/File/GetFiles', entityContext.token, {}, entityContext.entity);
  const metadata = result.Metadata;
  const files = Array.isArray(metadata) ? metadata : Object.values(metadata || {});
  const fileNames = files
    .map((file) => file.FileName)
    .filter((fileName) => new RegExp(`^submission_${safeId}_[a-f0-9]{32}\\.(jpg|jpeg|png|webp|gif|pdf)$`, 'i').test(fileName));
  if (fileNames.length) {
    await playFabFileRequest('/File/DeleteFiles', entityContext.token, { FileNames: fileNames }, entityContext.entity);
  }
}
