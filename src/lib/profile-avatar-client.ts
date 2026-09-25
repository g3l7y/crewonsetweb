export async function savePlayerAvatar(file?: File, reset = false): Promise<string> {
  const form = new FormData();
  if (file) form.set("avatar", file);
  if (reset) form.set("reset", "true");

  const response = await fetch("/api/auth/avatar", { method: "POST", body: form });
  const result = await response.json().catch(() => ({})) as { avatarUrl?: string; error?: string };
  if (!response.ok || !result.avatarUrl) {
    throw new Error(result.error || "The avatar could not be saved.");
  }
  return result.avatarUrl;
}

export function readImageAsDataUrl(file: File): Promise<string> {
  return createImageBitmap(file).then(async (bitmap) => {
    let compressed: Blob;
    try {
      const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The selected image could not be processed.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      compressed = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The selected image could not be compressed.")), "image/jpeg", 0.82);
      });
    } finally {
      bitmap.close();
    }

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("The selected image could not be loaded."));
      reader.onerror = () => reject(new Error("The selected image could not be loaded."));
      reader.readAsDataURL(compressed);
    });
  });
}
