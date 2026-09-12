import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export type Role = "owner" | "full" | "edit" | "read";

// read: view only · edit: add + edit · full: also remove/delete · owner: also manage team
const rank: Record<Role, number> = { read: 0, edit: 1, full: 2, owner: 3 };

type Ctx = QueryCtx | MutationCtx;

export async function getMe(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

export async function roleIn(
  ctx: Ctx,
  me: Doc<"users">,
  workspaceId: Id<"users">,
): Promise<Role | null> {
  if (me._id === workspaceId) return "owner";
  if (!me.email) return null;
  const member = await ctx.db
    .query("members")
    .withIndex("by_workspace_email", (q) =>
      q.eq("workspaceId", workspaceId).eq("email", me.email),
    )
    .unique();
  return member?.role ?? null;
}

/** For queries: returns null instead of throwing so the UI can render empty states. */
export async function tryAccess(ctx: Ctx, workspaceId: Id<"users">) {
  const me = await getMe(ctx);
  if (!me) return null;
  const role = await roleIn(ctx, me, workspaceId);
  if (!role) return null;
  return { me, role };
}

/** For mutations: throws unless the caller has at least `need` in the workspace. */
export async function access(ctx: Ctx, workspaceId: Id<"users">, need: Role) {
  const me = await getMe(ctx);
  if (!me) throw new ConvexError("You are not signed in.");
  const role = await roleIn(ctx, me, workspaceId);
  if (!role || rank[role] < rank[need]) {
    throw new ConvexError("You don't have permission to do that.");
  }
  return { me, role };
}

/** The active tenant renting a unit, if any. */
export async function unitOccupant(ctx: Ctx, unitId: Id<"units">) {
  const tenants = await ctx.db
    .query("tenants")
    .withIndex("by_unit", (q) => q.eq("unitId", unitId))
    .collect();
  return tenants.find((t) => t.status === "active") ?? null;
}

/**
 * A tenant placed in a property must be in one of its units, and that unit
 * must not already be rented to another current tenant.
 */
export async function checkPlacement(
  ctx: MutationCtx,
  workspaceId: Id<"users">,
  propertyId: Id<"properties"> | undefined,
  unitId: Id<"units"> | undefined,
  tenantId?: Id<"tenants">,
) {
  if (!propertyId) {
    if (unitId) throw new ConvexError("Choose a property for this unit.");
    return;
  }
  const property = await ctx.db.get(propertyId);
  if (!property || property.workspaceId !== workspaceId) throw new ConvexError("Property not found.");
  if (!unitId) throw new ConvexError("Choose which unit the tenant is renting.");
  const unit = await ctx.db.get(unitId);
  if (!unit || unit.propertyId !== propertyId) throw new ConvexError("That unit isn't part of this property.");
  const occupant = await unitOccupant(ctx, unitId);
  if (occupant && occupant._id !== tenantId) {
    throw new ConvexError(`${unit.name} is already rented to ${occupant.name}.`);
  }
}

export function clean(s: string | undefined) {
  const t = s?.trim();
  return t ? t : undefined;
}

/* ─── Months ─── */

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM" for a timestamp (UTC — the server has no user timezone). */
export function monthOf(ts: number) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** Inclusive list of months from `from` to `to`; empty when `from` is after `to`. */
export function monthRange(from: string, to: string) {
  const out: string[] = [];
  for (let m = from; m <= to; m = shiftMonth(m, 1)) {
    out.push(m);
    if (out.length > 600) break; // 50 years is plenty; never spin forever
  }
  return out;
}

/**
 * The months a tenant can owe rent for: never before the workspace started
 * using the app, never before they moved in, never after they moved out.
 * `to` is null when the tenant has no end (still renting).
 */
export function rentWindow(tenant: Doc<"tenants">, startMonth: string) {
  const moveIn = tenant.moveInDate?.slice(0, 7);
  // With no move-in date we fall back to when the tenant was recorded, so
  // adding a tenant never invents months of debt behind them.
  const from = [startMonth, moveIn ?? monthOf(tenant._creationTime)].sort().pop() as string;
  const moveOut = tenant.moveOutDate?.slice(0, 7);
  // A former tenant with no move-out date on record only owes their first
  // month — better to under-count than to invent debt for someone who left.
  const to = tenant.status === "former" ? (moveOut && moveOut > from ? moveOut : from) : null;
  return { from, to };
}

export function inRentWindow(tenant: Doc<"tenants">, startMonth: string, month: string) {
  const { from, to } = rentWindow(tenant, startMonth);
  return month >= from && (to === null || month <= to);
}

/** The month this workspace started tracking rent: when the owner joined. */
export async function startMonthOf(ctx: Ctx, workspaceId: Id<"users">) {
  const owner = await ctx.db.get(workspaceId);
  return monthOf(owner?._creationTime ?? Date.now());
}

/** Active and former tenants in one list. */
export async function allTenants(ctx: Ctx, workspaceId: Id<"users">) {
  const active = await ctx.db
    .query("tenants")
    .withIndex("by_workspace_status", (q) => q.eq("workspaceId", workspaceId).eq("status", "active"))
    .collect();
  const former = await ctx.db
    .query("tenants")
    .withIndex("by_workspace_status", (q) => q.eq("workspaceId", workspaceId).eq("status", "former"))
    .collect();
  return { active, former, all: [...active, ...former] };
}
