"use client";

import { useMutation } from "convex/react";
import { BellRing, Share } from "lucide-react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { errorMessage } from "@/lib/format";
import { enablePush, pushState } from "@/lib/push";
import { useToast } from "./ui";

/** Nudges the user to allow browser notifications so reminders reach their phone. */
export default function PushPrompt() {
  const subscribe = useMutation(api.pushData.subscribe);
  const toast = useToast();
  const [state, setState] = useState(pushState);
  const [busy, setBusy] = useState(false);

  if (state === "granted" || state === "unsupported") return null;

  if (state === "ios-install") {
    return (
      <div className="hint">
        <Share size={18} />
        <div>
          <strong>Get reminders on your iPhone</strong>
          Tap Share → Add to Home Screen, then open Rent Ease from your Home Screen.
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="hint">
        <BellRing size={18} />
        <div>
          <strong>Notifications are blocked</strong>
          Allow notifications for this site in your browser settings to get reminders.
        </div>
      </div>
    );
  }

  return (
    <div className="hint">
      <BellRing size={18} />
      <div>
        <strong>Get reminders on this device</strong>
        We&apos;ll notify you when a reminder is due.
      </div>
      <button
        className="btn btn-sm btn-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await enablePush(subscribe);
            toast("Notifications turned on");
          } catch (e) {
            toast(errorMessage(e));
          }
          setState(pushState());
          setBusy(false);
        }}
      >
        Enable
      </button>
    </div>
  );
}
