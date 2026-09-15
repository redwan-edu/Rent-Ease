"use client";

import { useQuery } from "convex/react";
import { Building2, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import Header from "@/components/Header";
import PropertySheet from "@/components/PropertySheet";
import { Empty, SkeletonList } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

export default function PropertiesPage() {
  const { workspace, can, money, to } = useWorkspace();
  // Members limited to certain properties can't add new ones.
  const canAdd = can("edit") && !workspace.restricted;
  const properties = useQuery(api.properties.list, { workspaceId: workspace.workspaceId });
  // "/properties?new=1" (from the setup guide) opens the add sheet straight away.
  const [adding, setAdding] = useState(
    () => new URLSearchParams(window.location.search).has("new") && canAdd,
  );

  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", to("/properties"));
  }, [to]);

  return (
    <>
      <Header
        title="Properties"
        actions={
          canAdd && (
            <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}>
              <Plus size={16} /> Add
            </button>
          )
        }
      />
      <div className="page">
        {!properties ? (
          <SkeletonList rows={2} />
        ) : properties.length === 0 ? (
          <div className="card">
            <Empty
              icon={<Building2 size={24} />}
              title="No properties yet"
              text="Add the buildings or homes you rent out, with their units."
              action={
                canAdd && (
                  <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
                    <Plus size={16} /> Add property
                  </button>
                )
              }
            />
          </div>
        ) : (
          <div className="card list">
            {properties.map((p) => (
              <Link href={to(`/properties/${p._id}`)} className="row" key={p._id}>
                <div className="row-main">
                  <div className="row-title">{p.name}</div>
                  <div className="row-sub">
                    {p.unitCount === 0
                      ? "No units yet"
                      : `${p.occupiedCount} of ${p.unitCount} ${p.unitCount === 1 ? "unit" : "units"} rented`}
                  </div>
                </div>
                <div className="row-end">
                  <span className="row-amount">{money(p.monthlyRent)}</span>
                  <span className="row-sub">a month</span>
                </div>
                <ChevronRight size={18} className="chev" />
              </Link>
            ))}
          </div>
        )}
      </div>
      {adding && <PropertySheet property={{ name: "", kind: "villa", units: [] }} onClose={() => setAdding(false)} />}
    </>
  );
}
