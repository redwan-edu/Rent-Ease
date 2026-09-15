"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  ArrowRightLeft,
  Building2,
  ChevronDown,
  DoorOpen,
  Eye,
  LogOut,
  Pencil,
  Plus,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Header from "@/components/Header";
import MonthSwitch from "@/components/MonthSwitch";
import PaymentSheet, { type PayTarget } from "@/components/PaymentSheet";
import {
  Avatar,
  ConfirmSheet,
  Empty,
  Field,
  Segmented,
  Sheet,
  SkeletonList,
  Spinner,
  useRun,
} from "@/components/ui";
import { monthKey, monthLabel, today } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Overview = NonNullable<FunctionReturnType<typeof api.audit.overview>>;
type TenantRow = Overview["tenants"][number];
type PropertyRow = Overview["properties"][number];
type UnitRow = PropertyRow["units"][number];
type Filter = "all" | "due" | "vacant";

type Action =
  | { kind: "tenant"; tenant: TenantRow }
  | { kind: "vacant"; property: PropertyRow; unit: UnitRow }
  | { kind: "place"; tenant: TenantRow }
  | { kind: "moveOut"; tenant: TenantRow };

function StatusBadge({ tenant }: { tenant: TenantRow }) {
  if (tenant.status === "paid") return <span className="badge ok">Paid</span>;
  if (tenant.status === "partial") return <span className="badge warn">Partly paid</span>;
  return <span className="badge danger">Due</span>;
}

/**
 * All units: every property, its units, who rents each one and whether they've
 * paid, and the place to place, move or remove tenants.
 */
export default function AuditPage() {
  const { workspace, can, money, to, clampMonth } = useWorkspace();
  // Members limited to certain properties can't add properties or leave tenants unplaced.
  const canAdd = can("edit") && !workspace.restricted;
  const [month, setMonth] = useState(() => clampMonth(monthKey()));
  const [filter, setFilter] = useState<Filter>("all");
  const data = useQuery(api.audit.overview, { workspaceId: workspace.workspaceId, month });
  const assign = useMutation(api.properties.assign);
  const moveOut = useMutation(api.tenants.moveOut);
  const { run } = useRun();
  const [action, setAction] = useState<Action | null>(null);
  const [pay, setPay] = useState<PayTarget | null>(null);
  // Properties start collapsed; tap one to reveal its units and tenants.
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setOpenIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // "Villa · Flat 2B" for any tenant, from the overview itself.
  const placeOf = (t: TenantRow) => {
    if (!data) return null;
    const property = data.properties.find((p) => p._id === t.propertyId);
    if (!property) return null;
    const unit = property.units.find((u) => u._id === t.unitId);
    return unit ? `${property.name} · ${unit.name}` : property.name;
  };

  const pct = data && data.totals.expected > 0 ? Math.round((data.totals.collected / data.totals.expected) * 100) : 0;

  const tenantRow = (t: TenantRow, tag: string) => (
    <button className="row" key={t._id} onClick={() => setAction({ kind: "tenant", tenant: t })}>
      <Avatar name={t.name} url={t.photoUrl} />
      <div className="row-main">
        <span className="unit-tag">{tag}</span>
        <div className="row-title">{t.name}</div>
        {t.status !== "paid" && (
          <div className="row-sub">
            {money(t.remaining)} left of {money(t.rent)}
          </div>
        )}
      </div>
      <StatusBadge tenant={t} />
    </button>
  );

  const visible = (data?.properties ?? [])
    .map((p) => {
      const units =
        filter === "all"
          ? p.units
          : filter === "due"
            ? p.units.filter((u) => u.tenant && u.tenant.status !== "paid")
            : p.units.filter((u) => !u.tenant);
      const withoutUnit =
        filter === "vacant" ? [] : p.withoutUnit.filter((t) => filter === "all" || t.status !== "paid");
      return { property: p, units, withoutUnit };
    })
    .filter((v) => filter === "all" || v.units.length > 0 || v.withoutUnit.length > 0);

  const unassigned =
    filter === "vacant" ? [] : (data?.unassigned ?? []).filter((t) => filter === "all" || t.status !== "paid");

  return (
    <>
      <Header title="All units" back="/more" />
      <div className="page">
        <MonthSwitch month={month} onChange={setMonth} />

        {data && data.totals.units > 0 && (
          <p className="lead">
            {data.totals.occupied} of {data.totals.units} units rented. {pct}% of rent collected.
          </p>
        )}

        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "due", label: "Due" },
            { value: "vacant", label: "Vacant" },
          ]}
        />

        {!data ? (
          <SkeletonList rows={4} />
        ) : data.properties.length === 0 && data.unassigned.length === 0 ? (
          <div className="card">
            <Empty
              icon={<Building2 size={24} />}
              title="No units yet"
              text="Add a property with its units, then place tenants in them."
              action={
                canAdd && (
                  <Link href={to("/properties?new=1")} className="btn btn-primary btn-sm">
                    <Plus size={16} /> Add property
                  </Link>
                )
              }
            />
          </div>
        ) : visible.length === 0 && unassigned.length === 0 ? (
          <div className="card">
            <Empty
              icon={filter === "due" ? <Wallet size={24} /> : <DoorOpen size={24} />}
              title={filter === "due" ? "Nobody owes rent" : "No vacant units"}
              text={filter === "due" ? `Everyone has paid for ${monthLabel(month)}.` : "Every unit is rented."}
            />
          </div>
        ) : (
          <>
            {visible.map(({ property: p, units, withoutUnit }) => {
              const collectedPct = p.expected > 0 ? Math.round((p.collected / p.expected) * 100) : 0;
              const open = openIds.has(p._id);
              return (
                <section className="card prop-block" key={p._id}>
                  <button className="prop-block-head" onClick={() => toggle(p._id)} aria-expanded={open}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3>{p.name}</h3>
                      <div className="row-sub">
                        {p.occupied} of {p.units.length} rented · {money(p.collected)} of {money(p.expected)}
                      </div>
                      <div className="prop-meter">
                        <span style={{ width: `${collectedPct}%` }} />
                      </div>
                    </div>
                    {filter === "all" && p.dueCount > 0 && <span className="badge danger">{p.dueCount} due</span>}
                    <ChevronDown size={18} className={`chev${open ? " flip" : ""}`} />
                  </button>
                  {open && (
                    <div className="list">
                      {p.units.length === 0 && (
                        <div className="row">
                          <div className="row-main">
                            <div className="row-title muted">No units yet</div>
                            <div className="row-sub">Edit the property to add its units.</div>
                          </div>
                        </div>
                      )}
                      {units.map((u) =>
                        u.tenant ? (
                          tenantRow(u.tenant, u.name)
                        ) : (
                          <button
                            className="row"
                            key={u._id}
                            disabled={!can("edit")}
                            onClick={() => setAction({ kind: "vacant", property: p, unit: u })}
                          >
                            <span className="avatar vacant" style={{ width: 40, height: 40 }}>
                              <DoorOpen size={17} />
                            </span>
                            <div className="row-main">
                              <span className="unit-tag">{u.name}</span>
                              <div className="row-title muted">Vacant</div>
                            </div>
                            {can("edit") && (
                              <span className="badge">
                                <Plus size={12} /> Add
                              </span>
                            )}
                          </button>
                        ),
                      )}
                      {withoutUnit.map((t) => tenantRow(t, "No unit set"))}
                    </div>
                  )}
                </section>
              );
            })}

            {unassigned.length > 0 && (
              <section>
                <div className="section-head">
                  <h2>Not placed in a property</h2>
                </div>
                <div className="card list">{unassigned.map((t) => tenantRow(t, "Unassigned"))}</div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Tenant actions */}
      {action?.kind === "tenant" && (
        <Sheet title={action.tenant.name} onClose={() => setAction(null)}>
          <div className="account" style={{ padding: 0 }}>
            <Avatar name={action.tenant.name} url={action.tenant.photoUrl} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{placeOf(action.tenant) ?? "Not placed in a property"}</strong>
              <div className="row-sub">
                {action.tenant.status === "paid"
                  ? `Paid ${money(action.tenant.rent)} for ${monthLabel(month)}`
                  : `${money(action.tenant.remaining)} left of ${money(action.tenant.rent)}`}
              </div>
            </div>
            <StatusBadge tenant={action.tenant} />
          </div>
          <div className="card list action-list">
            {can("edit") && action.tenant.status !== "paid" && (
              <button
                className="row"
                onClick={() => {
                  const t = action.tenant;
                  setAction(null);
                  setPay({ tenantId: t._id, name: t.name, amount: t.remaining, month });
                }}
              >
                <span className="row-icon ok">
                  <Wallet size={17} />
                </span>
                <div className="row-main">Record payment</div>
              </button>
            )}
            <Link href={to(`/tenants/${action.tenant._id}`)} className="row">
              <span className="row-icon">
                <Eye size={17} />
              </span>
              <div className="row-main">View profile</div>
            </Link>
            {can("edit") && (
              <>
                <Link href={to(`/tenants/${action.tenant._id}/edit`)} className="row">
                  <span className="row-icon">
                    <Pencil size={17} />
                  </span>
                  <div className="row-main">Edit details</div>
                </Link>
                <button className="row" onClick={() => setAction({ kind: "place", tenant: action.tenant })}>
                  <span className="row-icon">
                    <ArrowRightLeft size={17} />
                  </span>
                  <div className="row-main">{action.tenant.unitId ? "Move to another unit" : "Place in a unit"}</div>
                </button>
                {action.tenant.propertyId && !workspace.restricted && (
                  <button
                    className="row"
                    onClick={() => {
                      const t = action.tenant;
                      run(async () => {
                        await assign({ tenantId: t._id });
                        setAction(null);
                      }, `${t.name} removed from the unit`);
                    }}
                  >
                    <span className="row-icon">
                      <UserMinus size={17} />
                    </span>
                    <div className="row-main">Remove from unit</div>
                  </button>
                )}
              </>
            )}
            {can("full") && (
              <button className="row danger" onClick={() => setAction({ kind: "moveOut", tenant: action.tenant })}>
                <span className="row-icon">
                  <LogOut size={17} />
                </span>
                <div className="row-main">Move out tenant</div>
              </button>
            )}
          </div>
        </Sheet>
      )}

      {/* Fill a vacant unit */}
      {action?.kind === "vacant" && data && (
        <Sheet
          title={`${action.property.name} · ${action.unit.name}`}
          onClose={() => setAction(null)}
          footer={
            <Link
              href={to(`/tenants/new?property=${action.property._id}&unit=${action.unit._id}`)}
              className="btn btn-primary"
            >
              <UserPlus size={17} /> New tenant for this unit
            </Link>
          }
        >
          <p className="muted" style={{ lineHeight: 1.5 }}>
            This unit is vacant. Place one of your current tenants here, or add a new tenant.
          </p>
          {data.tenants.length === 0 ? (
            <Empty icon={<Users size={24} />} title="No current tenants" text="Add a new tenant for this unit." />
          ) : (
            <div className="card list">
              {[...data.tenants]
                .sort((x, y) => Number(!!x.unitId) - Number(!!y.unitId))
                .map((t) => (
                  <button
                    className="row"
                    key={t._id}
                    onClick={() => {
                      const { property, unit } = action;
                      run(async () => {
                        await assign({ tenantId: t._id, propertyId: property._id, unitId: unit._id });
                        setAction(null);
                      }, `${t.name} placed in ${unit.name}`);
                    }}
                  >
                    <Avatar name={t.name} url={t.photoUrl} />
                    <div className="row-main">
                      <div className="row-title">{t.name}</div>
                      <div className="row-sub">{placeOf(t) ? `Now at ${placeOf(t)}` : "Not placed yet"}</div>
                    </div>
                    <Plus size={18} className="chev" />
                  </button>
                ))}
            </div>
          )}
        </Sheet>
      )}

      {action?.kind === "place" && data && (
        <PlaceSheet data={data} tenant={action.tenant} onClose={() => setAction(null)} />
      )}

      {action?.kind === "moveOut" && (
        <ConfirmSheet
          title={`Move out ${action.tenant.name}?`}
          text="They'll be listed as a former tenant and their unit becomes vacant. Their details, payments and notes stay."
          confirmLabel="Move out"
          onClose={() => setAction(null)}
          onConfirm={() => moveOut({ tenantId: action.tenant._id, date: today() })}
        />
      )}

      {pay && <PaymentSheet target={pay} onClose={() => setPay(null)} />}
    </>
  );
}

/** Pick a property and one of its free units for a tenant. */
function PlaceSheet({ data, tenant, onClose }: { data: Overview; tenant: TenantRow; onClose: () => void }) {
  const assign = useMutation(api.properties.assign);
  const { run, busy } = useRun();
  const [propertyId, setPropertyId] = useState<string>(tenant.propertyId ?? "");
  const [unitId, setUnitId] = useState<string>(tenant.unitId ?? "");
  const property = data.properties.find((p) => p._id === propertyId);

  return (
    <Sheet
      title={tenant.unitId ? `Move ${tenant.name}` : `Place ${tenant.name}`}
      onClose={onClose}
      footer={
        <button
          className="btn btn-primary"
          disabled={!property || !unitId || busy || unitId === tenant.unitId}
          onClick={() =>
            run(async () => {
              await assign({
                tenantId: tenant._id,
                propertyId: propertyId as Id<"properties">,
                unitId: unitId as Id<"units">,
              });
              onClose();
            }, `${tenant.name} moved`)
          }
        >
          {busy ? <Spinner /> : "Save"}
        </button>
      }
    >
      <Field label="Property" required>
        <select
          className="input"
          value={propertyId}
          onChange={(e) => {
            setPropertyId(e.target.value);
            setUnitId("");
          }}
        >
          <option value="">Choose a property</option>
          {data.properties.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      {property && (
        <Field
          label="Unit"
          required
          hint={property.units.length === 0 ? "This property has no units yet. Edit it to add some." : undefined}
        >
          <select className="input" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">Choose a unit</option>
            {property.units.map((u) => {
              const taken = !!u.tenant && u.tenant._id !== tenant._id;
              return (
                <option key={u._id} value={u._id} disabled={taken}>
                  {u.name}
                  {taken ? ` (rented to ${u.tenant!.name})` : u.tenant ? " (current)" : ""}
                </option>
              );
            })}
          </select>
        </Field>
      )}
    </Sheet>
  );
}
