"use client";

import { useQuery } from "convex/react";
import { Plus, Search, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import Header from "@/components/Header";
import { Avatar, Empty, Segmented, SkeletonList } from "@/components/ui";
import { dateLabel, monthKey } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function TenantsPage() {
  const { workspace, can, money, to } = useWorkspace();
  const [status, setStatus] = useState<"active" | "former">("active");
  const [search, setSearch] = useState("");
  const tenants = useQuery(api.tenants.list, {
    workspaceId: workspace.workspaceId,
    status,
    month: monthKey(),
  });

  const q = search.trim().toLowerCase();
  const filtered = tenants?.filter(
    (t) =>
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.phone.includes(q) ||
      t.propertyName?.toLowerCase().includes(q),
  );

  return (
    <>
      <Header
        title="Tenants"
        actions={
          can("edit") && (
            <Link href={to("/tenants/new")} className="icon-btn dark" aria-label="Add tenant">
              <Plus size={20} />
            </Link>
          )
        }
      />
      <div className="page">
        <div style={{ display: "grid", gap: 12 }}>
          <div className="input-wrap">
            <Search size={17} color="var(--ink-3)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone or property"
              type="search"
            />
          </div>
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: "Current" },
              { value: "former", label: "Former" },
            ]}
          />
        </div>

        {!filtered ? (
          <SkeletonList rows={4} />
        ) : filtered.length === 0 ? (
          <div className="card">
            {q ? (
              <Empty icon={<Search size={22} />} title="No matches" text="Try a different name or number." />
            ) : status === "active" ? (
              <Empty
                icon={<Users size={22} />}
                title="No tenants yet"
                text="Add a tenant with their details, rent and documents."
                action={
                  can("edit") && (
                    <Link href={to("/tenants/new")} className="btn btn-primary btn-sm">
                      <Plus size={16} /> Add tenant
                    </Link>
                  )
                }
              />
            ) : (
              <Empty
                icon={<UserRound size={22} />}
                title="No former tenants"
                text="When a tenant moves out, their full history is kept here."
              />
            )}
          </div>
        ) : (
          <div className="card list">
            {filtered.map((t) => {
              const state =
                t.paid >= t.rent ? "paid" : t.paid > 0 ? "partial" : "due";
              return (
                <Link href={to(`/tenants/${t._id}`)} className="row" key={t._id}>
                  <Avatar name={t.name} url={t.photoUrl} />
                  <div className="row-main">
                    <div className="row-title">{t.name}</div>
                    <div className="row-sub">
                      {status === "former"
                        ? `Moved out ${dateLabel(t.moveOutDate)}`
                        : [
                            t.propertyName
                              ? t.unitName
                                ? `${t.propertyName} · ${t.unitName}`
                                : t.propertyName
                              : "No property",
                            t.phone,
                          ].join(" · ")}
                    </div>
                  </div>
                  <div className="row-end">
                    <span className="row-amount">{money(t.rent)}</span>
                    {/* Status is only about the running month, and only if they rent in it. */}
                    {status === "active" &&
                      t.owes &&
                      (state === "paid" ? (
                        <span className="badge ok">Paid</span>
                      ) : state === "partial" ? (
                        <span className="badge warn">Partial</span>
                      ) : (
                        <span className="badge">Due</span>
                      ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
