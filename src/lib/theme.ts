// Light / dark preference. It belongs to the device, not the account: it lives in
// localStorage, and "system" (nothing stored) follows the phone's own setting.

export const THEMES = [
  { key: "system", label: "Automatic" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];

const STORAGE_KEY = "rentease:theme";
const BAR_COLOR = { light: "#fbfbfa", dark: "#141413" };

export function storedTheme(): ThemeKey {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {}
  return "system";
}

/** Paints the page in the given preference, resolving "system" against the device. */
export function applyTheme(key: ThemeKey) {
  const theme =
    key === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : key;
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", BAR_COLOR[theme]));
}

export function saveTheme(key: ThemeKey) {
  try {
    if (key === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, key);
  } catch {}
  applyTheme(key);
}

/** Inline script for <head>: applies the saved theme before first paint, so there is no flash. */
export const themeBootScript = `try{var t=localStorage.getItem("${STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
