import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SearchSection } from "./components/SearchSection";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [boxes, rooms] = await Promise.all([
    prisma.box.findMany({
      where: { userId },
      include: { room: true, boxSize: true, items: true },
      orderBy: { id: "desc" },
    }),
    prisma.room.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  const unplacedCount = boxes.filter((b) => b.gridCol === null && !b.retrieved).length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Moving Out</h1>
        <div className="flex gap-2">
          <Link href="/grid" className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-200">
            Grid
          </Link>
          <Link href="/settings" className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-200">
            Settings
          </Link>
          <Link href="/boxes/new" className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            + New Box
          </Link>
        </div>
      </div>

      {unplacedCount > 0 && (
        <Link
          href="/grid"
          className="block rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 hover:bg-yellow-100"
        >
          {unplacedCount} box{unplacedCount !== 1 ? "es" : ""} not yet placed on the grid →
        </Link>
      )}

      <SearchSection boxes={boxes} rooms={rooms} />
    </main>
  );
}
