"use client";

import { useQuery } from "convex/react";
import { ChevronDown, ChevronRight, CircleCheck, Search, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Header from "@/components/Header";
import PaymentSheet, { type PayTarget } from "@/components/PaymentSheet";
import { Avatar, Empty, SkeletonList } from "@/components/ui";
import { monthKey, monthLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/**
 * Everything still owed from months already gone by. Home resets each month on
 * purpose; this is where the leftovers stay visible until they're paid.
 */
export default function ArrearsPage() {
  const { workspace, can, money, to } = useWorkspace();
  const data = useQuery(api.payments.arrears, {
    workspaceId: workspace.workspaceId,
    today: monthKey(),
  });
  const [pay, setPay] = useState<PayTarget | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const tenants = data?.tenants.filter(
    (t) => !q || t.name.toLowerCase().includes(q) || t.propertyName?.toLowerCase().includes(q),
  );

  return (
    <>
      <Header title="Past dues" back="/more" />
      <div className="page">
        {!data || !tenants ? (
          <SkeletonList rows={3} />
        ) : data.tenants.length === 0 ? (
          <div className="card">
            <Empty
              icon={<CircleCheck size={24} />}
              title="All caught up"
              text={`Every month since ${monthLabel(data.startMonth)} is fully collected.`}
            />
          </div>
        ) : (
          <>
            <section className="card summary" aria-label="Owed from earlier months">
              <span className="summary-label">Owed from earlier months</span>
              <div className="summary-amount warn">{money(data.total)}</div>
              <div className="summary-sub">
                {data.tenants.length} {data.tenants.length === 1 ? "tenant" : "tenants"} behind, oldest from{" "}
                {monthLabel(data.oldest ?? data.startMonth)}
              </div>
            </section>
            <p className="hint-text">{monthLabel(data.currentMonth)} is not counted here. It&apos;s on Home.</p>

            {data.tenants.length > 5 && (
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

            {tenants.length === 0 ? (
              <div className="card">
                <Empty icon={<Users size={24} />} title="No matches" />
              </div>
            ) : (
              <div className="stack">
                {tenants.map((t) => {
                  const expanded = open === t._id;
                  return (
                    <div className="card" key={t._id}>
                      <button className="row" onClick={() => setOpen(expanded ? null : t._id)} aria-expanded={expanded}>
                        <Avatar name={t.name} url={t.photoUrl} />
                        <div className="row-main">
                          <div className="row-title">
                            {t.name}
                            {t.status === "former" && <span className="badge">Former</span>}
                          </div>
                          <div className="row-sub">{t.propertyName ?? "No property"}</div>
                        </div>
                        <div className="row-end">
                          <span className="row-amount warn">{money(t.remaining)}</span>
                          <span className="row-sub">
                            {t.months.length} {t.months.length === 1 ? "month" : "months"}
                          </span>
                        </div>
                        <ChevronDown size={18} className={`chev${expanded ? " flip" : ""}`} />
                      </button>

                      {expanded && (
                        <div className="list arrears-months">
                          {t.months.map((m) => (
                            <div className="row" key={m.month}>
                              <div className="row-main">
                                <div className="row-title">{monthLabel(m.month)}</div>
                                <div className="row-sub">
                                  {m.paid > 0
                                    ? `Paid ${money(m.paid)} of ${money(m.rent)}`
                                    : `Nothing paid of ${money(m.rent)}`}
                                </div>
                              </div>
                              <span className="row-amount">{money(m.remaining)}</span>
                              {can("edit") && (
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() =>
                                    setPay({
                                      tenantId: t._id as Id<"tenants">,
                                      name: t.name,
                                      amount: m.remaining,
                                      month: m.month,
                                    })
                                  }
                                >
                                  Collect
                                </button>
                              )}
                            </div>
                          ))}
                          <Link href={to(`/tenants/${t._id}`)} className="row">
                            <div className="row-main">
                              <div className="row-sub">Open {t.name}&apos;s profile</div>
                            </div>
                            <ChevronRight size={18} className="chev" />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!can("edit") && (
              <p className="hint-text" style={{ textAlign: "center" }}>
                You have read-only access, so you can&apos;t record payments.
              </p>
            )}
          </>
        )}
      </div>
      {pay && <PaymentSheet target={pay} onClose={() => setPay(null)} />}
    </>
  );
}
