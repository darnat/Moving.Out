"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Room, BoxSize } from "@/app/generated/prisma/client";
import { createBox } from "@/lib/actions/boxes";

export function NewBoxForm({
  rooms,
  boxSizes,
}: {
  rooms: Room[];
  boxSizes: BoxSize[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<string[]>([]);
  const [itemInput, setItemInput] = useState("");

  function addItem() {
    const trimmed = itemInput.trim();
    if (!trimmed) return;
    setItems((prev) => [...prev, trimmed]);
    setItemInput("");
  }

  function removeItem(item: string) {
    setItems((prev) => prev.filter((i) => i !== item));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("items", JSON.stringify(items));
    await createBox(fd);
    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Label number</label>
        <input
          name="labelNumber"
          data-testid="label-input"
          required
          placeholder="e.g. BOX-001"
          className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Room</label>
        <select
          name="roomId"
          data-testid="room-select"
          required
          className="w-full rounded border px-3 py-2 text-sm"
        >
          <option value="">Select a room</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Box size</label>
        <select
          name="boxSizeId"
          data-testid="size-select"
          required
          className="w-full rounded border px-3 py-2 text-sm"
        >
          <option value="">Select a size</option>
          {boxSizes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Items</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={itemInput}
            onChange={(e) => setItemInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
            data-testid="item-input"
            placeholder="Add an item..."
            className="flex-1 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addItem}
            data-testid="add-item-btn"
            className="rounded bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200"
          >
            Add
          </button>
        </div>
        <ul data-testid="item-list" className="mt-2 space-y-1">
          {items.map((item) => (
            <li key={item} className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-sm">
              <span>{item}</span>
              <button
                type="button"
                data-testid={`remove-item-${item}`}
                onClick={() => removeItem(item)}
                className="text-gray-400 hover:text-red-500"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="save-box-btn"
          className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Save Box
        </button>
      </div>
    </form>
  );
}
