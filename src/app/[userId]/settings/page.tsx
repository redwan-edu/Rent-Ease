"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
  BellOff,
  Building2,
  Check,
  DoorOpen,
  Link2,
  Mail,
  MailWarning,
  Trash2,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Header from "@/components/Header";
import PushPrompt from "@/components/PushPrompt";
import {
  Avatar,
  ConfirmSheet,
  Field,
  Section,
  Segmented,
  Sheet,
  Spinner,
  useRun,
} from "@/components/ui";
import {
  applyFontScale,
  FONT_SCALES,
  type FontScaleKey,
} from "@/lib/fontScale";
import { disablePush, hasSubscription, pushState } from "@/lib/push";
import { saveTheme, storedTheme, THEMES, type ThemeKey } from "@/lib/theme";
import { roleLabel, useWorkspace } from "@/lib/workspace";

type MemberRole = "full" | "edit" | "read";
/** null = every property. */
type Scope = Id<"properties">[] | null;

const ROLES: { value: MemberRole; label: string; text: string }[] = [
  {
    value: "full",
    label: "Full access",
    text: "Add, edit and remove anything",
  },
  {
    value: "edit",
    label: "Edit access",
    text: "Add and edit, but can't remove",
  },
  {
    value: "read",
    label: "Read only",
    text: "Can view everything, change nothing",
  },
];

const CURRENCIES = ["$", "€", "£", "৳", "₹", "AED", "SAR", "¥"];

function scopeLabel(scope: Scope) {
  if (scope === null) return "All properties";
  if (scope.length === 0) return "No properties";
  return `${scope.length} ${scope.length === 1 ? "property" : "properties"}`;
}

export default function SettingsPage() {
  const { workspace, workspaces, switchTo, can } = useWorkspace();
  const isOwner = workspace.role === "owner";
  const members = useQuery(
    api.members.list,
    isOwner ? { workspaceId: workspace.workspaceId } : "skip",
  );
  const setCurrency = useMutation(api.users.setCurrency);
  const setRole = useMutation(api.members.setRole);
  const removeMember = useMutation(api.members.remove);
  const leave = useMutation(api.members.leave);
  const unsubscribe = useMutation(api.pushData.unsubscribe);
  const me = useQuery(api.users.me);
  const setFontScale = useMutation(api.users.setFontScale);
  const textSize: FontScaleKey = me?.fontScale ?? "md";
  const { run } = useRun();

  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress || me?.email || "";
  const name = user?.fullName || me?.name || email || "You";
  const avatarUrl = user?.imageUrl || me?.imageUrl;

  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<{
    id: Id<"members">;
    email: string;
  } | null>(null);
  const [scoping, setScoping] = useState<{
    id: Id<"members">;
    email: string;
    scope: Scope;
  } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>(storedTheme);

  useEffect(() => {
    hasSubscription()
      .then(setPushOn)
      .catch(() => {});
  }, []);

  const shareInvite = () =>
    run(async () => {
      const url = `${window.location.origin}/join?w=${workspace.workspaceId}`;
      const text = `Join my Rent Ease workspace. Sign in with the email address I added you with.`;
      if (navigator.share) {
        try {
          await navigator.share({ title: "Rent Ease invite", text, url });
          return;
        } catch {
          // Share sheet dismissed, fall through to copying.
        }
      }
      await navigator.clipboard.writeText(url);
    }, "Invite link ready");

  return (
    <>
      <Header title="Settings" back="/more" />
      <div className="page">
        <Section title="Profile">
          <div className="card account">
            <Avatar name={name} url={avatarUrl} size={48} />
            <div className="row-main">
              <div className="row-title">{name}</div>
              <div className="row-sub">{email}</div>
            </div>
            <span className="badge">{roleLabel[workspace.role]}</span>
          </div>
          <p className="hint-text" style={{ marginTop: 10 }}>
            Read only. Profile details cannot be edited here.
          </p>
        </Section>

        <Section title="Appearance">
          <Segmented
            value={theme}
            onChange={(key) => {
              setTheme(key);
              saveTheme(key);
            }}
            options={THEMES.map((t) => ({ value: t.key, label: t.label }))}
          />
          <p className="hint-text" style={{ marginTop: 10 }}>
            Saved on this device. Automatic follows your phone&apos;s light or
            dark setting.
          </p>
        </Section>

        <Section title="Text size">
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
          <p className="hint-text" style={{ marginTop: 10 }}>
            Used on every device you sign in on.
          </p>
        </Section>

        <Section title="Notifications">
          {pushState() === "granted" ? (
            <div className="card">
              <div className="toggle-row">
                <div>
                  <strong>Reminders on this device</strong>
                  <span>
                    {pushOn
                      ? "On. You get a notification when a reminder is due."
                      : "Off"}
                  </span>
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
              <div>
                This browser can&apos;t show notifications. Reminders still
                appear under the bell.
              </div>
            </div>
          ) : (
            <PushPrompt />
          )}
        </Section>

        {isOwner && (
          <Section title="Currency">
            <div className="chips">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  className={`chip${workspace.currency === c ? " on" : ""}`}
                  aria-pressed={workspace.currency === c}
                  onClick={() =>
                    run(
                      () =>
                        setCurrency({
                          workspaceId: workspace.workspaceId,
                          currency: c,
                        }),
                      "Currency updated",
                    )
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </Section>
        )}

        <Section
          title="Team"
          action={
            isOwner && (
              <button className="link-btn" onClick={() => setAdding(true)}>
                Add person
              </button>
            )
          }
        >
          {!isOwner ? (
            <div className="stack">
              <div className="hint">
                <UserCog size={18} />
                <div>
                  <strong>{roleLabel[workspace.role]}</strong>
                  You&apos;re a member of {workspace.name}&apos;s workspace.
                  Only the owner can manage the team.
                  {!can("edit") &&
                    " You can view everything but can't make changes."}
                  {workspace.restricted &&
                    " You only see the properties the owner gave you."}
                </div>
              </div>
              <button
                className="btn btn-secondary btn-block"
                onClick={() => setLeaving(true)}
              >
                <DoorOpen size={17} /> Leave this workspace
              </button>
            </div>
          ) : members === undefined ? (
            <div
              className="card card-pad"
              style={{ display: "grid", placeItems: "center" }}
            >
              <Spinner />
            </div>
          ) : members.length === 0 ? (
            <button className="hint" onClick={() => setAdding(true)}>
              <Users size={18} />
              <div>
                <strong>Invite your team</strong>
                Add a manager or family member by email and choose what they can
                do.
              </div>
            </button>
          ) : (
            <div className="stack">
              <div className="card list">
                {members.map((m) => (
                  <div className="member" key={m._id}>
                    <div className="row">
                      <Avatar name={m.name ?? m.email} />
                      <div className="row-main">
                        <div className="row-title">{m.name ?? m.email}</div>
                        <div
                          className={`row-sub${!m.joined || m.unverified ? " warn-text" : ""}`}
                        >
                          {!m.joined
                            ? `Waiting for them to sign up as ${m.email}`
                            : m.unverified
                              ? "Email not verified yet, no access"
                              : m.email}
                        </div>
                      </div>
                      <button
                        className="icon-btn sm quiet"
                        onClick={() =>
                          setRemoving({ id: m._id, email: m.email })
                        }
                        aria-label={`Remove ${m.email}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="member-controls">
                      <select
                        className="select-sm"
                        value={m.role}
                        aria-label={`Role for ${m.email}`}
                        onChange={(e) =>
                          run(
                            () =>
                              setRole({
                                memberId: m._id,
                                role: e.target.value as MemberRole,
                              }),
                            "Role updated",
                          )
                        }
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="chip"
                        onClick={() =>
                          setScoping({
                            id: m._id,
                            email: m.email,
                            scope: m.propertyIds,
                          })
                        }
                      >
                        <Building2 size={14} /> {scopeLabel(m.propertyIds)}
                      </button>
                      {!m.joined && (
                        <button className="chip" onClick={shareInvite}>
                          <Link2 size={14} /> Send link
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-secondary btn-block"
                onClick={shareInvite}
              >
                <Link2 size={17} /> Share invite link
              </button>
              <p className="hint-text">
                The link only works for people you added, signed in with that
                exact email address.
              </p>
            </div>
          )}
        </Section>
      </div>

      {adding && (
        <AddMemberSheet
          workspaceId={workspace.workspaceId}
          onClose={() => setAdding(false)}
          onShare={shareInvite}
        />
      )}
      {scoping && (
        <ScopeSheet member={scoping} onClose={() => setScoping(null)} />
      )}
      {removing && (
        <ConfirmSheet
          title="Remove from team?"
          text={`${removing.email} will lose access to your workspace immediately.`}
          confirmLabel="Remove"
          onClose={() => setRemoving(null)}
          onConfirm={() => removeMember({ memberId: removing.id })}
        />
      )}
      {leaving && (
        <ConfirmSheet
          title={`Leave ${workspace.name}'s workspace?`}
          text="You'll lose access straight away. The owner would have to add you again to bring you back."
          confirmLabel="Leave"
          onClose={() => setLeaving(false)}
          onConfirm={async () => {
            await leave({ workspaceId: workspace.workspaceId });
            switchTo(workspaces[0].workspaceId);
          }}
        />
      )}
    </>
  );
}

/** Choose between every property and a hand-picked list. */
function ScopePicker({
  value,
  onChange,
}: {
  value: Scope;
  onChange: (next: Scope) => void;
}) {
  const { workspace } = useWorkspace();
  const properties = useQuery(api.properties.list, {
    workspaceId: workspace.workspaceId,
  });
  const picked = new Set<string>(value ?? []);

  return (
    <div className="field">
      <span className="label">Properties they can see</span>
      <div className="role-pick">
        <button
          className={value === null ? "on" : ""}
          onClick={() => onChange(null)}
        >
          <span className="radio" />
          <div style={{ flex: 1 }}>
            <strong>All properties</strong>
            <span>Including any you add later</span>
          </div>
        </button>
        <button
          className={value !== null ? "on" : ""}
          onClick={() => value === null && onChange([])}
        >
          <span className="radio" />
          <div style={{ flex: 1 }}>
            <strong>Only selected properties</strong>
            <span>Just those properties, with their tenants and payments</span>
          </div>
        </button>
      </div>
      {value !== null &&
        (properties === undefined ? (
          <Spinner />
        ) : properties.length === 0 ? (
          <p className="hint-text">
            You haven&apos;t added any properties yet.
          </p>
        ) : (
          <div className="chips">
            {properties.map((p) => (
              <button
                key={p._id}
                type="button"
                className={`chip${picked.has(p._id) ? " on" : ""}`}
                aria-pressed={picked.has(p._id)}
                onClick={() =>
                  onChange(
                    picked.has(p._id)
                      ? value.filter((id) => id !== p._id)
                      : [...value, p._id],
                  )
                }
              >
                {picked.has(p._id) && <Check size={13} />} {p.name}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}

function ScopeSheet({
  member,
  onClose,
}: {
  member: { id: Id<"members">; email: string; scope: Scope };
  onClose: () => void;
}) {
  const setScope = useMutation(api.members.setScope);
  const { run, busy } = useRun();
  const [scope, setScopeValue] = useState<Scope>(member.scope);

  return (
    <Sheet
      title="Property access"
      onClose={onClose}
      footer={
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await setScope({ memberId: member.id, propertyIds: scope });
              onClose();
            }, "Access updated")
          }
        >
          {busy ? <Spinner /> : "Save"}
        </button>
      }
    >
      <p className="muted">{member.email}</p>
      <ScopePicker value={scope} onChange={setScopeValue} />
      {scope !== null && scope.length === 0 && (
        <div className="hint">
          <MailWarning size={18} />
          <div>
            With no properties selected they&apos;ll see an empty workspace.
          </div>
        </div>
      )}
    </Sheet>
  );
}

function AddMemberSheet({
  workspaceId,
  onClose,
  onShare,
}: {
  workspaceId: Id<"users">;
  onClose: () => void;
  onShare: () => void;
}) {
  const add = useMutation(api.members.add);
  const { run, busy } = useRun();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("edit");
  const [scope, setScope] = useState<Scope>(null);
  const [added, setAdded] = useState<string | null>(null);

  if (added) {
    return (
      <Sheet
        title="Added to team"
        onClose={onClose}
        footer={
          <>
            <button className="btn btn-secondary" onClick={onClose}>
              Done
            </button>
            <button className="btn btn-primary" onClick={onShare}>
              <Link2 size={17} /> Share link
            </button>
          </>
        }
      >
        <div className="hint">
          <UserPlus size={18} />
          <div>
            <strong>Now send them the invite link</strong>
            Rent Ease doesn&apos;t send emails. Share the link on WhatsApp or
            SMS. They sign in with{" "}
            <strong style={{ display: "inline" }}>{added}</strong> and your
            workspace opens.
          </div>
        </div>
      </Sheet>
    );
  }

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
              await add({
                workspaceId,
                email,
                role,
                propertyIds: scope ?? undefined,
              });
              setAdded(email.trim().toLowerCase());
            }, "Added to your team")
          }
        >
          {busy ? <Spinner /> : "Add person"}
        </button>
      }
    >
      <Field
        label="Email address"
        hint="They must sign in to Rent Ease with exactly this email."
      >
        <div className="input-wrap">
          <Mail size={17} />
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
            <button
              key={r.value}
              className={role === r.value ? "on" : ""}
              onClick={() => setRole(r.value)}
            >
              <span className="radio" />
              <div style={{ flex: 1 }}>
                <strong>{r.label}</strong>
                <span>{r.text}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <ScopePicker value={scope} onChange={setScope} />
    </Sheet>
  );
}
