"use client";

import { useMutation, useQuery } from "convex/react";
import { AlarmClock, Bell, BellOff, ChevronLeft, Menu } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@convex/_generated/api";
import { whenLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { useSidebar } from "./AppNav";
import PushPrompt from "./PushPrompt";
import { Empty, Logo, Sheet, useToast } from "./ui";

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

function NotificationBell() {
  const { workspace, can, to } = useWorkspace();
  const workspaceId = workspace.workspaceId;
  const data = useQuery(api.notes.notifications, { workspaceId });
  const markAllSeen = useMutation(api.notes.markAllSeen);
  const setDone = useMutation(api.notes.setDone);
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const unseen = data?.unseen ?? 0;

  // Surface newly-due reminders while the app is open.
  const previous = useRef<number | null>(null);
  useEffect(() => {
    if (!data) return;
    if (
      previous.current !== null &&
      data.unseen > previous.current &&
      data.items[0]
    ) {
      toast(`Reminder: ${data.items[0].body.slice(0, 60)}`);
    }
    previous.current = data.unseen;
  }, [data, toast]);

  const openSheet = () => {
    setOpen(true);
    if (unseen > 0) markAllSeen({ workspaceId }).catch(() => {});
  };

  return (
    <>
      <button
        className="icon-btn"
        onClick={openSheet}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unseen > 0 && (
          <span className="bell-dot">{unseen > 9 ? "9+" : unseen}</span>
        )}
      </button>
      {open && (
        <Sheet title="Notifications" onClose={() => setOpen(false)}>
          <PushPrompt />
          {data && data.items.length === 0 ? (
            <Empty
              icon={<BellOff size={22} />}
              title="You're all caught up"
              text="Reminders you set in Notes show up here when they're due."
            />
          ) : (
            <div className="card list">
              {data?.items.map((n) => (
                <div className="row" key={n._id}>
                  <span className="row-icon warn">
                    <AlarmClock size={18} />
                  </span>
                  <button
                    className="row-main"
                    onClick={() => {
                      setOpen(false);
                      router.push(to("/notes"));
                    }}
                  >
                    <div className="row-title clamp-2">{n.body}</div>
                    <div className="row-sub">
                      {whenLabel(n.remindAt)}
                      {n.tenantName ? ` · ${n.tenantName}` : ""}
                    </div>
                  </button>
                  {can("edit") && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setDone({ noteId: n._id, done: true })}
                    >
                      Done
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
