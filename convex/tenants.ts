import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  access,
  assertPlacement,
  assertTenant,
  checkPlacement,
  clean,
  inRentWindow,
  monthOf,
  seesTenant,
  startMonthOf,
  tryAccess,
  unitOccupant,
  type Access,
} from "./lib";

const MAX_DOCUMENTS = 10;

const documentValidator = v.object({
  storageId: v.id("_storage"),
  label: v.string(),
  contentType: v.optional(v.string()),
});

const fields = {
  name: v.string(),
  phone: v.string(),
  residents: v.number(),
  rent: v.number(),
  condition: v.string(),
  propertyId: v.optional(v.id("properties")),
  unitId: v.optional(v.id("units")),
  photoId: v.optional(v.id("_storage")),
  documents: v.array(documentValidator),
  moveInDate: v.optional(v.string()),
};

type Fields = {
  name: string;
  phone: string;
  residents: number;
  rent: number;
  condition: string;
  propertyId?: Id<"properties">;
  unitId?: Id<"units">;
  photoId?: Id<"_storage">;
  documents: { storageId: Id<"_storage">; label: string; contentType?: string }[];
  moveInDate?: string;
};

async function normalize(
  ctx: MutationCtx,
  a: Access,
  workspaceId: Id<"users">,
  f: Fields,
  tenantId?: Id<"tenants">,
) {
  const name = f.name.trim();
  const phone = f.phone.trim();
  if (!name) throw new ConvexError("Tenant name is required.");
  if (!phone) throw new ConvexError("Phone number is required.");
  if (!Number.isInteger(f.residents) || f.residents < 1) {
    throw new ConvexError("Residents must be at least 1.");
  }
  if (!Number.isFinite(f.rent) || f.rent < 0) throw new ConvexError("Enter a valid rent amount.");
  if (f.documents.length > MAX_DOCUMENTS) {
    throw new ConvexError(`You can attach up to ${MAX_DOCUMENTS} documents.`);
  }
  assertPlacement(a, f.propertyId);
  await checkPlacement(ctx, workspaceId, f.propertyId, f.unitId, tenantId);
  return {
    name,
    phone,
    residents: f.residents,
    rent: f.rent,
    condition: f.condition.trim(),
    propertyId: f.propertyId,
    unitId: f.propertyId ? f.unitId : undefined,
    photoId: f.photoId,
    documents: f.documents.map((d, i) => ({
      ...d,
      label: d.label.trim() || `Document ${i + 1}`,
    })),
    moveInDate: clean(f.moveInDate),
  };
}

export const list = query({
  args: {
    workspaceId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("former")),
    month: v.string(),
  },
  handler: async (ctx, { workspaceId, status, month }) => {
    const a = await tryAccess(ctx, workspaceId);
    if (!a) return [];
    const startMonth = await startMonthOf(ctx, workspaceId);
    const tenants = (
      await ctx.db
        .query("tenants")
        .withIndex("by_workspace_status", (q) =>
          q.eq("workspaceId", workspaceId).eq("status", status),
        )
        .order("desc")
        .collect()
    ).filter((t) => seesTenant(a, t));
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_workspace_month", (q) => q.eq("workspaceId", workspaceId).eq("month", month))
      .collect();
    const paidBy = new Map<string, number>();
    for (const p of payments) paidBy.set(p.tenantId, (paidBy.get(p.tenantId) ?? 0) + p.amount);

    return Promise.all(
      tenants.map(async (t) => ({
        _id: t._id,
        name: t.name,
        phone: t.phone,
        rent: t.rent,
        residents: t.residents,
        status: t.status,
        moveOutDate: t.moveOutDate ?? null,
        propertyId: t.propertyId ?? null,
        unitId: t.unitId ?? null,
        unitName: t.unitId ? ((await ctx.db.get(t.unitId))?.name ?? null) : null,
        photoUrl: t.photoId ? await ctx.storage.getUrl(t.photoId) : null,
        propertyName: t.propertyId ? ((await ctx.db.get(t.propertyId))?.name ?? null) : null,
        paid: paidBy.get(t._id) ?? 0,
        // Paid/due only means something for a month they actually rent in.
        owes: inRentWindow(t, startMonth, month),
      })),
    );
  },
});

export const get = query({
  // `month` is the caller's running month; paid/due status is only ever about it.
  args: { tenantId: v.id("tenants"), month: v.optional(v.string()) },
  handler: async (ctx, { tenantId, month }) => {
    const t = await ctx.db.get(tenantId);
    if (!t) return null;
    const a = await tryAccess(ctx, t.workspaceId);
    if (!a || !seesTenant(a, t)) return null;
    const property = t.propertyId ? await ctx.db.get(t.propertyId) : null;
    const unit = t.unitId ? await ctx.db.get(t.unitId) : null;
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    payments.sort((x, y) => (x.month === y.month ? y.paidOn.localeCompare(x.paidOn) : y.month.localeCompare(x.month)));
    const current = month && /^\d{4}-\d{2}$/.test(month) ? month : monthOf(Date.now());
    const paidNow = payments.filter((p) => p.month === current).reduce((s, p) => s + p.amount, 0);
    const owesNow = inRentWindow(t, await startMonthOf(ctx, t.workspaceId), current);
    const names = new Map<string, string | null>();
    const nameOf = async (id?: Id<"users">) => {
      if (!id) return null;
      if (!names.has(id)) names.set(id, (await ctx.db.get(id))?.name ?? null);
      return names.get(id) ?? null;
    };
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .collect();
    const documents = await Promise.all(
      t.documents.map(async (d) => ({ ...d, url: await ctx.storage.getUrl(d.storageId) })),
    );
    return {
      ...t,
      photoUrl: t.photoId ? await ctx.storage.getUrl(t.photoId) : null,
      documents,
      property: property ? { _id: property._id, name: property.name } : null,
      unit: unit ? { _id: unit._id, name: unit.name } : null,
      payments: await Promise.all(
        payments.map(async (p) => ({ ...p, recordedByName: await nameOf(p.recordedBy) })),
      ),
      thisMonth: {
        month: current,
        owes: owesNow,
        paid: paidNow,
        remaining: owesNow ? Math.max(0, t.rent - paidNow) : 0,
      },
      notes,
      family: await Promise.all(
        (
          await ctx.db
            .query("familyMembers")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect()
        ).map(async (f) => ({
          _id: f._id,
          name: f.name,
          age: f.age,
          phone: f.phone,
          job: f.job ?? null,
          photoId: f.photoId,
          photoUrl: f.photoId ? await ctx.storage.getUrl(f.photoId) : null,
          nid: await Promise.all(
            f.nidPhotoIds.map(async (storageId) => ({ storageId, url: await ctx.storage.getUrl(storageId) })),
          ),
        })),
      ),
    };
  },
});

export const create = mutation({
  args: { workspaceId: v.id("users"), ...fields },
  handler: async (ctx, { workspaceId, ...f }) => {
    const a = await access(ctx, workspaceId, "edit");
    const data = await normalize(ctx, a, workspaceId, f);
    return await ctx.db.insert("tenants", { workspaceId, ...data, status: "active" });
  },
});

export const update = mutation({
  args: { tenantId: v.id("tenants"), ...fields },
  handler: async (ctx, { tenantId, ...f }) => {
    const t = await ctx.db.get(tenantId);
    if (!t) throw new ConvexError("Tenant not found.");
    const a = await access(ctx, t.workspaceId, "edit");
    assertTenant(a, t);
    const data = await normalize(ctx, a, t.workspaceId, f, tenantId);

    // Delete files that were removed from the tenant.
    const keep = new Set<string>([
      ...(data.photoId ? [data.photoId] : []),
      ...data.documents.map((d) => d.storageId),
    ]);
    const previous = [...(t.photoId ? [t.photoId] : []), ...t.documents.map((d) => d.storageId)];
    for (const id of previous) if (!keep.has(id)) await ctx.storage.delete(id);

    await ctx.db.patch(tenantId, data);
  },
});

/** Removing a tenant keeps their full history and marks them as a former tenant. */
export const moveOut = mutation({
  args: { tenantId: v.id("tenants"), date: v.string() },
  handler: async (ctx, { tenantId, date }) => {
    const t = await ctx.db.get(tenantId);
    if (!t) throw new ConvexError("Tenant not found.");
    assertTenant(await access(ctx, t.workspaceId, "full"), t);
    await ctx.db.patch(tenantId, { status: "former", moveOutDate: date });
  },
});

export const reactivate = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const t = await ctx.db.get(tenantId);
    if (!t) throw new ConvexError("Tenant not found.");
    const a = await access(ctx, t.workspaceId, "edit");
    assertTenant(a, t);
    // If their old unit has been rented out since, they come back unassigned.
    const occupant = t.unitId ? await unitOccupant(ctx, t.unitId) : null;
    const lostUnit = !!occupant && occupant._id !== tenantId;
    // An unassigned tenant would vanish for a member limited to certain properties.
    if (lostUnit && a.scope !== null) {
      throw new ConvexError(
        `Their old unit is now rented to ${occupant.name}. Edit ${t.name} and choose another unit first.`,
      );
    }
    await ctx.db.patch(tenantId, {
      status: "active",
      moveOutDate: undefined,
      ...(lostUnit ? { propertyId: undefined, unitId: undefined } : {}),
    });
  },
});
