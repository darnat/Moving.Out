import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function BoxesPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const boxes = await prisma.box.findMany({
    where: { userId },
    include: { room: true, boxSize: true },
    orderBy: { labelNumber: "asc" },
  });

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">All Boxes</h1>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
      </div>
      <ul className="space-y-2">
        {boxes.map((box) => (
          <li key={box.id}>
            <Link
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
              </div>
            </Link>
          </li>
        ))}
        {boxes.length === 0 && (
          <li className="text-sm text-gray-400">No boxes yet.</li>
        )}
      </ul>
    </main>
  );
}
