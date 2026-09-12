"use client";

import { useMutation, useQuery } from "convex/react";
import {
  Archive,
  FileText,
  Images,
  RotateCcw,
  Search,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import ArchiveRecord from "@/components/ArchiveRecord";
import Header from "@/components/Header";
import { Avatar, ConfirmSheet, Empty, SkeletonList, useRun } from "@/components/ui";
import { dateLabel, whenLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/**
 * Deleted tenants, kept in full. Nothing here has been thrown away — it is the
 * evidence if a former tenant ever disputes what they paid or handed over.
 */
export default function ArchivePage() {
  const { workspace, can, money } = useWorkspace();
  const rows = useQuery(api.archive.list, { workspaceId: workspace.workspaceId });
  const restore = useMutation(api.archive.restore);
  const purge = useMutation(api.archive.purge);
  const { run } = useRun();

  const [open, setOpen] = useState<Id<"archivedTenants"> | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<{ id: Id<"archivedTenants">; name: string } | null>(null);
  const [confirmPurge, setConfirmPurge] = useState<{ id: Id<"archivedTenants">; name: string } | null>(null);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const list = rows?.filter(
    (r) => !q || r.name.toLowerCase().includes(q) || r.phone.includes(q) || r.placeName?.toLowerCase().includes(q),
  );

  return (
    <>
      <Header title="Archive" />
      <div className="page">
        <div className="banner">
          <Archive size={16} />
          Deleted tenants are kept here in full — profile, family, payments, notes and every
          uploaded file.
        </div>

        {rows && rows.length > 4 && (
          <div className="input-wrap">
            <Search size={17} color="var(--ink-3)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone or property"
              type="search"
            />
          </div>
        )}

        {!rows || !list ? (
          <SkeletonList rows={2} />
        ) : rows.length === 0 ? (
          <div className="card">
            <Empty
              icon={<Archive size={22} />}
              title="Nothing archived"
              text="Tenants you delete land here with their whole history intact."
            />
          </div>
        ) : list.length === 0 ? (
          <div className="card">
            <Empty icon={<Search size={22} />} title="No matches" />
          </div>
        ) : (
          <div className="stack">
            {list.map((r) => (
              <div className="card" key={r._id}>
                <button className="row" onClick={() => setOpen(r._id)}>
                  <Avatar name={r.name} url={null} />
                  <div className="row-main">
                    <div className="row-title">{r.name}</div>
                    <div className="row-sub">
                      {r.placeName ?? "No property"} · deleted {whenLabel(r.archivedAt)}
                    </div>
                  </div>
                  <div className="row-end">
                    <span className="row-amount">{money(r.totalPaid)}</span>
                    <span className="badge">collected</span>
                  </div>
                </button>

                <div className="archive-facts">
                  <span>
                    <Wallet size={14} /> {r.paymentCount} payment{r.paymentCount === 1 ? "" : "s"}
                  </span>
                  <span>
                    <Users size={14} /> {r.familyCount} family
                  </span>
                  <span>
                    <Images size={14} /> {r.fileCount} file{r.fileCount === 1 ? "" : "s"}
                  </span>
                  <span>
                    <FileText size={14} /> {r.noteCount} note{r.noteCount === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="archive-meta">
                  Rented {dateLabel(r.movedInOn)} — {r.movedOutOn ? dateLabel(r.movedOutOn) : "no move-out recorded"} ·
                  deleted by {r.archivedByName}
                  {r.reason ? ` · "${r.reason}"` : ""}
                </div>

                {can("full") && (
                  <div className="archive-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setConfirmRestore({ id: r._id, name: r.name })}
                    >
                      <RotateCcw size={15} /> Restore
                    </button>
                    {workspace.role === "owner" && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--danger)" }}
                        onClick={() => setConfirmPurge({ id: r._id, name: r.name })}
                      >
                        <Trash2 size={15} /> Erase forever
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {open && <ArchiveRecord archiveId={open} onClose={() => setOpen(null)} />}

      {confirmRestore && (
        <ConfirmSheet
          title={`Restore ${confirmRestore.name}?`}
          text="They come back as a former tenant with every payment, family member and file. You can mark them current again afterwards."
          confirmLabel="Restore"
          onClose={() => setConfirmRestore(null)}
          onConfirm={() =>
            run(() => restore({ archiveId: confirmRestore.id }), `${confirmRestore.name} restored`)
          }
        />
      )}
      {confirmPurge && (
        <ConfirmSheet
          title={`Erase ${confirmPurge.name} forever?`}
          text="This permanently destroys the record and every uploaded photo and document. It cannot be undone, and you will have no proof of this tenancy afterwards."
          confirmLabel="Erase forever"
          onClose={() => setConfirmPurge(null)}
          onConfirm={() => run(() => purge({ archiveId: confirmPurge.id }), "Record erased")}
        />
      )}
    </>
  );
}
