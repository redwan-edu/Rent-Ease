"use client";

import { useMutation, useQuery } from "convex/react";
import {
  Camera,
  ChevronRight,
  FileText,
  ImagePlus,
  Minus,
  Plus,
  ScanLine,
  Upload,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { errorMessage, parseAmount, today } from "@/lib/format";
import { processDocument, processPortrait, uploadBlob } from "@/lib/image";
import { useWorkspace } from "@/lib/workspace";
import FamilyForm, { type FamilyValue } from "./FamilyForm";
import { Avatar, Field, OverlayPage, Spinner, useToast } from "./ui";

const MAX_DOCS = 10;

type DocItem = {
  key: string;
  storageId?: Id<"_storage">;
  label: string;
  contentType?: string;
  preview: string | null;
  uploading: boolean;
};

export type TenantInitial = {
  _id: Id<"tenants">;
  name: string;
  phone: string;
  residents: number;
  rent: number;
  condition: string;
  propertyId?: Id<"properties">;
  unitId?: Id<"units">;
  photoId?: Id<"_storage">;
  photoUrl: string | null;
  moveInDate?: string;
  documents: { storageId: Id<"_storage">; label: string; contentType?: string; url: string | null }[];
  family: {
    _id: Id<"familyMembers">;
    name: string;
    age: number;
    phone: string;
    job: string | null;
    photoId?: Id<"_storage">;
    photoUrl: string | null;
    nid: { storageId: Id<"_storage">; url: string | null }[];
  }[];
};

// Family members are edited in place and saved together with the tenant.
type FamilyDraft = FamilyValue & { key: string; _id?: Id<"familyMembers">; dirty: boolean };

let keySeq = 0;
const newKey = () => `doc-${Date.now()}-${keySeq++}`;

export default function TenantForm({ initial }: { initial?: TenantInitial }) {
  const router = useRouter();
  const toast = useToast();
  const { workspace, to } = useWorkspace();
  const workspaceId = workspace.workspaceId;
  const properties = useQuery(api.properties.list, { workspaceId });
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const create = useMutation(api.tenants.create);
  const update = useMutation(api.tenants.update);
  const createFamily = useMutation(api.family.create);
  const updateFamily = useMutation(api.family.update);
  const removeFamily = useMutation(api.family.remove);
  const { can } = useWorkspace();

  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [residents, setResidents] = useState(initial?.residents ?? 1);
  const [rent, setRent] = useState(initial ? String(initial.rent) : "");
  // "/tenants/new?property=…&unit=…" pre-fills where the tenant is renting.
  const [propertyId, setPropertyId] = useState<string>(
    () => initial?.propertyId ?? new URLSearchParams(window.location.search).get("property") ?? "",
  );
  const [unitId, setUnitId] = useState<string>(
    () => initial?.unitId ?? new URLSearchParams(window.location.search).get("unit") ?? "",
  );
  const units = useQuery(
    api.properties.unitsFor,
    propertyId ? { propertyId: propertyId as Id<"properties"> } : "skip",
  );
  const [moveInDate, setMoveInDate] = useState(initial?.moveInDate ?? today());
  const [condition, setCondition] = useState(initial?.condition ?? "");
  const [photo, setPhoto] = useState({
    storageId: initial?.photoId,
    preview: initial?.photoUrl ?? null,
    uploading: false,
  });
  const [docs, setDocs] = useState<DocItem[]>(() =>
    (initial?.documents ?? []).map((d) => ({
      key: d.storageId,
      storageId: d.storageId,
      label: d.label,
      contentType: d.contentType,
      preview: d.contentType?.startsWith("image/") === false ? null : d.url,
      uploading: false,
    })),
  );
  const [family, setFamily] = useState<FamilyDraft[]>(() =>
    (initial?.family ?? []).map((f) => ({
      key: f._id,
      _id: f._id,
      name: f.name,
      age: f.age,
      phone: f.phone,
      job: f.job ?? undefined,
      photoId: f.photoId,
      photoUrl: f.photoUrl,
      nid: f.nid,
      dirty: false,
    })),
  );
  const [removedFamily, setRemovedFamily] = useState<Id<"familyMembers">[]>([]);
  const [familyEditing, setFamilyEditing] = useState<FamilyDraft | "new" | null>(null);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const scanInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const getUploadUrl = () => generateUploadUrl({ workspaceId });
  const rentValue = parseAmount(rent);
  const errors = {
    name: !name.trim() && "Enter the tenant's name",
    phone: !phone.trim() && "Enter a phone number",
    rent: (rent.trim() === "" || Number.isNaN(rentValue) || rentValue < 0) && "Enter the monthly rent",
    condition: !condition.trim() && "Describe the condition at move-in",
    // A member limited to certain properties can't leave a tenant unplaced; they'd lose sight of them.
    property: workspace.restricted && !propertyId && "Choose one of your properties",
    unit: !!propertyId && !unitId && "Choose the unit they're renting",
    docs: docs.some((d) => !d.label.trim()) && "Give every document a label",
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const uploading = photo.uploading || docs.some((d) => d.uploading);

  async function onPhoto(file?: File) {
    if (!file) return;
    const before = photo;
    setPhoto((p) => ({ ...p, uploading: true }));
    try {
      const blob = await processPortrait(file);
      const preview = URL.createObjectURL(blob);
      setPhoto({ storageId: undefined, preview, uploading: true });
      const storageId = (await uploadBlob(getUploadUrl, blob)) as Id<"_storage">;
      setPhoto({ storageId, preview, uploading: false });
    } catch (e) {
      toast(errorMessage(e));
      setPhoto(before);
    }
  }

  async function onDocuments(files: FileList | null, scanned: boolean) {
    if (!files?.length) return;
    const room = MAX_DOCS - docs.length;
    if (room <= 0) return toast(`You can attach up to ${MAX_DOCS} documents.`);
    const list = Array.from(files).slice(0, room);
    if (files.length > room) toast(`Only ${room} more document${room === 1 ? "" : "s"} can be added.`);

    await Promise.all(
      list.map(async (file) => {
        const key = newKey();
        const label = scanned
          ? ""
          : file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 40);
        setDocs((d) => [...d, { key, label, contentType: file.type, preview: null, uploading: true }]);
        try {
          const blob = await processDocument(file);
          const preview = blob.type.startsWith("image/") ? URL.createObjectURL(blob) : null;
          setDocs((d) => d.map((x) => (x.key === key ? { ...x, preview, contentType: blob.type } : x)));
          const storageId = (await uploadBlob(getUploadUrl, blob)) as Id<"_storage">;
          setDocs((d) => d.map((x) => (x.key === key ? { ...x, storageId, uploading: false } : x)));
        } catch (e) {
          toast(errorMessage(e));
          setDocs((d) => d.filter((x) => x.key !== key));
        }
      }),
    );
  }

  async function save() {
    setTouched(true);
    if (hasErrors) return toast("Please fill in the highlighted fields.");
    if (uploading) return toast("Hold on, files are still uploading.");
    setSaving(true);
    const payload = {
      name,
      phone,
      residents,
      rent: rentValue,
      condition,
      propertyId: (propertyId || undefined) as Id<"properties"> | undefined,
      unitId: (propertyId && unitId ? unitId : undefined) as Id<"units"> | undefined,
      photoId: photo.storageId,
      moveInDate: moveInDate || undefined,
      documents: docs
        .filter((d) => d.storageId)
        .map((d) => ({ storageId: d.storageId!, label: d.label, contentType: d.contentType })),
    };
    let savedId = initial?._id;
    let created = false;
    try {
      if (initial) {
        await update({ tenantId: initial._id, ...payload });
      } else {
        savedId = await create({ workspaceId, ...payload });
        created = true;
      }
      for (const memberId of removedFamily) await removeFamily({ memberId });
      setRemovedFamily([]);
      for (const f of family) {
        const data = {
          name: f.name,
          age: f.age,
          phone: f.phone,
          job: f.job,
          photoId: f.photoId,
          nidPhotoIds: f.nid.map((n) => n.storageId),
        };
        if (!f._id) {
          const memberId = await createFamily({ tenantId: savedId!, ...data });
          // Remember it's saved so a retry doesn't add it twice.
          setFamily((all) => all.map((x) => (x.key === f.key ? { ...x, _id: memberId, dirty: false } : x)));
        } else if (f.dirty) {
          await updateFamily({ memberId: f._id, ...data });
        }
      }
      toast(initial ? "Changes saved" : "Tenant added");
      router.replace(to(`/tenants/${savedId}`));
    } catch (e) {
      toast(errorMessage(e));
      if (created) router.replace(to(`/tenants/${savedId}`));
      else setSaving(false);
    }
  }

  const show = (e: string | false) => touched && e;

  return (
    <div className="page form">
      {/* Hidden pickers: camera opens the phone camera directly, library opens the gallery. */}
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={libraryInput} type="file" accept="image/*" hidden onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={scanInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onDocuments(e.target.files, true); e.target.value = ""; }} />
      <input ref={fileInput} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => { onDocuments(e.target.files, false); e.target.value = ""; }} />

      <div className="photo-pick">
        <button className="photo-circle" onClick={() => cameraInput.current?.click()} aria-label="Take tenant photo">
          {photo.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.preview} alt="Tenant" />
          ) : (
            <UserRound size={40} strokeWidth={1.5} />
          )}
          {photo.uploading && (
            <span className="overlay">
              <Spinner />
            </span>
          )}
        </button>
        <div className="photo-actions">
          <button className="btn btn-sm btn-secondary" onClick={() => cameraInput.current?.click()}>
            <Camera size={15} /> Take photo
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => libraryInput.current?.click()}>
            <ImagePlus size={15} /> Choose
          </button>
          {photo.preview && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setPhoto({ storageId: undefined, preview: null, uploading: false })}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <section className="form-section">
        <h2 className="form-section-title">Tenant</h2>
        <Field label="Full name" required error={show(errors.name)}>
          <input
            className={`input${show(errors.name) ? " invalid" : ""}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ayesha Rahman"
            autoComplete="off"
          />
        </Field>
        <div className="grid-2">
          <Field label="Phone" required error={show(errors.phone)}>
            <input
              className={`input${show(errors.phone) ? " invalid" : ""}`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+880 1XXX XXXXXX"
              type="tel"
              inputMode="tel"
            />
          </Field>
          <div className="field">
            <span className="label">
              People living there<span className="req">*</span>
            </span>
            <div className="stepper">
              <button onClick={() => setResidents((r) => Math.max(1, r - 1))} disabled={residents <= 1} aria-label="Fewer">
                <Minus size={16} />
              </button>
              <strong>{residents}</strong>
              <button onClick={() => setResidents((r) => Math.min(50, r + 1))} aria-label="More">
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="form-section">
        <h2 className="form-section-title">Rent and home</h2>
        <div className="grid-2">
          <Field label="Monthly rent" required error={show(errors.rent)}>
            <div className={`input-wrap${show(errors.rent) ? " invalid" : ""}`}>
              <span>{workspace.currency}</span>
              <input
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                inputMode="decimal"
                placeholder="0"
              />
            </div>
          </Field>
          <Field label="Move-in date">
            <input className="input" type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} />
          </Field>
        </div>
        <div className="grid-2">
          <Field
            label="Property"
            required={workspace.restricted}
            error={show(errors.property)}
            hint={properties?.length === 0 ? "Add a property first to place this tenant in it." : undefined}
          >
            <select
              className={`input${show(errors.property) ? " invalid" : ""}`}
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setUnitId("");
              }}
            >
              <option value="" disabled={workspace.restricted}>
                {workspace.restricted ? "Choose a property" : "Not assigned"}
              </option>
              {properties?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          {propertyId && (
            <Field
              label="Unit"
              required
              error={show(errors.unit)}
              hint={units?.length === 0 ? "This property has no units yet. Add them on the property page." : undefined}
            >
              <select
                className={`input${show(errors.unit) ? " invalid" : ""}`}
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                disabled={!units}
              >
                <option value="">Choose a unit</option>
                {units?.map((u) => {
                  const taken = !!u.occupant && u.occupant._id !== initial?._id;
                  return (
                    <option key={u._id} value={u._id} disabled={taken}>
                      {u.name}
                      {taken ? ` (rented to ${u.occupant!.name})` : ""}
                    </option>
                  );
                })}
              </select>
            </Field>
          )}
        </div>
        <Field label="Condition of the home at move-in" required error={show(errors.condition)}>
          <textarea
            className={`input${show(errors.condition) ? " invalid" : ""}`}
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="e.g. Freshly painted, all fittings working, small crack in bathroom tile"
            rows={4}
          />
        </Field>
      </section>

      <section className="form-section">
        <h2 className="form-section-title">
          Family members
          {family.length > 0 && <span className="count">{family.length}</span>}
        </h2>
        {family.length > 0 && (
          <div className="card list">
            {family.map((f) => (
              <button className="row" key={f.key} onClick={() => setFamilyEditing(f)}>
                <Avatar name={f.name} url={f.photoUrl} size={36} />
                <div className="row-main">
                  <div className="row-title">{f.name}</div>
                  <div className="row-sub">
                    {f.age} yrs{f.job ? ` · ${f.job}` : ""}
                  </div>
                </div>
                {!f._id ? <span className="badge ok">New</span> : f.dirty && <span className="badge">Edited</span>}
                <ChevronRight size={18} className="chev" />
              </button>
            ))}
          </div>
        )}
        <button className="add-row" onClick={() => setFamilyEditing("new")}>
          <UserPlus size={17} /> Add family member
        </button>
      </section>

      <section className="form-section">
        <h2 className="form-section-title">
          Documents
          <span className="count">
            {docs.length} of {MAX_DOCS}
          </span>
        </h2>
        {docs.length > 0 && (
          <div className="docs">
            {docs.map((d) => (
              <div className="doc" key={d.key}>
                <div className="doc-thumb">
                  {d.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.preview} alt={d.label} />
                  ) : (
                    <FileText size={28} strokeWidth={1.5} />
                  )}
                  {d.uploading && (
                    <span className="overlay">
                      <Spinner />
                    </span>
                  )}
                  <button
                    className="doc-remove"
                    onClick={() => setDocs((all) => all.filter((x) => x.key !== d.key))}
                    aria-label="Remove document"
                  >
                    <X size={14} />
                  </button>
                </div>
                <input
                  value={d.label}
                  className={touched && !d.label.trim() ? "invalid" : ""}
                  onChange={(e) =>
                    setDocs((all) => all.map((x) => (x.key === d.key ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="Label, e.g. NID card"
                  maxLength={60}
                />
              </div>
            ))}
          </div>
        )}
        {show(errors.docs) && <span className="field-error">{errors.docs}</span>}
        {docs.length < MAX_DOCS && (
          <div className="doc-add">
            <button className="btn btn-secondary" onClick={() => scanInput.current?.click()}>
              <ScanLine size={17} /> Scan
            </button>
            <button className="btn btn-secondary" onClick={() => fileInput.current?.click()}>
              <Upload size={17} /> Upload
            </button>
          </div>
        )}
        <span className="hint-text">ID cards, agreements or meter photos. Images or PDF.</span>
      </section>

      <div className="form-foot">
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving || uploading}>
          {saving ? <Spinner /> : uploading ? "Uploading…" : initial ? "Save changes" : "Add tenant"}
        </button>
      </div>

      {familyEditing && (
        <OverlayPage
          title={familyEditing === "new" ? "Add family member" : familyEditing.name}
          onBack={() => setFamilyEditing(null)}
        >
          <FamilyForm
            initial={familyEditing === "new" ? undefined : familyEditing}
            onSubmit={(value) => {
              if (familyEditing === "new") {
                setFamily((all) => [...all, { ...value, key: `fam-${Date.now()}`, dirty: true }]);
                // Keep the resident count at least tenant + family.
                setResidents((r) => Math.max(r, family.length + 2));
              } else {
                setFamily((all) =>
                  all.map((x) => (x.key === familyEditing.key ? { ...x, ...value, dirty: true } : x)),
                );
              }
              setFamilyEditing(null);
            }}
            onRemove={
              familyEditing !== "new" && (!familyEditing._id || can("full"))
                ? () => {
                    const target = familyEditing;
                    if (target._id) setRemovedFamily((r) => [...r, target._id!]);
                    setFamily((all) => all.filter((x) => x.key !== target.key));
                    setFamilyEditing(null);
                  }
                : undefined
            }
          />
        </OverlayPage>
      )}
    </div>
  );
}
