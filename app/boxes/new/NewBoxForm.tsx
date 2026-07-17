"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Room, BoxSize } from "@/app/generated/prisma/client";
import { createBox } from "@/lib/actions/boxes";
import { QrScanner } from "@/app/components/QrScanner";

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("items", JSON.stringify(items));
    if (mode === "qr") {
      fd.set("qrCode", scannedQr ?? "");
    }
    await createBox(fd);
    router.push("/");
  }

  return (
    <>
      {showScanner && (
        <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mode toggle */}
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}
        >
          {(["manual", "qr"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setScannedQr(null);
              }}
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
        ) : (
          <div className="space-y-3">
            {/* QR scan button / badge */}
            <div className="space-y-1.5">
              <label
                className="block text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-pencil)" }}
              >
                QR Code
              </label>
              {scannedQr ? (
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{
                    background: "var(--color-freight-tint)",
                    border: "1px solid color-mix(in srgb, var(--color-freight) 30%, transparent)",
                  }}
                >
                  <QrIcon className="w-5 h-5 shrink-0" style={{ color: "var(--color-freight)" }} />
                  <span className="text-sm font-medium flex-1" style={{ color: "var(--color-freight)" }}>
                    QR code scanned
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="text-xs"
                    style={{ color: "var(--color-freight)" }}
                  >
                    Rescan
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="w-full flex flex-col items-center gap-2 rounded-xl px-4 py-6 transition-colors"
                  style={{
                    background: "var(--color-surface)",
                    border: "2px dashed var(--color-kraft)",
                    color: "var(--color-pencil)",
                  }}
                >
                  <QrIcon className="w-8 h-8" style={{ color: "var(--color-kraft)" }} />
                  <span className="text-sm">Tap to scan QR code</span>
                </button>
              )}
            </div>

            {/* Friendly name */}
            <div className="space-y-1.5">
              <label
                className="block text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-pencil)" }}
              >
                Friendly name
              </label>
              <input
                name="labelNumber"
                data-testid="label-input"
                required
                placeholder="e.g. Kitchen boxes, Winter clothes…"
                className="w-full rounded-xl px-4 py-3 text-sm transition-shadow"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-kraft)",
                  color: "var(--color-ink)",
                }}
              />
            </div>
          </div>
        )}

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
            disabled={mode === "qr" && !scannedQr}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--color-freight)" }}
          >
            Save box
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
