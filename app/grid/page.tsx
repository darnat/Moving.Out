import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GridClient } from "./GridClient";

export default async function GridPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [boxes, storageUnit] = await Promise.all([
    prisma.box.findMany({
      where: { userId, retrieved: false },
      include: { boxSize: true, room: true },
      orderBy: { labelNumber: "asc" },
    }),
    prisma.storageUnit.findUnique({ where: { userId } }),
  ]);

  const unit = storageUnit ?? { widthCells: 10, depthCells: 20 };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Storage Grid</h1>
      </div>
      <GridClient boxes={boxes} widthCells={unit.widthCells} depthCells={unit.depthCells} />
    </main>
  );
}
