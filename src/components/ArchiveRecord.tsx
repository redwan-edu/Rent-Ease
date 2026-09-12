"use client";

import { useQuery } from "convex/react";
import { FileText, Wallet } from "lucide-react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { dateLabel, monthLabel, whenLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import { Lightbox, type GalleryItem } from "./Lightbox";
import { Avatar, OverlayPage, SkeletonList } from "./ui";

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
    ...(r.photoUrl ? [{ url: r.photoUrl, label: `${r.name} — photo`, kind: "image" as const }] : []),
    ...r.documents.map((d) => ({
      url: d.url,
      label: d.label,
      kind: (d.contentType?.startsWith("image/") ? "image" : d.contentType === "application/pdf" ? "pdf" : "file") as GalleryItem["kind"],
    })),
    ...r.family.flatMap((f) => [
      ...(f.photoUrl ? [{ url: f.photoUrl, label: `${f.name} — photo`, kind: "image" as const }] : []),
      ...f.nid.map((n, i) => ({
        url: n.url,
        label: `${f.name} — NID ${i + 1}`,
        kind: "image" as const,
      })),
    ]),
  ];

  return (
    <>
      <OverlayPage title={r.name} onBack={onClose}>
        <div className="page">
          <div className="banner">
            Deleted {whenLabel(r.archivedAt)} by {r.archivedByName}
            {r.reason ? ` · "${r.reason}"` : ""}
          </div>

          <div className="card card-pad archive-head">
            <Avatar name={r.name} url={r.photoUrl} size={64} />
            <div>
              <h2 style={{ margin: 0 }}>{r.name}</h2>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                {r.phone} · {r.placeName ?? "No property"}
              </p>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                Rent {money(r.rent)} · {r.residents} resident{r.residents === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="card list">
            <div className="row">
              <div className="row-main">
                <div className="row-title">Total collected</div>
                <div className="row-sub">{r.payments.length} payments on record</div>
              </div>
              <span className="row-amount">{money(r.totalPaid)}</span>
            </div>
            <div className="row">
              <div className="row-main">
                <div className="row-title">Tenancy</div>
                <div className="row-sub">
                  {dateLabel(r.movedInOn)} — {r.movedOutOn ? dateLabel(r.movedOutOn) : "no move-out recorded"}
                </div>
              </div>
            </div>
            {r.condition && (
              <div className="row">
                <div className="row-main">
                  <div className="row-title">Move-in condition</div>
                  <div className="row-sub">{r.condition}</div>
                </div>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <section>
              <div className="section-head">
                <h2>Files ({files.length})</h2>
              </div>
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
            </section>
          )}

          {r.family.length > 0 && (
            <section>
              <div className="section-head">
                <h2>Family</h2>
              </div>
              <div className="card list">
                {r.family.map((f, i) => (
                  <div className="row" key={i}>
                    <Avatar name={f.name} url={f.photoUrl} />
                    <div className="row-main">
                      <div className="row-title">{f.name}</div>
                      <div className="row-sub">
                        {f.age} yrs · {f.phone}
                        {f.job ? ` · ${f.job}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="section-head">
              <h2>Payments</h2>
            </div>
            {r.payments.length === 0 ? (
              <div className="card card-pad muted">No payments were ever recorded.</div>
            ) : (
              <div className="card list">
                {r.payments.map((p) => (
                  <div className="row" key={p._id}>
                    <span className="row-icon ok">
                      <Wallet size={18} />
                    </span>
                    <div className="row-main">
                      <div className="row-title">{monthLabel(p.month)}</div>
                      <div className="row-sub">
                        Paid {dateLabel(p.paidOn)}
                        {p.note ? ` · ${p.note}` : ""}
                      </div>
                    </div>
                    <span className="row-amount">{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {r.notes.length > 0 && (
            <section>
              <div className="section-head">
                <h2>Notes</h2>
              </div>
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
            </section>
          )}
        </div>
      </OverlayPage>
      {viewing !== null && (
        <Lightbox items={files} index={viewing} onClose={() => setViewing(null)} onIndexChange={setViewing} />
      )}
    </>
  );
}
