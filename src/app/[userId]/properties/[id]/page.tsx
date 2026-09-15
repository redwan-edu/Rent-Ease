"use client";

import { useMutation, useQuery } from "convex/react";
import { Building2, DoorOpen, Pencil, Plus, Users, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Header from "@/components/Header";
import NoteSheet, { type NoteDraft } from "@/components/NoteSheet";
import PropertySheet from "@/components/PropertySheet";
import { kindOf } from "@/components/kinds";
import { Avatar, ConfirmSheet, Empty, Field, Section, Sheet, Splash, useRun, useToast } from "@/components/ui";
import { dateLabel, monthKey, whenLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>();
  const propertyId = id as Id<"properties">;
  const router = useRouter();
  const toast = useToast();
  const { workspace, can, money, to } = useWorkspace();
  const property = useQuery(api.properties.get, { propertyId });
  const notes = useQuery(api.notes.list, { workspaceId: workspace.workspaceId, done: false });
  const allTenants = useQuery(api.tenants.list, {
    workspaceId: workspace.workspaceId,
    status: "active",
    month: monthKey(),
  });
  const assign = useMutation(api.properties.assign);
  const remove = useMutation(api.properties.remove);
  const { run } = useRun();

  const [editing, setEditing] = useState(false);
  const [assignUnit, setAssignUnit] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [note, setNote] = useState<NoteDraft | null>(null);

  if (property === undefined) {
    return (
      <>
        <Header title="Property" back="/properties" />
        <Splash />
      </>
    );
  }
  if (property === null) {
    return (
      <>
        <Header title="Property" back="/properties" />
        <Empty icon={<Building2 size={24} />} title="Property not found" />
      </>
    );
  }

  const { label } = kindOf(property.kind);
  const monthly = property.active.reduce((s, t) => s + t.rent, 0);
  const vacant = property.units.filter((u) => !u.occupant);
  const rented = property.units.length - vacant.length;
  const housed = new Set(property.units.map((u) => u.occupant?._id).filter(Boolean));
  const candidates = allTenants?.filter((t) => !housed.has(t._id)) ?? [];
  const propertyNotes = notes?.filter((n) => n.propertyId === propertyId) ?? [];
  const openAssign = (unitId?: string) => setAssignUnit(unitId ?? vacant[0]?._id ?? "");

  return (
    <>
      <Header
        title="Property"
        back="/properties"
        actions={
          can("edit") && (
            <button className="btn btn-sm btn-secondary" onClick={() => setEditing(true)}>
              <Pencil size={15} /> Edit
            </button>
          )
        }
      />
      <div className="page">
        <section className="profile">
          <div className="profile-text">
            <h2>{property.name}</h2>
            <div className="profile-sub">{property.address ? `${label} · ${property.address}` : label}</div>
            {property.units.length > 0 && (
              <div className="profile-sub">
                {rented} of {property.units.length} {property.units.length === 1 ? "unit" : "units"} rented,{" "}
                {money(monthly)} a month
              </div>
            )}
          </div>
        </section>

        {property.notes && <p className="memo">{property.notes}</p>}

        <Section
          title="Units"
          count={property.units.length || undefined}
          action={
            can("edit") &&
            vacant.length > 0 && (
              <button className="link-btn" onClick={() => openAssign()}>
                Assign tenant
              </button>
            )
          }
        >
          {property.units.length === 0 ? (
            <div className="card">
              <Empty
                icon={<DoorOpen size={24} />}
                title="No units yet"
                text="Add the flats or rooms here so tenants can be placed in them."
                action={
                  can("edit") && (
                    <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
                      <Plus size={15} /> Add units
                    </button>
                  )
                }
              />
            </div>
          ) : (
            <div className="card list">
              {property.units.map((u) =>
                u.occupant ? (
                  <div className="row" key={u._id}>
                    <Link href={to(`/tenants/${u.occupant._id}`)} className="contents">
                      <Avatar name={u.occupant.name} url={u.occupant.photoUrl} />
                      <div className="row-main">
                        <span className="unit-tag">{u.name}</span>
                        <div className="row-title">{u.occupant.name}</div>
                      </div>
                    </Link>
                    <span className="row-amount">{money(u.occupant.rent)}</span>
                    {can("edit") && !workspace.restricted && (
                      <button
                        className="icon-btn sm quiet"
                        aria-label={`Unassign ${u.occupant.name}`}
                        onClick={() => run(() => assign({ tenantId: u.occupant!._id }), `${u.occupant!.name} unassigned`)}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="row" key={u._id}>
                    <span className="avatar vacant" style={{ width: 40, height: 40 }}>
                      <DoorOpen size={17} />
                    </span>
                    <div className="row-main">
                      <span className="unit-tag">{u.name}</span>
                      <div className="row-title muted">Vacant</div>
                    </div>
                    {can("edit") && (
                      <button className="btn btn-sm btn-secondary" onClick={() => openAssign(u._id)}>
                        Assign
                      </button>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </Section>

        {property.withoutUnit.length > 0 && (
          <Section title="Needs a unit">
            <div className="card list">
              {property.withoutUnit.map((t) => (
                <div className="row" key={t._id}>
                  <Link href={to(`/tenants/${t._id}`)} className="contents">
                    <Avatar name={t.name} url={t.photoUrl} />
                    <div className="row-main">
                      <div className="row-title">{t.name}</div>
                      <div className="row-sub">No unit set yet</div>
                    </div>
                  </Link>
                  {can("edit") && vacant.length > 0 && (
                    <button className="btn btn-sm btn-secondary" onClick={() => openAssign()}>
                      Set unit
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section
          title="Open notes"
          action={
            can("edit") && (
              <button className="link-btn" onClick={() => setNote({ body: "", propertyId })}>
                Add note
              </button>
            )
          }
        >
          {propertyNotes.length === 0 ? (
            <p className="section-empty">No open notes.</p>
          ) : (
            <div className="card list">
              {propertyNotes.map((n) => (
                <button
                  className="row"
                  key={n._id}
                  onClick={() =>
                    setNote({ _id: n._id, body: n.body, tenantId: n.tenantId, propertyId: n.propertyId, remindAt: n.remindAt })
                  }
                >
                  <div className="row-main">
                    <div className="row-title clamp-2">{n.body}</div>
                    {n.remindAt && <div className="row-sub">Reminder: {whenLabel(n.remindAt)}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Section>

        {property.former.length > 0 && (
          <Section title="Past tenants">
            <div className="card list">
              {property.former.map((t) => (
                <Link href={to(`/tenants/${t._id}`)} className="row" key={t._id}>
                  <Avatar name={t.name} url={t.photoUrl} size={36} />
                  <div className="row-main">
                    <div className="row-title">{t.name}</div>
                    <div className="row-sub">
                      {t.unitName ? `${t.unitName} · ` : ""}
                      {t.moveOutDate ? `Moved out ${dateLabel(t.moveOutDate)}` : "Moved out"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {can("full") && (
          <section className="danger-zone">
            <div className="dz-part">
              <div>
                <strong>Delete property</strong>
                <p>Its units are deleted too. Tenants stay in your records.</p>
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            </div>
          </section>
        )}
      </div>

      {editing && (
        <PropertySheet
          property={{
            _id: propertyId,
            name: property.name,
            kind: property.kind,
            address: property.address,
            notes: property.notes,
            units: property.units.map((u) => ({ _id: u._id, name: u.name, occupant: u.occupant?.name ?? null })),
          }}
          onClose={() => setEditing(false)}
        />
      )}
      {assignUnit !== null && (
        <Sheet
          title="Assign tenant"
          onClose={() => setAssignUnit(null)}
          footer={
            assignUnit && (
              <Link
                href={to(`/tenants/new?property=${propertyId}&unit=${assignUnit}`)}
                className="btn btn-secondary"
              >
                <Plus size={16} /> New tenant for this unit
              </Link>
            )
          }
        >
          <Field label="Unit they're renting" required>
            <select className="input" value={assignUnit} onChange={(e) => setAssignUnit(e.target.value)}>
              <option value="">Choose a unit</option>
              {property.units.map((u) => (
                <option key={u._id} value={u._id} disabled={!!u.occupant}>
                  {u.name}
                  {u.occupant ? ` (rented to ${u.occupant.name})` : ""}
                </option>
              ))}
            </select>
          </Field>
          {candidates.length === 0 ? (
            <Empty
              icon={<Users size={24} />}
              title="No tenants to assign"
              text="Every current tenant already has a unit here. Add a new tenant instead."
            />
          ) : (
            <div className="field">
              <span className="label">Tenant</span>
              <div className="card list">
                {candidates.map((t) => (
                  <button
                    className="row"
                    key={t._id}
                    onClick={() => {
                      if (!assignUnit) return toast("Choose a unit first.");
                      const unitId = assignUnit as Id<"units">;
                      run(async () => {
                        await assign({ tenantId: t._id, propertyId, unitId });
                        setAssignUnit(null);
                      }, `${t.name} assigned`);
                    }}
                  >
                    <Avatar name={t.name} url={t.photoUrl} />
                    <div className="row-main">
                      <div className="row-title">{t.name}</div>
                      <div className="row-sub">
                        {t.propertyName
                          ? `Now at ${t.propertyName}${t.unitName ? ` · ${t.unitName}` : ""}`
                          : "Not assigned"}
                      </div>
                    </div>
                    <Plus size={18} className="chev" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </Sheet>
      )}
      {note && <NoteSheet note={note} onClose={() => setNote(null)} />}
      {confirmDelete && (
        <ConfirmSheet
          title={`Delete ${property.name}?`}
          text="Its units are deleted too. Tenants stay in your records but will no longer be assigned here."
          confirmLabel="Delete"
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await remove({ propertyId });
            router.replace(to("/properties"));
          }}
        />
      )}
    </>
  );
}
