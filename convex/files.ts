import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { access } from "./lib";

export const generateUploadUrl = mutation({
  args: { workspaceId: v.id("users") },
  handler: async (ctx, { workspaceId }) => {
    await access(ctx, workspaceId, "edit");
    return await ctx.storage.generateUploadUrl();
  },
});
