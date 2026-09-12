type Drawable = ImageBitmap | HTMLImageElement;

async function load(file: Blob): Promise<Drawable> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function dims(img: Drawable) {
  return "naturalWidth" in img
    ? { w: img.naturalWidth, h: img.naturalHeight }
    : { w: img.width, h: img.height };
}

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Couldn't process that image."))),
      "image/jpeg",
      quality,
    ),
  );
}

/** Tenant photo: centre-crops to a square and shrinks it to 640px. */
export async function processPortrait(file: File): Promise<Blob> {
  const img = await load(file);
  const { w, h } = dims(img);
  const side = Math.min(w, h);
  const size = Math.min(640, side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
  return toBlob(canvas, 0.86);
}

/** Documents: images are downscaled and compressed; PDFs and other files pass through. */
export async function processDocument(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const img = await load(file);
    const { w, h } = dims(img);
    const scale = Math.min(1, 2000 / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await toBlob(canvas, 0.82);
    return blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadBlob(getUploadUrl: () => Promise<string>, blob: Blob) {
  const url = await getUploadUrl();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": blob.type || "application/octet-stream" },
    body: blob,
  });
  if (!res.ok) throw new Error("Upload failed. Check your connection and try again.");
  const { storageId } = (await res.json()) as { storageId: string };
  return storageId;
}
