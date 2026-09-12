import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { access, clean, tryAccess } from "./lib";

const MAX_NID_PHOTOS = 2;

const fields = {
  name: v.string(),
  age: v.number(),
  phone: v.string(),
  job: v.optional(v.string()),
  photoId: v.optional(v.id("_storage")),
  nidPhotoIds: v.array(v.id("_storage")),
};

type Fields = {
  name: string;
  age: number;
  phone: string;
  job?: string;
  photoId?: Id<"_storage">;
  nidPhotoIds: Id<"_storage">[];
};

function normalize(f: Fields) {
  const name = f.name.trim();
  const phone = f.phone.trim();
  if (!name) throw new ConvexError("Enter their name.");
  if (!Number.isInteger(f.age) || f.age < 0 || f.age > 130) throw new ConvexError("Enter a valid age.");
  if (!phone) throw new ConvexError("Enter a phone number.");
  if (f.nidPhotoIds.length === 0) throw new ConvexError("Add a photo of their NID.");
  if (f.nidPhotoIds.length > MAX_NID_PHOTOS) throw new ConvexError("Add up to two NID photos (front and back).");
  return { name, age: f.age, phone, job: clean(f.job), photoId: f.photoId, nidPhotoIds: f.nidPhotoIds };
}

/** Every family member of a tenant, with their photo and NID images — for the gallery. */
export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const t = await ctx.db.get(tenantId);
    if (!t || !(await tryAccess(ctx, t.workspaceId))) return [];
    const members = await ctx.db
      .query("familyMembers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
    return Promise.all(
      members.map(async (m) => ({
        _id: m._id,
        name: m.name,
        photoUrl: m.photoId ? await ctx.storage.getUrl(m.photoId) : null,
        nid: await Promise.all(
          m.nidPhotoIds.map(async (storageId) => ({ storageId, url: await ctx.storage.getUrl(storageId) })),
        ),
      })),
    );
  },
});

export const get = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, { memberId }) => {
    const m = await ctx.db.get(memberId);
    if (!m || !(await tryAccess(ctx, m.workspaceId))) return null;
    const tenant = await ctx.db.get(m.tenantId);
    return {
      ...m,
      tenantName: tenant?.name ?? null,
      photoUrl: m.photoId ? await ctx.storage.getUrl(m.photoId) : null,
      nid: await Promise.all(
        m.nidPhotoIds.map(async (storageId) => ({ storageId, url: await ctx.storage.getUrl(storageId) })),
      ),
    };
  },
});

export const create = mutation({
  args: { tenantId: v.id("tenants"), ...fields },
  handler: async (ctx, { tenantId, ...f }) => {
    const t = await ctx.db.get(tenantId);
    if (!t) throw new ConvexError("Tenant not found.");
    await access(ctx, t.workspaceId, "edit");
    return await ctx.db.insert("familyMembers", { workspaceId: t.workspaceId, tenantId, ...normalize(f) });
  },
});

export const update = mutation({
  args: { memberId: v.id("familyMembers"), ...fields },
  handler: async (ctx, { memberId, ...f }) => {
    const m = await ctx.db.get(memberId);
    if (!m) throw new ConvexError("Family member not found.");
    await access(ctx, m.workspaceId, "edit");
    const data = normalize(f);
    const keep = new Set<string>([...(data.photoId ? [data.photoId] : []), ...data.nidPhotoIds]);
    for (const id of [...(m.photoId ? [m.photoId] : []), ...m.nidPhotoIds]) {
      if (!keep.has(id)) await ctx.storage.delete(id);
    }
    await ctx.db.patch(memberId, data);
  },
});

export const remove = mutation({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, { memberId }) => {
    const m = await ctx.db.get(memberId);
    if (!m) return;
    await access(ctx, m.workspaceId, "full");
    for (const id of [...(m.photoId ? [m.photoId] : []), ...m.nidPhotoIds]) await ctx.storage.delete(id);
    await ctx.db.delete(memberId);
  },
});
