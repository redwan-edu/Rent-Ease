"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { Role } from "@convex/lib";
import type { WorkspaceInfo } from "@convex/workspaces";
import { formatMoney, monthKey } from "./format";

const rank: Record<Role, number> = { read: 0, edit: 1, full: 2, owner: 3 };

export const roleLabel: Record<Role, string> = {
  owner: "Owner",
  full: "Full access",
  edit: "Edit access",
  read: "Read only",
};

type WorkspaceContextValue = {
  workspace: WorkspaceInfo;
  workspaces: WorkspaceInfo[];
  switchTo: (id: string) => void;
  can: (need: Role) => boolean;
  money: (n: number) => string;
  /** Builds an in-app URL for the current workspace, e.g. to("/tenants") → "/<id>/tenants". */
  to: (path: string) => string;
  /** "YYYY-MM" this workspace joined: rent is never tracked before it. */
  startMonth: string;
  /** The current month, unless the workspace is somehow newer than today. */
  endMonth: string;
  /** Clamps a month key into [startMonth, endMonth]. */
  clampMonth: (month: string) => string;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const LAST_KEY = "rent-ease:last-workspace";

/** Remembers the workspace this device last opened, so the app reopens there. */
export function rememberWorkspace(id: string) {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    // Storage unavailable (private mode) — landing just falls back.
  }
}

/**
 * Where to land after sign-in: the workspace last opened on this device;
 * otherwise a shared workspace when your own has nothing in it yet — so a new
 * team member opens the workspace they were invited to, not an empty one.
 */
export function landingWorkspace(workspaces: WorkspaceInfo[]) {
  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST_KEY);
  } catch {
    last = null;
  }
  const remembered = workspaces.find((w) => w.workspaceId === last);
  if (remembered) return remembered;
  const [own, ...shared] = workspaces;
  return own.empty && shared.length > 0 ? shared[0] : own;
}

/** The workspace comes from the URL (/[userId]/…); the layout guarantees it's one of `workspaces`. */
export function WorkspaceProvider({
  workspaces,
  workspaceId,
  children,
}: {
  workspaces: WorkspaceInfo[];
  workspaceId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const workspace = workspaces.find((w) => w.workspaceId === workspaceId) ?? workspaces[0];

  const switchTo = useCallback((id: string) => router.push(`/${id}`), [router]);

  const value = useMemo<WorkspaceContextValue>(() => {
    const base = `/${workspace.workspaceId}`;
    const startMonth = workspace.startMonth;
    const today = monthKey();
    const endMonth = today < startMonth ? startMonth : today;
    return {
      workspace,
      workspaces,
      switchTo,
      can: (need) => rank[workspace.role] >= rank[need],
      money: (n) => formatMoney(n, workspace.currency),
      to: (path) => (path === "/" ? base : `${base}${path}`),
      startMonth,
      endMonth,
      clampMonth: (month) => (month < startMonth ? startMonth : month),
    };
  }, [workspace, workspaces, switchTo]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
