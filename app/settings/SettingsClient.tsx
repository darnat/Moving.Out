"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BoxSize, Room, StorageUnit } from "@/app/generated/prisma/client";
import {
  addBoxSize,
  deleteBoxSize,
  addRoom,
  deleteRoom,
  updateStorageUnit,
} from "@/lib/actions/settings";

const inputStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-kraft)",
  color: "var(--color-ink)",
};

function Spinner() {
  return (
    <svg className="spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" opacity="0.9"/>
      <path d="M12 2a10 10 0 0 0-10 10" strokeLinecap="round" opacity="0.3"/>
    </svg>
  );
}

export function SettingsClient({
  boxSizes,
  rooms,
  storageUnit,
}: {
  boxSizes: BoxSize[];
  rooms: Room[];
  storageUnit: Pick<StorageUnit, "widthCells" | "depthCells" | "heightCells" | "id" | "userId">;
}) {
  const router = useRouter();
  const [storagePending, startStorageTransition] = useTransition();
  const [addBoxSizePending, startAddBoxSize] = useTransition();
  const [addRoomPending, startAddRoom] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [storageSaved, setStorageSaved] = useState(false);

  const [widthCells, setWidthCells]   = useState(storageUnit.widthCells);
  const [depthCells, setDepthCells]   = useState(storageUnit.depthCells);
  const [heightCells, setHeightCells] = useState(storageUnit.heightCells);
  useEffect(() => {
    setWidthCells(storageUnit.widthCells);
    setDepthCells(storageUnit.depthCells);
    setHeightCells(storageUnit.heightCells);
  }, [storageUnit.widthCells, storageUnit.depthCells, storageUnit.heightCells]);

  function handleAddBoxSize(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    startAddBoxSize(async () => {
      await addBoxSize(new FormData(form));
      form.reset();
      router.refresh();
    });
  }

  function handleAddRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    startAddRoom(async () => {
      await addRoom(new FormData(form));
      form.reset();
      router.refresh();
    });
  }

  function handleUpdateStorage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startStorageTransition(async () => {
      await updateStorageUnit(fd);
      router.refresh();
      setStorageSaved(true);
      setTimeout(() => setStorageSaved(false), 2000);
    });
  }

  async function handleDeleteBoxSize(id: string) {
    setDeletingId(id);
    await deleteBoxSize(id);
    router.refresh();
    setDeletingId(null);
  }

  async function handleDeleteRoom(id: string) {
    setDeletingId(id);
    await deleteRoom(id);
    router.refresh();
    setDeletingId(null);
  }

  return (
    <div className="space-y-4">
      {/* Storage unit */}
      <section
        className="rounded-2xl p-4 glass"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}
      >
        <SectionHeader>Storage unit</SectionHeader>
        <form onSubmit={handleUpdateStorage} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {([
              ["widthCells",  "Width (cells)",    widthCells,   setWidthCells,   "storage-width"],
              ["depthCells",  "Depth (cells)",    depthCells,   setDepthCells,   "storage-depth"],
              ["heightCells", "Ceiling (levels)", heightCells,  setHeightCells,  "storage-height"],
            ] as const).map(([name, label, val, setter, testId]) => (
              <div key={name} className="space-y-1.5">
                <label className="block text-xs" style={{ color: "var(--color-pencil)" }}>{label}</label>
                <input
                  name={name}
                  type="number"
                  min={1}
                  value={val}
                  onChange={(e) => setter(Number(e.target.value))}
                  data-testid={testId}
                  disabled={storagePending}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            data-testid="save-storage-btn"
            disabled={storagePending}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{ background: storageSaved ? "#3a8a5c" : "var(--color-freight)" }}
          >
            {storagePending ? <><Spinner /> Saving…</> : storageSaved ? "Saved ✓" : "Save"}
          </button>
        </form>
      </section>

      {/* Box sizes */}
      <section
        className="rounded-2xl p-4 glass"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}
      >
        <SectionHeader>Box sizes</SectionHeader>
        <ul className="mb-3 rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-kraft)" }}>
          {boxSizes.map((bs, i) => (
            <li
              key={bs.id}
              data-testid={`box-size-row-${bs.name}`}
              className="flex items-center justify-between px-4 py-3 text-sm"
              style={{ background: "var(--color-surface)", borderTop: i > 0 ? "1px solid var(--color-kraft)" : "none" }}
            >
              <span className="font-medium" style={{ color: "var(--color-ink)" }}>{bs.name}</span>
              <span className="label-number text-xs mx-auto" style={{ color: "var(--color-pencil)" }}>
                {bs.widthIn}"×{bs.depthIn}"×{bs.heightIn}"
              </span>
              <button
                type="button"
                data-testid="delete-box-size-btn"
                onClick={() => handleDeleteBoxSize(bs.id)}
                disabled={deletingId !== null}
                className="text-xs flex items-center gap-1 transition-opacity disabled:opacity-40"
                style={{ color: "var(--color-pencil)" }}
              >
                {deletingId === bs.id ? <Spinner /> : "Remove"}
              </button>
            </li>
          ))}
          {boxSizes.length === 0 && (
            <li className="px-4 py-3 text-sm" style={{ color: "var(--color-pencil)" }}>No box sizes</li>
          )}
        </ul>
        <form onSubmit={handleAddBoxSize} className="space-y-2">
          <input
            name="name"
            placeholder="Name (e.g. Wardrobe box)"
            required
            data-testid="new-box-size-name"
            disabled={addBoxSizePending}
            className="w-full rounded-xl px-3 py-2.5 text-sm"
            style={inputStyle}
          />
          <div className="grid grid-cols-3 gap-2">
            {([
              ["widthIn",  "new-box-size-width",  "W (in)"],
              ["depthIn",  "new-box-size-depth",  "D (in)"],
              ["heightIn", "new-box-size-height", "H (in)"],
            ] as const).map(([name, testId, label]) => (
              <div key={name} className="space-y-1">
                <label className="block text-xs" style={{ color: "var(--color-pencil)" }}>{label}</label>
                <input
                  name={name}
                  type="number"
                  min={1}
                  placeholder="12"
                  required
                  data-testid={testId}
                  disabled={addBoxSizePending}
                  className="w-full rounded-xl px-2 py-2.5 text-sm text-center label-number"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            data-testid="add-box-size-btn"
            disabled={addBoxSizePending}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}
          >
            {addBoxSizePending ? <><Spinner /> Adding…</> : "Add"}
          </button>
        </form>
      </section>

      {/* Rooms */}
      <section
        className="rounded-2xl p-4 glass"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}
      >
        <SectionHeader>Rooms</SectionHeader>
        <ul className="mb-3 rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-kraft)" }}>
          {rooms.map((room, i) => (
            <li
              key={room.id}
              data-testid={`room-row-${room.name}`}
              className="flex items-center justify-between px-4 py-3 text-sm"
              style={{ background: "var(--color-surface)", borderTop: i > 0 ? "1px solid var(--color-kraft)" : "none" }}
            >
              <span style={{ color: "var(--color-ink)" }}>{room.name}</span>
              <button
                type="button"
                data-testid="delete-room-btn"
                onClick={() => handleDeleteRoom(room.id)}
                disabled={deletingId !== null}
                className="text-xs flex items-center gap-1 transition-opacity disabled:opacity-40"
                style={{ color: "var(--color-pencil)" }}
              >
                {deletingId === room.id ? <Spinner /> : "Remove"}
              </button>
            </li>
          ))}
          {rooms.length === 0 && (
            <li className="px-4 py-3 text-sm" style={{ color: "var(--color-pencil)" }}>No rooms</li>
          )}
        </ul>
        <form onSubmit={handleAddRoom} className="flex gap-2">
          <input
            name="name"
            placeholder="Room name"
            required
            data-testid="new-room-name"
            disabled={addRoomPending}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm"
            style={inputStyle}
          />
          <button
            type="submit"
            data-testid="add-room-btn"
            disabled={addRoomPending}
            className="rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-opacity disabled:opacity-60"
            style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}
          >
            {addRoomPending ? <Spinner /> : "Add"}
          </button>
        </form>
      </section>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "var(--color-pencil)" }}>
      {children}
    </h2>
  );
}
