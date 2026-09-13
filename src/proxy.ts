import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

// Paths anyone can reach without signing in. Everything else requires a
// session — see the check below.
const PUBLIC_PATHS = [
  /^\/$/, // landing page
  /^\/sign-in(\/|$)/,
  /^\/sign-up(\/|$)/,
  /^\/manifest\.webmanifest$/,
  /^\/sw\.js$/,
  /^\/(icon|apple-icon)(\.png)?$/, // favicon + home-screen icon
  /^\/logo\.png$/,
  /^\/join$/, // invite links: the page itself asks visitors to sign in
];

function isPublic(req: NextRequest) {
  return PUBLIC_PATHS.some((re) => re.test(req.nextUrl.pathname));
}

// `createRouteMatcher` is deprecated in this Clerk version in favor of
// resource-based auth checks (see node_modules/@clerk/nextjs/dist/types/
// server/routeMatcher.d.ts), so we match paths by hand instead. This edge
// check is the first line of defense — it redirects signed-out visitors to
// /sign-in before any page renders. It is not the only one: every Convex
// query and mutation re-checks the signed-in user itself (see convex/lib.ts),
// which is the resource-based check Clerk now recommends and the one that
// actually gates the data.
export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublic(req)) await auth.protect();
  },
  // Signed-out visitors go to our own /sign-in, not Clerk's hosted page.
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
