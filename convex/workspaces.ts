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
};

/** Your own workspace plus every workspace you were added to by email. */
export const list = query({
  args: {},
  handler: async (ctx): Promise<WorkspaceInfo[]> => {
    const me = await getMe(ctx);
    if (!me) return [];
    const own: WorkspaceInfo = {
      workspaceId: me._id,
      name: me.name,
      role: "owner",
      currency: me.currency ?? "$",
      startMonth: monthOf(me._creationTime),
    };
    if (!me.email) return [own];
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
        };
      }),
    );
    return [own, ...others.filter((w): w is WorkspaceInfo => w !== null)];
  },
});
