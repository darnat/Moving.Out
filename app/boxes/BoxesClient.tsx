"use client";

import { useState, useDeferredValue, useMemo } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { Box, Room, BoxSize } from "@/app/generated/prisma/client";

type BoxWithRelations = Box & { room: Room; boxSize: BoxSize };
type SortKey = "label" | "recent" | "status";

const selectStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-kraft)",
  color: "var(--color-pencil)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
};

export function BoxesClient({ boxes }: { boxes: BoxWithRelations[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [showRetrieved, setShowRetrieved] = useState(false);
  const [sort, setSort] = useState<SortKey>("label");
  const [roomFilter, setRoomFilter] = useState("all");

  const placed    = useMemo(() => boxes.filter((b) => b.gridCol !== null && !b.retrieved).length, [boxes]);
  const unplaced  = useMemo(() => boxes.filter((b) => b.gridCol === null && !b.retrieved).length, [boxes]);
  const retrieved = useMemo(() => boxes.filter((b) => b.retrieved).length, [boxes]);

  const rooms = useMemo(() => {
    const seen = new Map<string, string>();
    for (const b of boxes) seen.set(b.room.id, b.room.name);
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [boxes]);

  const fuse = useMemo(
    () =>
      new Fuse(boxes, {
        keys: [
          { name: "labelNumber", weight: 2 },
          { name: "room.name",   weight: 0.5 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [boxes],
  );

  const filtered = useMemo(() => {
    let result = boxes;
    if (!showRetrieved) result = result.filter((b) => !b.retrieved);
    if (roomFilter !== "all") result = result.filter((b) => b.roomId === roomFilter);

    if (deferredQuery.trim()) {
      const hits = fuse.search(deferredQuery.trim()).map((r) => r.item);
      result = hits.filter((b) => result.includes(b));
    }

    if (!deferredQuery.trim()) {
      result = [...result].sort((a, b) => {
        if (sort === "label")  return a.labelNumber.localeCompare(b.labelNumber, undefined, { numeric: true });
        if (sort === "recent") return b.id.localeCompare(a.id);
        if (sort === "status") {
          const s = (x: BoxWithRelations) => x.retrieved ? 2 : x.gridCol === null ? 0 : 1;
          return s(a) - s(b);
        }
        return 0;
      });
    }

    return result;
  }, [boxes, showRetrieved, roomFilter, deferredQuery, sort, fuse]);

  return (
    <div className="space-y-4">
      {/* Status summary */}
      <p className="text-sm" style={{ color: "var(--color-pencil)" }}>
        <span style={{ color: "var(--color-freight)" }}>{placed}</span> placed
        <span className="mx-1.5" style={{ color: "var(--color-kraft)" }}>·</span>
        <span>{unplaced}</span> unplaced
        {retrieved > 0 && (
          <>
            <span className="mx-1.5" style={{ color: "var(--color-kraft)" }}>·</span>
            <span>{retrieved}</span> retrieved
          </>
        )}
      </p>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--color-pencil)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search boxes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl py-3 pl-9 pr-4 text-sm glass"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={selectStyle}>
          <option value="label">Label A→Z</option>
          <option value="recent">Recently added</option>
          <option value="status">By status</option>
        </select>

        {rooms.length > 1 && (
          <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} style={selectStyle}>
            <option value="all">All rooms</option>
            {rooms.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}

        {retrieved > 0 && (
          <button
            type="button"
            onClick={() => setShowRetrieved((v) => !v)}
            className="rounded-lg px-3 py-2.5 text-sm"
            style={{ border: "1px solid var(--color-kraft)", color: "var(--color-pencil)" }}
          >
            {showRetrieved ? `Hide retrieved (${retrieved})` : `Show retrieved (${retrieved})`}
          </button>
        )}
      </div>

      {/* Box list */}
      <ul className="space-y-2">
        {filtered.map((box) => (
          <li key={box.id}>
            <Link
              href={`/boxes/${box.id}`}
              className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-white/5 transition-colors"
              style={{ border: "1px solid var(--color-kraft)" }}
            >
              <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{
                  background: box.retrieved
                    ? "var(--color-kraft)"
                    : box.gridCol !== null
                    ? "var(--color-freight)"
                    : "color-mix(in srgb, var(--color-freight) 35%, transparent)",
                }}
              />
              <span className="label-number font-medium text-sm flex-1" style={{ color: "var(--color-ink)" }}>
                {box.labelNumber}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {box.retrieved && (
                  <span className="rounded bg-gray-700/50 px-2 py-0.5 text-xs" style={{ color: "var(--color-pencil)" }}>
                    Retrieved
                  </span>
                )}
                {box.gridCol !== null && !box.retrieved && (
                  <span className="rounded px-2 py-0.5 text-xs" style={{ background: "var(--color-freight-tint)", color: "var(--color-freight)" }}>
                    Placed
                  </span>
                )}
                <span className="text-xs" style={{ color: "var(--color-pencil)" }}>{box.room.name}</span>
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-sm py-4 text-center" style={{ color: "var(--color-pencil)" }}>
            {query || roomFilter !== "all" ? "No boxes match your filters." : "No boxes yet."}
          </li>
        )}
      </ul>
    </div>
  );
}
