import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  access,
  assertProperty,
  assertTenant,
  noteFilter,
  tryAccess,
  type Access,
  type Role,
} from "./lib";

const fields = {
  body: v.string(),
  tenantId: v.optional(v.id("tenants")),
  propertyId: v.optional(v.id("properties")),
  remindAt: v.optional(v.number()),
};

async function enrich(ctx: QueryCtx, notes: Doc<"notes">[]) {
  return Promise.all(
    notes.map(async (n) => ({
      ...n,
      tenantName: n.tenantId ? ((await ctx.db.get(n.tenantId))?.name ?? null) : null,
      propertyName: n.propertyId ? ((await ctx.db.get(n.propertyId))?.name ?? null) : null,
    })),
  );
}

async function checkLinks(
  ctx: MutationCtx,
  a: Access,
  workspaceId: Id<"users">,
  tenantId?: Id<"tenants">,
  propertyId?: Id<"properties">,
) {
  if (tenantId) {
    const t = await ctx.db.get(tenantId);
    if (!t || t.workspaceId !== workspaceId) throw new ConvexError("Tenant not found.");
    assertTenant(a, t);
  }
  if (propertyId) {
    const p = await ctx.db.get(propertyId);
    if (!p || p.workspaceId !== workspaceId) throw new ConvexError("Property not found.");
    assertProperty(a, propertyId);
  }
}

/** Throws unless the caller has `need` and the note is within their property scope. */
async function noteAccess(ctx: MutationCtx, note: Doc<"notes">, need: Role) {
  const a = await access(ctx, note.workspaceId, need);
  if (!(await noteFilter(ctx, a, note.workspaceId))(note)) throw new ConvexError("Note not found.");
  return a;
}

async function schedule(ctx: MutationCtx, noteId: Id<"notes">, remindAt?: number) {
  if (!remindAt) return undefined;
  return await ctx.scheduler.runAt(Math.max(remindAt, Date.now()), internal.notes.fire, { noteId });
}

async function cancel(ctx: MutationCtx, note: Doc<"notes">) {
  if (!note.reminderJobId) return;
  const job = await ctx.db.system.get(note.reminderJobId);
  if (job && job.state.kind === "pending") await ctx.scheduler.cancel(note.reminderJobId);
}

export const list = query({
  args: { workspaceId: v.id("users"), done: v.boolean() },
  handler: async (ctx, { workspaceId, done }) => {
    const a = await tryAccess(ctx, workspaceId);
    if (!a) return [];
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .order("desc")
      .collect();
    const visible = await noteFilter(ctx, a, workspaceId);
    return enrich(ctx, notes.filter((n) => n.done === done && visible(n)));
  },
});

/** Upcoming reminders that haven't fired yet, soonest first. */
export const upcoming = query({
  args: { workspaceId: v.id("users") },
  handler: async (ctx, { workspaceId }) => {
    const a = await tryAccess(ctx, workspaceId);
    if (!a) return [];
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_workspace_fired", (q) => q.eq("workspaceId", workspaceId).eq("fired", false))
      .collect();
    const visible = await noteFilter(ctx, a, workspaceId);
    const pending = notes
      .filter((n) => !n.done && n.remindAt && visible(n))
      .sort((x, y) => x.remindAt! - y.remindAt!)
      .slice(0, 3);
    return enrich(ctx, pending);
  },
});

export const create = mutation({
  args: { workspaceId: v.id("users"), ...fields },
  handler: async (ctx, { workspaceId, body, tenantId, propertyId, remindAt }) => {
    const a = await access(ctx, workspaceId, "edit");
    const { me } = a;
    if (!body.trim()) throw new ConvexError("Write something first.");
    await checkLinks(ctx, a, workspaceId, tenantId, propertyId);
    const noteId = await ctx.db.insert("notes", {
      workspaceId,
      body: body.trim(),
      tenantId,
      propertyId,
      remindAt,
      fired: false,
      seen: false,
      done: false,
      createdBy: me._id,
    });
    const jobId = await schedule(ctx, noteId, remindAt);
    if (jobId) await ctx.db.patch(noteId, { reminderJobId: jobId });
    return noteId;
  },
});

export const update = mutation({
  args: { noteId: v.id("notes"), ...fields },
  handler: async (ctx, { noteId, body, tenantId, propertyId, remindAt }) => {
    const note = await ctx.db.get(noteId);
    if (!note) throw new ConvexError("Note not found.");
    const a = await noteAccess(ctx, note, "edit");
    if (!body.trim()) throw new ConvexError("Write something first.");
    await checkLinks(ctx, a, note.workspaceId, tenantId, propertyId);

    const patch: Partial<Doc<"notes">> = { body: body.trim(), tenantId, propertyId };
    if (remindAt !== note.remindAt) {
      await cancel(ctx, note);
      patch.remindAt = remindAt;
      patch.fired = false;
      patch.seen = false;
      patch.reminderJobId = await schedule(ctx, noteId, remindAt);
    }
    await ctx.db.patch(noteId, patch);
  },
});

export const setDone = mutation({
  args: { noteId: v.id("notes"), done: v.boolean() },
  handler: async (ctx, { noteId, done }) => {
    const note = await ctx.db.get(noteId);
    if (!note) return;
    await noteAccess(ctx, note, "edit");
    await ctx.db.patch(noteId, { done, seen: true });
  },
});

export const remove = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const note = await ctx.db.get(noteId);
    if (!note) return;
    await noteAccess(ctx, note, "full");
    await cancel(ctx, note);
    await ctx.db.delete(noteId);
  },
});

/** Runs at the reminder time: surfaces the note in the bell and sends a browser push. */
export const fire = internalMutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const note = await ctx.db.get(noteId);
    if (!note || note.done) return;
    await ctx.db.patch(noteId, { fired: true, seen: false, reminderJobId: undefined });
    await ctx.scheduler.runAfter(0, internal.push.sendForNote, { noteId });
  },
});
