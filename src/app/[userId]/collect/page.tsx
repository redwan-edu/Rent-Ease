"use client";

import { useQuery } from "convex/react";
import { CircleCheck, Search, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import DueList from "@/components/DueList";
import Header from "@/components/Header";
import MonthSwitch from "@/components/MonthSwitch";
import PaymentSheet, { type PayTarget } from "@/components/PaymentSheet";
import { Empty, SkeletonList } from "@/components/ui";
import { monthKey, monthLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/** Everyone who still owes rent for a month, searchable, with a one-tap collect. */
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

  return (
    <>
      <Header title="Still due" back="/" />
      <div className="page">
        <MonthSwitch month={month} onChange={setMonth} />

        {summary && summary.due.length > 0 && (
          <p className="lead">
            {money(summary.left)} left to collect from {summary.due.length}{" "}
            {summary.due.length === 1 ? "tenant" : "tenants"}.
          </p>
        )}

        {summary && summary.due.length > 5 && (
          <div className="input-wrap">
            <Search size={17} />
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
              icon={<Users size={24} />}
              title="No rent due"
              text={`Nobody rents in ${monthLabel(month)}.`}
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
              icon={<CircleCheck size={24} />}
              title="All collected"
              text={`Everyone has paid in full for ${monthLabel(month)}.`}
            />
          </div>
        ) : due.length === 0 ? (
          <div className="card">
            <Empty icon={<Search size={24} />} title="No matches" />
          </div>
        ) : (
          <DueList tenants={due} onCollect={(t) => setPay({ ...t, month })} />
        )}

        {!can("edit") && summary && summary.due.length > 0 && (
          <p className="hint-text" style={{ textAlign: "center" }}>
            You have read-only access, so you can&apos;t record payments.
          </p>
        )}
      </div>
      {pay && <PaymentSheet target={pay} onClose={() => setPay(null)} />}
    </>
  );
}
