// Text size preference. The chosen scale lives on the user's record in Convex;
// a copy in localStorage lets the next page load render at that size instantly.

export const FONT_SCALES = [
  { key: "sm", label: "Small", value: 0.9, sample: "13px" },
  { key: "md", label: "Default", value: 1, sample: "16px" },
  { key: "lg", label: "Large", value: 1.12, sample: "19px" },
  { key: "xl", label: "Extra large", value: 1.25, sample: "22px" },
] as const;

export type FontScaleKey = (typeof FONT_SCALES)[number]["key"];

const STORAGE_KEY = "rentease:fs";

export function applyFontScale(key: string | undefined) {
  const value = FONT_SCALES.find((s) => s.key === key)?.value ?? 1;
  document.documentElement.style.setProperty("--fs", String(value));
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {}
}

/** Inline script for <head>: applies the last known scale before first paint. */
export const fontScaleBootScript = `try{var s=localStorage.getItem("${STORAGE_KEY}");if(s)document.documentElement.style.setProperty("--fs",s)}catch(e){}`;
