import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const roleValidator = v.union(
  v.literal("full"),
  v.literal("edit"),
  v.literal("read"),
);

export const fontScale = v.union(v.literal("sm"), v.literal("md"), v.literal("lg"), v.literal("xl"));

export const propertyKind = v.union(
  v.literal("villa"),
  v.literal("house"),
  v.literal("apartment"),
  v.literal("other"),
);

export default defineSchema({
  // Every user also owns a workspace of their own (workspaceId === users._id).
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.string(),
    // From Clerk. Team access is granted by email, so an address Clerk
    // reports as unverified never unlocks someone else's workspace.
    emailVerified: v.optional(v.boolean()),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    currency: v.optional(v.string()),
    // Personal text size, applied wherever this user signs in.
    fontScale: v.optional(fontScale),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  // Subordinates added by email into an owner's workspace.
  members: defineTable({
    workspaceId: v.id("users"),
    email: v.string(),
    role: roleValidator,
    // Limits the member to these properties and the tenants placed in them.
    // Absent means every property; an empty list means none.
    propertyIds: v.optional(v.array(v.id("properties"))),
    // When the member first saw the "you've been added" welcome.
    seenAt: v.optional(v.number()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_email", ["email"])
    .index("by_workspace_email", ["workspaceId", "email"]),

  properties: defineTable({
    workspaceId: v.id("users"),
    name: v.string(),
    address: v.optional(v.string()),
    kind: propertyKind,
    notes: v.optional(v.string()),
  }).index("by_workspace", ["workspaceId"]),

  // Rentable units inside a property (flats, rooms, floors…), each with its own name.
  units: defineTable({
    workspaceId: v.id("users"),
    propertyId: v.id("properties"),
    name: v.string(),
  })
    .index("by_property", ["propertyId"])
    .index("by_workspace", ["workspaceId"]),

  tenants: defineTable({
    workspaceId: v.id("users"),
    propertyId: v.optional(v.id("properties")),
    unitId: v.optional(v.id("units")),
    name: v.string(),
    phone: v.string(),
    residents: v.number(),
    rent: v.number(),
    condition: v.string(),
    photoId: v.optional(v.id("_storage")),
    documents: v.array(
      v.object({
        storageId: v.id("_storage"),
        label: v.string(),
        contentType: v.optional(v.string()),
      }),
    ),
    status: v.union(v.literal("active"), v.literal("former")),
    moveInDate: v.optional(v.string()),
    moveOutDate: v.optional(v.string()),
  })
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_property", ["propertyId"])
    .index("by_unit", ["unitId"]),

  // People living with a tenant. Linked to the tenant, not the property.
  familyMembers: defineTable({
    workspaceId: v.id("users"),
    tenantId: v.id("tenants"),
    name: v.string(),
    age: v.number(),
    phone: v.string(),
    job: v.optional(v.string()),
    photoId: v.optional(v.id("_storage")),
    nidPhotoIds: v.array(v.id("_storage")), // front, and optionally back
  }).index("by_tenant", ["tenantId"]),

  payments: defineTable({
    workspaceId: v.id("users"),
    tenantId: v.id("tenants"),
    month: v.string(), // YYYY-MM
    amount: v.number(),
    paidOn: v.string(), // YYYY-MM-DD
    note: v.optional(v.string()),
    // Who entered it — accountability when a team shares one workspace.
    recordedBy: v.optional(v.id("users")),
  })
    .index("by_workspace_month", ["workspaceId", "month"])
    .index("by_tenant", ["tenantId"]),

  // Notes: free-form records with an optional reminder.
  notes: defineTable({
    workspaceId: v.id("users"),
    body: v.string(),
    tenantId: v.optional(v.id("tenants")),
    propertyId: v.optional(v.id("properties")),
    remindAt: v.optional(v.number()),
    reminderJobId: v.optional(v.id("_scheduled_functions")),
    fired: v.boolean(),
    seen: v.boolean(),
    done: v.boolean(),
    createdBy: v.id("users"),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_fired", ["workspaceId", "fired"])
    .index("by_tenant", ["tenantId"])
    .index("by_property", ["propertyId"]),

  /**
   * Deleting a tenant never destroys anything: their whole record — profile,
   * family, every payment, every note and every uploaded file — is snapshotted
   * here first. Kept as proof if the tenant ever disputes something later.
   */
  archivedTenants: defineTable({
    workspaceId: v.id("users"),
    // Denormalised so the archive list reads without unpacking the snapshot.
    name: v.string(),
    phone: v.string(),
    placeName: v.optional(v.string()),
    movedInOn: v.optional(v.string()),
    movedOutOn: v.optional(v.string()),
    totalPaid: v.number(),
    paymentCount: v.number(),
    archivedAt: v.number(),
    archivedBy: v.id("users"),
    archivedByName: v.string(),
    reason: v.optional(v.string()),
    // Verbatim copies of the deleted documents.
    tenant: v.any(),
    family: v.any(),
    payments: v.any(),
    notes: v.any(),
    // Every file kept alive for this archive; only a purge deletes them.
    storageIds: v.array(v.id("_storage")),
  }).index("by_workspace", ["workspaceId"]),

  /**
   * System announcements shown to every user in the notification panel. The
   * admin manages this table straight from the Convex dashboard: add a row to
   * broadcast a message, delete the row to withdraw it.
   */
  admin_message: defineTable({
    title: v.string(),
    body: v.string(),
    // Optional: an https:// link or an in-app path like "/app".
    link: v.optional(v.string()),
  }),

  /**
   * Notifications each user has already seen or cleared, so they never show up
   * for that person again. Per user — a teammate's reads don't affect yours.
   */
  notificationReads: defineTable({
    userId: v.id("users"),
    // "note:<noteId>:<remindAt>" or "admin:<messageId>"
    key: v.string(),
  }).index("by_user_key", ["userId", "key"]),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),
});
