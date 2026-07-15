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

export function SettingsClient({
  boxSizes,
  rooms,
  storageUnit,
}: {
  boxSizes: BoxSize[];
  rooms: Room[];
  storageUnit: Pick<StorageUnit, "widthCells" | "depthCells" | "id" | "userId">;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Controlled inputs for storage unit so they reflect server data after refresh
  const [widthCells, setWidthCells] = useState(storageUnit.widthCells);
  const [depthCells, setDepthCells] = useState(storageUnit.depthCells);
  useEffect(() => {
    setWidthCells(storageUnit.widthCells);
    setDepthCells(storageUnit.depthCells);
  }, [storageUnit.widthCells, storageUnit.depthCells]);

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
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Storage Unit</h2>
        <form onSubmit={handleUpdateStorage} className="flex gap-2 items-end">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Width (cells)</label>
            <input
              name="widthCells"
              type="number"
              min={1}
              value={widthCells}
              onChange={(e) => setWidthCells(Number(e.target.value))}
              data-testid="storage-width"
              className="w-24 rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Depth (cells)</label>
            <input
              name="depthCells"
              type="number"
              min={1}
              value={depthCells}
              onChange={(e) => setDepthCells(Number(e.target.value))}
              data-testid="storage-depth"
              className="w-24 rounded border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            data-testid="save-storage-btn"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Box Sizes</h2>
        <ul className="mb-3 space-y-1">
          {boxSizes.map((bs) => (
            <li
              key={bs.id}
              data-testid={`box-size-row-${bs.name}`}
              className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="font-medium">{bs.name}</span>
              <span className="ml-2 text-xs text-gray-400">
                {bs.widthCells}×{bs.depthCells}×{bs.heightCells}
              </span>
              <button
                type="button"
                data-testid="delete-box-size-btn"
                onClick={async () => {
                  await deleteBoxSize(bs.id);
                  router.refresh();
                }}
                className="ml-auto text-gray-400 hover:text-red-500 text-xs"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddBoxSize} className="flex gap-2">
          <input
            name="name"
            placeholder="Name"
            required
            data-testid="new-box-size-name"
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <input
            name="widthCells"
            type="number"
            min={1}
            placeholder="W"
            required
            data-testid="new-box-size-width"
            className="w-14 rounded border px-2 py-2 text-sm"
          />
          <input
            name="depthCells"
            type="number"
            min={1}
            placeholder="D"
            required
            data-testid="new-box-size-depth"
            className="w-14 rounded border px-2 py-2 text-sm"
          />
          <input
            name="heightCells"
            type="number"
            min={1}
            placeholder="H"
            required
            data-testid="new-box-size-height"
            className="w-14 rounded border px-2 py-2 text-sm"
          />
          <button
            type="submit"
            data-testid="add-box-size-btn"
            className="rounded bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Add
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Rooms</h2>
        <ul className="mb-3 space-y-1">
          {rooms.map((room) => (
            <li
              key={room.id}
              data-testid={`room-row-${room.name}`}
              className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"
            >
              <span>{room.name}</span>
              <button
                type="button"
                data-testid="delete-room-btn"
                onClick={async () => {
                  await deleteRoom(room.id);
                  router.refresh();
                }}
                className="text-gray-400 hover:text-red-500 text-xs"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddRoom} className="flex gap-2">
          <input
            name="name"
            placeholder="Room name"
            required
            data-testid="new-room-name"
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            data-testid="add-room-btn"
            className="rounded bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
