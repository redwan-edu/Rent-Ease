"use client";

import { useQuery } from "convex/react";
import { Building2, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import Header from "@/components/Header";
import PropertySheet from "@/components/PropertySheet";
import { kindOf } from "@/components/kinds";
import { Empty } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

export default function PropertiesPage() {
  const { workspace, can, money, to } = useWorkspace();
  const properties = useQuery(api.properties.list, { workspaceId: workspace.workspaceId });
  // "/properties?new=1" (from the dashboard) opens the add sheet straight away.
  const [adding, setAdding] = useState(
    () => new URLSearchParams(window.location.search).has("new") && can("edit"),
  );

  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", to("/properties"));
  }, [to]);

  return (
    <>
      <Header
        title="Properties"
        actions={
          can("edit") && (
            <button className="icon-btn dark" onClick={() => setAdding(true)} aria-label="Add property">
              <Plus size={20} />
            </button>
          )
        }
      />
      <div className="page">
        {!properties ? (
          <div className="prop-grid">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton" style={{ height: 150, borderRadius: 22 }} />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="card">
            <Empty
              icon={<Building2 size={22} />}
              title="No properties yet"
              text="Add your villas, houses or apartments, then assign tenants to them."
              action={
                can("edit") && (
                  <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
                    <Plus size={16} /> Add property
                  </button>
                )
              }
            />
          </div>
        ) : (
          <div className="prop-grid">
            {properties.map((p) => {
              const { Icon, label } = kindOf(p.kind);
              return (
                <Link href={to(`/properties/${p._id}`)} className="prop-card" key={p._id}>
                  <div className="prop-card-top">
                    <span className="kind-tile">
                      <Icon size={22} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3>{p.name}</h3>
                      <div className="row-sub" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {p.address ? (
                          <>
                            <MapPin size={12} /> {p.address}
                          </>
                        ) : (
                          label
                        )}
                      </div>
                    </div>
                    <span className="badge">{label}</span>
                  </div>
                  <div className="prop-card-foot">
                    <span>
                      {p.unitCount === 0
                        ? "No units yet"
                        : `${p.occupiedCount} of ${p.unitCount} unit${p.unitCount === 1 ? "" : "s"} rented`}
                    </span>
                    <strong className="num" style={{ color: "var(--ink)" }}>
                      {money(p.monthlyRent)}
                      <span className="muted" style={{ fontWeight: 500 }}>
                        {" "}
                        / mo
                      </span>
                    </strong>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      {adding && <PropertySheet property={{ name: "", kind: "villa", units: [] }} onClose={() => setAdding(false)} />}
    </>
  );
}
