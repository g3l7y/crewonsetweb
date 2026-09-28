/** Turn common Google Drive share URLs into the file download endpoint. */
export function getInstallerDownloadUrl(input: string | undefined): string {
  const value = input?.trim();
  if (!value) return "#";
  if (value.startsWith("mock-installer://") || value.startsWith("/api/game-installer?"))
    return value;
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

const MOCK_INSTALLER_DB = "crew-on-set-mock-installer";
const MOCK_INSTALLER_STORE = "files";

function openMockInstallerDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MOCK_INSTALLER_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(MOCK_INSTALLER_STORE)) {
        request.result.createObjectStore(MOCK_INSTALLER_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Mock installer storage is unavailable."));
  });
}

export async function saveMockInstaller(file: File): Promise<void> {
  const database = await openMockInstallerDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(MOCK_INSTALLER_STORE, "readwrite");
    transaction.objectStore(MOCK_INSTALLER_STORE).put(file, "current");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error("Could not save the mock installer."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("Could not save the mock installer."));
  }).finally(() => database.close());
}

export async function downloadMockInstaller(fileName: string): Promise<void> {
  const database = await openMockInstallerDb();
  const file = await new Promise<File | undefined>((resolve, reject) => {
    const request = database
      .transaction(MOCK_INSTALLER_STORE, "readonly")
      .objectStore(MOCK_INSTALLER_STORE)
      .get("current");
    request.onsuccess = () => resolve(request.result as File | undefined);
    request.onerror = () =>
      reject(request.error || new Error("Could not load the mock installer."));
  }).finally(() => database.close());
  if (!file) throw new Error("Upload an installer from Admin → Game & Updates first.");

  const objectUrl = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || file.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
