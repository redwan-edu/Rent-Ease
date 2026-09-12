"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  Archive,
  Building2,
  CalendarClock,
  ClipboardCheck,
  HandCoins,
  House,
  LogOut,
  NotebookPen,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@convex/_generated/api";
import { monthKey } from "@/lib/format";
import { roleLabel, useWorkspace } from "@/lib/workspace";
import { Avatar, Logo } from "./ui";

export const tabs = [
  { path: "/", label: "Home", Icon: House },
  { path: "/tenants", label: "Tenants", Icon: Users },
  { path: "/properties", label: "Properties", Icon: Building2 },
  { path: "/notes", label: "Notes", Icon: NotebookPen },
  { path: "/settings", label: "Settings", Icon: Settings },
];

/** Extra pages reachable from the sidebar only. */
const tools = [
  { path: "/audit", label: "Audit", Icon: ClipboardCheck },
  { path: "/collect", label: "Collect due", Icon: HandCoins },
  { path: "/arrears", label: "Past dues", Icon: CalendarClock },
  { path: "/archive", label: "Archive", Icon: Archive },
];

function useActiveTab() {
  const pathname = usePathname();
  const { to } = useWorkspace();
  return (path: string) => (path === "/" ? pathname === to("/") : pathname.startsWith(to(path)));
}

export function BottomNav() {
  const { to } = useWorkspace();
  const isActive = useActiveTab();
  return (
    <nav className="nav" aria-label="Main">
      {tabs.map(({ path, label, Icon }) => {
        const active = isActive(path);
        return (
          <Link key={path} href={to(path)} className={active ? "active" : ""}>
            <span className="nav-icon">
              <Icon size={19} strokeWidth={active ? 2.2 : 1.9} />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/* ─── Sidebar (slide-out menu) ─── */

const SidebarContext = createContext<{ open: boolean; setOpen: (open: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <SidebarContext.Provider value={{ open, setOpen }}>{children}</SidebarContext.Provider>;
}

export const useSidebar = () => useContext(SidebarContext);

export function Sidebar() {
  const { open, setOpen } = useSidebar();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { workspace, workspaces, switchTo, to, money } = useWorkspace();
  const isActive = useActiveTab();
  const close = () => setOpen(false);
  // Past dues carry their total, so the leftovers stay visible from anywhere.
  const arrears = useQuery(
    api.payments.arrears,
    open ? { workspaceId: workspace.workspaceId, today: monthKey() } : "skip",
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName || email || "You";

  return (
    <>
      <div className="drawer-backdrop" onClick={close} />
      <aside className="drawer" aria-label="Menu">
        <div className="drawer-head">
          <Link href={to("/")} className="brand" onClick={close}>
            <Logo size={32} />
            <span>Rent Ease</span>
          </Link>
          <button className="icon-btn plain" onClick={close} aria-label="Close menu">
            <X size={17} />
          </button>
        </div>

        <nav className="drawer-nav" aria-label="Tools">
          {tools.map(({ path, label, Icon }) => (
            <Link
              key={path}
              href={to(path)}
              className={`drawer-item${isActive(path) ? " active" : ""}`}
              onClick={close}
            >
              <Icon size={19} />
              <span style={{ flex: 1 }}>{label}</span>
              {path === "/arrears" && arrears && arrears.total > 0 && (
                <span className="badge warn">{money(arrears.total)}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="drawer-divider" />

        <nav className="drawer-nav" aria-label="Sections">
          {tabs.map(({ path, label, Icon }) => (
            <Link
              key={path}
              href={to(path)}
              className={`drawer-item${isActive(path) ? " active" : ""}`}
              onClick={close}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>

        {workspaces.length > 1 && (
          <div className="drawer-nav">
            <div className="drawer-label">Workspaces</div>
            {workspaces.map((w) => (
              <button
                key={w.workspaceId}
                className={`drawer-item${w.workspaceId === workspace.workspaceId ? " current" : ""}`}
                onClick={() => {
                  close();
                  switchTo(w.workspaceId);
                }}
              >
                <Users size={18} />
                <span style={{ flex: 1 }}>{w.role === "owner" ? "My workspace" : `${w.name}'s workspace`}</span>
                <span className="muted" style={{ fontSize: "calc(12px * var(--fs))" }}>
                  {roleLabel[w.role]}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="drawer-foot">
          <div className="drawer-user">
            <Avatar name={name} url={user?.imageUrl} size={48} />
            <div style={{ minWidth: 0 }}>
              <strong>{name}</strong>
              <span>{email}</span>
              <span className="badge" style={{ marginTop: 6 }}>
                {workspace.role === "owner" ? "My workspace" : `${workspace.name}'s workspace`} ·{" "}
                {roleLabel[workspace.role]}
              </span>
            </div>
          </div>
          <button className="btn btn-secondary btn-block" onClick={() => signOut({ redirectUrl: "/" })}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
