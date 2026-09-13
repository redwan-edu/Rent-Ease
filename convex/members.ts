import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { roleValidator } from "./schema";
import { access, getMe, tryAccess } from "./lib";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** null = every property; otherwise a de-duplicated list checked against this workspace. */
async function checkScope(
  ctx: MutationCtx,
  workspaceId: Id<"users">,
  propertyIds: Id<"properties">[] | null | undefined,
) {
  if (!propertyIds) return undefined;
  const unique = [...new Set(propertyIds)];
  for (const id of unique) {
    const p = await ctx.db.get(id);
    if (!p || p.workspaceId !== workspaceId) throw new ConvexError("Property not found.");
  }
  return unique;
}

/** The team, with everyone's email — so only the owner may read it. */
export const list = query({
  args: { workspaceId: v.id("users") },
  handler: async (ctx, { workspaceId }) => {
    const a = await tryAccess(ctx, workspaceId);
    if (!a || a.role !== "owner") return [];
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
        return {
          _id: m._id,
          email: m.email,
          role: m.role,
          propertyIds: m.propertyIds ?? null,
          name: user?.name ?? null,
          joined: !!user,
          // Signed up, but Clerk hasn't verified the address — no access yet.
          unverified: !!user && user.emailVerified !== true,
          seen: !!m.seenAt,
        };
      }),
    );
  },
});

export const add = mutation({
  args: {
    workspaceId: v.id("users"),
    email: v.string(),
    role: roleValidator,
    propertyIds: v.optional(v.array(v.id("properties"))),
  },
  handler: async (ctx, { workspaceId, email, role, propertyIds }) => {
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
    return await ctx.db.insert("members", {
      workspaceId,
      email: normalized,
      role,
      propertyIds: await checkScope(ctx, workspaceId, propertyIds),
    });
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

/** Pass null to give the member every property again. */
export const setScope = mutation({
  args: {
    memberId: v.id("members"),
    propertyIds: v.union(v.null(), v.array(v.id("properties"))),
  },
  handler: async (ctx, { memberId, propertyIds }) => {
    const m = await ctx.db.get(memberId);
    if (!m) throw new ConvexError("Member not found.");
    await access(ctx, m.workspaceId, "owner");
    await ctx.db.patch(memberId, { propertyIds: await checkScope(ctx, m.workspaceId, propertyIds) });
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

async function myMembership(ctx: MutationCtx, workspaceId: Id<"users">) {
  const me = await getMe(ctx);
  if (!me) throw new ConvexError("You are not signed in.");
  if (!me.email) return null;
  return await ctx.db
    .query("members")
    .withIndex("by_workspace_email", (q) => q.eq("workspaceId", workspaceId).eq("email", me.email))
    .unique();
}

/** A member removing themselves from someone else's workspace. */
export const leave = mutation({
  args: { workspaceId: v.id("users") },
  handler: async (ctx, { workspaceId }) => {
    const m = await myMembership(ctx, workspaceId);
    if (m) await ctx.db.delete(m._id);
  },
});

/** Marks the "you've been added" welcome as seen. */
export const acknowledge = mutation({
  args: { workspaceId: v.id("users") },
  handler: async (ctx, { workspaceId }) => {
    const m = await myMembership(ctx, workspaceId);
    if (m && !m.seenAt) await ctx.db.patch(m._id, { seenAt: Date.now() });
  },
});
