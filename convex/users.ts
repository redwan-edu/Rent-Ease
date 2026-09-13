import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { access, getMe } from "./lib";
import { fontScale } from "./schema";

/** Called on every sign-in: creates or refreshes the user record from the Clerk token. */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("You are not signed in.");
    const email = (identity.email ?? "").toLowerCase();
    const name =
      identity.name?.trim() || identity.givenName || email.split("@")[0] || "Owner";
    const imageUrl = identity.pictureUrl;
    const emailVerified = identity.emailVerified;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (existing) {
      if (
        existing.email !== email ||
        existing.name !== name ||
        existing.imageUrl !== imageUrl ||
        existing.emailVerified !== emailVerified
      ) {
        await ctx.db.patch(existing._id, { email, name, imageUrl, emailVerified });
      }
      return existing._id;
    }
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      email,
      emailVerified,
      name,
      imageUrl,
    });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => await getMe(ctx),
});

/** Text size is personal: stored on the signed-in user, not the workspace. */
export const setFontScale = mutation({
  args: { scale: fontScale },
  handler: async (ctx, { scale }) => {
    const me = await getMe(ctx);
    if (!me) throw new ConvexError("You are not signed in.");
    await ctx.db.patch(me._id, { fontScale: scale });
  },
});

export const setCurrency = mutation({
  args: { workspaceId: v.id("users"), currency: v.string() },
  handler: async (ctx, { workspaceId, currency }) => {
    await access(ctx, workspaceId, "owner");
    await ctx.db.patch(workspaceId, { currency: currency.trim().slice(0, 5) || "$" });
  },
});
