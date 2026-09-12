"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Splash } from "@/components/ui";
import { BootError, useBootstrap } from "@/lib/bootstrap";

/** After sign-in: send the user to their own workspace at /[userId]. */
export default function OpenApp() {
  const { workspaces, error } = useBootstrap();
  const router = useRouter();

  useEffect(() => {
    // The first workspace is always the user's own.
    if (workspaces?.length) router.replace(`/${workspaces[0].workspaceId}`);
  }, [workspaces, router]);

  if (error) return <BootError message={error} />;
  return <Splash />;
}
