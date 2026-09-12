import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { roleValidator } from "./schema";
import { access, tryAccess } from "./lib";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const list = query({
  args: { workspaceId: v.id("users") },
  handler: async (ctx, { workspaceId }) => {
    const a = await tryAccess(ctx, workspaceId);
    if (!a) return [];
    const members = await ctx.db
      .query("members")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
    return Promise.all(
      members.map(async (m) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", m.email))
          .first();
        return { ...m, name: user?.name ?? null, joined: !!user };
      }),
    );
  },
});

export const add = mutation({
  args: { workspaceId: v.id("users"), email: v.string(), role: roleValidator },
  handler: async (ctx, { workspaceId, email, role }) => {
    const { me } = await access(ctx, workspaceId, "owner");
    const normalized = email.trim().toLowerCase();
    if (!EMAIL.test(normalized)) throw new ConvexError("Enter a valid email address.");
    if (normalized === me.email) throw new ConvexError("You already own this workspace.");
    const existing = await ctx.db
      .query("members")
      .withIndex("by_workspace_email", (q) =>
        q.eq("workspaceId", workspaceId).eq("email", normalized),
      )
      .unique();
    if (existing) throw new ConvexError("This person is already on your team.");
    return await ctx.db.insert("members", { workspaceId, email: normalized, role });
  },
});

export const setRole = mutation({
  args: { memberId: v.id("members"), role: roleValidator },
  handler: async (ctx, { memberId, role }) => {
    const m = await ctx.db.get(memberId);
    if (!m) throw new ConvexError("Member not found.");
    await access(ctx, m.workspaceId, "owner");
    await ctx.db.patch(memberId, { role });
  },
});

export const remove = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    const m = await ctx.db.get(memberId);
    if (!m) return;
    await access(ctx, m.workspaceId, "owner");
    await ctx.db.delete(memberId);
  },
});
