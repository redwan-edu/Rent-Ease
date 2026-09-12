import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { tryAccess } from "./lib";

export type PayStatus = "paid" | "partial" | "due";

/**
 * Audit: every property with its units, who rents each unit and whether
 * they've paid for `month`, plus current tenants who aren't placed anywhere.
 */
export const overview = query({
  args: { workspaceId: v.id("users"), month: v.string() },
  handler: async (ctx, { workspaceId, month }) => {
    const a = await tryAccess(ctx, workspaceId);
    if (!a) return null;

    const [properties, units, tenants, payments] = await Promise.all([
      ctx.db
        .query("properties")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect(),
      ctx.db
        .query("units")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect(),
      ctx.db
        .query("tenants")
        .withIndex("by_workspace_status", (q) => q.eq("workspaceId", workspaceId).eq("status", "active"))
        .collect(),
      ctx.db
        .query("payments")
        .withIndex("by_workspace_month", (q) => q.eq("workspaceId", workspaceId).eq("month", month))
        .collect(),
    ]);

    const paidBy = new Map<string, number>();
    for (const p of payments) paidBy.set(p.tenantId, (paidBy.get(p.tenantId) ?? 0) + p.amount);

    const describe = async (t: Doc<"tenants">) => {
      const paid = paidBy.get(t._id) ?? 0;
      const status: PayStatus = paid >= t.rent ? "paid" : paid > 0 ? "partial" : "due";
      return {
        _id: t._id,
        name: t.name,
        phone: t.phone,
        rent: t.rent,
        paid,
        remaining: Math.max(0, t.rent - paid),
        status,
        propertyId: t.propertyId ?? null,
        unitId: t.unitId ?? null,
        photoUrl: t.photoId ? await ctx.storage.getUrl(t.photoId) : null,
      };
    };
    const all = await Promise.all(tenants.map(describe));

    const unitIds = new Set<string>(units.map((u) => u._id));
    const propertyIds = new Set<string>(properties.map((p) => p._id));
    const hasUnit = (t: (typeof all)[number]) => !!t.unitId && unitIds.has(t.unitId);
    const byUnit = new Map(all.filter(hasUnit).map((t) => [t.unitId as string, t]));

    const result = properties
      .sort((x, y) => x.name.localeCompare(y.name))
      .map((p) => {
        const pUnits = units
          .filter((u) => u.propertyId === p._id)
          .map((u) => ({ _id: u._id, name: u.name, tenant: byUnit.get(u._id) ?? null }));
        const withoutUnit = all.filter((t) => t.propertyId === p._id && !hasUnit(t));
        const living = [...pUnits.flatMap((u) => (u.tenant ? [u.tenant] : [])), ...withoutUnit];
        return {
          _id: p._id,
          name: p.name,
          kind: p.kind,
          address: p.address ?? null,
          notes: p.notes,
          units: pUnits,
          withoutUnit,
          occupied: pUnits.filter((u) => u.tenant).length,
          expected: living.reduce((s, t) => s + t.rent, 0),
          collected: living.reduce((s, t) => s + Math.min(t.paid, t.rent), 0),
          dueCount: living.filter((t) => t.status !== "paid").length,
        };
      });

    return {
      properties: result,
      unassigned: all.filter((t) => !t.propertyId || !propertyIds.has(t.propertyId)),
      tenants: all,
      totals: {
        units: units.length,
        occupied: byUnit.size,
        expected: all.reduce((s, t) => s + t.rent, 0),
        collected: all.reduce((s, t) => s + Math.min(t.paid, t.rent), 0),
        left: all.reduce((s, t) => s + t.remaining, 0),
        dueCount: all.filter((t) => t.status !== "paid").length,
      },
    };
  },
});
