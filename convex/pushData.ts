import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { getMe, noteVisible, seesProperty } from "./lib";

export const subscribe = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, sub) => {
    const me = await getMe(ctx);
    if (!me) throw new ConvexError("You are not signed in.");
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", sub.endpoint))
      .unique();
    if (existing) await ctx.db.patch(existing._id, { ...sub, userId: me._id });
    else await ctx.db.insert("pushSubscriptions", { ...sub, userId: me._id });
  },
});

export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/** Everyone in the note's workspace (owner + team) with a push subscription. */
export const forNote = internalQuery({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const note = await ctx.db.get(noteId);
    if (!note) return null;
    const members = await ctx.db
      .query("members")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", note.workspaceId))
      .collect();
    const tenant = note.tenantId ? await ctx.db.get(note.tenantId) : null;
    const userIds: Id<"users">[] = [note.workspaceId];
    for (const m of members) {
      const u = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", m.email))
        .first();
      // Same rules as the app: verified address, and the note is in their scope.
      if (!u || u.emailVerified !== true) continue;
      const scope = m.propertyIds ? new Set<string>(m.propertyIds) : null;
      const visibleTenants = new Set<string>(
        tenant && seesProperty({ scope }, tenant.propertyId) ? [tenant._id] : [],
      );
      if (noteVisible(scope, u._id, visibleTenants, note)) userIds.push(u._id);
    }
    const subs = (
      await Promise.all(
        userIds.map((userId) =>
          ctx.db
            .query("pushSubscriptions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect(),
        ),
      )
    ).flat();
    const body = note.body.length > 140 ? `${note.body.slice(0, 137)}…` : note.body;
    return {
      workspaceId: note.workspaceId,
      subs,
      title: tenant ? `Reminder · ${tenant.name}` : "Reminder",
      body,
    };
  },
});

export const removeSub = internalMutation({
  args: { id: v.id("pushSubscriptions") },
  handler: async (ctx, { id }) => {
    if (await ctx.db.get(id)) await ctx.db.delete(id);
  },
});
