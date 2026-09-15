"use client";

import { useEffect } from "react";
import { applyTheme, storedTheme } from "@/lib/theme";

/** Keeps the theme right when the phone switches light/dark, or another tab changes the choice. */
export default function ThemeSync() {
  useEffect(() => {
    const sync = () => applyTheme(storedTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return null;
}
