// "Installed" means the app was launched from its own icon — an Android or desktop
// PWA window, or an iOS home-screen app — rather than opened in a browser tab.
// Installed launches get the boot loading screen (see #boot in globals.css); tabs
// never do, because a tab already has the browser's own loading indicator.

export const INSTALLED_MEDIA =
  "(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui), (display-mode: window-controls-overlay)";

export function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia(INSTALLED_MEDIA).matches) return true;
  } catch {}
  // Older iOS home-screen apps don't report a display-mode.
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Inline script for <head>: flags an installed launch before the first paint, so
 * the boot loading screen can be shown to installed apps only.
 */
export const installedBootScript = `try{if(matchMedia(${JSON.stringify(
  INSTALLED_MEDIA,
)}).matches||navigator.standalone===true)document.documentElement.setAttribute("data-installed","")}catch(e){}`;
