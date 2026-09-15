// Public facts about the site, shared by metadata, the sitemap, robots.txt and structured data.

/** Set NEXT_PUBLIC_SITE_URL to the live domain (e.g. https://rentease.app) so links and previews point there. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "Rent Ease";

export const SITE_TITLE = "Rent Ease: Simple Rent Management App for Landlords";

export const SITE_DESCRIPTION =
  "Track rent collection, tenants and properties from your phone. See who paid and what's left each month, keep past dues, tenant documents and reminders in one place.";

export const SITE_KEYWORDS = [
  "rent management app",
  "rent tracker",
  "rent collection app",
  "landlord app",
  "tenant management",
  "property management for small landlords",
  "rent due reminders",
  "house rent app",
];
