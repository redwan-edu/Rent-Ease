"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { BottomNav, Sidebar, SidebarProvider } from "@/components/AppNav";
import FontScaleSync from "@/components/FontScaleSync";
import { Splash, ToastProvider } from "@/components/ui";
import { BootError, useBootstrap } from "@/lib/bootstrap";
import { WorkspaceProvider } from "@/lib/workspace";

/** Everything under /[userId] is a workspace: your own, or one you were added to. */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { userId } = useParams<{ userId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { workspaces, error } = useBootstrap();
  const valid = !!workspaces?.some((w) => w.workspaceId === userId);

  // Unknown or no-longer-shared workspace in the URL → go to your own.
  useEffect(() => {
    if (workspaces?.length && !valid) router.replace(`/${workspaces[0].workspaceId}`);
  }, [workspaces, valid, router]);

  if (error) return <BootError message={error} />;
  if (!workspaces || !valid) return <Splash />;

  const section = pathname.slice(userId.length + 1) || "/";
  const hideNav = /\/(new|edit)$|\/family\//.test(section);

  return (
    <WorkspaceProvider workspaces={workspaces} workspaceId={userId}>
      <ToastProvider>
        <SidebarProvider>
          <main className={`scroll${hideNav ? " no-nav" : ""}`}>{children}</main>
          {!hideNav && <BottomNav />}
          <Sidebar />
          <FontScaleSync />
          <div id="sheet-root" />
        </SidebarProvider>
      </ToastProvider>
    </WorkspaceProvider>
  );
}
