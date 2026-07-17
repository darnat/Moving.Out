"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Box, Room, BoxSize, Item, Photo } from "@/app/generated/prisma/client";
import { addItem, removeItem, deleteBox, setRetrieved, addPhoto, removePhoto, updateBoxRoom } from "@/lib/actions/boxes";

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
  const [loading, setLoading] = useState<string | null>(null); // which action is in-flight
  const [editingRoom, setEditingRoom] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = loading !== null;

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
    await run("delete", async () => {
      await deleteBox(box.id);
      router.push("/");
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
      router.refresh();
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || busy) return;
    await run("upload", async () => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const { url } = await res.json();
      await addPhoto(box.id, url);
      router.refresh();
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
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
              <h1 className="label-number font-bold text-2xl leading-none" style={{ color: "var(--color-ink)" }}>
                {box.labelNumber}
              </h1>
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

        {box.gridCol !== null && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "var(--color-freight-tint)" }}>
            <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-freight)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium" style={{ color: "var(--color-freight)" }}>
              Col {box.gridCol} · Row {box.gridRow} · Level {Math.round(box.stackLevel!)}
            </span>
          </div>
        )}
      </div>

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
                  className="text-lg leading-none ml-3 transition-colors"
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
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
            Photos — {box.photos.length} photo{box.photos.length !== 1 ? "s" : ""}
          </h2>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
          >
            {loading === "upload" ? <><Spinner /> Uploading…</> : "+ Add photo"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>

        {box.photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {box.photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square">
                <img
                  src={photoUrls[photo.id]}
                  alt=""
                  className="w-full h-full object-cover rounded-xl"
                  style={{ border: "1px solid var(--color-kraft)" }}
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.id)}
                  disabled={busy}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-freight)" }}
                >
                  {loading === `photo-${photo.id}` ? <Spinner /> : "×"}
                </button>
              </div>
            ))}
          </div>
        )}
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
