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
  const [, startTransition] = useTransition();

  const [widthCells, setWidthCells]   = useState(storageUnit.widthCells);
  const [depthCells, setDepthCells]   = useState(storageUnit.depthCells);
  const [heightCells, setHeightCells] = useState(storageUnit.heightCells);
  useEffect(() => {
    setWidthCells(storageUnit.widthCells);
    setDepthCells(storageUnit.depthCells);
    setHeightCells(storageUnit.heightCells);
  }, [storageUnit.widthCells, storageUnit.depthCells, storageUnit.heightCells]);

  async function handleAddBoxSize(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    await addBoxSize(new FormData(form));
    form.reset();
    router.refresh();
  }

  async function handleAddRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    await addRoom(new FormData(form));
    form.reset();
    router.refresh();
  }

  function handleUpdateStorage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateStorageUnit(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      {/* Storage unit */}
      <section>
        <SectionHeader>Storage unit</SectionHeader>
        <form onSubmit={handleUpdateStorage} className="flex gap-3 items-end">
          <div className="space-y-1.5">
            <label className="block text-xs" style={{ color: "var(--color-pencil)" }}>
              Width (cells)
            </label>
            <input
              name="widthCells"
              type="number"
              min={1}
              value={widthCells}
              onChange={(e) => setWidthCells(Number(e.target.value))}
              data-testid="storage-width"
              className="w-24 rounded-xl px-3 py-2.5 text-sm"
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs" style={{ color: "var(--color-pencil)" }}>
              Depth (cells)
            </label>
            <input
              name="depthCells"
              type="number"
              min={1}
              value={depthCells}
              onChange={(e) => setDepthCells(Number(e.target.value))}
              data-testid="storage-depth"
              className="w-24 rounded-xl px-3 py-2.5 text-sm"
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs" style={{ color: "var(--color-pencil)" }}>
              Ceiling (levels)
            </label>
            <input
              name="heightCells"
              type="number"
              min={1}
              value={heightCells}
              onChange={(e) => setHeightCells(Number(e.target.value))}
              data-testid="storage-height"
              className="w-24 rounded-xl px-3 py-2.5 text-sm"
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            data-testid="save-storage-btn"
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-white"
            style={{ background: "var(--color-freight)" }}
          >
            Save
          </button>
        </form>
      </section>

      {/* Box sizes */}
      <section>
        <SectionHeader>Box sizes</SectionHeader>
        <ul
          className="mb-3 rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--color-kraft)" }}
        >
          {boxSizes.map((bs, i) => (
            <li
              key={bs.id}
              data-testid={`box-size-row-${bs.name}`}
              className="flex items-center justify-between px-4 py-3 text-sm"
              style={{
                background: "var(--color-surface)",
                borderTop: i > 0 ? "1px solid var(--color-kraft)" : "none",
              }}
            >
              <span className="font-medium" style={{ color: "var(--color-ink)" }}>
                {bs.name}
              </span>
              <span className="label-number text-xs mx-auto" style={{ color: "var(--color-pencil)" }}>
                {bs.widthIn}"×{bs.depthIn}"×{bs.heightIn}"
              </span>
              <button
                type="button"
                data-testid="delete-box-size-btn"
                onClick={async () => {
                  await deleteBoxSize(bs.id);
                  router.refresh();
                }}
                className="text-xs"
                style={{ color: "var(--color-pencil)" }}
              >
                Remove
              </button>
            </li>
          ))}
          {boxSizes.length === 0 && (
            <li className="px-4 py-3 text-sm" style={{ color: "var(--color-pencil)" }}>
              No box sizes
            </li>
          )}
        </ul>
        <form onSubmit={handleAddBoxSize} className="space-y-2">
          <input
            name="name"
            placeholder="Name (e.g. Wardrobe box)"
            required
            data-testid="new-box-size-name"
            className="w-full rounded-xl px-3 py-2.5 text-sm"
            style={inputStyle}
          />
          <div className="flex gap-2">
            {([
              ["widthIn",  "new-box-size-width",  "W (in)"],
              ["depthIn",  "new-box-size-depth",  "D (in)"],
              ["heightIn", "new-box-size-height", "H (in)"],
            ] as const).map(([name, testId, label]) => (
              <div key={name} className="flex-1 space-y-1">
                <label className="block text-xs" style={{ color: "var(--color-pencil)" }}>
                  {label}
                </label>
                <input
                  name={name}
                  type="number"
                  min={1}
                  placeholder="12"
                  required
                  data-testid={testId}
                  className="w-full rounded-xl px-2 py-2.5 text-sm text-center label-number"
                  style={inputStyle}
                />
              </div>
            ))}
            <div className="flex items-end">
              <button
                type="submit"
                data-testid="add-box-size-btn"
                className="rounded-xl px-4 py-2.5 text-sm font-medium"
                style={{
                  background: "var(--color-ink)",
                  color: "var(--color-paper)",
                }}
              >
                Add
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Rooms */}
      <section>
        <SectionHeader>Rooms</SectionHeader>
        <ul
          className="mb-3 rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--color-kraft)" }}
        >
          {rooms.map((room, i) => (
            <li
              key={room.id}
              data-testid={`room-row-${room.name}`}
              className="flex items-center justify-between px-4 py-3 text-sm"
              style={{
                background: "var(--color-surface)",
                borderTop: i > 0 ? "1px solid var(--color-kraft)" : "none",
              }}
            >
              <span style={{ color: "var(--color-ink)" }}>{room.name}</span>
              <button
                type="button"
                data-testid="delete-room-btn"
                onClick={async () => {
                  await deleteRoom(room.id);
                  router.refresh();
                }}
                className="text-xs"
                style={{ color: "var(--color-pencil)" }}
              >
                Remove
              </button>
            </li>
          ))}
          {rooms.length === 0 && (
            <li className="px-4 py-3 text-sm" style={{ color: "var(--color-pencil)" }}>
              No rooms
            </li>
          )}
        </ul>
        <form onSubmit={handleAddRoom} className="flex gap-2">
          <input
            name="name"
            placeholder="Room name"
            required
            data-testid="new-room-name"
            className="flex-1 rounded-xl px-4 py-2.5 text-sm"
            style={inputStyle}
          />
          <button
            type="submit"
            data-testid="add-room-btn"
            className="rounded-xl px-4 py-2.5 text-sm font-medium"
            style={{
              background: "var(--color-ink)",
              color: "var(--color-paper)",
            }}
          >
            Add
          </button>
        </form>
      </section>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs font-medium uppercase tracking-wider mb-3"
      style={{ color: "var(--color-pencil)" }}
    >
      {children}
    </h2>
  );
}
