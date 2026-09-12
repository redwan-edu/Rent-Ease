"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import { Splash } from "@/components/ui";
import { errorMessage } from "./format";
import { enablePush, pushState } from "./push";

/**
 * Signs the user into Convex, creates/refreshes their record and loads the
 * workspaces they can open. Signed-out visitors are sent to /sign-in.
 */
export function useBootstrap() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const store = useMutation(api.users.store);
  const subscribe = useMutation(api.pushData.subscribe);
  const [stored, setStored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const workspaces = useQuery(api.workspaces.list, stored ? {} : "skip");

  useEffect(() => {
    if (clerkLoaded && !isSignedIn) router.replace("/sign-in");
  }, [clerkLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    store()
      .then(() => alive && setStored(true))
      .catch((e) => alive && setError(errorMessage(e)));
    // Keep this device's push subscription fresh if notifications are already allowed.
    if (pushState() === "granted") enablePush(subscribe).catch(() => {});
    return () => {
      alive = false;
    };
  }, [isAuthenticated, store, subscribe]);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const failed =
    error ??
    (isSignedIn && !isLoading && !isAuthenticated && slow
      ? "We couldn't connect your account. Please sign in again."
      : null);

  return { workspaces, error: failed };
}

export function BootError({ message }: { message: string }) {
  const { signOut } = useClerk();
  return (
    <Splash
      message={message}
      action={
        <button className="btn btn-secondary" onClick={() => signOut({ redirectUrl: "/sign-in" })}>
          Sign in again
        </button>
      }
    />
  );
}
