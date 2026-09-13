"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Splash } from "@/components/ui";
import VerifyEmail from "@/components/VerifyEmail";
import { BootError, useBootstrap } from "@/lib/bootstrap";
import { landingWorkspace } from "@/lib/workspace";

/** After sign-in: open the right workspace at /[userId]. */
export default function OpenApp() {
  const { workspaces, error, unverified } = useBootstrap();
  const router = useRouter();

  useEffect(() => {
    if (workspaces?.length) router.replace(`/${landingWorkspace(workspaces).workspaceId}`);
  }, [workspaces, router]);

  if (error) return <BootError message={error} />;
  if (unverified) return <VerifyEmail />;
  return <Splash />;
}
