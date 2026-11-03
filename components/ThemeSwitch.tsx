"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

// Sets the theme before the page paints (see the script in app/layout.tsx), so this only flips it and
// remembers the choice. With no choice made, the site follows the system setting, live.
export const themeScript = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}`;

// The theme the visitor chose, or else their system's.
function wanted(): Theme {
  let saved = null;
  try { saved = localStorage.getItem("theme"); } catch {}
  if (saved === "light" || saved === "dark") return saved;
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export default function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const next = wanted();
      if (root.dataset.theme !== next) root.dataset.theme = next;
      setTheme(next);
    };
    apply();
    // React redraws <html> when a page refreshes (after saving a note, say) and drops data-theme, so it goes back on.
    const guard = new MutationObserver(() => { if (root.dataset.theme !== wanted()) apply(); });
    guard.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    const system = matchMedia("(prefers-color-scheme: light)");
    system.addEventListener("change", apply);
    return () => { guard.disconnect(); system.removeEventListener("change", apply); };
  }, []);

  function flip() {
    const next: Theme = theme === "light" ? "dark" : "light";
    // Remembered first, so the guard above sees the new choice as wanted.
    try { localStorage.setItem("theme", next); } catch {}
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }

  const toLight = theme !== "light";
  return (
    <button type="button" className="theme-switch" onClick={flip} aria-label={toLight ? "Switch to light mode" : "Switch to dark mode"} title={toLight ? "Light mode" : "Dark mode"}>
      <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        {toLight
          ? <><circle cx="8" cy="8" r="3" /><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" /></>
          : <path d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1z" />}
      </svg>
    </button>
  );
}
