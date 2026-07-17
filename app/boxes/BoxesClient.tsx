"use client";

import { useState, useDeferredValue, useMemo, useEffect, useRef, useCallback, useTransition } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { Box, Room, BoxSize } from "@/app/generated/prisma/client";
import { setRetrieved } from "@/lib/actions/boxes";
import { haptic } from "@/lib/haptic";

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

/* ── Swipeable row: swipe left to reveal retrieve action ── */
function SwipeableRow({
  children,
  onSwipeLeft,
  disabled,
}: {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  disabled?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const lockedHoriz = useRef(false);
  const currentOffset = useRef(0);
  const THRESHOLD = 76;

  const onSwipeLeftRef = useRef(onSwipeLeft);
  useEffect(() => { onSwipeLeftRef.current = onSwipeLeft; }, [onSwipeLeft]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const content = contentRef.current;
    if (!wrap || !content || disabled) return;

    function onTouchStart(e: TouchEvent) {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      lockedHoriz.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (startX.current === null || startY.current === null) return;
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      if (!lockedHoriz.current) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dy) >= Math.abs(dx)) { startX.current = null; return; }
        lockedHoriz.current = true;
      }
      if (dx >= 0) return;
      e.preventDefault();
      currentOffset.current = Math.max(dx, -(THRESHOLD + 16));
      if (content) {
        content.style.transform = `translateX(${currentOffset.current}px)`;
        content.style.transition = "none";
      }
    }

    function onTouchEnd() {
      if (currentOffset.current <= -THRESHOLD) {
        onSwipeLeftRef.current();
      }
      currentOffset.current = 0;
      if (content) {
        content.style.transition = "transform 0.22s ease";
        content.style.transform = "translateX(0)";
      }
      startX.current = null;
      startY.current = null;
      lockedHoriz.current = false;
    }

    wrap.addEventListener("touchstart", onTouchStart, { passive: true });
    wrap.addEventListener("touchmove",  onTouchMove,  { passive: false });
    wrap.addEventListener("touchend",   onTouchEnd,   { passive: true });
    return () => {
      wrap.removeEventListener("touchstart", onTouchStart);
      wrap.removeEventListener("touchmove",  onTouchMove);
      wrap.removeEventListener("touchend",   onTouchEnd);
    };
  }, [disabled]);

  return (
    <div ref={wrapRef} style={{ position: "relative", overflow: "hidden", borderRadius: 8 }}>
      {/* Background action */}
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          paddingRight: 20,
          background: "var(--color-freight)",
          borderRadius: 8,
        }}
      >
        <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, letterSpacing: "0.01em" }}>
          Retrieved ✓
        </span>
      </div>
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

export function BoxesClient({ boxes }: { boxes: BoxWithRelations[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [showRetrieved, setShowRetrieved] = useState(false);
  const [sort, setSort] = useState<SortKey>("label");
  const [roomFilter, setRoomFilter] = useState("all");

  /* Local copy for optimistic retrieve */
  const [localBoxes, setLocalBoxes] = useState(boxes);
  const [, startTransition] = useTransition();
  useEffect(() => { setLocalBoxes(boxes); }, [boxes]);

  const placed    = useMemo(() => localBoxes.filter((b) => b.gridCol !== null && !b.retrieved).length, [localBoxes]);
  const unplaced  = useMemo(() => localBoxes.filter((b) => b.gridCol === null && !b.retrieved).length, [localBoxes]);
  const retrieved = useMemo(() => localBoxes.filter((b) => b.retrieved).length, [localBoxes]);

  const rooms = useMemo(() => {
    const seen = new Map<string, string>();
    for (const b of localBoxes) seen.set(b.room.id, b.room.name);
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [localBoxes]);

  const fuse = useMemo(
    () => new Fuse(localBoxes, {
      keys: [{ name: "labelNumber", weight: 2 }, { name: "room.name", weight: 0.5 }],
      threshold: 0.35, ignoreLocation: true, minMatchCharLength: 2,
    }),
    [localBoxes],
  );

  const filtered = useMemo(() => {
    let result = localBoxes;
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
  }, [localBoxes, showRetrieved, roomFilter, deferredQuery, sort, fuse]);

  const handleRetrieve = useCallback((boxId: string) => {
    haptic("success");
    setLocalBoxes((prev) => prev.map((b) => b.id === boxId ? { ...b, retrieved: true } : b));
    startTransition(async () => { await setRetrieved(boxId, true); });
  }, []);

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
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--color-pencil)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
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
            {rooms.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
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

      {/* Hint */}
      {filtered.some((b) => !b.retrieved) && (
        <p className="text-xs px-1" style={{ color: "var(--color-pencil)", opacity: 0.6 }}>
          Swipe left to mark as retrieved
        </p>
      )}

      {/* Box list */}
      <ul className="space-y-2">
        {filtered.map((box) => (
          <li key={box.id}>
            <SwipeableRow
              disabled={box.retrieved}
              onSwipeLeft={() => handleRetrieve(box.id)}
            >
              <Link
                href={`/boxes/${box.id}`}
                className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-white/5 transition-colors"
                style={{ border: "1px solid var(--color-kraft)", background: "var(--color-paper)" }}
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
                {box.icon && (
                  <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{box.icon}</span>
                )}
                <span className="label-number font-medium text-sm flex-1" style={{ color: "var(--color-ink)" }}>
                  {box.labelNumber}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {box.retrieved && (
                    <span className="rounded px-2 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-pencil)" }}>Retrieved</span>
                  )}
                  {box.gridCol !== null && !box.retrieved && (
                    <span className="rounded px-2 py-0.5 text-xs" style={{ background: "var(--color-freight-tint)", color: "var(--color-freight)" }}>Placed</span>
                  )}
                  <span className="text-xs" style={{ color: "var(--color-pencil)" }}>{box.room.name}</span>
                </div>
              </Link>
            </SwipeableRow>
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
