"use client";

import { useMutation, useQuery } from "convex/react";
import { AlarmClock, Bell, BellOff, ChevronLeft, ExternalLink, Megaphone, Menu, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@convex/_generated/api";
import type { NotificationItem } from "@convex/notifications";
import { whenLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { useSidebar } from "./AppNav";
import { Empty, Sheet, useToast } from "./ui";

/**
 * Top bar. Main sections show the Rent Ease brand with the menu button and the
 * page title underneath; sub pages (with `back`) show a compact back bar.
 */
export default function Header({
  title,
  eyebrow,
  back,
  actions,
  bell = true,
}: {
  title?: string;
  eyebrow?: string;
  back?: string;
  actions?: ReactNode;
  bell?: boolean;
}) {
  const { to } = useWorkspace();
  const { setOpen } = useSidebar();

  if (back) {
    return (
      <header className="header compact">
        <Link href={to(back)} className="icon-btn" aria-label="Back">
          <ChevronLeft size={20} />
        </Link>
        <div className="header-text">
          <h1 className="header-title">{title}</h1>
        </div>
        <div className="header-actions">
          {actions}
          {bell && <NotificationBell />}
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="header brand-bar">
        <button
          className="icon-btn"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={19} />
        </button>
        <Link href={to("/")} className="brand">
          <span>Rent Ease</span>
        </Link>
        <div className="header-actions">
          {actions}
          {bell && <NotificationBell />}
        </div>
      </header>
      <div className="title-block">
        {eyebrow && <div className="header-eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
      </div>
    </>
  );
}

/** Only http(s) links or in-app paths — never javascript: or data: URLs from a dashboard row. */
function safeLink(link: string | null) {
  if (!link) return null;
  if (link.startsWith("/") && !link.startsWith("//")) return link;
  try {
    const url = new URL(link);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function NotificationBell() {
  const { workspace, can, to } = useWorkspace();
  const workspaceId = workspace.workspaceId;
  const data = useQuery(api.notifications.list, { workspaceId });
  const markRead = useMutation(api.notifications.markRead);
  const setDone = useMutation(api.notes.setDone);
  const router = useRouter();
  const toast = useToast();
  // What the open panel is showing. Opening marks everything in it as read for
  // this user, so it stays put for this visit and never comes back afterwards.
  const [shown, setShown] = useState<NotificationItem[] | null>(null);
  const unread = data?.items ?? [];

  // Pop a toast when something new arrives while the app is open.
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!data) return;
    const fresh = known.current ? data.items.find((i) => !known.current!.has(i.key)) : undefined;
    if (fresh) toast(fresh.kind === "admin" ? fresh.title : `Reminder: ${fresh.body.slice(0, 60)}`);
    known.current = new Set(data.items.map((i) => i.key));
  }, [data, toast]);

  const openPanel = () => {
    setShown(unread);
    if (unread.length > 0) markRead({ keys: unread.map((i) => i.key) }).catch(() => {});
  };

  const clear = (key: string) => setShown((items) => items?.filter((i) => i.key !== key) ?? null);

  const follow = (link: string) => {
    setShown(null);
    if (link.startsWith("/")) router.push(link);
    else window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <button
        className="icon-btn"
        onClick={openPanel}
        aria-label={unread.length > 0 ? `Notifications, ${unread.length} new` : "Notifications"}
      >
        <Bell size={18} />
        {unread.length > 0 && <span className="bell-dot">{unread.length > 9 ? "9+" : unread.length}</span>}
      </button>
      {shown && (
        <Sheet title="Notifications" onClose={() => setShown(null)}>
          {shown.length === 0 ? (
            <Empty
              icon={<BellOff size={22} />}
              title="You're all caught up"
              text="Due reminders from your notes and messages from Rent Ease show up here."
            />
          ) : (
            <div className="card list">
              {shown.map((n) => {
                if (n.kind === "admin") {
                  const link = safeLink(n.link);
                  return (
                    <div className="row notif" key={n.key}>
                      <span className="row-icon ok">
                        <Megaphone size={18} />
                      </span>
                      <div className="row-main">
                        <div className="row-title">{n.title}</div>
                        <div className="row-sub notif-body">{n.body}</div>
                        {link && (
                          <button className="notif-link" onClick={() => follow(link)}>
                            Open <ExternalLink size={13} />
                          </button>
                        )}
                      </div>
                      <button className="icon-btn sm plain" onClick={() => clear(n.key)} aria-label="Remove notification">
                        <X size={15} />
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="row notif" key={n.key}>
                    <span className="row-icon warn">
                      <AlarmClock size={18} />
                    </span>
                    <button
                      className="row-main"
                      onClick={() => {
                        setShown(null);
                        router.push(to("/notes"));
                      }}
                    >
                      <div className="row-title clamp-2">{n.body}</div>
                      <div className="row-sub">
                        {whenLabel(n.remindAt ?? undefined)}
                        {n.tenantName ? ` · ${n.tenantName}` : n.propertyName ? ` · ${n.propertyName}` : ""}
                      </div>
                    </button>
                    {can("edit") && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          clear(n.key);
                          setDone({ noteId: n.noteId, done: true }).catch(() => toast("Couldn't mark that as done"));
                        }}
                      >
                        Done
                      </button>
                    )}
                    <button className="icon-btn sm plain" onClick={() => clear(n.key)} aria-label="Remove notification">
                      <X size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
