"use client";

import { useEffect } from "react";

// The Copy button on each code cell in a published note. The note is plain HTML, so one listener serves them all.
export default function CodeCopy() {
  useEffect(() => {
    const copy = (e: MouseEvent) => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-copy]");
      const code = button?.closest(".code-cell")?.querySelector("pre");
      if (!button || !code) return;
      void navigator.clipboard.writeText(code.textContent ?? "").then(() => {
        button.textContent = "Copied";
        setTimeout(() => { button.textContent = "Copy"; }, 1400);
      });
    };
    document.addEventListener("click", copy);
    return () => document.removeEventListener("click", copy);
  }, []);
  return null;
}
