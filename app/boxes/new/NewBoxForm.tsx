"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Room, BoxSize } from "@/app/generated/prisma/client";
import { createBox, addPhoto } from "@/lib/actions/boxes";
import { upload } from "@vercel/blob/client";
import { compressImage } from "@/lib/imageCompress";
import { QrScanner } from "@/app/components/QrScanner";
import { haptic } from "@/lib/haptic";

type PhotoEntry = { file: File; preview: string };

export function NewBoxForm({
  rooms,
  boxSizes,
  initialQr,
}: {
  rooms: Room[];
  boxSizes: BoxSize[];
  initialQr?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"manual" | "qr">(initialQr ? "qr" : "manual");
  const [items, setItems] = useState<string[]>([]);
  const [itemInput, setItemInput] = useState("");
  const [scannedQr, setScannedQr] = useState<string | null>(initialQr ?? null);
  const [showScanner, setShowScanner] = useState(false);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  /* Revoke object URLs when entries are removed or component unmounts */
  useEffect(() => {
    return () => { photos.forEach((p) => URL.revokeObjectURL(p.preview)); };
  }, [photos]);

  function addItem() {
    const trimmed = itemInput.trim();
    if (!trimmed) return;
    setItems((prev) => [...prev, trimmed]);
    setItemInput("");
  }

  function removeItem(item: string) {
    setItems((prev) => prev.filter((i) => i !== item));
  }

  function handleScan(text: string) {
    setScannedQr(text);
    setShowScanner(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const entries: PhotoEntry[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...entries]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function removePhoto(preview: string) {
    setPhotos((prev) => {
      const entry = prev.find((p) => p.preview === preview);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter((p) => p.preview !== preview);
    });
  }

  function resetForm() {
    setItems([]);
    setItemInput("");
    setScannedQr(null);
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setFailedPhotos(0);
    formRef.current?.reset();
    /* Re-apply mode so the UI updates correctly */
    setMode("manual");
  }

  async function handleSubmitInternal(andAddAnother: boolean) {
    setSaving(true);
    setFailedPhotos(0);
    try {
      const fd = new FormData(formRef.current!);
      fd.set("items", JSON.stringify(items));
      if (mode === "qr") fd.set("qrCode", scannedQr ?? "");

      const boxId = await createBox(fd);

      if (photos.length > 0) {
        const results = await Promise.all(
          photos.map(async ({ file }) => {
            try {
              const compressed = await compressImage(file);
              const blob = await upload(compressed.name, compressed, {
                access: "private",
                handleUploadUrl: "/api/upload",
              });
              await addPhoto(boxId, blob.url);
              return true;
            } catch {
              return false;
            }
          }),
        );
        const failures = results.filter((ok) => !ok).length;
        if (failures > 0) setFailedPhotos(failures);
      }

      haptic("success");
      if (andAddAnother) {
        setSavedCount((n) => n + 1);
        resetForm();
      } else {
        router.push(`/boxes/${boxId}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await handleSubmitInternal(false);
  }

  const canSubmit = !saving && !(mode === "qr" && !scannedQr);

  return (
    <>
      {showScanner && (
        <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      {savedCount > 0 && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "var(--color-freight-tint)", border: "1px solid rgba(255,107,43,0.28)", color: "var(--color-freight)" }}
        >
          Box saved — {savedCount} added this session
        </div>
      )}

      {failedPhotos > 0 && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)", color: "#FF3B30" }}
        >
          {failedPhotos} photo{failedPhotos > 1 ? "s" : ""} failed to upload — the box was saved but those photos are missing
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
        {/* Mode toggle */}
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}
        >
          {(["manual", "qr"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setScannedQr(null); }}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              style={
                mode === m
                  ? { background: "var(--color-freight)", color: "#fff" }
                  : { color: "var(--color-pencil)" }
              }
            >
              {m === "manual" ? "Manual label" : "QR Code"}
            </button>
          ))}
        </div>

        {/* Label / QR field */}
        {mode === "manual" ? (
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
              Label number
            </label>
            <input
              name="labelNumber"
              data-testid="label-input"
              required
              placeholder="e.g. BOX-001"
              className="label-number w-full rounded-xl px-4 py-3 text-sm font-semibold transition-shadow"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
                QR Code
              </label>
              {scannedQr ? (
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: "var(--color-freight-tint)", border: "1px solid color-mix(in srgb, var(--color-freight) 30%, transparent)" }}
                >
                  <QrIcon className="w-5 h-5 shrink-0" style={{ color: "var(--color-freight)" }} />
                  <span className="text-sm font-medium flex-1" style={{ color: "var(--color-freight)" }}>QR code scanned</span>
                  <button type="button" onClick={() => setShowScanner(true)} className="text-xs" style={{ color: "var(--color-freight)" }}>
                    Rescan
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="w-full flex flex-col items-center gap-2 rounded-xl px-4 py-6 transition-colors"
                  style={{ background: "var(--color-surface)", border: "2px dashed var(--color-kraft)", color: "var(--color-pencil)" }}
                >
                  <QrIcon className="w-8 h-8" style={{ color: "var(--color-kraft)" }} />
                  <span className="text-sm">Tap to scan QR code</span>
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
                Friendly name
              </label>
              <input
                name="labelNumber"
                data-testid="label-input"
                required
                placeholder="e.g. Kitchen boxes, Winter clothes…"
                className="w-full rounded-xl px-4 py-3 text-sm transition-shadow"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
              />
            </div>
          </div>
        )}

        {/* Room + Size */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>Room</label>
            <select
              name="roomId"
              data-testid="room-select"
              required
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
            >
              <option value="">Select</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>Size</label>
            <select
              name="boxSizeId"
              data-testid="size-select"
              required
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
            >
              <option value="">Select</option>
              {boxSizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Contents */}
        <div className="space-y-2">
          <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
            Contents
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={itemInput}
              onChange={(e) => setItemInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
              data-testid="item-input"
              placeholder="Coffee machine, books, lamp…"
              className="flex-1 rounded-xl px-4 py-3 text-sm transition-shadow"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
            />
            <button
              type="button"
              onClick={addItem}
              data-testid="add-item-btn"
              className="rounded-xl px-4 py-3 text-sm font-medium transition-colors"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
            >
              Add
            </button>
          </div>
          {items.length > 0 && (
            <ul data-testid="item-list" className="space-y-1">
              {items.map((item) => (
                <li
                  key={item}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                  style={{ background: "var(--color-paper)", border: "1px solid var(--color-kraft)" }}
                >
                  <span style={{ color: "var(--color-ink)" }}>{item}</span>
                  <button
                    type="button"
                    data-testid={`remove-item-${item}`}
                    onClick={() => removeItem(item)}
                    className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 text-xl transition-colors"
                    style={{ color: "var(--color-kraft)" }}
                    onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--color-freight)")}
                    onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--color-kraft)")}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {items.length === 0 && (
            <p className="text-xs py-1" style={{ color: "var(--color-pencil)" }}>Add items you can search for later</p>
          )}
        </div>

        {/* Photos */}
        <div className="space-y-2">
          <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
            Photos
          </label>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map(({ preview }) => (
                <div key={preview} className="relative aspect-square">
                  <img
                    src={preview}
                    alt=""
                    className="w-full h-full object-cover rounded-xl"
                    style={{ border: "1px solid var(--color-kraft)" }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(preview)}
                    className="absolute top-1 right-1 w-8 h-8 rounded-full flex items-center justify-center text-base"
                    style={{ background: "rgba(6,6,8,0.72)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-medium"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              Take photo
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-medium"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              Gallery
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            type="submit"
            data-testid="save-box-btn"
            disabled={!canSubmit}
            className="w-full rounded-xl py-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "var(--color-freight)" }}
          >
            {saving ? (
              <>
                <svg className="spin w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" opacity="0.9"/>
                  <path d="M12 2a10 10 0 0 0-10 10" strokeLinecap="round" opacity="0.3"/>
                </svg>
                {photos.length > 0 ? "Uploading…" : "Saving…"}
              </>
            ) : "Save box"}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => handleSubmitInternal(true)}
            className="w-full rounded-xl py-4 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
          >
            {saving ? (
              <svg className="spin w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" opacity="0.9"/>
                <path d="M12 2a10 10 0 0 0-10 10" strokeLinecap="round" opacity="0.3"/>
              </svg>
            ) : "+ Save & add another"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full py-3 text-sm transition-colors"
            style={{ color: "var(--color-pencil)" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}

function QrIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 18.75h.75v.75h-.75v-.75zM18.75 13.5h.75v.75h-.75v-.75zM18.75 18.75h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
    </svg>
  );
}
