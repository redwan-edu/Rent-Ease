"use client";

import { useQuery } from "convex/react";
import { CalendarClock, ChevronDown, CircleCheck, Search, Users } from "lucide-react";
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
 * Everything still owed from months already gone by. The dashboard resets each
 * month on purpose; this is where the leftovers stay visible until they're paid.
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
      <Header title="Past dues" />
      <div className="page">
        <section className="hero" aria-label="Owed from earlier months">
          <div className="hero-top">
            <span className="hero-label">Owed from earlier months</span>
            {data && data.monthCount > 0 && (
              <span className="hero-pill">
                {data.monthCount} month{data.monthCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="hero-amount amber">{data ? money(data.total) : "—"}</div>
          <div className="hero-sub">
            {!data
              ? "—"
              : data.total === 0
                ? `Nothing outstanding since ${monthLabel(data.startMonth)}.`
                : `${data.tenants.length} tenant${data.tenants.length === 1 ? "" : "s"} behind · oldest ${monthLabel(data.oldest ?? data.startMonth)}`}
          </div>
          <p className="hero-note">
            {data ? monthLabel(data.currentMonth) : "The running month"} is not counted here — that
            one is on the home screen.
          </p>
        </section>

        {data && data.tenants.length > 4 && (
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

        {!data || !tenants ? (
          <SkeletonList rows={3} />
        ) : data.tenants.length === 0 ? (
          <div className="card">
            <Empty
              icon={<CircleCheck size={22} />}
              title="All caught up"
              text={`Every month since ${monthLabel(data.startMonth)} is fully collected.`}
              action={
                <Link href={to("/collect")} className="btn btn-secondary btn-sm">
                  Collect this month
                </Link>
              }
            />
          </div>
        ) : tenants.length === 0 ? (
          <div className="card">
            <Empty icon={<Users size={22} />} title="No matches" />
          </div>
        ) : (
          <div className="stack">
            {tenants.map((t) => {
              const expanded = open === t._id;
              return (
                <div className="card" key={t._id}>
                  <button
                    className="row"
                    onClick={() => setOpen(expanded ? null : t._id)}
                    aria-expanded={expanded}
                  >
                    <Avatar name={t.name} url={t.photoUrl} />
                    <div className="row-main">
                      <div className="row-title">
                        {t.name}
                        {t.status === "former" && <span className="badge">Former</span>}
                      </div>
                      <div className="row-sub">
                        {t.months.length} month{t.months.length === 1 ? "" : "s"} behind
                        {t.propertyName ? ` · ${t.propertyName}` : ""}
                      </div>
                    </div>
                    <div className="row-end">
                      <span className="row-amount amber">{money(t.remaining)}</span>
                    </div>
                    <ChevronDown size={18} className={`chev${expanded ? " flip" : ""}`} />
                  </button>

                  {expanded && (
                    <div className="list arrears-months">
                      {t.months.map((m) => (
                        <div className="row" key={m.month}>
                          <span className="row-icon warn">
                            <CalendarClock size={18} />
                          </span>
                          <div className="row-main">
                            <div className="row-title">{monthLabel(m.month)}</div>
                            <div className="row-sub">
                              {m.paid > 0
                                ? `Paid ${money(m.paid)} of ${money(m.rent)}`
                                : `Nothing paid of ${money(m.rent)}`}
                            </div>
                          </div>
                          <div className="row-end">
                            <span className="row-amount">{money(m.remaining)}</span>
                          </div>
                          {can("edit") && (
                            <button
                              className="btn btn-sm btn-primary"
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
                          <div className="row-sub">Open {t.name}&apos;s full record</div>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!can("edit") && data && data.total > 0 && (
          <p className="hint-text" style={{ textAlign: "center" }}>
            You have read-only access, so payments can&apos;t be recorded here.
          </p>
        )}
      </div>
      {pay && <PaymentSheet target={pay} onClose={() => setPay(null)} />}
    </>
  );
}
