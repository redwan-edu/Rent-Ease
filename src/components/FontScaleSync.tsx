"use client";

import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@convex/_generated/api";
import { applyFontScale } from "@/lib/fontScale";

/** Applies the signed-in user's saved text size (and keeps it in sync across devices). */
export default function FontScaleSync() {
  const me = useQuery(api.users.me);
  const scale = me?.fontScale;
  const loaded = me !== undefined && me !== null;

  useEffect(() => {
    if (loaded) applyFontScale(scale);
  }, [loaded, scale]);

  return null;
}
