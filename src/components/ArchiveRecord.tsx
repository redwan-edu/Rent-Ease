"use client";

import { useQuery } from "convex/react";
import { FileText } from "lucide-react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { dateLabel, monthLabel, whenLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { Lightbox, type GalleryItem } from "./Lightbox";
import { Avatar, OverlayPage, Section, SkeletonList } from "./ui";

/** The complete archived record, read-only, exactly as it was when deleted. */
export default function ArchiveRecord({
  archiveId,
  onClose,
}: {
  archiveId: Id<"archivedTenants">;
  onClose: () => void;
}) {
  const { money } = useWorkspace();
  const r = useQuery(api.archive.get, { archiveId });
  const [viewing, setViewing] = useState<number | null>(null);

  if (!r) {
    return (
      <OverlayPage title="Archived record" onBack={onClose}>
        <div className="page">
          <SkeletonList rows={3} />
        </div>
      </OverlayPage>
    );
  }

  const files: GalleryItem[] = [
    ...(r.photoUrl ? [{ url: r.photoUrl, label: `${r.name}, photo`, kind: "image" as const }] : []),
    ...r.documents.map((d) => ({
      url: d.url,
      label: d.label,
      kind: (d.contentType?.startsWith("image/") ? "image" : d.contentType === "application/pdf" ? "pdf" : "file") as GalleryItem["kind"],
    })),
    ...r.family.flatMap((f) => [
      ...(f.photoUrl ? [{ url: f.photoUrl, label: `${f.name}, photo`, kind: "image" as const }] : []),
      ...f.nid.map((n, i) => ({
        url: n.url,
        label: `${f.name}, NID ${i + 1}`,
        kind: "image" as const,
      })),
    ]),
  ];

  return (
    <>
      <OverlayPage title="Archived record" onBack={onClose}>
        <div className="page">
          <div className="banner">
            Deleted {whenLabel(r.archivedAt)} by {r.archivedByName}
            {r.reason ? ` · “${r.reason}”` : ""}
          </div>

          <div className="archive-head">
            <Avatar name={r.name} url={r.photoUrl} size={64} />
            <div style={{ minWidth: 0 }}>
              <h2>{r.name}</h2>
              <p className="muted">{r.phone}</p>
              {r.placeName && <p className="muted">{r.placeName}</p>}
            </div>
          </div>

          <div className="card list">
            <div className="kv">
              <span>Total collected</span>
              <span>{money(r.totalPaid)}</span>
            </div>
            <div className="kv">
              <span>Rent</span>
              <span>{money(r.rent)} a month</span>
            </div>
            <div className="kv">
              <span>Tenancy</span>
              <span>
                {dateLabel(r.movedInOn)} to {r.movedOutOn ? dateLabel(r.movedOutOn) : "no move-out date"}
              </span>
            </div>
            <div className="kv">
              <span>People living there</span>
              <span>{r.residents}</span>
            </div>
            {r.condition && (
              <div className="kv stacked">
                <span>Condition at move-in</span>
                <span>{r.condition}</span>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <Section title="Files" count={files.length}>
              <div className="gallery-grid">
                {files.map((f, i) => (
                  <button key={i} className="gallery-thumb" onClick={() => setViewing(i)}>
                    {f.kind === "image" && f.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.url} alt={f.label} />
                    ) : (
                      <FileText size={26} strokeWidth={1.5} />
                    )}
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </Section>
          )}

          <Section title="Payments" count={r.payments.length || undefined}>
            {r.payments.length === 0 ? (
              <p className="section-empty">No payments were ever recorded.</p>
            ) : (
              <div className="card list">
                {r.payments.map((p) => (
                  <div className="row" key={p._id}>
                    <div className="row-main">
                      <div className="row-title">{monthLabel(p.month)}</div>
                      <div className="row-sub">
                        Paid {dateLabel(p.paidOn)}
                        {p.recordedByName ? ` by ${p.recordedByName}` : ""}
                        {p.note ? ` · ${p.note}` : ""}
                      </div>
                    </div>
                    <span className="row-amount">{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {r.family.length > 0 && (
            <Section title="Family" count={r.family.length}>
              <div className="card list">
                {r.family.map((f, i) => (
                  <div className="row" key={i}>
                    <Avatar name={f.name} url={f.photoUrl} size={36} />
                    <div className="row-main">
                      <div className="row-title">{f.name}</div>
                      <div className="row-sub">
                        {f.age} yrs · {f.phone}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {r.notes.length > 0 && (
            <Section title="Notes" count={r.notes.length}>
              <div className="card list">
                {r.notes.map((n, i) => (
                  <div className="row" key={i}>
                    <div className="row-main">
                      <div className="row-title clamp-2">{n.body}</div>
                      <div className="row-sub">{new Date(n.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </OverlayPage>
      {viewing !== null && (
        <Lightbox items={files} index={viewing} onClose={() => setViewing(null)} onIndexChange={setViewing} />
      )}
    </>
  );
}
