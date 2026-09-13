"use client";

import { useMutation } from "convex/react";
import { Users } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { WorkspaceInfo } from "@convex/workspaces";
import { roleLabel, useWorkspace } from "@/lib/workspace";
import { Sheet } from "./ui";

const WHAT: Record<WorkspaceInfo["role"], string> = {
  owner: "",
  full: "You can add, edit and remove anything.",
  edit: "You can add and edit tenants, properties, payments and notes, but not remove them.",
  read: "You can see everything, but can't make changes.",
};

/** Shown once, the first time a member opens the app after being added to a workspace. */
export default function WelcomeSheet({ invite }: { invite: WorkspaceInfo }) {
  const { workspace, switchTo } = useWorkspace();
  const acknowledge = useMutation(api.members.acknowledge);
  const done = () => acknowledge({ workspaceId: invite.workspaceId }).catch(() => {});
  const here = workspace.workspaceId === invite.workspaceId;

  return (
    <Sheet
      title="You've been added"
      onClose={done}
      footer={
        here ? (
          <button className="btn btn-primary" onClick={done}>
            Get started
          </button>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={done}>
              Later
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                done();
                switchTo(invite.workspaceId);
              }}
            >
              Open workspace
            </button>
          </>
        )
      }
    >
      <div className="join" style={{ textAlign: "left" }}>
        <span className="join-icon" style={{ margin: 0 }}>
          <Users size={22} />
        </span>
        <p style={{ margin: 0 }}>
          <strong>{invite.name}</strong> added you to their workspace with{" "}
          <strong>{roleLabel[invite.role]}</strong>. {WHAT[invite.role]}
          {invite.restricted && " You'll only see the properties they assigned to you."}
        </p>
        <p className="hint-text" style={{ margin: 0 }}>
          Switch between workspaces any time from the menu.
        </p>
      </div>
    </Sheet>
  );
}
