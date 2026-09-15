"use client";

import { useMutation, useQuery } from "convex/react";
import { AlarmClock, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { atNine, monthKey, toLocalInput, whenLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import PushPrompt from "./PushPrompt";
import { ConfirmSheet, Field, Sheet, Spinner, useRun, useToast } from "./ui";

export type NoteDraft = {
  _id?: Id<"notes">;
  body: string;
  tenantId?: Id<"tenants">;
  propertyId?: Id<"properties">;
  remindAt?: number;
};

const presets = [
  { label: "Tomorrow", at: () => atNine(1) },
  { label: "In 3 days", at: () => atNine(3) },
  { label: "Next week", at: () => atNine(7) },
  { label: "Next month", at: () => atNine(0, 1) },
];

export default function NoteSheet({ note, onClose }: { note: NoteDraft; onClose: () => void }) {
  const { workspace, can } = useWorkspace();
  const workspaceId = workspace.workspaceId;
  const tenants = useQuery(api.tenants.list, { workspaceId, status: "active", month: monthKey() });
  const properties = useQuery(api.properties.list, { workspaceId });
  const create = useMutation(api.notes.create);
  const update = useMutation(api.notes.update);
  const remove = useMutation(api.notes.remove);
  const { run, busy } = useRun();
  const toast = useToast();

  const [body, setBody] = useState(note.body);
  const [tenantId, setTenantId] = useState<string>(note.tenantId ?? "");
  const [propertyId, setPropertyId] = useState<string>(note.propertyId ?? "");
  const [remind, setRemind] = useState(!!note.remindAt);
  const [at, setAt] = useState(toLocalInput(note.remindAt ?? atNine(1)));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const editable = can("edit");

  const save = () => {
    const remindAt = remind ? new Date(at).getTime() : undefined;
    if (remind && (!remindAt || Number.isNaN(remindAt))) return toast("Pick a reminder time.");
    if (remindAt && remindAt !== note.remindAt && remindAt < Date.now()) {
      return toast("Pick a time in the future.");
    }
    const args = {
      body,
      tenantId: (tenantId || undefined) as Id<"tenants"> | undefined,
      propertyId: (propertyId || undefined) as Id<"properties"> | undefined,
      remindAt,
    };
    run(
      async () => {
        if (note._id) await update({ noteId: note._id, ...args });
        else await create({ workspaceId, ...args });
        onClose();
      },
      note._id ? "Note updated" : remindAt ? "Note saved, reminder set" : "Note saved",
    );
  };

  return (
    <>
      <Sheet
        title={note._id ? "Note" : "New note"}
        onClose={onClose}
        footer={
          editable && (
            <>
              {note._id && can("full") && (
                <button className="btn btn-danger" onClick={() => setConfirmDelete(true)} aria-label="Delete note">
                  <Trash2 size={18} />
                </button>
              )}
              <button className="btn btn-primary" disabled={!body.trim() || busy} onClick={save}>
                {busy ? <Spinner /> : "Save"}
              </button>
            </>
          )
        }
      >
        <Field label="Note">
          <textarea
            className="input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="e.g. Tenant wants the kitchen tap fixed"
            disabled={!editable}
            autoFocus={!note._id}
            rows={4}
          />
        </Field>
        <div className="grid-2">
          <Field label="Tenant">
            <select
              className="input"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              disabled={!editable}
            >
              <option value="">None</option>
              {tenants?.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
              {tenantId && tenants && !tenants.some((t) => t._id === tenantId) && (
                <option value={tenantId}>Former tenant</option>
              )}
            </select>
          </Field>
          <Field label="Property">
            <select
              className="input"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              disabled={!editable}
            >
              <option value="">None</option>
              {properties?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="card">
          <div className="toggle-row">
            <div>
              <strong>Remind me</strong>
              <span>Get a notification at a set time</span>
            </div>
            <button
              className={`switch${remind ? " on" : ""}`}
              role="switch"
              aria-checked={remind}
              aria-label="Remind me"
              disabled={!editable}
              onClick={() => setRemind((r) => !r)}
            />
          </div>
          {remind && (
            <div style={{ padding: "0 16px 16px", display: "grid", gap: 12 }}>
              <div className="preset-grid">
                {presets.map((p) => {
                  const value = toLocalInput(p.at());
                  return (
                    <button
                      key={p.label}
                      className={`preset${value === at ? " on" : ""}`}
                      onClick={() => setAt(value)}
                      disabled={!editable}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <div className="when-grid">
                <Field label="Date">
                  <input
                    className="input"
                    type="date"
                    value={at.slice(0, 10)}
                    onChange={(e) => e.target.value && setAt(`${e.target.value}T${at.slice(11, 16)}`)}
                    disabled={!editable}
                  />
                </Field>
                <Field label="Time">
                  <input
                    className="input"
                    type="time"
                    value={at.slice(11, 16)}
                    onChange={(e) => e.target.value && setAt(`${at.slice(0, 10)}T${e.target.value}`)}
                    disabled={!editable}
                  />
                </Field>
              </div>
              {(() => {
                const ts = new Date(at).getTime();
                if (Number.isNaN(ts)) return null;
                const past = ts < openedAt;
                return (
                  <div className={`remind-summary${past ? " past" : ""}`}>
                    <AlarmClock size={15} />
                    {past ? "That time has passed. Pick a later one." : `Reminds you ${whenLabel(ts)}`}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        {remind && <PushPrompt />}
      </Sheet>
      {confirmDelete && note._id && (
        <ConfirmSheet
          title="Delete this note?"
          text="The note and its reminder will be removed permanently."
          confirmLabel="Delete"
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await remove({ noteId: note._id! });
            onClose();
          }}
        />
      )}
    </>
  );
}
