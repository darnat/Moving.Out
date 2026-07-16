import { auth } from "@/lib/auth";
import { Nav } from "@/app/components/Nav";
import Link from "next/link";
import { getCachedFurnitureItems } from "@/lib/data";

export default async function FurniturePage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const items = await getCachedFurnitureItems(userId);

  // Group by groupName (null → ungrouped)
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.groupName ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  return (
    <div className="min-h-screen">
      <Nav active="furniture" />
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-semibold text-2xl" style={{ color: "var(--color-ink)" }}>
              Furniture
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--color-pencil)" }}>
              {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/furniture/new"
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white"
            style={{ background: "var(--color-freight)" }}
          >
            <span className="text-base leading-none">+</span> Add
          </Link>
        </div>

        {items.length === 0 && (
          <div
            className="rounded-2xl px-6 py-12 text-center glass"
            style={{ border: "1px solid var(--color-kraft)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-pencil)" }}>
              No furniture yet — add your first piece.
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
                    {/* Color swatch */}
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
      </main>
    </div>
  );
}
