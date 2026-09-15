import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Only the public pages are for search engines; every workspace page is private. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/sign-in", "/sign-up"],
      disallow: ["/app", "/join", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
