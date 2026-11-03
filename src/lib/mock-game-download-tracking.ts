const MOCK_DOWNLOAD_COUNT_KEY = "crew-on-set-mock-download-count";
const MOCK_DOWNLOAD_EVENT = "cos:mock-download-count-updated";

export function getMockGameDownloadCount(): number {
  if (typeof window === "undefined") return 0;
  const count = Number(window.localStorage.getItem(MOCK_DOWNLOAD_COUNT_KEY) || 0);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

export function recordMockGameDownload(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_DOWNLOAD_COUNT_KEY, String(getMockGameDownloadCount() + 1));
  window.dispatchEvent(new Event(MOCK_DOWNLOAD_EVENT));
}

export const MOCK_DOWNLOAD_COUNT_EVENT = MOCK_DOWNLOAD_EVENT;
