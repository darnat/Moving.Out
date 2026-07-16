"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addFurnitureItem } from "@/lib/actions/furniture";

const PRESETS = [
  "#7B95AE", "#8B6B55", "#6B8F6B", "#9B7B8B",
  "#7B7B9B", "#A8896B", "#7B9B9B", "#9B8B7B",
];

const inputStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-kraft)",
  color: "var(--color-ink)",
};

export function NewFurnitureForm() {
  const router = useRouter();
  const [color, setColor] = useState(PRESETS[0]);
  const [borderRadius, setBorderRadius] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("color", color);
    fd.set("borderRadius", String(borderRadius));
    await addFurnitureItem(fd);
    router.push("/furniture");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
          Name
        </label>
        <input
          name="name"
          required
          placeholder="e.g. Left section, Ottoman, Armchair…"
          className="w-full rounded-xl px-4 py-3 text-sm"
          style={inputStyle}
        />
      </div>

      {/* Group */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
          Group <span style={{ color: "var(--color-kraft)", fontStyle: "italic", textTransform: "none" }}>optional</span>
        </label>
        <input
          name="groupName"
          placeholder="e.g. Couch, Living room set…"
          className="w-full rounded-xl px-4 py-3 text-sm"
          style={inputStyle}
        />
        <p className="text-xs" style={{ color: "var(--color-pencil)" }}>
          Modules with the same group are shown together on the map.
        </p>
      </div>

      {/* Dimensions */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
          Dimensions (inches)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([["widthIn", "W"], ["depthIn", "D"], ["heightIn", "H"]] as const).map(([name, label]) => (
            <div key={name} className="space-y-1">
              <label className="block text-xs text-center" style={{ color: "var(--color-pencil)" }}>{label}</label>
              <input
                name={name}
                type="number"
                min={1}
                placeholder="12"
                required
                className="w-full rounded-xl px-2 py-3 text-sm text-center label-number"
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Color */}
      <div className="space-y-2">
        <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
          Color on map
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full transition-transform hover:scale-110"
              style={{
                background: c,
                outline: color === c ? `2px solid ${c}` : "none",
                outlineOffset: "2px",
              }}
            />
          ))}
          {/* Custom color */}
          <label className="relative w-7 h-7 rounded-full cursor-pointer overflow-hidden hover:scale-110 transition-transform" title="Custom color"
                 style={{ background: PRESETS.includes(color) ? "var(--color-kraft)" : color,
                          outline: !PRESETS.includes(color) ? `2px solid ${color}` : "none",
                          outlineOffset: "2px" }}>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: "var(--color-ink)" }}>+</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
          {/* Live preview swatch */}
          <div className="flex items-center gap-2 ml-2 rounded-lg px-3 py-1.5 text-xs" style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-pencil)" }}>
            <span className="w-3 h-3 rounded-full" style={{ background: color }} />
            {color.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Rounded edges */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-pencil)" }}>
            Roundness
          </label>
          <span className="label-number text-xs" style={{ color: "var(--color-pencil)" }}>
            {borderRadius === 0 ? "Sharp" : borderRadius === 100 ? "Full" : `${borderRadius}%`}
          </span>
        </div>
        <input
          type="range"
          min={0} max={100} step={5}
          value={borderRadius}
          onChange={(e) => setBorderRadius(Number(e.target.value))}
          className="w-full accent-freight"
          style={{ accentColor: "var(--color-freight)" }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-xl px-4 py-3 text-sm font-medium"
          style={{ border: "1px solid var(--color-kraft)", color: "var(--color-pencil)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-white"
          style={{ background: "var(--color-freight)" }}
        >
          Save
        </button>
      </div>
    </form>
  );
}
