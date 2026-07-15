"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Room, BoxSize, Item, Photo } from "@/app/generated/prisma/client";
import { addItem, removeItem, deleteBox, setRetrieved } from "@/lib/actions/boxes";

type BoxWithRelations = Box & {
  room: Room;
  boxSize: BoxSize;
  items: Item[];
  photos: Photo[];
};

export function BoxDetail({ box }: { box: BoxWithRelations }) {
  const router = useRouter();
  const [itemInput, setItemInput] = useState("");

  async function handleAddItem() {
    const trimmed = itemInput.trim();
    if (!trimmed) return;
    await addItem(box.id, trimmed);
    setItemInput("");
    router.refresh();
  }

  async function handleRemoveItem(itemId: string, itemName: string) {
    await removeItem(itemId);
    router.refresh();
  }

  async function handleDelete() {
    await deleteBox(box.id);
    router.push("/");
  }

  async function handleToggleRetrieved() {
    await setRetrieved(box.id, !box.retrieved);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{box.labelNumber}</h1>
          <p className="text-sm text-gray-500">
            {box.room.name} · {box.boxSize.name}
          </p>
          {box.gridCol !== null && (
            <p className="text-xs text-gray-400 mt-0.5">
              Col {box.gridCol} · Row {box.gridRow} · Level {box.stackLevel}
            </p>
          )}
          {box.retrieved && (
            <span className="mt-1 inline-block rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
              Retrieved
            </span>
          )}
        </div>
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Back
        </button>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Items</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={itemInput}
            onChange={(e) => setItemInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddItem())}
            data-testid="item-input"
            placeholder="Add an item..."
            className="flex-1 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleAddItem}
            data-testid="add-item-btn"
            className="rounded bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200"
          >
            Add
          </button>
        </div>
        <ul className="space-y-1">
          {box.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-sm"
            >
              <span>{item.name}</span>
              <button
                type="button"
                data-testid={`remove-item-${item.name}`}
                onClick={() => handleRemoveItem(item.id, item.name)}
                className="text-gray-400 hover:text-red-500"
              >
                ×
              </button>
            </li>
          ))}
          {box.items.length === 0 && (
            <li className="text-sm text-gray-400">No items yet</li>
          )}
        </ul>
      </section>

      <section className="flex gap-2 pt-4 border-t">
        <button
          onClick={handleToggleRetrieved}
          data-testid={box.retrieved ? "un-retrieve-btn" : "retrieve-btn"}
          className="flex-1 rounded border px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          {box.retrieved ? "Mark as In Storage" : "Mark as Retrieved"}
        </button>
        <button
          onClick={handleDelete}
          data-testid="delete-box-btn"
          className="rounded border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </section>
    </div>
  );
}
