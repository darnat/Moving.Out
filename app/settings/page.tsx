import { auth } from "@/lib/auth";
import { Nav } from "@/app/components/Nav";
import { SettingsClient } from "./SettingsClient";
import { getCachedBoxSizes, getCachedRooms, getCachedStorageUnit, getCachedFurnitureItems } from "@/lib/data";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [boxSizes, rooms, storageUnit, furnitureItems] = await Promise.all([
    getCachedBoxSizes(userId),
    getCachedRooms(userId),
    getCachedStorageUnit(userId),
    getCachedFurnitureItems(userId),
  ]);

  return (
    <div className="min-h-screen">
      <Nav active="settings" />
      <main className="mx-auto max-w-lg px-4 py-8 space-y-8">
        <h1
          className="font-display font-semibold text-2xl"
          style={{ color: "var(--color-ink)" }}
        >
          Settings
        </h1>
        <SettingsClient
          boxSizes={boxSizes}
          rooms={rooms}
          storageUnit={storageUnit ?? { widthCells: 10, depthCells: 20, heightCells: 8, id: "", userId }}
          furnitureItems={furnitureItems}
        />
      </main>
    </div>
  );
}
