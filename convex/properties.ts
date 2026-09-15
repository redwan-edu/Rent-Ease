import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { propertyKind } from "./schema";
import {
  access,
  assertPlacement,
  assertProperty,
  assertTenant,
  assertUnrestricted,
  checkPlacement,
  clean,
  seesProperty,
  tryAccess,
  unitOccupant,
} from "./lib";

const MAX_UNITS = 200;

const fields = {
  name: v.string(),
  address: v.optional(v.string()),
  kind: propertyKind,
  notes: v.optional(v.string()),
};

function normalize(f: { name: string; address?: string; notes?: string }) {
  const name = f.name.trim();
  if (!name) throw new ConvexError("Give the property a name.");
  return { name, address: clean(f.address), notes: clean(f.notes) };
}

/** Every property needs at least one unit, and unit names must be unique within it. */
function checkUnitNames(names: string[]) {
  if (names.length === 0) throw new ConvexError("Add at least one unit.");
  if (names.length > MAX_UNITS) throw new ConvexError(`A property can have up to ${MAX_UNITS} units.`);
  const seen = new Set<string>();
  for (const n of names) {
    if (!n) throw new ConvexError("Give every unit a name.");
    const key = n.toLowerCase();
    if (seen.has(key)) throw new ConvexError(`Unit names must be unique. "${n}" is used twice.`);
    seen.add(key);
  }
}

export const list = query({
  args: { workspaceId: v.id("users") },
  handler: async (ctx, { workspaceId }) => {
    const a = await tryAccess(ctx, workspaceId);
    if (!a) return [];
    const properties = (
      await ctx.db
        .query("properties")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .order("desc")
        .collect()
    ).filter((p) => seesProperty(a, p._id));
    return Promise.all(
      properties.map(async (p) => {
        const units = await ctx.db
          .query("units")
          .withIndex("by_property", (q) => q.eq("propertyId", p._id))
          .collect();
        const tenants = (
          await ctx.db
            .query("tenants")
            .withIndex("by_property", (q) => q.eq("propertyId", p._id))
            .collect()
        ).filter((t) => t.status === "active");
        const occupied = new Set(tenants.map((t) => t.unitId).filter(Boolean));
        return {
          ...p,
          unitCount: units.length,
          occupiedCount: units.filter((u) => occupied.has(u._id)).length,
          tenantCount: tenants.length,
          monthlyRent: tenants.reduce((s, t) => s + t.rent, 0),
        };
      }),
    );
  },
});

export const get = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, { propertyId }) => {
    const p = await ctx.db.get(propertyId);
    if (!p) return null;
    const a = await tryAccess(ctx, p.workspaceId);
    if (!a || !seesProperty(a, propertyId)) return null;
    const tenants = await ctx.db
      .query("tenants")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect();
    const withPhotos = await Promise.all(
      tenants.map(async (t) => ({
        _id: t._id,
        name: t.name,
        rent: t.rent,
        status: t.status,
        unitId: t.unitId ?? null,
        moveOutDate: t.moveOutDate ?? null,
        photoUrl: t.photoId ? await ctx.storage.getUrl(t.photoId) : null,
      })),
    );
    const active = withPhotos.filter((t) => t.status === "active");
    const units = await ctx.db
      .query("units")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect();
    const unitName = new Map(units.map((u) => [u._id as string, u.name]));
    return {
      ...p,
      units: units.map((u) => ({
        _id: u._id,
        name: u.name,
        occupant: active.find((t) => t.unitId === u._id) ?? null,
      })),
      active,
      // Current tenants placed here before units existed.
      withoutUnit: active.filter((t) => !t.unitId || !unitName.has(t.unitId)),
      former: withPhotos
        .filter((t) => t.status === "former")
        .map((t) => ({ ...t, unitName: t.unitId ? (unitName.get(t.unitId) ?? null) : null })),
    };
  },
});

/** Units of a property with who's renting each — for the tenant form's unit picker. */
export const unitsFor = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, { propertyId }) => {
    const p = await ctx.db.get(propertyId);
    if (!p) return [];
    const a = await tryAccess(ctx, p.workspaceId);
    if (!a || !seesProperty(a, propertyId)) return [];
    const units = await ctx.db
      .query("units")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect();
    return Promise.all(
      units.map(async (u) => {
        const t = await unitOccupant(ctx, u._id);
        return { _id: u._id, name: u.name, occupant: t ? { _id: t._id, name: t.name } : null };
      }),
    );
  },
});

export const create = mutation({
  args: { workspaceId: v.id("users"), ...fields, units: v.array(v.string()) },
  handler: async (ctx, { workspaceId, kind, units, ...f }) => {
    // A restricted member couldn't see a property they created.
    assertUnrestricted(await access(ctx, workspaceId, "edit"));
    const names = units.map((n) => n.trim());
    checkUnitNames(names);
    const propertyId = await ctx.db.insert("properties", { workspaceId, kind, ...normalize(f) });
    for (const name of names) await ctx.db.insert("units", { workspaceId, propertyId, name });
    return propertyId;
  },
});

export const update = mutation({
  args: {
    propertyId: v.id("properties"),
    ...fields,
    units: v.array(v.object({ _id: v.optional(v.id("units")), name: v.string() })),
  },
  handler: async (ctx, { propertyId, kind, units, ...f }) => {
    const p = await ctx.db.get(propertyId);
    if (!p) throw new ConvexError("Property not found.");
    assertProperty(await access(ctx, p.workspaceId, "edit"), propertyId);
    const cleaned = units.map((u) => ({ ...u, name: u.name.trim() }));
    checkUnitNames(cleaned.map((u) => u.name));

    const existing = await ctx.db
      .query("units")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect();
    const keep = new Set(cleaned.map((u) => u._id).filter(Boolean));

    // Removed units: blocked while rented; past tenants just lose the link.
    for (const u of existing) {
      if (keep.has(u._id)) continue;
      const occupant = await unitOccupant(ctx, u._id);
      if (occupant) {
        throw new ConvexError(`${u.name} is rented to ${occupant.name}. Unassign them before removing it.`);
      }
      const past = await ctx.db
        .query("tenants")
        .withIndex("by_unit", (q) => q.eq("unitId", u._id))
        .collect();
      for (const t of past) await ctx.db.patch(t._id, { unitId: undefined });
      await ctx.db.delete(u._id);
    }

    for (const u of cleaned) {
      if (u._id) {
        const current = existing.find((e) => e._id === u._id);
        if (!current) throw new ConvexError("Unit not found.");
        if (current.name !== u.name) await ctx.db.patch(u._id, { name: u.name });
      } else {
        await ctx.db.insert("units", { workspaceId: p.workspaceId, propertyId, name: u.name });
      }
    }

    await ctx.db.patch(propertyId, { kind, ...normalize(f) });
  },
});

export const remove = mutation({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, { propertyId }) => {
    const p = await ctx.db.get(propertyId);
    if (!p) return;
    assertProperty(await access(ctx, p.workspaceId, "full"), propertyId);
    const tenants = await ctx.db
      .query("tenants")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect();
    for (const t of tenants) await ctx.db.patch(t._id, { propertyId: undefined, unitId: undefined });
    const units = await ctx.db
      .query("units")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect();
    for (const u of units) await ctx.db.delete(u._id);
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect();
    for (const n of notes) await ctx.db.patch(n._id, { propertyId: undefined });
    // Drop it from restricted members' lists; never widen anyone's access.
    const members = await ctx.db
      .query("members")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", p.workspaceId))
      .collect();
    for (const m of members) {
      if (m.propertyIds?.includes(propertyId)) {
        await ctx.db.patch(m._id, { propertyIds: m.propertyIds.filter((id) => id !== propertyId) });
      }
    }
    await ctx.db.delete(propertyId);
  },
});

/** Places a tenant in a property's unit, or unassigns them when no property is given. */
export const assign = mutation({
  args: {
    tenantId: v.id("tenants"),
    propertyId: v.optional(v.id("properties")),
    unitId: v.optional(v.id("units")),
  },
  handler: async (ctx, { tenantId, propertyId, unitId }) => {
    const t = await ctx.db.get(tenantId);
    if (!t) throw new ConvexError("Tenant not found.");
    const a = await access(ctx, t.workspaceId, "edit");
    assertTenant(a, t);
    assertPlacement(a, propertyId);
    await checkPlacement(ctx, t.workspaceId, propertyId, unitId, tenantId);
    await ctx.db.patch(tenantId, { propertyId, unitId });
  },
});
