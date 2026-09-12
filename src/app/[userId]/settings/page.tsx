"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { Bell, BellOff, Check, LogOut, Mail, Trash2, UserCog, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Header from "@/components/Header";
import PushPrompt from "@/components/PushPrompt";
import { Avatar, ConfirmSheet, Field, Sheet, Spinner, useRun } from "@/components/ui";
import { applyFontScale, FONT_SCALES, type FontScaleKey } from "@/lib/fontScale";
import { disablePush, hasSubscription, pushState } from "@/lib/push";
import { roleLabel, useWorkspace } from "@/lib/workspace";

type MemberRole = "full" | "edit" | "read";

const ROLES: { value: MemberRole; label: string; text: string }[] = [
  { value: "full", label: "Full access", text: "Add, edit and remove anything" },
  { value: "edit", label: "Edit access", text: "Add and edit, but can't remove" },
  { value: "read", label: "Read only", text: "Can view everything, change nothing" },
];

const CURRENCIES = ["$", "€", "£", "৳", "₹", "AED", "SAR", "¥"];

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { workspace, workspaces, switchTo, can } = useWorkspace();
  const isOwner = workspace.role === "owner";
  const members = useQuery(api.members.list, isOwner ? { workspaceId: workspace.workspaceId } : "skip");
  const setCurrency = useMutation(api.users.setCurrency);
  const setRole = useMutation(api.members.setRole);
  const removeMember = useMutation(api.members.remove);
  const unsubscribe = useMutation(api.pushData.unsubscribe);
  const me = useQuery(api.users.me);
  const setFontScale = useMutation(api.users.setFontScale);
  const textSize: FontScaleKey = me?.fontScale ?? "md";
  const { run } = useRun();

  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<{ id: Id<"members">; email: string } | null>(null);
  const [pushOn, setPushOn] = useState(false);

  useEffect(() => {
    hasSubscription().then(setPushOn).catch(() => {});
  }, []);

  return (
    <>
      <Header title="Settings" />
      <div className="page">
        <div className="card">
          <div className="account">
            <Avatar name={user?.fullName || user?.primaryEmailAddress?.emailAddress || "You"} url={user?.imageUrl} size={54} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{user?.fullName || "Your account"}</strong>
              <div className="row-sub">{user?.primaryEmailAddress?.emailAddress}</div>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => openUserProfile()}>
              Manage
            </button>
          </div>
        </div>

        <section>
          <div className="section-head">
            <h2>Text size</h2>
          </div>
          <div className="card card-pad" style={{ display: "grid", gap: 14 }}>
            <div className="size-pick" role="radiogroup" aria-label="Text size">
              {FONT_SCALES.map((s) => (
                <button
                  key={s.key}
                  role="radio"
                  aria-checked={textSize === s.key}
                  className={textSize === s.key ? "on" : ""}
                  onClick={() => {
                    applyFontScale(s.key);
                    run(() => setFontScale({ scale: s.key }));
                  }}
                >
                  <span style={{ fontSize: s.sample }}>A</span>
                  <small>{s.label}</small>
                </button>
              ))}
            </div>
            <p className="hint-text">Saved to your account, so the app uses this size on every device you sign in on.</p>
          </div>
        </section>

        {workspaces.length > 1 && (
          <section>
            <div className="section-head">
              <h2>Workspaces</h2>
            </div>
            <div className="role-pick">
              {workspaces.map((w) => (
                <button
                  key={w.workspaceId}
                  className={w.workspaceId === workspace.workspaceId ? "on" : ""}
                  onClick={() => switchTo(w.workspaceId)}
                >
                  <span className="radio" />
                  <div style={{ flex: 1 }}>
                    <strong>{w.role === "owner" ? "My workspace" : `${w.name}'s workspace`}</strong>
                    <span>{roleLabel[w.role]}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="section-head">
            <h2>Notifications</h2>
          </div>
          {pushState() === "granted" ? (
            <div className="card">
              <div className="toggle-row">
                {pushOn ? <Bell size={20} /> : <BellOff size={20} color="var(--ink-3)" />}
                <div>
                  <strong>Reminders on this device</strong>
                  <span>{pushOn ? "You'll get a notification when a reminder is due" : "Off"}</span>
                </div>
                {pushOn && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() =>
                      run(async () => {
                        await disablePush(unsubscribe);
                        setPushOn(false);
                      }, "Notifications turned off")
                    }
                  >
                    Turn off
                  </button>
                )}
              </div>
            </div>
          ) : pushState() === "unsupported" ? (
            <div className="hint">
              <BellOff size={18} />
              <div>This browser doesn&apos;t support notifications. Reminders still appear in the bell.</div>
            </div>
          ) : (
            <PushPrompt />
          )}
        </section>

        <section>
          <div className="section-head">
            <h2>Currency</h2>
          </div>
          <div className="chips">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                className={`chip${workspace.currency === c ? " on" : ""}`}
                style={{ minWidth: 44, justifyContent: "center", height: 36, fontSize: "calc(14px * var(--fs))" }}
                disabled={!isOwner}
                onClick={() => run(() => setCurrency({ workspaceId: workspace.workspaceId, currency: c }), "Currency updated")}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2>Team</h2>
            {isOwner && <button onClick={() => setAdding(true)}>Add person</button>}
          </div>
          {!isOwner ? (
            <div className="hint">
              <UserCog size={18} />
              <div>
                <strong>{roleLabel[workspace.role]}</strong>
                You&apos;re a member of {workspace.name}&apos;s workspace. Only the owner can manage the team.
                {!can("edit") && " You can view everything but can't make changes."}
              </div>
            </div>
          ) : members === undefined ? (
            <div className="card card-pad" style={{ display: "grid", placeItems: "center" }}>
              <Spinner />
            </div>
          ) : members.length === 0 ? (
            <button className="hint" style={{ border: 0, width: "100%", textAlign: "left" }} onClick={() => setAdding(true)}>
              <Users size={18} />
              <div>
                <strong>Invite your team</strong>
                Add a manager or family member by email and choose what they can do.
              </div>
            </button>
          ) : (
            <div className="card list">
              {members.map((m) => (
                <div className="row" key={m._id}>
                  <Avatar name={m.name ?? m.email} size={40} />
                  <div className="row-main">
                    <div className="row-title">{m.name ?? m.email}</div>
                    <div className="row-sub">{m.joined ? m.email : "Hasn't signed up yet"}</div>
                  </div>
                  <select
                    className="select-sm"
                    value={m.role}
                    aria-label={`Role for ${m.email}`}
                    onChange={(e) => run(() => setRole({ memberId: m._id, role: e.target.value as MemberRole }), "Role updated")}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <button className="icon-btn sm plain" onClick={() => setRemoving({ id: m._id, email: m.email })} aria-label="Remove">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <button className="btn btn-secondary btn-block" onClick={() => signOut({ redirectUrl: "/" })}>
          <LogOut size={17} /> Sign out
        </button>
        <p className="footer-note">Rent Ease · v1.0</p>
      </div>

      {adding && <AddMemberSheet workspaceId={workspace.workspaceId} onClose={() => setAdding(false)} />}
      {removing && (
        <ConfirmSheet
          title="Remove from team?"
          text={`${removing.email} will lose access to your workspace immediately.`}
          confirmLabel="Remove"
          onClose={() => setRemoving(null)}
          onConfirm={() => removeMember({ memberId: removing.id })}
        />
      )}
    </>
  );
}

function AddMemberSheet({ workspaceId, onClose }: { workspaceId: Id<"users">; onClose: () => void }) {
  const add = useMutation(api.members.add);
  const { run, busy } = useRun();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("edit");

  return (
    <Sheet
      title="Add to team"
      onClose={onClose}
      footer={
        <button
          className="btn btn-primary"
          disabled={!email.includes("@") || busy}
          onClick={() =>
            run(async () => {
              await add({ workspaceId, email, role });
              onClose();
            }, "Added to your team")
          }
        >
          {busy ? <Spinner /> : "Add person"}
        </button>
      }
    >
      <Field label="Email address" hint="They sign in to Rent Ease with this email to get access.">
        <div className="input-wrap">
          <Mail size={17} color="var(--ink-3)" />
          <input
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoFocus
          />
        </div>
      </Field>
      <div className="field">
        <span className="label">Access</span>
        <div className="role-pick">
          {ROLES.map((r) => (
            <button key={r.value} className={role === r.value ? "on" : ""} onClick={() => setRole(r.value)}>
              <span className="radio" />
              <div style={{ flex: 1 }}>
                <strong>{r.label}</strong>
                <span>{r.text}</span>
              </div>
              {role === r.value && <Check size={16} />}
            </button>
          ))}
        </div>
      </div>
      <div className="hint">
        <UserPlus size={18} />
        <div>Only you, the owner, can manage the team and currency.</div>
      </div>
    </Sheet>
  );
}
