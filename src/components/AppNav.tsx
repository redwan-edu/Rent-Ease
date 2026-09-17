"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import {
  Building2,
  House,
  LogOut,
  Menu,
  NotebookPen,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/lib/workspace";
import { Avatar, Logo } from "./ui";

/** The five places in the app. Pages opened from a tab keep that tab lit. */
const tabs = [
  { path: "/", label: "Home", Icon: House, also: ["/collect"] },
  { path: "/tenants", label: "Tenants", Icon: Users, also: [] },
  { path: "/properties", label: "Properties", Icon: Building2, also: [] },
  { path: "/notes", label: "Notes", Icon: NotebookPen, also: [] },
  {
    path: "/more",
    label: "More",
    Icon: Menu,
    also: ["/arrears", "/payments", "/audit", "/archive", "/settings"],
  },
];

/** Bottom bar on phones; a side rail on wide screens (see .nav in globals.css). */
export function BottomNav() {
  const pathname = usePathname();
  const { to } = useWorkspace();
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName || email || "You";

  const section = pathname.slice(to("/").length) || "/";
  const isActive = (paths: string[]) =>
    paths.some((p) => (p === "/" ? section === "/" : section.startsWith(p)));

  return (
    <nav className="nav" aria-label="Main">
      <Link href="/" className="nav-brand">
        <Logo size={24} />
        <span>Rent Ease</span>
      </Link>

      <div className="nav-links">
        {tabs.map(({ path, label, Icon, also }) => {
          const active = isActive([path, ...also]);
          return (
            <Link
              key={path}
              href={to(path)}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
            >
              <span className="nav-icon">
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>

      <div className="nav-foot">
        <div className="card nav-account">
          <div className="nav-account-row">
            <Avatar name={name} url={user?.imageUrl} size={36} />
            <div className="nav-account-info">
              <div className="nav-account-name">{name}</div>
              <div className="nav-account-email">{email}</div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-secondary btn-block nav-account-manage"
            onClick={() => openUserProfile()}
          >
            Manage
          </button>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-block nav-signout"
          onClick={() => signOut({ redirectUrl: "/" })}
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </nav>
  );
}
