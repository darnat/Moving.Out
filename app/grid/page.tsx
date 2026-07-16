import { auth } from "@/lib/auth";
import { Nav } from "@/app/components/Nav";
import { GridClient } from "./GridClient";
import { getCachedGridBoxes, getCachedStorageUnit, getCachedFurnitureItems } from "@/lib/data";

export default async function GridPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [boxes, storageUnit, furnitureItems] = await Promise.all([
    getCachedGridBoxes(userId),
    getCachedStorageUnit(userId),
    getCachedFurnitureItems(userId),
  ]);

  const unit = storageUnit ?? { widthCells: 10, depthCells: 20, heightCells: 8 };

  return (
    <div className="min-h-screen">
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
        <GridClient boxes={boxes} furnitureItems={furnitureItems} widthCells={unit.widthCells} depthCells={unit.depthCells} heightCells={unit.heightCells} />
      </main>
    </div>
  );
}
