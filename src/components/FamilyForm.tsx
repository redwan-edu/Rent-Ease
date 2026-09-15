"use client";

import { useMutation } from "convex/react";
import { Camera, IdCard, ImagePlus, ScanLine, Trash2, Upload, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { errorMessage } from "@/lib/format";
import { processDocument, processPortrait, uploadBlob } from "@/lib/image";
import { useWorkspace } from "@/lib/workspace";
import { ConfirmSheet, Field, Spinner, useToast } from "./ui";

const MAX_NID = 2;

export type FamilyValue = {
  name: string;
  age: number;
  phone: string;
  job?: string;
  photoId?: Id<"_storage">;
  photoUrl: string | null;
  nid: { storageId: Id<"_storage">; url: string | null }[];
};

export type FamilyInitial = FamilyValue & { _id?: Id<"familyMembers"> };

type NidItem = { key: string; storageId?: Id<"_storage">; preview: string | null; uploading: boolean };

let keySeq = 0;
const newKey = () => `nid-${Date.now()}-${keySeq++}`;

/**
 * Family member editor. Saves straight to the database when given a `tenantId`;
 * with `onSubmit` it just hands the values back (used inside the tenant form,
 * where family changes are saved together with the tenant).
 */
export default function FamilyForm({
  tenantId,
  initial,
  onSubmit,
  onRemove,
}: {
  tenantId?: Id<"tenants">;
  initial?: FamilyInitial;
  onSubmit?: (value: FamilyValue) => void;
  onRemove?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { workspace, can, to } = useWorkspace();
  const editable = can("edit");
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const create = useMutation(api.family.create);
  const update = useMutation(api.family.update);
  const remove = useMutation(api.family.remove);

  const [name, setName] = useState(initial?.name ?? "");
  const [age, setAge] = useState(initial ? String(initial.age) : "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [job, setJob] = useState(initial?.job ?? "");
  const [photo, setPhoto] = useState({
    storageId: initial?.photoId,
    preview: initial?.photoUrl ?? null,
    uploading: false,
  });
  const [nid, setNid] = useState<NidItem[]>(() =>
    (initial?.nid ?? []).map((n) => ({ key: n.storageId, storageId: n.storageId, preview: n.url, uploading: false })),
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const nidScanInput = useRef<HTMLInputElement>(null);
  const nidFileInput = useRef<HTMLInputElement>(null);

  const getUploadUrl = () => generateUploadUrl({ workspaceId: workspace.workspaceId });
  const ageValue = Number(age);
  const errors = {
    name: !name.trim() && "Enter their name",
    age: (age.trim() === "" || !Number.isInteger(ageValue) || ageValue < 0 || ageValue > 130) && "Enter their age",
    phone: !phone.trim() && "Enter a phone number",
    nid: nid.length === 0 && "Add a photo of their NID",
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const uploading = photo.uploading || nid.some((n) => n.uploading);
  const show = (e: string | false) => touched && e;
  const draftMode = !!onSubmit;

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

  async function onNid(file?: File) {
    if (!file) return;
    if (nid.length >= MAX_NID) return toast("Add up to two NID photos (front and back).");
    const key = newKey();
    setNid((n) => [...n, { key, preview: null, uploading: true }]);
    try {
      const blob = await processDocument(file);
      const preview = URL.createObjectURL(blob);
      setNid((n) => n.map((x) => (x.key === key ? { ...x, preview } : x)));
      const storageId = (await uploadBlob(getUploadUrl, blob)) as Id<"_storage">;
      setNid((n) => n.map((x) => (x.key === key ? { ...x, storageId, uploading: false } : x)));
    } catch (e) {
      toast(errorMessage(e));
      setNid((n) => n.filter((x) => x.key !== key));
    }
  }

  async function save() {
    setTouched(true);
    if (hasErrors) return toast("Please fill in the highlighted fields.");
    if (uploading) return toast("Hold on, photos are still uploading.");
    const value: FamilyValue = {
      name: name.trim(),
      age: ageValue,
      phone: phone.trim(),
      job: job.trim() || undefined,
      photoId: photo.storageId,
      photoUrl: photo.storageId ? photo.preview : null,
      nid: nid.filter((n) => n.storageId).map((n) => ({ storageId: n.storageId!, url: n.preview })),
    };
    if (onSubmit) return onSubmit(value);

    setSaving(true);
    const payload = {
      name: value.name,
      age: value.age,
      phone: value.phone,
      job: value.job,
      photoId: value.photoId,
      nidPhotoIds: value.nid.map((n) => n.storageId),
    };
    try {
      if (initial?._id) await update({ memberId: initial._id, ...payload });
      else await create({ tenantId: tenantId!, ...payload });
      toast(initial ? "Changes saved" : "Family member added");
      router.replace(to(`/tenants/${tenantId}`));
    } catch (e) {
      toast(errorMessage(e));
      setSaving(false);
    }
  }

  const canDelete = draftMode ? !!onRemove : !!initial?._id && can("full");

  return (
    <div className="page form">
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={libraryInput} type="file" accept="image/*" hidden onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={nidScanInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onNid(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={nidFileInput} type="file" accept="image/*" hidden onChange={(e) => { onNid(e.target.files?.[0]); e.target.value = ""; }} />

      <div className="photo-pick">
        <button
          className="photo-circle"
          onClick={() => editable && cameraInput.current?.click()}
          aria-label="Take photo"
          disabled={!editable}
        >
          {photo.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.preview} alt={name || "Family member"} />
          ) : (
            <UserRound size={40} strokeWidth={1.5} />
          )}
          {photo.uploading && (
            <span className="overlay">
              <Spinner />
            </span>
          )}
        </button>
        {editable && (
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
        )}
        <span className="hint-text">Photo is optional</span>
      </div>

      <section className="form-section">
        <Field label="Name" required error={show(errors.name)}>
          <input
            className={`input${show(errors.name) ? " invalid" : ""}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Karim Rahman"
            disabled={!editable}
            autoComplete="off"
          />
        </Field>
        <div className="grid-2">
          <Field label="Age" required error={show(errors.age)}>
            <input
              className={`input${show(errors.age) ? " invalid" : ""}`}
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
              inputMode="numeric"
              placeholder="e.g. 34"
              disabled={!editable}
            />
          </Field>
          <Field label="Phone" required error={show(errors.phone)}>
            <input
              className={`input${show(errors.phone) ? " invalid" : ""}`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              placeholder="+880 1XXX XXXXXX"
              disabled={!editable}
            />
          </Field>
        </div>
        <Field label="Job">
          <input
            className="input"
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="e.g. Teacher (optional)"
            disabled={!editable}
          />
        </Field>
      </section>

      <section className="form-section">
        <h2 className="form-section-title">
          NID<span style={{ color: "var(--danger)" }}> *</span>
        </h2>
        {nid.length > 0 && (
          <div className="docs">
            {nid.map((n, i) => (
              <div className="doc" key={n.key}>
                <div className="doc-thumb">
                  {n.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.preview} alt={i === 0 ? "NID front" : "NID back"} />
                  ) : (
                    <IdCard size={28} strokeWidth={1.5} />
                  )}
                  {n.uploading && (
                    <span className="overlay">
                      <Spinner />
                    </span>
                  )}
                  {editable && (
                    <button
                      className="doc-remove"
                      onClick={() => setNid((all) => all.filter((x) => x.key !== n.key))}
                      aria-label="Remove NID photo"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="doc-label">{i === 0 ? "Front" : "Back"}</div>
              </div>
            ))}
          </div>
        )}
        {editable && nid.length < MAX_NID && (
          <div className="doc-add">
            <button className="btn btn-secondary" onClick={() => nidScanInput.current?.click()}>
              <ScanLine size={17} /> Scan {nid.length === 0 ? "front" : "back"}
            </button>
            <button className="btn btn-secondary" onClick={() => nidFileInput.current?.click()}>
              <Upload size={17} /> Upload
            </button>
          </div>
        )}
        {show(errors.nid) ? (
          <span className="field-error">{errors.nid}</span>
        ) : (
          <span className="hint-text">A clear photo of the front, and the back if you like.</span>
        )}
      </section>

      {editable && (
        <div className="form-foot" style={{ display: "flex", gap: 10 }}>
          {canDelete && (
            <button
              className="btn btn-danger"
              style={{ width: 50, padding: 0 }}
              onClick={() => (draftMode ? onRemove!() : setConfirmDelete(true))}
              aria-label="Remove family member"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving || uploading}>
            {saving ? (
              <Spinner />
            ) : uploading ? (
              "Uploading…"
            ) : draftMode ? (
              initial ? "Done" : "Add family member"
            ) : initial ? (
              "Save changes"
            ) : (
              "Add family member"
            )}
          </button>
        </div>
      )}

      {confirmDelete && initial?._id && (
        <ConfirmSheet
          title={`Remove ${initial.name}?`}
          text="Their details and NID photos will be deleted."
          confirmLabel="Remove"
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await remove({ memberId: initial._id! });
            router.replace(to(`/tenants/${tenantId}`));
          }}
        />
      )}
    </div>
  );
}
