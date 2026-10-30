import { isMockMode } from "@/lib/playfab/config";
import { recordMockBrandUpdateEvent } from "@/lib/demo/store";

function message(text: string) {
  const dialog = document.createElement("dialog");
  dialog.className = "promotion-message";
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  const close = document.createElement("button");
  close.textContent = "Close";
  close.style.marginTop = "1rem";
  close.onclick = () => dialog.close();
  dialog.append(paragraph, close);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
}

export async function openPromotion(href: string, depth = 0): Promise<boolean> {
  const url = new URL(href, window.location.origin);
  const match = url.pathname.match(/^\/api\/brand-updates\/([^/]+)\/click$/);
  if (!match && url.pathname !== "/api/brand-promotions/click") return false;
  if (depth > 3) { message("This promotion link is unavailable."); return true; }
  try {
    let destination: string | undefined;
    if (isMockMode() && match) {
      destination = recordMockBrandUpdateEvent(decodeURIComponent(match[1]!), "click");
      if (!destination) { message("This brand promotion has expired."); return true; }
    } else {
      const response = await fetch(url.pathname + url.search, { headers: { Accept: "application/json" } });
      if (response.status === 410 || response.status === 404) { message("This brand promotion has expired."); return true; }
      if (!response.ok) { message("This promotion is temporarily unavailable. Please try again later."); return true; }
      destination = (await response.json()).destination;
    }
    if (destination && !(await openPromotion(destination, depth + 1))) window.location.assign(destination);
  } catch { message("This promotion is temporarily unavailable. Please try again later."); }
  return true;
}
