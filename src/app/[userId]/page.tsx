"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  AlarmClock,
  Building2,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  LayoutGrid,
  NotebookPen,
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
import { Avatar, Empty, Sheet, SkeletonList } from "@/components/ui";
import { greeting, monthKey, monthLabel, whenLabel } from "@/lib/format";
import { roleLabel, useWorkspace } from "@/lib/workspace";

export default function Dashboard() {
  const { workspace, can, money, to, clampMonth } = useWorkspace();
  const workspaceId = workspace.workspaceId;
  const { user } = useUser();
  const [month, setMonth] = useState(() => clampMonth(monthKey()));
  const summary = useQuery(api.payments.summary, { workspaceId, month });
  const arrears = useQuery(api.payments.arrears, { workspaceId, today: monthKey() });
  const upcoming = useQuery(api.notes.upcoming, { workspaceId });
  const [pay, setPay] = useState<PayTarget | null>(null);
  const [overview, setOverview] = useState(false);

  const pct =
    summary && summary.expected > 0
      ? Math.min(100, Math.round((summary.collected / summary.expected) * 100))
      : 0;

  return (
    <>
      <Header
        eyebrow={greeting()}
        actions={
          <button
            className="icon-btn"
            onClick={() => setOverview(true)}
            aria-label="Overview"
          >
            <LayoutGrid size={18} />
          </button>
        }
      />
      <div className="page">
        {workspace.role !== "owner" && (
          <div className="banner">
            <Users size={16} />
            {workspace.name}&apos;s workspace · {roleLabel[workspace.role]}
            {workspace.restricted && " · your properties only"}
          </div>
        )}

        <MonthSwitch month={month} onChange={setMonth} showCurrent />

        <section className="hero" aria-label="Rent collected">
          <div className="hero-top">
            <span className="hero-label">Collected</span>
            <span className="hero-pill">{pct}%</span>
          </div>
          <div className="hero-amount">
            {summary ? money(summary.collected) : "—"}
          </div>
          <div className="hero-sub">
            of {summary ? money(summary.expected) : "—"} expected
          </div>
          <div className="bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="hero-split">
            <div>
              <span className="hero-label">Left to collect</span>
              <strong className="amber">
                {summary ? money(summary.left) : "—"}
              </strong>
            </div>
            <div>
              <span className="hero-label">Paid in full</span>
              <strong>
                {summary
                  ? `${summary.paidCount} / ${summary.tenantCount}`
                  : "—"}
              </strong>
            </div>
          </div>
        </section>

        {arrears && arrears.total > 0 && (
          <Link href={to("/arrears")} className="card row arrears-callout">
            <span className="row-icon warn">
              <CalendarClock size={18} />
            </span>
            <div className="row-main">
              <div className="row-title">
                {money(arrears.total)} still owed from earlier months
              </div>
              <div className="row-sub">
                {arrears.tenants.length} tenant
                {arrears.tenants.length === 1 ? "" : "s"} behind · oldest{" "}
                {monthLabel(arrears.oldest ?? arrears.startMonth)}
              </div>
            </div>
            <ChevronRight size={18} className="chev" />
          </Link>
        )}

        {can("edit") && (
          <div className="quick-actions">
            <Link href={to("/tenants/new")}>
              <span className="qa-icon">
                <UserPlus size={17} />
              </span>
              New tenant
            </Link>
            {!workspace.restricted && (
              <Link href={to("/properties?new=1")}>
                <span className="qa-icon">
                  <Building2 size={17} />
                </span>
                New property
              </Link>
            )}
            <Link href={to("/notes?new=1")}>
              <span className="qa-icon">
                <NotebookPen size={17} />
              </span>
              New note
            </Link>
          </div>
        )}

        <section id="due" className="anchor">
          <div className="section-head">
            <h2>Still due</h2>
            <Link href={to("/tenants")}>All tenants</Link>
          </div>
          {!summary ? (
            <SkeletonList rows={2} />
          ) : summary.tenantCount === 0 ? (
            <div className="card">
              <Empty
                icon={<Users size={22} />}
                title="No tenants yet"
                text="Add your first tenant to start tracking rent."
                action={
                  can("edit") && (
                    <Link
                      href={to("/tenants/new")}
                      className="btn btn-primary btn-sm"
                    >
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
                title="Everyone has paid"
                text={`All rent for ${monthLabel(month)} is collected.`}
              />
            </div>
          ) : (
            <div className="card list">
              {summary.due.map((t) => (
                <div className="row" key={t._id}>
                  <Link
                    href={to(`/tenants/${t._id}`)}
                    style={{ display: "contents" }}
                  >
                    <Avatar name={t.name} url={t.photoUrl} />
                    <div className="row-main">
                      <div className="row-title">{t.name}</div>
                      <div className="row-sub">
                        {t.paid > 0
                          ? `Paid ${money(t.paid)} of ${money(t.rent)}`
                          : (t.propertyName ?? "No property")}
                      </div>
                    </div>
                  </Link>
                  <div className="row-end">
                    <span className="row-amount">{money(t.remaining)}</span>
                    {can("edit") && (
                      <button
                        className="btn btn-sm btn-secondary"
                        style={{
                          height: 28,
                          fontSize: "calc(12.5px * var(--fs))",
                        }}
                        onClick={() =>
                          setPay({
                            tenantId: t._id as Id<"tenants">,
                            name: t.name,
                            amount: t.remaining,
                            month,
                          })
                        }
                      >
                        Collect
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="section-head">
            <h2>Upcoming reminders</h2>
            <Link href={to("/notes")}>Notes</Link>
          </div>
          {upcoming && upcoming.length === 0 ? (
            <div className="card">
              <Empty
                icon={<AlarmClock size={22} />}
                title="Nothing scheduled"
                text="Add a note in Notes and set a reminder so you don't forget."
              />
            </div>
          ) : (
            <div className="card list">
              {upcoming?.map((n) => (
                <Link href={to("/notes")} className="row" key={n._id}>
                  <span className="row-icon ok">
                    <AlarmClock size={18} />
                  </span>
                  <div className="row-main">
                    <div className="row-title">{n.body}</div>
                    <div className="row-sub">
                      {whenLabel(n.remindAt)}
                      {n.tenantName ? ` · ${n.tenantName}` : ""}
                    </div>
                  </div>
                  <ChevronRight size={18} className="chev" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {overview && (
        <Sheet title="Overview" onClose={() => setOverview(false)}>
          <div className="card list">
            <Link href={to("/properties")} className="row">
              <span className="row-icon">
                <Building2 size={18} />
              </span>
              <div className="row-main">
                <div className="row-title">Properties</div>
                <div className="row-sub">
                  {summary
                    ? `${summary.unitCount} units · ${summary.vacantUnits} vacant`
                    : "—"}
                </div>
              </div>
              <span className="row-count">{summary?.propertyCount ?? "—"}</span>
              <ChevronRight size={18} className="chev" />
            </Link>
            <Link href={to("/tenants")} className="row">
              <span className="row-icon">
                <Users size={18} />
              </span>
              <div className="row-main">
                <div className="row-title">Tenants</div>
                <div className="row-sub">
                  {summary
                    ? `${summary.paidCount} paid in full this month`
                    : "—"}
                </div>
              </div>
              <span className="row-count">{summary?.tenantCount ?? "—"}</span>
              <ChevronRight size={18} className="chev" />
            </Link>
            <button
              className="row"
              onClick={() => {
                setOverview(false);
                document
                  .getElementById("due")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span className="row-icon warn">
                <Wallet size={18} />
              </span>
              <div className="row-main">
                <div className="row-title">Still due</div>
                <div className="row-sub">
                  {summary ? `${money(summary.left)} left to collect` : "—"}
                </div>
              </div>
              <span className="row-count">{summary?.due.length ?? "—"}</span>
              <ChevronRight size={18} className="chev" />
            </button>
            <Link href={to("/arrears")} className="row" onClick={() => setOverview(false)}>
              <span className="row-icon warn">
                <CalendarClock size={18} />
              </span>
              <div className="row-main">
                <div className="row-title">Past dues</div>
                <div className="row-sub">
                  {arrears
                    ? arrears.total > 0
                      ? `${money(arrears.total)} owed from earlier months`
                      : "Every earlier month is collected"
                    : "—"}
                </div>
              </div>
              <span className="row-count">{arrears?.tenants.length ?? "—"}</span>
              <ChevronRight size={18} className="chev" />
            </Link>
          </div>
        </Sheet>
      )}
      {pay && <PaymentSheet target={pay} onClose={() => setPay(null)} />}
    </>
  );
}
