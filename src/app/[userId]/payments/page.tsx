"use client";

import { useQuery } from "convex/react";
import { Receipt, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@convex/_generated/api";
import type { PaymentHistoryRow } from "@convex/payments";
import EditPaymentSheet, {
  type EditablePayment,
} from "@/components/EditPaymentSheet";
import Header from "@/components/Header";
import { Avatar, Empty, Sheet, SkeletonList } from "@/components/ui";
import { dateLabel, monthLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Sort = "newest" | "oldest" | "highest" | "lowest";

const SORT_OPTIONS: { value: Sort; label: string; desc: string }[] = [
  { value: "newest", label: "Newest", desc: "Most recent payment date first" },
  { value: "oldest", label: "Oldest", desc: "Earliest payment date first" },
  { value: "highest", label: "Highest", desc: "Largest payment amount first" },
  { value: "lowest", label: "Lowest", desc: "Smallest payment amount first" },
];

const SORTERS: Record<
  Sort,
  (a: PaymentHistoryRow, b: PaymentHistoryRow) => number
> = {
  newest: (a, b) =>
    a.paidOn === b.paidOn
      ? b.month.localeCompare(a.month)
      : b.paidOn.localeCompare(a.paidOn),
  oldest: (a, b) =>
    a.paidOn === b.paidOn
      ? a.month.localeCompare(b.month)
      : a.paidOn.localeCompare(b.paidOn),
  highest: (a, b) => b.amount - a.amount,
  lowest: (a, b) => a.amount - b.amount,
};

/** Every payment ever recorded in this workspace, one by one — searchable and sortable. */
export default function PaymentsHistoryPage() {
  const { workspace, can, money } = useWorkspace();
  const rows = useQuery(api.payments.list, {
    workspaceId: workspace.workspaceId,
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [editing, setEditing] = useState<EditablePayment | null>(null);

  // const total = rows?.reduce((s, r) => s + r.amount, 0) ?? 0;
  const currentSort =
    SORT_OPTIONS.find((o) => o.value === sort) ?? SORT_OPTIONS[0];

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!rows) return rows;
    const matches = !q
      ? rows
      : rows.filter(
          (r) =>
            r.tenantName.toLowerCase().includes(q) ||
            r.placeName?.toLowerCase().includes(q) ||
            r.note?.toLowerCase().includes(q) ||
            r.recordedByName?.toLowerCase().includes(q),
        );
    return [...matches].sort(SORTERS[sort]);
  }, [rows, q, sort]);

  return (
    <>
      <Header title="Payments" back="/more" />
      <div className="page">
        {rows && rows.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="input-wrap" style={{ flex: 1 }}>
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tenant, property or note"
                type="search"
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ height: 48, padding: "0 14px", flexShrink: 0 }}
              onClick={() => setSortOpen(true)}
              aria-label={`Sort payments. Currently: ${currentSort.label}`}
            >
              <SlidersHorizontal size={17} />
              <span>{currentSort.label}</span>
            </button>
          </div>
        )}

        {!rows || !filtered ? (
          <SkeletonList rows={4} />
        ) : rows.length === 0 ? (
          <div className="card">
            <Empty
              icon={<Receipt size={24} />}
              title="No payments yet"
              text="Every payment you record shows up here."
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <Empty icon={<Search size={24} />} title="No matches" />
          </div>
        ) : (
          <div className="card list">
            {filtered.map((p) => (
              <button
                className="row"
                key={p._id}
                disabled={!can("full")}
                onClick={() =>
                  can("full") &&
                  setEditing({
                    _id: p._id,
                    tenantId: p.tenantId,
                    tenantName: p.tenantName,
                    amount: p.amount,
                    month: p.month,
                    paidOn: p.paidOn,
                    note: p.note ?? undefined,
                  })
                }
                aria-label={
                  can("full")
                    ? `Edit or undo ${p.tenantName}'s payment for ${monthLabel(p.month)}`
                    : undefined
                }
              >
                <Avatar name={p.tenantName} url={p.tenantPhotoUrl} />
                <div className="row-main">
                  <div className="row-title">
                    {p.tenantName}
                    {p.tenantStatus === "former" && (
                      <span className="badge">Former</span>
                    )}
                  </div>
                  <div className="row-sub">
                    {monthLabel(p.month)} · Paid {dateLabel(p.paidOn)}
                    {p.recordedByName ? ` by ${p.recordedByName}` : ""}
                    {p.placeName ? ` · ${p.placeName}` : ""}
                    {p.note ? ` · ${p.note}` : ""}
                  </div>
                </div>
                <span className="row-amount">{money(p.amount)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {editing && (
        <EditPaymentSheet payment={editing} onClose={() => setEditing(null)} />
      )}
      {sortOpen && (
        <Sheet title="Sort payments" onClose={() => setSortOpen(false)}>
          <div className="role-pick">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={sort === opt.value ? "on" : ""}
                onClick={() => {
                  setSort(opt.value);
                  setSortOpen(false);
                }}
              >
                <span className="radio" />
                <div style={{ flex: 1 }}>
                  <strong>{opt.label}</strong>
                  <span>{opt.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}
