import { auth } from "@/lib/auth";
import { Nav } from "./components/Nav";
import { SearchSection } from "./components/SearchSection";
import { getCachedBoxes, getCachedRooms } from "@/lib/data";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [boxes, rooms] = await Promise.all([
    getCachedBoxes(userId),
    getCachedRooms(userId),
  ]);

  const unplacedCount = boxes.filter((b) => b.gridCol === null && !b.retrieved).length;
  const inStorageCount = boxes.filter((b) => b.gridCol !== null && !b.retrieved).length;
  const retrievedCount = boxes.filter((b) => b.retrieved).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-paper)" }}>
      <Nav active="search" />

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Stat value={boxes.length} label="Total boxes" />
          <Stat value={inStorageCount} label="In storage" accent />
          <Stat value={retrievedCount} label="Retrieved" />
        </div>

        {/* Unplaced banner */}
        {unplacedCount > 0 && (
          <a
            href="/grid"
            className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
            style={{
              background: "var(--color-freight-tint)",
              border: "1px solid color-mix(in srgb, var(--color-freight) 25%, transparent)",
              color: "var(--color-freight)",
            }}
          >
            <span>
              {unplacedCount} box{unplacedCount !== 1 ? "es" : ""} not yet placed on the map
            </span>
            <span className="font-display font-semibold">Place now →</span>
          </a>
        )}

        <SearchSection boxes={boxes} rooms={rooms} />
      </main>
    </div>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl px-4 py-3 space-y-0.5"
      style={{
        background: accent ? "var(--color-freight-tint)" : "var(--color-surface)",
        border: `1px solid ${accent ? "color-mix(in srgb, var(--color-freight) 20%, transparent)" : "var(--color-kraft)"}`,
      }}
    >
      <p
        className="font-display font-semibold text-2xl leading-none"
        style={{ color: accent ? "var(--color-freight)" : "var(--color-ink)" }}
      >
        {value}
      </p>
      <p className="text-xs" style={{ color: "var(--color-pencil)" }}>
        {label}
      </p>
    </div>
  );
}
