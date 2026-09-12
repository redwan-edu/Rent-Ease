"use client";

import { useMutation } from "convex/react";
import { Minus, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useWorkspace } from "@/lib/workspace";
import { KINDS, type Kind } from "./kinds";
import { Field, Sheet, Spinner, useRun, useToast } from "./ui";

const MAX_UNITS = 200;

export type PropertyDraft = {
  _id?: Id<"properties">;
  name: string;
  address?: string;
  kind: Kind;
  notes?: string;
  units: { _id?: Id<"units">; name: string; occupant?: string | null }[];
};

type UnitRow = { key: string; _id?: Id<"units">; name: string; occupant?: string | null };

let keySeq = 0;
const newKey = () => `unit-${Date.now()}-${keySeq++}`;
const blank = (): UnitRow => ({ key: newKey(), name: "" });

export default function PropertySheet({
  property,
  onClose,
}: {
  property: PropertyDraft;
  onClose: () => void;
}) {
  const { workspace, to } = useWorkspace();
  const create = useMutation(api.properties.create);
  const update = useMutation(api.properties.update);
  const router = useRouter();
  const toast = useToast();
  const { run, busy } = useRun();
  const [name, setName] = useState(property.name);
  const [kind, setKind] = useState<Kind>(property.kind);
  const [address, setAddress] = useState(property.address ?? "");
  const [notes, setNotes] = useState(property.notes ?? "");
  const [units, setUnits] = useState<UnitRow[]>(() =>
    property.units.length > 0 ? property.units.map((u) => ({ ...u, key: u._id ?? newKey() })) : [blank()],
  );
  const [touched, setTouched] = useState(false);

  const setCount = (n: number) => {
    const count = Math.max(1, Math.min(MAX_UNITS, n));
    setUnits((u) => {
      if (count > u.length) return [...u, ...Array.from({ length: count - u.length }, blank)];
      // Shrinking only drops trailing units that aren't rented.
      const next = [...u];
      while (next.length > count && !next[next.length - 1].occupant) next.pop();
      return next;
    });
  };

  const names = units.map((u) => u.name.trim().toLowerCase());
  const isDuplicate = (i: number) => !!names[i] && names.indexOf(names[i]) !== i;
  const unitError = names.some((n) => !n)
    ? "Give every unit a name."
    : names.some((_, i) => isDuplicate(i))
      ? "Each unit needs a different name."
      : null;

  const save = () => {
    setTouched(true);
    if (!name.trim()) return toast("Give the property a name.");
    if (unitError) return toast(unitError);
    run(
      async () => {
        const args = { name, kind, address, notes };
        if (property._id) {
          await update({
            propertyId: property._id,
            ...args,
            units: units.map((u) => ({ _id: u._id, name: u.name })),
          });
          onClose();
        } else {
          const id = await create({
            workspaceId: workspace.workspaceId,
            ...args,
            units: units.map((u) => u.name),
          });
          onClose();
          router.push(to(`/properties/${id}`));
        }
      },
      property._id ? "Property updated" : "Property added",
    );
  };

  return (
    <Sheet
      title={property._id ? "Edit property" : "New property"}
      onClose={onClose}
      footer={
        <button className="btn btn-primary" disabled={!name.trim() || busy} onClick={save}>
          {busy ? <Spinner /> : property._id ? "Save changes" : "Add property"}
        </button>
      }
    >
      <div className="field">
        <span className="label">Type</span>
        <div className="kind-pick">
          {KINDS.map(({ value, label, Icon }) => (
            <button key={value} className={kind === value ? "on" : ""} onClick={() => setKind(value)}>
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <Field label="Name" required error={touched && !name.trim() && "Give the property a name"}>
        <input
          className={`input${touched && !name.trim() ? " invalid" : ""}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Lakeview Villa"
          autoFocus={!property._id}
        />
      </Field>

      <div className="field">
        <div className="units-head">
          <span className="label">
            Units<span className="req">*</span>
          </span>
          <div className="stepper sm">
            <button onClick={() => setCount(units.length - 1)} disabled={units.length <= 1} aria-label="Fewer units">
              <Minus size={15} />
            </button>
            <strong>{units.length}</strong>
            <button onClick={() => setCount(units.length + 1)} disabled={units.length >= MAX_UNITS} aria-label="More units">
              <Plus size={15} />
            </button>
          </div>
        </div>
        <span className="hint-text">
          How many flats, rooms or floors you rent out here. Name each one so tenants can be placed in it.
        </span>
        <div className="unit-list">
          {units.map((u, i) => {
            const invalid = touched && (!u.name.trim() || isDuplicate(i));
            return (
              <div className="unit-row" key={u.key}>
                <span className="unit-no">{i + 1}</span>
                <input
                  className={`input${invalid ? " invalid" : ""}`}
                  value={u.name}
                  onChange={(e) =>
                    setUnits((all) => all.map((x) => (x.key === u.key ? { ...x, name: e.target.value } : x)))
                  }
                  placeholder={`e.g. Flat ${i + 1}A`}
                  maxLength={40}
                  aria-label={`Unit ${i + 1} name`}
                />
                {u.occupant ? (
                  <span className="badge ok" title={`Rented to ${u.occupant}`}>
                    Rented
                  </span>
                ) : (
                  units.length > 1 && (
                    <button
                      className="icon-btn sm plain"
                      onClick={() => setUnits((all) => all.filter((x) => x.key !== u.key))}
                      aria-label={`Remove unit ${i + 1}`}
                    >
                      <X size={15} />
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
        {touched && unitError && <span className="field-error">{unitError}</span>}
        <div className="chips">
          <button className="chip" onClick={() => setCount(units.length + 1)}>
            <Plus size={13} /> Add unit
          </button>
          {units.some((u) => !u.name.trim()) && (
            <button
              className="chip"
              onClick={() =>
                setUnits((all) => all.map((u, i) => (u.name.trim() ? u : { ...u, name: `Unit ${i + 1}` })))
              }
            >
              Name blanks “Unit 1, 2…”
            </button>
          )}
        </div>
      </div>

      <Field label="Address">
        <input
          className="input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street, area, city"
        />
      </Field>
      <Field label="Notes">
        <textarea
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Meter numbers, caretaker, anything useful"
          rows={3}
        />
      </Field>
    </Sheet>
  );
}
