import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/app/components/Nav";
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
    <div className="min-h-screen" style={{ background: "var(--color-paper)" }}>
      <Nav active="grid" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1
            className="font-display font-semibold text-2xl"
            style={{ color: "var(--color-ink)" }}
          >
            Storage map
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-pencil)" }}>
            {unit.widthCells} × {unit.depthCells} cells
          </p>
        </div>
        <GridClient boxes={boxes} widthCells={unit.widthCells} depthCells={unit.depthCells} />
      </main>
    </div>
  );
}
