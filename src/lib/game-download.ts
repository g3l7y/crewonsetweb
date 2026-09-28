/** Turn common Google Drive share URLs into the file download endpoint. */
export function getInstallerDownloadUrl(input: string | undefined): string {
  const value = input?.trim();
  if (!value) return "#";
  try {
    const url = new URL(value);
    if (url.hostname === "drive.google.com") {
      const id = url.searchParams.get("id") ?? url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
      if (id) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
    }
    return url.toString();
  } catch {
    return "#";
  }
}
