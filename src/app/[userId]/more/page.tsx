"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  Archive,
  CalendarClock,
  ChevronRight,
  DoorOpen,
  LogOut,
  Receipt,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import Header from "@/components/Header";
import { Avatar, Section } from "@/components/ui";
import { monthKey } from "@/lib/format";
import { roleLabel, useWorkspace } from "@/lib/workspace";

/** Everything that isn't a daily task, each with one line saying what it's for. */
export default function MorePage() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { workspace, workspaces, switchTo, to, money } = useWorkspace();
  const arrears = useQuery(api.payments.arrears, {
    workspaceId: workspace.workspaceId,
    today: monthKey(),
  });
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName || email || "You";

  const links = [
    {
      path: "/arrears",
      label: "Past dues",
      text: "Rent still owed from earlier months",
      Icon: CalendarClock,
      badge: arrears && arrears.total > 0 ? money(arrears.total) : null,
    },
    {
      path: "/payments",
      label: "Payments",
      text: "Search, filter and sort every payment ever recorded",
      Icon: Receipt,
      badge: null,
    },
    {
      path: "/audit",
      label: "All units",
      text: "Every unit, who rents it and whether they paid",
      Icon: DoorOpen,
      badge: null,
    },
    {
      path: "/archive",
      label: "Archive",
      text: "Deleted tenants, kept with their full history",
      Icon: Archive,
      badge: null,
    },
    {
      path: "/settings",
      label: "Settings",
      text: "Profile, text size, notifications, currency and team",
      Icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      <Header title="More" />
      <div className="page">
        <div className="card account">
          <Avatar name={name} url={user?.imageUrl} size={44} />
          <div className="row-main">
            <div className="row-title">{name}</div>
            <div className="row-sub">{email}</div>
          </div>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => openUserProfile()}
          >
            Manage
          </button>
        </div>

        {workspaces.length > 1 && (
          <Section title="Workspaces">
            <div className="card list">
              {workspaces.map((w) => {
                const current = w.workspaceId === workspace.workspaceId;
                return (
                  <button
                    key={w.workspaceId}
                    className={`row${current ? " on" : ""}`}
                    aria-pressed={current}
                    onClick={() => switchTo(w.workspaceId)}
                  >
                    <span className="radio" />
                    <div className="row-main">
                      <div className="row-title">
                        {w.role === "owner"
                          ? "My workspace"
                          : `${w.name}'s workspace`}
                      </div>
                      <div className="row-sub">
                        {roleLabel[w.role]}
                        {w.restricted ? ", selected properties only" : ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        <div className="card list">
          {links.map(({ path, label, text, Icon, badge }) => (
            <Link key={path} href={to(path)} className="row">
              <span className="row-icon">
                <Icon size={18} />
              </span>
              <div className="row-main">
                <div className="row-title">{label}</div>
                <div className="row-sub wrap">{text}</div>
              </div>
              {badge && <span className="badge warn">{badge}</span>}
              <ChevronRight size={18} className="chev" />
            </Link>
          ))}
        </div>

        <button
          className="btn btn-secondary btn-block"
          onClick={() => signOut({ redirectUrl: "/" })}
        >
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </>
  );
}
