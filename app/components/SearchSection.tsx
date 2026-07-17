"use client";

import { useState, useDeferredValue, useMemo } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { Box, Room, Item, BoxSize } from "@/app/generated/prisma/client";

type BoxWithRelations = Box & {
  room: Room;
  boxSize: BoxSize;
  items: Item[];
};

export function SearchSection({
  boxes,
  rooms,
}: {
  boxes: BoxWithRelations[];
  rooms: Room[];
}) {
  const [query, setQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const deferredQuery = useDeferredValue(query);

  /* Fuse instance — rebuilt only when the boxes list changes */
  const fuse = useMemo(
    () =>
      new Fuse(boxes, {
        keys: [
          { name: "labelNumber", weight: 2 },   // box label is most important
          { name: "items.name",  weight: 1 },   // contents
          { name: "room.name",   weight: 0.5 }, // room
        ],
        threshold: 0.35,      // 0 = exact, 1 = match anything
        ignoreLocation: true, // match anywhere in the string, not just start
        includeMatches: true,
        minMatchCharLength: 2,
      }),
    [boxes],
  );

  const { results, hasQuery } = useMemo(() => {
    const q = deferredQuery.trim();
    const hasQuery = q.length > 0 || roomFilter.length > 0;

    let results: { box: BoxWithRelations; matchingItems: Item[] }[];

    if (q.length === 0) {
      /* No text query — show all (room filter still applies) */
      results = boxes
        .filter((b) => !roomFilter || b.room.id === roomFilter)
        .map((box) => ({ box, matchingItems: [] }));
    } else {
      results = fuse
        .search(q)
        .filter((r) => !roomFilter || r.item.room.id === roomFilter)
        .map((r) => {
          /* Extract which item names matched so we can highlight them */
          const itemMatches =
            r.matches?.filter((m) => m.key === "items.name") ?? [];
          const matchingItems = itemMatches
            .map((m) => r.item.items[m.refIndex!])
            .filter(Boolean);
          return { box: r.item, matchingItems };
        });
    }

    return { results, hasQuery };
  }, [fuse, deferredQuery, roomFilter, boxes]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none z-10"
            style={{ color: "var(--color-pencil)" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Find anything — coffee machine, books, lamp..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="search-input"
            className="w-full rounded-2xl py-3 pl-9 pr-4 text-sm glass"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-kraft)",
              color: "var(--color-ink)",
            }}
          />
        </div>

        <select
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          data-testid="room-filter"
          className="rounded-xl px-3 py-3 text-sm"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-kraft)",
            color: roomFilter ? "var(--color-ink)" : "var(--color-pencil)",
          }}
        >
          <option value="">All rooms</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      <div data-testid="search-results" className="space-y-2">
        {boxes.length === 0 && !hasQuery ? (
          <EmptyState />
        ) : hasQuery ? (
          results.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: "var(--color-pencil)" }}>
              Nothing found — try a different search
            </p>
          ) : (
            results.map(({ box, matchingItems }) => (
              <BoxCard
                key={box.id}
                box={box}
                matchingItems={deferredQuery ? matchingItems : []}
                showItems={deferredQuery.length > 0}
              />
            ))
          )
        ) : (
          results.map(({ box }) => (
            <BoxCard key={box.id} box={box} matchingItems={[]} showItems={false} />
          ))
        )}
      </div>
    </div>
  );
}

function BoxCard({
  box,
  matchingItems,
  showItems,
}: {
  box: BoxWithRelations & { room: Room };
  matchingItems: Item[];
  showItems: boolean;
}) {
  return (
    <Link
      href={`/boxes/${box.id}`}
      className="flex items-start gap-4 rounded-2xl px-4 py-4 glass card-hover group"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-kraft)",
      }}
    >
      <div
        className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
        style={{
          background: box.retrieved
            ? "var(--color-kraft)"
            : box.gridCol !== null
            ? "var(--color-freight)"
            : "color-mix(in srgb, var(--color-freight) 40%, transparent)",
        }}
      />

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
{box.icon && (
              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{box.icon}</span>
            )}
            <span className="label-number font-semibold text-sm truncate" style={{ color: "var(--color-ink)" }}>
              {box.labelNumber}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {box.retrieved && (
              <span
                className="rounded-md px-2 py-0.5 text-xs font-medium"
                style={{ background: "var(--color-paper)", color: "var(--color-pencil)", border: "1px solid var(--color-kraft)" }}
              >
                Retrieved
              </span>
            )}
            {box.gridCol === null && !box.retrieved && (
              <span
                className="rounded-md px-2 py-0.5 text-xs font-medium"
                style={{ background: "var(--color-freight-tint)", color: "var(--color-freight)" }}
              >
                Unplaced
              </span>
            )}
            <span className="text-xs" style={{ color: "var(--color-pencil)" }}>
              {box.room.name}
            </span>
          </div>
        </div>

        {box.gridCol !== null && (
          <p className="text-xs" style={{ color: "var(--color-pencil)" }}>
            Col {box.gridCol} · Row {box.gridRow} · Level {Math.round(box.stackLevel!)}
          </p>
        )}

        {showItems && matchingItems.length > 0 && (
          <ul className="space-y-0.5 pt-0.5">
            {matchingItems.map((item) => (
              <li key={item.id} className="text-xs" style={{ color: "var(--color-pencil)" }}>
                {item.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <svg
        className="w-4 h-4 shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5"
        style={{ color: "var(--color-kraft)" }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center space-y-3">
      <p className="font-display font-semibold text-lg" style={{ color: "var(--color-ink)" }}>
        No boxes yet
      </p>
      <p className="text-sm" style={{ color: "var(--color-pencil)" }}>
        Add your first box to start tracking your move
      </p>
      <a
        href="/boxes/new"
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white mt-2"
        style={{ background: "var(--color-freight)" }}
      >
        + Register a box
      </a>
    </div>
  );
}
