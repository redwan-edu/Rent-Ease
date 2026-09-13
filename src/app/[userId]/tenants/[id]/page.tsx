"use client";

import { useMutation, useQuery } from "convex/react";
import {
  AlarmClock,
  Archive,
  Building2,
  ChevronRight,
  FileText,
  Images,
  LogOut,
  MessageCircle,
  MessageSquareText,
  NotebookPen,
  Pencil,
  Phone,
  RotateCcw,
  Trash2,
  UserPlus,
  Users,
  UserX,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Header from "@/components/Header";
import { Lightbox, type GalleryItem } from "@/components/Lightbox";
import NoteSheet, { type NoteDraft } from "@/components/NoteSheet";
import PaymentSheet, { type PayTarget } from "@/components/PaymentSheet";
import { Avatar, ConfirmSheet, Empty, Splash, useRun } from "@/components/ui";
import { dateLabel, monthKey, monthLabel, today, whenLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function TenantPage() {
  const { id } = useParams<{ id: string }>();
  const tenantId = id as Id<"tenants">;
  const tenant = useQuery(api.tenants.get, { tenantId, month: monthKey() });
  const { can, money, to } = useWorkspace();
  const moveOut = useMutation(api.tenants.moveOut);
  const reactivate = useMutation(api.tenants.reactivate);
  const removePayment = useMutation(api.payments.remove);
  const archiveTenant = useMutation(api.archive.archiveTenant);
  const router = useRouter();
  const { run } = useRun();

  const [pay, setPay] = useState<PayTarget | null>(null);
  const [note, setNote] = useState<NoteDraft | null>(null);
  const [confirmMoveOut, setConfirmMoveOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePayment, setDeletePayment] = useState<Id<"payments"> | null>(null);
  const [galleryOpen, setGalleryOpen] = useState<number | null>(null);

  if (tenant === undefined) {
    return (
      <>
        <Header title="" back="/tenants" />
        <Splash />
      </>
    );
  }
  if (tenant === null) {
    return (
      <>
        <Header title="Tenant" back="/tenants" />
        <Empty icon={<UserX size={22} />} title="Tenant not found" text="They may have been removed." />
      </>
    );
  }

  // Paid / due is always about the running month, and only if they rent in it.
  const { month, owes, remaining } = tenant.thisMonth;
  const monthName = monthLabel(month).split(" ")[0];
  const active = tenant.status === "active";
  const digits = tenant.phone.replace(/[^\d]/g, "");
  const docItems: GalleryItem[] = tenant.documents.map((d) => ({
    url: d.url,
    label: d.label,
    sub: tenant.name,
    kind: !d.contentType ? "image" : d.contentType === "application/pdf" ? "pdf" : d.contentType.startsWith("image/") ? "image" : "file",
  }));

  return (
    <>
      <Header
        title={tenant.name}
        back="/tenants"
        actions={
          <>
            <Link href={to(`/tenants/${id}/gallery`)} className="icon-btn" aria-label="View gallery">
              <Images size={17} />
            </Link>
            {can("edit") && (
              <Link href={to(`/tenants/${id}/edit`)} className="icon-btn" aria-label="Edit tenant">
                <Pencil size={17} />
              </Link>
            )}
          </>
        }
      />
      <div className="page">
        <section className="profile">
          <Avatar name={tenant.name} url={tenant.photoUrl} size={96} />
          <h2>{tenant.name}</h2>
          <div className="profile-sub">
            {active ? <span className="badge ok">Current tenant</span> : <span className="badge">Former tenant</span>}
            {tenant.property && (
              <Link href={to(`/properties/${tenant.property._id}`)} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Building2 size={14} /> {tenant.property.name}
                {tenant.unit ? ` · ${tenant.unit.name}` : ""}
              </Link>
            )}
          </div>
          <div className="contact">
            <a href={`tel:${tenant.phone}`}>
              <span>
                <Phone size={19} />
              </span>
              Call
            </a>
            <a href={`sms:${tenant.phone}`}>
              <span>
                <MessageSquareText size={19} />
              </span>
              Message
            </a>
            {digits && (
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer">
                <span>
                  <MessageCircle size={19} />
                </span>
                WhatsApp
              </a>
            )}
          </div>
        </section>

        <div className="stats">
          <div className="stat">
            <span className="stat-label">Rent / month</span>
            <span className="stat-value">{money(tenant.rent)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Residents</span>
            <span className="stat-value">{tenant.residents}</span>
          </div>
          <div className="stat">
            <span className="stat-label">{owes && remaining > 0 ? `Due · ${monthName}` : monthName}</span>
            <span
              className="stat-value"
              style={{ color: !owes ? "var(--ink-3)" : remaining === 0 ? "var(--accent)" : "var(--warn)" }}
            >
              {!owes ? "Not due" : remaining === 0 ? "Paid" : money(remaining)}
            </span>
          </div>
        </div>

        {active && can("edit") && (
          <button
            className="btn btn-primary btn-block"
            onClick={() => setPay({ tenantId, name: tenant.name, amount: remaining, month })}
          >
            <Wallet size={18} /> Record payment
          </button>
        )}

        <section>
          <div className="section-head">
            <h2>Details</h2>
          </div>
          <div className="card list">
            <div className="kv">
              <span>Phone</span>
              <span>{tenant.phone}</span>
            </div>
            <div className="kv">
              <span>Property</span>
              <span>{tenant.property?.name ?? "Not assigned"}</span>
            </div>
            {tenant.property && (
              <div className="kv">
                <span>Unit</span>
                <span>{tenant.unit?.name ?? "Not set"}</span>
              </div>
            )}
            <div className="kv">
              <span>Moved in</span>
              <span>{dateLabel(tenant.moveInDate)}</span>
            </div>
            {!active && (
              <div className="kv">
                <span>Moved out</span>
                <span>{dateLabel(tenant.moveOutDate)}</span>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2>
              Family{" "}
              <span className="muted" style={{ fontWeight: 500 }}>
                · {tenant.family.length + 1} of {tenant.residents} residents
              </span>
            </h2>
            {can("edit") && (
              <Link href={to(`/tenants/${id}/family/new`)} className="icon-btn sm" aria-label="Add family member">
                <UserPlus size={16} />
              </Link>
            )}
          </div>
          {tenant.family.length === 0 ? (
            <div className="card">
              <Empty
                icon={<Users size={22} />}
                title="No family members"
                text="Add the people living with this tenant, with their NID."
              />
            </div>
          ) : (
            <div className="card list">
              {tenant.family.map((f) => (
                <Link href={to(`/tenants/${id}/family/${f._id}`)} className="row" key={f._id}>
                  <Avatar name={f.name} url={f.photoUrl} size={40} />
                  <div className="row-main">
                    <div className="row-title">{f.name}</div>
                    <div className="row-sub">
                      {f.age} yrs{f.job ? ` · ${f.job}` : ""}
                    </div>
                  </div>
                  <ChevronRight size={18} className="chev" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="section-head">
            <h2>Condition at move-in</h2>
          </div>
          <div className="card card-pad">
            <p className="prose">{tenant.condition || <span className="muted">Not recorded</span>}</p>
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2>Documents</h2>
            <span className="muted" style={{ fontSize: "calc(13px * var(--fs))" }}>
              {tenant.documents.length}
            </span>
          </div>
          {tenant.documents.length === 0 ? (
            <div className="card">
              <Empty icon={<FileText size={22} />} title="No documents" text="Scan ID cards or agreements from the edit screen." />
            </div>
          ) : (
            <div className="docs">
              {tenant.documents.map((d, i) => (
                <button className="doc" key={d.storageId} onClick={() => setGalleryOpen(i)}>
                  <div className="doc-thumb">
                    {d.url && d.contentType?.startsWith("image/") !== false ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.url} alt={d.label} />
                    ) : (
                      <FileText size={28} strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="doc-label">{d.label}</div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="section-head">
            <h2>Payments</h2>
          </div>
          {tenant.payments.length === 0 ? (
            <div className="card">
              <Empty icon={<Wallet size={22} />} title="No payments yet" />
            </div>
          ) : (
            <div className="card list">
              {tenant.payments.map((p) => (
                <div className="row" key={p._id}>
                  <span className="row-icon ok">
                    <Wallet size={17} />
                  </span>
                  <div className="row-main">
                    <div className="row-title">{monthLabel(p.month)}</div>
                    <div className="row-sub">
                      Paid {dateLabel(p.paidOn)}
                      {p.note ? ` · ${p.note}` : ""}
                      {p.recordedByName ? ` · by ${p.recordedByName}` : ""}
                    </div>
                  </div>
                  <span className="row-amount">{money(p.amount)}</span>
                  {can("full") && (
                    <button className="icon-btn sm plain" onClick={() => setDeletePayment(p._id)} aria-label="Delete payment">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="section-head">
            <h2>Notes</h2>
            {can("edit") && <button onClick={() => setNote({ body: "", tenantId })}>Add note</button>}
          </div>
          {tenant.notes.length === 0 ? (
            <div className="card">
              <Empty icon={<NotebookPen size={22} />} title="No notes" text="Log requests, issues or plans for this tenant." />
            </div>
          ) : (
            <div className="card list">
              {tenant.notes.map((n) => (
                <button
                  className="row"
                  key={n._id}
                  onClick={() =>
                    setNote({ _id: n._id, body: n.body, tenantId: n.tenantId, propertyId: n.propertyId, remindAt: n.remindAt })
                  }
                >
                  <span className={`row-icon${n.done ? " ok" : ""}`}>
                    {n.remindAt ? <AlarmClock size={17} /> : <NotebookPen size={17} />}
                  </span>
                  <div className="row-main">
                    <div className="row-title clamp-2" style={n.done ? { color: "var(--ink-3)" } : undefined}>
                      {n.body}
                    </div>
                    <div className="row-sub">
                      {n.done ? "Done" : n.remindAt ? `Reminder · ${whenLabel(n.remindAt)}` : new Date(n._creationTime).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Two different endings: moving out keeps them here in full, deleting
            files the whole record away in the archive. Never the same thing. */}
        {(can("full") || (!active && can("edit"))) && (
          <div className="danger-zone">
            <h3>Ending this tenancy</h3>
            {active
              ? can("full") && (
                  <div className="dz-part">
                    <p>
                      Moving out keeps {tenant.name} in your tenant list as a former tenant —
                      every payment, document and note stays exactly where it is.
                    </p>
                    <button className="btn btn-caution btn-block" onClick={() => setConfirmMoveOut(true)}>
                      <LogOut size={17} /> Move out tenant
                    </button>
                  </div>
                )
              : can("edit") && (
                  <div className="dz-part">
                    <p>{tenant.name} is a former tenant. Their full history is kept here.</p>
                    <button
                      className="btn btn-secondary btn-block"
                      onClick={() => run(() => reactivate({ tenantId }), "Tenant is current again")}
                    >
                      <RotateCcw size={17} /> Mark as current tenant
                    </button>
                  </div>
                )}
            {can("full") && (
              <div className="dz-part">
                <p>
                  Deleting takes {tenant.name} off your lists, but stores the complete record —
                  profile, family, {tenant.payments.length} payment
                  {tenant.payments.length === 1 ? "" : "s"}, notes and every uploaded file — in the
                  Archive, so you keep the proof.
                </p>
                <button className="btn btn-destructive btn-block" onClick={() => setConfirmDelete(true)}>
                  <Archive size={17} /> Delete &amp; archive tenant
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {pay && <PaymentSheet target={pay} onClose={() => setPay(null)} />}
      {note && <NoteSheet note={note} onClose={() => setNote(null)} />}
      {galleryOpen !== null && (
        <Lightbox items={docItems} index={galleryOpen} onClose={() => setGalleryOpen(null)} onIndexChange={setGalleryOpen} />
      )}
      {confirmMoveOut && (
        <ConfirmSheet
          title={`Move out ${tenant.name}?`}
          text="They'll be marked as a former tenant. Their details, documents, payments and notes stay in history."
          confirmLabel="Move out"
          onClose={() => setConfirmMoveOut(false)}
          onConfirm={() => moveOut({ tenantId, date: today() })}
        />
      )}
      {confirmDelete && (
        <ConfirmSheet
          title={`Delete ${tenant.name}?`}
          text={`They come off your tenant and property lists, and the complete record — profile, family, payments, notes and every uploaded file — is stored in the Archive. Nothing is destroyed, and you can restore them at any time.`}
          confirmLabel="Delete & archive"
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await archiveTenant({ tenantId });
            router.replace(to("/archive"));
          }}
        />
      )}
      {deletePayment && (
        <ConfirmSheet
          title="Delete this payment?"
          text="The amount will be removed from collected totals."
          confirmLabel="Delete"
          onClose={() => setDeletePayment(null)}
          onConfirm={() => removePayment({ paymentId: deletePayment })}
        />
      )}
    </>
  );
}
