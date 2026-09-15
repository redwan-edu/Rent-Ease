"use client";

import { useQuery } from "convex/react";
import { Check, ChevronRight, CircleCheck, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import DueList from "@/components/DueList";
import Header from "@/components/Header";
import MonthSwitch from "@/components/MonthSwitch";
import PaymentSheet, { type PayTarget } from "@/components/PaymentSheet";
import { Empty, Section, SkeletonList } from "@/components/ui";
import { monthKey, monthLabel, whenLabel } from "@/lib/format";
import { roleLabel, useWorkspace } from "@/lib/workspace";

/** Home lists this many tenants who still owe; the rest are one tap away. */
const DUE_PREVIEW = 5;

export default function Dashboard() {
  const { workspace, money, to, clampMonth } = useWorkspace();
  const workspaceId = workspace.workspaceId;
  const [month, setMonth] = useState(() => clampMonth(monthKey()));
  const summary = useQuery(api.payments.summary, { workspaceId, month });
  const arrears = useQuery(api.payments.arrears, { workspaceId, today: monthKey() });
  const upcoming = useQuery(api.notes.upcoming, { workspaceId });
  const [pay, setPay] = useState<PayTarget | null>(null);

  const pct =
    summary && summary.expected > 0
      ? Math.min(100, Math.round((summary.collected / summary.expected) * 100))
      : 0;

  return (
    <>
      <Header title="Home" />
      <div className="page">
        {workspace.role !== "owner" && (
          <div className="banner">
            <Users size={15} />
            {workspace.name}&apos;s workspace · {roleLabel[workspace.role]}
          </div>
        )}

        {/* A workspace with no tenants yet gets a short setup guide instead of empty totals. */}
        {summary && summary.tenantCount === 0 && month === monthKey() ? (
          <GetStarted hasProperty={summary.propertyCount > 0} />
        ) : (
          <>
            <MonthSwitch month={month} onChange={setMonth} />

            <section className="card summary" aria-label={`Rent for ${monthLabel(month)}`}>
              <span className="summary-label">Collected</span>
              {summary ? (
                <>
                  <div className="summary-amount">{money(summary.collected)}</div>
                  <div className="summary-sub">of {money(summary.expected)} expected</div>
                </>
              ) : (
                <>
                  <span className="skeleton" style={{ height: 36, width: "50%", marginTop: 6 }} />
                  <span className="skeleton" style={{ height: 14, width: "35%", marginTop: 8 }} />
                </>
              )}
              <div className="meter">
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="summary-foot">
                <div>
                  <span>Left to collect</span>
                  <strong className={summary && summary.left > 0 ? "warn" : undefined}>
                    {summary ? money(summary.left) : " "}
                  </strong>
                </div>
                <div>
                  <span>Paid in full</span>
                  <strong>{summary ? `${summary.paidCount} of ${summary.tenantCount}` : " "}</strong>
                </div>
              </div>
            </section>

            {arrears && arrears.total > 0 && (
              <Link href={to("/arrears")} className="card row callout">
                <div className="row-main">
                  <div className="row-title">{money(arrears.total)} owed from earlier months</div>
                  <div className="row-sub">
                    {arrears.tenants.length} {arrears.tenants.length === 1 ? "tenant" : "tenants"} behind, oldest from{" "}
                    {monthLabel(arrears.oldest ?? arrears.startMonth)}
                  </div>
                </div>
                <ChevronRight size={18} className="chev" />
              </Link>
            )}

            <Section
              title="Still due"
              count={summary?.due.length || undefined}
              action={
                summary &&
                summary.due.length > DUE_PREVIEW && (
                  <Link href={to("/collect")} className="link-btn">
                    See all
                  </Link>
                )
              }
            >
              {!summary ? (
                <SkeletonList rows={2} />
              ) : summary.tenantCount === 0 ? (
                <p className="section-empty">No rent is due for {monthLabel(month)}.</p>
              ) : summary.due.length === 0 ? (
                <div className="card">
                  <Empty
                    icon={<CircleCheck size={24} />}
                    title="Everyone has paid"
                    text={`All rent for ${monthLabel(month)} is collected.`}
                  />
                </div>
              ) : (
                <DueList tenants={summary.due.slice(0, DUE_PREVIEW)} onCollect={(t) => setPay({ ...t, month })} />
              )}
            </Section>

            {upcoming && upcoming.length > 0 && (
              <Section
                title="Reminders"
                action={
                  <Link href={to("/notes")} className="link-btn">
                    All notes
                  </Link>
                }
              >
                <div className="card list">
                  {upcoming.map((n) => (
                    <Link href={to("/notes")} className="row" key={n._id}>
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
              </Section>
            )}
          </>
        )}
      </div>
      {pay && <PaymentSheet target={pay} onClose={() => setPay(null)} />}
    </>
  );
}

/** First-run guide: the three things that make the app useful, in order. */
function GetStarted({ hasProperty }: { hasProperty: boolean }) {
  const { workspace, can, to } = useWorkspace();

  if (!can("edit")) {
    return (
      <div className="card">
        <Empty
          icon={<Users size={24} />}
          title="No tenants yet"
          text="Once tenants are added, this month's rent shows up here."
        />
      </div>
    );
  }

  const steps = [
    // Members limited to certain properties can't add new ones.
    ...(workspace.restricted
      ? []
      : [
          {
            title: "Add a property",
            text: "The building or home you rent out, and its units.",
            done: hasProperty,
            href: to("/properties?new=1"),
          },
        ]),
    {
      title: "Add a tenant",
      text: "Their phone number, rent and the unit they live in.",
      done: false,
      href: to("/tenants/new"),
    },
    {
      title: "Collect rent",
      text: "Home then shows who has paid and who still owes.",
      done: false,
      href: null,
    },
  ];
  const next = steps.findIndex((s) => !s.done);

  return (
    <section className="welcome">
      <h2>Get started</h2>
      <p>Set up your rent book in a few minutes.</p>
      <div className="card list">
        {steps.map((s, i) => (
          <div className={`row step${s.done ? " done" : ""}`} key={s.title}>
            <span className="step-mark">{s.done ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
            <div className="row-main">
              <div className="row-title">{s.title}</div>
              <div className="row-sub">{s.text}</div>
            </div>
            {!s.done && s.href && (
              <Link href={s.href} className={`btn btn-sm ${i === next ? "btn-primary" : "btn-secondary"}`}>
                Add
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
