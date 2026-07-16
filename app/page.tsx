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
            className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-medium glass-orange"
            style={{
              background: "linear-gradient(135deg, rgba(255,107,43,0.22) 0%, rgba(255,107,43,0.06) 100%)",
              border: "1px solid rgba(255,107,43,0.22)",
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
      className={`rounded-2xl px-4 py-4 space-y-1 ${accent ? "glass-orange" : "glass"}`}
      style={{
        background: accent
          ? "linear-gradient(145deg, rgba(255,107,43,0.18) 0%, var(--color-surface) 65%)"
          : "var(--color-surface)",
        border: `1px solid ${accent ? "rgba(255,107,43,0.25)" : "var(--color-kraft)"}`,
      }}
    >
      <p
        className="font-display font-bold text-3xl leading-none tabular-nums"
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
