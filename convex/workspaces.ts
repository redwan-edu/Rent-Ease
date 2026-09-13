import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { getMe, monthOf, type Role } from "./lib";

export type WorkspaceInfo = {
  workspaceId: Id<"users">;
  name: string;
  role: Role;
  currency: string;
  /** "YYYY-MM" the owner joined: rent is never tracked before this. */
  startMonth: string;
  /** Limited to specific properties rather than the whole workspace. */
  restricted: boolean;
  /** Added to this workspace but hasn't seen the welcome yet. */
  isNew: boolean;
  /** Nothing recorded yet — only computed for your own workspace. */
  empty: boolean;
};

/** Your own workspace plus every workspace you were added to by email. */
export const list = query({
  args: {},
  handler: async (ctx): Promise<WorkspaceInfo[]> => {
    const me = await getMe(ctx);
    if (!me || me.emailVerified === false) return [];
    const hasProperty = await ctx.db
      .query("properties")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", me._id))
      .first();
    const hasTenant = hasProperty
      ? true
      : await ctx.db
          .query("tenants")
          .withIndex("by_workspace_status", (q) => q.eq("workspaceId", me._id))
          .first();
    const own: WorkspaceInfo = {
      workspaceId: me._id,
      name: me.name,
      role: "owner",
      currency: me.currency ?? "$",
      startMonth: monthOf(me._creationTime),
      restricted: false,
      isNew: false,
      empty: !hasProperty && !hasTenant,
    };
    // Invitations only unlock once Clerk has confirmed the address is verified.
    if (!me.email || me.emailVerified !== true) return [own];
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", me.email))
      .collect();
    const others = await Promise.all(
      memberships.map(async (m): Promise<WorkspaceInfo | null> => {
        const owner = await ctx.db.get(m.workspaceId);
        if (!owner) return null;
        return {
          workspaceId: owner._id,
          name: owner.name,
          role: m.role,
          currency: owner.currency ?? "$",
          startMonth: monthOf(owner._creationTime),
          restricted: !!m.propertyIds,
          isNew: !m.seenAt,
          empty: false,
        };
      }),
    );
    return [own, ...others.filter((w): w is WorkspaceInfo => w !== null)];
  },
});

/**
 * What an invite link means for whoever opened it. Reveals only the owner's
 * name — never who else is on the team.
 */
export const invite = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, { workspaceId }) => {
    const me = await getMe(ctx);
    if (!me) return null;
    const id = ctx.db.normalizeId("users", workspaceId);
    const owner = id ? await ctx.db.get(id) : null;
    if (!owner) return { status: "invalid" as const };
    if (owner._id === me._id) return { status: "owner" as const, ownerName: owner.name };
    const member = me.email
      ? await ctx.db
          .query("members")
          .withIndex("by_workspace_email", (q) => q.eq("workspaceId", owner._id).eq("email", me.email))
          .unique()
      : null;
    if (!member) return { status: "not-invited" as const, ownerName: owner.name, email: me.email };
    if (me.emailVerified !== true) {
      return { status: "unverified" as const, ownerName: owner.name, email: me.email };
    }
    return { status: "member" as const, ownerName: owner.name, workspaceId: owner._id, role: member.role };
  },
});
