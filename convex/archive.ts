import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  access,
  assertProperty,
  assertTenant,
  checkPlacement,
  clean,
  seesProperty,
  tryAccess,
} from "./lib";

/**
 * The archive is the safety net behind "delete tenant". Moving a tenant out
 * keeps them live as a former tenant; deleting them takes them off every list
 * but stores a verbatim copy of everything here — including their uploaded
 * photos and documents — so there is always proof of what happened.
 */

/** Everything archived in this workspace, newest first. */
export const list = query({
  args: { workspaceId: v.id("users") },
  handler: async (ctx, { workspaceId }) => {
    const a = await tryAccess(ctx, workspaceId);
    if (!a) return null;
    const rows = await ctx.db
      .query("archivedTenants")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .order("desc")
      .collect();
    return rows
      .filter((r) => seesProperty(a, (r.tenant as Doc<"tenants">).propertyId))
      .map((r) => ({
      _id: r._id,
      name: r.name,
      phone: r.phone,
      placeName: r.placeName ?? null,
      movedInOn: r.movedInOn ?? null,
      movedOutOn: r.movedOutOn ?? null,
      totalPaid: r.totalPaid,
      paymentCount: r.paymentCount,
      archivedAt: r.archivedAt,
      archivedByName: r.archivedByName,
      reason: r.reason ?? null,
      familyCount: (r.family as unknown[]).length,
      noteCount: (r.notes as unknown[]).length,
      fileCount: r.storageIds.length,
    }));
  },
});

/** One archived record, unpacked in full with working links to its files. */
export const get = query({
  args: { archiveId: v.id("archivedTenants") },
  handler: async (ctx, { archiveId }) => {
    const r = await ctx.db.get(archiveId);
    if (!r) return null;
    const a = await tryAccess(ctx, r.workspaceId);
    const tenant = r.tenant as Doc<"tenants">;
    if (!a || !seesProperty(a, tenant.propertyId)) return null;

    const family = r.family as Doc<"familyMembers">[];
    const payments = r.payments as Doc<"payments">[];
    const notes = r.notes as Doc<"notes">[];
    const url = async (id?: Id<"_storage">) => (id ? await ctx.storage.getUrl(id) : null);
    const names = new Map<string, string | null>();
    const nameOf = async (id?: Id<"users">) => {
      if (!id) return null;
      if (!names.has(id)) names.set(id, (await ctx.db.get(id))?.name ?? null);
      return names.get(id) ?? null;
    };

    return {
      _id: r._id,
      name: r.name,
      phone: r.phone,
      placeName: r.placeName ?? null,
      movedInOn: r.movedInOn ?? null,
      movedOutOn: r.movedOutOn ?? null,
      totalPaid: r.totalPaid,
      archivedAt: r.archivedAt,
      archivedByName: r.archivedByName,
      reason: r.reason ?? null,
      rent: tenant.rent,
      residents: tenant.residents,
      condition: tenant.condition,
      status: tenant.status,
      photoUrl: await url(tenant.photoId),
      documents: await Promise.all(
        tenant.documents.map(async (d) => ({ ...d, url: await url(d.storageId) })),
      ),
      family: await Promise.all(
        family.map(async (f) => ({
          name: f.name,
          age: f.age,
          phone: f.phone,
          job: f.job ?? null,
          photoUrl: await url(f.photoId),
          nid: await Promise.all(
            f.nidPhotoIds.map(async (id) => ({ storageId: id, url: await url(id) })),
          ),
        })),
      ),
      payments: await Promise.all(
        [...payments]
          .sort((x, y) =>
            x.month === y.month ? y.paidOn.localeCompare(x.paidOn) : y.month.localeCompare(x.month),
          )
          .map(async (p) => ({ ...p, recordedByName: await nameOf(p.recordedBy) })),
      ),
      notes: notes.map((n) => ({ body: n.body, createdAt: n._creationTime, done: n.done })),
    };
  },
});

/**
 * Deletes a tenant from the live workspace after copying their whole record —
 * profile, family, payments, notes and files — into the archive. Nothing is
 * destroyed here; only `purge` can do that.
 */
export const archiveTenant = mutation({
  args: { tenantId: v.id("tenants"), reason: v.optional(v.string()) },
  handler: async (ctx, { tenantId, reason }) => {
    const t = await ctx.db.get(tenantId);
    if (!t) throw new ConvexError("Tenant not found.");
    const a = await access(ctx, t.workspaceId, "full");
    assertTenant(a, t);
    const { me } = a;

    const family = await ctx.db
      .query("familyMembers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    const property = t.propertyId ? await ctx.db.get(t.propertyId) : null;
    const unit = t.unitId ? await ctx.db.get(t.unitId) : null;
    const placeName =
      property && unit ? `${property.name} · ${unit.name}` : (property?.name ?? undefined);

    // Every file that belongs to this record stays in storage with the archive.
    const storageIds: Id<"_storage">[] = [
      ...(t.photoId ? [t.photoId] : []),
      ...t.documents.map((d) => d.storageId),
      ...family.flatMap((f) => [...(f.photoId ? [f.photoId] : []), ...f.nidPhotoIds]),
    ];

    const archiveId = await ctx.db.insert("archivedTenants", {
      workspaceId: t.workspaceId,
      name: t.name,
      phone: t.phone,
      placeName,
      movedInOn: t.moveInDate,
      movedOutOn: t.moveOutDate,
      totalPaid: payments.reduce((s, p) => s + p.amount, 0),
      paymentCount: payments.length,
      archivedAt: Date.now(),
      archivedBy: me._id,
      archivedByName: me.name,
      reason: clean(reason),
      tenant: t,
      family,
      payments,
      notes,
      storageIds,
    });

    // Now clear the live record. Files are deliberately left in storage.
    for (const n of notes) {
      if (n.reminderJobId) await ctx.scheduler.cancel(n.reminderJobId);
      await ctx.db.delete(n._id);
    }
    for (const p of payments) await ctx.db.delete(p._id);
    for (const f of family) await ctx.db.delete(f._id);
    await ctx.db.delete(tenantId);

    return archiveId;
  },
});

/**
 * Puts an archived tenant back in the workspace. They return as a former
 * tenant with every payment and family member intact; if their old unit has
 * been rented out since, they come back unplaced rather than evicting anyone.
 */
export const restore = mutation({
  args: { archiveId: v.id("archivedTenants") },
  handler: async (ctx, { archiveId }) => {
    const r = await ctx.db.get(archiveId);
    if (!r) throw new ConvexError("That archived tenant no longer exists.");
    const a = await access(ctx, r.workspaceId, "full");
    const tenant = r.tenant as Doc<"tenants">;
    assertProperty(a, tenant.propertyId);
    const family = r.family as Doc<"familyMembers">[];
    const payments = r.payments as Doc<"payments">[];
    const notes = r.notes as Doc<"notes">[];

    // The property or unit may be long gone, or taken by someone else.
    let propertyId = tenant.propertyId;
    let unitId = tenant.unitId;
    try {
      await checkPlacement(ctx, r.workspaceId, propertyId, unitId);
    } catch (e) {
      // A restricted member can't see an unplaced tenant, so don't hide one from them.
      if (a.scope !== null) {
        throw new ConvexError(
          `${tenant.name}'s old unit is gone or rented out. Ask the owner to restore them.`,
        );
      }
      void e;
      propertyId = undefined;
      unitId = undefined;
    }

    const tenantId = await ctx.db.insert("tenants", {
      workspaceId: r.workspaceId,
      propertyId,
      unitId,
      name: tenant.name,
      phone: tenant.phone,
      residents: tenant.residents,
      rent: tenant.rent,
      condition: tenant.condition,
      photoId: tenant.photoId,
      documents: tenant.documents,
      // Back as a former tenant: making them current again is a deliberate step.
      status: "former",
      moveInDate: tenant.moveInDate,
      moveOutDate: tenant.moveOutDate,
    });

    for (const f of family) {
      await ctx.db.insert("familyMembers", {
        workspaceId: r.workspaceId,
        tenantId,
        name: f.name,
        age: f.age,
        phone: f.phone,
        job: f.job,
        photoId: f.photoId,
        nidPhotoIds: f.nidPhotoIds,
      });
    }
    for (const p of payments) {
      await ctx.db.insert("payments", {
        workspaceId: r.workspaceId,
        tenantId,
        month: p.month,
        amount: p.amount,
        paidOn: p.paidOn,
        note: p.note,
        recordedBy: p.recordedBy,
      });
    }
    for (const n of notes) {
      // Reminders are not re-armed — their moment has passed.
      await ctx.db.insert("notes", {
        workspaceId: r.workspaceId,
        body: n.body,
        tenantId,
        propertyId: n.propertyId,
        fired: n.fired,
        seen: true,
        done: n.done,
        createdBy: n.createdBy,
      });
    }

    await ctx.db.delete(archiveId);
    return tenantId;
  },
});

/**
 * The only destructive action in the app: erases an archived record and its
 * files for good. Owner-only, because the whole point of the archive is that
 * nobody else can make the proof disappear.
 */
export const purge = mutation({
  args: { archiveId: v.id("archivedTenants") },
  handler: async (ctx, { archiveId }) => {
    const r = await ctx.db.get(archiveId);
    if (!r) return;
    await access(ctx, r.workspaceId, "owner");
    for (const id of r.storageIds) {
      try {
        await ctx.storage.delete(id);
      } catch {
        // Already gone — nothing to clean up.
      }
    }
    await ctx.db.delete(archiveId);
  },
});
