"use client";

import { useEffect } from "react";
import { Splash } from "./ui";

/**
 * The first frame of an installed app.
 *
 * A home-screen launch starts with the platform's own splash — just the icon on a
 * flat background — and it stays up until the page paints. This keeps the app's
 * loading state on screen from that very first paint, before React has hydrated,
 * so the launch reads as one continuous "loading" screen instead of a logo that
 * blinks and is replaced. It is hidden again the moment React takes over, by which
 * point the app is rendering the same loading state underneath.
 *
 * Only installed launches ever see it: the markup is inert until the boot script in
 * <head> sets data-installed on <html>.
 */
export default function BootScreen() {
  useEffect(() => {
    // Hidden with an attribute rather than by unmounting, so the node stays
    // exactly where React put it during hydration.
    document.documentElement.setAttribute("data-booted", "");
  }, []);

  return (
    <div id="boot" aria-hidden>
      <Splash />
    </div>
  );
}
