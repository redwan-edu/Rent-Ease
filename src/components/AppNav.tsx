"use client";

import { Building2, House, Menu, NotebookPen, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/lib/workspace";
import { Logo } from "./ui";

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
  const section = pathname.slice(to("/").length) || "/";
  const isActive = (paths: string[]) =>
    paths.some((p) => (p === "/" ? section === "/" : section.startsWith(p)));

  return (
    <nav className="nav" aria-label="Main">
      <Link href={to("/")} className="nav-brand">
        <Logo size={28} />
        Rent Ease
      </Link>
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
    </nav>
  );
}
