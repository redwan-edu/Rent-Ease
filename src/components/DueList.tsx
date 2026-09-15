"use client";

import Link from "next/link";
import type { Id } from "@convex/_generated/dataModel";
import { useWorkspace } from "@/lib/workspace";
import { Avatar } from "./ui";

export type DueTenant = {
  _id: string;
  name: string;
  rent: number;
  paid: number;
  remaining: number;
  photoUrl: string | null;
  propertyName: string | null;
};

/** Tenants who still owe for a month: what's left, and a Collect button for anyone who can record payments. */
export default function DueList({
  tenants,
  onCollect,
}: {
  tenants: DueTenant[];
  onCollect: (target: { tenantId: Id<"tenants">; name: string; amount: number }) => void;
}) {
  const { can, money, to } = useWorkspace();

  return (
    <div className="card list">
      {tenants.map((t) => (
        <div className="row" key={t._id}>
          <Link href={to(`/tenants/${t._id}`)} className="contents">
            <Avatar name={t.name} url={t.photoUrl} />
            <div className="row-main">
              <div className="row-title">{t.name}</div>
              <div className="row-sub">
                {t.paid > 0 ? `Paid ${money(t.paid)} of ${money(t.rent)}` : (t.propertyName ?? "No property")}
              </div>
            </div>
          </Link>
          <span className="row-amount">{money(t.remaining)}</span>
          {can("edit") && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => onCollect({ tenantId: t._id as Id<"tenants">, name: t.name, amount: t.remaining })}
            >
              Collect
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
