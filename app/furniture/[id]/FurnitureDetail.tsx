"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FurnitureItem } from "@/app/generated/prisma/client";
import { updateFurnitureItem, deleteFurnitureItem } from "@/lib/actions/furniture";

const PRESETS = [
  "#7B95AE", "#8B6B55", "#6B8F6B", "#9B7B8B",
  "#7B7B9B", "#A8896B", "#7B9B9B", "#9B8B7B",
];

const inputStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-kraft)",
  color: "var(--color-ink)",
};

function Spinner() {
  return (
    <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" opacity="0.9"/>
      <path d="M12 2a10 10 0 0 0-10 10" strokeLinecap="round" opacity="0.3"/>
    </svg>
  );
}

export function FurnitureDetail({ item }: { item: FurnitureItem }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [color, setColor] = useState(item.color);
  const [borderRadius, setBorderRadius] = useState(item.borderRadius);
  const [name, setName] = useState(item.name);
  const [groupName, setGroupName] = useState(item.groupName ?? "");
  const [widthIn, setWidthIn] = useState(item.widthIn);
  const [depthIn, setDepthIn] = useState(item.depthIn);
  const [heightIn, setHeightIn] = useState(item.heightIn);

  const busy = loading !== null;

  async function run(key: string, fn: () => Promise<void>) {
    setLoading(key);
    try { await fn(); } finally { setLoading(null); }
  }

  async function handleColorChange(c: string) {
    setColor(c);
    await run("color", async () => {
      await updateFurnitureItem(item.id, { color: c });
      router.refresh();
    });
  }

  async function handleBorderRadiusCommit(val: number) {
    await run("borderRadius", async () => {
      await updateFurnitureItem(item.id, { borderRadius: val });
      router.refresh();
    });
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await run("save", async () => {
      await updateFurnitureItem(item.id, {
        name,
        groupName: groupName.trim() || null,
        color,
        borderRadius,
        widthIn,
        depthIn,
        heightIn,
      });
      router.refresh();
    });
  }

  async function handleDelete() {
    if (busy) return;
    await run("delete", async () => {
      await deleteFurnitureItem(item.id);
      router.push("/furniture");
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-3xl p-5 space-y-4 glass"
        style={{ border: "1px solid var(--color-kraft)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full shrink-0" style={{ background: color }} />
          <h1 className="font-display font-bold text-2xl leading-none" style={{ color: "var(--color-ink)" }}>
            {item.name}
          </h1>
          {item.groupName && (
            <span className="text-sm" style={{ color: "var(--color-pencil)" }}>({item.groupName})</span>
          )}
        </div>

        <div className="label-number text-xs" style={{ color: "var(--color-pencil)" }}>
          {item.widthIn}"W × {item.depthIn}"D × {item.heightIn}"H
        </div>

        {item.gridCol !== null && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "var(--color-freight-tint)" }}>
            <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-freight)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span className="text-xs font-medium" style={{ color: "var(--color-freight)" }}>
              Placed on storage map
            </span>
          </div>
        )}
      </div>

      {/* Color picker */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
          Color on map {loading === "color" && <Spinner />}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={busy}
              onClick={() => handleColorChange(c)}
              className="w-8 h-8 rounded-full transition-transform hover:scale-110 disabled:opacity-50"
              style={{
                background: c,
                outline: color === c ? `2px solid ${c}` : "none",
                outlineOffset: "2px",
              }}
            />
          ))}
          {/* Custom */}
          <label
            className="relative w-8 h-8 rounded-full cursor-pointer overflow-hidden hover:scale-110 transition-transform"
            title="Custom color"
            style={{
              background: PRESETS.includes(color) ? "var(--color-kraft)" : color,
              outline: !PRESETS.includes(color) ? `2px solid ${color}` : "none",
              outlineOffset: "2px",
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: "var(--color-ink)" }}>+</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              onBlur={(e) => handleColorChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
          <div className="flex items-center gap-2 ml-1 rounded-lg px-3 py-1.5 text-xs" style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-pencil)" }}>
            <span className="w-3 h-3 rounded-full" style={{ background: color }} />
            {color.toUpperCase()}
          </div>
        </div>
      </section>

      {/* Roundness slider */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
            Roundness {loading === "borderRadius" && <Spinner />}
          </h2>
          <span className="label-number text-xs" style={{ color: "var(--color-pencil)" }}>
            {borderRadius === 0 ? "Sharp" : borderRadius === 100 ? "Full" : `${borderRadius}%`}
          </span>
        </div>
        <input
          type="range"
          min={0} max={100} step={5}
          value={borderRadius}
          disabled={busy}
          onChange={(e) => setBorderRadius(Number(e.target.value))}
          onMouseUp={(e) => handleBorderRadiusCommit(Number((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => handleBorderRadiusCommit(Number((e.target as HTMLInputElement).value))}
          className="w-full disabled:opacity-50"
          style={{ accentColor: "var(--color-freight)" }}
        />
      </section>

      {/* Edit form */}
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
          Details
        </h2>

        <div className="space-y-1.5">
          <label className="block text-xs" style={{ color: "var(--color-pencil)" }}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl px-4 py-3 text-sm"
            style={inputStyle}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs" style={{ color: "var(--color-pencil)" }}>Group (optional)</label>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Couch"
            className="w-full rounded-xl px-4 py-3 text-sm"
            style={inputStyle}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs" style={{ color: "var(--color-pencil)" }}>Dimensions (inches)</label>
          <div className="grid grid-cols-3 gap-2">
            {([["W", widthIn, setWidthIn], ["D", depthIn, setDepthIn], ["H", heightIn, setHeightIn]] as const).map(([label, val, setter]) => (
              <div key={label} className="space-y-1">
                <label className="block text-xs text-center" style={{ color: "var(--color-pencil)" }}>{label}</label>
                <input
                  type="number"
                  min={1}
                  value={val}
                  onChange={(e) => setter(Number(e.target.value))}
                  required
                  className="w-full rounded-xl px-2 py-3 text-sm text-center label-number"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-center gap-2"
          style={{ background: "var(--color-freight)", color: "#fff", opacity: busy ? 0.6 : 1 }}
        >
          {loading === "save" ? <><Spinner /> Saving…</> : "Save changes"}
        </button>
      </form>

      {/* Delete */}
      <div style={{ borderTop: "1px solid var(--color-kraft)", paddingTop: "1.5rem" }}>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="w-full rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-center gap-2"
          style={{ border: "1px solid color-mix(in srgb, var(--color-freight) 30%, transparent)", color: "var(--color-freight)" }}
        >
          {loading === "delete" ? <Spinner /> : null}
          Delete
        </button>
      </div>
    </div>
  );
}
