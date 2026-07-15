"use client";

import { useState, useDeferredValue } from "react";
import Link from "next/link";
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

  const results = boxes.flatMap((box) => {
    const matchingItems = box.items.filter((item) =>
      item.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );
    if (deferredQuery && matchingItems.length === 0) return [];
    if (roomFilter && box.room.id !== roomFilter) return [];
    return [{ box, matchingItems }];
  });

  const hasQuery = deferredQuery.length > 0 || roomFilter.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search items..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="search-input"
          className="flex-1 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          data-testid="room-filter"
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">All rooms</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div data-testid="search-results" className="space-y-2">
        {hasQuery ? (
          results.length === 0 ? (
            <p className="text-sm text-gray-400">No results</p>
          ) : (
            results.map(({ box, matchingItems }) => (
              <Link
                key={box.id}
                href={`/boxes/${box.id}`}
                className="block rounded-lg border px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{box.labelNumber}</span>
                  <div className="flex items-center gap-2">
                    {box.retrieved && (
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                        Retrieved
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{box.room.name}</span>
                  </div>
                </div>
                {box.gridCol !== null && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Col {box.gridCol} · Row {box.gridRow} · Level {box.stackLevel}
                  </p>
                )}
                {deferredQuery && (
                  <ul className="mt-1 space-y-0.5">
                    {matchingItems.map((item) => (
                      <li key={item.id} className="text-xs text-gray-600">
                        {item.name}
                      </li>
                    ))}
                  </ul>
                )}
              </Link>
            ))
          )
        ) : (
          results.map(({ box }) => (
            <Link
              key={box.id}
              href={`/boxes/${box.id}`}
              className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-gray-50"
            >
              <span className="font-medium text-sm">{box.labelNumber}</span>
              <div className="flex items-center gap-2">
                {box.retrieved && (
                  <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                    Retrieved
                  </span>
                )}
                <span className="text-xs text-gray-500">{box.room.name}</span>
                {box.gridCol === null && !box.retrieved && (
                  <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                    Unplaced
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
