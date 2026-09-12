export type PushState = "unsupported" | "ios-install" | "default" | "granted" | "denied";

export function pushState(): PushState {
  if (typeof window === "undefined") return "unsupported";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission === "default" ? "default" : Notification.permission;
}

function keyToBytes(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

type Save = (sub: { endpoint: string; p256dh: string; auth: string }) => Promise<unknown>;

/** Asks for permission (if needed), subscribes this device and saves the subscription. */
export async function enablePush(save: Save) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications are blocked. Allow them in your browser settings.");
  }
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let sub = await registration.pushManager.getSubscription();
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
  }
  const json = sub.toJSON();
  await save({ endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth });
}

export async function disablePush(remove: (args: { endpoint: string }) => Promise<unknown>) {
  const registration = await navigator.serviceWorker.getRegistration();
  const sub = await registration?.pushManager.getSubscription();
  if (!sub) return;
  await remove({ endpoint: sub.endpoint });
  await sub.unsubscribe();
}

export async function hasSubscription() {
  if (pushState() !== "granted") return false;
  const registration = await navigator.serviceWorker.getRegistration();
  return !!(await registration?.pushManager.getSubscription());
}
