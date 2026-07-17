"use client";

import { useState, useDeferredValue, useMemo } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { FurnitureItem } from "@/app/generated/prisma/client";

export function FurnitureClient({ items }: { items: FurnitureItem[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: "name",      weight: 2 },
          { name: "groupName", weight: 1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = deferredQuery.trim();
    if (!q) return items;
    return fuse.search(q).map((r) => r.item);
  }, [fuse, deferredQuery, items]);

  /* Re-group filtered results */
  const groups = useMemo(() => {
    const map = new Map<string, FurnitureItem[]>();
    for (const item of filtered) {
      const key = item.groupName ?? "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-5">
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
          placeholder="Search furniture…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl py-3 pl-9 pr-4 text-sm glass"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
        />
      </div>

      {filtered.length === 0 && (
        <div
          className="rounded-2xl px-6 py-10 text-center glass"
          style={{ border: "1px solid var(--color-kraft)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-pencil)" }}>
            {query ? "No furniture matches your search." : "No furniture yet — add your first piece."}
          </p>
        </div>
      )}

      {Array.from(groups.entries()).map(([group, groupItems]) => (
        <section key={group}>
          {group && (
            <h2
              className="text-xs font-medium uppercase tracking-wider mb-2"
              style={{ color: "var(--color-pencil)" }}
            >
              {group}
            </h2>
          )}
          <ul className="rounded-2xl overflow-hidden glass" style={{ border: "1px solid var(--color-kraft)" }}>
            {groupItems.map((item, i) => (
              <li
                key={item.id}
                style={{ borderTop: i > 0 ? "1px solid var(--color-kraft)" : "none" }}
              >
                <Link
                  href={`/furniture/${item.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="flex-1 text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                    {item.name}
                  </span>
                  <span className="label-number text-xs" style={{ color: "var(--color-pencil)" }}>
                    {item.widthIn}"×{item.depthIn}"×{item.heightIn}"
                  </span>
                  {item.gridCol !== null && (
                    <span
                      className="text-xs rounded-md px-1.5 py-0.5"
                      style={{ background: "var(--color-freight-tint)", color: "var(--color-freight)" }}
                    >
                      on map
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
