import { useEffect, useState } from "react";

export type DisplayTheme = "light" | "dark";

const STORAGE_KEYS = { player: "cos.display.player", admin: "cos.display.admin" } as const;
type ThemeScope = keyof typeof STORAGE_KEYS;

export function getDisplayTheme(scope: ThemeScope = "player"): DisplayTheme {
  if (typeof window === "undefined") return scope === "admin" ? "dark" : "light";
  const stored = window.localStorage.getItem(STORAGE_KEYS[scope]);
  return stored === "dark" || stored === "light" ? stored : scope === "admin" ? "dark" : "light";
}

export function applyDisplayTheme(theme: DisplayTheme, scope: ThemeScope = "player") {
  document.documentElement.dataset.displayTheme = theme;
  document.documentElement.dataset.displayThemeScope = scope;
  window.localStorage.setItem(STORAGE_KEYS[scope], theme);
  window.dispatchEvent(new CustomEvent("cos:display-theme", { detail: theme }));
}

export function DisplayThemeSwitcher({ admin = false }: { admin?: boolean }) {
  const scope: ThemeScope = admin ? "admin" : "player";
  const [theme, setTheme] = useState<DisplayTheme>(() => getDisplayTheme(scope));

  useEffect(() => {
    const current = getDisplayTheme(scope);
    setTheme(current);
    applyDisplayTheme(current, scope);
  }, []);

  function select(next: DisplayTheme) {
    setTheme(next);
    applyDisplayTheme(next, scope);
  }

  return (
    <div className="display-theme-switcher" aria-label={`${admin ? "Admin" : "Player"} display theme`}>
      <p className="mb-3 text-xs font-black uppercase tracking-[.16em] text-current/55">Display theme</p>
      <div className="flex gap-2" role="group" aria-label="Choose display theme">
        {(["light", "dark"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={theme === option}
            onClick={() => select(option)}
            className={`rounded-md border px-4 py-2 text-xs font-black uppercase tracking-wider transition ${theme === option ? "border-coral bg-coral text-white" : "border-current/15 bg-current/5 text-current/65 hover:border-coral/60"}`}
          >
            {option}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-current/50">Choose the visual treatment for this display. Your preference is saved on this device.</p>
    </div>
  );
}

export function useDisplayTheme(scope: ThemeScope = "player") {
  const [theme, setTheme] = useState<DisplayTheme>(() => getDisplayTheme(scope));
  useEffect(() => {
    const sync = () => setTheme(getDisplayTheme(scope));
    sync();
    window.addEventListener("cos:display-theme", sync);
    return () => window.removeEventListener("cos:display-theme", sync);
  }, []);
  return theme;
}
