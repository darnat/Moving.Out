"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Room, BoxSize, Item, Photo } from "@/app/generated/prisma/client";
import { addItem, removeItem, deleteBox, setRetrieved, addPhoto, removePhoto, updateBoxRoom, updateBoxLabel, updateBoxIcon } from "@/lib/actions/boxes";
import { upload } from "@vercel/blob/client";
import { compressImage } from "@/lib/imageCompress";
import { PhotoGallery } from "@/app/components/PhotoGallery";
import { haptic } from "@/lib/haptic";

const PICTOS: { e: string; k: string }[] = [
  { e: "📚", k: "books read library study school" },
  { e: "📖", k: "book reading novel" },
  { e: "📝", k: "notes writing documents papers" },
  { e: "📁", k: "files folders documents office" },
  { e: "💼", k: "briefcase office work documents" },
  { e: "👕", k: "shirt clothes clothing tshirt tops" },
  { e: "👔", k: "shirt dress clothes formal" },
  { e: "👗", k: "dress clothes clothing women" },
  { e: "🧥", k: "coat jacket clothes winter" },
  { e: "🧣", k: "scarf clothes winter accessories" },
  { e: "🧤", k: "gloves clothes winter accessories" },
  { e: "👟", k: "shoes sneakers footwear sport" },
  { e: "👠", k: "shoes heels footwear women" },
  { e: "👞", k: "shoes dress footwear formal" },
  { e: "👒", k: "hat accessories clothes" },
  { e: "🧢", k: "cap hat accessories" },
  { e: "👜", k: "bag purse accessories women" },
  { e: "🎒", k: "backpack bag school travel" },
  { e: "🍳", k: "kitchen cooking pan pots" },
  { e: "🥘", k: "kitchen cooking pot food" },
  { e: "🍽️", k: "dishes plates cutlery dining" },
  { e: "☕", k: "coffee mug kitchen cups" },
  { e: "🥂", k: "glasses wine champagne fragile" },
  { e: "🍷", k: "wine glasses alcohol fragile" },
  { e: "🫙", k: "jars pantry food kitchen" },
  { e: "🔪", k: "knife knives kitchen utensils" },
  { e: "🧊", k: "ice freezer cold kitchen" },
  { e: "💻", k: "laptop computer electronics work" },
  { e: "🖥️", k: "desktop computer monitor electronics" },
  { e: "📱", k: "phone mobile electronics" },
  { e: "🎮", k: "games gaming console toys" },
  { e: "📷", k: "camera photos photography electronics" },
  { e: "🎧", k: "headphones audio music electronics" },
  { e: "📺", k: "tv television screen electronics" },
  { e: "🔌", k: "cables chargers electronics wires" },
  { e: "🖱️", k: "mouse computer electronics" },
  { e: "🛏️", k: "bed bedroom bedding linen" },
  { e: "🪞", k: "mirror bedroom bathroom" },
  { e: "🛋️", k: "sofa couch living room furniture" },
  { e: "🪑", k: "chair furniture" },
  { e: "🕯️", k: "candles decoration home" },
  { e: "🧸", k: "teddy bear toys kids" },
  { e: "🪆", k: "toys decoration" },
  { e: "🖼️", k: "art pictures frames decoration" },
  { e: "🪟", k: "curtains blinds bedroom" },
  { e: "🛁", k: "bath bathroom toiletries" },
  { e: "🧴", k: "toiletries shampoo bathroom beauty" },
  { e: "💊", k: "medicine pharmacy health" },
  { e: "🪥", k: "toothbrush bathroom toiletries" },
  { e: "🧼", k: "soap bathroom cleaning" },
  { e: "🪒", k: "razor shaving bathroom" },
  { e: "⚽", k: "sports football soccer" },
  { e: "🏋️", k: "gym weights sports fitness" },
  { e: "🎿", k: "ski winter sports" },
  { e: "🎾", k: "tennis sports" },
  { e: "🧩", k: "puzzle toys games" },
  { e: "🎲", k: "board games toys" },
  { e: "🏓", k: "ping pong sports toys" },
  { e: "🔧", k: "tools wrench hardware fix" },
  { e: "🔨", k: "hammer tools hardware" },
  { e: "🪚", k: "saw tools hardware" },
  { e: "🔩", k: "screws bolts tools hardware" },
  { e: "🔦", k: "flashlight torch tools" },
  { e: "🧰", k: "toolbox tools hardware" },
  { e: "🎨", k: "art painting craft supplies" },
  { e: "🎵", k: "music cds records" },
  { e: "🎹", k: "piano keyboard music instrument" },
  { e: "🎸", k: "guitar music instrument" },
  { e: "📸", k: "camera photos pictures albums" },
  { e: "🪴", k: "plant garden indoor" },
  { e: "🌱", k: "plant garden seeds" },
  { e: "🌸", k: "flowers decoration garden" },
  { e: "🥫", k: "cans food pantry" },
  { e: "🧃", k: "drinks beverages food" },
  { e: "📦", k: "misc general other stuff" },
  { e: "🎁", k: "gifts presents holiday" },
  { e: "🏺", k: "vases decoration fragile" },
  { e: "✨", k: "decoration holiday christmas" },
  { e: "🗺️", k: "maps travel" },
];

type BoxWithRelations = Box & {
  room: Room;
  boxSize: BoxSize;
  items: Item[];
  photos: Photo[];
};

function Spinner() {
  return (
    <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" opacity="0.9" />
      <path d="M12 2a10 10 0 0 0-10 10" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

export function BoxDetail({ box, rooms, photoUrls }: { box: BoxWithRelations; rooms: Room[]; photoUrls: Record<string, string> }) {
  const router = useRouter();
  const [itemInput, setItemInput] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(box.labelNumber);
  const [icon, setIcon] = useState<string | null>(box.icon ?? null);
  const [showPictoSheet, setShowPictoSheet] = useState(false);
  const [editingRoom, setEditingRoom] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<{ index: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const busy = loading !== null;
  const orderedUrls = box.photos.map((p) => photoUrls[p.id]);

  async function run(key: string, fn: () => Promise<void>) {
    setLoading(key);
    try { await fn(); } finally { setLoading(null); }
  }

  async function handleAddItem() {
    const trimmed = itemInput.trim();
    if (!trimmed || busy) return;
    await run("addItem", async () => {
      await addItem(box.id, trimmed);
      setItemInput("");
      router.refresh();
    });
  }

  async function handleRemoveItem(itemId: string) {
    if (busy) return;
    await run(`remove-${itemId}`, async () => {
      await removeItem(itemId);
      router.refresh();
    });
  }

  async function handleDelete() {
    if (busy) return;
    if (!confirm(`Delete box ${box.labelNumber}? This cannot be undone.`)) return;
    await run("delete", async () => {
      await deleteBox(box.id);
      router.push("/");
    });
  }

  async function handleLabelSave() {
    const trimmed = labelDraft.trim();
    if (!trimmed || trimmed === box.labelNumber) { setEditingLabel(false); return; }
    setEditingLabel(false);
    await run("label", async () => {
      await updateBoxLabel(box.id, trimmed);
      router.refresh();
    });
  }

  async function handleIconChange(newIcon: string | null) {
    setIcon(newIcon);
    await run("icon", async () => {
      await updateBoxIcon(box.id, newIcon);
      router.refresh();
    });
  }

  async function handleRoomChange(roomId: string) {
    setEditingRoom(false);
    if (roomId === box.roomId) return;
    await run("room", async () => {
      await updateBoxRoom(box.id, roomId);
      router.refresh();
    });
  }

  async function handleToggleRetrieved() {
    if (busy) return;
    await run("retrieve", async () => {
      await setRetrieved(box.id, !box.retrieved);
      haptic("success");
      router.refresh();
    });
  }

  async function handlePhotoFile(file: File) {
    if (busy) return;
    setPhotoError(null);
    await run("upload", async () => {
      try {
        const compressed = await compressImage(file);
        const blob = await upload(compressed.name, compressed, {
          access: "private",
          handleUploadUrl: "/api/upload",
        });
        await addPhoto(box.id, blob.url);
        router.refresh();
      } catch {
        setPhotoError("Upload failed — please try again");
      }
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await handlePhotoFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  async function handleRemovePhoto(photoId: string) {
    if (busy) return;
    await run(`photo-${photoId}`, async () => {
      await removePhoto(photoId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {gallery !== null && (
        <PhotoGallery
          urls={orderedUrls}
          initialIndex={gallery.index}
          onClose={() => setGallery(null)}
        />
      )}

      {/* Box header */}
      <div
        className="rounded-3xl p-5 space-y-3 glass"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className="w-1 h-8 rounded-full shrink-0"
                style={{ background: box.retrieved ? "var(--color-kraft)" : "var(--color-freight)" }}
              />
              {box.qrCode && (
                <svg className="w-5 h-5 shrink-0" style={{ color: "var(--color-freight)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 18.75h.75v.75h-.75v-.75zM18.75 13.5h.75v.75h-.75v-.75zM18.75 18.75h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                </svg>
              )}
              {editingLabel ? (
                <input
                  autoFocus
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onBlur={handleLabelSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleLabelSave(); }
                    if (e.key === "Escape") { setLabelDraft(box.labelNumber); setEditingLabel(false); }
                  }}
                  size={Math.max(1, labelDraft.length)}
                  className="label-number font-bold text-2xl leading-none bg-transparent border-b outline-none min-w-0"
                  style={{ color: "var(--color-ink)", borderColor: "var(--color-freight)" }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => { setLabelDraft(box.labelNumber); setEditingLabel(true); }}
                  disabled={busy}
                  className="flex items-center gap-1.5 group"
                >
                  <h1 className="label-number font-bold text-2xl leading-none" style={{ color: "var(--color-ink)" }}>
                    {loading === "label" ? <Spinner /> : box.labelNumber}
                  </h1>
                  <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--color-pencil)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 pl-3">
              {editingRoom ? (
                <select
                  autoFocus
                  defaultValue={box.roomId}
                  disabled={loading === "room"}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  onBlur={() => setEditingRoom(false)}
                  className="rounded-md px-2 py-0.5 text-sm"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-freight)", color: "var(--color-ink)" }}
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingRoom(true)}
                  disabled={busy}
                  className="flex items-center gap-1 text-sm transition-colors group"
                  style={{ color: "var(--color-pencil)" }}
                >
                  {loading === "room" ? <Spinner /> : null}
                  <span>{box.room.name}</span>
                  <svg className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              <span style={{ color: "var(--color-kraft)" }}>·</span>
              <span className="text-sm" style={{ color: "var(--color-pencil)" }}>{box.boxSize.name}</span>
            </div>
          </div>

          {box.retrieved && (
            <span className="rounded-lg px-2.5 py-1 text-xs font-medium shrink-0" style={{ background: "var(--color-paper)", border: "1px solid var(--color-kraft)", color: "var(--color-pencil)" }}>
              Retrieved
            </span>
          )}
        </div>

        {box.gridCol !== null ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1" style={{ background: "var(--color-freight-tint)" }}>
              <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-freight)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-medium" style={{ color: "var(--color-freight)" }}>
                Col {box.gridCol} · Row {box.gridRow} · Level {Math.round(box.stackLevel!)}
              </span>
            </div>
            <Link
              href={`/grid?focus=${box.id}`}
              className="rounded-lg px-3 py-2 text-xs font-medium"
              style={{ background: "var(--color-freight)", color: "#fff" }}
            >
              View on map
            </Link>
          </div>
        ) : null}
      </div>

      {/* Picto */}
      <div className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
          Picto {loading === "icon" && <Spinner />}
        </h2>
        <button
          type="button"
          onClick={() => setShowPictoSheet(true)}
          disabled={busy}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: icon ? "var(--color-ink)" : "var(--color-pencil)" }}
        >
          {icon ? (
            <>
              <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>
              <span className="flex-1 text-left">{PICTOS.find(p => p.e === icon)?.k.split(" ")[0] ?? icon}</span>
              <span style={{ color: "var(--color-pencil)" }}>Change</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 24, opacity: 0.4 }}>🏷️</span>
              <span className="flex-1 text-left">Add a picto…</span>
            </>
          )}
        </button>
      </div>

      {showPictoSheet && (
        <PictoSheet
          current={icon}
          onSelect={(e) => { handleIconChange(e); setShowPictoSheet(false); }}
          onClose={() => setShowPictoSheet(false)}
        />
      )}

      {/* Items */}
      <div className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
          Contents — {box.items.length} item{box.items.length !== 1 ? "s" : ""}
        </h2>

        <div className="flex gap-2">
          <input
            type="text"
            value={itemInput}
            onChange={(e) => setItemInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddItem())}
            data-testid="item-input"
            placeholder="Add another item…"
            disabled={busy}
            className="flex-1 rounded-2xl px-4 py-3 text-sm glass"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
          />
          <button
            type="button"
            onClick={handleAddItem}
            data-testid="add-item-btn"
            disabled={busy || !itemInput.trim()}
            className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
          >
            {loading === "addItem" ? <Spinner /> : "Add"}
          </button>
        </div>

        {box.items.length > 0 ? (
          <ul className="rounded-2xl overflow-hidden glass" style={{ border: "1px solid var(--color-kraft)" }}>
            {box.items.map((item, i) => (
              <li
                key={item.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
                style={{ background: "var(--color-surface)", borderTop: i > 0 ? "1px solid var(--color-kraft)" : "none" }}
              >
                <span style={{ color: "var(--color-ink)" }}>{item.name}</span>
                <button
                  type="button"
                  data-testid={`remove-item-${item.name}`}
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={busy}
                  className="flex items-center justify-center w-10 h-10 rounded-lg ml-1 shrink-0 text-xl transition-colors"
                  style={{ color: loading === `remove-${item.id}` ? "var(--color-freight)" : "var(--color-kraft)" }}
                >
                  {loading === `remove-${item.id}` ? <Spinner /> : "×"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm py-2" style={{ color: "var(--color-pencil)" }}>No items recorded yet</p>
        )}
      </div>

      {/* Photos */}
      <div className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
          Photos — {box.photos.length} photo{box.photos.length !== 1 ? "s" : ""}
        </h2>

        {photoError && (
          <p className="text-sm px-1" style={{ color: "var(--color-freight)" }}>{photoError}</p>
        )}

        {box.photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {box.photos.map((photo, photoIndex) => (
              <div key={photo.id} className="relative aspect-square">
                <button
                  type="button"
                  onClick={() => setGallery({ index: photoIndex })}
                  className="w-full h-full"
                >
                  <img
                    src={photoUrls[photo.id]}
                    alt=""
                    className="w-full h-full object-cover rounded-xl"
                    style={{ border: "1px solid var(--color-kraft)" }}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.id)}
                  disabled={busy}
                  className="absolute top-1 right-1 w-8 h-8 rounded-full flex items-center justify-center text-base"
                  style={{ background: "rgba(6,6,8,0.72)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
                >
                  {loading === `photo-${photo.id}` ? <Spinner /> : "×"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={busy}
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
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-medium"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
          >
            {loading === "upload" ? (
              <><Spinner /> Uploading…</>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                Gallery
              </>
            )}
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--color-kraft)" }}>
        <button
          onClick={handleToggleRetrieved}
          data-testid={box.retrieved ? "un-retrieve-btn" : "retrieve-btn"}
          disabled={busy}
          className="flex-1 rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          style={{ border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
        >
          {loading === "retrieve" ? <Spinner /> : null}
          {box.retrieved ? "Back in storage" : "Mark as retrieved"}
        </button>
        <button
          onClick={handleDelete}
          data-testid="delete-box-btn"
          disabled={busy}
          className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors"
          style={{ border: "1px solid color-mix(in srgb, var(--color-freight) 30%, transparent)", color: "var(--color-freight)" }}
        >
          {loading === "delete" ? <Spinner /> : null}
          Delete
        </button>
      </div>
    </div>
  );
}

function PictoSheet({
  current,
  onSelect,
  onClose,
}: {
  current: string | null;
  onSelect: (emoji: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? PICTOS.filter((p) => p.k.includes(query.toLowerCase()) || p.e === query)
    : PICTOS;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="rounded-t-3xl space-y-4"
        style={{
          background: "rgb(18 18 20)",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "20px 20px",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto shrink-0" style={{ background: "rgba(255,255,255,0.2)" }} />

        {/* Search */}
        <div className="relative shrink-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(255,255,255,0.4)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search: books, clothes, kitchen…"
            className="w-full rounded-2xl py-3 pl-9 pr-4 text-sm"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
          />
        </div>

        {/* Grid */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No match — try a different word</p>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {filtered.map((p) => (
                <button
                  key={p.e}
                  type="button"
                  onClick={() => onSelect(p.e)}
                  className="flex items-center justify-center rounded-xl aspect-square text-3xl transition-transform active:scale-90"
                  style={{
                    background: current === p.e ? "rgba(255,107,43,0.25)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${current === p.e ? "rgba(255,107,43,0.5)" : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  {p.e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Remove */}
        {current && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="w-full py-3 text-sm shrink-0"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Remove picto
          </button>
        )}
      </div>
    </div>
  );
}
