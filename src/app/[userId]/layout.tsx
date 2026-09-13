"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BottomNav, Sidebar, SidebarProvider } from "@/components/AppNav";
import FontScaleSync from "@/components/FontScaleSync";
import { Splash, ToastProvider } from "@/components/ui";
import VerifyEmail from "@/components/VerifyEmail";
import WelcomeSheet from "@/components/WelcomeSheet";
import { BootError, useBootstrap } from "@/lib/bootstrap";
import { landingWorkspace, rememberWorkspace, WorkspaceProvider } from "@/lib/workspace";

/** Everything under /[userId] is a workspace: your own, or one you were added to. */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { userId } = useParams<{ userId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { workspaces, error, unverified } = useBootstrap();
  const valid = !!workspaces?.some((w) => w.workspaceId === userId);
  // Sheets portal into #sheet-root, so the welcome waits until it's mounted.
  const [sheetRoot, setSheetRoot] = useState<HTMLDivElement | null>(null);
  const invite = workspaces?.find((w) => w.isNew);

  // Unknown or no-longer-shared workspace in the URL → go somewhere you belong.
  useEffect(() => {
    if (workspaces?.length && !valid) router.replace(`/${landingWorkspace(workspaces).workspaceId}`);
  }, [workspaces, valid, router]);

  useEffect(() => {
    if (valid) rememberWorkspace(userId);
  }, [valid, userId]);

  if (error) return <BootError message={error} />;
  if (unverified) return <VerifyEmail />;
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
          <div id="sheet-root" ref={setSheetRoot} />
          {sheetRoot && invite && <WelcomeSheet invite={invite} />}
        </SidebarProvider>
      </ToastProvider>
    </WorkspaceProvider>
  );
}
