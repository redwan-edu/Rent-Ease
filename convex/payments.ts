import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import {
  access,
  allTenants,
  clean,
  inRentWindow,
  monthOf,
  monthRange,
  rentWindow,
  shiftMonth,
  startMonthOf,
  tryAccess,
} from "./lib";

/** Dashboard numbers for one month: what's collected and what's left. */
export const summary = query({
  args: { workspaceId: v.id("users"), month: v.string() },
  handler: async (ctx, { workspaceId, month }) => {
    const a = await tryAccess(ctx, workspaceId);
    if (!a) return null;

    const startMonth = await startMonthOf(ctx, workspaceId);
    const { active, all } = await allTenants(ctx, workspaceId);
    // Only tenants actually renting in this month owe anything for it.
    const tenants = all.filter((t) => inRentWindow(t, startMonth, month));
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_workspace_month", (q) => q.eq("workspaceId", workspaceId).eq("month", month))
      .collect();
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    const paidBy = new Map<string, number>();
    for (const p of payments) paidBy.set(p.tenantId, (paidBy.get(p.tenantId) ?? 0) + p.amount);

    const collected = payments.reduce((s, p) => s + p.amount, 0);
    const expected = tenants.reduce((s, t) => s + t.rent, 0);
    let left = 0;
    let paidCount = 0;
    const units = await ctx.db
      .query("units")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
    const unitName = new Map(units.map((u) => [u._id as string, u.name]));
    const occupiedUnits = new Set(active.map((t) => t.unitId).filter((id) => id && unitName.has(id)));

    const due: {
      _id: string;
      name: string;
      rent: number;
      paid: number;
      remaining: number;
      photoUrl: string | null;
      propertyName: string | null;
    }[] = [];
    const propertyName = new Map(properties.map((p) => [p._id as string, p.name]));
    const placeOf = (propertyId?: string, unitId?: string) => {
      if (!propertyId) return null;
      const place = propertyName.get(propertyId) ?? null;
      const unit = unitId ? unitName.get(unitId) : undefined;
      return place && unit ? `${place} · ${unit}` : place;
    };

    for (const t of tenants) {
      const paid = paidBy.get(t._id) ?? 0;
      const remaining = Math.max(0, t.rent - paid);
      left += remaining;
      if (remaining === 0) paidCount++;
      else
        due.push({
          _id: t._id,
          name: t.name,
          rent: t.rent,
          paid,
          remaining,
          photoUrl: t.photoId ? await ctx.storage.getUrl(t.photoId) : null,
          propertyName: placeOf(t.propertyId, t.unitId),
        });
    }
    due.sort((x, y) => y.remaining - x.remaining);

    return {
      startMonth,
      collected,
      expected,
      left,
      paidCount,
      tenantCount: tenants.length,
      propertyCount: properties.length,
      unitCount: units.length,
      vacantUnits: units.length - occupiedUnits.size,
      due,
    };
  },
});

export type ArrearsMonth = { month: string; rent: number; paid: number; remaining: number };
export type ArrearsTenant = {
  _id: string;
  name: string;
  photoUrl: string | null;
  propertyName: string | null;
  status: "active" | "former";
  remaining: number;
  months: ArrearsMonth[];
};

/**
 * Everything still owed from *past* months — every month since the workspace
 * joined, up to but excluding the running one. The running month lives on the
 * dashboard, so the two never double-count each other.
 */
export const arrears = query({
  // `today` is the caller's own current month: the server clock is UTC, and
  // around a month boundary the two disagree. Taking the earlier of the two
  // guarantees the running month is never counted here *and* on the dashboard.
  args: { workspaceId: v.id("users"), today: v.optional(v.string()) },
  handler: async (ctx, { workspaceId, today }) => {
    const a = await tryAccess(ctx, workspaceId);
    if (!a) return null;

    const startMonth = await startMonthOf(ctx, workspaceId);
    const serverMonth = monthOf(Date.now());
    const clientMonth = today && /^\d{4}-\d{2}$/.test(today) ? today : serverMonth;
    const currentMonth = clientMonth < serverMonth ? clientMonth : serverMonth;
    const lastPast = shiftMonth(currentMonth, -1);

    const { all } = await allTenants(ctx, workspaceId);
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
    const units = await ctx.db
      .query("units")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
    const unitName = new Map(units.map((u) => [u._id as string, u.name]));
    const propertyName = new Map(properties.map((p) => [p._id as string, p.name]));
    const placeOf = (propertyId?: string, unitId?: string) => {
      if (!propertyId) return null;
      const place = propertyName.get(propertyId) ?? null;
      const unit = unitId ? unitName.get(unitId) : undefined;
      return place && unit ? `${place} · ${unit}` : place;
    };

    const tenants: ArrearsTenant[] = [];
    const monthsSeen = new Set<string>();
    let total = 0;
    let oldest: string | null = null;

    for (const t of all) {
      const { from, to } = rentWindow(t, startMonth);
      const last = to === null ? lastPast : to < lastPast ? to : lastPast;
      const months = monthRange(from, last);
      if (months.length === 0) continue;

      const paidBy = new Map<string, number>();
      const paid = await ctx.db
        .query("payments")
        .withIndex("by_tenant", (q) => q.eq("tenantId", t._id))
        .collect();
      for (const p of paid) paidBy.set(p.month, (paidBy.get(p.month) ?? 0) + p.amount);

      const rows: ArrearsMonth[] = [];
      let owed = 0;
      for (const month of months) {
        const already = paidBy.get(month) ?? 0;
        const remaining = Math.max(0, t.rent - already);
        if (remaining === 0) continue;
        rows.push({ month, rent: t.rent, paid: already, remaining });
        owed += remaining;
        monthsSeen.add(month);
      }
      if (rows.length === 0) continue;

      total += owed;
      if (oldest === null || rows[0].month < oldest) oldest = rows[0].month;
      tenants.push({
        _id: t._id,
        name: t.name,
        photoUrl: t.photoId ? await ctx.storage.getUrl(t.photoId) : null,
        propertyName: placeOf(t.propertyId, t.unitId),
        status: t.status,
        remaining: owed,
        months: rows,
      });
    }

    tenants.sort((x, y) => y.remaining - x.remaining);
    return {
      startMonth,
      currentMonth,
      total,
      oldest,
      monthCount: monthsSeen.size,
      tenants,
    };
  },
});

/**
 * What a tenant still owes for one month, checked against everything already
 * recorded for it. Drives the payment sheet so the amount can never be typed
 * past the balance — past, present or future month alike.
 */
export const monthStatus = query({
  args: { tenantId: v.id("tenants"), month: v.string() },
  handler: async (ctx, { tenantId, month }) => {
    const t = await ctx.db.get(tenantId);
    if (!t) return null;
    const a = await tryAccess(ctx, t.workspaceId);
    if (!a) return null;
    const startMonth = await startMonthOf(ctx, t.workspaceId);
    const paid = await paidFor(ctx, tenantId, month);
    return {
      startMonth,
      rent: t.rent,
      paid,
      remaining: Math.max(0, t.rent - paid),
      blocked: monthProblem(t, startMonth, month),
    };
  },
});

/** How much is already recorded for this tenant in this month. */
async function paidFor(ctx: QueryCtx, tenantId: Id<"tenants">, month: string) {
  const rows = await ctx.db
    .query("payments")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
    .collect();
  return rows.filter((p) => p.month === month).reduce((s, p) => s + p.amount, 0);
}

/** Why this month is off-limits for this tenant, or null when it's fine. */
function monthProblem(t: Doc<"tenants">, startMonth: string, month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return "Pick the month this payment is for.";
  if (month < startMonth) {
    return `Rent tracking starts in ${labelMonth(startMonth)} — that's when this workspace joined Rent Ease.`;
  }
  const { from, to } = rentWindow(t, startMonth);
  if (month < from) {
    return `${t.name} only started renting in ${labelMonth(from)}, so there's no rent due before then.`;
  }
  if (to !== null && month > to) {
    return `${t.name} moved out in ${labelMonth(to)}, so no rent is due after that.`;
  }
  if (t.rent <= 0) return `${t.name} has no rent amount set. Add one on their profile first.`;
  return null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function labelMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1] ?? key} ${y}`;
}

/** Amounts inside error messages read in the workspace's own currency. */
function amountIn(currency: string, n: number) {
  const value = n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return currency.length > 1 ? `${currency} ${value}` : `${currency}${value}`;
}

export const add = mutation({
  args: {
    tenantId: v.id("tenants"),
    amount: v.number(),
    month: v.string(),
    paidOn: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { tenantId, amount, month, paidOn, note }) => {
    const t = await ctx.db.get(tenantId);
    if (!t) throw new ConvexError("Tenant not found.");
    await access(ctx, t.workspaceId, "edit");
    if (!Number.isFinite(amount) || amount <= 0) throw new ConvexError("Enter an amount above zero.");

    const owner = await ctx.db.get(t.workspaceId);
    const currency = owner?.currency ?? "$";
    const money = (n: number) => amountIn(currency, n);
    const startMonth = await startMonthOf(ctx, t.workspaceId);
    const problem = monthProblem(t, startMonth, month);
    if (problem) throw new ConvexError(problem);

    // Check what is already on the books for this month so the same rent can
    // never be recorded twice, whichever screen the payment came from.
    const paid = await paidFor(ctx, tenantId, month);
    const remaining = t.rent - paid;
    if (remaining <= 0) {
      throw new ConvexError(
        `${t.name} has already paid ${money(t.rent)} in full for ${labelMonth(month)}. Delete the existing payment first if it was a mistake.`,
      );
    }
    if (amount > remaining) {
      throw new ConvexError(
        `Only ${money(remaining)} is left for ${labelMonth(month)} — ${money(paid)} of ${money(t.rent)} is already recorded.`,
      );
    }

    return await ctx.db.insert("payments", {
      workspaceId: t.workspaceId,
      tenantId,
      amount,
      month,
      paidOn,
      note: clean(note),
    });
  },
});

export const remove = mutation({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, { paymentId }) => {
    const p = await ctx.db.get(paymentId);
    if (!p) return;
    await access(ctx, p.workspaceId, "full");
    await ctx.db.delete(paymentId);
  },
});
