"use client";

import { useQuery } from "convex/react";
import { CircleCheck, Search, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Header from "@/components/Header";
import MonthSwitch from "@/components/MonthSwitch";
import PaymentSheet, { type PayTarget } from "@/components/PaymentSheet";
import { Avatar, Empty, SkeletonList } from "@/components/ui";
import { monthKey, monthLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/** Everyone who still owes rent for a month, with a one-tap collect. */
export default function CollectPage() {
  const { workspace, can, money, to, clampMonth } = useWorkspace();
  const [month, setMonth] = useState(() => clampMonth(monthKey()));
  const summary = useQuery(api.payments.summary, { workspaceId: workspace.workspaceId, month });
  const [pay, setPay] = useState<PayTarget | null>(null);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const due = summary?.due.filter(
    (t) => !q || t.name.toLowerCase().includes(q) || t.propertyName?.toLowerCase().includes(q),
  );
  const pct =
    summary && summary.expected > 0
      ? Math.min(100, Math.round((summary.collected / summary.expected) * 100))
      : 0;

  return (
    <>
      <Header title="Collect due" />
      <div className="page">
        <MonthSwitch month={month} onChange={setMonth} />

        <section className="hero" aria-label="Left to collect">
          <div className="hero-top">
            <span className="hero-label">Left to collect</span>
            <span className="hero-pill">{pct}% in</span>
          </div>
          <div className="hero-amount">{summary ? money(summary.left) : "—"}</div>
          <div className="hero-sub">
            {summary
              ? `${summary.due.length} tenant${summary.due.length === 1 ? "" : "s"} still owe · ${money(summary.collected)} collected`
              : "—"}
          </div>
          <div className="bar" style={{ marginBottom: 0 }}>
            <span style={{ width: `${pct}%` }} />
          </div>
        </section>

        {summary && summary.due.length > 4 && (
          <div className="input-wrap">
            <Search size={17} color="var(--ink-3)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenant or property"
              type="search"
            />
          </div>
        )}

        {!summary || !due ? (
          <SkeletonList rows={3} />
        ) : summary.tenantCount === 0 ? (
          <div className="card">
            <Empty
              icon={<Users size={22} />}
              title="No tenants yet"
              text="Add tenants to start collecting rent."
              action={
                can("edit") && (
                  <Link href={to("/tenants/new")} className="btn btn-primary btn-sm">
                    Add tenant
                  </Link>
                )
              }
            />
          </div>
        ) : summary.due.length === 0 ? (
          <div className="card">
            <Empty
              icon={<CircleCheck size={22} />}
              title="All collected"
              text={`Everyone has paid in full for ${monthLabel(month)}.`}
            />
          </div>
        ) : due.length === 0 ? (
          <div className="card">
            <Empty icon={<Search size={22} />} title="No matches" />
          </div>
        ) : (
          <div className="card list">
            {due.map((t) => (
              <div className="row" key={t._id}>
                <Link href={to(`/tenants/${t._id}`)} style={{ display: "contents" }}>
                  <Avatar name={t.name} url={t.photoUrl} />
                  <div className="row-main">
                    <div className="row-title">{t.name}</div>
                    <div className="row-sub">
                      {t.paid > 0 ? `Paid ${money(t.paid)} of ${money(t.rent)}` : (t.propertyName ?? "No property")}
                    </div>
                  </div>
                </Link>
                <div className="row-end">
                  <span className="row-amount">{money(t.remaining)}</span>
                  {t.paid > 0 ? <span className="badge warn">Partial</span> : <span className="badge">Due</span>}
                </div>
                {can("edit") && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() =>
                      setPay({ tenantId: t._id as Id<"tenants">, name: t.name, amount: t.remaining, month })
                    }
                  >
                    Collect
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!can("edit") && summary && summary.due.length > 0 && (
          <p className="hint-text" style={{ textAlign: "center" }}>
            You have read-only access, so payments can&apos;t be recorded here.
          </p>
        )}
      </div>
      {pay && <PaymentSheet target={pay} onClose={() => setPay(null)} />}
    </>
  );
}
