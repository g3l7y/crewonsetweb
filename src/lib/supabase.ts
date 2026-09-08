import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export const ATTACHMENT_BUCKET = "cos-attachments";

export function getSupabaseClient() {
  if (client) return client;
  const url =
    import.meta.env.VITE_SUPABASE_URL ??
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ??
    import.meta.env.SUPABASE_URL;
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    import.meta.env.SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    const missing = !url ? "Supabase URL missing" : "Supabase anon key missing";
    throw new Error(missing);
  }
  try {
    client = createClient(url, key);
    return client;
  } catch {
    throw new Error("Supabase client initialization failed");
  }
}

export async function uploadAttachment(file: File, folder: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}
