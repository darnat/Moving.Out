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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Label number */}
      <div className="space-y-1.5">
        <label
          className="block text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--color-pencil)" }}
        >
          Label number
        </label>
        <input
          name="labelNumber"
          data-testid="label-input"
          required
          placeholder="e.g. BOX-001"
          className="label-number w-full rounded-xl px-4 py-3 text-sm font-semibold transition-shadow"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-kraft)",
            color: "var(--color-ink)",
          }}
        />
      </div>

      {/* Room + Size row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            className="block text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--color-pencil)" }}
          >
            Room
          </label>
          <select
            name="roomId"
            data-testid="room-select"
            required
            className="w-full rounded-xl px-4 py-3 text-sm"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-kraft)",
              color: "var(--color-ink)",
            }}
          >
            <option value="">Select</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            className="block text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--color-pencil)" }}
          >
            Size
          </label>
          <select
            name="boxSizeId"
            data-testid="size-select"
            required
            className="w-full rounded-xl px-4 py-3 text-sm"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-kraft)",
              color: "var(--color-ink)",
            }}
          >
            <option value="">Select</option>
            {boxSizes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        <label
          className="block text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--color-pencil)" }}
        >
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
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-kraft)",
              color: "var(--color-ink)",
            }}
          />
          <button
            type="button"
            onClick={addItem}
            data-testid="add-item-btn"
            className="rounded-xl px-4 py-3 text-sm font-medium transition-colors"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-kraft)",
              color: "var(--color-ink)",
            }}
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
                style={{
                  background: "var(--color-paper)",
                  border: "1px solid var(--color-kraft)",
                }}
              >
                <span style={{ color: "var(--color-ink)" }}>{item}</span>
                <button
                  type="button"
                  data-testid={`remove-item-${item}`}
                  onClick={() => removeItem(item)}
                  className="text-lg leading-none transition-colors"
                  style={{ color: "var(--color-kraft)" }}
                  onMouseOver={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = "var(--color-freight)")
                  }
                  onMouseOut={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = "var(--color-kraft)")
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {items.length === 0 && (
          <p className="text-xs py-1" style={{ color: "var(--color-pencil)" }}>
            Add items you can search for later
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
          style={{
            border: "1px solid var(--color-kraft)",
            color: "var(--color-pencil)",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="save-box-btn"
          className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--color-freight)" }}
        >
          Save box
        </button>
      </div>
    </form>
  );
}
