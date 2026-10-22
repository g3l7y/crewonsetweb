import { useEffect, useRef, useState } from "react";
import { Avatar3DPreview } from "@/components/portal/avatar-3d-preview";
import { isMockMode } from "@/lib/playfab/config";
import { usePlayerLoadout, useSession } from "@/lib/playfab/hooks";

type Props = {
  playFabId?: string;
  displayName: string;
  fallbackUrl?: string | null;
  className: string;
};

const appearanceCache = new Map<string, { expiresAt: number; value: Promise<Record<string, string>> }>();

function getAppearance(playFabId: string) {
  let cached = appearanceCache.get(playFabId);
  if (!cached || cached.expiresAt < Date.now()) {
    const pending = fetch(`/api/playfab/player-avatar?playFabId=${encodeURIComponent(playFabId)}`, {
      credentials: "same-origin",
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) return {};
      const result = await response.json() as { loadout?: Record<string, string> };
      return result.loadout ?? {};
    }).catch(() => ({}));
    cached = { expiresAt: Date.now() + 15_000, value: pending };
    appearanceCache.set(playFabId, cached);
    void pending.then((loadout) => {
      if (!Object.keys(loadout).length && appearanceCache.get(playFabId) === cached) appearanceCache.delete(playFabId);
    });
  }
  return cached.value;
}

export function SyncedPlayerAvatar({ playFabId, displayName, fallbackUrl, className }: Props) {
  const [loadout, setLoadout] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const ownLoadout = usePlayerLoadout();
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "100px" });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    const refresh = () => {
      if (isMockMode() && (session?.playFabId === playFabId || playFabId === "MOCK-PLAYER-001")) {
        setLoadout((ownLoadout.data ?? {}) as Record<string, string>);
      } else if (playFabId && !isMockMode()) {
        void getAppearance(playFabId).then((value) => { if (active) setLoadout(value); });
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    const handleAvatarUpdated = () => {
      if (playFabId) appearanceCache.delete(playFabId);
      refresh();
    };
    window.addEventListener("cos:avatar-updated", handleAvatarUpdated);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("cos:avatar-updated", handleAvatarUpdated); };
  }, [ownLoadout.data, playFabId, session?.playFabId, visible]);

  return (
    <div ref={hostRef} className={className}>
      {visible && Object.keys(loadout).length
        ? <Avatar3DPreview loadout={loadout} displayName={displayName} portrait className="size-full overflow-hidden" />
        : <img src={fallbackUrl || "/assets/profile-default.jpg"} alt={`${displayName} avatar`} className="size-full object-cover" />}
    </div>
  );
}
