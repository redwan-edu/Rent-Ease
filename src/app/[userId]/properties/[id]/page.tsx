"use client";

import { useMutation, useQuery } from "convex/react";
import { Building2, DoorOpen, MapPin, NotebookPen, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Header from "@/components/Header";
import NoteSheet, { type NoteDraft } from "@/components/NoteSheet";
import PropertySheet from "@/components/PropertySheet";
import { kindOf } from "@/components/kinds";
import { Avatar, ConfirmSheet, Empty, Field, Sheet, Splash, useRun, useToast } from "@/components/ui";
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
        <Header title="" back="/properties" />
        <Splash />
      </>
    );
  }
  if (property === null) {
    return (
      <>
        <Header title="Property" back="/properties" />
        <Empty icon={<Building2 size={22} />} title="Property not found" />
      </>
    );
  }

  const { Icon, label } = kindOf(property.kind);
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
        title={property.name}
        back="/properties"
        actions={
          can("edit") && (
            <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit property">
              <Pencil size={17} />
            </button>
          )
        }
      />
      <div className="page">
        <section className="profile">
          <span className="kind-tile lg">
            <Icon size={30} />
          </span>
          <h2>{property.name}</h2>
          <div className="profile-sub">
            <span className="badge">{label}</span>
            {property.address && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <MapPin size={13} /> {property.address}
              </span>
            )}
          </div>
        </section>

        <div className="stats">
          <div className="stat">
            <span className="stat-label">
              <DoorOpen size={14} /> Units
            </span>
            <span className="stat-value">{property.units.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">
              <Users size={14} /> Rented
            </span>
            <span className="stat-value">
              {rented}
              <span className="muted" style={{ fontSize: "calc(15px * var(--fs))" }}>
                /{property.units.length}
              </span>
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Monthly rent</span>
            <span className="stat-value">{money(monthly)}</span>
          </div>
        </div>

        {property.notes && (
          <div className="card card-pad">
            <p className="prose">{property.notes}</p>
          </div>
        )}

        <section>
          <div className="section-head">
            <h2>Units</h2>
            {can("edit") && vacant.length > 0 && <button onClick={() => openAssign()}>Assign tenant</button>}
          </div>
          {property.units.length === 0 ? (
            <div className="card">
              <Empty
                icon={<DoorOpen size={22} />}
                title="No units yet"
                text="Add the flats or rooms in this property so you can place tenants in them."
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
                    <Link href={to(`/tenants/${u.occupant._id}`)} style={{ display: "contents" }}>
                      <Avatar name={u.occupant.name} url={u.occupant.photoUrl} />
                      <div className="row-main">
                        <div className="row-title">{u.name}</div>
                        <div className="row-sub">
                          {u.occupant.name} · {money(u.occupant.rent)}/mo
                        </div>
                      </div>
                    </Link>
                    {can("edit") && (
                      <button
                        className="icon-btn sm plain"
                        aria-label={`Unassign ${u.occupant.name}`}
                        onClick={() => run(() => assign({ tenantId: u.occupant!._id }), `${u.occupant!.name} unassigned`)}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="row" key={u._id}>
                    <span className="row-icon">
                      <DoorOpen size={18} />
                    </span>
                    <div className="row-main">
                      <div className="row-title">{u.name}</div>
                      <div className="row-sub">Vacant</div>
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
        </section>

        {property.withoutUnit.length > 0 && (
          <section>
            <div className="section-head">
              <h2>Needs a unit</h2>
            </div>
            <div className="card list">
              {property.withoutUnit.map((t) => (
                <div className="row" key={t._id}>
                  <Link href={to(`/tenants/${t._id}`)} style={{ display: "contents" }}>
                    <Avatar name={t.name} url={t.photoUrl} size={40} />
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
          </section>
        )}

        <section>
          <div className="section-head">
            <h2>Open notes</h2>
            {can("edit") && <button onClick={() => setNote({ body: "", propertyId })}>Add note</button>}
          </div>
          {propertyNotes.length === 0 ? (
            <div className="card">
              <Empty icon={<NotebookPen size={22} />} title="No open notes" />
            </div>
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
                  <span className="row-icon">
                    <NotebookPen size={17} />
                  </span>
                  <div className="row-main">
                    <div className="row-title clamp-2">{n.body}</div>
                    {n.remindAt && <div className="row-sub">Reminder · {whenLabel(n.remindAt)}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {property.former.length > 0 && (
          <section>
            <div className="section-head">
              <h2>Past tenants</h2>
            </div>
            <div className="card list">
              {property.former.map((t) => (
                <Link href={to(`/tenants/${t._id}`)} className="row" key={t._id}>
                  <Avatar name={t.name} url={t.photoUrl} size={38} />
                  <div className="row-main">
                    <div className="row-title">{t.name}</div>
                    <div className="row-sub">
                      {t.unitName ? `${t.unitName} · ` : ""}Moved out {dateLabel(t.moveOutDate)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {can("full") && (
          <button className="btn btn-danger btn-block" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={17} /> Delete property
          </button>
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
                  {u.occupant ? ` — rented to ${u.occupant.name}` : ""}
                </option>
              ))}
            </select>
          </Field>
          {candidates.length === 0 ? (
            <Empty
              icon={<Users size={22} />}
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
                    <Avatar name={t.name} url={t.photoUrl} size={40} />
                    <div className="row-main">
                      <div className="row-title">{t.name}</div>
                      <div className="row-sub">
                        {t.propertyName
                          ? `Currently at ${t.propertyName}${t.unitName ? ` · ${t.unitName}` : ""}`
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
