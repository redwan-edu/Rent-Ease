"use client";

import { useMutation, useQuery } from "convex/react";
import {
  ChevronRight,
  FileText,
  MessageCircle,
  MessageSquareText,
  Pencil,
  Phone,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import EditPaymentSheet, { type EditablePayment } from "@/components/EditPaymentSheet";
import Header from "@/components/Header";
import { Lightbox, type GalleryItem } from "@/components/Lightbox";
import NoteSheet, { type NoteDraft } from "@/components/NoteSheet";
import PaymentSheet, { type PayTarget } from "@/components/PaymentSheet";
import { Avatar, ConfirmSheet, Empty, Section, Splash, useRun } from "@/components/ui";
import { dateLabel, monthKey, monthLabel, today, whenLabel } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

/** Payments shown before "Show all". */
const RECENT_PAYMENTS = 6;

export default function TenantPage() {
  const { id } = useParams<{ id: string }>();
  const tenantId = id as Id<"tenants">;
  const tenant = useQuery(api.tenants.get, { tenantId, month: monthKey() });
  const { can, money, to } = useWorkspace();
  const moveOut = useMutation(api.tenants.moveOut);
  const reactivate = useMutation(api.tenants.reactivate);
  const archiveTenant = useMutation(api.archive.archiveTenant);
  const router = useRouter();
  const { run } = useRun();

  const [pay, setPay] = useState<PayTarget | null>(null);
  const [note, setNote] = useState<NoteDraft | null>(null);
  const [confirmMoveOut, setConfirmMoveOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editPayment, setEditPayment] = useState<EditablePayment | null>(null);
  const [galleryOpen, setGalleryOpen] = useState<number | null>(null);
  const [allPayments, setAllPayments] = useState(false);

  if (tenant === undefined) {
    return (
      <>
        <Header title="Tenant" back="/tenants" />
        <Splash />
      </>
    );
  }
  if (tenant === null) {
    return (
      <>
        <Header title="Tenant" back="/tenants" />
        <Empty icon={<UserX size={24} />} title="Tenant not found" text="They may have been removed." />
      </>
    );
  }

  // Paid / due is always about the running month, and only if they rent in it.
  const { month, owes, remaining } = tenant.thisMonth;
  const monthName = monthLabel(month).split(" ")[0];
  const active = tenant.status === "active";
  const digits = tenant.phone.replace(/[^\d]/g, "");
  const hasFiles = !!tenant.photoUrl || tenant.documents.length > 0 || tenant.family.length > 0;
  const payments = allPayments ? tenant.payments : tenant.payments.slice(0, RECENT_PAYMENTS);
  const docItems: GalleryItem[] = tenant.documents.map((d) => ({
    url: d.url,
    label: d.label,
    sub: tenant.name,
    kind: !d.contentType ? "image" : d.contentType === "application/pdf" ? "pdf" : d.contentType.startsWith("image/") ? "image" : "file",
  }));

  return (
    <>
      <Header
        title="Tenant"
        back="/tenants"
        actions={
          can("edit") && (
            <Link href={to(`/tenants/${id}/edit`)} className="btn btn-sm btn-secondary">
              <Pencil size={15} /> Edit
            </Link>
          )
        }
      />
      <div className="page">
        <section className="profile">
          <Avatar name={tenant.name} url={tenant.photoUrl} size={64} />
          <div className="profile-text">
            <h2>{tenant.name}</h2>
            <div className="profile-sub">
              {tenant.property ? (
                <Link href={to(`/properties/${tenant.property._id}`)}>
                  {tenant.property.name}
                  {tenant.unit ? ` · ${tenant.unit.name}` : ""}
                </Link>
              ) : (
                "No property"
              )}
            </div>
            <div className="profile-sub">{tenant.phone}</div>
            {!active && <span className="badge">Moved out</span>}
          </div>
        </section>

        <div className="contact-row">
          <a className="btn btn-sm btn-secondary" href={`tel:${tenant.phone}`}>
            <Phone size={16} /> Call
          </a>
          <a className="btn btn-sm btn-secondary" href={`sms:${tenant.phone}`}>
            <MessageSquareText size={16} /> Message
          </a>
          {digits && (
            <a className="btn btn-sm btn-secondary" href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer">
              <MessageCircle size={16} /> WhatsApp
            </a>
          )}
        </div>

        {active && (
          <section className="card card-pad rent">
            <div>
              <span className="summary-label">{monthName} rent</span>
              <div className={`rent-status ${!owes ? "idle" : remaining === 0 ? "ok" : "warn"}`}>
                {!owes ? "No rent this month" : remaining === 0 ? "Paid" : `${money(remaining)} due`}
              </div>
              <div className="summary-sub">{money(tenant.rent)} a month</div>
            </div>
            {can("edit") && (
              <button
                className={`btn btn-block ${owes && remaining > 0 ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setPay({ tenantId, name: tenant.name, amount: remaining, month })}
              >
                Record payment
              </button>
            )}
          </section>
        )}

        <Section title="Payments" count={tenant.payments.length || undefined}>
          {tenant.payments.length === 0 ? (
            <p className="section-empty">No payments recorded yet.</p>
          ) : (
            <div className="card list">
              {payments.map((p) => (
                <button
                  className="row"
                  key={p._id}
                  disabled={!can("full")}
                  onClick={() =>
                    can("full") &&
                    setEditPayment({
                      _id: p._id,
                      tenantId,
                      tenantName: tenant.name,
                      amount: p.amount,
                      month: p.month,
                      paidOn: p.paidOn,
                      note: p.note ?? undefined,
                    })
                  }
                  aria-label={can("full") ? `Edit or undo payment for ${monthLabel(p.month)}` : undefined}
                >
                  <div className="row-main">
                    <div className="row-title">{monthLabel(p.month)}</div>
                    <div className="row-sub">
                      Paid {dateLabel(p.paidOn)}
                      {p.recordedByName ? ` by ${p.recordedByName}` : ""}
                      {p.note ? ` · ${p.note}` : ""}
                    </div>
                  </div>
                  <span className="row-amount">{money(p.amount)}</span>
                  {can("full") && <ChevronRight size={18} className="chev" />}
                </button>
              ))}
              {tenant.payments.length > RECENT_PAYMENTS && !allPayments && (
                <button className="row show-more" onClick={() => setAllPayments(true)}>
                  Show all {tenant.payments.length} payments
                </button>
              )}
            </div>
          )}
          {can("full") && tenant.payments.length > 0 && (
            <p className="hint-text">Tap a payment to edit it or undo it.</p>
          )}
        </Section>

        <Section
          title="Notes"
          action={
            can("edit") && (
              <button className="link-btn" onClick={() => setNote({ body: "", tenantId })}>
                Add note
              </button>
            )
          }
        >
          {tenant.notes.length === 0 ? (
            <p className="section-empty">No notes yet.</p>
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
                  <div className="row-main">
                    <div className={`row-title clamp-2${n.done ? " muted" : ""}`}>{n.body}</div>
                    <div className="row-sub">
                      {n.done
                        ? "Done"
                        : n.remindAt
                          ? `Reminder: ${whenLabel(n.remindAt)}`
                          : new Date(n._creationTime).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Family"
          count={tenant.family.length || undefined}
          action={
            can("edit") && (
              <Link href={to(`/tenants/${id}/family/new`)} className="link-btn">
                Add member
              </Link>
            )
          }
        >
          {tenant.family.length === 0 ? (
            <p className="section-empty">No family members added.</p>
          ) : (
            <div className="card list">
              {tenant.family.map((f) => (
                <Link href={to(`/tenants/${id}/family/${f._id}`)} className="row" key={f._id}>
                  <Avatar name={f.name} url={f.photoUrl} size={36} />
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
        </Section>

        <Section
          title="Documents"
          count={tenant.documents.length || undefined}
          action={
            hasFiles && (
              <Link href={to(`/tenants/${id}/gallery`)} className="link-btn">
                All files
              </Link>
            )
          }
        >
          {tenant.documents.length === 0 ? (
            <p className="section-empty">No documents yet.{can("edit") ? " Add them with Edit." : ""}</p>
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
        </Section>

        <Section title="About">
          <div className="card list">
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
            <div className="kv">
              <span>People living there</span>
              <span>{tenant.residents}</span>
            </div>
            <div className="kv stacked">
              <span>Condition at move-in</span>
              <span>{tenant.condition || "Not recorded"}</span>
            </div>
          </div>
        </Section>

        {/* Two different endings: moving out keeps them here in full, deleting
            files the whole record away in the archive. Never the same thing. */}
        {(can("full") || (!active && can("edit"))) && (
          <section className="danger-zone">
            <h3>End tenancy</h3>
            {active
              ? can("full") && (
                  <div className="dz-part">
                    <div>
                      <strong>Move out</strong>
                      <p>Keeps them as a former tenant, with every record.</p>
                    </div>
                    <button className="btn btn-sm btn-secondary" onClick={() => setConfirmMoveOut(true)}>
                      Move out
                    </button>
                  </div>
                )
              : can("edit") && (
                  <div className="dz-part">
                    <div>
                      <strong>Make current again</strong>
                      <p>Moves them back to your current tenants.</p>
                    </div>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => run(() => reactivate({ tenantId }), "Tenant is current again")}
                    >
                      Restore
                    </button>
                  </div>
                )}
            {can("full") && (
              <div className="dz-part">
                <div>
                  <strong>Delete</strong>
                  <p>Moves the whole record to Archive. You can restore it later.</p>
                </div>
                <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              </div>
            )}
          </section>
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
          text="They'll be listed as a former tenant. Their details, documents, payments and notes stay."
          confirmLabel="Move out"
          onClose={() => setConfirmMoveOut(false)}
          onConfirm={() => moveOut({ tenantId, date: today() })}
        />
      )}
      {confirmDelete && (
        <ConfirmSheet
          title={`Delete ${tenant.name}?`}
          text="They come off your tenant and property lists. The full record, with payments, family, notes and every file, is kept in Archive and can be restored at any time."
          confirmLabel="Delete"
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await archiveTenant({ tenantId });
            router.replace(to("/archive"));
          }}
        />
      )}
      {editPayment && <EditPaymentSheet payment={editPayment} onClose={() => setEditPayment(null)} />}
    </>
  );
}
