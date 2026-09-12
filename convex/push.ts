"use node";

import webpush from "web-push";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

export const sendForNote = internalAction({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return;
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:noreply@rentease.app",
      publicKey,
      privateKey,
    );

    const data = await ctx.runQuery(internal.pushData.forNote, { noteId });
    if (!data) return;
    const payload = JSON.stringify({ title: data.title, body: data.body, url: `/${data.workspaceId}/notes`, tag: noteId });

    await Promise.all(
      data.subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await ctx.runMutation(internal.pushData.removeSub, { id: s._id });
          }
        }
      }),
    );
  },
});
