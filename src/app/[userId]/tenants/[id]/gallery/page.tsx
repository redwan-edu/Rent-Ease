"use client";

import { useQuery } from "convex/react";
import { FileText, Images, UserX } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Header from "@/components/Header";
import { Lightbox, type GalleryItem } from "@/components/Lightbox";
import { Empty, Splash } from "@/components/ui";

function kindFor(contentType?: string): "image" | "pdf" | "file" {
  if (!contentType) return "image";
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("image/")) return "image";
  return "file";
}

type Group = { title: string; items: GalleryItem[] };

/** Every photo and document for a tenant and their family, one at a time. */
export default function TenantGalleryPage() {
  const { id } = useParams<{ id: string }>();
  const tenantId = id as Id<"tenants">;
  const tenant = useQuery(api.tenants.get, { tenantId });
  const family = useQuery(api.family.listByTenant, { tenantId });
  const [open, setOpen] = useState<number | null>(null);

  if (tenant === undefined || family === undefined) {
    return (
      <>
        <Header title="" back={`/tenants/${id}`} bell={false} />
        <Splash />
      </>
    );
  }
  if (tenant === null) {
    return (
      <>
        <Header title="Gallery" back="/tenants" bell={false} />
        <Empty icon={<UserX size={22} />} title="Tenant not found" />
      </>
    );
  }

  const groups: Group[] = [];
  if (tenant.photoUrl) {
    groups.push({ title: "Tenant photo", items: [{ url: tenant.photoUrl, label: `${tenant.name}'s photo`, kind: "image" }] });
  }
  if (tenant.documents.length > 0) {
    groups.push({
      title: "Documents",
      items: tenant.documents.map((d) => ({
        url: d.url,
        label: d.label,
        sub: tenant.name,
        kind: kindFor(d.contentType),
      })),
    });
  }
  for (const f of family) {
    const items: GalleryItem[] = [];
    if (f.photoUrl) items.push({ url: f.photoUrl, label: `${f.name}'s photo`, kind: "image" });
    f.nid.forEach((n, i) =>
      items.push({ url: n.url, label: `${f.name} · NID ${i === 0 ? "front" : "back"}`, sub: "Family member", kind: "image" }),
    );
    if (items.length > 0) groups.push({ title: f.name, items });
  }

  const flat = groups.flatMap((g) => g.items);
  const offset = (groupIndex: number) => groups.slice(0, groupIndex).reduce((s, g) => s + g.items.length, 0);

  return (
    <>
      <Header title="Gallery" eyebrow={tenant.name} back={`/tenants/${id}`} bell={false} />
      <div className="page">
        {flat.length === 0 ? (
          <div className="card">
            <Empty
              icon={<Images size={22} />}
              title="Nothing to show yet"
              text="Photos and documents you add for this tenant and their family appear here."
            />
          </div>
        ) : (
          groups.map((g, gi) => (
            <section key={g.title}>
              <div className="section-head">
                <h2>{g.title}</h2>
                <span className="muted" style={{ fontSize: "calc(13px * var(--fs))" }}>
                  {g.items.length}
                </span>
              </div>
              <div className="gallery-grid">
                {g.items.map((it, ii) => (
                  <button className="gallery-thumb" key={`${it.label}-${ii}`} onClick={() => setOpen(offset(gi) + ii)}>
                    {it.kind === "image" && it.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.url} alt={it.label} />
                    ) : (
                      <FileText size={26} strokeWidth={1.5} />
                    )}
                    <span>{it.label}</span>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
      {open !== null && <Lightbox items={flat} index={open} onClose={() => setOpen(null)} onIndexChange={setOpen} />}
    </>
  );
}
