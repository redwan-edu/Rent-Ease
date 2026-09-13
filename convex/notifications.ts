import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { getMe, noteFilter, tryAccess } from "./lib";

export type NotificationItem =
  | {
      kind: "reminder";
      key: string;
      noteId: Id<"notes">;
      body: string;
      remindAt: number | null;
      tenantName: string | null;
      propertyName: string | null;
    }
  | {
      kind: "admin";
      key: string;
      title: string;
      body: string;
      link: string | null;
      createdAt: number;
    };

// A rescheduled reminder gets a new key, so it notifies again when it's due.
const reminderKey = (n: Doc<"notes">) => `note:${n._id}:${n.remindAt ?? 0}`;
const adminKey = (id: Id<"admin_message">) => `admin:${id}`;
const KEY = /^(note|admin):[A-Za-z0-9_:]+$/;

async function isRead(ctx: QueryCtx, userId: Id<"users">, key: string) {
  const row = await ctx.db
    .query("notificationReads")
    .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("key", key))
    .unique();
  return row !== null;
}

/**
 * The notification panel: messages from the admin plus due reminders from
 * this workspace's notes — only ones this user hasn't seen or cleared yet.
 */
export const list = query({
  args: { workspaceId: v.optional(v.id("users")) },
  handler: async (ctx, { workspaceId }): Promise<{ items: NotificationItem[] }> => {
    const me = await getMe(ctx);
    if (!me || me.emailVerified === false) return { items: [] };
    const items: NotificationItem[] = [];

    const messages = await ctx.db.query("admin_message").order("desc").take(50);
    for (const m of messages) {
      const key = adminKey(m._id);
      if (await isRead(ctx, me._id, key)) continue;
      items.push({
        kind: "admin",
        key,
        title: m.title,
        body: m.body,
        link: m.link ?? null,
        createdAt: m._creationTime,
      });
    }

    const a = workspaceId ? await tryAccess(ctx, workspaceId) : null;
    if (workspaceId && a) {
      const fired = await ctx.db
        .query("notes")
        .withIndex("by_workspace_fired", (q) => q.eq("workspaceId", workspaceId).eq("fired", true))
        .collect();
      const visible = await noteFilter(ctx, a, workspaceId);
      const due = fired
        .filter((n) => !n.done && visible(n))
        .sort((x, y) => (y.remindAt ?? 0) - (x.remindAt ?? 0));
      for (const n of due) {
        const key = reminderKey(n);
        if (await isRead(ctx, me._id, key)) continue;
        items.push({
          kind: "reminder",
          key,
          noteId: n._id,
          body: n.body,
          remindAt: n.remindAt ?? null,
          tenantName: n.tenantId ? ((await ctx.db.get(n.tenantId))?.name ?? null) : null,
          propertyName: n.propertyId ? ((await ctx.db.get(n.propertyId))?.name ?? null) : null,
        });
      }
    }

    return { items };
  },
});

/** Marks notifications as seen for the signed-in user only. */
export const markRead = mutation({
  args: { keys: v.array(v.string()) },
  handler: async (ctx, { keys }) => {
    const me = await getMe(ctx);
    if (!me) throw new ConvexError("You are not signed in.");
    for (const key of [...new Set(keys)].slice(0, 100)) {
      if (!KEY.test(key) || (await isRead(ctx, me._id, key))) continue;
      await ctx.db.insert("notificationReads", { userId: me._id, key });
    }
  },
});
